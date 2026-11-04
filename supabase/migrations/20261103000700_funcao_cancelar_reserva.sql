-- Cancelamento da Reserva no Checkout (ticket #8). Convenções em 20261103000400_funcoes_sessao_e_vitrine.sql e no README.

-- ---------------------------------------------------------------------------
-- cancelar_reserva(p_sessao_id, p_reserva_id)
--   → { ok: true, estoque_disponivel }
--   | Recusa sessao_invalida
--   | Recusa reserva_inexistente (não existe ou é de outra Sessão: não revela Reservas alheias)
--   | Recusa reserva_ja_finalizada (Reserva convertida em Venda)
--
-- Idempotente: cancelar uma Reserva da própria Sessão que já está cancelada devolve sucesso
-- sem alterar nada. Uma Reserva ativa já expirada também é marcada como cancelada (não muda o
-- Estoque disponível, pois ela já não contava).
--
-- Concorrência: cancelar só libera estoque, então não trava o Evento. Trava a linha da Reserva
-- (FOR UPDATE), o que serializa com confirmar_pagamento (que também trava a Reserva): se a
-- confirmação vier depois, relê a linha já cancelada e recusa; se vier antes, o cancelamento
-- encontra 'convertida' e recusa. O Estoque disponível devolvido usa clock_timestamp() lido
-- depois dessa trava (a espera pela confirmação não conta Reservas já expiradas como ativas).
-- ---------------------------------------------------------------------------
create function public.cancelar_reserva(p_sessao_id uuid default null, p_reserva_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_situacao text;
begin
  if not interno.sessao_existe(p_sessao_id) then
    return jsonb_build_object('ok', false, 'motivo', 'sessao_invalida');
  end if;

  select r.situacao into v_situacao
    from public.reserva r
   where r.id = p_reserva_id
     and r.sessao_id = p_sessao_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'reserva_inexistente');
  end if;

  if v_situacao = 'convertida' then
    return jsonb_build_object('ok', false, 'motivo', 'reserva_ja_finalizada');
  end if;

  if v_situacao = 'ativa' then
    update public.reserva set situacao = 'cancelada' where id = p_reserva_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'estoque_disponivel', interno.estoque_disponivel(clock_timestamp())
  );
end;
$$;

revoke all on function public.cancelar_reserva(uuid, uuid) from public;
grant execute on function public.cancelar_reserva(uuid, uuid) to anon;
