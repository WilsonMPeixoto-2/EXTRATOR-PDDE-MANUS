# Contrato Operacional de Produção

## Escopo da ferramenta

O sistema é uma ferramenta interna da GAD/4ª CRE para coletar dados públicos permitidos, validar informação financeira, preservar evidências e gerar um Excel V2 liberado somente após os controles obrigatórios. Ele não é um painel de marketing, não é uma fonte oficial substituta e não trata pagamento registrado no PDDEInfo como confirmação de crédito bancário.

## Fluxo obrigatório

```text
Lista-mestre validada
  → consulta por fonte autorizada
  → evidência bruta e hash
  → parsing versionado
  → validações por campo e por execução
  → eventos append-only
  → comparação com baseline aprovada
  → achados e exceções
  → gates de exportação
  → Excel V2 rastreável
```

## Contratos de produção

| Contrato | Implementação exigida | Regra de aceitação |
|---|---|---|
| Coleta | Adaptador por fonte, parâmetros explícitos, limite, retentativa, tempo máximo e status. | A resposta ou a falha deve virar evento com URL, horário e motivo. |
| Evidência | HTML/JSON/arquivo original, SHA-256, chave de armazenamento, versão do parser e seletor. | Cada campo financeiro deve apontar para um artefato e uma regra de extração. |
| Semântica | Catálogo de programas, parcelas, destinações e aliases conhecidos. | Rótulo novo, ambíguo ou incompatível bloqueia o campo e abre exceção. |
| Validação | Schema, chaves, data, moeda, conta como texto, invariante aritmética e baseline. | Falha crítica bloqueia a exportação; aviso não é silenciosamente ignorado. |
| Conciliação | Fontes separadas, chave de match documentada e estado de evidência. | Nenhuma fonte preenche ou confirma outra sem evidência compatível. |
| Histórico | Tabelas append-only de execução, consulta, campo, artefato, evento e achado. | Correções criam novo registro; registros anteriores não são sobrescritos. |
| Autonomia | Rotas públicas são consultadas pela ferramenta; etapas restritas são sinalizadas. | CAPTCHA, login e falta de autorização não viram “sem pagamento”. |
| Exportação | Abas exatas `Financeiro 4ª CRE V2` e `Validação V2`. | Download só é liberado após gates e manifesto da execução. |

## Prioridade de implementação

1. Garantir que a coleta autônoma do PDDEInfo persista todos os artefatos, observações e eventos de forma consistente.
2. Adicionar catálogo semântico e validações bloqueantes por campo, inclusive invariantes de valores financeiros.
3. Comparar a execução atual com a última baseline aprovada, gerando achados de regressão sem apagar histórico.
4. Expor execução, campo, evidência e exceção em navegação institucional.
5. Conectar SIGEF ou Dados Abertos somente após piloto e acesso permitido comprovados.

## Critério de pronto por fase

Uma fase só é considerada concluída quando o comportamento está coberto por teste automatizado, compilação TypeScript, migração revisada quando aplicável e validação visual se houver alteração de interface. O checkpoint correspondente deve permitir restaurar o sistema sem perder a trilha de auditoria.
