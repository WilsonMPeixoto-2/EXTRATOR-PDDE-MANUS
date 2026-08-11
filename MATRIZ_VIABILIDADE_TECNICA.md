# Matriz de Viabilidade Técnica — Sistema de Conciliação PDDE

## Resposta objetiva

**Sim, é tecnicamente viável criar a aplicação.** Já há capacidade demonstrada para consultar páginas públicas, navegar em portais, interpretar HTML, normalizar registros, gerar Excel, persistir evidências e operar um banco de dados de auditoria. O ponto que não deve ser confundido com capacidade técnica é **permissão e estabilidade de acesso**: algumas telas públicas do SIGEF exigem CAPTCHA ou podem sofrer alteração de estrutura, o que impede tratá-las como uma API livre e estável sem um piloto e, se necessário, uma solução autorizada pelo FNDE.

> O projeto deve ser construído para registrar tanto os dados encontrados quanto a limitação encontrada. Uma consulta bloqueada por CAPTCHA é uma **consulta inconclusiva**, não uma evidência de ausência de pagamento.

## Capacidade por componente

| Componente | Viabilidade técnica | Situação atual | Limite ou dependência |
|---|---|---|---|
| Consulta PDDEInfo por INEP | **Comprovada** | O aplicativo já consulta as 163 escolas, trata ISO-8859-1, aplica retentativas e usa vínculo bancário estrito. | A estrutura pública pode mudar; fixtures e monitoramento de regressão continuam necessários. |
| Parser, normalização e validações | **Comprovada e em evolução** | Há parser HTML, validações bloqueantes e testes automatizados. O contrato de proveniência por campo e hashes foi iniciado. | Precisamos completar catálogo de destinações, invariantes aritméticas e fixtures reais. |
| Excel no modelo V2 | **Comprovada** | As abas, formatos de conta como texto e gates de liberação já existem. | Deve receber os novos campos de fonte, estado de evidência e conciliação. |
| Histórico, banco e evidências | **Viável; núcleo implementado** | Banco MySQL, tabelas append-only de eventos/observações e armazenamento de artefatos estão disponíveis. | A execução persistida deve ser testada ponta a ponta com HTML/JSON reais antes de uso institucional. |
| SIGEF — Liberação de Recursos | **Navegável; integração condicionada a piloto** | A consulta é pública, usa filtros de ano, programa e CNPJ, e uma rota de resultado já mostrou campos financeiros e bancários em validação preliminar. | A interface atual orienta preenchimento de CAPTCHA. Não é aceitável automatizar ou contornar CAPTCHA; é preciso validar rota autorizada, fluxo manual assistido ou canal institucional. [1] |
| SIGEF — Conta Corrente | **Navegável; integração condicionada a piloto** | A tela pública recebe CNPJ, UF, município e dados de convênio. | Devem ser testados resultado, cobertura 2026, paginação e estabilidade antes do uso em lote. [2] |
| SIGEF — Movimentação Bancária | **Navegável; integração condicionada a piloto** | A tela pública apresenta filtros por ano, programa e meses. | É necessário comprovar qual chave permite chegar à conta da UEx, a defasagem da carga, os lançamentos de estorno e o comportamento da consulta em escala. [3] |
| Dados Abertos FNDE | **Viável como controle secundário** | O FNDE informa conjuntos referentes à execução financeira do PDDE, escolas atendidas, saldos e prestação de contas. | Cada arquivo deve ser validado quanto ao exercício, atualização, cobertura e completude; não deve substituir a evidência transacional. [4] |
| Extrato bancário direto do BB | **Tecnicamente possível, mas depende de autorização** | A aplicação pode receber e organizar arquivos autorizados em armazenamento privado. | A coleta requer credenciais, autorização e definição institucional; não deve ser iniciada sem esse arranjo. |

## O que já sabemos e o que ainda precisa ser comprovado

Sabemos construir os componentes necessários: serviço de coleta com retentativas, navegação assistida, parser robusto, armazenamento privado de HTML/JSON, hashes SHA-256, banco relacional, eventos imutáveis, motor de comparação, API do aplicativo, testes automatizados e Excel rastreável. Também sabemos que **CNPJ da UEx**, e não INEP, é a chave operacional predominante para as consultas SIGEF observadas.

Ainda não é correto afirmar que todas as fontes podem ser coletadas autonomamente em lote. Precisamos comprovar cobertura de 2026, mapeamento dos códigos de programa, rotas de resultado, limites de consulta, presença de CAPTCHA, defasagem de extratos e capacidade de associar uma ou mais OBs e créditos a uma destinação PDDE. Nenhum desses pontos exige uma tecnologia desconhecida; são requisitos de **validação de acesso e de regra de negócio**.

## Arquitetura tecnológica disponível

| Necessidade | Solução aplicável no projeto |
|---|---|
| Navegação e leitura de portais | Requisições HTTP para páginas públicas quando permitido; navegador controlado para fluxos interativos; operação manual assistida quando houver CAPTCHA. |
| Extração e interpretação | TypeScript, Cheerio, regras explícitas de parsing, Zod para schemas e testes Vitest. |
| Persistência confiável | MySQL/Drizzle para metadados; armazenamento S3 para HTML, JSON, manifestos e planilhas; hashes SHA-256. |
| Conciliação | Motor determinístico por CNPJ, exercício, programa, parcela, OB, valor, data, conta e sinais de estorno. |
| Interface institucional | React, tRPC e autenticação já configurados; telas de execução, dossiê da escola, comparador, evidência e exceções. |
| Operação e governança | Autenticação, eventos append-only, validações bloqueantes, baseline histórica e testes de regressão. |

## Próximo passo seguro: piloto de viabilidade

O piloto deve usar um conjunto pequeno de UEx, selecionado para cobrir: pagamentos com conta no PDDEInfo; as 47 contas PDDE ausentes; mais de uma parcela; e pelo menos um caso sem pagamento registrado. Para cada UEx, o sistema deve tentar a consulta por métodos permitidos, registrar URL, horário, resposta, hash, campos localizados e motivo de eventual falha.

O piloto será considerado aprovado somente se provar, para uma amostra relevante, que a consulta fornece dados utilizáveis de 2026 e permite associação documentada entre CNPJ, programa, valor, data, OB e conta. Caso a rota exija CAPTCHA sem canal autorizado, a aplicação continuará capaz de organizar a evidência, mas a obtenção deverá ser feita por fluxo humano institucional ou por integração oficialmente autorizada.

## Conclusão

Temos as tecnologias e o conhecimento necessários para **construir o sistema completo**. Não temos, e não devemos fingir ter, uma garantia prévia de acesso automatizado a toda consulta SIGEF ou a extratos diretos de banco. Essa diferença é saudável: a aplicação será desenhada para funcionar com fontes públicas permitidas, registrar limitações e incorporar novas integrações somente depois de comprovadas. O caminho técnico correto é avançar agora com o núcleo auditável e um piloto controlado de fontes, sem depender de promessas sobre APIs não documentadas ou sem tentar superar mecanismos de acesso.

## Referências

[1]: https://www.fnde.gov.br/sigefweb/index.php/liberacoes "SIGEF — Liberações"
[2]: https://www.fnde.gov.br/sigefweb/pesquisa-conta "SIGEF — Pesquisa Conta Corrente"
[3]: https://www.fnde.gov.br/sigefweb/index.php/extratos "SIGEF — Movimentação Bancária"
[4]: https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos "FNDE — Dados Abertos"
