# Análise comparativa das recomendações técnicas externas

**Sistema analisado:** Extrator Financeiro PDDEInfo — 4ª CRE  
**Data:** 15/08/2026  
**Critério adotado:** uma ferramenta nova só é incorporada quando acrescenta evidência, aumenta a confiabilidade auditável ou resolve gargalo tecnicamente demonstrado. A existência de uma biblioteca não é, isoladamente, justificativa para adicioná-la.

## Conclusão executiva

A resposta recebida traz uma premissa adequada: automação de dados públicos pode ser intensa, mas não deve incorporar mecanismos para derrotar CAPTCHA, fingerprinting, proxy rotativo ou serviços de resolução. Essa regra já está alinhada ao sistema. O coletor primário atual usa HTTP direto, limite de três UEx por lote, timeout, retentativa, pausa, hash, armazenamento de HTML/JSON e validação bloqueante; portanto, não há lacuna que justifique substituir o núcleo por um navegador automatizado.

Das recomendações, apenas **fast-check** se mostrou imediatamente aplicável e foi incorporado como dependência de desenvolvimento. A nova propriedade testada confirma, em 300 execuções determinísticas, que a soma em centavos não muda quando os valores são segmentados ou invertidos. A suíte passou de 113 para **114 testes**. As demais propostas têm potencial condicionado a fonte, volume ou requisito ainda inexistente, devendo permanecer fora da árvore de dependências até que uma necessidade concreta seja comprovada.

| Recomendação | Classificação | Decisão para a 4ª CRE |
|---|---|---|
| Browser real, CAPTCHA assistido, Crawlee/Playwright | Condicional | Manter como fallback futuro e jamais para contornar CAPTCHA. Não instalar agora. |
| DuckDB | Condicional de longo prazo | Não instalar; avaliar somente diante de volume analítico comprovado ou Parquet. |
| `unpdf` / `pdf-lib` | Condicional | Não instalar até existir fluxo real de PDF digital ou entrega em PDF. |
| Inngest / Trigger.dev | Adiada | A fila persistida e a infraestrutura de agendamento existente bastam para o estágio atual. |
| Dados Abertos FNDE | Aplicável como investigação | Prosseguir fonte a fonte; não assumir recurso, exercício ou chave de vínculo. |
| API Portal da Transparência | Aplicável, dependente de credencial | Pilotar separadamente após a disponibilidade do token oficial. |
| `p-queue` | Adiada | Os limites atuais de lote, pausa e retentativa são suficientes; reavaliar ao integrar API com rate limit. |
| `fast-check` | Aplicável agora | Instalado e validado em teste de invariantes monetários. |
| OpenTelemetry | Adiada | Priorizar eventos de auditoria existentes; adotar quando houver necessidade de métricas centralizadas. |
| Parser XML | Condicional | Instalar somente após uma resposta SOAP/XML real e autorizada. |

## Avaliação detalhada

### 1. Browser, Crawlee e CAPTCHA

O limite ético e operacional sugerido é correto: um navegador real pode ser usado para páginas públicas dependentes de JavaScript ou para continuar uma sessão depois de uma intervenção humana autorizada; não pode ser programado para falsificar identidade, burlar CAPTCHA ou fabricar aparência humana. O Extrator já registra `CAPTCHA_REQUIRED` como bloqueio explícito e não infere dados ausentes.

No entanto, a recomendação de instalar Crawlee agora não se aplica. A versão atual do pacote agrega módulos de navegador, Playwright, Puppeteer e armazenamento em memória. O projeto não tem fonte atualmente autorizada cujo ganho dependa desse peso adicional. O PDDEInfo funciona por HTTP direto, e o SIGEF permanece em rotas HTTP restritas ou bloqueado por CAPTCHA. Assim, Crawlee/Playwright é um **fallback de piloto**, acionado somente se uma fonte pública legítima exigir JavaScript e a consulta HTTP comprovadamente não for suficiente. [1]

### 2. DuckDB

O DuckDB Node oficial é tecnicamente compatível com Linux x64 e depende de bindings nativos distribuídos junto ao cliente. Ele seria útil para análises locais sobre Parquet ou acervos muito maiores de movimentos. [2] A situação atual, porém, não justifica seu custo de implantação: a referência principal tem 163 UEx, a importação CGU filtra em fluxo e persiste apenas transferências vinculadas, e a decisão probatória continua no reconciliador determinístico e no banco transacional.

O ponto mais importante é arquitetural: DuckDB não deve ser apresentado como "pré-requisito" para conciliação nem como repositório de evidências. Poderá entrar futuramente como módulo analítico isolado, com dataset versionado, se houver uma demanda mensurável por análise histórica ampla, agregações pesadas ou Parquet.

### 3. PDF: `unpdf`, Playwright e `pdf-lib`

O projeto já preserva PDF SIGEF autorizado como artefato e interpreta um texto extraído fornecido ao piloto. Falta, portanto, um extrator PDF integrado; não falta uma biblioteca de geração de relatórios. `unpdf` exige Node 22, requisito atendido no ambiente, mas sua adoção só é indicada após recebermos um PDF digital real, repetível e pertinente à rotina. PDFs escaneados continuariam exigindo rota de OCR e validação própria.

`pdf-lib` é leve e pode manipular documentos, mas não atende hoje a uma necessidade operacional: o produto oficial é o Excel com as duas abas obrigatórias, não um relatório PDF. A geração via navegador também dependeria de Chromium em produção e deve ser avaliada apenas quando houver uma especificação institucional de PDF, incluindo cabeçalho, conteúdo, assinatura e retenção.

### 4. Inngest, Trigger.dev e execução durável

A recomendação reconhece corretamente o valor de checkpoints e retomada. Contudo, ela descreve uma arquitetura diferente, baseada em Supabase, que não se aplica a este projeto: o Extrator usa MySQL/TiDB, Drizzle, `source_import_runs`, eventos imutáveis e execução primária validada. A plataforma já disponibiliza agendamento HTTP persistente com callback autenticado, tentativa idempotente e retentativa de falhas transitórias; não há endpoint de atualização automática habilitado porque a escolha inicial foi atualização assistida por botão. [3]

Inngest ou Trigger.dev seriam alternativas futuras, não correções de defeito atual. Antes de adotá-las seria preciso justificar por que o agendador já disponível, a fila persistida e operações fatiadas não conseguem cumprir o requisito. Além disso, envolveriam novo fornecedor, credenciais e observabilidade duplicada.

### 5. Dados Abertos FNDE e API do Portal da Transparência

Esta é a parte mais promissora da resposta externa. O FNDE declara que os Dados Abertos do PDDE abrangem execução financeira, escolas atendidas, saldos de conta e regularidade de prestação de contas. [4] Ainda assim, a página institucional não comprova, por si só, a disponibilidade de um recurso com cobertura 2026, atualização compatível ou chave de vínculo adequada. O catálogo consultado carregou dinamicamente e não disponibilizou seus recursos no acesso analisado. A decisão correta é continuar a descoberta técnica **recurso a recurso**, preservando URL, artefato, período, hash, cobertura e limitações antes de qualquer integração.

A API do Portal da Transparência é REST e a página oficial informa limites gerais de 400 requisições por minuto na maior parte do dia e 700 entre 0h e 5h59. [5] Ela se aplica como candidato de pesquisa, porém a integração produtiva depende de confirmar endpoint exato, escopo do token, dados devolvidos por CNPJ e taxa específica. O sistema não receberá credencial até que o canal oficial esteja habilitado; por isso não há instalação de cliente, segredo ou adaptador nesta entrega.

### 6. `p-queue`, OpenTelemetry e XML

`p-queue` é ferramenta madura para concorrência e timeout dentro de um processo. [6] Não é uma fila persistente e não resolve retomada entre reinicializações. O núcleo atual já impõe três consultas PDDEInfo por lote, retentativa, espera entre lotes, uma reconsulta isolada e limites menores nos pilotos SIGEF. Ele pode ser incorporado quando a futura API do Portal exigir múltiplos limites por fonte; antes disso duplicaria controles claros e testados.

OpenTelemetry é útil quando há coletor/exportador de métricas e equipe usando traços centralizados para investigar latência, 429 e falhas. Neste estágio, os eventos auditáveis já preservam fonte, URL, tentativas, hash, estado e exceção. Adicioná-lo agora aumentaria custo de instrumentação sem responder a incidente concreto. Parser XML segue o mesmo critério: não deve existir até que um webservice realmente retorne XML/SOAP utilizável e autorizado.

### 7. Testes por propriedades: recomendação aprovada

O fast-check é a recomendação de maior aderência imediata. Sua documentação confirma uso independente ou integração com Vitest. [7] O conector `@fast-check/vitest` atual exige Vitest 4 e foi recusado porque o projeto está em Vitest 2.1.9; a biblioteca `fast-check 4.9.0`, por sua vez, funciona diretamente com a suíte atual e foi instalada como dependência de desenvolvimento.

O primeiro teste gerativo não simula escolas, parcelas ou transferências. Ele gera somente inteiros em centavos e verifica uma propriedade matemática do módulo: `sumCents(valores)` produz o mesmo total após segmentação ou inversão da lista. Essa abordagem fortalece a confiabilidade do código sem gerar fatos financeiros fictícios.

> **Regra preservada:** nenhuma biblioteca nova altera a hierarquia de fontes. PDDEInfo continua a referência de contas, parcelas e pagamentos registrados; CGU, SIGEF, API ou Dados Abertos permanecem complementares e não podem preencher campo primário por inferência.

## Prioridade recomendada

| Ordem | Próxima ação | Gatilho objetivo |
|---:|---|---|
| 1 | Aplicar limites explícitos ao ZIP CGU e preservar o artefato bruto | Antes de qualquer frequência automática de importação. |
| 2 | Piloto da API do Portal da Transparência | Token oficial disponível e endpoint por CNPJ confirmado. |
| 3 | Descoberta de recursos FNDE/Dados Abertos | Recurso com URL, período, campos e chave de vínculo verificáveis. |
| 4 | Novo conjunto de propriedades com fast-check | Após identificar invariantes adicionais do reconciliador sem simular fatos. |
| 5 | Browser/Crawlee ou PDF | Somente diante de fonte pública concreta que requeira JavaScript ou PDF digital recorrente. |
| 6 | DuckDB, orquestrador externo e telemetria | Apenas após volume, frequência ou incidente comprovado que exceda a arquitetura atual. |

## Referências

[1]: https://github.com/apify/crawlee "Crawlee — automação de coleta com módulos de browser"

[2]: https://duckdb.org/docs/lts/clients/node_neo/overview "DuckDB Node.js Client (Neo)"

[3]: https://www.inngest.com/docs/learn/durable-endpoints "Inngest Durable Endpoints"; https://trigger.dev/docs/queue-concurrency "Trigger.dev — queues and concurrency"

[4]: https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos "FNDE — Dados Abertos"

[5]: https://portaldatransparencia.gov.br/api-de-dados "Portal da Transparência — API de Dados"

[6]: https://github.com/sindresorhus/p-queue "p-queue — Promise queue with concurrency control"

[7]: https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/ "fast-check — Property Based Testing with Vitest"
