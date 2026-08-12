# Revisão técnica de dependências — 12/08/2026

## Escopo da verificação

Foram executados `pnpm outdated --format json`, `pnpm audit --prod --json` e `pnpm why` no repositório. Esta nota preserva os achados externos iniciais antes de qualquer atualização; nenhuma dependência foi alterada automaticamente.

## Atualizações aplicadas

| Alteração | Situação | Motivo e validação |
|---|---|---|
| `axios` | 1.12.2 → 1.19.0 | Atualização corretiva compatível; a auditoria indicava correção a partir de 1.15.0. |
| `drizzle-orm` | 0.44.6 → 0.45.2 | Atualização menor para tratar o alerta de identificadores SQL. |
| `drizzle-kit` | 0.31.5 → 0.31.10 | Mantido alinhado ao ORM. |
| `express` | 4.21.2 → 4.22.2 | Última linha 4.x; Express 5 não foi adotado sem migração específica. |
| `@trpc/*` | 11.6.0 → 11.18.0 | Atualização dentro da mesma versão maior, acima da versão corretiva indicada pela auditoria. |
| `nanoid` | 5.1.6 → 5.1.16 | Atualização corretiva compatível. |
| SDKs AWS | Removidos | `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` não possuíam importação no código; o armazenamento usa os helpers gerenciados do projeto. |
| Configuração pnpm | Migrada | `overrides` e `patchedDependencies` foram movidos para `pnpm-workspace.yaml`, eliminando o aviso de configuração obsoleta. |

Após as alterações, `pnpm test`, `pnpm check` e `pnpm build` foram aprovados. Nenhuma migração de banco, coleta externa ou alteração de evidência foi executada nesta revisão.

## Cadeias de dependência identificadas

| Componente | Versão resolvida | Cadeia observada | Encaminhamento inicial |
|---|---:|---|---|
| `axios` | 1.19.0 | Dependência direta; `follow-redirects` | Atualizado em 12/08/2026. |
| `drizzle-orm` | 0.45.2 | Dependência direta | Atualizado em 12/08/2026. |
| `express` | 4.22.2 | Dependência direta; `path-to-regexp` e `qs` | Mantido na linha 4.x; alertas transitivos permanecem sob monitoramento. |
| SDKs AWS | Não instalados | Sem importação no projeto | Removidos para reduzir superfície transitiva. |
| `exceljs` | 4.4.0 | Dependência direta; `uuid` 8.3.2 | Avaliar a cadeia sem trocar o gerador de XLSX, pois ele é central à entrega institucional. |
| `recharts` | 2.15.4 | Dependência direta; `lodash` 4.17.21 | Há versão maior disponível; não atualizar sem avaliação da interface, pois o módulo não é central à coleta. |
| `streamdown` | 1.4.0 | Dependência direta; `mermaid` e `dompurify` | Há versão maior disponível e alertas transitivos; verificar uso efetivo no código antes de ampliar a superfície de atualização. |

## Alertas transitivos remanescentes

Após as atualizações, a auditoria de produção deixou de apontar Axios, Drizzle, Express/path-to-regexp, `qs`, `fast-xml-parser` ou `follow-redirects`. Permanecem alertas transitivos de `dompurify`/`mermaid` por `streamdown`, `lodash` por `recharts`, `uuid` por `exceljs` e alguns utilitários de renderização. Não foram aplicadas atualizações maiores de `streamdown`, `recharts`, Vite ou Vitest porque exigem avaliação funcional e não participam do fluxo de coleta PDDEInfo.

> O alerta não é ignorado: ele foi registrado e será reavaliado antes de ativar ou ampliar o uso de componentes de chat, diagramas ou gráficos. O núcleo operacional — coleta, parser, banco, Excel, autenticação e rotas — foi validado após as atualizações compatíveis.

## Critério de decisão

1. Priorizar correções de segurança com versão corretiva compatível e cobertura de testes.
2. Evitar atualizações maiores de framework apenas por estarem disponíveis.
3. Instalar ferramentas novas somente quando reduzirem risco ou aumentarem rastreabilidade de forma comprovável.
4. Manter Node 22, pnpm e o fluxo de testes como base de execução enquanto as atualizações são verificadas.
