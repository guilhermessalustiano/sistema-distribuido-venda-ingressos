# sistema-distribuido-venda-ingressos

Venda de Ingressos de um único Evento com estoque limitado, feita para a disciplina de Sistemas Distribuídos: Sessões em máquinas diferentes disputam os mesmos Ingressos sem que a Capacidade seja ultrapassada. Glossário em [`CONTEXT.md`](CONTEXT.md).

## Arquitetura

Duas camadas, sem API intermediária ([ADR 0001](docs/adr/0001-front-fala-direto-com-supabase-via-rpc.md)):

**Navegador → front estático (Vercel) → PostgreSQL (Supabase), via funções RPC**

- **Front-end:** HTML, CSS e JavaScript puros em `src/`, com `supabase-js` carregado por CDN. Usa só a URL do projeto e a chave anon (públicas por design).
- **Banco:** PostgreSQL no Supabase. Todas as tabelas têm RLS e nenhum privilégio para `anon`; o navegador só consegue executar as funções publicadas (`SECURITY DEFINER`), onde ficam as regras de negócio e o controle de concorrência.
- Nenhuma chave `service_role` nem senha do banco vai para o front.

> A documentação da NP1 descreve uma API intermediária e venda imediata; esse desenho foi substituído e a NP1 é mantida só como registro histórico.

## Estrutura do repositório

```
src/                    front estático (é o que a Vercel publica)
  index.html            telas do Fluxo de venda
  admin.html            Painel admin da demonstração
  css/estilo.css
  js/config.js          URL e chave anon (local e remoto)
  js/api.js             única porta para o banco: um método por função RPC; Recusa x Falha
  js/sessao.js          id da Sessão no sessionStorage
  js/app.js             fluxo de telas (nome → seleção → Checkout → Venda) e mensagens de Recusa
  js/admin.js           configuração, acompanhamento e Reinício da demonstração
  js/contagem.js        contagem regressiva do Checkout, corrigida pelo relógio do banco
supabase/
  config.toml           configuração do Supabase local
  migrations/           migrações versionadas (uma nova por mudança; nunca edite uma já aplicada)
  seed.sql              dados só do ambiente local (o Evento de demonstração está numa migração)
tests/                  suíte de testes das funções RPC (Node + supabase-js)
  apoio/                clientes anon/serviço e preparação do banco
scripts/servir-front.js servidor estático para testar o front localmente
```

## Painel admin

Abra `/admin.html` no mesmo endereço da página de venda. Use **Atualizar painel** para ver as Reservas e Vendas feitas em outras máquinas. O **Reinício da demonstração** pede confirmação e apaga Vendas, Reservas e Sessões, preservando a configuração do Evento.

O painel e suas funções RPC são públicos por decisão de escopo da demonstração. Qualquer pessoa com acesso ao projeto pode consultar os nomes das Sessões, alterar a configuração ou reiniciar a demonstração.

## Banco de dados

### Funções publicadas (interface do navegador)

Todas devolvem JSON: `{ ok: true, ... }` em caso de sucesso ou uma **Recusa** `{ ok: false, motivo }`. Uma Recusa nunca é erro; qualquer erro do Postgres ou da rede é uma **Falha**.

| Função | Parâmetros | Sucesso | Recusas |
| --- | --- | --- | --- |
| `iniciar_sessao` | `p_nome` | `sessao_id` | `nome_invalido` (vazio, só espaços ou mais de 80 caracteres) |
| `consultar_evento` | `p_sessao_id` (opcional) | `evento` (`nome`, `descricao`, `local`, `data`, `preco`, `limite_por_reserva`), `estoque_disponivel`, `esgotado`, `agora` (relógio do banco), `sessao` (`id`, `nome`) e `reserva` (Reserva ativa não expirada da Sessão, no mesmo formato de `reservar`, ou `null`) | `sessao_invalida` |
| `reservar` | `p_sessao_id`, `p_quantidade` (número JSON inteiro) | `reserva` (`id`, `quantidade`, `preco_unitario`, `total`, `expira_em`), `agora` (relógio do banco) e `estoque_disponivel` | `sessao_invalida`, `quantidade_invalida` (zero, negativa, fracionária, texto, booleano ou nula), `limite_excedido`, `estoque_insuficiente` (com `estoque_disponivel`) |
| `cancelar_reserva` | `p_sessao_id`, `p_reserva_id` | `estoque_disponivel` (já com os Ingressos devolvidos) | `sessao_invalida`, `reserva_inexistente` (não existe ou é de outra Sessão), `reserva_ja_finalizada` (convertida em Venda) |
| `confirmar_pagamento` | `p_sessao_id`, `p_reserva_id` | `venda` (`id`, `quantidade`, `preco_unitario`, `total`, `criada_em`) e `estoque_disponivel` | `sessao_invalida`, `reserva_inexistente` (não existe ou é de outra Sessão), `reserva_ja_finalizada` (cancelada ou já confirmada), `reserva_expirada` |
| `admin_consultar` | — | `evento`, `agora`, `vendidos`, `reservados`, `estoque_disponivel`, `quantidade_vendas`, `total_arrecadado`, `reservas_ativas` e `vendas` | — |
| `admin_atualizar_evento` | `p_capacidade`, `p_preco`, `p_tempo_reserva_segundos`, `p_limite_por_reserva` (números JSON) | `evento` | `valor_invalido` (com `campo`), `capacidade_abaixo_do_comprometido` (com `minimo_capacidade`) |
| `admin_reiniciar` | — | `ok` | — |

Em `admin_consultar`, `total_arrecadado` e `vendas[].total` são textos decimais com duas casas para preservar os centavos, mesmo em valores grandes.

`iniciar_sessao` recusa nomes inválidos com `nome_invalido`: vazio, só espaços, tabs ou quebras de linha, nulo ou com mais de 80 caracteres (o nome é guardado sem os espaços das pontas). Essa Recusa não está no contrato da spec #3 e é mantida para não criar Sessões sem nome.

`reservar` substitui a Reserva ativa anterior da Sessão, na ordem da spec #3: cancela a anterior, valida a quantidade e o Limite por reserva, calcula o Estoque disponível e cria a nova, tudo numa transação. Por isso, com a Sessão válida, **qualquer Recusa (`quantidade_invalida`, `limite_excedido`, `estoque_insuficiente`) também deixa a Sessão sem a Reserva anterior**, e o `estoque_disponivel` de `estoque_insuficiente` já conta os Ingressos dela como livres. Só `sessao_invalida` não mexe em nada. A trava do Evento é obtida antes do cancelamento, na mesma ordem de `confirmar_pagamento` (Evento → Reserva), para não haver deadlock entre as duas. Reservas expiradas não são apagadas: só deixam de contar no Estoque disponível, sem processo agendado.

`reservar` e `confirmar_pagamento` usam o relógio do banco lido depois da trava do Evento (`clock_timestamp()`), e não o início da transação: quem esperou na fila recebe o Tempo de reserva inteiro e não conta como ativas Reservas que expiraram durante a espera.

`cancelar_reserva` é idempotente: cancelar de novo uma Reserva da própria Sessão já cancelada (ou substituída) devolve sucesso sem alterar nada.

`confirmar_pagamento` trava o Evento e a Reserva, então confirmações simultâneas da mesma Reserva geram uma única Venda (as demais recebem `reserva_ja_finalizada`). O prazo é conferido com o relógio do banco no momento da confirmação (`clock_timestamp()`, depois das travas), e a Venda guarda o Preço unitário e o total da Reserva.

O Estoque disponível é sempre calculado (Capacidade − vendidos − Reservas ativas não expiradas), na função interna `interno.estoque_disponivel(p_agora)`, que nunca devolve valor negativo. `reservar`, `confirmar_pagamento` e `cancelar_reserva` usam `interno.sessao_existe(p_sessao_id)`, que adquire a trava do Evento antes de consultar a Sessão e a mantém até o fim da transação. O Reinício adquire essa mesma trava antes de apagar as Sessões.

### Convenções para novas migrações

- Crie com `npx supabase migration new <nome>`; não edite migrações já aplicadas.
- Funções do navegador: em `public`, `security definer`, `set search_path = ''`, nomes qualificados, parâmetros com prefixo `p_`, retorno `jsonb` no formato acima e, ao final:
  ```sql
  revoke all on function public.minha_funcao(<tipos>) from public;
  grant execute on function public.minha_funcao(<tipos>) to anon;
  ```
- Auxiliares que o navegador não deve chamar ficam no schema `interno` (não exposto pela API).
- Tabelas novas: habilite RLS, não crie políticas e não dê privilégios a `anon`/`authenticated` (os privilégios padrão já vêm revogados pela migração `privilegios_padrao`). Acrescente a tabela em `TABELAS` de `tests/acesso-anon.test.js`.
- Operações que bloqueiam ou vendem Ingressos travam a linha do Evento (`select ... from public.evento where id = 1 for update`) antes de calcular o Estoque disponível, e calculam com `clock_timestamp()` lido depois da trava.

## Rodando localmente

Pré-requisitos: Node 20+ e Docker em execução. O Supabase CLI vem como dependência de desenvolvimento (use `npx supabase ...`).

```bash
npm install
npx supabase start     # sobe o Supabase local e aplica as migrações
npm test               # roda a suíte de testes contra o Supabase local
npm run front          # serve src/ em http://127.0.0.1:3000
npx supabase stop --no-backup
```

- `npx supabase db reset` recria o banco do zero a partir das migrações (incluindo o Evento de demonstração).
- O front, aberto em `localhost`/`127.0.0.1`, usa automaticamente o Supabase local (`http://127.0.0.1:54321`). Se você mudou as portas, aponte com `?supabase=http://127.0.0.1:<porta>`.
- Studio local (para inspecionar dados): http://127.0.0.1:54323.

### Testes

- Ficam em `tests/*.test.js` e usam o runner nativo do Node (`node --test`), em série, pois compartilham o banco.
- Chamam as funções exatamente como o navegador: `supabase-js` com a chave anon. A chave `service_role` é usada só em `tests/apoio/banco.js` para preparar o cenário (limpar dados, configurar o Evento) e para conferências de integridade.
- URL e chaves vêm de `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ou, na falta delas, de `npx supabase status -o env`.
- Para um teste novo, crie `tests/<assunto>.test.js` e chame `prepararBanco({ ...configuração do Evento })` no `beforeEach`.
- O GitHub Actions (`.github/workflows/testes.yml`) roda a suíte em todo PR e em todo push na `main`, contra um Supabase local criado do zero com as migrações. Teste com o Supabase local, não só com PostgreSQL e PostgREST "puros": o Supabase carrega extensões como `safeupdate`, que recusa `DELETE`/`UPDATE` sem `WHERE` nas chamadas da API.

## Publicação (manual, feita pela equipe)

### 1. Supabase remoto

1. Crie um projeto em https://supabase.com (anote a senha do banco; ela não vai para o repositório).
2. Vincule e aplique as migrações:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
   Isso cria as tabelas, as funções e o Evento de demonstração.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon** (pública). Não use a `service_role`.

### 2. Configurar o front

Em `src/js/config.js`, preencha o objeto `REMOTO` com a Project URL e a chave anon e faça commit (ambas são públicas por design).

### 3. Vercel

1. Em https://vercel.com, **Add New → Project** e importe este repositório do GitHub.
2. **Root Directory:** `src`. **Framework Preset:** Other. Sem comando de build nem de instalação.
3. Aplique as migrações do Supabase antes de publicar o front, para disponibilizar as RPCs do Painel admin. Cada push na branch principal publica de novo.

Verificação manual na página publicada: informar o nome abre a vitrine com o Evento e o Estoque disponível; recarregar mantém a Sessão; uma aba nova pede o nome de novo (atenção: "Duplicar aba" copia o `sessionStorage` e portanto a Sessão). Em `/admin.html`, confirme que a configuração e os indicadores carregam.

## Padronização de Commits

Este projeto utiliza o padrão [Conventional Commits](https://www.conventionalcommits.org/).

### Formato do Commit

`<tipo>(<escopo opcional>): <descrição curta>`

### Tipos permitidos:

- `feat`: Adição de nova funcionalidade
- `fix`: Correção de bug
- `docs`: Alterações na documentação
- `style`: Formatação, ponto e vírgula, sem alteração de código
- `refactor`: Refatoração de código sem alterar funcionalidade ou corrigir bug
- `test`: Adição ou ajuste de testes
- `chore`: Atualizações de tarefas de build, pacotes, configurações etc.

### Exemplos:

- `feat(auth): adiciona fluxo de login`
- `docs: adiciona padrao de commits ao readme`
