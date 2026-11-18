# Pitch de 2 minutos em inglês

Pitch para apresentar o PixoraMed ao gestor antes da apresentação da banca. São cerca de 270 palavras, o que dá uns 2 minutos num ritmo calmo. As marcas de tempo servem de guia para o treino.

---

## PixoraMed – 2-minute pitch

**[0:00 – Opening]**
Good afternoon. We are João, Samuel, Ramon and Henrique, and this is **PixoraMed**.

**[0:10 – The problem]**
Every medical image waits for a specialist, even when the case is urgent. Skin, oral and brain exams are very different from each other. And a single number from an AI model doesn't help a doctor unless it also shows how uncertain that number is.

**[0:30 – The solution]**
PixoraMed is a web prototype that gives a fast second reading of three types of cancer images: skin lesions, oral tissue and brain MRI. The doctor uploads an image and, in a couple of seconds, sees the probability of each class, a warning when the model is not confident, and a personal history of past analyses. It does **not** make a diagnosis: the final decision always stays with the doctor.

**[0:55 – How it works]**
We trained our own small neural network for oral and brain images, and used an ensemble of pre-trained EfficientNet models for skin. The system has three parts: a React website, a Java Spring Boot backend that handles login, history and the final decision, and a Python AI service that only returns probabilities. Images are processed in memory and never stored, following Brazil's data protection law, the LGPD. Everything runs in Docker and is deployed to the cloud with Terraform.

**[1:25 – Results]**
On separate test images from the same datasets, the oral model reached 96.5% accuracy and the brain model 98.3%. For skin, our reproduction of the training found 89% of the malignant cases.

**[1:40 – Honesty and next steps]**
These are still lab results. The next step is to test PixoraMed with images from other hospitals before any real use.

**[1:50 – Closing]**
PixoraMed: faster triage, with the doctor in control. Thank you.

---

## Pronúncia das palavras mais difíceis

| Palavra | Como soa |
|---|---|
| PixoraMed | *pik-SÓ-ra-méd* |
| ensemble | *on-SÓM-bol* |
| malignant | *ma-LÍG-nant* |
| accuracy | *ÉK-iu-ra-si* |
| MRI | *ém-ar-ái* |
| triage | *TRÍ-ash* |
| uncertain | *an-SÂR-ten* |
| ninety-six point five percent | *náin-ti siks póint fáiv per-SÉNT* |

## Dicas para o treino

- **Ritmo:** cronometre. Se passar de 2 minutos, corte a frase sobre Docker e Terraform, que é a menos importante para um gestor.
- **Pausas:** depois de "this is PixoraMed" e antes de "It does **not** make a diagnosis". Essa é a frase mais importante do pitch.
- **Números:** fale devagar. "Ninety-six point five" usa *point* para a vírgula, como em todo número decimal em inglês.
- **Escolhas no texto:** "same datasets" e "our reproduction" estão lá de propósito. São a versão em inglês das ressalvas usadas na banca: os testes de Oral e Cérebro são da mesma fonte do treino, e o número da Pele vem da reprodução, não do modelo do app.
