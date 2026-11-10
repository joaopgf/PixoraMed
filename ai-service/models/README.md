# models/

Modelos que a API carrega ao iniciar. Cada modelo é um par:

- `<id>.onnx`: a rede exportada
- `<id>.json`: metadados (câncer, modo cor/cinza, tamanho, escala, classes, métricas)

Os dois são gerados por `backend/scripts/exportar_onnx.py` a partir do `.pt` salvo no notebook. Veja `docs/salvar_modelo.md`.

A exceção é `pele_cor`, gerado por `backend/scripts/exportar_ensemble_pele.py`. O `.onnx` reúne 5 EfficientNet-B0 e devolve a probabilidade calibrada de "maligno". O `.json` traz também a normalização (`media`, `desvio`) e o `limiar` de decisão.

Os modelos de Oral e Cérebro têm uns 110 KB. O da Pele tem uns 80 MB, perto do limite de 100 MB por arquivo do GitHub.
