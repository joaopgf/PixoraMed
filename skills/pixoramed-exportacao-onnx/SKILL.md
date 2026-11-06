---
name: pixoramed-exportacao-onnx
description: Converta os modelos PyTorch do PixoraMed em pares .onnx e .json para a pasta models/ e confira se a conversão preserva a saída. Use quando chegar um .pt novo, ao criar os scripts de exportação ou quando um módulo aparecer como não conectado.
---

# Exportação para ONNX

A API roda ONNX na CPU, sem PyTorch em produção. Cada modelo é um par em `models/`: `<id>.onnx` e `<id>.json`. Os scripts ficam em `backend/scripts/` e rodam de dentro de `backend/`, com o `.venv` ativo (`pip install -r requirements-dev.txt`, que inclui `onnx` e `onnxscript`, mais `torch` e `torchvision` de CPU).

No Windows, defina `PYTHONUTF8=1` antes de exportar: o exportador imprime um emoji que o console cp1252 não aceita.

## CNN pequena: `scripts/exportar_onnx.py`

```sh
python scripts/exportar_onnx.py "caminho/oral_cor_4901porclasse.pt"
```

O script deve:

1. Carregar com `torch.load(caminho, map_location="cpu", weights_only=True)`. Se o arquivo só tiver `state_dict`, exigir `--cancer`, `--modo`, `--classes` e `--escala`. Aceitar também `--id`, `--saida`, `--tamanho` e `--descricao`.
2. Recriar o `CustomModel` com os mesmos nomes (`self.net`), carregar os pesos e chamar `eval()`.
3. Gerar o id `<cancer>_<modo>` sem acentos, mesmo que o arquivo tenha sufixo como `_4900porclasse`. Exemplo: `cerebro_cinza`.
4. Exportar com `torch.onnx.export(modelo, (exemplo,), arquivo, input_names=["imagem"], output_names=["logits"], external_data=False)`. Sem `external_data=False`, surge um `.onnx.data` separado.
5. Criar o exemplo no intervalo do treino: `torch.rand(...) * (255.0 / escala)`.
6. Comparar PyTorch e ONNX Runtime com `np.allclose(esperado, obtido, rtol=1e-3, atol=1e-4)`. Se diferirem, encerrar com erro.
7. Gravar o `.json`, em UTF-8, sem escapar acentos:

```json
{
  "id": "oral_cor",
  "cancer": "Oral",
  "modo": "cor",
  "tamanho": 128,
  "escala": 255.0,
  "classes": ["normal", "scc"],
  "descricao": "",
  "metricas": {},
  "arquivo_onnx": "oral_cor.onnx"
}
```

O campo `cancer` precisa ser igual ao nome do módulo no front: `Pele`, `Oral` ou `Cérebro`.

## Ensemble da Pele: `scripts/exportar_ensemble_pele.py`

```sh
python scripts/exportar_ensemble_pele.py "caminho/HAM10000_PACOTE_INFERENCIA"
```

Entrada, dentro da pasta do pacote: `artifacts/ham10000_binary_ensemble/ensemble_config.json` e `artifacts/ham10000_binary_ensemble/checkpoints/fold_N_best.pt`, com `state_dict` e `calibration` (`slope`, `intercept`) em cada checkpoint. O arquivo de configuração traz `architecture`, `image_size`, `normalization` (`mean`, `std`), `threshold` e `fold_models` (lista com `checkpoint`). Confira se `architecture` é `efficientnet_b0`.

Una tudo em um único ONNX, para o sistema carregar um arquivo só:

```python
class EnsembleCalibrado(Module):
    def forward(self, x):
        logits = torch.cat([rede(x).reshape(-1) for rede in self.redes])
        return torch.sigmoid(self.slopes * logits + self.intercepts).mean().reshape(1)
```

Exporte com `output_names=["prob_maligno"]` e `external_data=False`. Compare com o PyTorch em entradas aleatórias, com tolerância de `1e-4`. O `.json` traz também:

```json
{
  "id": "pele_cor",
  "cancer": "Pele",
  "modo": "cor",
  "tamanho": 224,
  "escala": 255.0,
  "media": [0.485, 0.456, 0.406],
  "desvio": [0.229, 0.224, 0.225],
  "classes": ["benigno", "maligno"],
  "limiar": 0.17999999999999994,
  "descricao": "Ensemble de 5 EfficientNet-B0 calibradas. Maligno: melanoma e carcinoma basocelular. Benigno: nevo, ceratose benigna, dermatofibroma e lesão vascular. Queratose actínica (akiec) ficou fora do treino.",
  "metricas": {},
  "arquivo_onnx": "pele_cor.onnx"
}
```

A ordem de `classes` é fixa: o ONNX devolve a probabilidade da segunda classe. O limiar vem do campo `threshold` de `ensemble_config.json`.

A reprodução do treino não guarda a calibração no `.pt`: os valores estão em `calibracao_e_limiar.json` (`inclinacao`, `intercepto`, `limiar`). Só use esse modelo no app se o usuário pedir, porque ele é outro modelo.

## Depois de converter

1. Reinicie a API e confirme o modelo em `GET /api/modelos`.
2. Compare o `.pt` e o ONNX em imagens reais e separadas: as matrizes de confusão devem ser iguais.
3. No ensemble, compare também com o preditor original, se ele existir, usando o pré-processamento do app.
4. Se os ONNX já vieram prontos e não há `.pt`, não há como repetir esta comparação: relate isso como pendência e confira apenas se a API carrega os modelos.
5. Só faça commit dos arquivos de `models/` se o usuário pedir. Não invente métricas no `.json`: treino final sem folds fica com `metricas` vazio.
