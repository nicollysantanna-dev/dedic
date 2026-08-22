# ADR 0001 — React, Vite e Supabase como fundação do MVP

- Status: aceita
- Data: 2026-08-22
- Responsáveis: equipe Dedic

## Contexto

O MVP precisa ser mobile-first, instalável e desenvolvido incrementalmente. A experiência atual de desenvolvimento está concentrada em React, enquanto Next.js adicionaria conceitos de renderização e servidor que não são necessários para validar o primeiro produto.

O sistema ainda precisa de autenticação, banco relacional, armazenamento, autorização granular e operações transacionais sem exigir a manutenção inicial de um backend completo.

## Decisão

Usar:

- React com TypeScript para a interface;
- Vite para desenvolvimento e build;
- Supabase para PostgreSQL, autenticação, armazenamento e Row Level Security;
- funções PostgreSQL para operações críticas de agenda e crédito;
- aplicação PWA hospedada inicialmente na Vercel.

O frontend poderá consultar dados permitidos pela API do Supabase, mas invariantes e autorizações críticas permanecerão no banco.

## Alternativas consideradas

### Next.js

Oferece uma solução full-stack sólida e evolução para recursos de servidor, mas introduz uma curva de aprendizado maior para o contexto atual e não é necessário para o MVP.

### React com backend próprio

Oferece controle completo, mas aumenta o trabalho operacional e duplica capacidades já necessárias e disponíveis no Supabase.

## Consequências

### Positivas

- aproveita conhecimento existente em React;
- reduz o tempo até o primeiro fluxo funcional;
- mantém PostgreSQL e regras transacionais;
- permite segurança por registro com RLS;
- mantém possibilidade de criar um backend dedicado no futuro.

### Negativas

- exige disciplina rigorosa nas políticas RLS;
- funções críticas serão escritas em SQL/PostgreSQL;
- recursos que exijam segredos dependerão de uma função de servidor ou Edge Function;
- uma futura migração de infraestrutura poderá exigir adaptação da camada de dados.

## Validação

Reavaliar a decisão após o piloto caso limitações de operação, segurança, desempenho ou requisitos de servidor apareçam de forma concreta.
