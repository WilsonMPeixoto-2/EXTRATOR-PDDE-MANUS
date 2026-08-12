# Avaliação de Ferramentas de Coleta e Agentes

## Síntese executiva

**Algumas das soluções apresentadas podem ser úteis, mas não devem substituir o núcleo que já construímos.** Para o PDDEInfo, a combinação atual de requisição HTTP controlada, parser próprio, regras explícitas e evidência persistida é mais simples, auditável e adequada. O ponto mais importante não é obter “mais automação”; é conseguir demonstrar, depois, **qual fonte foi consultada, o que ela exibiu, qual regra produziu cada valor e por que o sistema classificou aquele valor como confiável ou inconclusivo**.

Ferramentas de navegação podem complementar o projeto diante de páginas renderizadas por JavaScript ou mudanças frequentes de interface. Elas **não** resolvem legitimamente um CAPTCHA, não transformam ordem bancária em crédito confirmado e não dispensam a validação de regras financeiras. CAPTCHA continua sendo uma etapa humana ou um tema de canal institucional autorizado.

## Critérios de decisão

Uma tecnologia só deve ser incorporada se melhorar a capacidade de coleta **sem piorar** os seguintes controles:

| Critério | Regra institucional |
|---|---|
| Determinismo | A extração recorrente deve usar seletor, schema e regra versionados. Linguagem natural não pode ser a regra de produção para valor, data, programa ou conta. |
| Evidência | Toda resposta deve preservar URL, horário, status, HTML/JSON bruto, hash, versão do parser e trecho de origem. |
| Acesso permitido | O sistema não tenta contornar CAPTCHA, login, limite de consulta ou outro controle do portal. |
| Separação de fontes | PDDEInfo, SIGEF Liberação, SIGEF Extrato, Dados Abertos e eventual extrato bancário seguem como evidências distintas. |
| Operação sustentável | A dependência deve caber na infraestrutura, no orçamento e na capacidade de manutenção da 4ª CRE. |
| Reprodutibilidade | Uma auditoria deve conseguir repetir a regra sobre o artefato bruto e obter o mesmo resultado. |

## Avaliação por ferramenta

| Ferramenta ou abordagem | Papel possível no projeto | Avaliação | Decisão sugerida neste momento |
|---|---|---|---|
| **HTTP + Cheerio + parser próprio** | Coleta do PDDEInfo e parsing de estruturas conhecidas. | É o caminho mais leve, determinístico e já validado para o portal principal. Permite preservar a resposta original e testar cada regra. | **Manter como núcleo obrigatório.** |
| **Playwright** | Navegação assistida em telas dinâmicas, download permitido, sessão humana e captura de evidência. | Útil para telas SIGEF que exigem interação. Deve executar passos definidos por código e registrar cada transição. | **Incorporar apenas como camada controlada de piloto.** CAPTCHA permanece humano. |
| **Crawl4AI** | Leitura de páginas dinâmicas e transformação auxiliar de HTML em Markdown/JSON. | Possui extração com CSS/XPath sem LLM, mas opera com navegador e pode demandar Python, Playwright ou Docker. A própria documentação de auto-hospedagem menciona Docker e pelo menos 4 GB de RAM disponíveis. [1] [2] | **Não instalar agora.** Avaliar somente se uma fonte permitida exigir renderização dinâmica além do navegador controlado. |
| **Stagehand** | Assistência limitada quando um seletor conhecido quebrar após mudança de interface. | Combina ações por IA com APIs determinísticas de navegador e schemas tipados. [3] Porém, o uso de IA deve servir para diagnóstico ou descoberta supervisionada, não para definir valores financeiros finais. | **Candidato experimental futuro**, com validação humana e posterior conversão do achado em regra determinística. |
| **Browser Use** | Agente autônomo para tarefas de exploração ou triagem de páginas. | A biblioteca é open source, mas o fluxo usa um provedor de LLM ou modelo local; a própria documentação associa tratamento de CAPTCHA à infraestrutura em nuvem e recursos de stealth. [4] Isso é incompatível com a política de não contorno do SIGEF. | **Não usar no núcleo financeiro nem para CAPTCHA.** Poderá ser avaliado em pesquisa não transacional e não sensível. |
| **Firecrawl** | API de scraping de páginas públicas amplas, HTML/Markdown e mapeamento de links. | Pode ser auto-hospedado, mas exige um conjunto operacional maior com Docker, banco, fila, segredos, monitoramento, backup e recuperação. [5] O repositório principal usa licença AGPL-3.0. [6] | **Não justificado para o projeto atual.** Não acrescenta valor ao PDDEInfo estático e aumenta complexidade operacional. |
| **Skyvern, Browserbase, Apify e Bright Data** | Serviço auxiliar, infraestrutura de navegador ou coleta terceirizada. | Podem ser úteis apenas diante de necessidade comprovada, com avaliação de contrato, tratamento de dados, custo, retenção, limite e aderência à fonte consultada. | **Não integrar preventivamente.** Considerar somente após falha comprovada do caminho próprio e autorização institucional. |

## Duas arquiteturas viáveis

| Abordagem | Como funciona | Custo e operação | Indicação |
|---|---|---|---|
| **Núcleo próprio + navegador assistido** | O servidor consulta fontes públicas permitidas, aplica parser e schema próprios; o navegador é usado apenas quando há JavaScript, download ou intervenção humana autorizada. | Menor complexidade. Não depende de LLM nem de serviço externo para a rotina do PDDEInfo. | Adequada para a etapa atual e para o piloto SIGEF. |
| **Serviço auxiliar isolado de leitura dinâmica** | Uma ferramenta como Crawl4AI ou Stagehand é executada separadamente, recebendo URL permitida e devolvendo artefato bruto para o mesmo pipeline de auditoria. | Maior custo de implantação e manutenção. Pode exigir infraestrutura com Docker, navegador e mais memória do que a aplicação atual. | Indicado apenas se o piloto provar que uma fonte essencial não é lida de modo confiável pelo núcleo próprio. |

Nenhuma das duas alternativas autoriza automação de CAPTCHA, uso de proxy para escapar de bloqueio ou agente autônomo para inventar associação financeira. A escolha deve ser feita pelo ganho **comprovado** no piloto, e não pela quantidade de recursos anunciados por uma ferramenta.

## Arquitetura recomendada de uso escalonado

> A decisão deve ocorrer da tecnologia mais simples e reproduzível para a mais complexa, interrompendo a escalada quando a evidência já for suficiente.

1. **Consulta oficial permitida e resposta HTTP**: usar o coletor próprio e o parser versionado.
2. **Página dinâmica, mas sem restrição de acesso**: usar navegador controlado com roteiro determinístico, captura de HTML/screenshot e schema explícito.
3. **Mudança de interface ou descoberta de novo seletor**: permitir uma sessão assistida por IA em ambiente de teste, registrar o resultado e transformar a solução em seletor/regras fixas antes da produção.
4. **CAPTCHA, login, acesso restrito ou extrato bancário**: interromper a automação; usar intervenção humana, documento fornecido pela unidade ou canal institucional oficialmente autorizado.

## Efeito sobre a aplicação atual

Não é necessário trocar React, Express, MySQL, armazenamento de artefatos, Cheerio ou ExcelJS. Caso uma ferramenta externa seja aprovada, ela deve ficar **atrás de uma interface interna de coletor**, devolvendo o mesmo contrato que já estamos criando:

| Saída obrigatória do coletor | Finalidade |
|---|---|
| URL, método e parâmetros permitidos | Reproduzir a consulta. |
| Data/hora, duração, status e erro | Avaliar disponibilidade e cobertura. |
| HTML, JSON, screenshot ou arquivo bruto | Preservar a evidência primária. |
| Hash SHA-256 e versão do adaptador | Impedir confusão entre execuções. |
| Valores normalizados com seletor e regra | Permitir auditoria campo a campo. |
| Estado de evidência | Distinguir pagamento no PDDEInfo, OB corroborada, crédito SIGEF, crédito em extrato, estorno, divergência ou consulta inconclusiva. |

## Próximo experimento útil

O experimento de maior valor não é instalar cinco bibliotecas. É concluir a consulta manual assistida de **Liberação de Recursos do SIGEF** para uma UEx piloto, salvar a resposta e responder a quatro perguntas: quais campos chegam; como programa e CNPJ são vinculados; se a conta apresentada corresponde ao PDDE Básico; e se a rota permanece estável. Se a resposta exigir interação dinâmica permitida, o próximo teste deve ser um roteiro determinístico de navegador, não um agente autônomo.

## Referências

[1]: https://docs.crawl4ai.com/core/quickstart/ "Crawl4AI — extração CSS/XPath e execução com navegador"
[2]: https://docs.crawl4ai.com/core/self-hosting/ "Crawl4AI — auto-hospedagem e pré-requisitos"
[3]: https://docs.stagehand.dev/v4/first-steps/introduction "Stagehand — camadas de IA e APIs determinísticas"
[4]: https://github.com/browser-use/browser-use "Browser Use — biblioteca, modelos e FAQ de CAPTCHA"
[5]: https://docs.firecrawl.dev/contributing/self-host "Firecrawl — auto-hospedagem e responsabilidades operacionais"
[6]: https://github.com/firecrawl/firecrawl "Firecrawl — licença AGPL-3.0"
