-- Reinício da demonstração compatível com pg_safeupdate (ticket #11).
-- No Supabase, o papel authenticator (usado pelas chamadas da API) carrega a
-- extensão safeupdate, que recusa DELETE sem WHERE mesmo dentro de funções
-- SECURITY DEFINER. O "where true" explicita que a exclusão total é intencional.
create or replace function public.admin_reiniciar()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform 1 from public.evento where id = 1 for update;

  -- As FKs com ON DELETE CASCADE apagam as Reservas e Vendas das Sessões.
  delete from public.sessao where true;

  return jsonb_build_object('ok', true);
end;
$$;
