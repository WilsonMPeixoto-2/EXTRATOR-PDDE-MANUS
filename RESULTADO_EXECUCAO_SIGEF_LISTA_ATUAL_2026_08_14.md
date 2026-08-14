# Resultado da Execução SIGEF — Lista-Mestre Atual

## Escopo executado

Em 14 de agosto de 2026, a lista-mestre atual foi confrontada com a execução PDDEInfo aprovada `14fe09f3-a1cb-4ff7-bb05-fc1089849f72`. A conferência confirmou **163 INEPs únicos** em ambas as referências. A coleta SIGEF foi então executada na nova execução imutável `e8930ae4-179f-4517-8320-2ab98c63b86c`, reutilizando os JSONs já aprovados do PDDEInfo, sem repetir as consultas primárias.

> A execução SIGEF permanece um piloto operacional limitado a cinco UEx elegíveis por rodada. O limite não foi ampliado automaticamente para as 163 escolas, pois a integração ainda é restrita ao programa 02 e depende de identidade bancária explicitamente declarada pelo PDDEInfo.

## Resultado consolidado

| Indicador | Resultado |
|---|---:|
| UEx elegíveis consultadas | 5 |
| Linhas financeiras brutas recuperadas | 721 |
| Movimentações preservadas | 718 |
| Linhas idênticas colapsadas pela chave auxiliar | 3 |
| Créditos FNDE localizados | 4 |
| Pagamentos inconclusivos | 1 |
| Divergências de identidade ou valor | 0 |
| Consultas com cobertura incompleta | 0 |
| Artefatos HTML/XLS brutos preservados | 10 |
| JSONs normalizados preservados | 6 |

## UEx consultadas

| INEP | Unidade | Linhas brutas | Movimentos preservados | Duplicatas | Créditos localizados | Situação |
|---|---|---:|---:|---:|---:|---|
| 33068747 | CIEP Hélio Smidt | 119 | 119 | 0 | 1 | Crédito FNDE compatível localizado. |
| 33068755 | CIEP Yuri Gagarin | 201 | 199 | 2 | 1 | Crédito FNDE compatível localizado. |
| 33068763 | CIEP Maestro Francisco Mignone | 101 | 101 | 0 | 1 | Crédito FNDE compatível localizado. |
| 33068780 | CIEP Operário Vicente Mariano | 151 | 151 | 0 | 1 | Crédito FNDE compatível localizado. |
| 33068798 | CIEP Juscelino Kubitschek | 149 | 148 | 1 | 0 | Consulta inconclusiva para o crédito compatível; nenhuma ausência foi inferida. |

## Salvaguardas aplicadas

As cinco consultas usaram apenas contas cujo rótulo bancário é exatamente `PDDE` no PDDEInfo, Banco do Brasil e programa SIGEF `02`. A identidade de CNPJ, banco, agência, conta e programa foi validada antes de qualquer conciliação. Cada UEx possui página de detalhamento, arquivo integral HTML/XLS, JSON normalizado, URLs e hashes persistidos. As três linhas repetidas foram colapsadas apenas na apresentação normalizada; os arquivos brutos permanecem íntegros.

Movimentos de aplicação, resgate, transferência, débito ou crédito são preservados como fatos do extrato. Eles não comprovam saldo atual, despesa, irregularidade, execução de recurso ou prestação de contas. Da mesma forma, a conta SIGEF não substitui nem preenche o campo bancário primário do PDDEInfo.
