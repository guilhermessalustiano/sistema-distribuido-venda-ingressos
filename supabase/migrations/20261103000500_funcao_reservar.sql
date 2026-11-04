-- Reserva (ticket #6). Convenções em 20261103000400_funcoes_sessao_e_vitrine.sql e no README.

-- ---------------------------------------------------------------------------
-- reservar(p_sessao_id, p_quantidade)
--   → { ok: true, reserva: {id, quantidade, preco_unitario, total, expira_em}, agora, estoque_disponivel }
--   | Recusa sessao_invalida | quantidade_invalida | limite_excedido
--   | Recusa estoque_insuficiente (com estoque_disponivel atual)
--
-- p_quantidade é jsonb para que valores não numéricos ou fracionários cheguem até aqui
-- e virem Recusa quantidade_invalida (com integer o PostgREST devolveria erro, isto é, uma Falha).
--
-- Ordem (spec #3): cancela a Reserva ativa anterior da Sessão, valida quantidade e Limite por
-- reserva, calcula o Estoque disponível e cria a Reserva. Tudo numa transação: uma Recusa depois
-- da Sessão válida (quantidade_invalida, limite_excedido, estoque_insuficiente) também deixa a
-- Sessão sem a Reserva anterior, e o estoque_disponivel da Recusa já conta os Ingressos dela como livres.
--
-- Concorrência: trava a linha do Evento (FOR UPDATE) logo depois da guarda de Sessão, antes de
-- cancelar a anterior. Assim reservar segue a mesma ordem de travas de confirmar_pagamento
-- (Evento → Reserva) e as duas nunca entram em deadlock; cancelar_reserva só trava a Reserva.
-- Todas as operações que criam ou consomem estoque passam uma por vez; em READ COMMITTED cada
-- comando seguinte enxerga o que as transações anteriores na fila já gravaram.
--
-- Relógio: expira_em, o `agora` devolvido e o Estoque disponível usam clock_timestamp() lido
-- DEPOIS da trava, e não now() (início da transação), como confirmar_pagamento. Quem esperou
-- na fila não conta como ativas Reservas que já expiraram nem recebe um prazo encurtado.
-- ---------------------------------------------------------------------------
create function public.reservar(p_sessao_id uuid default null, p_quantidade jsonb default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_evento public.evento;
  v_agora timestamptz;
  v_numero numeric;
  v_quantidade integer;
  v_estoque integer;
begin
  if not interno.sessao_existe(p_sessao_id) then
    return jsonb_build_object('ok', false, 'motivo', 'sessao_invalida');
  end if;

  -- Trava o Evento: a partir daqui, uma operação de estoque por vez.
  select * into strict v_evento from public.evento where id = 1 for update;
  v_agora := clock_timestamp();

  -- Cancela a anterior (inclusive uma ativa já expirada: o índice único permite só uma 'ativa').
  update public.reserva
     set situacao = 'cancelada'
   where sessao_id = p_sessao_id
     and situacao = 'ativa';

  -- Quantidade: só número JSON inteiro e positivo (texto, booleano, nulo e fração são recusados).
  if p_quantidade is null or jsonb_typeof(p_quantidade) <> 'number' then
    return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  end if;
  v_numero := p_quantidade::numeric;
  if v_numero <= 0 or v_numero <> trunc(v_numero) then
    return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  end if;

  if v_numero > v_evento.limite_por_reserva then
    return jsonb_build_object('ok', false, 'motivo', 'limite_excedido');
  end if;
  v_quantidade := v_numero::integer;

  v_estoque := interno.estoque_disponivel(v_agora);

  if v_quantidade > v_estoque then
    return jsonb_build_object('ok', false, 'motivo', 'estoque_insuficiente', 'estoque_disponivel', v_estoque);
  end if;

  insert into public.reserva (sessao_id, quantidade, preco_unitario, expira_em)
  values (p_sessao_id, v_quantidade, v_evento.preco,
          v_agora + make_interval(secs => v_evento.tempo_reserva_segundos));

  return jsonb_build_object(
    'ok', true,
    'reserva', interno.reserva_vigente_json(p_sessao_id, v_agora),
    'agora', v_agora,
    'estoque_disponivel', v_estoque - v_quantidade
  );
end;
$$;

revoke all on function public.reservar(uuid, jsonb) from public;
grant execute on function public.reservar(uuid, jsonb) to anon;
