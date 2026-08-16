# Constituição Visual do Produto 2026

## Inteligência Financeira PDDE | 4ª CRE

**Status:** versão oficial de produto  
**Escopo:** interface web, Home, páginas de unidade, auditoria, visualizações, Excel, PDF e futuras interações  
**Princípio-mãe:** sofisticação que parece simples de usar

> **Não simplificar os dados até perder significado. Simplificar o esforço necessário para compreendê-los.**

> **Alta densidade informacional + alta legibilidade + alta qualidade estética.**

> **Mostrar primeiro o que importa, tornar perceptíveis as relações, sinalizar claramente a profundidade disponível e permitir que cada usuário investigue até o nível necessário, com beleza, precisão e significado em cada escolha visual.**

Este documento transforma o alinhamento de produto da Inteligência Financeira PDDE | 4ª CRE em regras de projeto, avaliação e implementação. Ele não impõe um template único, uma paleta definitiva ou uma composição fixa para todas as telas. Os princípios estão fixos; as soluções continuam livres, desde que preservem significado, ação, rastreabilidade e qualidade de leitura.

## 1. Finalidade e campo de aplicação

A Constituição deve orientar qualquer tela, gráfico, timeline, tabela, indicador, planilha, PDF, estado vazio, fluxo de investigação ou componente visual criado para o produto. Ela se aplica tanto à leitura cotidiana de gestores e fiscais quanto à investigação detalhada de auditoria.

O sistema pode ter dezenas de fontes, cruzamentos, regras, históricos e evidências. A interface não precisa expor essa complexidade simultaneamente para provar que o sistema é poderoso. A complexidade deve permanecer disponível em profundidade proporcional à tarefa humana.

A unidade fundamental da experiência não é o campo de banco de dados. É a relação que o usuário precisa compreender e, quando necessário, investigar:

> **escola → programa → parcela → conta → saldo → aplicação → pagamento → movimentação → prestação de contas**

## 2. Arquitetura C da Home

A Home da Inteligência Financeira PDDE deve responder, nessa ordem, a quatro perguntas operacionais:

| Ordem | Pergunta humana | Composição de produto | Resultado esperado |
|---|---|---|---|
| 1 | Quanto temos e onde estamos? | Abertura editorial-financeira | Fotografia clara da posição de 2026, com poucos números realmente importantes. |
| 2 | Como isso está evoluindo? | Evolução temporal | Contexto para os números, sem transformar uma fotografia isolada em tendência. |
| 3 | Onde preciso olhar? | Acompanhamento acionável | Situações relevantes que abrem diretamente as unidades correspondentes. |
| 4 | Qual unidade quero investigar? | Carteira das 163 escolas | Busca, filtros e entrada natural para o dossiê de cada unidade. |

A ordem cognitiva é fixa: **posição → trajetória → atenção → investigação**. A composição gráfica exata pode variar conforme a evidência disponível, o dispositivo e a finalidade da tela.

## 3. Critério de aprovação de cada tela

Antes de aprovar uma solução, a equipe deve responder afirmativamente às perguntas abaixo. Se uma resposta for negativa, a tela precisa ser revista ou a decisão deve ser documentada como exceção.

| Pergunta de gate | Critério de aprovação |
|---|---|
| O que o usuário percebe primeiro? | A prioridade visual corresponde à pergunta humana mais importante daquela tela. |
| O que ele entende sem explicação? | A leitura essencial não depende de um parágrafo metodológico. |
| Qual é a próxima ação natural? | Existe uma ação clara ou a tela comunica honestamente que não há ação disponível. |
| A estética ajuda a leitura? | Tipografia, cor, proporção e espaço reduzem esforço em vez de competir com o conteúdo. |
| Há informação competindo sem necessidade? | Metadados técnicos e ressalvas foram deslocados para camadas secundárias quando possível. |
| O que parece interativo realmente é? | Todo indicador, seta, chip, card e affordance abre ou executa o comportamento que comunica. |
| O caminho revela uma entidade ou relação? | A interação leva a escola, programa, parcela, conta, saldo, movimentação ou evidência, e não apenas a um campo técnico. |
| O detalhe está disponível sem invadir a leitura principal? | A profundidade existe, é percebida e pode ser acessada sem poluir a primeira camada. |
| O resultado funciona em desktop e mobile? | A composição se adapta ao espaço sem ser apenas uma versão comprimida. |
| A informação é acessível sem cor, hover ou ponteiro? | Existe caminho equivalente por texto, foco, teclado e toque. |

## 4. Princípios de composição

### 4.1 Hierarquia antes de caixas

Antes de criar cards, a hierarquia deve ser construída com posição, escala tipográfica, peso, alinhamento, espaçamento, agrupamento e cor. Cards, fundos e bordas são reservados a unidades conceituais autônomas, estados que exigem contenção ou ações que precisam de uma área de toque evidente.

> **Quando tudo está dentro de uma caixa, a caixa deixa de significar qualquer coisa.**

Uma borda não deve existir apenas porque o componente precisa parecer organizado. Ela deve comunicar que o conteúdo é uma unidade própria, que possui relação interna ou que demanda uma ação específica.

### 4.2 Entidades e relações, não campos de backend

A interface deve apresentar escolas, programas, parcelas, contas, saldos, aplicações, pagamentos, movimentações e prestações de contas. Identificadores técnicos, códigos, flags internas, caminhos de parser e proveniência detalhada pertencem a camadas de detalhe, rastreabilidade ou auditoria.

Os termos `paymentOrderDate`, `programCode`, `coverageThrough`, IDs internos e classificações de backend não devem ser usados como linguagem principal da experiência. Quando um identificador for necessário, ele deve aparecer como apoio à entidade humana, por exemplo: “EM Albino Souza Cruz · SME 0410002 · INEP 33069093”.

### 4.3 Texto como recurso escasso

Textos operacionais devem ser econômicos. Uma situação que pode ser apresentada como **Conta não informada ⓘ** não deve ocupar o mesmo palco de um valor financeiro com um parágrafo repetitivo.

O texto completo não desaparece. Ele migra para detalhe contextual, tooltip acessível, nota de evidência ou camada de auditoria. A redução do texto principal não pode remover uma informação que altere a interpretação do dado.

### 4.4 Números importantes devem respirar

Previsto, pago informado, saldo informado, saldo aplicado e outros números prioritários devem receber escala, espaço e contraste proporcionais à decisão que ajudam a tomar. Explicações, fontes, datas e ressalvas ficam em peso secundário, próximos o suficiente para manter a interpretação correta.

### 4.5 Estado e valor podem formar uma unidade

Quando não houver perda de precisão, valor e estado podem ser compostos como uma unidade visual:

```text
R$ 5.065
PAGO INFORMADO
```

ou:

```text
R$ 5.065
PREVISTO
```

Essa composição não autoriza apagar data, origem ou ressalva relevante. Ela apenas evita que a interface reproduza mecanicamente campos separados quando o usuário entende melhor a relação composta.

### 4.6 Cor semântica, não decorativa

O azul-marinho organiza a estrutura. O verde representa pagamento informado, crédito ou estado positivo comprovado, sem sugerir confirmação além da evidência. O âmbar sinaliza atenção, pendência ou necessidade de confirmação. Cinza reduz o peso de contexto e informação complementar. Outras cores podem ser adotadas, desde que seu significado seja documentado e consistente.

Cor nunca pode ser o único meio de distinguir estados. Todo significado cromático deve possuir rótulo, forma, posição, ícone, textura ou descrição equivalente.

## 5. Profundidade sob demanda e gramática de interação

A primeira camada responde rapidamente à pergunta principal. A segunda acrescenta contexto. A terceira permite investigação detalhada. Profundidade sob demanda não significa esconder informação crítica: tudo que muda a interpretação do dado ou exige atenção deve permanecer perceptível mesmo quando os detalhes estiverem recolhidos.

| Comportamento | Finalidade | Sinal preferencial | Resultado obrigatório |
|---|---|---|---|
| Expansão inline | Mostrar pequeno nível adicional diretamente relacionado, como parcelas de um programa. | `⌄` / `⌃` | O conteúdo aparece no mesmo contexto e pode ser recolhido sem perder a posição de leitura. |
| Drill-down | Entrar em uma entidade inteira, como escola, conta ou movimentações. | `›` ou ação textual | O usuário chega a uma tela ou estado que permite investigar a entidade prometida. |
| Detalhe contextual | Explicar significado, origem, data de referência ou ressalva. | `ⓘ` | A explicação é acessível por mouse, teclado e toque; não depende exclusivamente de hover. |

A gramática deve ser consistente em toda a plataforma. `›` significa navegação; `⌄` significa expansão; `ⓘ` significa contexto. Os símbolos definitivos podem mudar, mas seu significado não deve mudar de tela em tela.

São proibidos: seta decorativa, hover sem ação, chip que parece filtro mas não filtra, card aparentemente clicável que não abre nada e número destacado sem caminho para seus componentes.

## 6. Contrato de acionabilidade

Um indicador é um ponto de entrada operacional, não um troféu estatístico. Se a tela apresenta:

> **47 unidades com conta PDDE Básico a confirmar →**

o caminho mínimo esperado é:

```text
47 → lista das 47 → busca/filtro → escola → programa/conta → investigação
```

Cada indicador acionável deve possuir um contrato explícito:

| Elemento do contrato | Pergunta de implementação |
|---|---|
| Número | O valor apresentado é calculado a partir do mesmo conjunto que será aberto? |
| Rótulo | O usuário entende qual situação está sendo contada? |
| Destino | O clique abre lista, filtro, dossiê ou detalhe contextual? |
| Primeiro resultado | As entidades contadas aparecem imediatamente, com nome ou identificador reconhecível? |
| Contagem | A lista informa quantos resultados existem e se coincide com o indicador? |
| Busca | O usuário pode localizar uma entidade dentro do conjunto sem procurar manualmente uma a uma? |
| Retorno | Existe caminho evidente para voltar ao contexto anterior sem perder o filtro? |
| Estado vazio | Se o conjunto mudou, a tela explica por que não há resultados? |
| Acessibilidade | O comportamento funciona por teclado, foco e toque, sem depender de hover? |

Um indicador não deve ser publicado se o backend consegue calcular o número, mas a interface ainda não consegue mostrar as entidades que o compõem.

## 7. Matriz de semântica financeira e evidências

Os estados financeiros abaixo são semanticamente distintos e não podem compartilhar estilo que sugira equivalência. A apresentação deve manter o rótulo humano, o status, a data de referência quando existente e a ressalva necessária.

| Estado | O que significa | O que não prova | Apresentação preferencial |
|---|---|---|---|
| Previsto | Valor previsto para uma destinação ou parcela. | Não prova que houve ordem, pagamento ou crédito. | Valor neutro/estrutural com rótulo `PREVISTO`. |
| Ordem FNDE | Ordem ou data de pagamento identificada na fonte. | Não prova que o crédito chegou à conta. | Evento temporal ou metadado de pagamento, separado do valor pago. |
| Pagamento informado | Pagamento registrado no PDDEInfo. | Não confirma crédito bancário. | Verde controlado com rótulo `PAGO INFORMADO` e ressalva contextual. |
| Crédito compatível localizado | Movimento bancário ou evidência compatível com a referência. | Não equivale automaticamente a confirmação final do repasse. | Estado próprio, nunca reutilizando o estilo de `PAGO INFORMADO` sem prova equivalente. |
| Repasse confirmado | Confirmação baseada na evidência e regra autorizadas. | Não deve ser inferido por mera coincidência de valor ou data. | Estado positivo de maior força, com origem e referência. |
| Saldo informado | Saldo declarado ou localizado na fonte em uma data específica. | Não representa necessariamente saldo atual. | Valor com data de posição visível. |
| Saldo aplicado | Parcela do saldo identificada como aplicada. | Não significa rendimento nem liquidez imediata. | Composição financeira própria, ligada ao saldo informado. |
| Rendimento | Variação ou rendimento de aplicação identificado. | Não deve ser confundido com repasse ou saldo principal. | Linha ou evento separado, com período. |
| Não informado | A fonte não apresenta o dado esperado. | Não significa valor zero. | Âmbar ou neutro de atenção, com rótulo explícito. |
| Não observado | A consulta não encontrou evidência no escopo pesquisado. | Não significa que o fato não ocorreu. | Estado distinto de `não informado`, com escopo da busca. |
| Indisponível | A fonte, acesso ou método não permitiu obter o dado. | Não significa ausência do dado na origem. | Estado de acesso, sem codificação de valor financeiro positivo ou negativo. |
| Zero conhecido | A fonte informou ou permitiu concluir, dentro da regra, que o valor é zero. | Não deve ser usado para preencher ausência. | Zero numérico visível, com origem quando necessário. |

### 7.1 Contrato de evidência

Todo dado financeiro relevante deve poder responder, diretamente ou em camada contextual, a quatro perguntas: **de onde veio, de quando é, qual regra o classificou e o que ele não prova**.

Exemplo de composição adequada:

```text
R$ 5.065 · PAGO INFORMADO
Pagamento registrado no PDDEInfo · 05/08/2026
Não confirma crédito bancário.
```

A fonte e a ressalva não devem competir com o número, mas não podem ser removidas quando sua ausência induzir uma interpretação materialmente diferente.

## 8. Tempo, séries e lacunas

Visualizações temporais são hipóteses de leitura, não ornamentos obrigatórios. Uma timeline, evolução, sparkline ou sequência de eventos só deve existir quando aumentar a compreensão da relação temporal.

> **Lacunas precisam parecer lacunas.**

Uma série não pode desenhar uma linha contínua entre dois pontos como se soubesse o que aconteceu no intervalo quando não houve observação. Zero conhecido, ausência de informação e valor observado são estados diferentes.

| Estado temporal | Representação recomendada |
|---|---|
| Valor observado | Ponto ou marca preenchida, com valor e data acessíveis. |
| Zero conhecido | Ponto ou barra de zero com rótulo numérico, sem desaparecer no eixo. |
| Não observado | Lacuna visível, ponto ausente ou marcador `não observado`; não interpolar. |
| Não informado | Marcador de ausência declarada na fonte, distinto de lacuna técnica. |
| Indisponível | Interrupção ou estado de acesso, com explicação contextual. |
| Período não aplicável | Não desenhar ponto; informar que o período não se aplica. |

A Home pode comparar execuções aprovadas reais, mas deve declarar quando a série não representa saldo bancário mensal. Toda visualização deve expor sua unidade temporal, referência e limitações sem exigir um manual.

## 9. Estados vazios e incompletos

Estado vazio não é falha de acabamento. Ele deve explicar o que está ausente, por que está ausente e qual ação, se houver, pode resolver a situação.

| Estado | Mensagem de produto | Ação possível |
|---|---|---|
| Nenhuma execução aprovada | “A posição financeira aparecerá após uma execução aprovada.” | Iniciar extração, quando autorizado. |
| Uma única referência | “Há uma fotografia aprovada. A evolução será exibida após uma segunda referência comparável.” | Consultar ou iniciar nova extração. |
| Unidade sem saldo | “Não há saldo informado para esta unidade na referência corrente.” | Ver evidência, consultar outra referência ou registrar acompanhamento. |
| Parcela sem data | “Valor previsto; data de pagamento não informada na fonte.” | Abrir detalhe contextual ou evidência. |
| Lista filtrada vazia | “Nenhuma unidade corresponde a este filtro nesta referência.” | Limpar filtro, alterar busca ou voltar ao conjunto completo. |
| Fonte indisponível | “A fonte não pôde ser consultada neste momento.” | Ver estado operacional, tentar novamente ou usar evidência autorizada. |
| Dado não observado | “A consulta não encontrou evidência no escopo pesquisado.” | Ver escopo, fonte e consulta realizada. |

É proibido substituir esses estados por zeros, campos em branco sem explicação ou gráficos vazios que pareçam quebrados.

## 10. Visualização inteligente orientada por narrativa

Antes de colocar uma relação em tabela, a equipe deve perguntar:

> **Existe uma representação visual mais inteligente, bonita e intuitiva para esta relação?**

As possibilidades incluem timelines, evolução temporal, composição de saldos, marcadores de eventos, pequenos múltiplos, sparklines, comparações, fluxos, barras e visualizações de período. Nenhuma solução é obrigatória. A escolha deve ser orientada por função.

Uma visualização só é aprovada quando preserva o significado do dado, não exige legenda excessiva, torna a relação mais fácil de perceber e oferece um caminho equivalente para quem não usa mouse, cor, animação ou ponteiro.

## 11. Desktop, mobile, impressão, Excel e PDF

### 11.1 Desktop e mobile

Responsividade não é encolhimento. Desktop e mobile são composições diferentes para o mesmo significado.

No desktop, uma posição pode ser organizada como:

```text
Previsto | Pago informado | Saldo informado | Aplicado
```

No mobile, ela pode ser composta como grade 2×2 ou sequência vertical:

```text
Previsto              Pago informado
Saldo informado       Aplicado
```

A ordem, escala, densidade, área de toque e agrupamento devem ser deliberadamente adaptados ao espaço. Scroll horizontal de uma tabela extensa não é considerado solução mobile por padrão.

### 11.2 Excel

O Excel é produto de conferência, não dump de banco. A planilha deve organizar a sequência humana de trabalho, separar valores previstos de valores pagos, manter cores semanticamente consistentes, reduzir textos repetitivos e deslocar justificativas extensas para abas de validação, notas ou evidências. A precisão, rastreabilidade e possibilidade de filtro continuam obrigatórias.

### 11.3 PDF e impressão

O PDF não é screenshot do site. Deve possuir composição editorial própria, hierarquia de leitura, paginação planejada, contraste para impressão e, quando fizer sentido, fichas por unidade, sínteses, pequenos gráficos, timelines e listas acionáveis. O conteúdo essencial não pode depender de hover, animação ou cor isolada.

## 12. Acessibilidade como parte do refinamento

Acessibilidade não é uma versão paralela do produto. Toda visualização importante deve ter um caminho equivalente para sua informação essencial sem depender exclusivamente de hover, cor, animação, mouse ou precisão do ponteiro.

Cada interação deve possuir foco visível, funcionamento por teclado, área de toque adequada e nome acessível. Tooltips precisam ser substituídos ou complementados por conteúdo acessível em foco e toque. Gráficos devem possuir descrição textual ou tabela equivalente quando a relação não puder ser compreendida por outro caminho.

## 13. Fronteira entre dado humano e metadado técnico

A primeira camada deve responder ao trabalho humano. Proveniência detalhada, regras de parser, hashes, campos internos, versões técnicas e explicações extensas devem aparecer em detalhe contextual, auditoria ou evidência, salvo quando forem necessários para interpretar corretamente o dado.

A simplificação de linguagem não autoriza ocultar incerteza. O objetivo é reduzir o peso visual do metadado, não removê-lo da cadeia de evidência.

## 14. Primeiras telas sob esta Constituição

### Home C

A Home começa pela posição financeira, segue para a evolução disponível, apresenta situações de acompanhamento acionáveis e termina com a carteira investigável das unidades. A extração técnica fica em seção posterior, acessível quando o usuário precisa atualizar a referência.

### Página de unidade

A página de unidade deve começar por identidade da escola e posição financeira. Em seguida, deve mostrar programas resumidos e expansíveis, parcelas com valor e estado, contas vinculadas e ações de drill-down para saldo e movimentações. Acompanhamento e evidências ficam disponíveis sem ocupar o palco principal.

### Auditoria

A auditoria deve receber o usuário vindo de um indicador já com o conjunto correspondente aberto. Deve mostrar contagem, filtro ativo, busca, nomes identificáveis e caminho para o dossiê. Um número nunca deve terminar em uma tela que apenas repita o próprio número.

## 15. Critérios de rejeição

Uma proposta deve ser rejeitada quando um número importante divide espaço com metadados técnicos sem necessidade; quando um cartão comunica uma quantidade mas não abre as entidades correspondentes; quando uma seta, cor ou borda sugere interação inexistente; quando a solução depende de texto explicativo para ser compreendida; quando cada bloco recebe o mesmo peso visual; quando zero é confundido com ausência; quando uma lacuna temporal é interpolada visualmente; quando pagamento informado parece repasse confirmado; quando a composição mobile é apenas uma tabela desktop estreita; quando o Excel é um dump de banco; quando o PDF é uma captura do site; ou quando a visualização parece moderna, mas não melhora leitura, decisão ou investigação.

## 16. Governança da Constituição

Este documento é a referência normativa de produto para decisões visuais e de informação. Alterações que modifiquem o significado de uma cor, símbolo, estado financeiro, contrato de acionabilidade ou regra de evidência devem ser registradas com justificativa, impacto e exemplos afetados.

A Constituição não impede experimentação. Ela exige que cada experimento declare qual pergunta humana pretende responder, qual evidência utiliza, qual ação habilita, quais estados incompletos suporta e como será validado em desktop, mobile, acessibilidade, Excel ou PDF, quando aplicável.

A revisão de cada nova tela deve preservar o equilíbrio entre quatro metas:

| Meta | Pergunta de controle |
|---|---|
| Precisão | O desenho preserva o significado e a incerteza do dado? |
| Legibilidade | O usuário entende a leitura principal sem esforço desnecessário? |
| Acionabilidade | A próxima ação natural está disponível e funciona? |
| Sofisticação | A estética aumenta compreensão sem virar decoração gratuita? |

## 17. Encerramento

A plataforma não deve parecer um conjunto de tabelas governamentais remodeladas nem um painel genérico de indicadores. Deve parecer um produto de inteligência financeira contemporâneo: denso, rigoroso, investigável e elegante.

> **Mostrar primeiro o que importa, tornar perceptíveis as relações, sinalizar claramente a profundidade disponível e permitir que cada usuário investigue até o nível necessário, com beleza, precisão e significado em cada escolha visual.**
