# Endurecimento da importação complementar CGU — 17/08/2026

## Objetivo

Como a chave oficial da API do Portal da Transparência depende de validação de identidade no gov.br e está temporariamente indisponível, a evolução imediata concentrou-se na fonte CGU já acessível publicamente. A alteração reforça a cadeia de custódia do arquivo de transferências sem ampliar o significado financeiro da fonte.

> **Regra preservada:** uma transferência CGU permanece evidência complementar. Ela não confirma crédito bancário, não preenche agência ou conta, não altera parcela e não muda o estado de pagamento registrado pelo PDDEInfo.

## Controles incorporados

| Controle | Regra aplicada | Finalidade |
|---|---|---|
| Tipo HTTP | Aceita somente `application/zip` ou `application/x-zip-compressed`. | Bloqueia HTML, página de erro ou outro conteúdo entregue no lugar do arquivo público. |
| Tamanho comprimido | Máximo de 32 MiB, validado tanto pelo cabeçalho quanto durante a transferência. | Limita consumo de memória e arquivos inesperadamente grandes. |
| Assinatura | Os quatro primeiros bytes precisam formar assinatura ZIP reconhecida. | Impede que conteúdo com extensão enganosa seja encaminhado ao descompactador. |
| Estrutura do ZIP | Aceita exatamente um arquivo regular no padrão `AAAAmm_Transferencias.csv`. | Bloqueia diretórios, arquivos laterais e ambiguidade de conteúdo. |
| Tamanho descompactado | Máximo de 256 MiB, conferido no metadado do ZIP e durante a leitura. | Protege contra expansão desproporcional do conteúdo comprimido. |
| Retenção | O ZIP validado é espelhado temporariamente, recebe SHA-256 e é preservado no armazenamento de objetos antes da persistência das linhas. | Permite reproduzir a importação pelo artefato, hash, chave e URL registrados no histórico. |
| Idempotência | A verificação por período e hash ocorre antes do envio ao armazenamento. | Impede uma nova cópia do mesmo artefato quando uma importação idêntica já existe. |

## Base observada para os limites

O arquivo público de julho de 2026 retornou `application/x-zip-compressed`, com **2.480.385 bytes comprimidos**, uma única entrada `202607_Transferencias.csv` e **82.971.777 bytes descompactados**. Os limites de 32 MiB e 256 MiB preservam margem operacional sobre essa amostra oficial sem aceitar arquivos arbitrariamente grandes.

O novo fluxo também foi executado contra esse artefato real após a implementação: validou a assinatura e a estrutura, processou **100.995 registros CSV** em fluxo e calculou o hash SHA-256 `280b7274512973a2a99e2b5c92604efd3d1c9d60c06dc552acda888d6ddb2797`. O arquivo temporário usado na validação foi removido ao término; nenhuma linha do piloto foi persistida, pois o teste não recebeu a associação da execução PDDEInfo.

## Validação

A suíte específica ganhou cenários de rejeição de tipo HTTP, tamanho comprimido excessivo, assinatura inválida, entrada ZIP fora do padrão e tamanho descompactado excessivo. A aplicação foi validada com **123 testes aprovados**, tipagem estática e build de produção aprovados.

## Situação da API do Portal da Transparência

O piloto por CNPJ continua pendente exclusivamente da obtenção legítima da chave oficial. Nenhuma tentativa de contornar a verificação gov.br será realizada. Quando a chave estiver disponível, o piloto será limitado a poucos CNPJs confirmados, com resposta bruta, hash, data, cobertura e limitações registrados separadamente do PDDEInfo.
