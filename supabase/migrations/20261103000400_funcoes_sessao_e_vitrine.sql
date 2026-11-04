-- Funções da Sessão e da vitrine do Evento (ticket #5).
-- Convenções para todas as funções publicadas (ver README, "Banco de dados"):
--   * SECURITY DEFINER com search_path vazio; nomes sempre qualificados (public., interno.).
--   * Devolvem jsonb: { ok: true, ... } ou Recusa { ok: false, motivo }. Recusa nunca é exceção.
--   * revoke de public + grant execute explícito para anon.
--   * Parâmetros com prefixo p_ (são os nomes usados pelo supabase-js em rpc()).

-- ---------------------------------------------------------------------------
-- Auxiliares internas (schema interno, não expostas ao navegador)
-- ---------------------------------------------------------------------------

-- Estoque disponível = Capacidade − Ingressos vendidos − Ingressos em Reservas ativas não expiradas.
-- Calculado sempre com o relógio do banco; nunca armazenado.
-- Quem cria ou consome estoque deve travar a linha do Evento (select ... for update) ANTES de chamar.
create function interno.estoque_disponivel()
returns integer
language sql
stable
set search_path = ''
as $$
  select e.capacidade
       - coalesce((select sum(v.quantidade) from public.venda v), 0)
       - coalesce((select sum(r.quantidade)
                     from public.reserva r
                    where r.situacao = 'ativa'
                      and r.expira_em > now()), 0)
  from public.evento e
  where e.id = 1;
$$;

-- Reserva ativa e não expirada de uma Sessão, no formato devolvido ao navegador (ou null).
create function interno.reserva_vigente_json(p_sessao_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
           'id', r.id,
           'quantidade', r.quantidade,
           'preco_unitario', r.preco_unitario,
           'total', r.quantidade * r.preco_unitario,
           'expira_em', r.expira_em
         )
  from public.reserva r
  where r.sessao_id = p_sessao_id
    and r.situacao = 'ativa'
    and r.expira_em > now();
$$;

revoke all on function interno.estoque_disponivel() from public;
revoke all on function interno.reserva_vigente_json(uuid) from public;

-- ---------------------------------------------------------------------------
-- iniciar_sessao(p_nome) → { ok, sessao_id } | Recusa nome_invalido
-- ---------------------------------------------------------------------------
create function public.iniciar_sessao(p_nome text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_nome text := btrim(p_nome, E' \t\r\n');
  v_id uuid;
begin
  if v_nome is null or v_nome = '' or char_length(v_nome) > 80 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_invalido');
  end if;

  insert into public.sessao (nome) values (v_nome) returning id into v_id;
  return jsonb_build_object('ok', true, 'sessao_id', v_id);
end;
$$;

revoke all on function public.iniciar_sessao(text) from public;
grant execute on function public.iniciar_sessao(text) to anon;

-- ---------------------------------------------------------------------------
-- consultar_evento(p_sessao_id opcional)
--   → { ok, evento: {nome, descricao, local, data, preco, limite_por_reserva},
--       estoque_disponivel, esgotado, agora, sessao: {id, nome} | null, reserva: {...} | null }
--   | Recusa sessao_invalida (id informado que não existe)
-- ---------------------------------------------------------------------------
create function public.consultar_evento(p_sessao_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_evento public.evento;
  v_sessao public.sessao;
  v_estoque integer;
begin
  if p_sessao_id is not null then
    select * into v_sessao from public.sessao where id = p_sessao_id;
    if not found then
      return jsonb_build_object('ok', false, 'motivo', 'sessao_invalida');
    end if;
  end if;

  select * into strict v_evento from public.evento where id = 1;
  v_estoque := greatest(interno.estoque_disponivel(), 0);

  return jsonb_build_object(
    'ok', true,
    'evento', jsonb_build_object(
      'nome', v_evento.nome,
      'descricao', v_evento.descricao,
      'local', v_evento.local,
      'data', v_evento.data,
      'preco', v_evento.preco,
      'limite_por_reserva', v_evento.limite_por_reserva
    ),
    'estoque_disponivel', v_estoque,
    'esgotado', v_estoque = 0,
    'agora', now(),
    'sessao', case when p_sessao_id is null then null
                   else jsonb_build_object('id', v_sessao.id, 'nome', v_sessao.nome) end,
    'reserva', case when p_sessao_id is null then null
                    else interno.reserva_vigente_json(p_sessao_id) end
  );
end;
$$;

revoke all on function public.consultar_evento(uuid) from public;
grant execute on function public.consultar_evento(uuid) to anon;
