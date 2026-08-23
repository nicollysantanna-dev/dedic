# Dedic

Aplicação mobile-first para gestão de aulas entre personal trainers e alunos.

## Estado atual

O Marco 1 está implementado: a fundação React é executável, instalável como PWA,
testável e preparada para receber a integração do Supabase. A tela atual utiliza
dados demonstrativos; autenticação e persistência começam no Marco 2.

## Documentação

- [Requisitos do MVP](docs/MVP_REQUIREMENTS.md)
- [Harness de desenvolvimento](docs/DEVELOPMENT_HARNESS.md)
- [Plano incremental](docs/IMPLEMENTATION_PLAN.md)
- [Configuração do Supabase](docs/SUPABASE_SETUP.md)
- [Registros de decisão](docs/adr/README.md)

## Stack planejada

- React, TypeScript e Vite;
- React Router e TanStack Query;
- Tailwind CSS e shadcn/ui;
- React Hook Form e Zod;
- Supabase com PostgreSQL, Auth e Row Level Security;
- Vitest, Testing Library e Playwright.

## Desenvolvimento

```bash
npm install
npm run dev
```

Com `make`, os mesmos fluxos ficam disponíveis por comandos curtos:

```bash
make install
make dev
make help
```

Validação completa:

```bash
npm run validate
# ou
make check
```

O Supabase local requer Docker em execução:

```bash
npm run supabase:start
# ou
make supabase-start
```

Consulte o [harness de desenvolvimento](docs/DEVELOPMENT_HARNESS.md) para conhecer
as regras de qualidade, segurança e testes.
