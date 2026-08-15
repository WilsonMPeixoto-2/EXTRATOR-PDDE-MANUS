# Notas de fontes — análise comparativa de ferramentas

## DuckDB Node.js

A documentação oficial identifica `@duckdb/node-api` como cliente Node de alto nível, baseado em bindings da API C do DuckDB e distribuído com binários publicados. A documentação declara suporte para Linux x64, que coincide com o ambiente atual, e demonstra uso tanto em memória quanto por instância de banco. O ponto relevante para o projeto é que se trata de componente nativo, adequado a consultas analíticas locais, não de substituto direto do banco transacional ou da trilha de evidências.

Fonte: https://duckdb.org/docs/lts/clients/node_neo/overview

## p-queue

O repositório oficial descreve `p-queue` como fila de promessas para controle de concorrência e limitação de operações assíncronas. Sua documentação especifica timeout por tarefa e permite configurar tempo limite global ou por inclusão de tarefa. Isso confirma aderência como controle em memória *dentro* de uma execução, mas não como substituto da fila persistente, retomada ou histórico de importações.

Fonte: https://github.com/sindresorhus/p-queue

## fast-check com Vitest

A documentação oficial do fast-check recomenda a integração `@fast-check/vitest` quando a suíte já utiliza Vitest. A integração estende `test` e `it` incrementalmente, lida com timeout e ciclo de vida do Vitest e permite reproduzir uma falha pela semente. Isso é compatível com o projeto para reforçar invariantes puramente determinísticos, como soma em centavos, deduplicação e invariância à reordenação de registros; não deve gerar ou simular fatos financeiros reais.

Fonte: https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/

## API do Portal da Transparência

A página oficial confirma que a API é REST e informa limites gerais de 400 requisições por minuto entre 6h e 23h59 e 700 entre 0h e 5h59. A própria página remete à documentação específica dos serviços no domínio `api.portaldatransparencia.gov.br`. A adoção no sistema continua dependente de verificar o endpoint concreto para transferências PDDE, o requisito de chave e os limites específicos antes de instalar cliente ou criar adaptador.

Fonte: https://portaldatransparencia.gov.br/api-de-dados

## Dados Abertos FNDE e catálogo PDDE

A página oficial do FNDE declara que os conjuntos de Dados Abertos do PDDE abrangem execução financeira, relação de escolas atendidas, saldos de contas e situação de regularidade da prestação de contas. Isso confirma a relevância institucional da fonte, mas não confirma por si só um recurso utilizável, com cobertura de 2026 ou chave de associação adequada para cada campo. O catálogo `dados.gov.br` consultado apresentou apenas carregamento dinâmico, sem expor recursos ou metadados no acesso automatizado. Assim, a fonte deve permanecer como candidata a descoberta técnica recurso a recurso, não como integração já comprovada.

Fontes: https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos ; https://dados.gov.br/dados/conjuntos-dados/programa-dinheiro-direto-na-escola-pdde
