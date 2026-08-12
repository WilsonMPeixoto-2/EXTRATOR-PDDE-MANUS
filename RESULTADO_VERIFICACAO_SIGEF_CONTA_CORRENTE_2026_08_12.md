# Verificação controlada — SIGEF Conta Corrente

**Data da verificação:** 12/08/2026  
**Fonte:** https://www.fnde.gov.br/sigefweb/default/conta-corrente/extrato-conta-corrente  
**Estado:** formulário público acessível, mas bloqueado por reCAPTCHA antes do envio; retorno de dados e chave de conciliação não comprovados.

## Evidência observada

O formulário público foi carregado e exige, no mínimo, **mês/ano inicial**, **CNPJ**, **banco** e **programa**. O seletor de programa contém o código `02 — Programa Dinheiro Direto na Escola`.

O HTML do próprio formulário confirma que o botão de confirmação começa desabilitado e que um componente **reCAPTCHA** é exibido quando mês/ano e CNPJ são preenchidos. Portanto, não há consulta autônoma legítima disponível sem resolver o controle externo.

## Limites preservados

Esta verificação apenas comprova a disponibilidade do formulário e o bloqueio por reCAPTCHA. Não comprovou retorno para uma combinação de parâmetros, cobertura para as 163 unidades, estrutura de exportação, programa/parcela, OB ou conta destinatária. Portanto, a fonte permanece bloqueada por controle externo e não é usada para preencher conta, pagamento ou crédito no resultado principal do PDDEInfo.

## Efeito operacional

O Excel e a auditoria da 4ª CRE continuam baseados no PDDEInfo. Qualquer evidência SIGEF futura deverá ser preservada por execução e associada somente quando a chave documental completa estiver disponível.
