# Gate de decisões do produto 2026

## Inteligência Financeira PDDE | 4ª CRE

Este documento registra as decisões de produto que devem orientar a implementação da página de unidade e a evolução da Home. O objetivo é evitar que a disponibilidade técnica de muitos dados produza uma interface maximalista, difícil de usar ou semanticamente ambígua.

## 1. Decisões já fixadas

| Tema | Decisão |
|---|---|
| Exercício principal | 2026 é o único escopo operacional da primeira versão. |
| Exceção histórica | 2025 só aparece quando necessário para explicar reprogramação, alteração de conta ou outra relação indispensável à leitura de 2026. |
| Arquitetura da Home | Opção C híbrida: posição financeira, evolução, acompanhamento acionável e carteira. |
| Organização da informação | Entidades e relações humanas, não campos de banco de dados. |
| Metadados técnicos | Não aparecem na experiência principal, no Excel distribuído ou no PDF de uso corrente. Permanecem em auditoria, evidência ou detalhe contextual. |
| Indicadores | Toda contagem relevante deve abrir o conjunto nominal de unidades que a compõe. |
| Semântica | Pagamento informado, ordem FNDE, crédito compatível, repasse confirmado, saldo informado, saldo aplicado e rendimento são estados distintos. |
| Visualização | Criatividade orientada por função; nenhuma timeline ou gráfico é obrigatório por aparência. |
| Lacunas | Ausência, zero conhecido, não observado e indisponível devem ser visualmente distintos. |
| Mobile | Mobile é composição própria, não desktop comprimido. |

## 2. Papel da Home

A Home deve produzir uma fotografia executiva de 2026 e, em seguida, transformar essa fotografia em trabalho investigável. O topo não deve ser uma central técnica de extração nem um catálogo de todos os relatórios disponíveis.

A ordem principal permanece:

```text
posição financeira → evolução comprovada → acompanhamento → carteira → investigação
```

A operação de atualização e geração de arquivos continua disponível, mas aparece depois da leitura financeira principal.

## 3. Hierarquia proposta para a unidade escolar

A página de unidade deve responder, nessa sequência:

| Ordem | Pergunta | Conteúdo |
|---|---|---|
| 1 | Quem é esta unidade? | Nome, SME, INEP e identificadores secundários. |
| 2 | Qual é sua posição financeira? | Previsto, pago informado, saldo informado, aplicado e data de referência. |
| 3 | Como os recursos estão organizados? | Programas, parcelas, contas vinculadas e estados. |
| 4 | Como a posição evoluiu? | Série mensal ou sequência de referências apenas quando observada. |
| 5 | O que aconteceu? | Movimentações e eventos compatíveis, com distinção de evidência. |
| 6 | Há pendência ou atenção? | Prestação de contas, conta a confirmar, ausência de posição recente ou divergência. |
| 7 | De onde veio a informação? | Detalhe contextual e área de evidência, sem invadir a primeira leitura. |

## 4. Indicadores que merecem o primeiro nível

A Home deve mostrar apenas indicadores cuja interpretação seja imediata e cuja ação correspondente esteja pronta.

| Indicador candidato | Primeiro nível? | Condição |
|---|---:|---|
| Total previsto 2026 | Sim | Deve informar o escopo da soma e a referência. |
| Pagamento informado | Sim | Deve aparecer separado de ordem FNDE e crédito bancário. |
| Saldo informado | Sim, quando houver cobertura corrente | Data de posição obrigatória. |
| Saldo aplicado | Sim, quando houver composição confiável | Deve ser separado do saldo em conta e rendimento. |
| Conta PDDE Básico a confirmar | Sim | Abre lista nominal e dossiê. |
| Prestação de contas pendente | Sim, quando a coleta estiver integrada | Abre lista e informa programa/ano. |
| Crédito compatível localizado | Segundo nível ou acompanhamento | Exige contrato de evidência claro; não usar como repasse confirmado. |
| Ordem FNDE | Segundo nível ou timeline | Útil para explicar trajetória, mas não deve ocupar o mesmo destaque de pagamento informado. |
| Métrica técnica de coleta | Não | Área técnica ou detalhe de evidência. |

## 5. Séries temporais

A primeira versão deve usar a série mais confiável disponível, não a mais sofisticada visualmente. Para saldos mensais, cada ponto precisa carregar mês, data de cobertura, composição do saldo e origem. Meses não observados permanecem como lacunas.

A visualização pode ter duas camadas:

1. Uma leitura compacta de evolução, adequada à Home ou à abertura da unidade.
2. Uma investigação temporal, na qual o usuário seleciona mês ou evento e acessa saldo, composição, movimentações e observações relacionadas.

Não deve haver interpolação visual entre meses ausentes. A série deve distinguir saldo informado, saldo aplicado, rendimento, movimento e repasse.

## 6. Acompanhamento e alertas

Alertas não devem acusar irregularidade automaticamente. Eles devem descrever uma condição observada, seu escopo e a ação possível.

| Linguagem a evitar | Linguagem recomendada |
|---|---|
| “Escola irregular” | “Prestação de contas com pendência registrada para 2026.” |
| “Repasse não caiu” | “Pagamento informado sem crédito compatível localizado no escopo consultado.” |
| “Conta inexistente” | “Conta PDDE Básico não informada na fonte corrente.” |
| “Saldo errado” | “Divergência entre referências; revisar evidências.” |
| “Sem pagamento” | “Nenhum pagamento informado na consulta corrente.” |

Todo alerta deve informar se é uma ausência, divergência, pendência de fonte, não observação ou confirmação positiva.

## 7. Excel distribuído

A versão humana deve priorizar as abas abaixo:

| Ordem | Aba | Função |
|---|---|---|
| 1 | Visão Geral | Síntese de 2026, indicadores e atalhos para acompanhamento. |
| 2 | Acompanhamento | Lista nominal de situações que exigem leitura ou confirmação. |
| 3 | Unidades | Cadastro funcional das escolas e identificadores humanos. |
| 4 | Repasses | Previsto, pagamento informado, ordem e datas semanticamente separadas. |
| 5 | Contas e Saldos | Contas, saldos, aplicações e datas de cobertura. |
| 6 | Movimentações | Eventos bancários ou compatíveis, com força de evidência explícita. |
| 7 | Prestação de Contas | Situação por unidade, programa e exercício. |

A exportação técnica completa permanece separada e identificada como material de auditoria interna. Metadados de parser, hash, IDs internos e regras de associação não devem aparecer nas abas destinadas ao uso cotidiano.

## 8. PDF

A primeira decisão de PDF deve ser entre dois produtos complementares, e não uma tela impressa:

| Produto | Uso |
|---|---|
| Relatório consolidado 2026 | Panorama da carteira, acompanhamento e síntese de fontes. |
| Ficha por unidade | Investigação aprofundada da escola, com posição, programas, contas, evolução e eventos. |

A geração sob demanda pode começar pela ficha de unidade, porque ela testa a narrativa financeira completa e evita criar um relatório consolidado sem hierarquia de uso definida.

## 9. Área técnica

Deve existir uma separação clara entre a experiência humana e a área técnica de auditoria. A área técnica pode expor fonte, hash, parser, tentativas, cobertura, payload e regra de associação, mas esses elementos não devem atravessar para a Home, a ficha cotidiana, o Excel distribuído ou o PDF de gestão.

## 10. Decisões que precisam de confirmação futura

A implementação pode avançar sem bloquear nos pontos abaixo, mas eles devem ser confirmados antes de ampliar o produto:

| Decisão pendente | Alternativas iniciais |
|---|---|
| Critério de “sem atualização recente” | 30, 60 ou 90 dias; sempre condicionado à data de cobertura real. |
| Destaque de queda de saldo | Apenas queda observada entre referências comparáveis; sem inferência sobre causa. |
| Profundidade do PDF | Consolidado, ficha por unidade ou ambos. |
| Visibilidade da fonte | Nota contextual na experiência humana e detalhe completo na auditoria. |
| Atualização da carteira | Ação assistida pelo usuário ou rotina automática após infraestrutura confirmada. |
| Retenção histórica | 2026 corrente como foco; 2025 apenas como contexto necessário. |

## 11. Gate para iniciar a página de unidade

A página de unidade pode começar quando os seguintes critérios estiverem satisfeitos:

| Critério | Condição de entrada |
|---|---|
| Identidade | Nome, INEP e SME disponíveis na consulta principal. |
| Posição | Pelo menos previsto e pagamento informado, com origem e data quando disponíveis. |
| Contas | Conta vinculada ou estado explícito de não informação. |
| Saldo | Data de cobertura conhecida; ausência não convertida em zero. |
| Programas | Relação entre programa, parcela e conta preservada. |
| Evidência | Cada estado crítico possui caminho para origem e ressalva. |
| Ação | Indicadores e linhas clicáveis abrem entidade ou detalhe real. |
| Mobile | A composição essencial funciona sem rolagem horizontal como solução padrão. |

A página de unidade será o próximo marco funcional porque transforma a Constituição Visual em experiência de investigação completa sem exigir, desde o primeiro passo, a exposição máxima de toda a infraestrutura de dados.
