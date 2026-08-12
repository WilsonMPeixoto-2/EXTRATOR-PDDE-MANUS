# Validação de Aceitação Técnica — Versão Candidata

Data da validação: **12/08/2026**.

Esta validação técnica registra que a versão candidata atende aos controles implementados e pode seguir para a **decisão de aceitação institucional**. Ela não equivale à autorização para automatizar fontes bloqueadas nem à confirmação de crédito bancário.

| Critério de aceitação | Resultado verificado | Situação |
|---|---|---|
| Lista-mestre e coleta seletiva | 163 INEPs únicos, coleta individual por lote e retentativas. | Aprovado tecnicamente |
| Vínculo bancário | Conta PDDE Básico limitada ao rótulo bancário exato `PDDE`. | Aprovado tecnicamente |
| Excel V2 | Abas obrigatórias, contas como texto, semântica de pagamento registrada e bloqueios de validação. | Aprovado tecnicamente |
| Proveniência e auditoria | Artefatos, hashes, observações, achados e comparação histórica append-only. | Aprovado tecnicamente |
| Conciliação | Chave estrita e agregação de ordens, créditos, aplicações, estornos e devoluções. | Aprovado tecnicamente |
| Dados Abertos FNDE | Importação autenticada, hash, metadados, evento e artefato secundário auditáveis. | Aprovado tecnicamente |
| SIGEF | CAPTCHA de Liberações permanece bloqueio explícito; demais fontes continuam em piloto. | Condicionado a acesso comprovado |
| Segurança de publicação | `.gitignore` ampliado, README técnico criado e varredura de arquivos e padrões de segredo rastreados concluída. | Aprovado tecnicamente |

## Evidência de validação

A suíte automatizada executou **56 testes aprovados** em 12 arquivos, e `pnpm check` terminou sem erros de TypeScript. A interface de auditoria foi verificada visualmente após a inclusão do controle secundário; o processo de desenvolvimento foi reiniciado sem reincidência do erro ESM anterior.

## Limites e decisão institucional necessária

> A aprovação técnica não autoriza contornar CAPTCHA, vincular conta SIGEF sem chave documentada, interpretar ausência como “não pago”, nem publicar código antes da deliberação institucional da GAD/4ª CRE.

Para publicar no GitHub, a decisão deve indicar o repositório privado e exclusivo `WilsonMPeixoto-2/extrator-pdde-4cre` como destino e confirmar que esta versão candidata foi aceita para compartilhamento de código, sem evidências brutas ou credenciais.
