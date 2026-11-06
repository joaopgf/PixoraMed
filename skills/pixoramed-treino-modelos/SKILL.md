---
name: pixoramed-treino-modelos
description: Prepare os notebooks PyTorch que treinam os modelos de Pele, Oral e Cérebro do PixoraMed, com divisão correta dos dados, métricas em CSV e arquivos .pt. Use ao criar ou alterar treinos, ou quando faltarem modelos para o app. Não execute treinos longos sem pedido.
---

# Treino dos modelos

O treino fica no repositório **Projeto-ML-Cancer**, com notebooks em `rna_cor/` e `rna_cinza/`, dados em `data/` (fora do git) e modelos em `modelos_pt/` (fora do git). O usuário roda os notebooks na GPU. Teste o código fora do Jupyter, na CPU, com dados falsos em pasta temporária.

Consulte `pixoramed-regras-do-produto` para as regras de honestidade.

## CNN pequena (Oral e Cérebro)

```python
class CustomModel(Module):
    def __init__(self, canais, n_classes):
        super().__init__()
        self.net = Sequential(
            Conv2d(canais, 16, kernel_size=3, padding=1), ReLU(), MaxPool2d(kernel_size=2),
            Conv2d(16, 32, kernel_size=3, padding=1), ReLU(), MaxPool2d(kernel_size=2),
            Conv2d(32, 64, kernel_size=3, padding=1), ReLU(), MaxPool2d(kernel_size=2),
            AdaptiveAvgPool2d(1), Flatten(), Dropout(p=0.25), Linear(64, n_classes),
        )
```

Parâmetros: Adam, `lr=0.001`, batch 64, 128x128, 450 épocas, `StratifiedKFold` de 5 folds, seed 42. Sem pré-treino, sem aumento próprio e sem BatchNorm.

Carregamento:

- **Cor:** `cv2.IMREAD_COLOR`, `BGR2RGB`, `cv2.resize`, transposição para `(N, 3, 128, 128)`.
- **Cinza:** `cv2.IMREAD_GRAYSCALE`, `cv2.resize`, `expand_dims` para `(N, 1, 128, 128)`.
- **Escala:** divide por 255 se `normalizar=True` e por 1 se `False`.

| Modelo final | Notebook | `normalizar` | Dados |
|---|---|---|---|
| `oral_cor` | `rna_cor/rna_Oral.ipynb` | `True` | Multi Cancer, classes `normal` e `scc` |
| `cerebro_cinza` | `rna_cinza/rna_Cerebro.ipynb` | `False` | Multi Cancer, classes `glioma`, `menin` e `tumor` |

**Teste separado:** antes do treino final, retire do dataset as imagens `_4901` a `_5000` de cada classe. Elas formam o teste de 100 imagens por classe. Treine com o restante e sem folds. Sem isso, o número não vale.

Salve o `.pt` em `modelos_pt/` com: `state_dict`, `class_names`, `size`, `modo`, `escala`, `cancer`, `metricas`, `conversao_cor`, `limite`, `epocas`. Treino sem folds não tem métricas de validação: deixe `metricas` vazio.

## Pele: reprodução com EfficientNet-B0

O `pele_cor` em uso veio de um pacote de outro integrante, com 5 checkpoints, e o código de treino dele não está disponível. Se precisar treinar, a reprodução usa o método abaixo e **gera outro modelo**. Número de épocas, taxa de aprendizado e perda do treino original são desconhecidos; estes são os valores escolhidos pelo grupo.

- **Dados:** HAM10000. Descarte `akiec`. Alvo: `maligno` para `bcc` e `mel`. Encontre as imagens com `rglob`, sem diferenciar maiúsculas de minúsculas, porque o Kaggle repete as pastas.
- **Divisão:** `StratifiedGroupKFold` com `lesion_id` como grupo e `dx` como estratificação, seed 42. O primeiro de 5 cortes separa o teste; 5 folds por lesão no restante. Falhe com `assert` se houver lesão em comum.
- **Modelo:** `efficientnet_b0` com pesos ImageNet e `classifier[1] = nn.Linear(in_features, 1)`.
- **Entrada:** RGB, `resize` bicúbico do PIL para 224x224, normalização ImageNet (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).
- **Aumento só no treino:** espelho horizontal e vertical, rotação de 15° e `ColorJitter(brightness=0.08, contrast=0.08, saturation=0.06, hue=0.01)`.
- **Treino:** `BCEWithLogitsLoss` com `pos_weight` negativos/positivos, `AdamW` (`lr=3e-4`, `weight_decay=1e-4`), `CosineAnnealingLR`, AMP, 12 épocas, paciência 4, batch 32. Guarde a época de melhor AUC de validação.
- **Calibração:** Platt em cada fold (`LogisticRegression(C=1e6)` sobre os logits de validação).
- **Limiar:** de 0,01 a 0,99, o que maximiza a acurácia balanceada fora do teste; no empate, a maior sensibilidade. Não olhe o teste.
- **Teste:** média das probabilidades calibradas dos 5 modelos.
- **Retomada:** salve cada fold ao terminar e grave o marcador por último, para retomar se a sessão cair. Recuse retomar se a configuração mudou.
- **`teste_rapido`:** com 60 imagens por diagnóstico, 2 folds e 1 época, em outra pasta, fora do CSV compartilhado.

Saídas em `resultados/Pele/<nome>/`: `curvas_treino.png`, `matriz_confusao_teste.png`, `roc_teste.png`, `calibracao_teste.png`, `acerto_por_diagnostico.png`, `metricas_teste.csv`, `historico_epocas.csv`, `imagens_teste.csv`, `auditoria_divisao.json`, `calibracao_e_limiar.json`. Todo gráfico leva o título "REPRODUÇÃO DO TREINO, não é o modelo do app".

## Formato do CSV de treinos

Separador `;`, vírgula decimal, `utf-8-sig`. Uma linha por execução, com estas colunas, nesta ordem:

```
data_hora;dataset;modo;normalizado;imagens_total;imagens_por_classe;tamanho;epocas;batch;lr;folds;gpu;tempo_total;acc_media_%;acc_desvio_%;f1_media_%;f1_desvio_%;acc_por_fold_%;f1_por_fold_%;pasta_graficos
```

O campo `dataset` segue o padrão `<Câncer> <cor|cinza> [variante]`, por exemplo `Pele cor EfficientNet-B0 binario reproducao`.

## No Colab

Monte o Drive, extraia o dataset para o disco local e aponte `DATA_DIR` para a pasta real. **Grave resultados e modelos no Drive**, para não perdê-los se a sessão cair. Confira se o ambiente tem GPU.

## Antes de fazer commit

Limpe as saídas dos notebooks e mantenha o JSON no formato original, com `source` como lista de linhas. Não regrave nem apague `.pt` sem pedido.
