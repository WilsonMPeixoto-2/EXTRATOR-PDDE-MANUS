# Proposta de Integrações Selecionadas — Fontes Oficiais do PDDE

**Data:** 14 de agosto de 2026  
**Escopo:** evolução experimental do Extrator Financeiro PDDEInfo — 4ª CRE  
**Princípio:** somente fontes oficialmente publicadas, com acesso permitido, amostra reproduzível e cadeia de evidências por arquivo/campo.

## Síntese decisória

As verificações práticas confirmaram que o sistema não precisa transformar-se em um coletor indiscriminado de portais. Há duas frentes que já dispõem de artefatos públicos, estruturados e com cobertura integral da lista-mestre: os **relatórios em lote do próprio PDDEInfo** e produtos selecionados da **Plataforma Antonieta de Barros (PAB)**. Elas complementam a consulta individual já operacional sem modificar a regra de que agência e conta do PDDE Básico só podem ser vinculadas quando o rótulo da fonte identifica exatamente o programa PDDE.

O PDDEREx permanece uma hipótese útil de confirmação, mas não atingiu o mesmo nível de evidência: a rota de listagem é pública e funcional, porém a amostra Rio de Janeiro/2025–2026 retornou ausência de registros e o destino detalhado não respondeu neste ambiente. BB Gestão Ágil, SiGPC Contas Online e PDDEWeb exigem autorização; portanto, não são candidatos a automação autônoma. Portal da Transparência requer token para API e deve ser tratado, no máximo, como contraprova federal condicionada. [1] [2] [3]

| Nível de decisão | Fonte ou produto | Resultado prático | Uso permitido proposto |
|---|---|---|---|
| **Piloto imediato** | PDDEInfo — Situação de Atendimento | Export oficial 2026 retornou 1.682 registros municipais; os 163 INEPs foram encontrados em 169 linhas. | Estado de atendimento, pagamento registrado no PDDEInfo, valores de custeio/capital/total e data da ordem. |
| **Piloto imediato** | PDDEInfo — Prestação de Contas | Export oficial 2026 retornou 9.555 registros; 163/163 INEPs, em 311 linhas. | Situação declarada de prestação e suspensão de EEx/UEx, CNPJ executora e valor previsto. |
| **Piloto imediato** | PDDEInfo — Relatório de Suspensão | Export oficial 2026 retornou 41 linhas; nenhuma coincidiu com a lista-mestre no recorte testado. | Exceções por INEP e motivo; ausência no resultado nunca será convertida automaticamente em adimplência. |
| **Piloto imediato** | PDDEInfo — Consulta de Saldo | Export oficial mensal retornou 4.573 linhas com CNPJ, banco, agência, conta e componentes de saldo. | Saldo mensal por CNPJ/conta/programa, somente após junção estrita por CNPJ UEx confirmado. |
| **Piloto imediato** | PAB produto 66 — Execução Financeira PDDE Básico Público | Gzip público de 9,35 MB; 163/163 INEPs em 354 registros de 2025. | Controle histórico anual de repasse executado, por INEP, destinação e custeio/capital/total. |
| **Piloto imediato** | PAB produto 70 — Saldos das Contas das UEx Públicas | Gzip público de 10,43 MB; 163/163 INEPs em 326 registros de 2025; banco `001` em todas as linhas da lista-mestre. | Referência histórica de conta/saldo por INEP, conta e exercício, sem inferir o programa da conta. |
| **Controle secundário** | PAB produto 59 — Consulta Prestação de Contas | Gzip público contendo INEP, CNPJ UEx, CNPJ EEx e atualização, mas sem campos de situação de prestação no cabeçalho testado. | Apoio de identificação e junção INEP–CNPJ; não usar como situação de prestação de contas. |
| **Investigação adicional** | PDDEREx | Rota pública de lista comprovada; amostra Rio de Janeiro/2025–2026 sem registros e detalhe indisponível no host testado. | Somente novo piloto por CNPJ de UEx e resposta detalhada comprovada. |
| **Piloto controlado** | SIGEF — Liberações, rota legada | O formulário e o detalhe público retornaram CNPJ, programa, data, OB, valor, banco, agência e C/C sem CAPTCHA no fluxo testado. | Consultar somente CNPJs UEx já confirmados e conciliar estritamente por CNPJ, programa, valor, data, OB e conta; manter a interface SIGEF moderna como `CAPTCHA_REQUIRED`. |
| **Acesso institucional** | BB Gestão Ágil | API Accountability existe, mas não foi localizada credencial, contrato ou escopo PDDE da SME-Rio. | Integração apenas após habilitação formal do órgão, sem automação de tela. |
| **Condicionada** | Portal da Transparência | API REST oficial e dados macro; token obrigatório e consulta web bloqueada no ambiente. | Contraprova de documento/ordem federal somente após credencial e teste de chave CNPJ/OB. |
| **Não priorizar** | SiGPC, PDDEWeb, SIMEC/PDDE Interativo, Transferegov e Power BI | Autorização, bloqueio técnico, foco cadastral/planejamento ou escopo de transferência distinto. | Importação autorizada, consulta manual ou validação agregada, conforme a fonte. |

## Contrato transversal de uma observação externa

Antes de desenvolver qualquer adaptador, cada linha importada deve ser preservada como uma **observação**, e não como substituição de um campo financeiro existente. A normalização precisa registrar pelo menos os atributos abaixo.

| Grupo | Campos mínimos | Regra de auditoria |
|---|---|---|
| Identidade | `inep`, `cnpjUex`, `cnpjEex`, `nomeFonte`, `chaveFonte` | INEP é a chave preferencial. CNPJ somente pode complementar a associação quando vier da fonte e houver correspondência estrita já evidenciada. |
| Tempo | `exercicio`, `periodoReferencia`, `atualizadoEmFonte`, `coletadoEm` | Período da fonte deve permanecer separado da data de coleta. Nunca apresentar saldo de 2025 como saldo atual de 2026. |
| Financeiro | `tipoFato`, `programaDeclarado`, `destinacaoDeclarada`, `custeio`, `capital`, `total`, `saldo`, `banco`, `agencia`, `conta` | Campos ausentes permanecem ausentes. Uma ordem/pagamento registrado não equivale a crédito bancário confirmado. |
| Proveniência | `fonteOriginal`, `distribuidor`, `urlProduto`, `urlArtefato`, `parametros`, `hashSha256`, `parserVersion`, `regraExtracao` | Para PAB, distinguir **fonte original declarada** do **distribuidor PAB**. Preservar arquivo bruto e hash. |
| Qualidade | `estadoEvidencia`, `validacoes`, `cobertura`, `limitacoes` | Toda divergência deve ser uma observação rastreável, não uma sobrescrita de valor. |

> **Regra operacional:** uma fonte complementar pode corroborar, divergir, ficar inconclusiva ou não cobrir a escola. Ela não preenche automaticamente dados bancários ou financeiros ausentes no PDDEInfo.

## Contratos de adaptação recomendados

### 1. Adaptador de relatórios em lote do PDDEInfo

O adaptador deve usar exclusivamente os formulários e links de Excel publicados pelo próprio portal. Os arquivos retornados são tabelas HTML entregues como `application/vnd.ms-excel`; por isso, a detecção deve basear-se no conteúdo e não apenas na extensão. A extração deve ocorrer por relatório e por recorte municipal, seguida de filtro local pelos 163 INEPs.

| Relatório | Identificador de associação | Fato normalizado | Condição de ativação |
|---|---|---|---|
| Atendimento | `Código Escola` | `PAGAMENTO_REGISTRADO_PDDEINFO` | Validar total/custeio/capital, destinação e data da ordem. |
| Prestação de contas | `Código da Escola` | `SITUACAO_PRESTACAO_DECLARADA` | Não converter automaticamente em aprovação, reprovação ou regularidade permanente. |
| Suspensão | `Cód. Escola` | `SUSPENSAO_DECLARADA` | Criar exceção apenas quando a linha existir; ausência mantém estado inconclusivo. |
| Saldo | `CNPJ` + conta + programa | `SALDO_MENSAL_DECLARADO` | Junção estrita com CNPJ UEx confirmado; sem associação por nome de escola ou razão social. |

O produto de saída deve ser um artefato por relatório, com URL consultada, parâmetros, hash, número de linhas, INEPs cobertos e falhas de parsing. A coleta por INEP existente permanece a fonte primária para o dossiê detalhado da escola. [1] [4]

### 2. Adaptador de catálogo e artefatos PAB

A PAB demonstrou dois endpoints públicos próprios: leitura de metadados de produto e download de artefato por produto. A rotina deve obter os metadados antes do download e rejeitar artefatos fora da lista explícita aprovada. Os produtos históricos volumosos não podem entrar no fluxo recorrente apenas por estarem publicamente disponíveis.

| Etapa | Operação verificada | Guardas obrigatórias |
|---|---|---|
| Descoberta | `GET /products/data-products/{id}` | Confirmar status publicado, nome do produto, data de atualização e artefato associado. |
| Aquisição | `GET /products/data-products/{id}/artifact` | Preservar binário bruto, tamanho, SHA-256 e nome declarado antes de descompactar. |
| Normalização | Gzip com CSV `;` | Validar esquema, exercício, presença de INEP e cobertura antes de persistir observações. |
| Aceite | Produto 66 e 70 | Exigir cobertura da lista, dados de período inequívoco e semântica compatível com o tipo de fato. |

O produto 66 deve gerar fatos históricos de execução por exercício e destinação. O produto 70 deve gerar fatos de saldo histórico por conta, sem estabelecer que a conta é do PDDE Básico: essa qualificação continua dependente do rótulo exato no PDDEInfo. O produto 24, histórico geral, foi classificado como **backfill excepcional** em razão do volume estimado; não deve ser baixado por execução. [5]

### 3. PDDEREx como conector de confirmação, não fallback automático

O PDDEREx somente deve avançar quando um teste por CNPJ de UEx comprovar resposta detalhada, campos bancários e parâmetros estáveis. O adaptador futuro não deve classificar “DADOS INEXISTENTES” como falha de rede nem criar conta a partir de qualquer programa que não seja explicitamente PDDE. A primeira entrega, se a fonte voltar a responder para o recorte, deverá ser somente uma conciliação de valores previstos/transferidos e de dados bancários declarados, com divergência visível no dossiê. [6]

### 4. SIGEF de Liberações — rota legada pública

O teste revelou um caminho público diferente da interface SIGEF moderna que exige CAPTCHA. O formulário legado `internet_fnde.liberacoes_01_pc` declarou em JavaScript o destino `internet_fnde.liberacoes_result_pc`; a listagem municipal retornou entidades e a abertura do detalhe por CNPJ trouxe as colunas de pagamento, OB, valor, programa, banco, agência e conta. Um piloto limitado a cinco UEx corroboradas pelo PDDEInfo obteve cinco respostas HTTP 200, sem marcador CAPTCHA, e cinco coincidências em CNPJ, parcela PDDE Básico, data e valor. A rota acrescentou a OB e os dados bancários em todos os casos.

Essa integração continua sendo de **corroboração**, não de preenchimento: um registro SIGEF só poderá abrir observação relacionada a pagamento PDDEInfo quando coincidirem CNPJ, programa declarado, data, valor, OB e dados bancários. O sucesso da rota legada não altera a classificação `CAPTCHA_REQUIRED` das telas SIGEF modernas de Liberações, Conta Corrente e Extratos, nem autoriza sua automação.

### 5. Canais condicionados a credencial ou autorização

BB Gestão Ágil, SiGPC Contas Online, PDDEWeb e API do Portal da Transparência devem permanecer fora do agendamento e da execução automática até existir acesso institucional válido. O contrato correto é de **importação autorizada**: arquivo ou API fornecida pelo titular do acesso, token exclusivamente no backend, escopo mínimo e revalidação de cobertura antes de persistir dados.

## Sequência de implementação recomendada

O primeiro incremento produtivo deve ser intencionalmente pequeno: criar um adaptador de **relatórios do PDDEInfo** apenas para Atendimento, Prestação de Contas e Suspensão, com artefatos e validações de cobertura. Em seguida, criar o adaptador de PAB para os produtos 66 e 70, como controle histórico 2025. A Consulta de Saldo do PDDEInfo entra após uma prova de junção CNPJ–UEx sobre a execução aprovada. Essas três entregas fornecem valor operacional imediato sem credenciais e sem afetar o modelo financeiro central.

Uma etapa posterior deve introduzir o modelo de observações multi-fonte, preservando o atual resultado do PDDEInfo e anexando fatos externos de forma aditiva. Só então PDDEREx, Portal da Transparência ou BB Gestão Ágil devem ser considerados, cada qual mediante seu próprio teste de habilitação.

## Referências

[1]: https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/monitore-o-pdde-1 "Monitoramento e fontes públicas do PDDE — FNDE"
[2]: https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/59 "PAB — Produto Consulta Prestação de Contas do PDDE"
[3]: https://bb.com.br/site/setor-publico/bb-gestao-agil/ "BB Gestão Ágil — Banco do Brasil"
[4]: https://www.fnde.gov.br/pddeinfo/ "PDDEInfo — FNDE"
[5]: https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar "Catálogo de Produtos de Dados — PAB"
[6]: https://www.fnde.gov.br/pls/simad/internet_fnde.pdderex_1_pc "PDDEREx — FNDE"
