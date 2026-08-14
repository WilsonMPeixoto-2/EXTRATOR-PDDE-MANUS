# Contrato de Autonomia por Fonte

## Princípio operacional

A ferramenta deve realizar autonomamente **toda etapa permitida e reproduzível**: montar parâmetros, consultar rotas públicas sem restrição, interpretar respostas, validar dados, preservar evidências e atualizar o dossiê de auditoria. Quando a fonte impuser um mecanismo externo de acesso, a aplicação não pode transformar esse impedimento em silêncio, dado ausente ou “não pago”.

> Autonomia, neste sistema, significa eliminar trabalho repetitivo do operador sem simular permissão que o portal não concedeu.

## Matriz de autonomia

| Fonte | Autonomia de consulta | Regra para produção | Estado quando impedida |
|---|---|---|---|
| PDDEInfo por INEP | Completa. A rota pública é consultável por URL e já possui coletor próprio com lotes e retentativas. | Coletar, salvar HTML/JSON, parsear e validar automaticamente. | `FALHA_TECNICA` somente para erro de rede, resposta inválida ou alteração de estrutura. |
| Dados Abertos FNDE — PDDE | Completa após definir o arquivo oficial, exercício e periodicidade. O portal do FNDE informa conjuntos de execução financeira, escolas atendidas, saldos e prestação de contas do PDDE. [1] | Baixar arquivo oficial, registrar data de atualização, hash, cobertura e completar a conciliação como controle secundário. | `ARQUIVO_NAO_DISPONIVEL` ou `COBERTURA_INSUFICIENTE`. |
| SIGEF — Liberação de Recursos | Parcial. A interface moderna apresenta CAPTCHA, mas a rota legada pública de Liberações foi comprovada por CNPJ, programa e município. | Consultar no máximo cinco UEx por execução, salvar HTML/JSON/hash e corroborar somente parcela, data e valor que coincidam com o PDDEInfo. | `OB_CORROBORADA_CREDITO_NAO_LOCALIZADO`, `DIVERGENCIA_ENTRE_FONTES` ou `CONSULTA_INCONCLUSIVA`; nunca preencher conta primária do PDDEInfo. |
| SIGEF — Conta Corrente | Pendente de canal acessível/autorizado. A tela geral de pesquisa não integra o piloto e seus controles não são contornados. | Não criar coletor para formulário protegido nem interpretar falha de acesso como ausência de conta. | `ACESSO_RESTRITO` ou `CONSULTA_INCONCLUSIVA`. |
| SIGEF — Extratos (detalhamento público) | Parcial e comprovada somente para programa `02` do PDDE Básico. O detalhamento por URL respondeu em três UEx com CNPJ, Banco do Brasil, agência e conta do rótulo exato `PDDE` coincidentes. | Consultar no máximo cinco UEx por execução; priorizar o exercício de `2026` e admitir somente `2025` como recorte subsidiário. Períodos anteriores ou futuros são rejeitados antes da chamada externa. Normalizar somente banco (3), agência (4), conta BB (10, preservando `X`) e CNPJ (14); salvar HTML/JSON/hash e todas as linhas retornadas. Uma chave auxiliar SHA-256 colapsa apenas linhas idênticas da mesma resposta. | `CREDITO_LOCALIZADO_SIGEF`, `DIVERGENCIA_ENTRE_FONTES` ou `CONSULTA_INCONCLUSIVA`; não inferir programas, contas, saldo ou natureza de despesa. |
| Extrato bancário fornecido/autorizado | Autonomia de ingestão, não de obtenção. | Receber arquivo autorizado, extrair lançamentos e manter o documento original como evidência. | `ARQUIVO_NAO_FORNECIDO`. |

## Comportamento obrigatório da aplicação

| Situação | Ação da aplicação | Proibição |
|---|---|---|
| Consulta permitida retorna dados | Persistir resposta bruta, hash, campos normalizados, regras aplicadas e evidência de origem. | Não sobrescrever a fonte anterior. |
| Mudança de HTML ou seletor | Registrar erro de schema, preservar artefato e bloquear apenas o campo/execução atingidos. | Não aplicar heurística silenciosa para “adivinhar” o valor. |
| CAPTCHA ou login externo | Registrar URL, horário, parâmetros não sensíveis, estado de bloqueio e orientação para canal institucional autorizado. | Não usar proxy, serviço de resolução, automação de CAPTCHA ou endpoint obtido por atalho. |
| Fonte não retorna registro | Classificar como consulta concluída sem registro apenas se a fonte tiver sido efetivamente consultada e a resposta for preservada. | Não concluir “não pago” por indisponibilidade, CAPTCHA, timeout ou falta de cobertura. |
| Conflito entre fontes | Manter ambas, abrir achado de divergência e exigir critério documentado de conciliação. | Não substituir o dado menos recente ou menos conveniente. |

## Decisão de arquitetura

O aplicativo seguirá com **adaptadores por fonte**. Todos devolvem o mesmo contrato de coleta, independentemente de utilizar requisição HTTP, navegador controlado ou importação de arquivo:

```text
Coleta permitida → artefato bruto → hash → parsing versionado → validações → observações por campo → estado de evidência → achados de conciliação
```

O adaptador PDDEInfo é o primeiro já operacional. O detalhamento SIGEF de extrato é o segundo adaptador HTTP habilitado, mas permanece em piloto restrito ao programa `02`. Dados Abertos será o próximo candidato a automação integral. Demais frentes SIGEF só serão conectadas de forma autônoma quando existir rota permitida e testada ou canal institucional oficialmente autorizado.

### Chave auxiliar de deduplicação do extrato SIGEF

Cada movimento recebe uma chave determinística SHA-256 derivada de `CNPJ`, banco, agência, conta, programa, data, direção, valor em centavos, documento e histórico normalizado. A chave serve somente para colapsar linhas **idênticas dentro da mesma resposta** e apoiar comparação de reconsultas equivalentes. Ela não substitui o HTML bruto, o hash da fonte, o artefato normalizado, o seletor da linha ou o registro histórico de cada execução. Documento repetido com valor ou direção distintos continua sendo movimento distinto.

## Referências

[1]: https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos "FNDE — Dados Abertos"
[2]: https://www.fnde.gov.br/sigefweb/index.php/liberacoes "SIGEF — Liberações"
