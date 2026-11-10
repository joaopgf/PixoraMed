# Como salvar o modelo nos notebooks

Os notebooks treinam um modelo por fold e não guardam nenhum deles. Para o app, treinamos **um modelo final com todas as imagens**, usando a configuração escolhida (cor ou cinza, com ou sem normalização), e salvamos esse modelo.

Este `.pt` também é o "pickle" pedido pelo professor.

## 1. Treinar e salvar no notebook

Os 18 notebooks do repositório **Projeto-ML-Cancer** já têm a célula pronta, na seção "Salvar o modelo final", no fim do arquivo. Rode `git pull` antes para recebê-la.

1. Abra o notebook e confira `normalizar` na célula de hiperparâmetros.
2. Rode as células de cima até a de hiperparâmetros.
3. **Pule** as células de treino com folds, gráficos e `save_results`. Não é preciso repetir os 5 folds.
4. Rode a última célula.

O modelo é salvo em `Projeto-ML-Cancer/modelos_pt/<cancer>_<modo>.pt` (por exemplo, `mama_cor.pt`). O treino leva cerca de 1,25 vez o tempo de um fold, porque usa todas as imagens. Essa pasta fica fora do git, então guardem os `.pt` no pendrive ou no Drive.

A célula já traz o nome do câncer, o nome do arquivo e as métricas do `resultados.csv`, escolhidas conforme o valor de `normalizar`. Se a configuração ainda não tem resultado, `metricas` fica vazio e o app só deixa de mostrá-las. Quando ela rodar, preencham com a linha correspondente do `resultados.csv`.

### Qual configuração salvar

Regra geral: **colorido e normalizado** (`rna_cor`, `normalizar = True`). As exceções são:

- **Cérebro**: `rna_cinza/rna_Cerebro.ipynb` com `normalizar = False`. Normalizado, ele não convergiu em 450 épocas (88,90%); sem normalizar, chegou a 95,17%. Quando o Cérebro cor sem normalização rodar, comparem os dois.
- **Pele**: é a única que precisa de ajuste manual:
  - troquem `epocas_final` pela melhor época média da validação (aparece no `resumo.png`);
  - preencham `metricas` com o resultado dos 5 folds;
  - confiram `limit` e `max_epochs` na configuração do treino: os valores padrão do arquivo são `None` e 600, e a última rodada usou 1000 e 450. Com todas as imagens, a pele pode pesar na A400 de 4 GB.

## 2. Converter para ONNX

De dentro de `PixoraMed/ai-service`, com o `.venv` ativo e o PyTorch instalado (veja o README do ai-service):

```bash
python scripts/export_onnx.py "C:\caminho\para\Projeto-ML-Cancer\modelos_pt\oral_cor.pt"
```

O script gera `models/oral_color.onnx` e `models/oral_color.json`, confere se o ONNX dá a mesma saída que o PyTorch e mostra a diferença máxima.

## 3. Carregar no app

Os modelos ficam no ai-service (pasta `ai-service/models/`). Reinicie-o para ele carregar o modelo novo:

- **Terminal**: Ctrl+C no `uvicorn` da pasta `ai-service` e rode de novo.
- **Docker**: `docker compose restart ai-service` (dentro de `infra/`).

O modelo aparece em "Nova análise" em até 5 minutos, quando o backend renova a lista de modelos. Façam commit dos arquivos de `ai-service/models/`, porque o deploy no Render só enxerga o que está no GitHub.

## Cuidado

**O pré-processamento do app é o mesmo dos notebooks**: OpenCV, BGR → RGB na cor, `IMREAD_GRAYSCALE` no cinza, resize para 128×128, divisão pela escala (`scale` no .json). Se mudarem isso nos notebooks, mudem também em `ai-service/app/inference.py`.
