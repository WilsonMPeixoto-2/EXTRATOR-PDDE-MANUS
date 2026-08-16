# Especificação das primeiras telas 2026

## Inteligência Financeira PDDE | 4ª CRE

Este documento traduz a Constituição Visual do Produto em critérios de produto para as próximas telas. Ele não congela a solução gráfica final; define a pergunta humana, a hierarquia, as relações, as ações e os estados que cada tela precisa sustentar.

## 1. Home da Inteligência Financeira

### Pergunta principal

Quanto temos, como a posição evoluiu, onde há atenção e qual unidade precisa ser investigada?

### Ordem de composição

| Camada | Conteúdo | Ação ou profundidade |
|---|---|---|
| Abertura | Previsto 2026, Pago informado, Contas PDDE informadas e referência da posição | `ⓘ` para origem, data e ressalva; não ocupar a leitura principal com metadados. |
| Evolução | Série de execuções aprovadas ou outra série temporal comprovada | Ponto selecionável quando houver detalhe real; lacunas não podem ser interpoladas. |
| Acompanhamento | Situações com contagem real: conta a confirmar, pagamento informado, parcela prevista ou outras que possuam conjunto | `›` abre a lista correspondente. |
| Carteira | Busca por nome, INEP ou SME e entrada nas 163 unidades | Busca e abertura de dossiê individual. |
| Operação | Atualização da referência, processamento, validações e download | Fica depois da leitura financeira, sem desaparecer. |

### Estados obrigatórios

A Home deve suportar ausência de execução aprovada, uma única referência, referência incompleta, nenhuma unidade em determinado acompanhamento, fonte indisponível e lista-mestre ainda não validada. Cada estado deve explicar a situação e oferecer a ação possível, sem preencher ausência com zero.

## 2. Página de unidade

### Pergunta principal

Quem é esta unidade, qual é sua posição financeira e o que precisa ser investigado?

### Ordem de composição

```text
Escola
Identificadores secundários
Posição financeira 2026
Programas
Parcelas
Contas vinculadas
Saldo e aplicações
Movimentações
Acompanhamento
Evidências
```

### Abertura

O nome da escola deve ser o objeto principal. SME e INEP aparecem abaixo como identificadores secundários. Um ícone contextual pode explicar a origem ou data da consulta sem transformar a identificação em um card pesado.

### Posição financeira

Os números prioritários devem poder respirar. A composição mínima prevista é:

| Métrica | Estado visual | Observação obrigatória |
|---|---|---|
| Previsto 2026 | Estrutural/neutro | Representa previsão, não crédito. |
| Pago informado | Verde controlado | Registro no PDDEInfo; não confirma crédito bancário. |
| Saldo informado | Data de posição visível | Não afirmar atualidade além da data observada. |
| Aplicado | Diferenciado do saldo corrente | Não confundir aplicação com rendimento. |

### Programas e parcelas

Cada programa deve nascer resumido e possuir expansão inline apenas quando houver parcelas ou relação adicional para mostrar. Uma expansão de programa deve revelar parcelas, valores, estados, datas disponíveis e conta vinculada sem abrir quinze controles concorrentes.

Exemplo de relação:

```text
PDDE Básico                         ›
R$ 10.130 previstos · R$ 5.065 pagos
```

Ao expandir:

```text
PDDE Básico                         ⌃
R$ 10.130 previstos · R$ 5.065 pagos

1ª parcela                          R$ 5.065 · PAGO INFORMADO
Pagamento informado · 05/08/2026

2ª parcela                          R$ 5.065 · PREVISTO
Data não informada na fonte

Conta vinculada                     ›
Ver movimentações                   →
```

### Conta e drill-down

A conta é uma entidade investigável. O usuário deve poder entrar em uma posição de conta com saldo, composição, data de referência, aplicação e movimentações. A conta não deve ser tratada apenas como três colunas bancárias isoladas.

## 3. Auditoria e indicadores

### Pergunta principal

Quais unidades compõem esta situação e qual caminho leva à evidência de cada uma?

Todo acesso vindo de um indicador deve preservar o `runId`, apresentar o filtro ativo, mostrar a contagem e oferecer busca por nome, INEP ou SME. A primeira dobra da lista deve mostrar entidades reconhecíveis, e não apenas uma confirmação abstrata de que o filtro foi aplicado.

### Contrato mínimo de cada lista

| Elemento | Requisito |
|---|---|
| Título | Nome humano da situação, não código do subset. |
| Contagem | Deve coincidir com o indicador de origem ou explicar a diferença de referência. |
| Filtro | Visível, removível e reaplicável. |
| Busca | Nome da unidade, INEP e SME. |
| Estado financeiro | Coluna ou composição curta que explique a situação. |
| Drill-down | Cada unidade abre o dossiê correspondente. |
| Evidência | O dossiê oferece origem e data quando disponíveis. |

## 4. Dados e contratos técnicos

As telas devem consumir dados agregados com a mesma regra usada para calcular os indicadores. Não é permitido calcular o número por uma regra e a lista por outra.

Toda série temporal deve declarar unidade, referência, quantidade de observações e limitação. Uma série com menos de dois pontos deve assumir estado vazio explicativo, não uma linha artificial.

Todo estado financeiro exposto ao usuário deve possuir correspondência entre texto humano, valor, fonte, data e grau de evidência. A matriz de semântica da Constituição é o contrato comum entre backend, frontend, Excel e PDF.

## 5. Critérios de validação da próxima implementação

A próxima implementação será considerada pronta somente quando:

| Área | Critério |
|---|---|
| Leitura | A pergunta principal da tela pode ser respondida antes dos detalhes técnicos. |
| Ação | Todo indicador ou affordance acionável abre um caminho real. |
| Evidência | Origem, data e ressalva não são perdidas quando alteram a interpretação. |
| Estados | Zero, não informado, não observado e indisponível são distintos. |
| Tempo | Lacunas permanecem visíveis; não há interpolação sem observação. |
| Desktop | O espaço é utilizado com densidade e respiro, sem áreas vazias acidentais. |
| Mobile | Ordem e composição são próprias, com áreas de toque adequadas. |
| Acessibilidade | A informação essencial não depende exclusivamente de cor, hover, animação ou mouse. |
| Exportações | Excel e PDF preservam semântica e possuem composição adequada à mídia. |

## 6. Próximo marco

O próximo trabalho de implementação deve começar pela página de unidade, porque ela é o ponto em que a arquitetura de entidades, profundidade sob demanda, semântica financeira e visualização temporal se encontram. A Home C permanece como porta de entrada para a investigação; a página de unidade será o primeiro teste completo da Constituição Visual.

## 7. Estado de implementação do primeiro marco

A rota `/unidade/:runId/:inep` foi implementada no frontend e conectada ao dossiê persistido da auditoria. A primeira composição já apresenta identidade da unidade, posição financeira 2026, programas e parcelas, contas vinculadas, acompanhamento, eventos temporais observados, movimentações SIGEF complementares e rastreabilidade recolhida.

A timeline usa apenas datas de pagamento informado e movimentos SIGEF efetivamente preservados. Ela não interpola meses, não desenha continuidade quando há lacuna e usa a expressão “crédito observado no SIGEF” para não confundir movimento retornado com repasse confirmado.

O código está no `main` no commit `3f00da7`. O domínio público ainda responde com um bundle anterior e não expõe a nova rota até a sincronização do deploy.
