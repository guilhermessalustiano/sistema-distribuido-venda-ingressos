-- ADR 0001: o navegador (papel anon) só executa funções publicadas explicitamente.
-- O Supabase concede por padrão tudo em `public` para anon/authenticated; aqui fechamos isso
-- para tudo que for criado daqui em diante pelo dono das migrações (postgres).
-- Consequência para migrações futuras: toda função que o navegador chama precisa de
--   grant execute on function public.<nome>(<tipos>) to anon;
-- e nenhuma tabela deve receber grant para anon/authenticated.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- EXECUTE para PUBLIC é um padrão global do Postgres (não por schema).
alter default privileges for role postgres
  revoke execute on functions from public;

-- Funções auxiliares que não fazem parte da interface do navegador ficam em `interno`,
-- schema não exposto pela API e sem USAGE para anon/authenticated.
create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated;
