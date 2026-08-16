# Framework de linguagem visual

## Inteligência Financeira PDDE | 4ª CRE

Este documento registra a decisão de produto para a nova Home e funciona como critério de avaliação para cada tela, componente e visualização. O objetivo não é impor um template único, mas preservar uma lógica comum de leitura, ação e profundidade.

> **Sofisticação invisível:** o sistema pode ser complexo por trás; a interface deve transformar essa complexidade em uma experiência natural, investigável e proporcional à tarefa humana.

## Arquitetura C da Home

A Home deve responder, nessa ordem, a quatro perguntas operacionais:

| Ordem | Pergunta humana | Composição de produto | Resultado esperado |
|---|---|---|---|
| 1 | Quanto temos e onde estamos? | Abertura editorial-financeira | Uma fotografia clara da posição de 2026, com poucos números realmente importantes. |
| 2 | Como isso está evoluindo? | Evolução temporal | Contexto para os números, evitando que sejam percebidos como fotografias isoladas. |
| 3 | Onde preciso olhar? | Acompanhamento acionável | Situações relevantes que abrem diretamente as unidades correspondentes. |
| 4 | Qual unidade quero investigar? | Carteira das 163 escolas | Busca, filtros e entrada natural para o dossiê de cada unidade. |

A composição gráfica exata permanece aberta à exploração, mas a ordem cognitiva é fixa: **posição → trajetória → atenção → investigação**.

## Gate de avaliação de cada tela

Antes de aprovar uma solução, devemos responder:

1. O que o usuário percebe primeiro?
2. O que ele entende sem explicação?
3. Qual é a próxima ação natural?
4. A estética ajuda a leitura ou compete com ela?
5. Há informação competindo sem necessidade?
6. O que parece interativo realmente é?
7. A interação revela uma entidade, uma relação ou apenas um campo técnico?
8. O detalhe está disponível sem invadir a leitura principal?
9. A composição funciona em desktop e mobile como experiências próprias?

## Princípios permanentes

### Hierarquia por escala antes de hierarquia por caixas

A ordem preferencial de composição é: posição, escala tipográfica, peso, espaçamento, alinhamento e cor. Cards, fundos e bordas devem ser reservados a unidades autônomas ou a estados que realmente precisam de contenção.

### Entidades e relações, não campos de banco de dados

A interface deve apresentar escola, programa, parcela, conta, saldo, pagamento, aplicação, movimentação e acompanhamento. Identificadores técnicos, proveniência e regras internas pertencem a camadas de detalhe, rastreabilidade ou auditoria.

### Cor semântica

O azul-marinho organiza a estrutura. O verde representa pagamento registrado, crédito ou estado positivo comprovado. O âmbar sinaliza confirmação pendente ou atenção. Cinza reduz o peso de contexto e informação complementar. Nenhuma cor deve ser usada apenas para decorar.

### Números importantes devem respirar

Valores como previsto, pago informado, saldo e aplicado podem ser protagonistas. Explicações, fontes e ressalvas aparecem em camada secundária, por detalhe contextual, sem dividir o mesmo palco visual do número.

### Estado e valor formam uma unidade

Sempre que fizer sentido, o sistema deve compor valor e estado: **R$ 5.065 · PAGO** ou **R$ 5.065 · PREVISTO**. Isso é preferível à reprodução mecânica de colunas separadas quando a composição não reduzir a precisão.

### Profundidade sob demanda

A primeira camada responde rapidamente à pergunta principal. A segunda acrescenta contexto. A terceira permite investigação detalhada.

| Tipo de profundidade | Uso | Sinal visual |
|---|---|---|
| Expansão inline | Detalhe pequeno diretamente relacionado, como parcelas de um programa | `⌄` / `⌃` |
| Drill-down | Entidade inteira para investigar, como conta, escola ou movimentações | `›` ou ação explícita |
| Detalhe contextual | Significado, origem ou ressalva de um estado | `ⓘ` |

A gramática deve ser consistente: `›` navega; `⌄` expande; `ⓘ` explica. Um indicador só pode parecer clicável quando abre um caminho útil.

### Alta densidade com baixa sensação de esforço

Não devemos reduzir a informação apenas para simplificar visualmente. Devemos tornar a estrutura previsível, separar camadas, agrupar relações e reduzir o esforço de interpretação.

### Visualização inteligente orientada por narrativa

Dados temporais, relações financeiras, estados, fluxos e mudanças devem ser tratados também como problemas de representação visual. Uma visualização só deve ser adotada quando aumentar a compreensão, preservar o significado e puder ser entendida sem uma legenda excessiva.

## Diretrizes para a nova Home

A abertura deve priorizar uma fotografia financeira de 2026, com tipografia editorial e poucos números dominantes. A evolução deve transformar o histórico disponível em trajetória legível, sem sugerir continuidade onde não exista evidência. O acompanhamento deve ser composto exclusivamente por situações que possam abrir listas ou dossiês. A carteira deve oferecer acesso à lista das 163 escolas por busca, filtros e indicadores acionáveis.

No mobile, a experiência não será um desktop espremido nem uma tabela com rolagem horizontal como solução padrão. A grade, a ordem, a escala e a densidade podem mudar, preservando o significado e a ação natural.

## Critérios de rejeição

Uma proposta deve ser rejeitada quando um número importante divide espaço com metadados técnicos sem necessidade; quando um cartão comunica uma quantidade mas não abre as entidades correspondentes; quando uma seta, cor ou borda sugere interação inexistente; quando a solução depende de texto explicativo para ser compreendida; quando cada bloco recebe o mesmo peso visual; ou quando a visualização parece moderna, mas não melhora a leitura, a decisão ou a investigação.
