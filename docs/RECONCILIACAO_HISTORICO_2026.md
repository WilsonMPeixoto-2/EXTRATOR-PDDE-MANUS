# Reconciliação do histórico e do estado real do projeto

## Inteligência Financeira PDDE | 4ª CRE

**Data da reconciliação:** 16 de agosto de 2026  
**Repositório:** [`WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`](https://github.com/WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS)  
**HEAD verificado:** `af2e384` — oficialização da Constituição Visual

## 1. Objetivo

Este registro separa o que foi descrito no histórico anexado do que está efetivamente presente no repositório atual. A separação é necessária para impedir que resultados de outro estado de trabalho, branch ou execução sejam tratados como funcionalidades já disponíveis nesta cópia do projeto.

## 2. Resultado da verificação

O repositório atual contém a evolução do Extrator PDDEInfo, os controles de evidência do PDDEInfo principal, a integração assistida de importação CGU, os módulos de reconciliação SIGEF em escopo controlado, a Home C e a Constituição Visual oficial.

| Item mencionado no histórico | Estado verificado no repositório atual | Tratamento adotado |
|---|---|---|
| Constituição Visual em `docs/VISUAL_PRODUCT_CONSTITUTION_2026.md` | Presente no commit `af2e384` | Fonte normativa oficial. |
| Especificação das primeiras telas | Presente em `docs/SPECIFICACAO_PRIMEIRAS_TELAS_2026.md` | Próximo marco funcional: página de unidade. |
| Home C | Implementada no commit `c4e085f` | Mantida como porta de entrada da experiência. |
| PRs #20, #21, #22 e #23 | Não foram localizados neste repositório pela consulta atual | Não tratados como evidência de funcionalidades presentes. |
| SHAs `a2fb4b2...` e `aea5898...` | Não correspondem ao `main` atual verificado | Não usados como base de implementação. |
| Crawlee + Playwright | Não aparecem como integração produtiva na árvore atual | Permanecem como possibilidade futura ou dependência a validar, não como capacidade disponível. |
| DuckDB para pré-seleção financeira | Não aparece como módulo produtivo na árvore atual | Não será pressuposto na interface. |
| Relatórios públicos FNDE de atendimento, saldo e prestação de contas | Não estão materializados como coletor integrado no código atual | Devem ser tratados como próxima frente de pesquisa e implementação. |
| Portal da Transparência autenticado | O catálogo atual o registra como fonte complementar em teste, sem confirmação bancária | A chave e a consulta autenticada permanecem condicionais. |

## 3. Escopo de dados

O escopo operacional imediato é **exclusivamente o exercício de 2026**. O ano de 2025 só pode aparecer como exceção contextual, quando necessário para explicar reprogramação, mudança de conta, histórico ou outra relação indispensável à leitura do exercício corrente.

A interface principal, os relatórios Excel e os futuros PDFs devem nascer focados em 2026. Dados de 2025 não devem competir com a leitura corrente nem aparecer automaticamente como uma segunda carteira equivalente.

## 4. Evidência oficial disponível para o próximo trabalho

As páginas oficiais do FNDE consultadas em 16 de agosto de 2026 apresentam, entre outros, os seguintes caminhos públicos:

| Relatório público | Evidência observada | Uso potencial no produto |
|---|---|---|
| Situação de Atendimento da Entidade | Filtros por ano, programa, destinação, CNPJ, INEP, UF, rede e situação de pagamento; opção detalhada por escola ou entidade. | Repasses e atendimento, preservando distinção entre ordem, pagamento informado e crédito. |
| Situação de Prestação de Contas | Filtros por ano, programa, CNPJ, INEP, UF, rede, situação da entidade e relatório detalhado ou consolidado. | Acompanhamento da prestação de contas por unidade e programa. |
| Consulta de Saldo das Entidades | Filtros mensais, incluindo `01-2026` a `06-2026`, programa, CNPJ, UF, rede e município; opção de relatório Excel. | Saldos e aplicações por referência mensal, sempre com `coverageThrough` ou data de posição explícita. |
| Consulta por Escola | Entrada por ano e identificação da unidade. | Dossiê de unidade e relação entre programas, parcelas e contas. |

A existência de filtros e relatórios públicos não autoriza afirmar que todos os registros estão coletados, normalizados ou conciliados na aplicação. A implementação deverá registrar origem, data de obtenção, cobertura, exercício, hash e limitações antes de publicar qualquer agregado na Home.

## 5. Regra de decisão

A próxima implementação deve ser guiada por dados reais efetivamente coletados e normalizados, mas não deve começar pela exposição de todas as colunas disponíveis. O produto deve primeiro definir a pergunta humana, a unidade de análise, a evidência necessária e o caminho de investigação.

> **O sistema não deve confundir capacidade de coletar muitos dados com obrigação de exibir todos os dados.**

## 6. Próximo marco

O próximo marco funcional é a página de unidade, com posição financeira 2026, programas, parcelas, contas, saldos, aplicações, movimentações, prestação de contas e acompanhamento. A página será implementada apenas com campos cuja semântica e cobertura estejam confirmadas no backend atual ou em um novo coletor explicitamente validado.

### Referências oficiais

[1]: https://www.fnde.gov.br/pddeinfo/ — Portal PDDEInfo do FNDE, consultado em 16/08/2026.  
[2]: https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade — Consulta de Saldo das Entidades, com referências mensais de 2026.  
[3]: https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta — Situação de Prestação de Contas.  
[4]: https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade — Situação de Atendimento da Entidade.

## 7. Ambiente publicado

Em 16 de agosto de 2026, o domínio público `https://pddeinfo4cre-zn9f2kak.manus.space/` respondeu com HTTP 200 e o título correto do projeto. A inspeção do bundle JavaScript servido pelo domínio, porém, não encontrou a rota `/unidade/:runId/:inep` nem a marca textual da seção `TRAJETÓRIA OBSERVADA` implementadas neste marco.

Isso significa que o repositório `main` está atualizado no commit `3f00da7`, mas o ambiente público ainda serve uma versão anterior do bundle. A nova página deve ser considerada disponível no código versionado, não declarada como publicada no site até que o mecanismo de deploy do espaço sincronize o commit atual.
