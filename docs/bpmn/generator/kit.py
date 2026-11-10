"""Monta diagramas BPMN 2.0 (processo + desenho) a partir de etapas em colunas e raias.

Cada nó fica numa raia, numa coluna e numa linha dentro da raia. As setas são roteadas em L:
"hv" (sai na horizontal e entra na vertical), "vh" (sai na vertical e entra na horizontal) ou
pontos intermediários explícitos.
"""

import hashlib
import xml.etree.ElementTree as ET

NS = {
    "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "dc": "http://www.omg.org/spec/DD/20100524/DC",
    "di": "http://www.omg.org/spec/DD/20100524/DI",
}
for _prefix, _uri in NS.items():
    ET.register_namespace(_prefix, _uri)

COL = 270  # largura de uma coluna
X0 = 190  # x do centro da coluna 0
ROW = 150  # altura de uma linha dentro da raia
LANE_MARGIN = 85  # do topo da raia ao centro da linha 0
SIZES = {
    "task": (210, 90), "userTask": (210, 90), "serviceTask": (210, 90),
    "exclusiveGateway": (60, 60), "startEvent": (40, 40), "endEvent": (40, 40),
}


def q(prefix, name):
    return f"{{{NS[prefix]}}}{name}"


class Diagram:
    def __init__(self, key, name, lanes):
        """raias: lista de (chave, nome, quantidade de linhas)."""
        self.key = key
        self.name = name
        self.lanes = []
        top = 0
        for lane_key, lane_name, rows in lanes:
            height = LANE_MARGIN * 2 + (rows - 1) * ROW
            self.lanes.append(dict(key=lane_key, name=lane_name, top=top, height=height))
            top += height
        self.height = top
        self.nodes, self.flows, self.notes = {}, [], []

    def _id(self, kind, key):
        return f"{kind}_" + hashlib.sha1(f"{self.key}-{key}".encode()).hexdigest()[:12]

    def _lane(self, key):
        return next(r for r in self.lanes if r["key"] == key)

    def node(self, key, kind, name, lane, col, row=0, label="bottom"):
        r = self._lane(lane)
        cx = X0 + col * COL
        cy = r["top"] + LANE_MARGIN + row * ROW
        w, h = SIZES[kind]
        self.nodes[key] = dict(kind=kind, name=name, lane=lane, cx=cx, cy=cy, w=w, h=h, label=label, id=self._id(kind, key))

    # ---- pontos de conexão ----
    def _edge(self, key, side):
        n = self.nodes[key]
        return {
            "right": (n["cx"] + n["w"] / 2, n["cy"]), "left": (n["cx"] - n["w"] / 2, n["cy"]),
            "top": (n["cx"], n["cy"] - n["h"] / 2), "bottom": (n["cx"], n["cy"] + n["h"] / 2),
        }[side]

    def flow(self, source, target, name=None, route="auto", points=None, exit_side=None, entry_side=None, label_at=None):
        o, d = self.nodes[source], self.nodes[target]
        if points is not None:
            # pontos intermediários explícitos; saída e entrada pelos lados indicados (ou adivinhados)
            first, last = points[0], points[-1]
            exit_side = exit_side or ("right" if first[0] > o["cx"] + 1 else "left" if first[0] < o["cx"] - 1 else ("top" if first[1] < o["cy"] else "bottom"))
            entry_side = entry_side or ("left" if last[0] < d["cx"] - 1 else "right" if last[0] > d["cx"] + 1 else ("top" if last[1] < d["cy"] else "bottom"))
            path = [self._edge(source, exit_side), *points, self._edge(target, entry_side)]
        else:
            if route == "auto":
                route = "straight" if abs(o["cy"] - d["cy"]) < 1 or abs(o["cx"] - d["cx"]) < 1 else "hv"
            if route == "straight":
                if abs(o["cy"] - d["cy"]) < 1:
                    a, b = ("right", "left") if d["cx"] > o["cx"] else ("left", "right")
                else:
                    a, b = ("bottom", "top") if d["cy"] > o["cy"] else ("top", "bottom")
                path = [self._edge(source, a), self._edge(target, b)]
            elif route == "hv":
                a = "right" if d["cx"] > o["cx"] else "left"
                b = "top" if d["cy"] > o["cy"] else "bottom"
                start, end = self._edge(source, a), self._edge(target, b)
                path = [start, (end[0], start[1]), end]
            elif route == "vh":
                a = "bottom" if d["cy"] > o["cy"] else "top"
                b = "left" if d["cx"] > o["cx"] else "right"
                start, end = self._edge(source, a), self._edge(target, b)
                path = [start, (start[0], end[1]), end]
            else:
                raise ValueError(route)
        self.flows.append(dict(source=source, target=target, name=name, path=path, label_at=label_at,
                                id=self._id("Flow", f"{source}-{target}-{len(self.flows)}")))

    def note(self, key, text, attached_to, dx, dy, width=300, height=70, side=None):
        """Anotação com o canto superior esquerdo em (centro do nó + dx, centro do nó + dy)."""
        n = self.nodes[attached_to]
        x, y = n["cx"] + dx, n["cy"] + dy
        if side is None:
            side = "bottom" if y > n["cy"] else "top"
        start = self._edge(attached_to, side)
        # liga ao ponto mais próximo da borda esquerda da anotação
        end = (x, min(max(start[1], y), y + height)) if x > start[0] + 1 else (min(max(start[0], x), x + width), y if side == "bottom" else y + height)
        self.notes.append(dict(key=key, text=text, x=x, y=y, w=width, h=height, target_node=attached_to, path=[start, end],
                               id=self._id("TextAnnotation", key), assoc=self._id("Association", key)))

    # ---- XML ----
    def save(self, path):
        self._check()
        defs = ET.Element(q("bpmn", "definitions"), {
            "id": self._id("Definitions", "d"), "targetNamespace": "https://pixoramed/bpmn",
            "exporter": "PixoraMed gerador BPMN", "exporterVersion": "1.0",
        })
        collab = ET.SubElement(defs, q("bpmn", "collaboration"), {"id": self._id("Collaboration", "c")})
        proc_id = self._id("Process", "p")
        part_id = self._id("Participant", "p")
        ET.SubElement(collab, q("bpmn", "participant"), {"id": part_id, "name": self.name, "processRef": proc_id})
        proc = ET.SubElement(defs, q("bpmn", "process"), {"id": proc_id, "name": self.name, "isExecutable": "false"})
        lane_set = ET.SubElement(proc, q("bpmn", "laneSet"), {"id": self._id("LaneSet", "l")})
        for r in self.lanes:
            r["id"] = self._id("Lane", r["key"])
            lane = ET.SubElement(lane_set, q("bpmn", "lane"), {"id": r["id"], "name": r["name"]})
            for n in self.nodes.values():
                if n["lane"] == r["key"]:
                    ET.SubElement(lane, q("bpmn", "flowNodeRef")).text = n["id"]
        for key, n in self.nodes.items():
            el = ET.SubElement(proc, q("bpmn", n["kind"]), {"id": n["id"]})
            if n["name"]:
                el.set("name", n["name"])
            for f in self.flows:
                if f["target"] == key:
                    ET.SubElement(el, q("bpmn", "incoming")).text = f["id"]
            for f in self.flows:
                if f["source"] == key:
                    ET.SubElement(el, q("bpmn", "outgoing")).text = f["id"]
        for f in self.flows:
            attrs = {"id": f["id"], "sourceRef": self.nodes[f["source"]]["id"], "targetRef": self.nodes[f["target"]]["id"]}
            if f["name"]:
                attrs["name"] = f["name"]
            ET.SubElement(proc, q("bpmn", "sequenceFlow"), attrs)
        for nt in self.notes:
            el = ET.SubElement(proc, q("bpmn", "textAnnotation"), {"id": nt["id"]})
            ET.SubElement(el, q("bpmn", "text")).text = nt["text"]
        for nt in self.notes:
            ET.SubElement(proc, q("bpmn", "association"), {"id": nt["assoc"], "sourceRef": self.nodes[nt["target_node"]]["id"], "targetRef": nt["id"]})

        width = max(n["cx"] + n["w"] / 2 for n in self.nodes.values())
        width = max(width, max((nt["x"] + nt["w"] for nt in self.notes), default=0)) + 80
        diagram = ET.SubElement(defs, q("bpmndi", "BPMNDiagram"), {"id": self._id("Diagram", "d")})
        plane = ET.SubElement(diagram, q("bpmndi", "BPMNPlane"), {"id": self._id("Plane", "d"), "bpmnElement": collab.get("id")})

        def shape(el_id, x, y, w, h, **extra):
            s = ET.SubElement(plane, q("bpmndi", "BPMNShape"), {"id": f"{el_id}_di", "bpmnElement": el_id, **extra})
            ET.SubElement(s, q("dc", "Bounds"), {"x": f"{x:.0f}", "y": f"{y:.0f}", "width": f"{w:.0f}", "height": f"{h:.0f}"})
            return s

        def label(pai, x, y, w, h):
            label_el = ET.SubElement(pai, q("bpmndi", "BPMNLabel"))
            ET.SubElement(label_el, q("dc", "Bounds"), {"x": f"{x:.0f}", "y": f"{y:.0f}", "width": f"{w:.0f}", "height": f"{h:.0f}"})

        shape(part_id, 0, 0, width + 30, self.height, isHorizontal="true")
        for r in self.lanes:
            shape(r["id"], 30, r["top"], width, r["height"], isHorizontal="true")
        for n in self.nodes.values():
            x, y = n["cx"] - n["w"] / 2, n["cy"] - n["h"] / 2
            extra = {"isMarkerVisible": "true"} if n["kind"] == "exclusiveGateway" else {}
            s = shape(n["id"], x, y, n["w"], n["h"], **extra)
            if n["kind"] == "exclusiveGateway" and n["name"]:
                if n["label"] == "top":
                    label(s, n["cx"] - 70, y - 42, 140, 36)
                elif n["label"] == "left":
                    label(s, x - 150, n["cy"] - 18, 140, 36)
                elif n["label"] == "right":
                    label(s, x + n["w"] + 8, n["cy"] - 40, 140, 36)
                else:
                    label(s, n["cx"] - 70, y + n["h"] + 6, 140, 36)
            elif n["kind"].endswith("Event"):
                label(s, n["cx"] - 70, y + n["h"] + 6, 140, 36)
        for nt in self.notes:
            shape(nt["id"], nt["x"], nt["y"], nt["w"], nt["h"])
        for f in self.flows:
            e = ET.SubElement(plane, q("bpmndi", "BPMNEdge"), {"id": f"{f['id']}_di", "bpmnElement": f["id"]})
            for x, y in f["path"]:
                ET.SubElement(e, q("di", "waypoint"), {"x": f"{x:.0f}", "y": f"{y:.0f}"})
            if f["name"]:
                if f["label_at"]:
                    lx, ly = f["label_at"]
                else:
                    (x1, y1), (x2, y2) = f["path"][0], f["path"][1]
                    lx, ly = (x1 + 10, y1 - 26) if abs(y1 - y2) < 1 else (x1 + 8, y1 + (12 if y2 > y1 else -32))
                label(e, lx, ly, 9 * len(f["name"]) + 12, 20)
        for nt in self.notes:
            e = ET.SubElement(plane, q("bpmndi", "BPMNEdge"), {"id": f"{nt['assoc']}_di", "bpmnElement": nt["assoc"]})
            for x, y in nt["path"]:
                ET.SubElement(e, q("di", "waypoint"), {"x": f"{x:.0f}", "y": f"{y:.0f}"})

        ET.indent(defs)
        ET.ElementTree(defs).write(path, encoding="UTF-8", xml_declaration=True)
        return path

    def _check(self):
        for f in self.flows:
            assert f["source"] in self.nodes and f["target"] in self.nodes, f
        for key, n in self.nodes.items():
            has_incoming = any(f["target"] == key for f in self.flows)
            has_outgoing = any(f["source"] == key for f in self.flows)
            if n["kind"] != "startEvent":
                assert has_incoming, f"sem entrada: {key}"
            if n["kind"] != "endEvent":
                assert has_outgoing, f"sem saída: {key}"
            if n["kind"] == "exclusiveGateway":
                outgoing = [f for f in self.flows if f["source"] == key]
                if len(outgoing) > 1:
                    assert all(f["name"] for f in outgoing), f"gateway com saída sem nome: {key}"
