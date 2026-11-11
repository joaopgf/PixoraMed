# docs/delivery

Documento de entrega da banca: workflows BPMN, justificativa técnica e análise de ética, governança e segurança.

| Arquivo | O que é |
|---|---|
| `PixoraMed_report.html` | Fonte do documento. Edite aqui. |
| `PixoraMed_report.pdf` | PDF gerado a partir do HTML (é o que vai para a banca). |

As imagens dos diagramas vêm de `../bpmn/*.png`. Se um BPMN mudar, exporte o PNG de novo e gere o PDF outra vez.

## Gerar o PDF

No PowerShell, dentro desta pasta (precisa do Google Chrome; o Edge também serve, trocando o caminho do executável):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --no-pdf-header-footer --print-to-pdf="$PWD\PixoraMed_report.pdf" "file:///$($PWD -replace '\\','/')/PixoraMed_report.html"
```

Outra opção: abrir o HTML no navegador, Ctrl+P, "Salvar como PDF", sem cabeçalhos e rodapés.
