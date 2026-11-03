# Venda de Ingressos

Sistema acadêmico de venda de ingressos de um único evento com estoque limitado, em que ingressos ficam temporariamente bloqueados para uma sessão durante o checkout, até a confirmação de um pagamento simulado.

## Language

### Evento e estoque

**Evento**:
O único espetáculo à venda, com nome, local, data, preço e capacidade.
_Avoid_: Show, produto

**Ingresso**:
Uma unidade de entrada no Evento; não é individualizado (sem assento ou número).
_Avoid_: Ticket, entrada

**Capacidade**:
Quantidade total de Ingressos do Evento, ajustável no Painel admin, mas nunca abaixo dos Ingressos já vendidos somados aos bloqueados por Reservas ativas.
_Avoid_: Estoque total, quantidade total

**Estoque disponível**:
Ingressos que ainda podem ser reservados neste instante, isto é, que não estão vendidos nem bloqueados por uma Reserva ativa.
_Avoid_: Saldo, quantidade disponível, estoque

**Esgotado**:
Situação em que o Estoque disponível é zero, seja por Vendas ou por Reservas ativas; pode deixar de valer quando uma Reserva expira.
_Avoid_: Indisponível, sem estoque

**Preço**:
Valor unitário de um Ingresso do Evento, em reais.

### Sessão e compra

**Sessão**:
Uma visita de uma pessoa ao sistema, identificada por um ID e pelo nome informado ao entrar; não é uma conta e não exige cadastro.
_Avoid_: Usuário, comprador, conta, login

**Reserva**:
Bloqueio temporário de uma quantidade de Ingressos para uma Sessão, válido até expirar, ser cancelado ou virar Venda.
_Avoid_: Hold, pré-venda, carrinho

**Checkout**:
A etapa em que a Sessão tem uma Reserva ativa e pode confirmar o Pagamento simulado.
_Avoid_: Carrinho

**Limite por reserva**:
Quantidade máxima de Ingressos que uma única Reserva pode bloquear; uma Sessão tem no máximo uma Reserva ativa.

**Tempo de reserva**:
Duração configurável durante a qual uma Reserva bloqueia Ingressos antes de expirar.
_Avoid_: TTL, timeout

**Pagamento simulado**:
A confirmação de compra feita apenas pressionando um botão; não há cobrança real.
_Avoid_: Pagamento, cobrança

**Venda**:
Uma Reserva confirmada pelo Pagamento simulado dentro do Tempo de reserva; é definitiva.
_Avoid_: Compra, pedido, transação

### Administração

**Painel admin**:
Tela aberta, sem login, onde se configuram Capacidade, Preço, Tempo de reserva e Limite por reserva do Evento, e se acompanham Vendas e Reservas ativas.
_Avoid_: Backoffice, dashboard

**Reinício da demonstração**:
Operação do Painel admin que apaga todas as Vendas, Reservas e Sessões, devolvendo o Evento ao Estoque disponível igual à Capacidade.
_Avoid_: Reset, limpeza

### Resultados

**Recusa**:
Negativa por regra de negócio, como Estoque disponível insuficiente, quantidade inválida ou Reserva expirada.
_Avoid_: Erro, falha

**Falha**:
Erro técnico que impede concluir a operação, como banco indisponível ou timeout; não é uma decisão de negócio.
_Avoid_: Recusa, erro de negócio
