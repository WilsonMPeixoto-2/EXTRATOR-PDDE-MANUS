# Project TODO

- [x] Incorporar no servidor a lista-mestre de 163 INEPs da 4ª CRE e validar contagem e unicidade antes de cada execução.
- [x] Implementar consulta individual ao PDDEInfo por INEP em lotes, com pausa configurável, retentativas e registro de falhas.
- [x] Implementar vinculação bancária estrita por INEP e rótulo exato de Programa/Ação, sem preencher PDDE Básico com contas de outros programas.
- [x] Implementar painel de controle em tempo real com progresso por lote, indicadores de cobertura e log cronológico de eventos.
- [x] Gerar Excel com as abas exatas "Financeiro 4ª CRE V2" e "Validação V2", quatro linhas de cabeçalho e preservação de texto/datas.
- [x] Bloquear downloads até que as validações de regressão de INEPs, parcelas e contas não informadas sejam aprovadas.
- [x] Registrar na aba de auditoria URL, data/hora, status, programa bancário e exceções por escola.
- [x] Disponibilizar download direto e cópia persistente do Excel aprovado.
- [x] Criar interface desktop-first, responsiva, sofisticada e acessível para operação da 4ª CRE.
- [x] Criar testes automatizados para regras de vínculo bancário, lista-mestre, validações de regressão e liberação de download.
- [x] Validar visualmente a interface e executar os testes antes da entrega.
- [x] Explicitar que a trilha de auditoria por unidade integra a aba obrigatória "Validação V2", sem criar uma terceira aba.
- [x] Disponibilizar botões distintos para download direto do Excel da sessão e abertura da cópia persistente aprovada.
- [x] Cobrir em teste automatizado a liberação do download apenas quando a validação for aprovada.
