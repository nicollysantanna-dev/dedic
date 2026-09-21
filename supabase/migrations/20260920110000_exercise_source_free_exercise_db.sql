-- Novo catálogo: free-exercise-db (domínio público). O valor do enum precisa
-- entrar em transação própria para ser usado nas migrações seguintes.
alter type public.exercise_source add value if not exists 'free_exercise_db';
