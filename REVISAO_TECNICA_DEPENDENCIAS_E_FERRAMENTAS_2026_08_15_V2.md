# Revisão técnica de dependências e ferramentas — 15/08/2026

**Sistema:** Extrator Financeiro PDDEInfo — 4ª CRE  
**Escopo:** segurança de dependências de produção, compatibilidade do runtime, ferramentas de importação auditável e adequação ao fluxo PDDEInfo/CGU/SIGEF.

## Síntese executiva

A revisão identificou que a maior parcela dos alertas de produção não vinha do núcleo de extração, banco ou Excel, mas de dois componentes de modelo sem uso nas rotas ativas: renderização genérica de Markdown e gráficos. Foi aplicada uma atualização dirigida de `streamdown` de `1.4.0` para `2.5.0` e removida a dependência direta `recharts`, juntamente com o componente de gráfico não referenciado. A auditoria de produção caiu para **uma única vulnerabilidade moderada**, transitiva de `exceljs > uuid`; `exceljs 4.4.0` já é a versão publicada mais recente e não há correção compatível disponível sem substituir ou atualizar o próprio fornecedor.

Também foi incorporado `csv-parse 7.0.2` ao importador CGU. A mudança substitui a leitura manual por linha física por parser de fluxo com suporte a delimitador, aspas escapadas e quebra de linha dentro de campos. A regra financeira permanece idêntica: apenas registros da CGU com SIAFI `26298`, ação `0515` e CNPJ já comprovado na referência PDDEInfo completa podem ser persistidos.

| Indicador | Antes da revisão | Após a revisão |
|---|---:|---:|
| Alertas de produção | Cadeias vulneráveis em `streamdown > mermaid` e `recharts > lodash`, além de `exceljs > uuid` | 1 vulnerabilidade moderada residual em `exceljs > uuid` |
| Parser CSV CGU | Leitura manual de linha física | Parsing em fluxo por registros CSV lógicos |
| Recharts | Dependência e componente de modelo sem rota ativa | Removidos, sem impacto funcional |
| Regressão automatizada | 112 testes | 113 testes aprovados |

## Alterações aplicadas e justificativa

| Item | Decisão | Justificativa técnica | Resultado validado |
|---|---|---|---|
| `streamdown` | Atualizado de `1.4.0` para `2.5.0` | A versão anterior resolvia `mermaid`, `dompurify`, `lodash-es` e outros transitivos em versões com alertas. A atualização preserva compatibilidade declarada com React 19 e atualiza essa cadeia para resoluções sem os alertas anteriores. | Compilação, build e regressão aprovados. |
| `recharts` e `components/ui/chart.tsx` | Removidos | O componente era um artefato não referenciado por nenhuma rota ativa. Sua cadeia trazia `lodash` vulnerável e a atualização para v3 exigia adaptar API de componentes que não fazem parte do sistema. | Nenhuma rota ou importação ativa usa gráficos; tipagem aprovada. |
| `csv-parse` | Instalado e integrado (`7.0.2`) | O importador CGU precisa interpretar CSV público em fluxo, inclusive registros com aspas, escapes e quebras de linha internas. A biblioteca segue a API `Transform` de Node e não adiciona dependências externas. [1] | Novo teste cobre campo entre aspas, escape e quebra de linha; regras CNPJ/centavos preservadas. |
| `unzipper` | Mantido em `0.12.5` | É a versão mais recente disponível e mantém leitura por fluxo, adequada ao ZIP público mensal. [2] | Não houve alteração de comportamento de extração. |
| `yauzl` | Não instalado | Apesar de oferecer validação de entradas, demanda acesso aleatório ao ZIP e teve vulnerabilidade de disponibilidade reportada em 2026. Não há ganho proporcional ao custo de reestruturar o fluxo HTTP atual. [3] | Decisão de não adoção registrada. |

## Segurança residual e limites conhecidos

O único alerta de produção restante está na dependência transitiva `uuid 8.3.2`, trazida por `exceljs 4.4.0`. O alerta diz respeito à escrita em buffer externo nas APIs UUID v3/v5/v6; o projeto não chama tais APIs diretamente. Ainda assim, o alerta permanece registrado porque a correção exige `uuid >= 11.1.1`, enquanto a versão estável atual de `exceljs` continua declarando `uuid ^8.3.0`. [4]

> **Decisão:** não forçar `uuid` por override. Uma substituição transitiva fora da faixa declarada pelo fornecedor poderia comprometer a geração do Excel auditável, que é produto central do sistema. A revisão deve ser reaberta quando o ExcelJS publicar versão que eleve essa dependência ou quando uma migração de biblioteca de planilhas puder ser testada com todos os arquivos de validação.

## Atualizações pesquisadas e deliberadamente adiadas

| Grupo | Situação disponível | Decisão | Motivo |
|---|---|---|---|
| Express | 4.22.2 → 5.2.1 | Adiada | Migração principal de servidor; requer revisão de middleware, erro assíncrono e rotas autenticadas. |
| Vite e plugin React | 7.1.9 → 8.2.1; plugin 5 → 6 | Adiada | Atualização de build deve ser isolada, especialmente porque o plugin de instrumentação já possui peer dependency divergente. |
| Vitest | 2.1.9 → 4.1.10 | Adiada | Migração de infraestrutura de testes, sem benefício imediato para confiabilidade financeira. |
| TypeScript | 5.9.3 → 7.0.2 | Adiada | Salto de major requer revisão de tipos de Drizzle, tRPC, React e componentes do modelo. |
| Expressões de UI e formulário | Atualizações menores disponíveis | Adiada em lote | Não corrigem risco crítico no núcleo e devem ser agrupadas após uma janela específica de testes visuais. |
| `pino`, filas, browser automation adicional | Não instalados | Sem necessidade atual | O sistema já possui trilha de auditoria persistida, coleta determinística e ferramentas de navegador fora do runtime. Adicionar infraestrutura sem uma necessidade mensurável aumentaria superfície de manutenção. |

## Próximas melhorias técnicas recomendadas

A prioridade seguinte não é instalar mais bibliotecas genéricas. É aplicar limites explícitos ao ZIP CGU antes de ampliar a frequência de atualização: tipo MIME esperado, tamanho comprimido máximo, apenas uma entrada CSV, extensão aceita e teto de bytes descompactados. Isso reduz risco de arquivo inesperado sem trocar a biblioteca de streaming atual.

Em segundo lugar, a retenção independente do ZIP CGU deve ser implementada no armazenamento de objetos, junto do hash já preservado. Isso reforça a cadeia de custódia e permite reproduzir importações se a origem pública modificar arquivos históricos.

Por fim, atualizações maiores devem ser programadas como migrações isoladas: primeiro Vite/plugin, depois Vitest, e somente então Express ou TypeScript. Cada uma deve ter checkpoint próprio, tipagem, 113 testes, build, verificação visual e validação do Excel antes de publicação.

## Referências

[1]: https://www.npmjs.com/package/csv-parse "csv-parse — parser CSV com API de fluxo Node.js"

[2]: https://www.npmjs.com/package/unzipper "unzipper — leitura ZIP por fluxo"

[3]: https://www.npmjs.com/package/yauzl "yauzl — princípios, validação de tamanho e uso de acesso aleatório"

[4]: https://github.com/advisories/GHSA-w5hq-g745-h8pq "uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided"
