# Arquitetura de Logs e Auditoria por Campo

## Princípio operacional

> Nenhum valor financeiro exibido ou exportado deve existir sem responder, de modo navegável: **de onde veio, quando foi consultado, qual regra o interpretou, como foi transformado, quais validações passou e qual é seu nível de confirmação**.

O foco não é registrar apenas um log técnico da execução. É construir uma **cadeia de custódia do dado**. A unidade de auditoria deixa de ser apenas a escola ou a execução; passa a ser o campo financeiro relevante.

## Contrato de proveniência por campo

Cada campo normalizado deve receber um identificador imutável e um objeto de proveniência. O valor é separado de sua evidência e de sua interpretação.

| Grupo | Campo de auditoria | Exemplo |
|---|---|---|
| Identidade | `field_id`, INEP, CNPJ/UEx, programa e destinação | `33069247:PDDE_BASIC:P1:paid_total` |
| Fonte | Sistema, URL, chave de consulta e data/hora UTC | `PDDEINFO`, URL individual, `2026-08-11T21:51:12Z` |
| Evidência | Chave do HTML/JSON bruto, trecho de origem e SHA-256 | `raw/run-…/33069247.html`, hash e seletor da célula |
| Parsing | Versão do parser, seletor DOM e regra de normalização | `parser-2.2.0`, tabela/célula, moeda BRL → centavos |
| Qualidade | Resultado das validações e mensagens | INEP válido, moeda válida, reconciliação aprovada |
| Conciliação | Evidências encontradas, divergências e chave de correspondência | PDDEInfo + SIGEF Liberação, ordem bancária e valor |
| Estado | Grau objetivo de evidência financeira e decisão humana | OB corroborada, crédito localizado, estornado, inconclusivo |
| Governança | Autor da execução, evento de revisão e motivo | operador, data/hora, comentário imutável |

### Estados recomendados

Os estados descrevem as evidências efetivamente encontradas; eles não devem simular independência entre consultas de conta e movimentação, pois ambas pertencem à camada bancária do SIGEF.

| Estado | Significado | Pode aparecer como “confirmado”? |
|---|---|---|
| `PAGAMENTO_INFORMADO_PDDEINFO` | Valor e data da ordem informados no PDDEInfo | Não |
| `OB_CORROBORADA_CREDITO_NAO_LOCALIZADO` | PDDEInfo e SIGEF Liberação compatíveis; crédito não localizado no extrato SIGEF consultado | Não; trata-se de ordem bancária corroborada |
| `CREDITO_LOCALIZADO_SIGEF` | Crédito/ordem bancária compatível na base pública de extratos SIGEF | Não; usar “crédito localizado no SIGEF” |
| `CREDITO_CONFIRMADO_EXTRATO_BB` | Crédito evidenciado por extrato bancário direto obtido com autorização | Sim, com identificação do extrato |
| `CREDITO_ESTORNADO_OU_DEVOLVIDO` | Crédito encontrado, seguido de lançamento reversor vinculado | Não |
| `SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA` | Nenhuma fonte respondeu com evidência de pagamento até o horário registrado | Não; exibir sempre fontes e horário da consulta |
| `DIVERGENCIA_ENTRE_FONTES` | Valor, data, programa, conta ou OB não reconciliados | Não |
| `CONSULTA_INCONCLUSIVA` | Indisponibilidade, estrutura alterada, cobertura incerta ou resposta incompleta | Não |
| `REVISAO_NECESSARIA` | Regra desconhecida, alteração relevante ou decisão humana pendente | Não |

## Eventos imutáveis

A aplicação deve gerar eventos append-only, sem atualizar ou apagar a história. Correções posteriores entram como novos eventos que referenciam o anterior.

| Evento | Quando ocorre | Conteúdo mínimo |
|---|---|---|
| `RUN_STARTED` | Início da execução | operador, versão do parser, lista-mestre e hash da lista |
| `SOURCE_FETCHED` | Resposta de cada fonte | URL, HTTP status, horário, hash, tamanho e retentativas |
| `FIELD_PARSED` | Campo encontrado | valor bruto, valor normalizado, seletor/regra e artefato-fonte |
| `FIELD_VALIDATED` | Checagem de schema/invariante | regra, resultado e mensagem |
| `FIELD_RECONCILED` | Cruzamento de fontes | campos comparados, chaves de match e resultado |
| `FINDING_OPENED` | Anomalia detectada | severidade, tipo, escola, campo e evidências |
| `HUMAN_DECISION` | Intervenção do operador | decisão, motivo, autor e vínculo à evidência |
| `WORKBOOK_RELEASED` | Excel liberado | hash do arquivo, regras aprovadas e execução de origem |

## Interface proposta

### 1. Central de Execuções

A tela inicial operacional deve listar as execuções por data, operador, fonte utilizada e resultado. Cada linha deve mostrar contagem de escolas processadas, falhas, campos não informados, divergências, hash do manifesto e estado de liberação do Excel. A ação principal é **“Abrir trilha de auditoria”**, e não apenas “Baixar Excel”.

### 2. Matriz de Confiabilidade

Para uma execução, apresentar uma matriz `Escola × Controle`, com filtros por INEP, CNPJ/UEx, programa, estado de evidência e severidade. Cada célula indica, por exemplo, `OB corroborada`, `crédito localizado`, `sem pagamento registrado`, `divergente`, `novo` ou `em revisão`. Essa visão permite localizar rapidamente todas as escolas com pagamento registrado e conta PDDE não localizada.

### 3. Dossiê da Unidade Escolar

Ao abrir uma escola, a página deve possuir três áreas sincronizadas:

1. **Resumo de dados:** valores previstos; pagamento/ordem registrada no PDDEInfo; OB, banco, agência e conta na Liberação; créditos, aplicações e estornos no extrato; status de evidência e alertas.
2. **Linha do tempo:** consultas PDDEInfo/SIGEF, parsing, validações, mudanças históricas e decisões humanas.
3. **Painel de evidência:** HTML/JSON bruto protegido, trecho destacado, URL, hash SHA-256, seletor DOM, valor original e valor normalizado.

Um clique em qualquer valor do resumo deve abrir seu cartão de proveniência, sem obrigar o operador a procurar logs técnicos.

### 4. Comparador de Campo

A interface precisa comparar o mesmo campo entre duas execuções ou duas fontes. Exemplo: `Valor pago — PDDE Básico 1ª parcela` em 11/08 versus 20/08. O comparador deve mostrar valor anterior, atual, variação, evidência de cada lado e classificação: novo repasse, alteração esperada, perda aparente, divergência ou mudança de estrutura.

### 5. Fila de Exceções

Uma fila separada deve priorizar rótulo desconhecido, falha de consulta, mudança monotônica negativa, pagamento sem conta localizada, conta divergente, crédito estornado e conciliação incompleta. A fila precisa de responsáveis, comentários e decisão humana. Nunca deve permitir “fechar” uma exceção sem justificar e sem conservar o evento anterior.

## Estrutura de navegação

```text
Execuções
 ├─ Execução 2026-08-11 21:51
 │   ├─ Resumo e gates
 │   ├─ Matriz de confiabilidade
 │   ├─ Escolas
 │   │   └─ Dossiê da unidade → Campo → Evidência → Eventos
 │   ├─ Conciliação de fontes
 │   ├─ Exceções
 │   └─ Artefatos e hashes
 └─ Comparar execuções
```

## Regras de segurança e evidência

Os HTMLs, JSONs, manifestos e planilhas devem ficar em armazenamento privado. A interface fornece visualização ou URL temporária autenticada, nunca link público permanente para evidências brutas. Contas e CNPJs devem ter acesso restrito ao perfil institucional autorizado. O hash do artefato e do manifesto deve aparecer no dossiê e no Excel para permitir conferência posterior. Uma ausência de dado deve registrar, no mínimo, as fontes consultadas, o horário, a chave usada na pesquisa e o motivo técnico da ausência; nunca deve ser exibida como prova absoluta de “não pagamento”.

## Primeiro incremento recomendado

A primeira entrega não precisa tentar mostrar tudo. Ela deve criar o núcleo de confiança:

1. manifest de execução com hash e versão do parser;
2. tabela de consultas por escola com URL, horário, status e evidência;
3. cartão de proveniência para `Valor Final Devido`, `Valor Pago`, `Data da Ordem`, `Agência` e `Conta`;
4. fila de exceções para “pagamento registrado, mas conta PDDE não localizada”; e
5. comparador de uma execução contra a última baseline aprovada.

Com isso, qualquer número no Excel passa a ter caminho verificável até a fonte consultada, mesmo antes da integração completa com SIGEF.
