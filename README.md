# Extrator Financeiro PDDEInfo — 4ª CRE

Aplicação institucional para coleta seletiva, validação, auditoria e conciliação de dados financeiros das unidades da **4ª Coordenadoria Regional de Educação do Rio de Janeiro**. O foco é a rastreabilidade por campo e a preservação de evidências, não a substituição silenciosa entre fontes.

## Escopo operacional

| Componente | Situação | Regra de segurança |
|---|---|---|
| PDDEInfo | Coleta autônoma por INEP | HTML bruto, JSON normalizado, hashes e proveniência por campo são preservados por execução. |
| Excel V2 | Geração condicionada e analítica | O download só é liberado após validações obrigatórias; as abas são `Financeiro 4ª CRE V2` e `Validação V2`. A primeira prioriza PDDE Básico, parcelas e contas; a segunda concentra proveniência e validação. |
| Conta PDDE Básico | Associação estrita | Agência e conta somente são preenchidas quando o rótulo bancário é exatamente `PDDE`. |
| SIGEF | Integração restrita | Liberações permanece bloqueada por CAPTCHA; fontes em piloto não são usadas para completar dados. |
| Dados Abertos FNDE | Controle secundário | Arquivo importado é versionado por hash, URL, datas, exercício, cobertura e completude; não substitui a fonte primária. |

> **Semântica financeira:** “Pagamento registrado no PDDEInfo” não confirma crédito bancário. Crédito, estorno e divergência somente são classificados quando houver evidência compatível e documentada.

## Estado operacional de referência

| Item | Situação registrada |
|---|---|
| Execução aprovada | `5fffa6d9-a598-437c-8399-f6b6c0c74a57` |
| Cobertura | 163 de 163 escolas da lista-mestre |
| PDDE Básico — 1ª parcela com pagamento registrado | 111 escolas |
| PDDE Básico — 2ª parcela prevista | 163 escolas |
| Conta PDDE Básico informada pelo PDDEInfo | 116 escolas; 47 ausências preservadas como ausência da fonte |
| Site oficial | [pddeinfo4cre-zn9f2kak.manus.space](https://pddeinfo4cre-zn9f2kak.manus.space/) |

O botão de download da tela inicial recupera a última execução aprovada, inclusive em nova sessão. Na auditoria, o clique no INEP abre o dossiê da escola com parcelas, contas, valores, observações e artefatos; uma atualização de página não elimina a execução persistida.

## Pré-requisitos

Use Node.js 22 e pnpm. O ambiente de produção injeta a conexão de banco, autenticação e armazenamento gerenciado; não crie nem versione arquivos `.env`.

```bash
pnpm install
pnpm test
pnpm check
pnpm dev
```

Para mudanças de banco, atualize `drizzle/schema.ts`, gere a migração e revise o SQL antes de aplicá-lo no ambiente autorizado.

```bash
pnpm drizzle-kit generate
```

## Auditoria e evidências

Cada execução preserva consultas escolares, artefatos, observações normalizadas, resultados de validação, achados históricos e eventos append-only. A página `/auditoria` permite filtrar execuções, escolas, programas e campos; abrir artefatos assinados; e comparar observações de duas execuções sem sobrescrever a evidência anterior.

O controle secundário de Dados Abertos é registrado pela rota autenticada `POST /api/pdde/audit/run/:runId/open-data`. A entrada deve fornecer conteúdo codificado, URL de origem HTTPS, horário de obtenção, atualização declarada, exercício, colunas, total de linhas e escolas da lista-mestre encontradas. O arquivo é armazenado como `open_data_file` e reaparece no detalhe da execução auditável.

## Testes

A suíte cobre, entre outros aspectos, lista-mestre, parser, vínculo bancário estrito, schema, aritmética, histórico de pagamentos, conciliação por múltiplos componentes, rotas protegidas, auditoria por campo, dados abertos e geração do Excel. A fixture de teste baseada em estrutura pública do PDDEInfo foi anonimizada: não contém INEP, CNPJ, unidade, UEx ou evidência bruta identificável.

Antes de publicar uma mudança, execute:

```bash
pnpm test
pnpm check
pnpm build
```

## Dependências e ferramentas

O projeto usa Node.js 22, pnpm 10, TypeScript, Vitest, Vite, React, Express, tRPC, Drizzle e ExcelJS. Atualizações de segurança compatíveis são aplicadas com testes, tipagem e compilação; atualizações maiores de framework são avaliadas separadamente para não comprometer a coleta, o banco, a autenticação ou a trilha de auditoria.

As configurações `overrides` e `patchedDependencies` do pnpm ficam em `pnpm-workspace.yaml`, no formato suportado pelas versões atuais do gerenciador. A revisão de 12/08/2026 atualizou Axios, Express 4, Drizzle, tRPC e nanoid; removeu dois SDKs AWS sem importação no código e registrou alertas transitivos remanescentes em `REVISAO_TECNICA_DEPENDENCIAS_2026_08_12.md`.

## Segurança de publicação

O repositório não deve conter credenciais, `.env`, evidências brutas, arquivos de storage, exportações operacionais, logs, screenshots, planilhas baixadas ou artefatos de navegador. Esses itens são excluídos por `.gitignore`; revise também o histórico antes de publicar. O código nunca deve implementar contorno de CAPTCHA, nem automatizar acesso que exija autorização institucional.

## Repositório de publicação

O único destino aprovado para este código é o repositório existente [`WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`](https://github.com/WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS). Não reutilize nem envie este projeto a repositórios de outros sistemas. Antes de qualquer nova publicação, execute `pnpm test`, `pnpm check` e a revisão de arquivos rastreados prevista na seção anterior.

## Documentos técnicos

- `CONTRATO_OPERACIONAL_PRODUCAO.md`: regras de coleta, validação e liberação.
- `AUDITORIA_POR_CAMPO.md`: arquitetura de logs, proveniência e dossiê por campo.
- `MATRIZ_VIABILIDADE_TECNICA.md`: capacidades e restrições por fonte.
- `REVALIDACAO_SIGEF_2026_08_12.md`: resultado da revalidação das consultas SIGEF.
- `VALIDACAO_DADOS_ABERTOS_FNDE.md`: papel e requisitos do controle secundário por arquivo.
- `RESULTADO_EXECUCAO_PDDEINFO_4CRE_2026_08_12.md`: resultado e controles da execução aprovada de 163 escolas.
- `GUIA_CONTINUIDADE_PROJETO.md`: arquitetura, rotina operacional, decisões, manutenção e próximos cuidados.
- `REVISAO_TECNICA_DEPENDENCIAS_2026_08_12.md`: inventário de dependências, atualizações aplicadas e riscos transitivos monitorados.
