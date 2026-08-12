# Pesquisa de alternativas oficiais para dados do PDDE — 12/08/2026

## Critérios de avaliação

As alternativas são avaliadas por cobertura de escola/programa/parcela/conta, atualização, acesso permitido, rastreabilidade de origem, possibilidade de automação legítima e utilidade complementar ao PDDEInfo. Nenhuma alternativa substitui automaticamente a fonte primária sem chave de conciliação documentada.

## Achados iniciais oficiais

| Alternativa | Situação verificada | Cobertura provável | Avaliação inicial |
|---|---|---|---|
| PDDEInfo | Página institucional confirma acesso sem senha a repasses, saldos, escola e UEx. | Escola, UEx, conta, repasses e ações integradas. | Fonte primária comprovada; manter coleta por INEP. |
| Dados Abertos FNDE | Página oficial inclui PDDE com execução financeira, escolas atendidas, saldos e regularidade de prestação de contas. | Controle agregado e potencial arquivo versionado. | Alternativa promissora para controle secundário; é necessário localizar o recurso de download e medir a cobertura por INEP/ano. |
| Portal da Transparência | API REST oficial, com token cadastrado, limites de 400 consultas/minuto das 06h às 23h59 e recomendação de planilhas para volume completo. | Transferências e despesas federais, conforme endpoint disponível. | Complementar potencial; exige confirmar endpoint que exponha transferências PDDE por CNPJ/beneficiário antes de integrar. |
| Consulta Geral de Liberações FNDE | Formulário público expõe exercício, programa PDDE, CNPJ, UF, município e tipo de entidade. | Liberações financeiras por filtros. | Candidato a piloto somente se o retorno puder ser consultado e evidenciado sem CAPTCHA; não é API declarada. |
| Dados Abertos MEC | O portal devolveu página de verificação de segurança no acesso automatizado. | Há página temática de PDDE Campo nos resultados de pesquisa. | Não habilitar automação; verificar canal oficial de arquivo ou API sem contornar o controle. |

## Observação semântica relevante

A página oficial do PDDE confirma que o Programa Dinheiro Direto na Escola também é conhecido como **PDDE Básico**. As ações integradas utilizam contas próprias de PDDE Qualidade e PDDE Equidade. Este conceito é coerente com a regra do extrator de classificar o rótulo bancário exato `PDDE` como Básico e nunca usar contas de Qualidade ou Equidade para completar esse campo.

## Validação técnica das alternativas

| Alternativa | Evidência técnica confirmada | Limite encontrado | Decisão recomendada |
|---|---|---|---|
| PDDEInfo por INEP | O FNDE declara que o PDDEInfo é público, sem senha, e informa repasses, saldos, escola e UEx. [2] | Não há API oficial publicada nesta pesquisa; a consulta estruturada continua centrada na tela por escola. | **Manter como fonte primária.** É a única alternativa já comprovada para o nível de detalhe da rotina da 4ª CRE. |
| Dados Abertos FNDE / Olinda | O FNDE declara que disponibiliza execução financeira, escolas atendidas, saldos e regularidade de prestação de contas do PDDE. A página oficial aponta o catálogo de Dados Abertos do FNDE e tutorial da plataforma Olinda. [1] [6] | A navegação pública não revelou, nesta pesquisa, um recurso PDDE com URL de download/API estável e documentada por INEP, exercício e parcela. | **Prioridade de pesquisa futura alta.** Fazer piloto somente após localizar o recurso específico, registrar URL, esquema, atualização e cobertura contra a lista de 163 INEPs. |
| API do Portal da Transparência | A API REST é oficial, requer token próprio e declara limite de 400 requisições/minuto das 06h às 23h59. [4] A especificação possui endpoint de “recursos recebidos por favorecido”, com filtros por mês e códigos SIAFI de órgão/unidade gestora. [7] | Não foi encontrado endpoint PDDE dedicado ou filtro confirmado por INEP, parcela e conta. O endpoint de recursos recebidos é agregado pela estrutura SIAFI e não prova crédito em conta de UEx. | **Controle macro, não fonte de parcela.** Só integrar se um piloto documentar correspondência por CNPJ, programa, período e valor, sem substituir o PDDEInfo. |
| Liberações — Consultas Gerais FNDE | O formulário público expõe `p_ano`, `p_programa`, `p_cgc`, `p_uf`, `p_municipio` e `p_tp_entidade`, com submissão POST para resultado de liberações. [5] | Não é API declarada; a forma, o limite, a completude e a qualidade do resultado ainda não foram testados contra a chave de conciliação. | **Candidato a piloto controlado.** Não habilitar produção até testar uma consulta limitada, armazenar resposta e demonstrar como o retorno identifica programa, favorecido, valor e data. |
| Ferramentas abertas de terceiros | Buscas no GitHub por `PDDE FNDE`, `pdde` e `pddeinfo` não encontraram projeto específico, mantido e aderente para substituir o coletor. | Resultados eram inexistentes, irrelevantes ou sem aderência funcional ao PDDEInfo. | **Não instalar ferramenta de terceiros.** O coletor próprio permanece mais rastreável e auditável. |

## Recomendação operacional

O projeto **não precisa trocar o coletor atual**. Para a rotina de 163 escolas, o caminho mais robusto continua sendo a consulta individual ao PDDEInfo, com HTML/JSON, hash, parser versionado, validações e histórico imutável. A pesquisa encontrou três melhorias possíveis, mas nenhuma substituta imediata:

1. localizar no catálogo/Olinda um arquivo aberto de execução financeira do PDDE e testá-lo como **controle secundário versionado**, nunca como substituto silencioso;
2. fazer um piloto restrito da Consulta Geral de Liberações do FNDE para medir a granularidade do retorno; e
3. manter a API do Portal da Transparência somente como fonte de contexto macro, caso a chave de identificação se revele suficiente.

Nenhuma dessas alternativas resolve o bloqueio CAPTCHA do SIGEF, nem autoriza a inferência de conta ou crédito bancário. A orientação correta é preservar o dado disponível, registrar a limitação da fonte e seguir o fluxo PDDEInfo.

## Próximo piloto recomendado, quando priorizado

O piloto mais promissor é **Dados Abertos FNDE/Olinda**, porque a instituição declara cobertura de execução financeira, escolas, saldos e regularidade do PDDE. O piloto deve produzir um artefato versionado, comparar a cobertura com os 163 INEPs, medir o atraso de atualização e verificar se há os campos mínimos: INEP ou CNPJ, exercício, programa/ação, valor, data, saldo e situação de prestação de contas. Sem esses campos, o recurso deve permanecer apenas como referência documental.

## Fontes consultadas

1. [Dados Abertos — FNDE](https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos)
2. [PDDE Info — FNDE](https://www.gov.br/fnde/pt-br/assuntos/sistemas/pddeinfo)
3. [PDDE — FNDE](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde)
4. [API de Dados — Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados)
5. [Liberações — Consultas Gerais FNDE](https://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_01_pc)
6. [Tutorial Sistema Olinda — FNDE](https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos/tutorial-sistema-olinda)
7. [Especificação OpenAPI — Portal da Transparência](https://api.portaldatransparencia.gov.br/v3/api-docs)
