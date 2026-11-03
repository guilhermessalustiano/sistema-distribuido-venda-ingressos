# Front-end fala direto com o Supabase, só por funções Postgres (RPC)

O sistema tem apenas duas camadas: front-end estático na Vercel e PostgreSQL no Supabase, sem API intermediária, contrariando a arquitetura descrita na NP1. O navegador usa `supabase-js` com a chave anon (pública por design); todas as tabelas ficam fechadas por RLS e o cliente só pode chamar funções Postgres `SECURITY DEFINER`, que concentram regras de negócio e controle de concorrência no banco. Assim nenhuma credencial administrativa chega ao navegador e um cliente adulterado não consegue burlar o estoque.

## Considered Options

- **Acesso direto às tabelas com políticas RLS**: rejeitado, a lógica de estoque rodaria no navegador e poderia ser burlada.
- **Supabase Edge Functions**: rejeitado, reintroduz uma API como terceira camada.
