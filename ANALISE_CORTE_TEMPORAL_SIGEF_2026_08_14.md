# Análise do Corte Temporal dos Extratos SIGEF — 2026

## Pergunta examinada

Foi investigado se a ausência de lançamentos SIGEF posteriores a maio de 2026 nos extratos preservados decorre de uma limitação do Extrator PDDE da 4ª CRE ou de uma defasagem ou corte da própria fonte SIGEF.

## Evidência examinada

Foram lidos, sem nova consulta externa, **20 arquivos integrais HTML/XLS** já preservados pelo adaptador SIGEF. As consultas originais foram registradas em 14 de agosto de 2026 e utilizaram os parâmetros `012026`, `042026` e `082026` em UEx distintas. O analisador considerou todas as linhas do arquivo integral cuja primeira coluna possuía data válida.

| Indicador | Resultado |
|---|---:|
| Arquivos integrais analisados | 20 |
| Arquivos com ao menos uma movimentação de 2026 | 18 |
| Data mais recente de movimentação em 2026 | **03/05/2026** |
| Arquivos com data máxima em 03/05/2026 | 13 |
| Arquivos com data máxima em março ou abril | 5 |
| Arquivos sem movimentação de 2026 | 2 |
| Arquivos com data máxima posterior a maio | 0 |

## Confronto com a extração

O adaptador preserva a planilha pública integral `visualizaexcel`, não apenas a primeira página do detalhamento. No exemplo do INEP `33069301`, o arquivo integral possui 188 movimentos e a entrega filtrou somente a condição explícita `Data` pertencente a 2026: cinco linhas foram incluídas, com datas de 18 de março e 3 de maio. Não existe regra no filtro que interrompa a leitura em maio ou descarte meses posteriores.

O fato de consultas com parâmetros diferentes — inclusive `082026` — não apresentarem data posterior a maio é incompatível com uma limitação de mês aplicada pelo filtro local. Se houvesse uma linha de junho, julho ou agosto no arquivo integral, ela satisfaria a regra de data em 2026 e seria preservada.

## Conclusão

> A evidência disponível indica que o corte em maio é **proveniente do conteúdo retornado pelo SIGEF** nos arquivos consultados, e não de limitação da extração ou da planilha gerada pelo projeto.

Contudo, o extrato não permite concluir que não houve movimentação posterior em cada conta. A explicação pode ser defasagem de atualização da fonte, um corte operacional do SIGEF, ou ausência de novos fatos naquela conta. A diferença entre essas hipóteses exige nova evidência oficial posterior ou comparação com extrato bancário/documento próprio da UEx. Até lá, a formulação correta é: **“o SIGEF consultado não apresentou lançamentos posteriores a 03/05/2026”**.

## Efeito operacional

O Extrator deve continuar preservando a data máxima retornada pela fonte, exibindo-a como limite de cobertura, e retentar apenas as UEx necessárias quando o SIGEF voltar a responder de forma estável. Não deve estimar, completar ou classificar como ausência de crédito os meses posteriores ao corte.
