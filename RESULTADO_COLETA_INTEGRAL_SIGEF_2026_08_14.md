# Resultado da Coleta Integral SIGEF — Programa 02

## Síntese operacional

Em 14 de agosto de 2026, foi validada a coleta integral de movimentações do extrato público SIGEF para o **programa 02 — PDDE Básico**. O mecanismo utiliza a rota oficial [`visualizaexcel`](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/visualizaexcel), que devolve uma planilha HTML com extensão `.xls`, em conjunto com a página de detalhamento da mesma identidade bancária. A página de detalhamento continua sendo a fonte de validação de CNPJ, banco, agência, conta e programa; a planilha integral é a fonte de todas as linhas de movimentação.

| Unidade piloto | Identidade validada | Período consultado | Linhas brutas | Movimentos únicos | Duplicatas | Cobertura |
|---|---|---:|---:|---:|---:|---|
| EM Presidente Eurico Dutra — INEP 0411005 | CNPJ 01.872.287/0001-02; BB 001; agência 0249; conta 000056270X; programa 02 | 02/2026 | 144 | 144 | 0 | Completa |

## Critério de cobertura aplicado

Na resposta real da página de detalhamento, o contador textual de paginação não foi emitido, embora a própria página tenha retornado **144** linhas financeiras. A planilha oficial `visualizaexcel` retornou também **144** linhas financeiras. Assim, a cobertura foi aceita exclusivamente pela equivalência entre o número de linhas do detalhamento e o número de linhas do arquivo integral, registrada como `coverageBasis = detail-row-count` e `coverageComplete = true`.

> A ausência do contador textual não foi convertida em suposição. Quando o contador existe, ele é a base primária (`reported-total`). Quando não existe, a base alternativa é explicitamente identificada no JSON normalizado. Se a contagem do arquivo divergir da base disponível, a cobertura é marcada como incompleta e a conciliação de crédito é bloqueada.

## Evidências e preservação

Para cada UEx elegível do piloto, o adaptador preserva separadamente o HTML da página de detalhamento, o arquivo integral HTML/XLS, o JSON normalizado, as URLs consultadas, o hash SHA-256, o horário e os parâmetros normalizados. O arquivo integral não é reescrito antes do armazenamento. A chave auxiliar determinística continua sendo aplicada apenas para identificar linhas repetidas na mesma resposta; ela não substitui nenhuma evidência bruta.

| Controle | Regra implementada |
|---|---|
| Elegibilidade | Somente conta explicitamente rotulada `PDDE` no PDDEInfo, Banco do Brasil e programa `02`. |
| Identidade bancária | CNPJ, banco, agência, conta e programa são validados exclusivamente pelo detalhamento SIGEF e confrontados com o PDDEInfo. |
| Cobertura | `reported-total` quando disponível; caso contrário, `detail-row-count`. Divergência de contagem impede a conciliação. |
| Arquivo indisponível | Falha de download após as tentativas controladas encerra a coleta daquela UEx como falha, sem promover resultado parcial. |
| Conciliação | Um crédito somente pode receber `CREDITO_LOCALIZADO_SIGEF` após identidade confirmada e cobertura completa. |
| Limites semânticos | Movimentos de aplicação e resgate são preservados como fatos do extrato; não geram inferência de saldo, conta separada de investimento, despesa, irregularidade ou prestação de contas. |

## Verificações automatizadas

A suíte do adaptador passou com **15 testes** nos arquivos `sigefDirectExtract.test.ts` e `sigefDirectExtractPilot.test.ts`. Ela cobre construção de URLs, parsing, conta alfanumérica, deduplicação, rejeição de conta divergente, CAPTCHA, arquivo integral, base alternativa de cobertura, falha de download e bloqueio de conciliação quando a cobertura é incompleta.

## Limite de escopo

A validação não amplia automaticamente o piloto para todas as escolas nem habilita programas SIGEF adicionais. A integração permanece restrita a até cinco UEx elegíveis por execução e ao programa 02. A conta SIGEF continua sendo evidência externa: **nunca preenche nem substitui o campo bancário primário do PDDEInfo**.
