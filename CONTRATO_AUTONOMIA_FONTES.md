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
| SIGEF — Conta Corrente | Pendente de piloto. A tela é pública, mas a consulta deve ser testada por CNPJ e pelo fluxo completo. | Criar adaptador somente depois de comprovar resultado, estabilidade e permissão de acesso. | `PILOTO_PENDENTE` ou `ACESSO_RESTRITO`. |
| SIGEF — Extratos | Pendente de piloto. A tela pública possui filtros, mas é preciso provar o vínculo com a UEx e a cobertura de 2026. | Não habilitar em lote antes de testar conta, período, programas, paginação e estornos. | `PILOTO_PENDENTE` ou `ACESSO_RESTRITO`. |
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

O adaptador PDDEInfo é o primeiro já operacional. Dados Abertos será o próximo candidato a automação integral. SIGEF só será conectado de forma autônoma quando existir rota permitida e testada ou canal institucional oficialmente autorizado.

## Referências

[1]: https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos "FNDE — Dados Abertos"
[2]: https://www.fnde.gov.br/sigefweb/index.php/liberacoes "SIGEF — Liberações"
