-- Configuração do Painel admin (ticket #9).

create function interno.configuracao_evento(p_evento public.evento)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'capacidade', p_evento.capacidade,
    'preco', p_evento.preco,
    'tempo_reserva_segundos', p_evento.tempo_reserva_segundos,
    'limite_por_reserva', p_evento.limite_por_reserva
  );
$$;

revoke all on function interno.configuracao_evento(public.evento) from public;

create function public.admin_consultar()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_evento public.evento;
begin
  select * into strict v_evento from public.evento where id = 1;
  return jsonb_build_object('ok', true, 'evento', interno.configuracao_evento(v_evento));
end;
$$;

revoke all on function public.admin_consultar() from public;
grant execute on function public.admin_consultar() to anon;

create function public.admin_atualizar_evento(
  p_capacidade jsonb default null,
  p_preco jsonb default null,
  p_tempo_reserva_segundos jsonb default null,
  p_limite_por_reserva jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_evento public.evento;
  v_campo record;
  v_numero numeric;
  v_agora timestamptz;
  v_comprometido bigint;
begin
  -- A mesma linha é travada por reservar e confirmar_pagamento.
  select * into strict v_evento from public.evento where id = 1 for update;

  -- Recebe JSON para que tipos incorretos cheguem à validação como Recusas.
  for v_campo in
    select * from (values
      ('capacidade', p_capacidade, 0, 2147483647, 0),
      ('preco', p_preco, 0, 99999999.99, 2),
      ('tempo_reserva_segundos', p_tempo_reserva_segundos, 1, 2147483647, 0),
      ('limite_por_reserva', p_limite_por_reserva, 1, 2147483647, 0)
    ) as campos(nome, valor, minimo, maximo, casas_decimais)
  loop
    v_numero := case when jsonb_typeof(v_campo.valor) = 'number' then v_campo.valor::numeric end;
    if v_numero is null or v_numero < v_campo.minimo or v_numero > v_campo.maximo
       or v_numero <> trunc(v_numero, v_campo.casas_decimais) then
      return jsonb_build_object(
        'ok', false, 'motivo', 'valor_invalido', 'campo', v_campo.nome, 'minimo_capacidade', null
      );
    end if;
  end loop;

  -- Leia o relógio depois da trava, pois Reservas podem expirar enquanto a operação espera.
  v_agora := clock_timestamp();
  select coalesce((select sum(v.quantidade) from public.venda v), 0)
       + coalesce((select sum(r.quantidade) from public.reserva r
                    where r.situacao = 'ativa' and r.expira_em > v_agora), 0)
    into v_comprometido;

  if p_capacidade::integer < v_comprometido then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'capacidade_abaixo_do_comprometido',
      'campo', 'capacidade',
      'minimo_capacidade', v_comprometido
    );
  end if;

  update public.evento
     set capacidade = p_capacidade::integer,
         preco = p_preco::numeric,
         tempo_reserva_segundos = p_tempo_reserva_segundos::integer,
         limite_por_reserva = p_limite_por_reserva::integer
   where id = 1
   returning * into v_evento;

  return jsonb_build_object('ok', true, 'evento', interno.configuracao_evento(v_evento));
end;
$$;

revoke all on function public.admin_atualizar_evento(jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.admin_atualizar_evento(jsonb, jsonb, jsonb, jsonb) to anon;

-- Preço e Limite por reserva são configuráveis. A Venda precisa comportar
-- até o produto do maior numeric(10, 2) pelo maior integer.
alter table public.venda alter column total type numeric(20, 2);
