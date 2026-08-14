# Resultado do Lote Ampliado SIGEF — 2026

## Escopo e execução

O primeiro lote ampliado de extratos SIGEF foi executado em **14 de agosto de 2026**, na execução imutável `e3ca1466-2f56-44e7-aa4a-37fe185e58b2`. A operação reutilizou a execução PDDEInfo aprovada `14fe09f3-a1cb-4ff7-bb05-fc1089849f72`, sem repetir a fonte primária, excluiu as cinco UEx consultadas no lote anterior e utilizou exclusivamente o período `2026-01`.

O lote processou **15 UEx elegíveis**, em cinco grupos sequenciais de até três consultas simultâneas. O limite foi ampliado de cinco para quinze UEx por execução, sem aumentar a concorrência acima de três requisições SIGEF ao mesmo tempo.

## Resultado consolidado

| Indicador | Resultado |
|---|---:|
| UEx consultadas | 15 |
| Linhas financeiras brutas retornadas | 2.349 |
| Movimentações preservadas | 2.345 |
| Linhas idênticas colapsadas | 4 |
| Créditos FNDE compatíveis localizados | 10 |
| Resultados inconclusivos | 5 |
| Divergências de identidade ou valor | 0 |
| Coberturas incompletas | 0 |
| Falhas técnicas | 0 |
| Artefatos HTML/XLS brutos | 30 |
| JSONs normalizados | 16 |

## UEx do lote

`33069093`, `33069115`, `33069140`, `33069158`, `33069204`, `33069220`, `33069271`, `33069301`, `33069328`, `33069336`, `33069360`, `33069379`, `33069395`, `33069409` e `33069441`.

Os cinco resultados inconclusivos não significam ausência de crédito: a fonte foi consultada, mas não apresentou coincidência estrita dentro da janela de conciliação. Não houve divergência de CNPJ, banco, agência, conta, programa ou valor, e nenhuma resposta apresentou cobertura incompleta.

## Salvaguardas mantidas

Cada UEx gerou página de detalhamento, arquivo integral HTML/XLS, JSON normalizado, URL e hash. A conciliação continua vinculada apenas a conta do rótulo exato `PDDE` no PDDEInfo, Banco do Brasil e programa SIGEF `02`. Créditos localizados preservam a data do SIGEF separada da data registrada no PDDEInfo. Movimentações são fatos de extrato e não demonstram saldo, despesa, regularidade ou prestação de contas.
