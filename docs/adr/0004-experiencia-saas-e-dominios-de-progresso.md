# ADR 0004 — Experiência SaaS e domínios de progresso

## Status

Aceita em 16/09/2026.

## Contexto

O primeiro MVP validou autenticação, vínculo, agenda, créditos e pagamentos, mas a
interface cresceu por páginas isoladas e não oferece ao personal uma visão operacional
coesa. A redescoberta do produto ampliou a proposta para gestão completa de um personal
independente, incluindo evolução física e integração opcional com o Hevy.

## Decisão

A interface autenticada passa a usar um shell SaaS responsivo:

- sidebar fixa no desktop;
- navegação inferior no celular;
- fundo azul-marinho e superfícies claras;
- dashboard do personal priorizando agenda do dia e alertas;
- navegação principal em Início, Agenda, Alunos, Financeiro e Conta;
- ações contextuais em dialog no desktop e bottom sheet no celular.

shadcn/ui será a base dos componentes acessíveis, Tailwind concentrará tokens visuais,
Motion será usado apenas em transições funcionais e Recharts atenderá os gráficos.
Uma biblioteca de agenda temporal será escolhida em uma avaliação isolada, sem levar
regras de crédito e conflito para o cliente.

O domínio será ampliado de forma aditiva com metas, registros de progresso, fotos
privadas, notificações e treinos externos. Dados do Hevy serão normalizados no banco;
credenciais externas serão armazenadas e usadas somente em funções de servidor.

## Consequências

- O shell e os componentes visuais serão compartilhados entre as áreas autenticadas.
- Páginas passam a orquestrar componentes menores e consultas por domínio.
- A migração visual ocorrerá por fatias, mantendo rotas antigas como fallback temporário.
- Fotos exigem bucket privado, políticas por vínculo e URLs assinadas.
- A integração Hevy é opcional e não bloqueia o uso principal.
- Wellhub permanece uma investigação comercial e não uma dependência do produto.
- O produto inicial continua limitado a um personal independente por conta.
