-- T4: meta de carga por exercício. O valor do enum entra em transação própria.
alter type public.goal_kind add value if not exists 'exercise_load';
