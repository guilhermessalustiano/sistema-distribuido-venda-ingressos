-- Schema do fluxo de venda (spec #3). Termos em CONTEXT.md.
-- Todas as tabelas com RLS habilitado e sem políticas: anon/authenticated não leem nem gravam nada.
-- O acesso acontece só pelas funções SECURITY DEFINER (ver migrações de funções).

-- Evento: linha única (id = 1).
create table public.evento (
  id smallint primary key default 1 check (id = 1),
  nome text not null check (btrim(nome) <> ''),
  descricao text not null default '',
  local text not null,
  data timestamptz not null,
  preco numeric(10, 2) not null check (preco >= 0),
  capacidade integer not null check (capacidade >= 0),
  tempo_reserva_segundos integer not null check (tempo_reserva_segundos > 0),
  limite_por_reserva integer not null check (limite_por_reserva >= 1)
);

-- Sessão: visita identificada por id e nome; não é conta.
create table public.sessao (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> '' and char_length(nome) <= 80),
  criada_em timestamptz not null default now()
);

-- Reserva: bloqueio temporário. "Expirada" não é situação gravada:
-- é uma Reserva 'ativa' com expira_em <= agora.
create table public.reserva (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessao (id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null,
  situacao text not null default 'ativa' check (situacao in ('ativa', 'cancelada', 'convertida'))
);

-- Uma Sessão tem no máximo uma Reserva 'ativa' (reservar cancela a anterior antes de criar outra).
create unique index reserva_uma_ativa_por_sessao on public.reserva (sessao_id) where situacao = 'ativa';
create index reserva_ativas_por_expiracao on public.reserva (expira_em) where situacao = 'ativa';

-- Venda: no máximo uma por Reserva; guarda Preço unitário e total vigentes na Reserva.
create table public.venda (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null unique references public.reserva (id) on delete cascade,
  sessao_id uuid not null references public.sessao (id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  total numeric(12, 2) not null check (total >= 0),
  criada_em timestamptz not null default now()
);

alter table public.evento enable row level security;
alter table public.sessao enable row level security;
alter table public.reserva enable row level security;
alter table public.venda enable row level security;

-- Além do RLS, nenhum privilégio de tabela para os papéis do navegador
-- (assim o acesso direto falha com permission denied em vez de devolver lista vazia).
revoke all on table public.evento, public.sessao, public.reserva, public.venda from anon, authenticated;
