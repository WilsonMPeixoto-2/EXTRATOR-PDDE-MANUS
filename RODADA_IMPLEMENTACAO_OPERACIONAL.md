# Rodada de Implementação Operacional por Fases

Data de consolidação: **12/08/2026**.

| Fase | Entrega operacional | Evidência de validação | Checkpoint |
|---|---|---|---|
| Proveniência e coleta | Contrato por campo, HTML/JSON, hash e persistência imutável. | Parser, cadeia de armazenamento e rotas protegidas testados. | `4db0eaaf` e posteriores |
| Qualidade e histórico | Schema, invariantes, bloqueios de download e regressão histórica. | Testes de parsing, aritmética, baseline e liberação. | `75686d38` |
| Conciliação | Chave completa, divergências e múltiplos componentes financeiros. | Testes de ordens, créditos, aplicações, estornos e devoluções. | `fbc76e14` |
| Auditoria | Filtros, dossiê, evidência navegável e comparador histórico. | Testes de filtros e verificação visual. | `4abb0a87` |
| Controle secundário | Arquivo de Dados Abertos validado, versionado e exibido em auditoria. | Migração `0006_naive_marrow.sql`, 56 testes e TypeScript. | a salvar após esta consolidação |

## Controles aplicados em cada fase

As mudanças foram implementadas em sequência, cobertas por testes automatizados, verificadas com `pnpm check` e registradas em checkpoints recuperáveis. A única migração desta rodada amplia `run_artifacts.kind` com o valor não destrutivo `open_data_file`, permitindo preservar arquivos secundários no mesmo contrato imutável dos demais artefatos.

Fontes SIGEF sem acesso comprovado continuam fora do fluxo automatizado. A rodada não altera a regra de associação estrita da conta PDDE Básico, não transforma pagamento registrado em confirmação de crédito e não remove controles de bloqueio de exportação.
