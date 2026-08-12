# Resultado do Piloto Controlado — Movimentação SIGEF

Data de processamento: **12/08/2026**. A fonte foi um PDF de movimentação SIGEF fornecido pelo operador autorizado. O arquivo original **não foi incluído no repositório**; foi preservado no armazenamento gerenciado e vinculado à execução de auditoria do piloto.

## Cadeia de custódia

| Elemento | Resultado |
|---|---|
| Tipo de evidência | PDF SIGEF de movimentação autorizado pelo operador |
| Registro de auditoria | Execução de piloto com status `blocked` |
| Artefato | `sigef_movement_pdf` em armazenamento gerenciado |
| Integridade | SHA-256 registrado no artefato e no evento de coleta |
| Tratamento | Parser `SIGEF_MOVEMENT_PARSER_V1` |

## Extração controlada

Foram identificados **147 lançamentos** e **13 créditos com histórico “ORDEM BANCARIA”** atribuídos ao FNDE. O total desses componentes foi de **R$ 61.080,00**, distribuído entre os exercícios de 2020 a 2025. Nenhuma linha de texto foi descartada pelo parser na extração deste arquivo.

| Exercício | Total de créditos FNDE identificados |
|---:|---:|
| 2020 | R$ 10.400,00 |
| 2021 | R$ 10.220,00 |
| 2022 | R$ 9.790,00 |
| 2023 | R$ 10.350,00 |
| 2024 | R$ 10.490,00 |
| 2025 | R$ 9.830,00 |

## Resultado de conciliação

> O PDF comprova a existência de créditos e ordens bancárias do FNDE no extrato da unidade, mas **não fornece, em cada lançamento, programa, ação/parcela e conta destinatária da unidade**. Por esse motivo, a associação a pagamentos do PDDEInfo permaneceu **inconclusiva e bloqueada**, sem qualquer preenchimento de conta ou confirmação de parcela por inferência.

Uma consulta pública ao PDDEInfo de 2025 da mesma UEx mostrou duas linhas de **PDDE Básico**, cada uma de **R$ 4.915,00**, com datas de pagamento em **19/05/2025** e **25/09/2025**. O PDF SIGEF contém créditos de ordem bancária do FNDE com o mesmo valor e as mesmas datas. A coincidência é registrada como **candidata à conferência humana**, não como associação confirmada, pois o PDDEInfo consultado não expõe a OB e o PDF não vincula explicitamente cada crédito ao programa/parcela e à conta destinatária da unidade.

| Linha PDDEInfo 2025 | Valor e data no PDDEInfo | Crédito SIGEF com mesma data e valor | Situação |
|---|---|---|---|
| PDDE Básico — 1ª parcela | R$ 4.915,00 em 19/05/2025 | Identificado | Coincidência não confirmada |
| PDDE Básico — 2ª parcela | R$ 4.915,00 em 25/09/2025 | Identificado | Coincidência não confirmada |
| Educação Conectada 2025 | R$ 3.328,00 em 23/10/2025 | Não identificada como OB FNDE no relatório | Sem associação |

Eventos de resgate, aplicação automática e pagamento de cartão foram preservados como movimentos distintos. Eles não foram usados para comprovar recebimento de parcela ou para compensar ordem bancária sem chave documental completa.

## Conclusão operacional

O piloto comprova que o sistema pode receber, armazenar, hashear, extrair e recuperar uma evidência SIGEF autorizada de forma auditável. A habilitação de associação por conta, programa ou parcela ainda depende de documento SIGEF que apresente a chave completa de conciliação, ou de retorno institucional que a complemente.
