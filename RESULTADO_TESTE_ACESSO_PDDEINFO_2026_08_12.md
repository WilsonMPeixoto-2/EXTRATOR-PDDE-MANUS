# Resultado do teste controlado de acesso ao PDDEInfo

## Consulta executada

- **Data/hora da verificação:** 12/08/2026, aproximadamente 12:52 GMT-3.
- **URL consultada:** `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar/ano/2026/co_escola/33069247/cnpj//co_esfera_adm/2/sg_uf/RJ/co_municipio_fnde/330455/consultar/Consultar/page/1`.
- **INEP:** `33069247`.
- **Unidade retornada:** `0410001 EM EMA NEGRAO DE LIMA`.

## Resultado técnico

A consulta pública individual carregou sem CAPTCHA, autenticação ou arquivo auxiliar. Após abrir os detalhes da unidade, a página expôs a identificação escolar, a UEx e CNPJ, a tabela de dados bancários e a tabela de destinações/repasses de 2026.

A linha bancária retornada tinha o rótulo **PDDE QUALIDADE**, agência `0249` e conta `0000546402`. Portanto, conforme a regra de vinculação estrita, esses dados não podem preencher agência ou conta do PDDE Básico.

A mesma resposta apresentou as destinações de PDDE Básico – 1ª e 2ª parcelas, incluindo valor final devido, valor pago e data de ordem de pagamento. O valor pago apresentado é evidência de pagamento registrado no PDDEInfo, não confirmação de crédito bancário.

## Decisão operacional

O resultado confirma que o roteiro HTTP por INEP é apropriado para a coleta prioritária das 163 escolas da 4ª CRE. A execução completa deve preservar HTML bruto, JSON normalizado, hash SHA-256, horário de consulta e validações por campo para cada unidade.

O SIGEF permanece apenas como fonte complementar e não é pré-requisito para essa coleta primária.
