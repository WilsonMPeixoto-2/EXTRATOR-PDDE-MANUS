# Confronto Técnico — Relatório Adicional de Fontes PDDE/SIGEF

**Data:** 14 de agosto de 2026  
**Escopo:** confrontar as alegações do relatório adicional com a investigação prática e os contratos técnicos do Extrator Financeiro PDDEInfo — 4ª CRE.

## Evidências iniciais preservadas

| Alegação do relatório adicional | Verificação realizada | Resultado inicial | Implicação técnica |
|---|---|---|---|
| O detalhamento de extrato SIGEF pode ser acessado por URL com banco, agência, conta, CNPJ, programa e mês/ano. | A página pública de extratos expôs filtros de CNPJ, banco, programa e mês/ano. Uma URL de detalhamento indexada retornou identidade da conta e tabela de crédito, débito, documento, histórico e beneficiário. Três UEx da 4ª CRE, usando somente contas do PDDE Básico explicitamente declaradas no Excel aprovado, retornaram respostas coerentes em programa `02`, CNPJ, agência e conta. | **Confirmada por piloto mínimo.** | Há base para um adaptador de extrato SIGEF em piloto restrito, desde que mantenha cada linha como observação externa e valide programa, conta, CNPJ, data, valor, paginação e estornos. |
| Os relatórios públicos do PDDEInfo podem ser consultados por filtros. | Os resultados oficiais de busca confirmam as páginas de Atendimento, Suspensão, Saldo e Abertura de Contas. Duas aberturas diretas no navegador do ambiente retornaram rejeição de infraestrutura, enquanto os testes anteriores por exportação municipal já preservados no projeto retornaram dados para Atendimento, Prestação de Contas, Suspensão e Saldo. | **Confirmada com limitação de ambiente.** | O caminho mais robusto continua sendo o export público municipal já testado, não uma coleta por clique ou um resultado vazio após formulário inválido. |

> A rejeição de infraestrutura observada nos relatórios PDDEInfo não é ausência de dado nem autorização para repetir consultas ou ignorar validações de filtro. O piloto deve preservar URL, parâmetros, resposta, hash, cobertura e motivo de erro.

## Confronto das alegações relevantes

| Tema do relatório adicional | Classificação | Confronto técnico | Decisão resultante |
|---|---|---|---|
| Relatórios de Atendimento, Prestação de Contas, Suspensão e Saldo do PDDEInfo estão disponíveis publicamente. | **Confirmada e já superada pelo projeto.** | Os filtros públicos confirmam anos, CNPJ, INEP, programa, rede, UF e município. O projeto já obteve exportações municipais de 2026 para Atendimento, Prestação de Contas, Suspensão e Saldo, com cobertura e schema analisados. | Criar adaptador em lote, não substituir a consulta individual por INEP. A exportação oficial deve ser o caminho preferencial do piloto. |
| Abertura de Contas fornece pendências de agência/conta. | **Parcialmente confirmada.** | A página pública apresenta a orientação para pendências de situação de conta, mas o extrator textual não expôs os filtros ou uma linha de resultado. | Manter como candidato a teste de uma UEx; não prometer campos, cobertura ou integração antes de um resultado 2026 preservado. |
| A URL pública de detalhamento de extrato SIGEF devolve créditos, débitos, documento, histórico e beneficiário. | **Confirmada por teste em 3/3 UEx da 4ª CRE.** | Para os INEPs `33068747`, `33068755` e `33068763`, o PDDEInfo declarou conta do PDDE Básico; o detalhamento SIGEF retornou o mesmo CNPJ, razão social, Banco do Brasil, agência, conta e programa `02 — Programa Dinheiro Direto na Escola`. Em cada caso houve crédito por ordem bancária do FNDE com valor igual ao pagamento registrado no PDDEInfo: R$ 5.305,00, R$ 9.905,00 e R$ 4.295,00, respectivamente. | Prioridade máxima para piloto de adaptador de extrato SIGEF, limitado a contas explicitamente declaradas no PDDEInfo e ao programa `02` já confirmado. |
| O ciclo PDDEInfo → extrato SIGEF prova que a data da ordem e a data do crédito são a mesma data. | **Não confirmada; a amostra mostra a necessidade de distingui-las.** | O PDDEInfo registra data da ordem em 30/04/2026 nas três UEx; o extrato mostrou crédito em 03/05/2026. O valor e a identidade da conta convergem, mas os marcos temporais não são equivalentes. | Criar campos distintos para `data_ordem_pddeinfo` e `data_credito_sigef`. O motor não pode exigir igualdade de datas nem declarar divergência automática sem regra de tolerância documentada e evidência adicional. |
| O parâmetro `data/MMYYYY` restringe o extrato somente ao mês solicitado. | **Não confirmado.** | Com `04/2026`, as respostas retornaram primeiro crédito em 03/05/2026 e lançamentos de 2025, além de totais de 101 a 201 registros. | Tratar o parâmetro como período inicial declarado até provar sua semântica; registrar paginação, total de registros e janela efetiva retornada antes de escala. |
| Todos os programas PDDEInfo podem ser mapeados diretamente para códigos SIGEF. | **Não confirmado.** | O formulário SIGEF confirma o código `02` para PDDE Básico e lista diversos outros códigos, mas não comprovou a equivalência com PDDE Qualidade, PDDE Equidade, Educação Conectada, SRM ou demais ações da lista-mestre. | Fixar inicialmente somente `PDDE Básico → 02`. Qualquer novo código exigirá amostra com conta, CNPJ, rótulo da fonte e lançamento coerentes. |
| O Webservice SIGEF está pronto para substituir a consulta HTML. | **Parcialmente confirmada, mas não aplicável por ora.** | A interface pública de teste existe e lista operação de consulta de extrato, porém exige usuário e senha. A página institucional do SIGEFWEB informa destinação a entidades federais e cadastro vinculado a UG e gestão, não acesso público demonstrado para UEx do PDDE. | Não desenvolver cliente. Tratar como frente institucional de baixa prioridade até o FNDE confirmar elegibilidade da SME-Rio, operação aplicável, documentação e credencial de homologação. |
| BB Gestão Ágil oferece integração por API. | **Confirmada, com acesso institucional pendente.** | A documentação pública e o material do FNDE sustentam uso de APIs e gestão de receitas, gastos, aplicações e documentos, mas não foi localizado portal de autoatendimento, token ou escopo concedido à SME-Rio. | Manter fora da automação. O próximo ato, se necessário, é solicitação institucional de acesso somente leitura; não criar scraper da interface. |
| A PAB exige descoberta de XHR para obter catálogo e artefatos. | **Contradita pela investigação já concluída.** | A PAB já expôs API pública de catálogo e endpoints de artefato. Os produtos 59, 66 e 70 foram efetivamente baixados, analisados e confrontados com a lista-mestre. | Não realizar inspeção de XHR como pré-requisito. Priorizar o adaptador versionado dos endpoints públicos e dos produtos já qualificados. |
| PDDEREx e Portal da Transparência são candidatos futuros. | **Confirmada com os limites já registrados.** | PDDEREx ainda não produziu detalhamento 2026 útil para UEx da 4ª CRE. A API da CGU exige token e ainda não demonstrou granularidade de UEx/OB suficiente. | Ambos permanecem em piloto posterior, com uma amostra controlada e valor adicional demonstrado antes de qualquer adaptador. |

## Resultado do piloto mínimo de extrato SIGEF

O novo relatório trouxe uma hipótese correta e operacionalmente relevante. Ela não deve ser descrita como “pular CAPTCHA”: o formulário público de extratos exibiu campos de mês/ano, CNPJ, banco e programa, e as páginas de detalhamento utilizadas são indexadas publicamente. A distinção importante é entre a interface moderna de **Liberações**, que ainda informa CAPTCHA, e a consulta pública de **Extrato Conta Corrente**, que foi efetivamente respondida no piloto. [1] [2]

| INEP | Programa e conta previamente declarados no PDDEInfo | Evidência retornada pelo SIGEF | Leitura correta |
|---|---|---|---|
| 33068747 | PDDE Básico, agência 0249, conta 0000549665, pagamento registrado R$ 5.305,00 | Mesmo CNPJ/conta/programa; crédito de R$ 5.305,00 por ordem bancária do FNDE em 03/05/2026 | Crédito bancário confirmado para a conta evidenciada; data de crédito distinta da data da ordem no PDDEInfo. |
| 33068755 | PDDE Básico, agência 1254, conta 0000044563, pagamento registrado R$ 9.905,00 | Mesmo CNPJ/conta/programa; crédito de R$ 9.905,00 por ordem bancária do FNDE em 03/05/2026 | Crédito bancário confirmado para a conta evidenciada; não reutilizar a conta de PDDE Qualidade. |
| 33068763 | PDDE Básico, agência 0249, conta 000054969X, pagamento registrado R$ 4.295,00 | Mesmo CNPJ/conta/programa; crédito de R$ 4.295,00 por ordem bancária do FNDE em 03/05/2026 | Crédito bancário confirmado, inclusive com dígito verificador alfanumérico preservado como texto. |

> **Novo fato operacional:** o sistema agora possui uma evidência prática de três contas da 4ª CRE em que um pagamento registrado no PDDEInfo pode ser confrontado com um crédito bancário identificado no extrato SIGEF. Isso autoriza um piloto técnico restrito; não autoriza varrer 163 escolas, inferir contas ausentes, associar outros programas ou concluir que ausência de resultado equivale a ausência de crédito.

## Guardas obrigatórios para o próximo piloto

| Guarda | Motivo |
|---|---|
| Selecionar somente contas que o PDDEInfo atribui explicitamente ao rótulo exato `PDDE`. | Impede usar conta de PDDE Qualidade, Equidade ou outra ação como se fosse do PDDE Básico. |
| Limitar a primeira implementação ao programa SIGEF `02`. | É o único código demonstrado na amostra da 4ª CRE. |
| Persistir URL, parâmetros, HTML, hash, total declarado, página/posição e parser. | A consulta retorna múltiplos lançamentos e a semântica da paginação ainda não está comprovada. |
| Normalizar crédito e débito em observações independentes, com documento, histórico e identidade do beneficiário. | Evita transformar movimentação em saldo, gasto comprovado ou prestação de contas aprovada. |
| Manter separadas a data da ordem PDDEInfo e a data de crédito SIGEF. | A amostra comprovou defasagem entre os dois marcos. |
| Só elevar o estado para `CREDITO_LOCALIZADO_SIGEF` quando coincidirem CNPJ, conta, programa, valor e lançamento de crédito identificável do FNDE. O estado `CREDITO_CONFIRMADO_EXTRATO_BB` permanece reservado ao extrato bancário direto do BB. | Evita correlacionar por valor isolado ou por uma transferência de terceiro e preserva a taxonomia de fonte. |
| Registrar ausência de retorno, erro, alteração de página ou bloqueio como `CONSULTA_INCONCLUSIVA`. | Nenhuma falha técnica pode virar “não houve crédito”. |

## Priorização revista

O relatório é útil principalmente porque desloca o **extrato SIGEF por conta declarada** de hipótese para piloto comprovado. A sequência mais segura passa a ser: primeiro, adaptar e testar o extrato para três contas adicionais com programa `02`; depois, medir cobertura real entre as 163 escolas sem fazer inferências de conta ou código; em paralelo, implementar os relatórios em lote do PDDEInfo já testados; e somente depois ampliar a taxonomia de fatos financeiros para múltiplas fontes.

As frentes BB Gestão Ágil, Webservice SIGEF e Portal da Transparência continuam relevantes, mas não substituem o caminho que já possui resposta pública e prova com UEx da 4ª CRE. A PAB também continua prioritária para histórico e controle, porém não depende de descoberta de XHR: os seus endpoints públicos já foram comprovados pelo projeto.

## Referências

[1]: https://www.fnde.gov.br/sigefweb/default/conta-corrente/extrato-conta-corrente "SIGEF — Extrato Conta Corrente"
[2]: https://www.fnde.gov.br/sigefweb/index.php/liberacoes "SIGEF — Liberações"
[3]: https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade "PDDEInfo — Situação de Atendimento"
[4]: https://www.fnde.gov.br/pddeinfo/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao "PDDEInfo — Relatório de Suspensão"
[5]: https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade "PDDEInfo — Consulta de Saldo"
[6]: https://www.fnde.gov.br/webservices/sigef/teste/index/consultar-andamento-cr "FNDE — Interface pública de teste do Webservice SIGEF"
[7]: https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigefweb "FNDE — SIGEFWEB"
[8]: https://bb.com.br/site/setor-publico/bb-gestao-agil/ "Banco do Brasil — Gestão Ágil"
