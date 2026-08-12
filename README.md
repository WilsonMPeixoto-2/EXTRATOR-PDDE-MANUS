# Extrator Financeiro PDDEInfo — 4ª CRE

Aplicação institucional para coleta seletiva, validação, auditoria e conciliação de dados financeiros das unidades da **4ª Coordenadoria Regional de Educação do Rio de Janeiro**. O foco é a rastreabilidade por campo e a preservação de evidências, não a substituição silenciosa entre fontes.

## Escopo operacional

| Componente | Situação | Regra de segurança |
|---|---|---|
| PDDEInfo | Coleta autônoma por INEP | HTML bruto, JSON normalizado, hashes e proveniência por campo são preservados por execução. |
| Excel V2 | Geração condicionada | O download só é liberado após validações obrigatórias; as abas são `Financeiro 4ª CRE V2` e `Validação V2`. |
| Conta PDDE Básico | Associação estrita | Agência e conta somente são preenchidas quando o rótulo bancário é exatamente `PDDE`. |
| SIGEF | Integração restrita | Liberações permanece bloqueada por CAPTCHA; fontes em piloto não são usadas para completar dados. |
| Dados Abertos FNDE | Controle secundário | Arquivo importado é versionado por hash, URL, datas, exercício, cobertura e completude; não substitui a fonte primária. |

> **Semântica financeira:** “Pagamento registrado no PDDEInfo” não confirma crédito bancário. Crédito, estorno e divergência somente são classificados quando houver evidência compatível e documentada.

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
