# Arquitetura proposta — importação automática de dados públicos

**Sistema:** Extrator Financeiro PDDEInfo — 4ª CRE  
**Objetivo:** incorporar periodicamente dados públicos já comprovados, sem confundir transferência federal, pagamento informado no PDDEInfo e crédito bancário.

## Decisão de escopo

A primeira etapa deve automatizar duas frentes independentes: a atualização da referência **PDDEInfo** por INEP e a importação dos arquivos mensais de **Recursos Transferidos** da CGU. O SIGEF público permanece complementar e não bloqueante; nenhuma rotina deve tentar preencher lacunas da fonte primária com dados de outra origem.

| Fonte | Unidade importada | Chave de vínculo | Informação utilizável | Informação que não pode ser inferida |
|---|---|---|---|---|
| PDDEInfo | Página pública por INEP | INEP; CNPJ e UEx como evidência adicional | Programas, parcelas, pagamentos registrados e contas declaradas | Crédito bancário efetivo, saldo ou movimentação da conta |
| CGU — Recursos Transferidos | Arquivo mensal ZIP/CSV | CNPJ UEx normalizado = `CÓDIGO FAVORECIDO` | Mês, favorecido, órgão, ação e valor transferido | Crédito bancário, saldo, despesa, aplicação, pagamento ou prestação de contas |

## Alternativas de funcionamento

| Abordagem | Como funciona | Custo operacional | Complexidade | Indicação |
|---|---|---:|---:|---|
| **Atualização automática em segundo plano** | O sistema executa ciclos curtos do PDDEInfo e verifica diariamente a publicação do arquivo CGU mais recente. | Baixo, pois utiliza apenas rotas públicas e processamento determinístico. | Média; exige fila persistida, idempotência e rotina agendada. | Adequada quando a finalidade é atualização sem intervenção do operador. |
| **Atualização assistida por botão** | A tela oferece “Atualizar PDDEInfo” e “Importar transferências CGU”; o operador inicia cada ciclo. | Baixo. | Baixa; reaproveita os fluxos de execução existentes. | Adequada como implantação inicial ou quando se deseja controle manual do momento de consulta. |

As duas abordagens podem coexistir. A atualização assistida preserva uma alternativa imediata e a atualização automática reduz a dependência da operação manual depois de validada.

## Desenho técnico recomendado

### 1. Fila de importações persistida

Deve ser criada uma entidade própria de importação, separada de `extraction_runs`, pois uma execução PDDEInfo e uma importação CGU possuem ciclos, arquivos e regras diferentes.

| Campo | Finalidade |
|---|---|
| `id`, `source`, `reference_period` | Identificam imutavelmente a importação, por exemplo `CGU_TRANSFERENCIAS/2026-08`. |
| `status`, `started_at`, `completed_at`, `next_cursor` | Permitem retomar o trabalho após reinício, timeout ou atualização de página. |
| `source_url`, `obtained_at`, `source_sha256` | Formam a cadeia de custódia do arquivo/resposta. |
| `total_rows`, `matched_uex`, `latest_source_date` | Tornam cobertura e atualidade visíveis. |
| `parent_pddeinfo_run_id` | Relaciona uma importação complementar à referência primária sem alterar seus campos. |

Uma segunda tabela de linhas importadas deve armazenar somente as transferências CGU que passaram pelo vínculo determinístico de CNPJ. A chave de deduplicação será `fonte + período + CNPJ + órgão + ação + valor`, acrescida do hash do arquivo. Uma nova versão do mesmo arquivo gera nova evidência; uma reexecução idêntica é reconhecida e não duplica linhas.

### 2. Coletor PDDEInfo em fatias pequenas

A rotina atual já consulta três INEPs por lote, preserva HTML, JSON, hashes, validações e tentativas. Para execução automática, ela deve ser dividida em fatias persistentes de três INEPs por chamada. Cada chamada:

1. Busca a próxima fatia pendente de INEPs na fila.
2. Reutiliza o coletor e o parser já aprovados.
3. Persiste resultado e cursor antes de encerrar.
4. Agenda a próxima fatia até concluir as 163 UEx.
5. Só cria Excel após as validações bloqueantes da execução integral.

Essa divisão é necessária porque a rotina agendada possui limite de tempo por chamada. Não haverá temporizadores locais ou trabalho mantido apenas em memória.

### 3. Coletor CGU mensal por arquivo

O importador deve consultar a rota pública mensal `https://portaldatransparencia.gov.br/download-de-dados/transferencias/YYYYMM`, começar pelo mês corrente e pelo mês imediatamente anterior e seguir este fluxo:

1. Baixar o ZIP por HTTPS e gravar o original como artefato imutável.
2. Calcular SHA-256 antes de qualquer transformação.
3. Ler o CSV em fluxo, com codificação Latin-1 e sem carregar o arquivo integral na memória.
4. Validar cabeçalhos obrigatórios: `ANO / MÊS`, `CÓDIGO FAVORECIDO`, `CÓDIGO ÓRGÃO SIAFI`, `AÇÃO`, `VALOR TRANSFERIDO`.
5. Vincular exclusivamente CNPJs presentes na lista UEx aprovada.
6. Classificar como PDDE somente os registros do FNDE (SIAFI 26298/nome FNDE) e ação 0515/nome “Dinheiro Direto na Escola”.
7. Gravar linhas vinculadas como **transferência federal informada pela CGU**, sem mudar contas, parcelas ou estados de crédito bancário.
8. Informar na auditoria a referência mensal do arquivo, a data de obtenção, o hash, a cobertura das 163 UEx e a data máxima disponibilizada pela fonte.

O contrato `openDataControl` já preserva arquivo, URL, data, exercício, cobertura, hash e evento de auditoria. A evolução necessária é conectar a obtenção automática a esse contrato e armazenar as linhas CGU vinculadas em estrutura própria.

### 4. Disparo e frequência

| Rotina | Frequência proposta | Regra de segurança |
|---|---|---|
| Verificação de novo arquivo CGU | Uma vez ao dia útil | Se o mês ainda não estiver publicado, registrar resultado sem falha crítica e tentar no dia seguinte. |
| Importação CGU publicada | Uma vez por hash novo | Mesmo arquivo não é reprocessado; alteração de hash cria nova evidência imutável. |
| Atualização PDDEInfo | Semanal ou sob demanda | Uma execução completa é fatiada e retomável; não iniciar outra enquanto houver execução da mesma referência em curso. |
| Reprocessamento histórico | Manual e explícito | Nunca substituir artefato, linha ou Excel de execução aprovada. |

O sistema deve executar essas rotinas por chamadas agendadas autenticadas, não por `setInterval` ou cron em memória. Cada chamada será idempotente e retornará resultado estruturado, permitindo retentativa segura em caso de indisponibilidade transitória.

### 5. Apresentação para a GAD/4ª CRE

A auditoria deve ganhar uma seção “**Atualidade das fontes**”, organizada por referência objetiva e não por promessa de completude:

| Fonte | Último período disponível | Obtido em | Cobertura UEx | Interpretação |
|---|---|---|---:|---|
| PDDEInfo | Data/hora da última execução aprovada | Horário da coleta | 163/163 quando aprovado | Pagamentos e contas declarados no portal |
| CGU — Transferências | `AAAAMM` do arquivo | Horário do download | Ex.: 95/163 | Transferências federais vinculadas por CNPJ |
| SIGEF | Maior data de lançamento devolvida | Horário da consulta | UEx com evidência | Movimentação publicada pela fonte, possivelmente defasada |

Essa leitura evita que “mais atual” seja confundido com “mais completo” ou que uma transferência seja apresentada como saldo ou crédito confirmado.

## Sequência de implementação

1. Criar as tabelas de fila e de linhas CGU, com índices por fonte, período, CNPJ e hash.
2. Implementar o parser streaming do CSV CGU e testes com o arquivo real já validado.
3. Integrar o artefato ZIP, o hash e as linhas vinculadas à auditoria existente.
4. Transformar a execução PDDEInfo em fatias retomáveis, sem alterar o coletor ou suas validações financeiras.
5. Criar as rotas agendadas e controles de exclusão mútua, com registro de execução e retentativa.
6. Exibir status, cobertura e atualidade por fonte na auditoria; só então habilitar a programação automática.

> **Regra invariável:** a automação amplia a coleta, mas não altera a hierarquia de evidência. PDDEInfo continua sendo referência primária; CGU e SIGEF são frentes complementares, cada uma com seu próprio artefato, data e limite de interpretação.

## Referências

[1]: https://portaldatransparencia.gov.br/download-de-dados/transferencias "Portal da Transparência — Recursos Transferidos"
[2]: https://www.fnde.gov.br/pddeinfo/ "PDDEInfo — FNDE"
