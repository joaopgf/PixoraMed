---
name: pixoramed-governanca
description: Escreva os avisos, as limitações, os créditos e os textos de uso responsável do PixoraMed nas telas e na documentação. Use ao criar a página de limitações, avisos de resultado, créditos, README ou material para a banca.
---

# Governança e uso responsável

A interface deve deixar claro o que o sistema não faz. Consulte `pixoramed-regras-do-produto` para os números e as regras de honestidade.

## Avisos fixos

- **Todo resultado:** "MODELO EXPERIMENTAL: ESTE RESULTADO NÃO É UM DIAGNÓSTICO".
- **Barra lateral:** "Os modelos são experimentais e não foram validados clinicamente. O resultado não é um diagnóstico."
- **Resultado:** "Revisão profissional obrigatória. Qualquer uso real exigiria validação clínica, controle de qualidade da imagem e trilha de auditoria."
- **Preparar:** "Use somente material de teste ou de dataset público. Não informe nome, CPF, data de nascimento ou outro dado de paciente."
- **Consentimento:** "Confirmo que estou usando material autorizado e desidentificado. Entendo que a imagem é enviada ao servidor para a análise e descartada em seguida, e que o resultado não é um diagnóstico."

## Limitações por módulo

**Cérebro**, no resultado e nas limitações:

> Este módulo diferencia apenas glioma, meningioma e tumor hipofisário. Ele não detecta a ausência de tumor, não reconhece outros tipos e não indica se o tumor é benigno ou maligno.

**Oral e Cérebro:**

> O Multi Cancer foi aumentado (rotação, deslocamento, zoom, espelhamento e brilho). Variações da mesma imagem podem cair no treino e no teste.

**Pele:** o modelo separa benigno de maligno, com divisão por lesão e não por paciente. Queratose actínica ficou fora do treino, então uma imagem dela recebe uma das duas classes. O limiar de 18% favorece encontrar casos malignos e aumenta os alarmes falsos. Vale só para imagens dermatoscópicas, não para fotos comuns de celular.

Se usar a reprodução do treino, diga:

> Estes números não são do modelo pele_cor usado nas análises.

## Página de limitações

Organize nestas seções:

1. **Não é um diagnóstico:** sem validação clínica; o sistema não reconhece imagem de outro tipo; a regra de cada módulo; a confiança não é certeza.
2. **Vazamento entre treino e teste:** explique o risco no Multi Cancer como possibilidade, não como fato.
3. **O número honesto: pele:** a divisão por lesão e a diferença entre o modelo do app e a reprodução.
4. **Viés:** HAM10000 desbalanceado (nevo ~67%, dermatofibroma ~1%); desempenho desconhecido em tons de pele pouco representados; a rede pode aprender o aparelho, e não a doença.
5. **Privacidade (LGPD):** imagem processada em memória e descartada; o banco guarda só modelo, classe, confiança, tempo e horário; não enviar dados que identifiquem pacientes.
6. **Limitação técnica e trabalhos futuros:** sem filtro de imagem incompatível, por decisão do projeto. Como trabalho futuro, comparar as imagens ao padrão do treino ou identificar o tipo de exame. O inconclusivo só pega baixa confiança: erros com confiança alta continuam passando, sobretudo em imagens de outra origem.
7. **Datasets e créditos.**

## Observações por dataset

Texto de `NOTAS_DATASET`, em `frontend/src/dados.ts`:

- **Pele:** "Único dataset dividido por lesão (sem vazamento de lesão). F1 ~50% é da CNN pequena de 7 classes, medido em dois folds, e não é o modelo usado no app."
- **Cérebro:** "Normalizado não convergiu em 450 épocas; sem normalizar, cor e cinza empataram (94,37% e 95,17%). O modelo só separa tipos de tumor: não há classe sem tumor."
- **Oral:** "Cinza sem normalização teve overfitting claro: treino ~99%, teste ~75%."

## Créditos obrigatórios

Mostre na página inicial, nas limitações e no README:

- **Multi Cancer Dataset**, usado em Oral e Cérebro: <https://www.kaggle.com/datasets/obulisainaren/multi-cancer>. O autor pede esta citação: "Obuli Sai Naren. (2022). Multi Cancer Dataset [Data set]. Kaggle. <https://doi.org/10.34740/KAGGLE/DSV/3415848>"
- **Skin Cancer MNIST: HAM10000**, usado em Pele: <https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000>, publicado no Kaggle por K Scott Mader. Citação: "Tschandl, P., Rosendahl, C. & Kittler, H. (2018). The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. Scientific Data, 5, 180161. <https://doi.org/10.1038/sdata.2018.161>"

Os dois usam a licença **CC BY-NC-SA 4.0**: exigem crédito, proíbem uso comercial e pedem a mesma licença em material derivado. Isso afeta o discurso de negócio: um produto exigiria outros dados.

## Como falar dos resultados

Modelo de texto:

> O modelo teve X% em imagens separadas da mesma fonte. Como o dataset foi aumentado e não dividimos por paciente, esse número pode ser otimista. Ainda falta avaliar em exames de outra origem.

Evite "o modelo acerta X%" sem dizer em quais imagens. Na Pele, destaque sensibilidade e especificidade, porque a acurácia engana: chutar sempre benigno daria cerca de 84%.

## Uso de IA no desenvolvimento

Informe que o grupo usou assistentes de IA para escrever código e que resultados e decisões precisam de revisão humana.
