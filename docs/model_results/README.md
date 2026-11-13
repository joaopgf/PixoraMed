<!-- Gráficos dos resultados dos modelos de Pele, Oral e Cérebro, guardados para consulta da banca e do grupo. -->

# Resultados dos modelos

Estes gráficos ficavam na página "Resultados dos treinos" do site. Ela saiu no commit `c35aa8e` (12/11/2026) porque o médico, que é quem usa o sistema, não precisa desses detalhes técnicos. Os gráficos ficam guardados aqui caso alguém pergunte.

Só aparecem os três módulos do sistema: Pele, Oral e Cérebro.

## Cuidados ao ler

- **Mesma fonte não é teste externo.** Todos os testes usam imagens do mesmo dataset do treino. Eles mostram que o modelo aprendeu aquele dataset, não que funciona com exames de outro hospital.
- **Pele: estes números não são do modelo do app.** O código original do `skin_color` foi perdido. O grupo reproduziu o treino com a mesma arquitetura e a mesma divisão, mas com parâmetros próprios.
- **Oral e Cérebro: experimentos, não o modelo do app.** Os experimentos usaram 1.000 imagens por classe e 5 folds para escolher a configuração. O modelo do app foi treinado depois com cerca de 4.900 imagens por classe, usando a configuração vencedora.
- Diferenças menores que cerca de 2 pontos ficam dentro do desvio entre os folds.

## Pele: reprodução do treino (`skin/`)

EfficientNet-B0 com 5 folds, benigno x maligno (melanoma e carcinoma basocelular). O teste usa 1.915 imagens separadas por lesão. O treino rodou em 06/11/2026 no Colab (Tesla T4) com `rna_cor/rna_Pele_EfficientNet.ipynb`, do Projeto-ML-Cancer. A queratose actínica (akiec) ficou de fora.

| Métrica                  | Valor | Detalhe                                                                        |
| ------------------------ | ----- | ------------------------------------------------------------------------------ |
| AUC-ROC                  | 0,939 | IC 95%: 0,922 a 0,954                                                          |
| Sensibilidade            | 89,0% | IC 95%: 84,1% a 93,1%; 275 de 309 malignos, 34 passaram como benignos          |
| Especificidade           | 83,7% | IC 95%: 81,6% a 86,0%; 1.344 de 1.606 benignos, 262 viraram falso alarme       |
| Valor preditivo positivo | 51,2% | Cerca de metade dos "maligno" era maligna (16% de malignos no teste)           |
| Acurácia balanceada      | 86,3% | Média da sensibilidade e da especificidade                                     |
| Acurácia                 | 84,5% | Responder sempre "benigno" daria 83,9%; sozinha, ela diz pouco neste dataset   |

Os intervalos de 95% vêm de bootstrap por lesão.

| Arquivo                     | O que mostra                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `training_curves.png`       | A perda de validação sobe enquanto a de treino cai, então há sobreajuste. Por isso cada fold usa a época com a melhor AUC de validação. |
| `test_confusion_matrix.png` | Matriz de confusão no teste, com o limiar de 19% escolhido fora do teste.                                                  |
| `test_roc.png`              | Curva ROC; o ponto vermelho marca o limiar de 19%.                                                                         |
| `test_calibration.png`      | Calibração: quanto mais perto da diagonal, mais a probabilidade prevista bate com a fração real de malignos.                |
| `accuracy_by_diagnosis.png` | Acerto por diagnóstico. O mais fraco é dermatofibroma (45,5%, só 22 imagens), seguido de ceratose benigna (67,8%).          |

## Oral e Cérebro: comparação das configurações (`comparisons/`)

A CNN pequena foi treinada com 1.000 imagens por classe, 5 folds, 450 épocas, lote 64 e taxa de aprendizado 0,001. Os gráficos mostram a acurácia média no teste, com o desvio padrão entre os folds como barra de erro. Eles são gerados a partir de `backend/src/main/resources/data/training-results.csv`, o mesmo CSV que alimentava a página do site.

| Arquivo                    | O que mostra                                         |
| -------------------------- | ---------------------------------------------------- |
| `color_vs_gray_div255.png` | Cor x cinza, com os pixels divididos por 255          |
| `color_vs_gray_raw.png`    | Cor x cinza, com os pixels de 0 a 255 (sem divisão)   |
| `div255_effect.png`        | Com e sem divisão por 255, nas 4 combinações          |

Resumo dos números (acurácia, média ± desvio):

| Módulo  | Cor /255     | Cor sem /255 | Cinza /255                  | Cinza sem /255   |
| ------- | ------------ | ------------ | --------------------------- | ---------------- |
| Oral    | **85,25 ± 1,78** | 84,85 ± 1,70 | 75,97 (média de 2 execuções) | 75,20 ± 1,93     |
| Cérebro | 90,13 ± 0,97 | 94,37 ± 1,81 | 88,90 ± 0,83                | **95,17 ± 0,55** |

Em negrito, a configuração usada no app. Na Oral, a cor pesa mais: em cinza sem divisão, o modelo sobreajustou (treino perto de 99%, teste perto de 75%). No Cérebro, as imagens são ressonâncias, que já são em cinza. Com a divisão por 255, o modelo cinza não convergiu em 450 épocas; sem ela, chegou a 95,17%.

O eixo vertical começa em 50% para as diferenças aparecerem; as barras não começam do zero.

Para gerar de novo (precisa do matplotlib):

```bash
python docs/model_results/generate.py
```

## Oral e Cérebro: treino de cada configuração (`oral/` e `brain/`)

Esta é a imagem de resumo que o notebook salva no fim de cada treino: erro e acurácia por época em cada fold, a acurácia e a F1 de cada fold no teste e a matriz de confusão somada dos 5 folds. As imagens foram copiadas de `Projeto-ML-Cancer/resultados/` e conferidas com a coluna `pasta_graficos` do CSV.

| Arquivo                        | Configuração                | Acurácia      | Origem no Projeto-ML-Cancer                 |
| ------------------------------ | --------------------------- | ------------- | ------------------------------------------- |
| `oral/oral_color_div255.png`   | Oral cor /255 (**app**)     | 85,25 ± 1,78  | `graficos_oral/Oral_cor_norm/2026-10-29_10-48-19`   |
| `oral/oral_color_raw.png`      | Oral cor sem /255           | 84,85 ± 1,70  | `graficos_oral/Oral_cor/2026-10-29_11-29-23`        |
| `oral/oral_gray_div255.png`    | Oral cinza /255 (1ª execução) | 75,15 ± 2,10 | `graficos_oral/Oral_cinza_norm/2026-10-29_12-54-41` |
| `brain/brain_color_div255.png` | Cérebro cor /255            | 90,13 ± 0,97  | `Cérebro/Cérebro_cor_norm/2026-10-30_00-10-04`      |
| `brain/brain_gray_div255.png`  | Cérebro cinza /255          | 88,90 ± 0,83  | `Cérebro/Cérebro_cinza_norm/2026-10-30_11-27-14`    |
| `brain/brain_gray_raw.png`     | Cérebro cinza sem /255 (**app**) | 95,17 ± 0,55 | `Cérebro/Cérebro_cinza/2026-10-30_11-56-55`   |

Estes resumos não estão na pasta local do Projeto-ML-Cancer. Os números estão no CSV, mas as imagens não:

- Oral cinza /255, 2ª execução (`Oral_cinza_norm/2026-10-30_09-14-31`, 76,80%)
- Oral cinza sem /255 (`Oral_cinza/2026-10-30_10-30-07`, 75,20%)
- Cérebro cor sem /255 (rodado no Colab, `Cerebro_Cor_Sem_Norm/graficos/2026-11-06_20-48-23`, 94,37%)

Se alguém do grupo tiver essas imagens, elas podem entrar aqui com o mesmo padrão de nome.
