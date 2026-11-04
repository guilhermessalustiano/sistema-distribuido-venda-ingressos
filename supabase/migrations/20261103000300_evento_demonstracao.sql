-- Evento de demonstração. Fica numa migração (e não no seed.sql) para que `supabase db push`
-- também o crie no projeto remoto. Mudanças de configuração depois disso são do Painel admin.
insert into public.evento (id, nome, descricao, local, data, preco, capacidade, tempo_reserva_segundos, limite_por_reserva)
values (
  1,
  'Noite de Sistemas Distribuídos',
  'Encerramento da disciplina de Sistemas Distribuídos: várias Sessões, em máquinas diferentes, disputando os mesmos Ingressos.',
  'Auditório Central',
  '2026-12-12 20:00:00-03',
  80.00,
  10,
  120,
  5
)
on conflict (id) do nothing;
