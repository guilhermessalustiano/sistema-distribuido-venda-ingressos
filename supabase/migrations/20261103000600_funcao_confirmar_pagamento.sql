-- Pagamento simulado (ticket #7). Convenções em 20261103000400_funcoes_sessao_e_vitrine.sql e no README.

-- ---------------------------------------------------------------------------
-- confirmar_pagamento(p_sessao_id, p_reserva_id)
--   → { ok: true, venda: {id, quantidade, preco_unitario, total, criada_em}, estoque_disponivel }
--   | Recusa sessao_invalida
--   | Recusa reserva_inexistente   (não existe, não informada ou é de outra Sessão)
--   | Recusa reserva_ja_finalizada (cancelada ou já convertida em Venda)
--   | Recusa reserva_expirada      (ativa, mas expira_em <= agora)
--
-- Concorrência: trava o Evento (como reservar) e depois a Reserva (FOR UPDATE). Confirmações
-- simultâneas da mesma Reserva entram uma por vez; a segunda relê a linha já 'convertida'
-- e recebe reserva_ja_finalizada. O unique de venda.reserva_id é a última barreira.
--
-- Prazo: compara com clock_timestamp() lido DEPOIS de obter as travas, e não com now()
-- (início da transação). Uma chamada que esperou na fila do Evento poderia ter now() anterior
-- à expiração enquanto uma operação que passou antes na fila já tratou essa Reserva como
-- expirada e reutilizou os Ingressos; com o relógio atual a confirmação nunca contradiz
-- quem veio antes, então Vendas + Reservas ativas nunca passam da Capacidade.
-- ---------------------------------------------------------------------------
create function public.confirmar_pagamento(p_sessao_id uuid default null, p_reserva_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reserva public.reserva;
  v_venda public.venda;
begin
  if p_sessao_id is null or not exists (select 1 from public.sessao where id = p_sessao_id) then
    return jsonb_build_object('ok', false, 'motivo', 'sessao_invalida');
  end if;

  if p_reserva_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'reserva_inexistente');
  end if;

  -- Trava o Evento: serializa com reservar e com as outras confirmações.
  perform 1 from public.evento where id = 1 for update;

  -- Trava a Reserva da própria Sessão (a de outra Sessão é tratada como inexistente).
  select * into v_reserva
    from public.reserva
   where id = p_reserva_id
     and sessao_id = p_sessao_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'reserva_inexistente');
  end if;

  if v_reserva.situacao <> 'ativa' then
    return jsonb_build_object('ok', false, 'motivo', 'reserva_ja_finalizada');
  end if;

  if v_reserva.expira_em <= clock_timestamp() then
    return jsonb_build_object('ok', false, 'motivo', 'reserva_expirada');
  end if;

  update public.reserva set situacao = 'convertida' where id = v_reserva.id;

  -- Preço unitário e total congelados da Reserva (não do Evento atual).
  insert into public.venda (reserva_id, sessao_id, quantidade, preco_unitario, total)
  values (v_reserva.id, v_reserva.sessao_id, v_reserva.quantidade, v_reserva.preco_unitario,
          v_reserva.quantidade * v_reserva.preco_unitario)
  returning * into v_venda;

  return jsonb_build_object(
    'ok', true,
    'venda', jsonb_build_object(
      'id', v_venda.id,
      'quantidade', v_venda.quantidade,
      'preco_unitario', v_venda.preco_unitario,
      'total', v_venda.total,
      'criada_em', v_venda.criada_em
    ),
    'estoque_disponivel', greatest(interno.estoque_disponivel(), 0)
  );
end;
$$;

revoke all on function public.confirmar_pagamento(uuid, uuid) from public;
grant execute on function public.confirmar_pagamento(uuid, uuid) to anon;
