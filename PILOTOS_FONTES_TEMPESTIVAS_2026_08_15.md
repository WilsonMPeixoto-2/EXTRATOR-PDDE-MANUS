# Pilotos práticos de fontes financeiras mais tempestivas

**Início dos testes:** 15/08/2026  
**Objetivo:** verificar, por acesso técnico real e evidência preservada, quais canais oficiais podem fornecer ao Extrator dados PDDE mais atuais que o SIGEF público.

## Evidências iniciais de acesso

| Fonte | Teste realizado | Resultado observável | Situação provisória |
|---|---|---|---|
| API de Extratos BB | Abertura da página oficial do produto no ambiente de navegação. | O portal retornou página de bloqueio de acesso por política de segurança do BB; não houve tentativa de contorno. | A documentação pública confirma o produto, mas a execução de API depende de cadastro, credenciais e autorização bancária. |
| API de Fundos BB | Leitura direta da página oficial do produto. | A página confirma consulta de saldo aplicado, aplicações e resgates para cliente PJ cotista; requer cadastro Developers e termo de adesão específico. | Viabilidade técnica condicionada à titularidade/autorização de cada UEx ou a arranjo institucional formal. |
| Segurança das APIs BB | Leitura da documentação oficial de segurança. | O BB declara OAuth 2.0 nos fluxos Client Credentials e Authorization Code, e informa que algumas APIs exigem mTLS. | Não é integração pública anônima; requer aplicação cadastrada, escopo e credenciais autorizadas. |
| Consulta SIGEF de extrato | Abertura da rota pública oficial de extrato no ambiente de navegação. | O servidor FNDE excedeu o tempo de resposta neste teste. | A indisponibilidade é registrada como limitação de acesso do momento; não autoriza inferência sobre Webservice autenticado. |
| Plataforma Antonieta de Barros | Navegação pública até “Dados → Produtos de dados”. | A plataforma está acessível, declara estar em desenvolvimento e expõe catálogo de produtos de dados; a abertura da visualização entrou em carregamento sem apresentar produto ou arquivo no tempo da sessão. | Há canal público concreto a testar, mas nenhum produto PDDE transacional foi confirmado nesta primeira navegação. |

## Catálogo público Antonieta: resultado reproduzível

A abertura direta da rota pública `dados/produtos-de-dados/visualizar` retornou 57 produtos. Entre eles, o produto **“Consulta Prestação de Contas do PDDE”** informa atualização no primeiro dia útil do mês corrente e disponibiliza a situação de prestação de contas de UEx e EEx. Portanto, o catálogo é fonte pública operacional e estruturada para acompanhamento da regularidade, mas esse produto não é extrato transacional nem solução para o atraso de movimentos bancários. A investigação seguirá para o detalhe, o artefato de download e a busca por produto de transações ou por referência a BB Gestão Ágil/PDDE.

O detalhe público do produto confirmou o artefato `exports/PDDE/PDDE_Prestacao_conta_SIGPC.txt.gz`, com última atualização e publicação exibidas como **07/05/2026**. A descrição declara atualização no primeiro dia útil do mês corrente, mas o metadado retornado está mais antigo que a data da consulta. Assim, o produto é um piloto real de arquivo estruturado do FNDE, útil para status de prestação de contas, porém não é tempestivo para movimentos bancários e sua atualidade deverá ser exibida como evidência independente caso seja integrado. [1]

O botão público “Exportar artefato” foi acionado no produto 59. A página não confirmou visualmente a conclusão do download, de modo que o próximo passo é verificar o diretório de downloads e, se o arquivo tiver sido entregue, medir cabeçalhos, tamanho, chaves e cobertura da 4ª CRE sem modificar o conteúdo original.

## Precedente institucional BB Gestão Ágil

Foi confirmado em página oficial do Ministério do Esporte que o órgão celebrou o ACT nº 28/2026 com o Banco do Brasil para utilização do BB Gestão Ágil, descrevendo acompanhamento em tempo real da execução financeira e conciliação bancária automática. [2] A página oficial do BB informa que a solução reúne recursos creditados, gastos, aplicações, documentos e contas de um beneficiário, utiliza APIs e se destina também a órgãos municipais de fiscalização e controle. [3] Isso confirma que o modelo de gestão centralizada é tecnicamente e institucionalmente usado. A evidência não demonstra, por si só, que a SME-Rio, uma CRE ou a CGM-Rio estejam automaticamente habilitadas; essa hipótese continua dependente de interlocução formal e de instrumento próprio.

## Piloto CGU — recursos transferidos de julho de 2026

O arquivo oficial público `202607_Transferencias.zip` foi baixado diretamente pela rota de recursos transferidos da CGU, com 2.480.385 bytes compactados e um CSV de 82.971.777 bytes. [4] Foram lidos **100.995 registros**, usando o cabeçalho oficial em Latin-1 e comparação determinística do campo **CÓDIGO FAVORECIDO** com os 163 CNPJs de UEx preservados na execução PDDEInfo aprovada `14fe09f3-a1cb-4ff7-bb05-fc1089849f72`.

O piloto encontrou uma transferência FNDE/PDDE diretamente vinculável: **INEP 33144710**, CNPJ **12.219.144/0001-12**, Conselho Escola Comunidade da Creche Municipal Ari Pimentel, órgão SIAFI **26298 — Fundo Nacional de Desenvolvimento da Educação**, ação **0515 — Dinheiro Direto na Escola para a Educação Básica**, no valor de **R$ 2.015,00**, referência 202607. O vínculo não é inferido por nome: decorre da igualdade de CNPJ normalizado.

No mesmo recorte mensal, 162 das 163 UEx não tiveram registro compatível. Isso não significa ausência de recebimento no ano; demonstra apenas que o arquivo é uma fonte de **transferências federais registradas naquele mês**, e não um extrato bancário. O piloto comprova viabilidade técnica de uma fonte complementar de liberações/transferências, com defasagem observada inferior ao SIGEF público, mas não de movimentos de conta, pagamentos ou saldo.

## Piloto CGU ampliado — janeiro a julho de 2026

O mesmo procedimento foi executado nos sete arquivos mensais de 2026 disponíveis na rota oficial de download da CGU. Foram processados **1.014.771 registros**. Aplicando o vínculo determinístico CNPJ UEx ↔ Código Favorecido, mais a regra de identificação do FNDE (SIAFI 26298/nome do órgão) e do PDDE (ação 0515/nome da ação), o resultado foi de **97 registros de transferências PDDE para 95 UEx distintas**, equivalente a **58,28%** da lista de 163 UEx.

| Mês de referência | Registros lidos | UEx com transferência PDDE identificada |
|---|---:|---:|
| 2026-01 | 122.527 | 0 |
| 2026-02 | 106.663 | 0 |
| 2026-03 | 119.844 | 0 |
| 2026-04 | 180.835 | 57 |
| 2026-05 | 241.393 | 39 |
| 2026-06 | 142.514 | 0 |
| 2026-07 | 100.995 | 1 |
| **Total** | **1.014.771** | **95 UEx distintas** |

O resultado comprova uma integração útil e automatizável para **liberações do PDDE**: ela preserva CNPJ, nome do favorecido, órgão, ação, mês de referência e valor transferido. Ela não confirma crédito bancário, saldo, débito, pagamento, aplicação ou prestação de contas. A disponibilidade observada em 15/08/2026 alcançava julho de 2026; portanto, apresentou atraso de aproximadamente duas semanas, embora a própria fonte deva continuar sendo tratada como evidência datada e não como tempo real.

## Teste técnico do canal BB autorizado

O endpoint público de descoberta OAuth do Banco do Brasil respondeu e confirmou os fluxos `authorization_code`, `refresh_token` e `client_credentials`, os escopos `accounts` e `resources`, suporte a autenticação mTLS e tokens vinculados a certificado. [5] A documentação de Authorization Code confirma que o consumo de dados de conta exige aplicação cadastrada, `client_id`, `client_secret`, URL de retorno e consentimento explícito do titular. [6] Logo, a integração é tecnicamente viável, mas **não é acessível com consulta pública por CNPJ** e nenhum teste com contas das UEx foi ou será realizado sem instrumento/autorização institucional própria.

Uma chamada sem credenciais ao `token_endpoint` público não devolveu dados financeiros nem token; a borda do BB respondeu uma página de segurança em vez de expor a API. Esse resultado é coerente com a exigência documental de aplicação identificada e não representa falha da fonte. Ele reforça que a próxima prova de integração só poderá ocorrer após cadastro institucional e credenciais válidas, jamais por tentativa de acesso às contas das UEx.

## Verificação do catálogo Antonieta de Barros

O catálogo público da plataforma respondeu com **57 produtos** e expôs o produto PDDE de prestação de contas (ID 59), mas não exibiu, na primeira página, um produto PDDE de transações. A busca pública pelo termo “Extrato” entrou em carregamento e não retornou resultado no período do teste, por isso não é possível afirmar com base nesse acesso que o produto ETI citado no material esteja atualmente catalogado ou que tenha equivalente para PDDE.

O fato confirmado é mais limitado: a plataforma aceita e distribui artefatos estruturados por produto, enquanto o produto PDDE identificado se restringe à situação de prestação de contas. A possibilidade de existir um extrato transacional publicado para ETI — e a eventual publicação futura do correspondente PDDE — permanece uma linha de apuração, não uma fonte disponível para a ferramenta neste momento.

## Descoberta do Webservice SIGEF

A pesquisa oficial localizou a página do FNDE intitulada **Consultar Saldo Conta Corrente** no caminho de Webservice indicado em [7]. O resultado indexado informa os campos usuário, senha, CNPJ, processo, banco, agência, conta, programa FNDE e mês/ano, o que confirma a existência de uma camada autenticada distinta da consulta pública atual.

O acesso direto por navegador foi rejeitado pela camada de segurança do FNDE antes da renderização do formulário. Por isso, não houve chamada de serviço, nem tentativa de senha, nem dado financeiro lido. A descoberta sustenta uma investigação institucional dirigida ao FNDE sobre credenciamento, finalidade admitida, documentação e atualização da base; ela ainda não demonstra que o Webservice tenha maior atualidade que o SIGEF público ou que esteja disponível à SME-Rio.

## Regra de continuidade

Cada piloto será classificado somente após demonstrar: origem oficial, acesso tecnicamente reproduzível, ao menos uma resposta de dados reais ou uma negativa autenticada inequívoca, campos retornados, chave de associação com CNPJ/INEP e data máxima observada. Nenhum dado de fonte nova será incorporado ao Excel ou usado para preencher conta, crédito, saldo ou movimentação sem esse conjunto de evidências.

## Classificação operacional após os testes

| Fonte | Resultado prático | Dados demonstrados | Atualidade observada | Situação para o sistema |
|---|---|---|---|---|
| **CGU — Recursos Transferidos** | **Comprovada** | 97 registros PDDE do FNDE ligados por CNPJ a 95 UEx; mês, órgão, ação e valor. | Arquivos até 2026-07 consultados em 15/08/2026. | **Prioridade de integração** como evidência complementar de transferência, nunca como extrato. |
| **SIGEF público** | Comprovada, com limitação | Movimentações bancárias e aplicações na conta consultada. | Conteúdo retornado até 03/05/2026 nas 20 evidências já preservadas. | Manter como fonte pública histórica e rastreável. |
| **BB Gestão Ágil** | Viabilidade institucional comprovada; dados da 4ª CRE não acessados | Produto BB declara créditos, gastos, aplicações e extratos online; órgãos municipais de controle constam como público elegível. [3] | A solução se apresenta como disponível a qualquer momento; não houve acesso com conta UEx. | **Prioridade de articulação institucional**, sem ingerir credenciais individuais. |
| **API Extratos/Fundos BB** | Infraestrutura OAuth comprovada; leitura financeira não testada | Fluxos OAuth e escopos de conta; exige aplicação e consentimento/autorização. [5] [6] | Potencial online, não medido nesta pesquisa. | Condicionada a cadastro e autorização institucional/titular. |
| **Webservice SIGEF** | Existência e autenticação confirmadas; resposta financeira não obtida | Campos de saldo/conta descritos na página indexada. [7] | Desconhecida. | Solicitar credenciamento, documentação e periodicidade ao FNDE. |
| **Antonieta de Barros** | Catálogo e produto PDDE confirmados; transações PDDE não confirmadas | Prestação de contas e artefato estruturado. [1] | Metadado do produto PDDE: 07/05/2026. | Usar somente para regularidade quando o artefato for validado; não resolve o extrato. |

> **Conclusão operacional:** já existe uma fonte pública que a ferramenta pode explorar imediatamente e de forma auditável para reduzir a lacuna de transferências — os arquivos mensais da CGU. Para movimentos, saldos e aplicações próximos do tempo real, há uma rota institucional concreta no BB Gestão Ágil, mas ela exige habilitação formal; não há caminho público legítimo equivalente.

## Próximas implementações autorizáveis

O passo técnico recomendado é desenvolver o adaptador CGU como frente complementar não bloqueante: ele baixará o arquivo mensal publicado, preservará o original e seu hash, filtrará apenas CNPJs UEx confirmados e registrará mês de referência, órgão, ação e valor. A execução deve recusar qualquer interpretação de “transferência” como “crédito bancário confirmado”.

Em paralelo, a SME-Rio/CGM-Rio pode realizar consulta institucional ao Banco do Brasil sobre ingresso no BB Gestão Ágil ou em canal de API para órgão municipal de fiscalização. A mensagem deverá pedir apenas elegibilidade, fluxo de adesão, modelo de autorização e documentação — sem enviar credenciais, senhas ou dados bancários de UEx. Ao FNDE, a consulta deve solicitar credenciamento e periodicidade do Webservice SIGEF, além de confirmar se usa base mais atual que a consulta pública.

## Referências

[1]: https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/59 "Plataforma Antonieta de Barros — Consulta Prestação de Contas do PDDE"
[2]: https://www.gov.br/esporte/pt-br/composicao/orgao-colegiado-/comissao-permanente-de-regulamentacao-e-monitoramento/bb-gestao-agil "Ministério do Esporte — BB Gestão Ágil"
[3]: https://www.bb.com.br/site/setor-publico/bb-gestao-agil/ "Banco do Brasil — BB Gestão Ágil"
[4]: https://portaldatransparencia.gov.br/download-de-dados/transferencias "Portal da Transparência — Recursos Transferidos"
[5]: https://oauth.bb.com.br/oauth/.well-known/openid-configuration "Banco do Brasil — OpenID Connect Discovery"
[6]: https://apoio.developers.bb.com.br/guias-e-tutoriais/seguranca/authorization-code "Banco do Brasil Developers — Authorization Code"
[7]: https://www.fnde.gov.br/webservices/sigef/teste/ocorrencia-doc/consultar-saldo-conta-corrente "FNDE — Webservice SIGEF: Consultar Saldo Conta Corrente"
