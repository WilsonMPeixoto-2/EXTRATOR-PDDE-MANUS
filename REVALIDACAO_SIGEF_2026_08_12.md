# Revalidação técnica das consultas SIGEF

Data da verificação: **12/08/2026**.

| Consulta oficial | URL verificada | Campos públicos identificados | Resultado operacional | Decisão de integração |
|---|---|---|---|---|
| Liberações | `https://www.fnde.gov.br/sigefweb/index.php/liberacoes` | exercício, programa, CNPJ, UF, município e tipo de entidade | A página expõe formulário público, mas a própria orientação exige CAPTCHA. | **Não automatizar sem canal oficial autorizado.** Registrar como bloqueio externo, sem contorno. |
| Extrato de conta corrente | `https://www.fnde.gov.br/sigefweb/default/conta-corrente/extrato-conta-corrente` | mês/ano inicial, CNPJ, banco e programa | Formulário público identificado; a consulta exige combinação de parâmetros e precisa de piloto controlado, por CNPJ e programa. | **Piloto pendente.** Não associar a pagamentos nem a contas antes de evidência documentada. |
| Extratos gerais | `https://www.fnde.gov.br/sigefweb/index.php/extratos` | exercício, programa, mês inicial e mês final | Formulário público identificado, sem chave escolar/CNPJ visível no formulário inicial. | **Piloto pendente.** Não é fonte suficiente para vínculo por escola sem confirmar o resultado e sua chave. |

> A existência de formulário público não autoriza contornar CAPTCHA nem inferir que uma consulta pode ser executada de forma autônoma em produção. Enquanto a liberação oficial depender de CAPTCHA, o sistema deve preservar o estado de bloqueio, a URL e a data da verificação.

As páginas confirmam que as consultas oficiais existem e indicam os parâmetros de entrada. Elas não comprovam, nesta etapa, disponibilidade de rota sem CAPTCHA, formato estável de retorno, cobertura por escola nem chave completa para conciliação. Nenhum dado do SIGEF será usado para completar agência, conta, ordem bancária ou crédito sem a correspondência documentada de CNPJ, exercício, programa/parcela, valor, data, OB, banco, agência e conta.
