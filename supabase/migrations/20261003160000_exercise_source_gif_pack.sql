-- Exercícios vindos do pacote de GIFs animados (ADR 0011). O valor do enum
-- precisa entrar em transação própria para ser usado nas migrações seguintes.
alter type public.exercise_source add value if not exists 'gif_pack';
