# Notas iniciais do piloto com PDF de movimentação PDDE

Arquivo analisado: `/home/ubuntu/upload/MOVIMENTAÇÃOPDDE.pdf`

## Constatações visuais preservadas

O documento possui **4 páginas** e apresenta cabeçalho do **FNDE / SIGEF - Sistema Integrado de Gestão Financeira**.

Na primeira página, o documento identifica:

- **CNPJ:** `04.552.825/0001-70`
- **UF:** `RJ`
- **Nome:** `CONSELHO ESCOLA COMUNIDADE DA EM ALBINO SOUZA CRUZ`
- **Município:** `RIO DE JANEIRO`
- **Data da consulta:** `11/08/2026 20:07:56`

As colunas visíveis do extrato são:

| Coluna | Observação |
|---|---|
| Data | Datas entre 2019 e 2025 |
| Crédito | Valores positivos creditados |
| Débito | Valores debitados |
| Documento | Identificadores numéricos longos e ordens/documentos |
| Histórico | Eventos como `TRANSFERÊNCIA ENVIADA`, `ORDEM BANCARIA`, `RESGATE AUTOMATICO`, `PAGTO CARTAO CREDITO`, `APLICACAO BB RF`, `REDEBAM BEX`, `RESGATE BB FIX` |
| CNPJ Beneficiário | Em várias linhas preenchido; em outras, zerado ou com padrão neutro |
| Razão Social | Inclui `FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO`, `BANCO DO BRASIL SA` e o próprio conselho escolar em lançamentos específicos |
| Banco Beneficiário | Exemplos: `001`, `033`, `260`, `323`, `403`, `999` |
| Agência Beneficiário | Há valores como `0000`, `0001`, `0249`, `1523`, `1607`, `3400`, `4700`, `9999` |
| Conta Corrente Beneficiário | Há contas com zeros, padrões numéricos e sufixo alfanumérico em ao menos uma linha |

## Limitações já observadas

O PDF aparenta ser um extrato de movimentação ampla da unidade, cobrindo vários anos e múltiplos tipos de eventos bancários. Portanto, **não é suficiente por si só para vincular automaticamente um pagamento PDDEInfo a uma parcela específica**, sem antes cruzar: CNPJ, exercício, programa/ação-parcela, valor, data, documento/OB e conta destinatária.

Há presença de eventos internos do banco e de movimentações automáticas (`RESGATE AUTOMATICO`, `APLICACAO BB RF`, `PAGTO CARTAO CREDITO`) que exigem tratamento distinto de ordem bancária do FNDE.

## Próximo passo técnico

Extrair texto estruturado do PDF para modelar evidências transacionais, separar créditos do FNDE, identificar possíveis ordens/documentos e avaliar se existe chave documental suficiente para conciliação estrita com o PDDEInfo.
