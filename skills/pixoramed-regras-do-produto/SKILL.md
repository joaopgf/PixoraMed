---
name: pixoramed-regras-do-produto
description: Consulte o escopo, as classes, os limiares, as decisões fechadas e os resultados medidos do PixoraMed. Use sempre que for escrever código, textos, testes ou documentação do projeto, para não contradizer o que o grupo decidiu nem inventar números.
---

# Regras do produto PixoraMed

## O que é

Protótipo acadêmico do Bootcamp de IA (TCS / SENAI Londrina, 2026) que apoia a análise de imagens médicas. O usuário previsto é um médico, que escolhe o módulo certo. **Não faz diagnóstico e não teve validação clínica.**

## Módulos

| Módulo | Exame | Dataset | Modelo | Entrada | Escala | Classes |
|---|---|---|---|---|---|---|
| Pele | Dermatoscopia | HAM10000 | `pele_cor`: 5 EfficientNet-B0 calibradas | RGB, 224x224 | /255 e ImageNet | `benigno`, `maligno` |
| Oral | Histopatologia | Multi Cancer | `oral_cor`: CNN pequena | RGB, 128x128 | /255 | `normal`, `scc` |
| Cérebro | Ressonância | Multi Cancer | `cerebro_cinza`: CNN pequena | Cinza, 128x128 | Sem divisão | `glioma`, `menin`, `tumor` |

- Na Pele, `maligno` é melanoma (`mel`) ou carcinoma basocelular (`bcc`). `benigno` é `nv`, `bkl`, `df` ou `vasc`. Queratose actínica (`akiec`) ficou fora do treino.
- No Cérebro, a pasta `brain_tumor` do dataset é **tumor hipofisário**. O id continua `tumor` no modelo, na API e no banco; a tela mostra `hipofisário`.

## Regras de decisão

**Oral e Cérebro:** a classe é a de maior probabilidade. Se a confiança for menor que 80% (`LIMIAR_INCONCLUSIVO`), o resultado é `inconclusivo`. A frase não manda procurar um médico, porque o usuário já é médico:

> Resultado inconclusivo: o modelo não atingiu a confiança mínima de 80% para indicar uma classe nesta imagem.

**Pele:** o modelo devolve a probabilidade calibrada de `maligno`. A classe é `maligno` quando ela alcança o limiar de `0.17999999999999994`, mesmo abaixo de 50%. Não há inconclusivo. Se nenhuma classe chegar a 80%, a classe é mantida e a tela mostra:

> Baixa certeza: nenhuma classe atingiu 80% de probabilidade. O resultado "maligno" indica um caso suspeito pelo limiar de 18%, não uma confirmação.

## Decisões fechadas

- **Pré-processamento:** repete exatamente o treino de cada modelo. O OpenCV lê em BGR e converte para RGB nos modelos coloridos. **Nunca envie BGR ao modelo nem retire a divisão por 255 do Oral:** a acurácia caiu de 96,5% para cerca de 52% no teste.
- **Imagem sem relação:** por decisão do professor, não há filtro que recuse imagens de outro tipo. Isso é uma limitação documentada e um trabalho futuro.
- **Login:** cadastro e login com e-mail e senha (veja `pixoramed-backend`). Senha só como hash scrypt, sessão com validade de 8 horas e histórico separado por usuário. MFA, recuperação de senha e limite de tentativas ficam como trabalho futuro.
- **Privacidade:** a imagem é processada em memória e descartada. O banco guarda modelo, classe, confiança, tempo e horário. O código do caso fica só na sessão do navegador.
- **Modelo:** um por tipo de exame. O escopo é só Pele, Oral e Cérebro; os outros cânceres dos notebooks antigos ficam fora do app.

## Resultados medidos

Use estes números apenas com suas ressalvas. Eles valem como texto de documentação e de limitações. Nos campos do app ligados a um modelo, como a validação em "Módulos e modelos", mostre só o que estiver no `.json` dele; sem isso, use "Sem resultado registrado". Se o sistema for recriado com modelos diferentes, não repita estes números como se fossem dos novos modelos.

| Teste | Resultado | Ressalva obrigatória |
|---|---|---|
| Oral, 200 imagens separadas | 96,5% (193/200) | Mesma fonte, dataset aumentado, sem divisão por paciente |
| Cérebro, 300 imagens separadas | 98,3% (295/300) | Mesma ressalva; confirmar que as imagens ficaram fora do treino |
| Oral, limiar de 80% | 188 conclusivas, 98,4% de acerto | Erros de confiança alta ainda passam |
| `pele_cor`, 21 imagens | 8 de 8 malignos; 7 de 13 benignos | Amostra pequena: indício, não métrica estável |
| Reprodução do treino da Pele, 1.915 imagens | AUC 0,939 (IC 95%: 0,922 a 0,954); sensibilidade 89,0%; especificidade 83,7%; valor preditivo positivo 51,2%; acurácia 84,5% | **Não é o modelo do app.** Chutar sempre benigno daria 83,9% |
| Cérebro, 5 folds, 1.000 por classe, sem normalizar | Cinza 95,17% ± 0,55; cor 94,37% ± 1,81 | Empate dentro do ruído; o cinza foi mais estável |
| Mama antiga (fora do escopo) | 96,6% na mesma fonte; 34,5% em 29 imagens externas | Amostra externa pequena; evidência de mudança de domínio |

## Regras de honestidade

- Nunca invente métricas, curvas, gráficos ou rótulos.
- Só chame de "externo" um teste com imagens de outra fonte.
- Não apresente números da reprodução como se fossem do `pele_cor`.
- A causa da queda em imagens externas não foi provada: fale em hipóteses.
- Em Oral e Cérebro, a confiança é softmax e não está calibrada. Confiança alta não significa certeza.
- O dataset Multi Cancer foi aumentado segundo o autor, mas a página dele não fala em vazamento. Diga que **pode haver vazamento**.
- Valores de ganho de tempo ou ROI sem medição devem ser marcados como hipotéticos.
