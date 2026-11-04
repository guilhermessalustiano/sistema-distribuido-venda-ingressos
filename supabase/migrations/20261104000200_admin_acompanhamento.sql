-- Acompanhamento do Painel admin (ticket #10).

create or replace function public.admin_consultar()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_evento public.evento;
  v_agora timestamptz := clock_timestamp();
  v_vendidos bigint;
  v_reservados bigint;
  v_quantidade_vendas bigint;
  v_total_arrecadado numeric;
  v_reservas_ativas jsonb;
  v_vendas jsonb;
begin
  -- A função STABLE lê a configuração, Vendas e Reservas no mesmo snapshot.
  -- O relógio é lido uma vez depois de o snapshot ser estabelecido.
  select * into strict v_evento from public.evento where id = 1;

  select coalesce(sum(v.quantidade), 0), count(*), coalesce(sum(v.total), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'nome_sessao', s.nome,
           'quantidade', v.quantidade,
           'preco_unitario', v.preco_unitario,
           'total', v.total,
           'criada_em', v.criada_em
         ) order by v.criada_em desc, v.id), '[]'::jsonb)
    into v_vendidos, v_quantidade_vendas, v_total_arrecadado, v_vendas
    from public.venda v
    join public.sessao s on s.id = v.sessao_id;

  select coalesce(sum(r.quantidade), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'nome_sessao', s.nome,
           'quantidade', r.quantidade,
           'expira_em', r.expira_em
         ) order by r.expira_em, r.id), '[]'::jsonb)
    into v_reservados, v_reservas_ativas
    from public.reserva r
    join public.sessao s on s.id = r.sessao_id
    where r.situacao = 'ativa' and r.expira_em > v_agora;

  return jsonb_build_object(
    'ok', true,
    'evento', interno.configuracao_evento(v_evento),
    'agora', v_agora,
    'vendidos', v_vendidos,
    'reservados', v_reservados,
    'estoque_disponivel', v_evento.capacidade - v_vendidos - v_reservados,
    'quantidade_vendas', v_quantidade_vendas,
    'total_arrecadado', v_total_arrecadado,
    'reservas_ativas', v_reservas_ativas,
    'vendas', v_vendas
  );
end;
$$;
