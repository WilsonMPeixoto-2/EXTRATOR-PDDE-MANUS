# Análise crítica — relatório externo de evolução PDDE

**Data da análise:** 15/08/2026  
**Objeto analisado:** relatório propositivo encaminhado pelo usuário, atribuído a outro projeto/repositório.  
**Método:** confronto das afirmações com os artefatos, a base persistida, os contratos de fonte e o código efetivamente em operação no Extrator Financeiro PDDEInfo — 4ª CRE. O documento externo não foi tratado como prova de execução nem como ordem de alteração.

## Conclusão executiva

O relatório contém boas direções de engenharia, mas mistura recomendações plausíveis com números, componentes e ambientes que **não correspondem ao sistema oficial da 4ª CRE**. A contribuição prática é seletiva: reforça controles já adotados, como valores em centavos, proteção contra fórmulas, validação de resposta e execução integral aprovada. Não justifica migrar o projeto para Supabase, Next.js, Vercel, nove abas Excel ou um modelo de risco que transforme lacuna de fonte em irregularidade.

> A referência factual do sistema permanece a execução PDDEInfo aprovada `14fe09f3-a1cb-4ff7-bb05-fc1089849f72`, com 163/163 escolas. O SIGEF é complementar: há 20 UEx com evidência preservada e 14 créditos compatíveis, não uma coleta integral de todas as contas da carteira.

## Confronto das principais alegações

| Afirmação do relatório externo | Verificação no projeto oficial | Classificação | Decisão |
|---|---|---|---|
| Coleta PDDEInfo das 163 escolas | A execução aprovada preserva 163/163 escolas e evidências por unidade. | Confirmada | Manter como referência primária. |
| Consulta SIGEF de 284/284 contas, sem falhas ou páginas parciais | O projeto oficial preserva 20 UEx SIGEF, com cobertura integral por `visualizaexcel` apenas quando a identidade já é conhecida; o segundo lote registrou timeout SSL. | Não reproduzida | Não incorporar número, cobertura nem conclusão externa. |
| R$ 409.010,00 em créditos SIGEF localizados | A base oficial registra 14 créditos compatíveis nos lotes concluídos; a origem do total externo não veio acompanhada de artefatos verificáveis neste projeto. | Não confirmada | Não exibir nem utilizar em decisão financeira. |
| Excel em nove abas | A exigência institucional do projeto é exatamente `Financeiro 4ª CRE V2` e `Validação V2`. | Incompatível | Rejeitar. |
| Sistema sem interface e banco de produção | O projeto oficial possui aplicação React/tRPC, banco MySQL/TiDB, auditoria persistida e site publicado no ambiente institucional Manus. | Incompatível | Não migrar por premissa falsa. |
| Supabase/Postgres, Kysely, Next.js e Vercel | São substituições completas de infraestrutura, sem benefício comprovado sobre a pilha atual Drizzle/React/tRPC/MySQL/TiDB. | Não justificada | Rejeitar migração. |
| Validação de schema, limites HTTP e valores inteiros | Zod já está disponível; limites, tentativas, hashes e pausas já existem. Valores em centavos e proteção contra fórmulas foram incorporados em 15/08/2026. | Parcialmente confirmada | Adotar somente reforços específicos, testados. |
| BB Gestão Ágil/Webservice SIGEF para saldos e aplicações | Há viabilidade institucional, mas não há credenciais de leitura nem contrato de acesso habilitado. | Dependente de autorização | Manter como frente externa, não como dado disponível. |
| “Saldo estimado”, tarifas indevidas e pagamento sem crédito como matriz automática de risco | O SIGEF público está defasado e não demonstra posição de saldo; transformar ausência de evidência em achado seria inferência indevida. | Rejeitada | Não automatizar juízos ou cobranças. |

## Contribuições aproveitáveis

O relatório foi útil ao reforçar quatro controles que já foram avaliados e incorporados seletivamente. A conversão de moeda brasileira passou a ocorrer por **centavos inteiros** antes da materialização do valor; o workbook neutraliza textos externos que possam ser interpretados como fórmula; o SIGEF rejeita documento não reconhecível ou identidade bancária divergente; e a referência corrente exige execução aprovada com cobertura de 163/163 escolas. Todos esses controles possuem testes de regressão.

Também permanece útil a ideia de separar leitura operacional de evidência bruta. Contudo, o projeto já persiste escolas, campos, artefatos, eventos e observações no banco; um novo “read model” só deve ser criado após uma necessidade de desempenho demonstrada por medição, e não por troca preventiva de banco ou framework.

## Propostas que não devem avançar sem nova evidência

Não é recomendável explorar “relatórios em lote” do PDDEInfo apenas porque o relatório os menciona. A existência, os parâmetros, o acesso permitido e a capacidade de fornecer contas ou saldos precisam de piloto separado e documentado. Da mesma forma, um dossiê PDF individual pode ser avaliado como produto futuro, desde que apresente somente identificação, valores por fonte e limites explícitos; ele não pode chamar transferência de saldo, pagamento de crédito confirmado ou ausência de SIGEF de irregularidade.

## Impacto no plano do projeto

O próximo incremento técnico permanece a importação auditável de PDDEInfo e CGU, já planejada em `ARQUITETURA_IMPORTACAO_AUTOMATICA_2026_08_15.md`. A escolha de disparo — assistido por botão ou automático em segundo plano — ainda depende de confirmação do usuário. Nenhuma recomendação externa altera a hierarquia: PDDEInfo é fonte principal; CGU e SIGEF são complementares, cada qual com artefato, data, chave e limitação próprios.
