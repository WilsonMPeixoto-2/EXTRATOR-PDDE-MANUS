# Fontes institucionais para localizar as 47 contas básicas ausentes

**Data:** 15/08/2026  
**Lacuna:** 47 UEx da 4ª CRE sem número de conta de PDDE Básico informado na execução PDDEInfo aprovada de 14/08/2026.

## Resultado objetivo

> Há duas fontes institucionais com potencial real de revelar a conta sem que ela seja conhecida previamente. Uma é pública, mas bloqueada por CAPTCHA; a outra é institucional, requer habilitação formal e é a rota mais completa para uma solução duradoura.

| Fonte | Pesquisa inicial por CNPJ/INEP | Revela banco, agência e conta | Situação prática | Classificação |
|---|---|---:|---|---|
| [SIGEF — Pesquisa Conta Corrente](https://www.fnde.gov.br/sigefweb/pesquisa-conta) | **Sim: CNPJ**, convênio, UF e município | Destinação da consulta | A página foi aberta e o formulário confirmou campo de CNPJ sem campo obrigatório de conta; a submissão usa `g-recaptcha-response`. | **Potencial direto, bloqueado para automação sem atendimento humano do CAPTCHA.** |
| [BB Gestão Ágil](https://bb.com.br/site/setor-publico/bb-gestao-agil/) | Mediante perfil institucional/autorização | **Sim**, pois o BB declara reunir todas as contas relativas a um beneficiário e disponibilizar extratos de créditos, débitos e aplicações. | Requer credenciamento e permissão de órgão gestor, de fiscalização/controle ou beneficiário. | **Rota prioritária institucional.** |
| BB Digital / Gerenciador Financeiro da UEx | Mediante credencial da UEx | **Sim** | Acesso restrito ao titular/autorizado da conta; não é uma fonte centralizada e pública para o sistema. | **Válida por UEx, não escalável sem autorização.** |
| PDDEInfo — Consulta Escola | INEP/CNPJ | Apenas quando a linha bancária é publicada | Já esgotada pela execução 163/163; deixou 47 lacunas de PDDE Básico. | **Fonte primária, insuficiente para a lacuna.** |
| SIGEF — `visualizaexcel` / extrato público | Não: exige banco, agência e conta na rota | Sim, para a conta já identificada | Não pode descobrir conta desconhecida; só confirma uma identidade bancária já obtida. | **Confirmação, não descoberta.** |
| SIMAD/FNDE — Liberações | CNPJ e filtros de repasse | Não confirmado; tela é de liberações | Útil para datas e valores de repasse, não para resolver conta ausente. | **Não serve para a lacuna bancária.** |
| Portal da Transparência/CGU e dados abertos | CNPJ de favorecido | Não | Confirmam transferências públicas; não expõem a conta bancária da UEx. | **Não serve para a lacuna bancária.** |

## Leitura correta do SIGEF

O SIGEF possui, de fato, uma rota pública de **Pesquisa Conta Corrente** que aceita CNPJ sem exigir banco, agência ou conta na tela inicial. Portanto, ela é a primeira alternativa técnica para as 47 lacunas. No teste de interface, a página contém reCAPTCHA antes da submissão; por isso não é possível transformá-la em importação automática sem uma via autorizada do FNDE. A restrição não significa que o SIGEF não possua os números: significa que a consulta pública que os descobre exige validação humana.

O extrato público usado pelo projeto é diferente. Ele recebe a identidade bancária já conhecida e retorna movimentações e a confirmação daquela conta. Ele não é um catálogo de contas por CNPJ.

## Caminho recomendado

O caminho institucional de maior utilidade é verificar o credenciamento da SME-Rio/4ª CRE como órgão gestor ou de controle no **BB Gestão Ágil**. O BB informa que a solução se destina também a órgãos de fiscalização e controle federais, estaduais e municipais, reúne as contas de um beneficiário e oferece extratos online. Uma vez autorizada, a integração deve importar somente CNPJ, programa, banco, agência, conta, data/hora e artefato de evidência, mantendo o PDDEInfo como fonte primária e rotulando a nova fonte como complementar.

Como alternativa pontual, a Pesquisa Conta Corrente do SIGEF pode localizar as 47 contas a partir de seus CNPJs mediante resolução legítima do CAPTCHA em cada consulta. O resultado deve ser preservado com URL, data, CNPJ e identificação do programa antes de preencher qualquer campo ausente.

## Referências

[1]: https://www.fnde.gov.br/sigefweb/pesquisa-conta "SIGEF — Pesquisa Conta Corrente"
[2]: https://bb.com.br/site/setor-publico/bb-gestao-agil/ "Banco do Brasil — Gestão Ágil"
[3]: https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/media-pdde/relacionamento-com-a-agencia/guia-de-relacionamento-com-o-banco-do-brasil-pdde-versao-2022-01-11-2022-arquivo-pdf.pdf "FNDE — Guia de Relacionamento com o Banco do Brasil"
[4]: https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar "PDDEInfo — Consulta por Escola"
