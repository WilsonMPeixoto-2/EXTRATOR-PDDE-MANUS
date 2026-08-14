# Análise de fontes oficiais para evolução do Extrator PDDE — 4ª CRE

**Data da pesquisa:** 13–14 de agosto de 2026  
**Escopo:** avaliação documental e testes controlados de acesso público, sem uso de credenciais de terceiros, sem contorno de CAPTCHA e sem automatização de fluxos autenticados.  
**Decisão de arquitetura proposta:** o sistema deve evoluir de um extrator centrado em portais para um **coletor e conciliador de fontes oficiais do PDDE**, no qual cada fonte responde somente às perguntas que consegue comprovar.

> **Regra de segurança de dados:** nenhuma fonte complementar deve preencher, substituir ou inferir conta bancária, crédito ou despesa de outra fonte. A fonte, a evidência, o identificador de vínculo e o nível de confirmação devem permanecer visíveis por campo.

## Resumo executivo

O relatório anexado identificou corretamente uma mudança de arquitetura: **“Movimentações e utilização dos recursos”** é uma dimensão de negócio, enquanto SIGEF, BB Gestão Ágil e eventuais produtos estruturados do FNDE são adaptadores de fonte. A pesquisa confirmou que a **Plataforma Antonieta de Barros (PAB)** relaciona oficialmente o PDDE a **19 produtos de dados**, e que sua área de dados oferece produtos, tabela de repasses e painéis gerenciais.[1] [2] Isso a torna a frente de maior prioridade, embora a enumeração e a exportação dos 19 produtos ainda não tenham sido comprovadas no ambiente de pesquisa.

O **BB Gestão Ágil** é a fonte mais promissora para a dimensão de execução: o próprio Banco do Brasil declara que a solução reúne créditos, gastos, aplicações, documentos, categorias e extratos, inclusive utilizando APIs na integração entre órgão repassador e beneficiário.[3] Contudo, essa capacidade funcional não equivale a uma API pública do PDDE. A página de extratos localizada não expôs campos ou consulta pública utilizável; a integração automática deve aguardar uma rota pública documentada ou acesso institucional autorizado.

Para entrega imediata e segura, a prioridade não é construir novos scrapers. É abrir uma **fase curta de descoberta controlada**, com um conjunto de escolas representativas, para enumerar produtos PAB, testar os mecanismos oficiais de exportação dos painéis PDDE, verificar a consulta pública do SiGPC por canal funcional e perfilar os datasets PDDE do FNDE. Enquanto isso, o PDDEInfo continua sendo a fonte primária operacional de repasses, contas e situação por escola, e o Excel atual permanece válido.

## Critérios de decisão

| Critério | Pergunta aplicada | Exigência para entrar no fluxo produtivo |
|---|---|---|
| **Cobertura** | A fonte traz repasse, conta, saldo, execução, prestação ou cadastro? Em qual granularidade? | O dado precisa responder a uma pergunta operacional definida. |
| **Acesso permitido** | É público, tem exportação oficial, exige token ou exige perfil autenticado? | Não há contorno de CAPTCHA, autenticação ou controles bancários. |
| **Chave de associação** | É possível vincular a escola/entidade sem ambiguidade? | INEP para escola; CNPJ para UEx; exercício, programa, ação/parcela e, quando aplicável, valor/data/OB. |
| **Rastreabilidade** | A resposta pode guardar URL, parâmetros, artefato, data e hash? | A evidência precisa ser preservável por execução. |
| **Atualidade e completude** | Há data de atualização, dicionário e cobertura mensurável? | Sem metadados, o dado só pode ser tratado como auxiliar. |
| **Custo operacional** | A fonte reduz consultas, mas com estabilidade e conformidade? | A automatização deve ser determinística, limitada e reversível. |

## Matriz consolidada de viabilidade

| Fonte | Dimensão que pode responder | Acesso observado | Chave provável | Veredito atual | Prioridade |
|---|---|---|---|---|---|
| **PDDEInfo** | Repasses, contas, saldos, escola/UEx e situação | Público; já operacional no sistema | INEP, CNPJ, exercício, programa | **Fonte primária mantida** | Operação contínua |
| **Plataforma Antonieta de Barros** | Produtos estruturados, repasses e painéis | Pública, mas metadados de detalhe carregam dinamicamente | A confirmar por produto | **Descoberta prioritária** | 1 |
| **BB Gestão Ágil** | Créditos, débitos, aplicações, documentos e categorias | Plataforma existente; consulta pública não comprovada | CNPJ, conta, programa, exercício; a confirmar | **Descoberta prioritária; sem integração ainda** | 2 |
| **Painéis PDDE / Power BI** | Visão consolidada de atendimento, repasse, execução e prestação | Públicos; painel não concluiu carregamento no ambiente | Município/UF, potencialmente INEP | **Testar exportação oficial** | 3 |
| **SiGPC Acesso Público** | Situação de prestação de contas e UEx | Oficialmente sem cadastro; rota rejeitada no ambiente | UEx/CNPJ, programa, vigência, UF/município | **Possível, não comprovado operacionalmente** | 4 |
| **Dados Abertos FNDE / Olinda** | Execução, escolas atendidas, saldos e regularidade | Institucionalmente declarados; catálogo não exposto no ambiente | A confirmar por dataset | **Controle secundário e análise em lote** | 5 |
| **Portal da Transparência / CGU** | Contraprova de transferências e favorecidos | API com token e limites; downloads oficiais | CNPJ, período, órgão, programa/ação | **Contraprova, não fonte de conta/extrato** | 6 |
| **SIGEF Liberações** | OB, data, valor, banco, agência e conta | Rota pública testada com CAPTCHA | Chave financeira completa | **Bloqueada, sem contorno** | Condicionada |
| **SIGEF Extratos/Movimentações** | Créditos, débitos e extratos | Piloto por arquivo autorizado; rota pública com reCAPTCHA | CNPJ, conta, exercício, valor/data | **Evidência limitada por arquivo autorizado** | Condicionada |
| **SiGPC Contas Online** | Transferências, contas, despesa, pagamentos, extratos e saldo | Gov.br e perfil autorizado | CNPJ/UEx, prestação, programa e exercício | **Aprofundamento sob autorização institucional** | Sob demanda |
| **PDDEWeb** | Cadastro, UEx/EEx, regularidade de mandato/adesão | Gov.br e perfil de entidade | CNPJ/UEx, escola | **Conferência cadastral sob autorização** | Sob demanda |
| **SIMEC / PDDE Interativo** | Ações e adesões específicas | Interface exigiu JavaScript/cookies; escopo PDDE financeiro não comprovado | Caso a caso | **Baixa prioridade** | 7 |
| **Transferegov** | Instrumentos de transferência específicos | Público para informações institucionais, plataforma por modalidade | Número de instrumento/ente | **Não central para repasse automático PDDE** | 8 |

## Análise individual das fontes

### 1. PDDEInfo — fonte primária que deve permanecer no núcleo

O PDDEInfo já atende a pergunta operacional mais frequente da 4ª CRE: quais repasses, parcelas, dados bancários explicitamente exibidos e situações de cada escola estão registrados na base pública do FNDE. O próprio FNDE apresenta o sistema como meio de extrair dados de cadastro, recursos, ações integradas, saldos e situações relacionadas ao programa.[4] Ele continua sendo a única fonte comprovada no sistema para uma coleta autônoma das 163 escolas com evidências preservadas.

Isso não significa que o PDDEInfo prova execução bancária ou despesa. No modelo atual, “Valor Pago Total” deve continuar significando **pagamento registrado no PDDEInfo**, não crédito bancário confirmado. A conta do PDDE Básico permanece válida apenas quando a tabela bancária da própria fonte apresentar o rótulo exatamente como `PDDE`; nenhuma fonte complementar pode corrigir essa conta por semelhança de nome.

### 2. Plataforma Antonieta de Barros — maior oportunidade de dados estruturados

A PAB é oficialmente descrita como Plataforma de Governança de Dados do FNDE e sua área de dados disponibiliza três vias: **produtos de dados**, **tabela de repasses** e **painéis gerenciais**.[1] A ficha pública do programa confirma que o PDDE possui **19 produtos relacionados**.[2] Esta é a evidência mais forte para justificar a descoberta técnica antes de desenvolver automação adicional em fontes legadas.

O potencial é alto porque um produto de dados pode oferecer arquivo, dicionário, periodicidade e colunas mais estáveis que uma página transacional. Porém, a página do PDDE carregou a relação de produtos dinamicamente e não a expôs no ambiente de pesquisa. Portanto, ainda não é possível afirmar que há tabela PDDE exportável, que existe API pública ou que qualquer produto tenha nível escola/INEP. O próximo piloto deve enumerar os 19 itens por interface pública ou rota oficialmente exposta; para cada item, registrar nome, URL, formato, dicionário, atualização, granularidade, campos e mecanismo de exportação.

**Decisão:** implementar primeiro um *adaptador de catálogo* — não um extrator de valores. Ele deve apenas inventariar metadados e classificar cada produto como `PUBLIC_STRUCTURED`, `PUBLIC_DASHBOARD`, `AUTH_REQUIRED`, `UNAVAILABLE` ou `UNKNOWN`.

### 3. BB Gestão Ágil — melhor candidata para a dimensão de execução, mas não comprovada como fonte pública

O Banco do Brasil descreve o Gestão Ágil como solução que centraliza “recursos creditados e gastos, aplicações financeiras, documentos de despesas relacionados, categorizações dos gastos e todas as contas relativas a um beneficiário”. A mesma página afirma que usa APIs para troca de dados entre repassadores e beneficiários e que os extratos online detalham créditos, débitos e aplicações.[3] Para prestação de contas, é uma semântica muito mais rica que a de “repasse pago” do PDDEInfo.

Há também material oficial do FNDE voltado ao PDDE e à categorização de despesas no BB Gestão Ágil, o que confirma pertinência institucional da solução ao programa.[5] O tutorial do SiGPC e os materiais do FNDE ajudam a evidenciar como sistemas de prestação conectam conta, aplicação e extrato; ainda assim, não se deve transferir essa conclusão automaticamente ao BB Gestão Ágil.

No teste realizado, o endereço público referido para o ambiente de extratos não expôs consulta, dados ou parâmetros reutilizáveis. Isso pode refletir autenticação, política de rede ou navegação dependente de contexto, mas não autoriza inferir uma transparência pública por CNPJ. **A fonte deve ser tratada como `AUTH_OR_PUBLIC_STATUS_UNCONFIRMED`.**

**Decisão:** não integrar agora. Priorizar a busca de (i) produto PDDE equivalente na PAB, (ii) área de Transparência Pública BB Ágil explicitamente documentada, ou (iii) acesso institucional autorizado com escopo, auditoria e minimização de dados. Mesmo quando houver acesso, movimentos bancários e despesa devem permanecer em camada separada de repasses PDDEInfo.

### 4. Painéis BI do PDDE — fonte potencial de consolidação, não de API presumida

O FNDE divulga painéis de PDDE com informações de atendimento, repasses e execução, enquanto a PAB mantém painéis gerenciais relacionados a execução, prestação de contas e repasses.[1] A visualização pública do Power BI localizada para PDDE Básico e Ações Integradas é evidência de que há uma visão consolidada; não é evidência de endpoint público estável.

No ambiente de pesquisa, o painel permaneceu em carregamento e não permitiu confirmar filtros, colunas ou exportação. A abordagem correta é usar somente as funções que o próprio painel oferecer, como exportar dados, exportar tabela resumida ou link de download, se existirem e forem permitidas. Não se deve sondar consultas internas do Power BI, reproduzir tokens de sessão ou tratar requisições de visualização como API do FNDE.

**Decisão:** piloto de baixo custo com uma escola por perfil e filtro de município. Se a exportação oficial devolver INEP, programa, ano, valor e data com atualização verificável, o painel poderá ser um controle de cobertura ou uma aceleração de coleta. Se não devolver granularidade escolar suficiente, manter como consulta analítica manual.

### 5. SiGPC Acesso Público — viável conceitualmente para regularidade e prestação de contas

O FNDE informa que o SiGPC Acesso Público dispensa cadastro e permite pesquisar prestação de contas por tipo de OPC, vigência, programa, UF e município; também permite consultar a situação das UEx.[6] Essa é a fonte adequada para responder **“qual a situação de prestação de contas desta entidade/programa?”**, e não para provar gasto, extrato ou crédito em conta.

O teste direto do endereço indicado pelo FNDE retornou “Request Rejected” no ambiente de pesquisa. Como isso contrasta com a descrição oficial, a conclusão não pode ser “não há acesso público”. O resultado correto é: rota pública documentada, mas acesso operacional não comprovado no ambiente atual. Não se deve automatizar enquanto não houver uma sessão/rota permitida que responda de forma estável.

**Decisão:** incluir no próximo piloto como `PUBLIC_ROUTE_NEEDS_VALIDATION`; se houver resposta funcional, extrair somente situação de UEx/prestação, filtros aplicados, URL e data. Sem preencher dados financeiros ou bancários.

### 6. SiGPC Contas Online — rico para dossiê, inadequado para coleta autônoma sem autorização

O FNDE afirma que o SiGPC Contas Online permite inserir e analisar dados de execução técnica e financeira, além de destacar em seus tutoriais transferências, conta corrente/aplicação, documentos de despesa, pagamentos, extratos, restituições e reprogramação de saldo.[7] A análise do tutorial de conta corrente identificou campos de CNPJ, entidade, programa, ano, banco, agência, conta e vínculos de aplicação; o material também mostra ambiente logado e operações protegidas.

A própria página informa autenticação pelo Gov.br e equipe técnica vinculada à entidade.[7] Logo, não é legítimo nem tecnicamente recomendado transformá-lo em fonte de coleta automática das 163 escolas. É, contudo, muito valioso em uma rotina posterior de **dossiê aprofundado por unidade**, mediante autorização formal, perfil de acesso adequado e trilha completa do operador.

**Decisão:** desenhar futuramente um conector `AUTHORIZED_SIGPC` de acionamento manual e escopo por caso. O conector deve importar apenas o que for autorizado, guardar evidência e manter os dados separados da coleta pública.

### 7. Dados Abertos FNDE e Olinda — candidato relevante para histórico, lote e fallback controlado

O FNDE declara que seus dados abertos do PDDE incluem execução financeira, relação de escolas atendidas, saldos de contas e situação de regularidade das prestações de contas.[8] Esse conjunto é exatamente o tipo de cobertura que pode complementar uma base por INEP, sobretudo para análise em lote, comparação histórica e detecção de lacunas.

Entretanto, a declaração institucional não identifica o recurso específico, suas colunas, cobertura temporal ou periodicidade. No ambiente de pesquisa, o catálogo do MEC exigiu JavaScript/cookies e o Olinda não expôs a lista de recursos. Isso impede concluir que a API de algum dataset esteja atual, que contenha PDDE Básico, ou que ofereça saldo na granularidade necessária.

**Decisão:** criar um inventário de datasets, começando pelo catálogo oficial, e validar por amostra: URL, versão, data de atualização, dicionário, licença, formato, tamanho, exercício, chave escolar e cobertura de cinco escolas. Quando a base for histórica ou atrasada, classificá-la como `SECONDARY_CONTROL`, jamais como valor atual sem ressalva.

### 8. PDDEWeb — fonte de cadastro, não de movimentação nem de repasse

O PDDEWeb é apresentado pelo FNDE como sistema para cadastro e atualização de UEx e EEx, condição ligada à participação e ao recebimento de recursos do PDDE.[9] O serviço atual exige Gov.br e perfil de escola, prefeitura, secretaria ou entidade mantenedora.[10] Portanto, seu melhor uso é confirmar identificação institucional, adesão, representação e atributos cadastrais relevantes para a chave CNPJ/UEx.

Não há evidência de que o PDDEWeb deva ser tratado como fonte pública de conta bancária, nem como prova de crédito ou despesa. A página institucional ainda registra limitação histórica de navegador, outro motivo para não criar scraper.

**Decisão:** fonte de conferência cadastral sob autorização; não incluir no fluxo de execução diária.

### 9. Portal da Transparência — contraprova independente com API formal, mas granularidade distinta

O Portal da Transparência oferece consultas, downloads de dados abertos e API REST formalmente documentada.[11] A CGU informa que a API exige cadastro e token, aplica limites de requisição e recomenda arquivos abertos para volumes maiores.[11] A página do FNDE também direciona para consultas a recursos transferidos e informa que as consultas detalhadas permitem filtrar, ajustar colunas e baixar dados.[12]

Esta é a fonte adequada para contraprovar transferências, beneficiários, órgão, período e programação, desde que a resposta contenha chave suficiente. Ela não deve ser usada como origem de conta bancária, saldo real de UEx ou detalhe de despesa escolar, porque essa granularidade não foi comprovada.

**Decisão:** piloto opcional após PAB e Dados Abertos. Avaliar primeiro se o endpoint de recursos recebidos ou o arquivo baixável contém CNPJ de UEx e informações do FNDE/PDDE que permitam associação inequívoca. Caso contrário, usar só em investigações de divergência material.

### 10. SIGEF — manter como confirmação condicional, não como segunda camada exclusiva

Os pilotos anteriores do projeto já documentaram que as rotas de Liberação e de Conta Corrente do SIGEF exigem CAPTCHA e não podem ser automatizadas; o extrato permaneceu viável somente por arquivo autorizado. Esses resultados permanecem válidos. O SIGEF tem alto valor semântico para ordem bancária, crédito e movimentação, mas o acesso determina a classificação: **`CAPTCHA_REQUIRED`** ou **`AUTHORIZED_FILE_ONLY`**, nunca “falha silenciosa”.

**Decisão:** manter adaptadores e contratos de evidência, sem esforço de contorno. Se surgir canal autorizado ou API formal, realizar novo piloto com chave financeira completa: CNPJ, exercício, programa, ação/parcela, valor, data, OB e conta destinatária.

### 11. SIMEC, PDDE Interativo e Transferegov — fontes periféricas e condicionais

O SIMEC/PDDE Interativo tem relevância para adesões e ações específicas, mas a verificação não demonstrou base financeira PDDE pública, por escola, com exportação adequada. O Transferegov, por sua vez, é plataforma de transferências e parcerias da União, abrangendo modalidades como fundo a fundo, discricionárias e legais.[13] Não foi demonstrada aderência direta ao modelo de repasse automático do PDDE para UEx.

**Decisão:** não investir agora. Reabrir apenas se uma pergunta de negócio exigir ação específica, instrumento, adesão ou transferência fora do núcleo de repasse automático do PDDE.

## Arquitetura recomendada

```text
PERGUNTA OPERACIONAL
        │
        ├── Repasses, parcelas, contas e situação por escola
        │       └── PDDEInfo (fonte primária)
        │
        ├── Visão em lote, histórico e controle de cobertura
        │       └── PAB / Dados Abertos / exportação oficial de painel, se comprovados
        │
        ├── Execução, crédito, gasto e documento comprobatório
        │       └── BB Gestão Ágil / SIGEF / SiGPC autorizado, conforme acesso permitido
        │
        ├── Regularidade da prestação de contas
        │       └── SiGPC Acesso Público; SiGPC Contas Online autorizado para detalhe
        │
        ├── Cadastro de UEx/EEx
        │       └── PDDEWeb autorizado
        │
        └── Divergência material
                └── Portal da Transparência + fonte primária + fonte financeira permitida
```

| Camada | Regra de implementação |
|---|---|
| **Adaptadores por fonte** | Cada adaptador deve declarar acesso, versão, parâmetros, taxa, chaves, evidência e limitações. |
| **Modelo canônico** | Preservar origem por campo; não criar “valor único” quando fontes discordam. |
| **Conciliação** | Só associar crédito a pagamento quando houver chave documentada suficiente. |
| **Interface** | Exibir uma fonte de cada vez, com status de evidência e ação sob demanda. Não consultar todas as fontes a cada abertura. |
| **Exportação** | Manter PDDEInfo como base principal e acrescentar fontes como colunas/abas de evidência somente após piloto aprovado. |

## Plano de descoberta recomendado

| Etapa | Amostra e ação | Critério de aprovação | Saída esperada |
|---|---|---|---|
| **A. PAB** | Enumerar os 19 produtos PDDE e abrir as fichas públicas. | Produto com formato, dicionário, atualização e exportação/consulta pública. | Catálogo classificado por utilidade e acesso. |
| **B. Dados Abertos/Olinda** | Encontrar e baixar os recursos PDDE publicados; comparar cinco escolas. | INEP/CNPJ ou outra chave inequívoca, exercício e cobertura mensurável. | Perfil de dataset e teste de reconciliação. |
| **C. Painéis PDDE** | Usar exportação oficial para município/amostra, se disponível. | Dados exportados trazem granularidade e metadados suficientes. | Decisão: controle de cobertura ou consulta manual. |
| **D. SiGPC Público** | Testar por rota funcional e consulta documentada. | Retorno público estável, sem CAPTCHA, com situação de UEx/prestação. | Piloto de status de prestação. |
| **E. BB Gestão Ágil** | Identificar canal explicitamente público ou documentar via institucional de acesso autorizado. | Termos de acesso, campos e evidências preserváveis. | Decisão sobre conector autorizado ou aguardar. |
| **F. Portal Transparência** | Avaliar endpoint/arquivo por CNPJ e período. | Chave e granularidade permitem contraprova sem inferência. | Controle de divergência material. |

A amostra deve conter, no mínimo, uma escola com PDDE Básico pago, uma com várias Ações Integradas, uma sem conta PDDE Básico exibida, uma com parcela sem pagamento registrado e uma com evidência SIGEF previamente preservada. O piloto não deve ser escalado para as 163 escolas antes de confirmar cobertura, chaves, atualização e evidência para todos os campos pretendidos.

## Decisões de curto prazo

| Decisão | Justificativa |
|---|---|
| **Manter a coleta PDDEInfo como operação principal** | É a única fonte já comprovada para as 163 escolas, com rastreabilidade e regras bancárias seguras. |
| **Priorizar PAB antes de novo esforço de scraping** | A relação oficial de 19 produtos PDDE pode revelar dados estruturados e reduzir automação frágil. |
| **Tratar BB Gestão Ágil como oportunidade, não promessa** | O escopo funcional é excelente, mas a disponibilidade pública para PDDE ainda não foi comprovada. |
| **Separar prestacão de contas de execução diária** | SiGPC/BB/PDDEWeb dependem de autorização ou servem a dossiês específicos; não devem sobrecarregar a rotina de repasses. |
| **Usar Portal da Transparência somente para contraprova** | A API é formal e útil, mas não prova o saldo, a conta ou a despesa de uma UEx. |
| **Não contornar CAPTCHAs** | SIGEF e rotas equivalentes permanecem explicitamente bloqueadas até acesso autorizado. |

## Limitações da pesquisa

Esta avaliação não obteve autenticação Gov.br, credencial bancária, token da CGU nem permissão de entidade para sistemas fechados. Também não presumiu a existência de API interna ou exportação de painel. Os painéis do Power BI, o catálogo MEC/Ollinda, a ficha dinâmica PAB e algumas rotas públicas apresentaram carregamento incompleto, requisito de JavaScript/cookies ou rejeição de requisição no ambiente de pesquisa. Essas ocorrências são registradas como limitações de acesso e não como ausência de dados na fonte.

## Referências

[1]: [Plataforma Antonieta de Barros — área de dados](https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados)
[2]: [Programa Dinheiro Direto na Escola (PDDE) — Plataforma Antonieta de Barros](https://www.fnde.gov.br/plataforma-antonieta-de-barros/programas-e-acoes/programas/visualizar/4)
[3]: [BB Gestão Ágil — Banco do Brasil](https://www.bb.com.br/site/setor-publico/bb-gestao-agil/)
[4]: [Monitore o PDDE — FNDE](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/monitore-o-pdde-1)
[5]: [Comunicado nº 28/2024 — categorização de despesas do PDDE no BB Gestão Ágil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/media-pdde/area-para-gestores/bb-gestao-agil/Comunicadon.28_2024PublicaodaPortarian548de2dejulhode2024.ContribuiesCOMDE.pdf)
[6]: [SiGPC Acesso Público — FNDE](https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-acesso-publico)
[7]: [SiGPC Contas Online — FNDE](https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-contas-online)
[8]: [Dados Abertos — FNDE](https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos)
[9]: [PDDEWeb — FNDE](https://www.gov.br/fnde/pt-br/assuntos/sistemas/pddeweb)
[10]: [Serviço de cadastro/atualização no PDDEWeb — Gov.br](https://www.gov.br/pt-br/servicos/realizar-cadastro-ou-atualizacao-cadastral-das-unidades-executoras-proprias-uex-e-a-confirmacao-do-termo-de-adesao-das-entidades-executoras-eex-no-sistema-pddeweb-para-participacao-no-pdde)
[11]: [API de Dados — Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados)
[12]: [Passo a passo: Portal da Transparência — FNDE](https://www.gov.br/fnde/pt-br/acesso-a-informacao/transparencia-e-prestacao-de-contas/portal-da-transparencia)
[13]: [Transferegov.br — Portal institucional](https://portal.transferegov.sistema.gov.br/)
