# Pesquisa sobre defasagem do SIGEF e alternativas oficiais de menor atraso

**Data da investigação:** 14/08/2026  
**Autoria:** Manus AI  
**Escopo:** verificar se o corte de movimentações posteriores a maio de 2026 decorre do extrator ou da fonte SIGEF; pesquisar se há confirmação pública de atraso; e priorizar canais oficiais ou autorizados com menor defasagem para o monitoramento financeiro das 163 escolas da 4ª CRE.

## Conclusão executiva

O corte observado **não decorre do filtro nem da paginação do Extrator PDDE da 4ª CRE**. Vinte arquivos integrais SIGEF, coletados de UEx distintas pela rota pública oficial `visualizaexcel`, inclusive com solicitação de agosto de 2026 (`082026`), retornaram movimentações somente até **03/05/2026**. Na data da análise, isso equivale a uma lacuna observada de **103 dias**. O adaptador preserva o arquivo integral e aceita qualquer data dos exercícios de 2025 ou 2026; portanto, uma movimentação posterior presente na resposta teria sido mantida. A evidência indica **defasagem ou interrupção sistêmica no conteúdo exposto pelo canal público do SIGEF**, e não uma limitação introduzida pelo projeto.

Não foi localizado, contudo, comunicado oficial do FNDE que declare uma política de atualização com atraso de três meses, reconheça incidente específico após maio de 2026, ou informe prazo de regularização. Assim, a conclusão institucional correta é mais restrita:

> Há **defasagem comprovada no canal público SIGEF consultado**, mas sua natureza administrativa — rotina permanente, fila de processamento, atraso de integração ou incidente transitório — **não está oficialmente confirmada** nas fontes públicas pesquisadas.

O caminho tecnicamente mais promissor para reduzir a defasagem de **repasses federais** é um piloto controlado com os dados abertos diários do Portal da Transparência/CGU. Para a **movimentação bancária integral** — créditos, débitos, aplicações e resgates — a fonte potencialmente mais tempestiva é o **BB Gestão Ágil**, mas ela é institucional, protegida por autorização bancária e não possui API pública identificada para uso autônomo pelo Extrator. O sistema deve manter essas fontes separadas e nunca preencher conta ou movimentação SIGEF com dado de outro canal sem chave de vínculo comprovada.

## Método e limite probatório

A análise combinou evidência operacional preservada pelo projeto com pesquisa em páginas institucionais do FNDE, consulta pública SIGEF, Portal da Transparência/CGU, documentação de API/dados abertos e material oficial do Banco do Brasil. Foram aceitas como conclusões somente informações explicitamente apresentadas pelas fontes ou resultados reproduzíveis por artefatos preservados.

| Pergunta | Evidência exigida | Resultado |
|---|---|---|
| O corte foi criado pelo nosso extrator? | Parâmetro de consulta, parser, arquivo integral e data máxima observada. | **Não.** O corte vem do conteúdo devolvido pela fonte. |
| O SIGEF possui atraso público oficialmente declarado? | Manual, comunicado, informe ou metadado que informe periodicidade/atraso. | **Não confirmado.** Nenhuma declaração pública específica foi localizada. |
| A ocorrência parece limitada a uma conta ou a uma extração isolada? | Amostra multi-UEx e consulta por período posterior. | **Não.** O mesmo limite apareceu nos 20 arquivos integrais analisados e também foi reproduzido em projeto independente informado pelo usuário. |
| Há fonte oficial menos defasada para repasses? | Periodicidade declarada e acesso permitido. | **Sim, em potencial:** arquivos “Recursos transferidos” e “Recebimento de recursos por favorecido” da CGU são declarados como diários. |
| Há fonte oficial menos defasada para o livro-razão bancário? | Fonte que apresente crédito, débito, aplicação e resgate. | **Sim, com acesso autorizado:** BB Gestão Ágil; não há uso público irrestrito comprovado. |

## Evidência operacional preservada

O relatório técnico interno [`ANALISE_CORTE_TEMPORAL_SIGEF_2026_08_14.md`](./ANALISE_CORTE_TEMPORAL_SIGEF_2026_08_14.md) registra a leitura de 20 arquivos integrais SIGEF preservados, originados da rota oficial pública `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/visualizaexcel`. A resposta usada pelo projeto é o arquivo integral HTML/XLS do SIGEF, e não apenas a primeira página da tabela visual.

Em todos os arquivos, a maior data de movimentação encontrada foi **03/05/2026**. Isso inclui consultas cujo parâmetro de período foi agosto de 2026. A regra local limita somente o **exercício** a 2025 e 2026; não há regra que descarte junho, julho ou agosto. Essa combinação elimina duas explicações técnicas: limitação local por mês e falha de paginação da interface legada.

| Elemento conferido | Resultado | Significado para a conclusão |
|---|---:|---|
| Arquivos integrais SIGEF lidos | 20 | A amostra é distribuída entre UEx, não limitada a uma única escola. |
| Maior data retornada | 03/05/2026 | O conteúdo público não apresentou lançamentos posteriores. |
| Período posterior solicitado | `082026` | A ausência não foi causada pela solicitação de mês anterior. |
| Regra local de corte mensal | Inexistente | O projeto preservaria linha posterior a maio, se a fonte a devolvesse. |
| Defasagem observada em 14/08/2026 | 103 dias | Indicador de atraso material no canal analisado; não equivale a prova de ausência bancária real. |

## O que a documentação oficial do SIGEF confirma — e o que não confirma

O FNDE descreve o SIGEFWEB – Módulo Federais como elo de comunicação financeira, por meio do qual realiza repasses no SIAFI.[1] A interface pública de extratos aceita o exercício de 2026 e permite selecionar todos os meses de janeiro a dezembro.[2] Nenhuma dessas páginas apresenta, porém, **data de corte dos registros**, **periodicidade de atualização**, **SLA de processamento**, **painel de incidentes** ou comunicado de manutenção ligado ao atraso observado.

O cabeçalho do SIGEF exibe uma identificação de versão, mas a interface não a define como data de atualização financeira. Por rigor, ela **não pode ser usada como prova** de que os extratos estejam atualizados ou desatualizados. A descrição institucional do SIGEFWEB também trata do Módulo Federais; ela não funciona como manual técnico específico da rota pública de extrato de UEx. Essas limitações impedem classificar o atraso como política permanente ou incidente passageiro apenas pela documentação disponível.

| Fonte oficial pesquisada | O que foi encontrado | O que não foi encontrado | Conclusão de pesquisa |
|---|---|---|---|
| SIGEFWEB – FNDE | Finalidade financeira e relação com repasses no SIAFI.[1] | SLA, frequência de atualização ou aviso de atraso do extrato público. | Não comprova rotina de atualização. |
| Consulta pública de Extratos SIGEF | Filtro para 2026 e meses de janeiro a dezembro.[2] | Aviso de corte em maio, manutenção ou incidente. | Não há bloqueio mensal declarado. |
| Página oficial do PDDE | Indicação de PDDEWeb e PDDE Info – Consulta Escola como canais do programa.[3] | Extrato bancário por UEx e garantia de atualização intradiária. | Útil para dados programáticos; não substitui extrato. |
| Busca por informes/notícias FNDE 2026 | Comunicados do programa e páginas de sistemas foram confrontados. | Nota pública específica que explique dados SIGEF após 03/05/2026. | Sem confirmação pública de causa institucional. |

## Alternativas oficiais ou autorizadas de menor defasagem

### 1. Portal da Transparência/CGU — recomendação de piloto prioritário

O Portal da Transparência informa que seus dados abertos incluem **“Recursos transferidos”** e **“Recebimento de recursos por favorecido”** com periodicidade declarada como **diária**.[4] A própria CGU disponibiliza uma API REST para consultas pontuais, orienta o uso de arquivos abertos em demandas de maior volume, requer cadastro de e-mail e token para a API e estabelece limites de requisição publicados.[5] A documentação OpenAPI confirma que as chamadas utilizam autorização.[6]

Essa é a alternativa oficial mais adequada para detectar com menor atraso o **repasse federal**. Ainda assim, ela não deve ser confundida com extrato bancário: a fonte pode mostrar o ato de transferência/recebimento federal, sem todos os movimentos posteriores da conta — pagamentos, rendimentos, aplicações e resgates. Antes da integração produtiva, deve-se testar a disponibilidade de CNPJ do favorecido, órgão FNDE `26298`, data, valor, identificação do programa e eventual vínculo com a UEx.

| Critério | Portal da Transparência / CGU |
|---|---|
| Natureza | Transferência e recebimento de recursos federais; não é livro-razão bancário. |
| Atualização declarada | **Diária** para os arquivos “Recursos transferidos” e “Recebimento de recursos por favorecido”.[4] |
| Acesso | Dados abertos por arquivo; API REST com token após cadastro.[5] |
| Chave de associação esperada | CNPJ da UEx, órgão FNDE, data, valor e identificador de transferência, sujeitos a piloto. |
| Uso no Extrator | Evidência complementar `TRANSFERENCIA_FEDERAL_CGU`; jamais preencher conta PDDE ou concluir crédito em conta sem conciliação. |
| Limite | Não substitui crédito bancário, aplicação, débito, saldo ou extrato BB. |

### 2. BB Gestão Ágil — fonte de maior tempestividade para movimentações, com controle institucional

O Banco do Brasil informa que o BB Gestão Ágil concentra recursos creditados e gastos, aplicações financeiras, documentos relacionados e contas do beneficiário. A página declara que os extratos online detalham **débitos, créditos e aplicações** e que as informações ficam disponíveis a qualquer tempo no ambiente bancário.[7] Isso o torna, em tese, o canal com melhor aderência ao objetivo de captar a movimentação financeira efetiva da UEx.

O acesso não é público. O FAQ oficial hospedado pelo FNDE informa que o administrador de segurança deve conceder acesso aos usuários pelo caminho “BB Gestão Ágil → Gerenciar usuários – autorizar acessos”; caso a conta não apareça, o suporte ocorre pela área logada do BB ou pelos canais FNDE.[8] Logo, não há base autorizada para o Extrator automatizar navegação de contas sem credenciais e autorização institucional. Tampouco foi localizada API pública de extratos BB Gestão Ágil que pudesse ser integrada diretamente.

| Critério | BB Gestão Ágil |
|---|---|
| Natureza | Movimentação financeira bancária: créditos, débitos e aplicações.[7] |
| Tempestividade pública | O BB afirma disponibilidade eletrônica “a qualquer tempo”, mas não publica SLA técnico de atualização.[7] |
| Acesso | Autorização do administrador de segurança da conta; ambiente bancário protegido.[8] |
| Uso permitido no Extrator | Importação de extrato/exportação obtido em canal autorizado, com hash, data, conta e evidência preservados. |
| Uso não permitido | Contornar login, CAPTCHA, segurança bancária ou tentar usar credenciais de terceiros. |
| Limite | A habilitação de usuários é decisão e procedimento institucional, fora da autonomia do software. |

### 3. Dados Abertos do FNDE — controle financeiro e de regularidade, não prova de movimentação imediata

O FNDE declara disponibilizar, para o PDDE, dados sobre execução financeira, escolas atendidas, saldos de contas e regularidade da prestação de contas.[9] É uma fonte oficial útil para complementar PDDEInfo, qualificar a análise de saldos e registrar consistência programática. A página, entretanto, não informa frequência diária para o conjunto PDDE nem garante que os lançamentos bancários individuais sejam publicados em tempo real.

| Critério | Dados Abertos do FNDE |
|---|---|
| Natureza | Execução financeira consolidada, escolas atendidas, saldos e regularidade.[9] |
| Atualização declarada para PDDE | Não localizada na página pública consultada. |
| Acesso | Público, conforme os conjuntos disponibilizados pelo FNDE. |
| Uso no Extrator | Controle secundário por arquivo, com data de atualização, hash, exercício, cobertura e completude. |
| Limite | Não deve ser interpretado como extrato bancário diário. |

### 4. PDDEInfo — manter como referência pública primária, sem ampliar sua semântica

O próprio FNDE aponta a consulta PDDE Info – Consulta Escola no portal do programa.[3] O Extrator já a utiliza como fonte primária para identificar a UEx, programas, parcelas, conta declarada e **pagamento registrado no PDDEInfo**. Esse dado permanece essencial, inclusive se o SIGEF estiver atrasado. A fonte não deve, porém, ser convertida em prova de crédito bancário nem de saldo/movimentação de conta.

| Critério | PDDEInfo |
|---|---|
| Natureza | Cadastro, programas, parcelas e pagamentos registrados pelo FNDE. |
| Acesso | Público; já integrado e validado para as 163 escolas. |
| Uso no Extrator | Referência primária e invariável da auditoria. |
| Limite | Não comprova crédito em conta ou movimentos bancários. |

## Arquitetura recomendada para reduzir a defasagem sem misturar evidências

O SIGEF não deve ser removido: ele continuará sendo fonte complementar de extrato público quando seus dados estiverem disponíveis. A evolução segura é uma arquitetura de **fontes paralelas**, cada qual com o seu tempo de atualização, evidência e semântica.

| Camada | Fonte | Campo que pode sustentar | Estado de evidência proposto | Regra de proteção |
|---|---|---|---|---|
| Referência programática | PDDEInfo | Programa, parcela, conta declarada, pagamento registrado | `PAGAMENTO_REGISTRADO_PDDEINFO` | Não concluir crédito bancário. |
| Repasse federal mais tempestivo | Dados abertos CGU | Transferência/recebimento federal potencialmente associado ao CNPJ | `TRANSFERENCIA_FEDERAL_CGU` | Exigir CNPJ, data, valor e órgão; manter pendente se o programa não vier explícito. |
| Extrato público | SIGEF | Movimento bancário quando disponibilizado pela fonte | `MOVIMENTO_SIGEF_EXTRATO` | Exibir data máxima da fonte e não inferir ausência após ela. |
| Extrato autorizado | BB Gestão Ágil / extrato BB | Crédito, débito, aplicação, resgate e saldo conforme documento | `EXTRATO_BANCARIO_AUTORIZADO` | Importar somente artefato autorizado, identificado e hasheado. |

## Próximos passos recomendados e autorizados

O primeiro passo deve ser um **piloto de Dados Abertos CGU**, sem substituir o PDDEInfo e sem coletar dados bancários. O piloto deve usar a lista atual de CNPJs das UEx, restringir-se a 2026, consultar/baixar o conjunto diário de recursos transferidos e confrontar uma amostra de cinco a dez UEx que já tenham evidência SIGEF. O sucesso do piloto exige correspondência documentada de CNPJ, órgão FNDE, data e valor; divergências devem permanecer explícitas. Só depois desse teste o conector poderá ser classificado como fonte complementar de produção.

O segundo passo é incluir na auditoria um **indicador de vigência por fonte**, começando pelo SIGEF: “movimentações retornadas até 03/05/2026; consulta em 14/08/2026; cobertura não equivale a ausência de movimentos posteriores”. Essa informação evita que usuários interpretem a aparente ausência de junho a agosto como saldo parado ou inexistência de crédito.

O terceiro passo é tratar o BB Gestão Ágil como integração institucional futura, não como solução de navegação pública. O projeto pode desde já preparar um importador auditável de extratos oficiais exportados no ambiente autorizado, mas uma integração direta só deve ser desenvolvida se houver canal oficial, credenciais próprias e autorização formal para cada conta.

Por fim, para distinguir definitivamente atraso rotineiro de incidente transitório, recomenda-se uma solicitação técnica formal ao FNDE via Fala.BR ou canal oficial. A consulta deve anexar o intervalo de 20 evidências, as URLs preservadas e os hashes, e perguntar objetivamente: qual é a periodicidade do feed usado pela rota `visualizaexcel`; se há defasagem conhecida após 03/05/2026; se existe manutenção/incidente registrado; e qual dataset ou API oficial o FNDE recomenda para acompanhar repasses PDDE com menor atraso. O sistema pode preparar esse dossiê, mas o envio deve depender de autorização institucional apropriada.

## Referências

[1] [FNDE — SIGEFWEB](https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigefweb)  
[2] [FNDE — SIGEF, consulta pública de Extratos](https://www.fnde.gov.br/sigefweb/index.php/extratos)  
[3] [FNDE — Programa Dinheiro Direto na Escola (PDDE)](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde)  
[4] [CGU — Dados Abertos do Portal da Transparência](https://portaldatransparencia.gov.br/download-de-dados)  
[5] [CGU — API de Dados do Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados)  
[6] [CGU — Documentação OpenAPI](https://api.portaldatransparencia.gov.br/swagger-ui/index.html)  
[7] [Banco do Brasil — BB Gestão Ágil](https://bb.com.br/site/setor-publico/bb-gestao-agil/)  
[8] [FNDE — Perguntas e Respostas: PDDE e BB Gestão Ágil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/media-pdde/area-para-gestores/bb-gestao-agil/PerguntaseRespostasPDDE.pdf)  
[9] [FNDE — Dados Abertos](https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos)  
