# Guia de continuidade técnica — Extrator Financeiro PDDEInfo 4ª CRE

## 1. Propósito e princípio de operação

Este repositório mantém uma ferramenta institucional da GAD/4ª CRE para consultar os 163 INEPs selecionados no PDDEInfo, gerar uma visão financeira conferível e preservar a evidência de cada dado. A fonte primária é o PDDEInfo. SIGEF, Dados Abertos e extratos não preenchem campos automaticamente e não bloqueiam a coleta principal.

> **Regra de interpretação:** “Pagamento registrado no PDDEInfo” é uma ordem ou registro exibido pela fonte. Não representa, isoladamente, crédito bancário confirmado.

## 2. Arquitetura operacional

| Camada | Componentes principais | Responsabilidade |
|---|---|---|
| Interface | React, Tailwind, páginas `Home.tsx` e `Audit.tsx` | Iniciar consulta, recuperar última execução, baixar Excel e abrir dossiês por INEP. |
| API | Express e rotas `server/pdde/routes.ts` | Autenticação, limites, SSE de progresso, auditoria e artefatos assinados. |
| Coleta | `server/pdde/run.ts`, `parser.ts`, `sources.ts` | Consulta individual, retentativa, parsing versionado e bloqueio explícito de fonte não permitida. |
| Dados | Drizzle e tabelas de execução, consulta, observação, evento, achado e artefato | Histórico imutável e rastreabilidade por campo. |
| Evidência | Armazenamento gerenciado | HTML bruto, JSON normalizado, workbook e arquivos auxiliares por chave e SHA-256. |
| Entrega | `workbook.ts` | Excel V2 com duas abas obrigatórias e gates bloqueantes. |

## 3. Rotina de consulta e entrega

1. A tela inicial valida a lista-mestre de 163 INEPs e inicia uma execução autenticada.
2. O servidor consulta cada INEP, persiste HTML, JSON normalizado, hash, consulta e eventos antes da finalização global.
3. Validações de cobertura, unicidade, schema, aritmética, semântica, baseline e conta PDDE Básico determinam se o Excel pode ser liberado.
4. Uma execução aprovada é preservada. A tela inicial recupera a última versão aprovada mesmo depois de atualização de página ou nova sessão.
5. O clique no INEP na auditoria abre o dossiê com valores, parcelas, contas, fonte, evidência e artefatos correspondentes.

Se o servidor for reiniciado durante uma coleta, a execução persistida é marcada como interrompida ao ser recuperada; as evidências já gravadas não são apagadas. Uma nova execução é necessária para gerar Excel aprovado.

## 4. Excel V2 e leitura financeira

As abas permanecem exatamente `Financeiro 4ª CRE V2` e `Validação V2`.

| Aba | Finalidade | Ordem de leitura |
|---|---|---|
| `Financeiro 4ª CRE V2` | Análise financeira diária | Unidade, conta PDDE Básico, 1ª parcela, 2ª parcela, contas complementares e demais ações de 2026. |
| `Validação V2` | Metadados, explicações e auditoria | Controles globais, URL e horário de consulta, programas encontrados, exceções, fonte/status da conta PDDE Básico, evidência de parcelas e completude de fontes. |

O rótulo bancário exato `PDDE` é exibido como **PDDE Básico**. As contas `PDDE Qualidade`, `PDDE Equidade` e `Educação Integral` aparecem em seus próprios campos e nunca completam a conta do Básico. Na execução aprovada de referência, 116 contas do Básico foram informadas; 47 ausências ficaram vazias por decisão de integridade de fonte.

## 5. Execução aprovada de referência

| Indicador | Resultado |
|---|---:|
| ID da execução | `5fffa6d9-a598-437c-8399-f6b6c0c74a57` |
| Escolas consultadas com sucesso | 163 |
| 1ª parcela do PDDE Básico com pagamento registrado | 111 |
| 2ª parcela do PDDE Básico prevista | 163 |
| Falhas críticas de schema | 0 |
| Destinações desconhecidas/ambíguas | 0 |

O Excel analítico pode ser reconstruído sem nova consulta externa a partir dos JSONs normalizados da execução aprovada usando `scripts/rebuild-approved-workbook.mjs`. O utilitário exige execução aprovada e interrompe a operação se algum JSON necessário estiver ausente.

## 6. Manutenção técnica

Use Node.js 22 e pnpm 10. Antes de qualquer checkpoint ou publicação, rode:

```bash
pnpm test
pnpm check
pnpm build
```

Nunca versione `.env`, arquivos de evidência bruta, exportações operacionais, logs ou artefatos baixados. Configurações de `overrides` e patches do pnpm ficam em `pnpm-workspace.yaml`. Atualizações maiores de Vite, Vitest, Recharts, Streamdown ou Express exigem avaliação dedicada, pois podem alterar contratos de interface ou dependências transitivas.

## 7. Fontes complementares e limites

O piloto de movimentação SIGEF por PDF autorizado foi processado como evidência parcial. A rota **legada** de Liberações SIGEF foi habilitada como piloto operacional limitado: em cada execução, consulta até cinco UEx com CNPJ confirmado e pagamento básico registrado, guarda HTML/JSON/hash e só produz a evidência `OB_CORROBORADA_CREDITO_NAO_LOCALIZADO` quando CNPJ, parcela, data e valor coincidem com o PDDEInfo. OB, banco, agência e conta permanecem atributos da fonte SIGEF; não preenchem `Dados Bancários` do PDDEInfo. Valor, OB ou identidade bancária conflitantes geram `DIVERGENCIA_ENTRE_FONTES` e bloqueiam a associação.

O detalhamento público de extrato SIGEF do programa `02` usa a página de identidade e a exportação integral `visualizaexcel`, com limite de quinze UEx elegíveis por execução e grupos de até três consultas simultâneas. A formação do próximo lote exclui UEx já concluídas. A política atual prioriza somente **2026**; **2025** pode ser consultado como apoio, mas períodos anteriores ou futuros são rejeitados antes de qualquer chamada externa. Cada retorno preserva página de detalhamento, arquivo HTML/XLS integral, JSON normalizado e hash; cobertura incompleta impede conciliação. Os formulários protegidos de Conta Corrente e demais interfaces que acionem reCAPTCHA continuam não automatizados.

O backlog futuro de fontes externas é não bloqueante. A operação PDDEInfo, o Excel e a auditoria devem continuar disponíveis independentemente de SIGEF.

## 8. Referências internas

| Documento | Uso |
|---|---|
| `CONTRATO_OPERACIONAL_PRODUCAO.md` | Regras de produção e gates de liberação. |
| `AUDITORIA_POR_CAMPO.md` | Proveniência, evidência e dossiê por campo. |
| `RESULTADO_EXECUCAO_PDDEINFO_4CRE_2026_08_12.md` | Resultados da execução aprovada. |
| `REVISAO_TECNICA_DEPENDENCIAS_2026_08_12.md` | Atualizações aplicadas e alertas transitivos monitorados. |
| `MATRIZ_VIABILIDADE_TECNICA.md` | Estado e limites de cada fonte. |
