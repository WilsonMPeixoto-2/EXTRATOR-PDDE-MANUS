# Análise das implementações recentes do outro projeto — 17/08/2026

## Escopo e evidência examinada

Esta análise não se baseou somente no texto encaminhado. Foram verificados os commits públicos `3b29c53e` e `a2fb4b22` do repositório `WilsonMPeixoto-2/pdde-repasse-conciliador`, incluindo o diff de dependências e os módulos de browser assistido, DuckDB, fila limitada e cliente do Portal da Transparência. O objetivo foi determinar se as instalações são transferíveis para o **Extrator Financeiro PDDEInfo — 4ª CRE**, sem deslocar a referência primária do PDDEInfo ou criar duplicidade de infraestrutura.

O commit de expansão adicionou `@duckdb/node-api 1.5.5-r.4`, `crawlee 3.18.1`, `playwright 1.62.1`, `inngest 4.18.1`, `p-queue 9.3.3`, `unpdf 1.8.1`, `fast-check 4.9.0` e o conector `@fast-check/vitest 0.4.1`. Uma atualização posterior adicionou adaptadores de relatórios públicos PDDEInfo e um cliente do Portal da Transparência. [1] [2]

## Decisão por componente

| Componente externo | Verificação concreta | Decisão no Extrator 4ª CRE | Fundamentação |
|---|---|---|---|
| `fast-check 4.9.0` | Já está instalado e validado em 114 testes. | **Mantido.** | É a única melhoria de baixo risco e alto valor já incorporada, para invariantes de centavos sem inventar fatos financeiros. |
| `@fast-check/vitest 0.4.1` | Exige Vitest `^4.1.0`; o projeto usa Vitest 2.1.9. | **Rejeitado.** | A instalação foi testada e removida por incompatibilidade de peer dependency. O `fast-check` puro funciona com a suíte atual. |
| Crawlee + Playwright | O adaptador externo detecta CAPTCHA, abre browser em modo interativo e chama intervenção humana. | **Adiado.** | O coletor HTTP do PDDEInfo já é funcional e auditável. Para o SIGEF, CAPTCHA continua bloqueio explícito: não há fluxo operacional autônomo legítimo sem intervenção humana nem necessidade comprovada de Chromium em produção. |
| `p-queue` | O outro projeto usa concorrência 2, 30 requisições/minuto, timeout, aborto e retentativa. | **Adiado, com reaproveitamento de padrão futuro.** | O nosso núcleo já limita PDDEInfo a 3 consultas por lote, aplica pausa e retentativa, e os pilotos SIGEF usam concorrência fixa menor. A biblioteca só se justifica quando houver API com limite específico. |
| DuckDB em memória | O módulo externo recria uma tabela `movements`, apaga seu conteúdo e recarrega os registros em cada execução. | **Não instalar.** | Não é evidência nem repositório transacional; duplicaria dados que já são poucos e auditados no banco atual. Poderá ser reavaliado para grandes arquivos Parquet ou análise histórica pesada. |
| `unpdf` e PDF HTML | Há leitor de PDF e gerador de PDF, separados. | **Condicional.** | Nosso piloto SIGEF já preserva PDF autorizado, mas recebe texto extraído. `unpdf` só entra após haver PDF digital recorrente, com teste sobre artefato real; geração de PDF não é requisito do Excel institucional. |
| Inngest | O código externo introduz um fornecedor e chaves próprias para orquestração. | **Não instalar.** | A 4ª CRE possui fila de importação persistida e infraestrutura nativa de agendamento, mas sua atualização ainda é assistida por botão. Não há falha de durabilidade que justifique novo fornecedor. |
| PGlite e Supabase | São bases do outro projeto. | **Não aplicável.** | O Extrator usa MySQL/TiDB e Drizzle; migrar banco violaria decisões explícitas já aprovadas e não melhoraria a coleta. |
| Relatórios públicos PDDEInfo | O outro projeto cria adaptador/normatizador próprio por HTTP. | **Parcialmente já coberto.** | O nosso parser HTTP preserva HTML, JSON normalizado, hash, evidência por campo e executa validação 163/163. Não há razão para duplicar um segundo normalizador sem ganho mensurável. |
| Cliente Portal da Transparência | Consulta REST com cabeçalho `chave-api-dados`, filas, timeout e retentativas; inclui `recursos-recebidos`. | **Candidato de piloto, não integração agora.** | O padrão técnico é aproveitável, mas exige credencial oficial e validação de endpoint, vínculo por CNPJ/código favorecido, período e semântica. Nenhuma linha pode alterar conta, parcela ou pagamento do PDDEInfo. |

## Pontos técnicos relevantes

O browser assistido do outro projeto é deliberadamente limitado a uma URL, uma concorrência e uma sequência máxima de intervenções humanas. Essa postura é correta por não tentar resolver automaticamente CAPTCHA. Ainda assim, não resolve a restrição central da 4ª CRE: o usuário solicitou operação autônoma, enquanto um CAPTCHA externo deve ser registrado como bloqueio e nunca contornado. Portanto, importar esse adaptador agora só aumentaria dependências sem criar nova evidência utilizável.

O cliente do Portal da Transparência é a parte mais útil como **referência de desenho**, não como código a copiar. Ele usa timeout, tratamento de 401/403, retentativa apenas para erros transitórios e limite de chamadas. Esses princípios já são adotados no projeto. A diferença que ainda exige pesquisa é a chave de associação: o endpoint pode receber código de favorecido, enquanto nossa regra de persistência exige CNPJ comprovado da UEx e referência PDDEInfo completa. Sem token, resposta real e mapeamento reprodutível, não há integração segura.

> **Conclusão:** o outro projeto avançou em amplitude de infraestrutura; o Extrator 4ª CRE deve preservar seletividade. A melhoria já transferida foi `fast-check`. Os próximos ganhos reais não vêm de instalar todas as bibliotecas, mas de testar a API oficial do Portal e os recursos concretos de Dados Abertos com artefato, hash, cobertura e limites documentados.

## Validação do estado atual

Após a comparação, a auditoria de dependências de produção do Extrator registrou **0 alertas altos**, **0 críticos** e **1 moderado** transitivo de ExcelJS/UUID já conhecido, sem correção compatível do fornecedor. Não houve instalação adicional nesta análise. A suíte permanece com 114 testes, tipagem e build aprovados no checkpoint anterior.

## Próxima decisão técnica recomendada

A próxima implementação com melhor relação entre evidência nova e risco é um **piloto isolado da API do Portal da Transparência**, mas apenas quando houver credencial oficial. O piloto deve consultar um período curto, preservar resposta bruta, calcular hash, vincular exclusivamente por CNPJ confirmado e reportar cobertura/limitação. Se a API não retornar chave e semântica compatíveis, o resultado será registrado como fonte não aproveitável, sem transferir trabalho ao operador.

## Referências

[1]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/commit/3b29c53e "Commit de coleta assistida e camada analítica complementar"

[2]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/commit/a2fb4b22 "Commit de integração de dados públicos FNDE e Portal da Transparência"
