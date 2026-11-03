# Como salvar o modelo nos notebooks

Os notebooks treinam um modelo por fold e não guardam nenhum deles. Para o app, treinamos **um modelo final com todas as imagens**, usando a configuração escolhida (cor ou cinza, com ou sem normalização, número de épocas), e salvamos esse modelo.

Este `.pt` também é o "pickle" pedido pelo professor.

## 1. Célula para colar no fim do notebook

Não precisa rodar os 5 folds de novo. Rode só as células de cima até a de hiperparâmetros (a que define `normalizar`, `max_epochs` etc.), **pule** as células de treino com folds, gráficos e `save_results`, e rode esta no fim. Ela usa `features`, `targets`, `escala`, `class_names`, `max_epochs`, `batch`, `lr` e `criterion`.

As métricas mostradas no app vêm do `resultados.csv`: copie a linha da mesma configuração (mesmo câncer, modo e normalização).

```python
# Treino final com todas as imagens (sem folds), para o app PixoraMed
def treinar_modelo_final(features, targets, epochs, batch, criterion, lr=0.001):
    device = torch.device("cuda")
    torch.manual_seed(42)
    x_train = (torch.from_numpy(features).float() / escala).to(device)
    y_train = torch.from_numpy(targets).long().to(device)
    model = CustomModel(16900, len(class_names)).to(device)
    optimizer = Adam(model.parameters(), lr=lr)
    for _ in range(epochs):
        model.train()
        perm = torch.randperm(len(y_train), device=device)
        for start in range(0, len(perm), batch):
            idx = perm[start:start + batch]
            optimizer.zero_grad()
            loss = criterion(model(x_train[idx]), y_train[idx])
            loss.backward()
            optimizer.step()
    return model.eval().cpu()


modelo_final = treinar_modelo_final(features, targets, max_epochs, batch, criterion, lr)

cancer = "Mama"            # nome que aparece no app (ex.: "Colo do útero", "Pele")
arquivo = "mama_cor.pt"    # <cancer>_<modo>.pt, sem acento

# Métricas da validação cruzada (5 folds), copiadas do resultados.csv
metricas = {"acc_media": 98.45, "acc_desvio": 0.56, "f1_media": 98.45, "f1_desvio": 0.56}

Path("../modelos_pt").mkdir(exist_ok=True)
torch.save(
    {
        "state_dict": modelo_final.state_dict(),
        "class_names": class_names,
        "size": features.shape[2],
        "modo": "cor" if features.shape[1] == 3 else "cinza",
        "escala": escala,
        "cancer": cancer,
        "metricas": metricas,
    },
    Path("../modelos_pt") / arquivo,
)
print("Modelo salvo em", Path("../modelos_pt") / arquivo)
```

O treino final leva mais ou menos o tempo de um fold, um pouco mais por usar todas as imagens.

## 2. Converter para ONNX

De dentro de `PixoraMed/backend`, com o `.venv` ativo:

```bash
python scripts/exportar_onnx.py caminho/para/modelos_pt/mama_cor.pt
```

O script gera `models/mama_cor.onnx` e `models/mama_cor.json`, confere se o ONNX dá a mesma saída que o PyTorch e mostra a diferença máxima. Reinicie a API para ela carregar o modelo novo.

## Cuidados

- **O pré-processamento do app é o mesmo dos notebooks**: OpenCV, BGR → RGB na cor, `IMREAD_GRAYSCALE` no cinza, resize para 128×128, divisão pela `escala`. Se mudarem isso nos notebooks, mudem também em `backend/app/inferencia.py`.
- **Pele**: o `criterion` com peso por classe funciona igual. Para o treino final use o número de épocas indicado pela curva de validação (melhor época média), não o `max_epochs`.
- **Cérebro normalizado** precisa de mais épocas (não convergiu em 450). Vejam a seção 7.1 do resumo antes de escolher.
