# Evidências de Teste — Extrator PDDEInfo 4ª CRE

## Execução integrada iniciada

Em 11/08/2026, a extração real foi iniciada pelo painel web com a lista-mestre embutida. A interface confirmou a validação prévia de **163 INEPs únicos**, abriu o fluxo de consulta individual ao PDDEInfo e exibiu o início do **lote 1**.

Os eventos iniciais apresentados no painel foram: confirmação da lista, início da consulta pública por INEP e aplicação da regra de vínculo bancário exato. O botão de download permaneceu indisponível enquanto a execução e as validações bloqueantes estavam pendentes.

## Progresso observado

O painel avançou de **40/163** para **70/163** consultas concluídas, exibindo lotes sucessivos e registros individuais de sucesso. A tabela de auditoria passou a apresentar INEP, código SME, status, tentativas e ocorrência de cada unidade processada. Até o sétimo lote, não houve falha definitiva registrada pela interface.

Na fase final observada, a execução alcançou **120/163** e depois **130/163** escolas concluídas, mantendo o processamento em lotes e o download bloqueado até a consolidação completa dos quatro controles de regressão.

## Ajuste de confiabilidade aplicado

A primeira execução foi corretamente bloqueada porque a página do FNDE é entregue em ISO-8859-1 e a decodificação inicial não preservava os caracteres acentuados dos cabeçalhos de tabelas. Isso impediu a identificação de `Programa/Ação` e `Destinação`, produzindo indicadores financeiros zerados. O comportamento de bloqueio funcionou como previsto: o download não foi liberado.

O backend foi corrigido para decodificar o conteúdo como `latin1`, preservando os cabeçalhos da fonte. Testes de tipos e de regras de vínculo bancário foram executados com êxito e uma nova execução integrada foi iniciada.

Na execução corrigida, a auditoria passou a registrar os programas bancários efetivamente identificados, como `PDDE` e `PDDE QUALIDADE`. Casos sem o rótulo `PDDE` passaram a exibir somente `PDDE QUALIDADE`, o que confirma a aplicação da regra de não inferir dados de PDDE Básico. A execução avançou de **40/163** para **50/163** escolas com esse comportamento preservado.

Em seguida, a interface alcançou **60/163** escolas e permaneceu no sexto lote durante duas verificações consecutivas. A situação foi registrada para inspeção do log do servidor e validação do mecanismo de retentativas, sem liberação antecipada de download.

Após o ciclo de retentativas, a execução avançou para **70/163**. A auditoria exibiu consultas bem-sucedidas com duas tentativas em unidades pontuais, demonstrando que a falha transitória foi recuperada sem perda de evidência e sem alterar a regra de vinculação bancária.

A execução corrigida continuou até **80/163** e **90/163** escolas, mantendo identificação de programas bancários e registros de sucesso por INEP. O gate de saída permaneceu pendente, conforme a regra de só avaliar as regressões após a cobertura integral.

O processamento atingiu **100/163** e **110/163** escolas, com o painel registrando programas como `PDDE` e `PDDE QUALIDADE` em cada auditoria recente. Nenhuma condição parcial liberou o arquivo; as quatro métricas continuaram deliberadamente pendentes até a conclusão dos 163 INEPs.

Na etapa final observada, o processamento alcançou **120/163** e depois **130/163** escolas. Os registros continuaram a evidenciar o programa exibido pela fonte para cada unidade, mantendo a separação entre PDDE Básico e PDDE Qualidade enquanto o gate de saída permaneceu corretamente pendente.

O teste alcançou **150/163** escolas. A auditoria exibiu, inclusive, casos com `PDDE`, `PDDE EQUIDADE` e `PDDE QUALIDADE` na mesma unidade, preservando-os como rótulos distintos — sem usar a presença de Equidade ou Qualidade para inferir agência ou conta de PDDE Básico.

Após a conclusão do décimo sexto lote, o painel atingiu **160/163** escolas. O último lote parcial foi iniciado e o arquivo continuou bloqueado, pois a execução ainda não havia alcançado a cobertura integral exigida.

## Resultado da execução integrada corrigida

A coleta alcançou **163/163** escolas e o gate de saída foi **aprovado**. As validações bloqueantes apresentaram os valores exigidos: **163 INEPs únicos**, **111 recebimentos de 1ª parcela**, **163 previsões de 2ª parcela** e **47 contas de PDDE Básico não informadas**. A interface liberou a cópia persistente do Excel somente após essa aprovação.
