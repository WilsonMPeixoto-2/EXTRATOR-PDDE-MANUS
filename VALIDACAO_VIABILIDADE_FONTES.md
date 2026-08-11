# Evidências de Viabilidade das Fontes Oficiais

Consulta realizada em 11/08/2026, para a matriz de viabilidade técnica da 4ª CRE.

| Fonte | Evidência observada | Implicação técnica |
|---|---|---|
| Página **Consultas Online** do FNDE | A página oficial lista, lado a lado, Liberação de Recursos, Conta Corrente, Movimentação Bancária (Extratos) e Consulta Escola — PDDE. | Confirma que as fontes propostas pertencem ao ecossistema oficial de consultas do FNDE. |
| SIGEF — Liberações | A tela pública expõe os filtros Ano, Programa, CNPJ, UF, Município e Tipo de Entidade; a própria página mostra a orientação “Preencha o captcha”. | A consulta é navegável e a chave CNPJ está disponível, mas a automação operacional deve tratar CAPTCHA e ser precedida de piloto de acesso. |
| Dados Abertos do FNDE | A página oficial informa que há dados de execução financeira do PDDE, escolas atendidas, saldos de contas e situação de regularidade de prestação de contas. | A fonte pode funcionar como controle secundário em lote, condicionada à validação do arquivo, exercício, atualização e completude. |
| SIGEF — Conta Corrente | A interface pública é navegável e aceita CNPJ, número/ano de convênio, UF, município e tipo de busca. | A consulta tem chave CNPJ e pode apoiar a localização de contas; ainda requer piloto para confirmar o formato de resultado e a consulta em escala. |
| SIGEF — Movimentação Bancária | A interface pública apresenta filtros de ano, programa e intervalo de meses. | Há uma rota navegável para extratos; a chave de associação, a disponibilidade de 2026, a defasagem e a paginação precisam ser comprovadas em piloto controlado. |

Fontes: <https://www.gov.br/fnde/pt-br/consultas-online>, <https://www.fnde.gov.br/sigefweb/index.php/liberacoes>, <https://www.fnde.gov.br/sigefweb/pesquisa-conta>, <https://www.fnde.gov.br/sigefweb/index.php/extratos> e <https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos>.
