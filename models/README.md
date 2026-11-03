# models/

Modelos que a API carrega ao iniciar. Cada modelo é um par:

- `<id>.onnx`: a rede exportada
- `<id>.json`: metadados (câncer, modo cor/cinza, tamanho, escala, classes, métricas)

Os dois são gerados por `backend/scripts/exportar_onnx.py` a partir do `.pt` salvo no notebook. Veja `docs/salvar_modelo.md`.

Cada modelo tem uns 20 KB, então eles podem ir para o git normalmente.
