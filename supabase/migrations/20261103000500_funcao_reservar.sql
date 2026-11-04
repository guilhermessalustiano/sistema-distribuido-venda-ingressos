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
-- Concorrência: trava a linha do Evento (FOR UPDATE) antes de calcular o Estoque disponível,
-- serializando todas as operações que criam ou consomem estoque. Em READ COMMITTED cada comando
-- seguinte enxerga o que as transações anteriores na fila já gravaram.
--
-- Substituição: a Reserva ativa anterior da Sessão é cancelada só quando a nova é aceita, e os
-- Ingressos dela contam como livres para a nova. Qualquer Recusa deixa tudo como estava.
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
  v_numero numeric;
  v_quantidade integer;
  v_anterior integer;
  v_estoque integer;
  v_reserva_id uuid;
begin
  if p_sessao_id is null or not exists (select 1 from public.sessao where id = p_sessao_id) then
    return jsonb_build_object('ok', false, 'motivo', 'sessao_invalida');
  end if;

  -- Quantidade: só número JSON inteiro e positivo (texto, booleano, nulo e fração são recusados).
  if p_quantidade is null or jsonb_typeof(p_quantidade) <> 'number' then
    return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  end if;
  v_numero := p_quantidade::numeric;
  if v_numero <= 0 or v_numero <> trunc(v_numero) then
    return jsonb_build_object('ok', false, 'motivo', 'quantidade_invalida');
  end if;

  -- Trava o Evento: a partir daqui, uma operação de estoque por vez.
  select * into strict v_evento from public.evento where id = 1 for update;

  if v_numero > v_evento.limite_por_reserva then
    return jsonb_build_object('ok', false, 'motivo', 'limite_excedido');
  end if;
  v_quantidade := v_numero::integer;

  -- Ingressos da Reserva vigente da própria Sessão contam como livres para a substituição.
  select coalesce(sum(r.quantidade), 0) into v_anterior
    from public.reserva r
   where r.sessao_id = p_sessao_id
     and r.situacao = 'ativa'
     and r.expira_em > now();

  v_estoque := greatest(interno.estoque_disponivel(), 0);

  if v_quantidade > v_estoque + v_anterior then
    return jsonb_build_object('ok', false, 'motivo', 'estoque_insuficiente', 'estoque_disponivel', v_estoque);
  end if;

  -- Cancela a anterior (inclusive uma ativa já expirada: o índice único permite só uma 'ativa').
  update public.reserva
     set situacao = 'cancelada'
   where sessao_id = p_sessao_id
     and situacao = 'ativa';

  insert into public.reserva (sessao_id, quantidade, preco_unitario, expira_em)
  values (p_sessao_id, v_quantidade, v_evento.preco,
          now() + make_interval(secs => v_evento.tempo_reserva_segundos))
  returning id into v_reserva_id;

  return jsonb_build_object(
    'ok', true,
    'reserva', interno.reserva_vigente_json(p_sessao_id),
    'agora', now(),
    'estoque_disponivel', greatest(interno.estoque_disponivel(), 0)
  );
end;
$$;

revoke all on function public.reservar(uuid, jsonb) from public;
grant execute on function public.reservar(uuid, jsonb) to anon;
