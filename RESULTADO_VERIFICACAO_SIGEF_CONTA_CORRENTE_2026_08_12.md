# Verificação controlada — SIGEF Conta Corrente

**Data da verificação:** 12/08/2026  
**Fonte:** https://www.fnde.gov.br/sigefweb/default/conta-corrente/extrato-conta-corrente  
**Estado:** formulário público acessível; retorno de dados e chave de conciliação ainda não comprovados.

## Evidência observada

O formulário público foi carregado sem CAPTCHA visível. A consulta exige, no mínimo, **mês/ano inicial**, **CNPJ**, **banco** e **programa**. O seletor de programa contém o código `02 — Programa Dinheiro Direto na Escola`.

## Limites preservados

Esta verificação apenas comprova a disponibilidade do formulário. Não comprovou retorno para uma combinação de parâmetros, cobertura para as 163 unidades, estrutura de exportação, programa/parcela, OB ou conta destinatária. Portanto, a fonte permanece em estado de **piloto pendente** e não é usada para preencher conta, pagamento ou crédito no resultado principal do PDDEInfo.

## Efeito operacional

O Excel e a auditoria da 4ª CRE continuam baseados no PDDEInfo. Qualquer evidência SIGEF futura deverá ser preservada por execução e associada somente quando a chave documental completa estiver disponível.
