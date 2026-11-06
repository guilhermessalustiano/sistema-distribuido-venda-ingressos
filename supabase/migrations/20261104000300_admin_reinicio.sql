-- Reinício da demonstração (ticket #11).
create function public.admin_reiniciar()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform 1 from public.evento where id = 1 for update;

  -- As FKs com ON DELETE CASCADE apagam as Reservas e Vendas das Sessões.
  delete from public.sessao;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_reiniciar() from public;
grant execute on function public.admin_reiniciar() to anon;

-- Guarda de Sessão das RPCs de escrita: reservar, confirmar_pagamento e
-- cancelar_reserva. Para IDs não nulos, adquire a trava do Evento antes de
-- consultar a Sessão e a mantém até o fim da transação. Um Reinício que
-- adquiriu a trava primeiro pode ter apagado a Sessão durante a espera.
create or replace function interno.sessao_existe(p_sessao_id uuid)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
begin
  if p_sessao_id is null then
    return false;
  end if;

  perform 1 from public.evento where id = 1 for update;
  return exists (select 1 from public.sessao where id = p_sessao_id);
end;
$$;
