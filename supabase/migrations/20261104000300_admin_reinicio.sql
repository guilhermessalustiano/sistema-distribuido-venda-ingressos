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

-- reservar, confirmar_pagamento e cancelar_reserva validam a Sessão pela
-- mesma guarda. Obtém a trava antes de consultar: um Reinício na frente na
-- fila pode ter apagado a Sessão. A vitrine continua usando uma leitura só.
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
