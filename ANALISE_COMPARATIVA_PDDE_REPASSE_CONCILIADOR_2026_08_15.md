# Análise crítica — `pdde-repasse-conciliador`

**Data da revisão:** 15/08/2026  
**Objeto:** repositório `WilsonMPeixoto-2/pdde-repasse-conciliador` e análise comparativa recebida.  
**Método:** leitura estática da `main`, documentação, migrations, adaptadores, orquestrador e testes selecionados. Não foram executadas rotinas de coleta nem migrations do repositório externo.

## Conclusão executiva

> O repositório contém contribuições técnicas reais e úteis, sobretudo no tratamento monetário em centavos, no encadeamento de hashes para eventos, nas proteções do adaptador SIGEF e na regra de nunca publicar um retrato corrente a partir de execução parcial. Ele **não** é uma base pronta para substituir o sistema publicado da 4ª CRE: a própria documentação declara ausência de banco Supabase dedicado, serviço institucional implantado e frontend fiscal publicado. [1]

A incorporação correta é **seletiva**. Devemos adotar padrões verificáveis e compatíveis com as regras do projeto atual, sem importar conclusões financeiras, dados históricos não preservados no repositório, arquitetura inteira, ou uma planilha de nove abas incompatível com o contrato fixo da ferramenta.

## Verificação das alegações principais

| Afirmação do comparativo | Verificação realizada | Veredito | Consequência para o Extrator |
|---|---|---|---|
| Dinheiro é tratado em centavos inteiros com soma segura. | `sumMoneyCents` usa `BigInt` internamente e retorna `number` somente após validar o intervalo seguro. [2] | **Confirmada** | Adotar o padrão no parser, validações, conciliação e workbook. |
| Há trilha append-only com cadeia SHA-256. | A migration cria `previous_hash`/`event_hash`, bloqueia `UPDATE`, `DELETE` e `TRUNCATE`, serializa escrita por advisory lock e implementa verificação da cadeia. [3] | **Confirmada em código, não implantada** | Aproveitar como endurecimento forense, adaptado ao banco atual. |
| O coletor SIGEF possui robustez adicional. | Há fallback UTF-8/Windows-1252, limite de 8 MiB, timeout, retentativas e interrupção explícita diante de CAPTCHA. [4] | **Confirmada** | Reaproveitar guardas de tamanho/charset e testes; manter a classificação apenas como sugestão auxiliar. |
| A paginação SIGEF e a cobertura integral de contas estão comprovadas. | O código só considera completo quando o total declarado coincide com as linhas coletadas. [4] A documentação afirma 284/284 contas, mas não há artefatos brutos, XLSX ou JSON dessa rodada versionados no repositório para auditoria independente. [1] | **Parcialmente confirmada** | Não importar os 284 resultados como fato do sistema atual sem reexecução e preservação dos artefatos. |
| Existe fila, worker, API e read model fiscal institucional prontos para uso. | Há contratos, executor e migrations; a documentação declara que Supabase dedicado, backend implantado e frontend fiscal publicado ainda não existem. [1] | **Implementado em código; não operacionalmente implantado** | Usar os padrões de job e publicação atômica, não migrar infraestrutura sem necessidade. |
| Há monitoramento SSE/WebSocket pronto. | O arquivo `backend/realtime.ts` apenas trata conexão/desconexão e retorna HTTP 200; não emite eventos granulares de monitoramento. [5] | **Não confirmado** | Não tratar SSE como componente disponível para portabilidade. |
| O Excel Fiscal v3 de nove abas é melhoria direta. | O gerador tem proteção contra fórmula e validação estrutural, mas nove abas conflitam com o requisito deste projeto de manter exatamente `Financeiro 4ª CRE V2` e `Validação V2`. [6] | **Parcialmente aproveitável** | Reutilizar proteção de fórmula e testes; não copiar a estrutura de nove abas. |

## Contribuições prioritárias

| Prioridade | Contribuição | Incorporação proposta | Limite obrigatório |
|---|---|---|---|
| **Alta** | Centavos inteiros | Criar tipo/funções `parseCurrencyToCents`, `formatCents`, soma e comparação sem `Float64`; guardar valores financeiros críticos como inteiros em centavos. | A migração deve ser acompanhada de regressão do Excel e dos dados já aprovados. |
| **Alta** | Segurança do Excel | Escapar texto iniciado por `=`, `+`, `-` ou `@` antes de qualquer célula gerada a partir de fonte externa. [6] | Não modificar campos financeiros numéricos ou contas identificadas como texto. |
| **Alta** | Publicação somente após cobertura integral | Reforçar a regra atual: nenhum retrato/Excel corrente pode ser substituído por lote parcial, execução SIGEF complementar ou importação CGU isolada. [7] | O PDDEInfo aprovado continua a referência principal. |
| **Média** | Guardas do parser SIGEF | Limite explícito de bytes, fallback de charset, falha clara para conteúdo inesperado e teste de CAPTCHA. [4] | Não reintroduzir paginação não comprovada onde a rota `visualizaexcel` já fornece o arquivo integral. |
| **Média** | Cadeia de eventos verificável | Acrescentar `previousHash`, `eventHash` e verificador no histórico imutável existente. [3] | É melhoria de integridade; não substitui artefatos brutos nem autorização de fonte. |
| **Média** | Snapshot fiscal de leitura | Criar projeção atual derivada apenas da execução PDDEInfo completa aprovada, para acelerar a auditoria. [8] | A projeção é descartável e nunca é fonte primária. |

## Pontos que não devem ser incorporados como estão

O classificador externo transforma texto de histórico SIGEF em categorias como tarifa, aplicação, pagamento ou rendimento. Embora seja uma organização útil, continua dependente de heurísticas textuais. No sistema da 4ª CRE, qualquer eventual uso deve ser rotulado como **classificação auxiliar**, preservando o histórico literal e sem conclusão sobre regularidade de despesa, tarifa indevida, saldo ou prestação de contas. [4]

Também não é apropriado adotar automaticamente os códigos `0A`, `0B` e `Z9` ou considerar a coleta de 284 contas do outro repositório como evidência local. O projeto atual já decidiu restringir o conector produtivo ao que foi validado independentemente. Uma ampliação deve ocorrer por piloto próprio, com arquivo bruto, chave de vínculo e cobertura demonstrável.

O `run-monitoring.ts` externo tem valor como referência de composição de etapas, porém não resolve por si só a retomada de uma execução: ele remove e recria o diretório de trabalho no início da rodada. [9] A fila descrita no repositório depende da infraestrutura Supabase ainda não implantada. Para o site atual, a fila persistida proposta para PDDEInfo e CGU continua sendo o caminho adequado.

## Avaliação do material anexado

O comparativo identifica corretamente três melhorias materiais: precisão monetária, separação entre visão técnica e humana, e publicação condicionada à cobertura completa. Ele exagera quando qualifica o backend comparado como plenamente operacional, quando trata SSE como pronto e quando apresenta a coleta integral SIGEF como fato independente sem artefatos versionados para inspeção.

> A melhor síntese não é “fundir dois projetos”, mas manter o **Extrator PDDE 4ª CRE** como sistema publicado e evoluí-lo com padrões específicos verificáveis do repositório comparado.

## Evolução após a análise

Em 15/08/2026, os dois primeiros padrões priorizados foram incorporados ao Extrator: o parser passou a converter moeda brasileira por centavos inteiros antes de materializar o valor para apresentação; e o workbook passou a neutralizar texto externo iniciado por `=`, `+`, `-` ou `@`, impedindo interpretação como fórmula. Os testes cobrem centavos, entrada inválida e células de conteúdo externo, preservando as abas obrigatórias e a semântica financeira. Validação técnica: 107 testes, tipagem e build aprovados.

## Próximas evoluções seletivas

1. Introduzir a publicação de uma visão corrente somente após execução PDDEInfo integral aprovada.
2. Incorporar os guardas de resposta/charset do SIGEF e testar contra os artefatos já preservados.
3. Avaliar a cadeia SHA-256 como incremento posterior, junto com a fila persistida de importação PDDEInfo/CGU.

## Referências

[1]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/README.md "README do repositório comparado"
[2]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/backend/core/money.ts "Tratamento monetário em centavos"
[3]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/supabase/migrations/20260813050000_evidence_events.sql "Cadeia de evidências e hash SHA-256"
[4]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/backend/adapters/sigef-public-statement.ts "Adaptador público de extrato SIGEF"
[5]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/backend/realtime.ts "Módulo de tempo real"
[6]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/backend/report/reconciliation-workbook.ts "Proteção de fórmulas e workbook de conciliação"
[7]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/backend/application/institutional-job-executor.ts "Bloqueio de publicação para monitoramento parcial"
[8]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/supabase/migrations/20260815033500_current_fiscal_read_model.sql "Read model fiscal corrente"
[9]: https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/blob/main/backend/application/run-monitoring.ts "Orquestrador de monitoramento"
