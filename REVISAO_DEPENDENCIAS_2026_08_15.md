# Revisão de dependências e ferramentas — 15/08/2026

## Resultado

Foi executada auditoria de versões e vulnerabilidades do grafo de dependências. O relatório do gerenciador identificou 91 alertas transitivos: 2 críticos, 28 altos, 55 moderados e 6 baixos. A maior parte está ligada a ferramentas de desenvolvimento, pacotes transitivos e versões principais posteriores que não podem ser atualizadas por incremento semver automático.

## Atualização aplicada

Foi adicionada e atualizada a dependência de desenvolvimento `baseline-browser-mapping` para a versão atual publicada pelo registro. A atualização elimina o aviso de base de compatibilidade desatualizada emitido pelo ambiente de desenvolvimento, sem alterar o código de negócio, o runtime de produção ou a estrutura do workbook.

## Mudanças deliberadamente adiadas

As versões mais recentes de Vite, Vitest, Express, React, Recharts, pnpm, TypeScript e alguns componentes de interface exigem mudança principal de versão. Essas atualizações não foram aplicadas automaticamente porque podem modificar APIs, resolução de módulos, comportamento de build, tipagem ou componentes visuais. A atualização de `@builder.io/vite-plugin-jsx-loc` também requer atenção: o pacote mantém peer dependency declarada para Vite 4 ou 5, enquanto o projeto já executa Vite 7.

O aviso de `recharts` descontinuado foi registrado. Como os gráficos não constituem o fluxo financeiro central, sua migração para Recharts 3 deve ocorrer em tarefa própria, com revisão visual e testes de comportamento.

## Validação posterior

Após a alteração, o servidor de desenvolvimento foi reiniciado. A suíte completa registrou 109 testes aprovados; a verificação TypeScript e o build de produção foram concluídos sem erro. O lockfile foi atualizado junto com a dependência.

## Próxima revisão recomendada

Uma revisão maior deve ser planejada por grupos de compatibilidade: primeiro as ferramentas de build e teste; depois componentes de interface; e somente então runtime de servidor. Cada grupo requer checkpoint, testes e verificação visual independentes.
