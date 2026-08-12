# Validação de Dados Abertos do FNDE como controle secundário

Data da verificação: **12/08/2026**.

O portal institucional do FNDE confirma que a base de Dados Abertos inclui informações do **PDDE**, abrangendo execução financeira, relação de escolas atendidas, saldos de contas e situação de regularidade de prestação de contas. O link institucional encaminha ao catálogo federal de dados abertos sob a organização do FNDE.

| Aspecto | Evidência confirmada | Uso permitido no sistema |
|---|---|---|
| Fonte institucional | Página de Dados Abertos do FNDE e catálogo federal da organização FNDE. | Cadastro de arquivo e metadados como controle secundário. |
| Cobertura anunciada | Execução financeira, escolas atendidas, saldos e regularidade de contas do PDDE. | Comparação auxiliar; não substitui PDDEInfo, SIGEF ou extrato bancário. |
| Exercício e atualização | Devem ser lidos do arquivo e de seus metadados no momento da importação. | Bloquear comparação sem exercício, data de atualização e escopo declarados. |
| Chave de vínculo | Deve ser demonstrada por CNPJ/INEP e demais campos disponíveis no arquivo. | Não preencher conta, pagamento, OB ou crédito com base em arquivo sem correspondência documentada. |

> O arquivo de dados abertos será tratado como **controle secundário importado e versionado**. Antes de participar de qualquer conciliação, o sistema deve registrar URL, hash, data de obtenção, data de atualização declarada, exercício, cobertura e resultado de completude.
