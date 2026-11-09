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
for _prefixo, _uri in NS.items():
    ET.register_namespace(_prefixo, _uri)

COL = 270  # largura de uma coluna
X0 = 190  # x do centro da coluna 0
LINHA = 150  # altura de uma linha dentro da raia
MARGEM_RAIA = 85  # do topo da raia ao centro da linha 0
TAMANHOS = {
    "task": (210, 90), "userTask": (210, 90), "serviceTask": (210, 90),
    "exclusiveGateway": (60, 60), "startEvent": (40, 40), "endEvent": (40, 40),
}


def q(prefixo, nome):
    return f"{{{NS[prefixo]}}}{nome}"


class Diagrama:
    def __init__(self, chave, nome, raias):
        """raias: lista de (chave, nome, quantidade de linhas)."""
        self.chave = chave
        self.nome = nome
        self.raias = []
        topo = 0
        for chave_raia, nome_raia, linhas in raias:
            altura = MARGEM_RAIA * 2 + (linhas - 1) * LINHA
            self.raias.append(dict(chave=chave_raia, nome=nome_raia, topo=topo, altura=altura))
            topo += altura
        self.altura = topo
        self.nos, self.fluxos, self.notas = {}, [], []

    def _id(self, tipo, chave):
        return f"{tipo}_" + hashlib.sha1(f"{self.chave}-{chave}".encode()).hexdigest()[:12]

    def _raia(self, chave):
        return next(r for r in self.raias if r["chave"] == chave)

    def no(self, chave, tipo, nome, raia, col, linha=0, rotulo="baixo"):
        r = self._raia(raia)
        cx = X0 + col * COL
        cy = r["topo"] + MARGEM_RAIA + linha * LINHA
        w, h = TAMANHOS[tipo]
        self.nos[chave] = dict(tipo=tipo, nome=nome, raia=raia, cx=cx, cy=cy, w=w, h=h, rotulo=rotulo, id=self._id(tipo, chave))

    # ---- pontos de conexão ----
    def _borda(self, chave, lado):
        n = self.nos[chave]
        return {
            "dir": (n["cx"] + n["w"] / 2, n["cy"]), "esq": (n["cx"] - n["w"] / 2, n["cy"]),
            "cima": (n["cx"], n["cy"] - n["h"] / 2), "baixo": (n["cx"], n["cy"] + n["h"] / 2),
        }[lado]

    def fluxo(self, origem, destino, nome=None, rota="auto", pontos=None, saida=None, entrada=None, rotulo_em=None):
        o, d = self.nos[origem], self.nos[destino]
        if pontos is not None:
            # pontos intermediários explícitos; saída e entrada pelos lados indicados (ou adivinhados)
            primeiro, ultimo = pontos[0], pontos[-1]
            saida = saida or ("dir" if primeiro[0] > o["cx"] + 1 else "esq" if primeiro[0] < o["cx"] - 1 else ("cima" if primeiro[1] < o["cy"] else "baixo"))
            entrada = entrada or ("esq" if ultimo[0] < d["cx"] - 1 else "dir" if ultimo[0] > d["cx"] + 1 else ("cima" if ultimo[1] < d["cy"] else "baixo"))
            caminho = [self._borda(origem, saida), *pontos, self._borda(destino, entrada)]
        else:
            if rota == "auto":
                rota = "reta" if abs(o["cy"] - d["cy"]) < 1 or abs(o["cx"] - d["cx"]) < 1 else "hv"
            if rota == "reta":
                if abs(o["cy"] - d["cy"]) < 1:
                    a, b = ("dir", "esq") if d["cx"] > o["cx"] else ("esq", "dir")
                else:
                    a, b = ("baixo", "cima") if d["cy"] > o["cy"] else ("cima", "baixo")
                caminho = [self._borda(origem, a), self._borda(destino, b)]
            elif rota == "hv":
                a = "dir" if d["cx"] > o["cx"] else "esq"
                b = "cima" if d["cy"] > o["cy"] else "baixo"
                inicio, fim = self._borda(origem, a), self._borda(destino, b)
                caminho = [inicio, (fim[0], inicio[1]), fim]
            elif rota == "vh":
                a = "baixo" if d["cy"] > o["cy"] else "cima"
                b = "esq" if d["cx"] > o["cx"] else "dir"
                inicio, fim = self._borda(origem, a), self._borda(destino, b)
                caminho = [inicio, (inicio[0], fim[1]), fim]
            else:
                raise ValueError(rota)
        self.fluxos.append(dict(origem=origem, destino=destino, nome=nome, caminho=caminho, rotulo_em=rotulo_em,
                                id=self._id("Flow", f"{origem}-{destino}-{len(self.fluxos)}")))

    def nota(self, chave, texto, ligada_a, dx, dy, largura=300, altura=70, lado=None):
        """Anotação com o canto superior esquerdo em (centro do nó + dx, centro do nó + dy)."""
        n = self.nos[ligada_a]
        x, y = n["cx"] + dx, n["cy"] + dy
        if lado is None:
            lado = "baixo" if y > n["cy"] else "cima"
        inicio = self._borda(ligada_a, lado)
        # liga ao ponto mais próximo da borda esquerda da anotação
        fim = (x, min(max(inicio[1], y), y + altura)) if x > inicio[0] + 1 else (min(max(inicio[0], x), x + largura), y if lado == "baixo" else y + altura)
        self.notas.append(dict(chave=chave, texto=texto, x=x, y=y, w=largura, h=altura, alvo=ligada_a, caminho=[inicio, fim],
                               id=self._id("TextAnnotation", chave), assoc=self._id("Association", chave)))

    # ---- XML ----
    def salvar(self, caminho):
        self._conferir()
        defs = ET.Element(q("bpmn", "definitions"), {
            "id": self._id("Definitions", "d"), "targetNamespace": "https://pixoramed/bpmn",
            "exporter": "PixoraMed gerador BPMN", "exporterVersion": "1.0",
        })
        colab = ET.SubElement(defs, q("bpmn", "collaboration"), {"id": self._id("Collaboration", "c")})
        proc_id = self._id("Process", "p")
        part_id = self._id("Participant", "p")
        ET.SubElement(colab, q("bpmn", "participant"), {"id": part_id, "name": self.nome, "processRef": proc_id})
        proc = ET.SubElement(defs, q("bpmn", "process"), {"id": proc_id, "name": self.nome, "isExecutable": "false"})
        lane_set = ET.SubElement(proc, q("bpmn", "laneSet"), {"id": self._id("LaneSet", "l")})
        for r in self.raias:
            r["id"] = self._id("Lane", r["chave"])
            lane = ET.SubElement(lane_set, q("bpmn", "lane"), {"id": r["id"], "name": r["nome"]})
            for n in self.nos.values():
                if n["raia"] == r["chave"]:
                    ET.SubElement(lane, q("bpmn", "flowNodeRef")).text = n["id"]
        for chave, n in self.nos.items():
            el = ET.SubElement(proc, q("bpmn", n["tipo"]), {"id": n["id"]})
            if n["nome"]:
                el.set("name", n["nome"])
            for f in self.fluxos:
                if f["destino"] == chave:
                    ET.SubElement(el, q("bpmn", "incoming")).text = f["id"]
            for f in self.fluxos:
                if f["origem"] == chave:
                    ET.SubElement(el, q("bpmn", "outgoing")).text = f["id"]
        for f in self.fluxos:
            attrs = {"id": f["id"], "sourceRef": self.nos[f["origem"]]["id"], "targetRef": self.nos[f["destino"]]["id"]}
            if f["nome"]:
                attrs["name"] = f["nome"]
            ET.SubElement(proc, q("bpmn", "sequenceFlow"), attrs)
        for nt in self.notas:
            el = ET.SubElement(proc, q("bpmn", "textAnnotation"), {"id": nt["id"]})
            ET.SubElement(el, q("bpmn", "text")).text = nt["texto"]
        for nt in self.notas:
            ET.SubElement(proc, q("bpmn", "association"), {"id": nt["assoc"], "sourceRef": self.nos[nt["alvo"]]["id"], "targetRef": nt["id"]})

        largura = max(n["cx"] + n["w"] / 2 for n in self.nos.values())
        largura = max(largura, max((nt["x"] + nt["w"] for nt in self.notas), default=0)) + 80
        diag = ET.SubElement(defs, q("bpmndi", "BPMNDiagram"), {"id": self._id("Diagram", "d")})
        plano = ET.SubElement(diag, q("bpmndi", "BPMNPlane"), {"id": self._id("Plane", "d"), "bpmnElement": colab.get("id")})

        def forma(el_id, x, y, w, h, **extra):
            s = ET.SubElement(plano, q("bpmndi", "BPMNShape"), {"id": f"{el_id}_di", "bpmnElement": el_id, **extra})
            ET.SubElement(s, q("dc", "Bounds"), {"x": f"{x:.0f}", "y": f"{y:.0f}", "width": f"{w:.0f}", "height": f"{h:.0f}"})
            return s

        def rotulo(pai, x, y, w, h):
            lab = ET.SubElement(pai, q("bpmndi", "BPMNLabel"))
            ET.SubElement(lab, q("dc", "Bounds"), {"x": f"{x:.0f}", "y": f"{y:.0f}", "width": f"{w:.0f}", "height": f"{h:.0f}"})

        forma(part_id, 0, 0, largura + 30, self.altura, isHorizontal="true")
        for r in self.raias:
            forma(r["id"], 30, r["topo"], largura, r["altura"], isHorizontal="true")
        for n in self.nos.values():
            x, y = n["cx"] - n["w"] / 2, n["cy"] - n["h"] / 2
            extra = {"isMarkerVisible": "true"} if n["tipo"] == "exclusiveGateway" else {}
            s = forma(n["id"], x, y, n["w"], n["h"], **extra)
            if n["tipo"] == "exclusiveGateway" and n["nome"]:
                if n["rotulo"] == "cima":
                    rotulo(s, n["cx"] - 70, y - 42, 140, 36)
                elif n["rotulo"] == "esq":
                    rotulo(s, x - 150, n["cy"] - 18, 140, 36)
                elif n["rotulo"] == "dir":
                    rotulo(s, x + n["w"] + 8, n["cy"] - 40, 140, 36)
                else:
                    rotulo(s, n["cx"] - 70, y + n["h"] + 6, 140, 36)
            elif n["tipo"].endswith("Event"):
                rotulo(s, n["cx"] - 70, y + n["h"] + 6, 140, 36)
        for nt in self.notas:
            forma(nt["id"], nt["x"], nt["y"], nt["w"], nt["h"])
        for f in self.fluxos:
            e = ET.SubElement(plano, q("bpmndi", "BPMNEdge"), {"id": f"{f['id']}_di", "bpmnElement": f["id"]})
            for x, y in f["caminho"]:
                ET.SubElement(e, q("di", "waypoint"), {"x": f"{x:.0f}", "y": f"{y:.0f}"})
            if f["nome"]:
                if f["rotulo_em"]:
                    lx, ly = f["rotulo_em"]
                else:
                    (x1, y1), (x2, y2) = f["caminho"][0], f["caminho"][1]
                    lx, ly = (x1 + 10, y1 - 26) if abs(y1 - y2) < 1 else (x1 + 8, y1 + (12 if y2 > y1 else -32))
                rotulo(e, lx, ly, 9 * len(f["nome"]) + 12, 20)
        for nt in self.notas:
            e = ET.SubElement(plano, q("bpmndi", "BPMNEdge"), {"id": f"{nt['assoc']}_di", "bpmnElement": nt["assoc"]})
            for x, y in nt["caminho"]:
                ET.SubElement(e, q("di", "waypoint"), {"x": f"{x:.0f}", "y": f"{y:.0f}"})

        ET.indent(defs)
        ET.ElementTree(defs).write(caminho, encoding="UTF-8", xml_declaration=True)
        return caminho

    def _conferir(self):
        for f in self.fluxos:
            assert f["origem"] in self.nos and f["destino"] in self.nos, f
        for chave, n in self.nos.items():
            entra = any(f["destino"] == chave for f in self.fluxos)
            sai = any(f["origem"] == chave for f in self.fluxos)
            if n["tipo"] != "startEvent":
                assert entra, f"sem entrada: {chave}"
            if n["tipo"] != "endEvent":
                assert sai, f"sem saída: {chave}"
            if n["tipo"] == "exclusiveGateway":
                saidas = [f for f in self.fluxos if f["origem"] == chave]
                if len(saidas) > 1:
                    assert all(f["nome"] for f in saidas), f"gateway com saída sem nome: {chave}"
