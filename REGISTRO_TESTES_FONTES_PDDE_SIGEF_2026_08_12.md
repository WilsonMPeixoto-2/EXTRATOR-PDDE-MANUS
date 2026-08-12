# Registro de testes de fontes externas — SIGEF e PDDE

**Data da rodada:** 12 de agosto de 2026  
**Escopo:** consulta controlada de fontes públicas do SIGEF e de portais oficiais correlatos do FNDE/PDDE, sem tentativa de contornar CAPTCHA, autenticação ou qualquer controle externo.

## Descobertas iniciais

| Fonte | Evidência observada | Estado para teste |
|---|---|---|
| SIGEF — Extrato Conta Corrente | O endpoint público `https://www.fnde.gov.br/sigefweb/default/conta-corrente/extrato-conta-corrente` apresenta campos de período, CNPJ, banco e programa, incluindo o código `02 — Programa Dinheiro Direto na Escola`. | Requer teste de submissão limitada; qualquer CAPTCHA será registrado como bloqueio, sem contorno. |
| Dados Abertos FNDE | A URL histórica do catálogo do FNDE redireciona para a organização do Fundo Nacional de Desenvolvimento da Educação no Portal Brasileiro de Dados Abertos: `https://dados.gov.br/dados/organizacoes/visualizar/fundo-nacional-de-desenvolvimento-da-educacao`. | Requer localizar conjuntos e recursos PDDE individuais no novo catálogo. |

## Limite registrado

As tentativas de consulta direta à API histórica do catálogo do FNDE por HTTP e HTTPS retornaram, respectivamente, resposta vazia e falha de negociação TLS. O redirecionamento institucional para `dados.gov.br` é a rota a ser investigada, sem inferir indisponibilidade definitiva do conjunto de dados.

## Teste SIGEF 1 — preparação de chave pública

Para limitar o teste a uma unidade da lista-mestre, consultou-se o PDDEInfo de 2026 para o INEP `33069247` (EM EMA NEGRÃO DE LIMA). A fonte primária exibiu a UEx `CONSELHO ESCOLA COMUNIDADE DA EM EMA NEGRÃO DE LIMA`, CNPJ `04.500.463/0001-73`, e o pagamento registrado da 1ª parcela do PDDE Básico de R$ 4.185,00 em 05/08/2026. A tabela bancária dessa página contém apenas `PDDE QUALIDADE`; por isso, nenhum dado bancário foi atribuído ao PDDE Básico.

O formulário SIGEF permanece publicamente acessível e apresenta os filtros necessários, mas a renderização de automação não expôs uma tag HTML `form` nem campos manipuláveis no DOM nesta primeira leitura. Isso é uma limitação de estrutura/renderização observada, não uma confirmação de CAPTCHA. A próxima verificação será feita pela rota e pelo comportamento de rede do formulário, mantendo uma única consulta e sem contornar qualquer controle.

## Teste Liberações FNDE 1 — consulta por UEx

A página pública `http://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_01_pc` foi carregada no navegador e confirmou a rota de submissão POST `internet_fnde.liberacoes_03_pc`. Foram confirmados os parâmetros `p_ano`, `p_programa`, `p_cgc`, `p_uf`, `p_municipio` e `p_tp_entidade`; o código do programa PDDE é `02`.

Foi submetida **uma única consulta** com exercício 2026, programa `02 — PDDE` e CNPJ público `04.500.463/0001-73`, usado somente como chave de teste. Após a submissão, o navegador remoto perdeu o contexto e retornou para `about:blank`, sem resultado, mensagem de erro, CAPTCHA ou conteúdo de resposta preservado. Portanto, este teste **não comprovou retorno de dados** e tampouco pode ser classificado como ausência de registros. A rota seguirá como candidata a revalidação por mecanismo de rede permitido, sem repetição em lote.

## Teste PDDEInfo — Consulta de Saldo das Entidades

O relatório público foi localizado em `https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade`. Ele aceita consulta GET por mês, CNPJ e programa; para PDDE Básico, o valor do programa é `02`. O mês mais recente exposto nesta rodada é `06-2026`.

Na primeira submissão pelo formulário, a máscara do campo alterou visualmente o CNPJ de referência de `04.500.463/0001-73` para `45.004.630/0017-30`, e a URL resultante recebeu `cnpj=45004630001730`. O portal respondeu **“Nenhum registro encontrado”**, mas esse retorno não pode ser atribuído à UEx original porque a chave transmitida não corresponde aos seus 14 dígitos originais (`04500463000173`). A verificação seguinte deve usar a URL GET com os dígitos corretos, sem a máscara do formulário.

Com a URL GET usando o CNPJ correto `04500463000173`, mês `06-2026` e programa `02 — PDDE`, o relatório retornou duas contas do PDDE Básico para a mesma UEx: Banco `001`, agência `0249`, contas `0000549789` e `0000142204`. Os campos de saldo de conta, fundos, poupança e RDB/CDB estavam todos em `0,00` na posição do mês 06/2026. Trata-se de **saldo declarado pelo relatório mensal**, e não de confirmação de crédito bancário ou de saldo atual.

O botão de exportação criou o arquivo `Consultasaldoentidade-saldo-entidade.xls`, porém o download local tinha tamanho zero. Assim, a página HTML/GET é uma fonte estruturada comprovada; a exportação XLS legada permanece **não confiável** e não deve ser usada como mecanismo de coleta.

## Teste SIGEF 2 — rota pública de Extratos

Uma pesquisa adicional identificou as rotas oficiais atuais `https://www.fnde.gov.br/sigefweb/index.php/liberacoes` e `https://www.fnde.gov.br/sigefweb/index.php/extratos`. A página de Liberações informa explicitamente “Preencha o captcha”; ela permanece bloqueada e não será contornada.

Por outro lado, a página pública de Extratos carregou sem CAPTCHA visível e expõe os filtros obrigatórios de ano, programa, mês inicial e mês final. O exercício 2026 foi aceito pelo formulário; o campo de programa depende de carregamento posterior. A consulta continuará apenas se o programa PDDE for disponibilizado no próprio formulário e se a rota retornar resultado público sem controles adicionais.

O carregamento posterior disponibilizou `PDDE (PROGRAMA DINHEIRO DIRETO NA ESCOLA)` com código `02`. Porém, logo após a seleção desse programa, o formulário exibiu reCAPTCHA Enterprise e o botão **Gerar Extrato Bancário**. O controle impede a consulta antes da emissão do extrato. Nenhum mês foi selecionado, nenhum formulário foi enviado e não houve tentativa de resolver, automatizar ou contornar o CAPTCHA. A fonte deve permanecer como `CAPTCHA_REQUIRED`.

## Validação cruzada — segunda unidade

Foi escolhida uma segunda unidade da lista-mestre, INEP `33069093` (EM ALBINO SOUZA CRUZ), para validar a consistência do relatório mensal. A consulta por escola de 2026 informou a UEx de CNPJ `04.552.825/0001-70` e, na tabela de Dados Bancários, conta PDDE `001 / 0249 / 0000549797`, com saldo exibido de R$ 1,11 no momento da consulta por escola. A verificação complementar por CNPJ seguirá usando a posição de 06/2026 e o mesmo código de programa `02`.

O relatório de saldo para `06-2026`, CNPJ `04552825000170` e programa `02` retornou exatamente a conta `001 / 0249 / 0000549797`, confirmando a correspondência de banco, agência, conta e rótulo `PDDE`. No retrato mensal, o valor de R$ 1,11 aparece em `Saldo Fundos`, enquanto a consulta por escola mostra R$ 1,11 no campo agregado `Saldo`. A coincidência de conta e valor, em fontes oficiais do mesmo ecossistema, comprova que a Consulta de Saldo das Entidades é uma fonte complementar útil para contas e composição mensal de saldo, desde que a posição temporal seja preservada.

## Resultado de viabilidade desta rodada

| Fonte | Resultado | Dados novos ou confirmados | Limite para produção |
|---|---|---|---|
| SIGEF — Liberações | CAPTCHA explícito. | Nenhum. | Não integrar sem canal autorizado; não contornar. |
| SIGEF — Extratos | CAPTCHA Enterprise aparece quando PDDE é selecionado. | Catálogo de programa confirmado. | Não integrar sem canal autorizado; não contornar. |
| Consulta Geral de Liberações legada | Formulário e parâmetros identificados, mas resposta não preservada por instabilidade de navegação/TLS. | Código PDDE `02`. | Não habilitar; requer nova evidência de resposta estruturada. |
| PDDEInfo — Consulta de Saldo das Entidades | **Consulta pública comprovada por CNPJ/mês/programa.** | Contas PDDE e quatro componentes de saldo na posição mensal; duas contas básicas reveladas na primeira UEx e correspondência exata validada na segunda. | Mês disponível mais recente é 06/2026; não equivale a saldo atual nem a confirmação de crédito. Exportação XLS legada vazia. |

## Referências oficiais

[1] [PDDEInfo — Consulta por Escola](https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=2026&co_escola=33069093&cnpj=&consultar=Consultar)  
[2] [PDDEInfo — Consulta de Saldo das Entidades](https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade)  
[3] [SIGEF — Liberações](https://www.fnde.gov.br/sigefweb/index.php/liberacoes)  
[4] [SIGEF — Extratos](https://www.fnde.gov.br/sigefweb/index.php/extratos)
