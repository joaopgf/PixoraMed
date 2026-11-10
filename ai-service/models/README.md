# models/

Modelos que o ai-service carrega ao iniciar. Cada modelo é um par:

- `<id>.onnx`: a rede exportada
- `<id>.json`: metadados (`cancer_type`, `mode` color/gray, `size`, `scale`, `classes`, `metrics`, `description`)

| Arquivo | Módulo | Classes | Tamanho |
|---|---|---|---|
| `skin_color` | Pele (ensemble de 5 EfficientNet-B0, com `threshold` de decisão, `mean` e `std`) | `benign`, `malignant` | ~80 MB |
| `oral_color` | Oral (CNN pequena) | `normal`, `scc` | ~110 KB |
| `brain_gray` | Cérebro (CNN pequena) | `glioma`, `menin`, `tumor` | ~110 KB |

Os pares são gerados por `scripts/export_onnx.py` (CNN pequena) e `scripts/export_skin_ensemble.py` (Pele) a partir dos `.pt` dos notebooks. Veja `docs/save_model.md`.

O `skin_color.onnx` tem ~80 MB, perto do limite de 100 MB por arquivo do GitHub.
