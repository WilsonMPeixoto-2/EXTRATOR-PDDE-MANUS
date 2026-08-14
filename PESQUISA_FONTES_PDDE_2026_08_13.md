# Pesquisa de fontes oficiais do PDDE — 13 de agosto de 2026

## Evidência inicial: Plataforma Antonieta de Barros

A página oficial da Plataforma Antonieta de Barros se identifica como a Plataforma de Governança de Dados do FNDE e apresenta, na área de dados, três famílias de serviços: produtos de dados, tabela de repasses e painéis gerenciais. A página de programas confirma que o **Programa Dinheiro Direto na Escola (PDDE)** possui **19 produtos de dados relacionados**.

Na inspeção inicial da ficha pública do PDDE, a lista detalhada de produtos permaneceu em carregamento no navegador. Isso confirma que a relação é carregada dinamicamente e exige investigação técnica adicional da rota pública que entrega os metadados. Nenhum produto, endpoint ou campo foi presumido a partir dessa tela inicial.

| Item observado | Evidência oficial | Situação para a integração |
|---|---|---|
| Plataforma Antonieta de Barros | Apresenta-se como Plataforma de Governança de Dados do FNDE. | Fonte institucional confirmada. |
| Área de dados | Oferece produtos de dados, tabela de repasses e painéis gerenciais. | Potencial de aquisição estruturada; ainda requer validação por produto. |
| Programa PDDE | Página oficial informa 19 produtos de dados relacionados. | Prioridade alta para enumeração, leitura de dicionários e teste de exportação. |
| Detalhe do PDDE | Relação detalhada carregada dinamicamente na interface. | Não há enumeração confirmada; investigar somente rotas públicas permitidas. |

## Evidência inicial: painéis públicos do PDDE

Foi localizado um painel público do Power BI divulgado para PDDE Básico e Ações Integradas. A abertura direta no ambiente de pesquisa permaneceu na tela de carregamento e não expôs filtros, campos ou opção de exportação em duas verificações. Assim, o painel é confirmado como instrumento público de visualização, mas **não** como API, nem como rota de coleta em lote. A pesquisa continuará pela documentação oficial e por opções de exportação explicitamente disponibilizadas.

## Evidências iniciais das demais fontes

| Fonte | O que foi confirmado por fonte oficial | Limite ou requisito identificado | Papel técnico preliminar |
|---|---|---|---|
| BB Gestão Ágil | O Banco do Brasil descreve a solução como ambiente para recursos creditados, gastos, aplicações e documentos de despesa. O FNDE mantém material específico de PDDE e portaria de categorização de despesas. | A documentação pública comprova o uso como ferramenta de execução/prestação de contas, mas não comprovou endpoint ou arquivo público estruturado de transações PDDE. | Alta prioridade de descoberta; não habilitar integração automática sem canal público ou autorizado. |
| SiGPC Acesso Público | Consulta sem cadastro, com filtros por tipo de OPC, vigência, programa, UF e município; também prevê consulta de situação de UEx. | A página institucional não promete extrato, despesa ou documento operacional por escola. | Fonte pública viável para situação de prestação de contas e regularidade. |
| SiGPC Contas Online | A documentação e tutorial mostram transferências, contas correntes/aplicações, documentos, pagamentos, extratos, restituições e saldo reprogramado. | O acesso requer Gov.br e perfil autorizado da entidade; o tutorial mostra operações protegidas no ambiente logado. | Fonte documental de análise aprofundada, somente mediante acesso institucional autorizado; nunca como coleta pública diária. |
| PDDEWeb | Fonte de cadastro e atualização de UEx/EEx, relacionada à aptidão para receber recursos. | O serviço oficial requer acesso Gov.br e perfil de entidade; a página institucional ainda registra limitação histórica de navegador. | Fonte cadastral complementar, não fonte de repasses ou movimentações. |
| Dados Abertos FNDE / Olinda | O FNDE declara disponibilar execução financeira do PDDE, relação de escolas atendidas, saldos de contas e situação de regularidade das prestações de contas. | O catálogo MEC exigiu JavaScript/cookies na verificação; o portal Olinda não expôs o catálogo no ambiente de pesquisa. Ainda faltam nome, atualização, dicionário e resposta de cada recurso. | Forte candidato a controle secundário e análise em lote, condicionado a teste de cada conjunto publicado. |
| Portal da Transparência | A CGU oferece consultas, downloads e API REST documentada; o FNDE indica consulta de recursos transferidos e acesso a seus dados no Portal. | A API exige cadastro/token e possui limite de requisições. Os endpoints documentados devem ser avaliados quanto à granularidade efetiva para o PDDE. | Contraprova externa por transferência/favorecido; não substitui dados por conta ou execução escolar. |
| SIMEC | A abertura pública exigiu JavaScript/cookies e não expôs conjunto específico do PDDE na verificação. | Não há evidência de dataset PDDE escolar público ou exportação adequada. | Baixa prioridade; avaliar somente por módulo e caso de uso específico. |
| Transferegov | É plataforma centralizada de transferências e parcerias da União, com modalidades fundo a fundo, discricionárias e legais. | Não foi demonstrada cobertura direta de transferências automáticas PDDE por escola/UEx. | Fonte eventual para instrumentos específicos, não núcleo da coleta PDDE. |

## Evidência audiovisual complementar

O tutorial oficial do SiGPC Contas Online sobre contas correntes e aplicações mostrou que o ambiente exibe CNPJ, entidade, programa, ano, situação, município/UF, banco, agência, conta e vínculo de aplicação. O material também afirmou que contas específicas creditadas pelo FNDE aparecem automaticamente e que o extrato bancário é documento de análise. Como o tutorial ocorre em ambiente autenticado e mostra ações de gravar, alterar e excluir restritas ao operador, ele não fundamenta uma coleta pública; fundamenta somente uma futura integração por acesso institucional expressamente autorizado.

## Teste técnico registrado

Em 14 de agosto de 2026, a abertura direta do endereço público informado pelo FNDE para o SiGPC Acesso Público retornou **“Request Rejected”** no ambiente de pesquisa. A página institucional do FNDE continua descrevendo o módulo como consulta sem cadastro. Portanto, o resultado deve ser tratado como bloqueio ou política de acesso do ambiente/rota, não como prova de inexistência de dados. A fonte permanece classificada como **possível, porém não comprovada operacionalmente neste ambiente**, até teste por canal permitido que consiga carregar a consulta.

Em 14 de agosto de 2026, a página institucional do BB Gestão Ágil confirmou que a solução mantém recursos creditados, gastos, aplicações, documentos, categorização e extratos online. A busca pública localizou o endereço `https://autoatendimento.bb.com.br/apf-apj-gfa/`, referido como ambiente de extrato/prestação de contas. A abertura no ambiente de pesquisa exibiu apenas uma tela sem conteúdo interativo nem parâmetros públicos de consulta. Esse resultado não autoriza concluir que os extratos sejam públicos por CNPJ ou conta; para a arquitetura, a classificação permanece **acesso não comprovado e possivelmente autenticado**, até existir documentação do fluxo público ou acesso institucional autorizado.

## Referências iniciais

- https://www.fnde.gov.br/plataforma-antonieta-de-barros/
- https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados
- https://www.fnde.gov.br/plataforma-antonieta-de-barros/programas-e-acoes/programas/visualizar/4
