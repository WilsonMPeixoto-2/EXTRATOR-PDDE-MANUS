# Critérios de design extraídos das imagens do usuário

## Imagem 1 — referência positiva

A seção “Validações da execução” apresenta quatro indicadores em uma linha, com hierarquia curta e comparável: INEPs únicos (163), 1ª parcela com pagamento registrado (111), 2ª parcela prevista (163) e conta PDDE não informada (47). O uso de cor verde para estados aprovados e a separação entre rótulo, referência e valor facilitam a leitura rápida.

Critério derivado: indicadores devem funcionar como resumos de uma situação e, quando representarem um conjunto de unidades, devem abrir ou aplicar um filtro que revele exatamente quais unidades compõem aquele número.

## Imagem 2 — problema principal

A planilha “PDDE • Dados bancários 2026 e status” coloca, dentro do fluxo tabular entre dados bancários e repasses, duas colunas de textos longos: “Situação da conta PDDE em 11/08/2026” e “Critério de preenchimento”. Os textos repetem por linha mensagens como “Agência/conta mantidas em branco; histórico não utilizado como dado vigente” e “Transcrição direta da consulta corrente de 2026”.

Critério derivado: a tabela operacional deve seguir a sequência de conferência humana: identificação da unidade → conta/dados bancários → valores previstos → valores pagos/registrados → datas → estado. Explicações, justificativas e rastreabilidade não devem interromper as colunas financeiras; devem aparecer em uma aba/visão secundária, em nota contextual ou sob demanda por unidade/campo.

Critério derivado: textos repetitivos não devem ser materializados em todas as linhas. O estado pode ser representado por um rótulo curto, cor, ícone ou código visual inteligível, com explicação consolidada em legenda/ajuda contextual.

## Regra transversal

A organização deve refletir a tarefa real do fiscal/gestor, e não a estrutura interna do banco de dados, do parser ou dos metadados de coleta. O sistema deve distinguir claramente: dado para decisão, estado operacional, explicação de regra e evidência técnica. Cada camada precisa ter lugar próprio e não pode competir visualmente com a informação financeira principal.

## Imagens 3 e 4 — indicadores sem consequência operacional

A faixa “Contas históricas do PDDE • 47 casos a confirmar em 2026” resume UEx a confirmar (47), contas distintas (67), uma conta localizada (28), múltiplas contas (19) e último período (06/2026). Esses números são úteis, mas ficam incompletos quando não conduzem à lista de unidades correspondentes.

A tela “Execução de extração” repete o mesmo padrão com cartões como “163/163 unidades selecionadas”, “116/163 contas PDDE” e, na seção de validações, “1ª parcela com pagamento registrado — 111” e “Conta PDDE não informada — 47”. Esses cartões devem ser tratados como controles interativos: clicar no número/rótulo deve abrir a lista já filtrada, mostrar a contagem, permitir selecionar uma unidade e explicar o critério do filtro.

Critério derivado: nenhum indicador que represente um conjunto deve ser meramente decorativo. Indicadores sem navegação para o conjunto detalhado devem ser convertidos em texto não interativo ou ganhar uma ação explícita de “ver unidades”.

Critério derivado: a interação deve preservar contexto. Ao abrir “47 contas não informadas”, o usuário precisa ver o título do filtro, o critério aplicado, o total, a lista de unidades, os dados disponíveis para conferência e um caminho claro para voltar ao resumo.

## Decisão de produto sugerida

O foco imediato é exclusivamente 2026. Dados de 2025 podem permanecer como comparação excepcional, mas não devem competir com a visão corrente nem aumentar a complexidade da leitura principal. Metadados de hash, parser, versão, regras internas, histórico técnico e critérios de preenchimento devem ficar fora da camada operacional principal, disponíveis apenas em detalhe sob demanda ou em uma área técnica separada para auditoria.

## Imagens 5 e 6 — padrões úteis e excesso de linguagem técnica

O dossiê financeiro por unidade tem um padrão aproveitável: identificação no topo, cartões de unidade/UEx/CNPJ/consulta e dois blocos paralelos para contas e parcelas. A leitura dialoga com uma conferência conhecida pelo usuário, semelhante a extrato, e deve ser refinada, não descartada.

Critério derivado: a seleção de uma unidade deve abrir um resumo financeiro imediatamente útil, com conta, parcelas, valores previstos, pagamentos registrados, datas e estados; informações técnicas devem ser secundárias e recolhíveis.

A tela “Situação de coleta” é útil como inventário de fontes, mas usa expressões internas como “hash”, “parser versionado”, “HTTP”, “HTML”, “JSON” e “CAPTCHA” no corpo da leitura operacional. Para gestores e fiscais, o texto deve ser traduzido para linguagem de consequência: “consulta disponível”, “aguarda autorização”, “fonte complementar em teste”, “consulta não realizada por proteção externa” e “não altera os dados principais”. Os detalhes técnicos podem ficar em “ver detalhes técnicos”.

Critério derivado: uma fonte deve ser apresentada por sua função para a decisão e por seu estado atual, não pela implementação interna. Exemplo: “PDDEInfo — fonte principal de pagamentos registrados e contas informadas”, com estado “Disponível”; detalhes de método e evidência somente sob demanda.
