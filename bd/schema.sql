-- Sistema de Venda de Ingressos — modelo inicial PostgreSQL.
-- Executar uma vez em um banco/schema novo: psql "$DATABASE_URL" -f bd/schema.sql
-- Não remove nem substitui tabelas existentes. Uma colisão de nomes aborta
-- a transação, evitando tratar um esquema diferente como atualizado.

BEGIN;

CREATE TABLE public.usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT usuarios_nome_valido CHECK (btrim(nome) <> ''),
    -- Armazenamento canônico para que UNIQUE também evite duplicação por caixa.
    -- A validação do formato do e-mail é responsabilidade da aplicação.
    CONSTRAINT usuarios_email_normalizado
        CHECK (email <> '' AND email = lower(btrim(email)))
);

CREATE TABLE public.eventos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    local VARCHAR(200) NOT NULL,
    data_evento TIMESTAMPTZ NOT NULL,
    quantidade_total INTEGER NOT NULL,
    quantidade_disponivel INTEGER NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT eventos_nome_valido CHECK (btrim(nome) <> ''),
    CONSTRAINT eventos_local_valido CHECK (btrim(local) <> ''),
    CONSTRAINT eventos_total_nao_negativo CHECK (quantidade_total >= 0),
    CONSTRAINT eventos_estoque_valido
        CHECK (quantidade_disponivel BETWEEN 0 AND quantidade_total)
);

CREATE TABLE public.vendas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evento_id BIGINT NOT NULL,
    usuario_id BIGINT,
    quantidade INTEGER NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT vendas_quantidade_positiva CHECK (quantidade > 0),
    CONSTRAINT vendas_evento_fk FOREIGN KEY (evento_id)
        REFERENCES public.eventos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT vendas_usuario_fk FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- PostgreSQL cria índices para PK e UNIQUE; as FKs recebem índices explícitos.
CREATE INDEX vendas_evento_id_idx ON public.vendas (evento_id);
CREATE INDEX vendas_usuario_id_idx ON public.vendas (usuario_id);

COMMENT ON TABLE public.usuarios IS
    'Identificação opcional de compradores; não representa autenticação.';
COMMENT ON TABLE public.eventos IS
    'Evento com capacidade total e saldo de ingressos disponíveis.';
COMMENT ON TABLE public.vendas IS
    'Somente vendas confirmadas; recusas não geram registros nesta tabela.';
COMMENT ON COLUMN public.vendas.usuario_id IS
    'Opcional: permite compra sem cadastro, conforme o escopo inicial.';
COMMENT ON COLUMN public.eventos.quantidade_total IS
    'Estoque inicial do evento; manter fixo durante as vendas nesta versão.';
COMMENT ON COLUMN public.eventos.quantidade_disponivel IS
    'Saldo; a baixa e a inserção da venda devem ocorrer na mesma transação.';

-- Este DDL não implementa a operação de compra nem políticas de acesso.
-- A compra deve validar e reduzir o saldo atomicamente (por bloqueio de linha
-- ou UPDATE condicional) e inserir a venda na mesma transação, com rollback
-- integral em caso de falha. CHECK isoladamente não garante a conciliação
-- entre o saldo de eventos e a soma das quantidades em vendas.
-- O navegador deve acessar a API; permissões/RLS serão configuradas na
-- integração, sem conceder acesso direto a estas tabelas ao cliente.

COMMIT;
