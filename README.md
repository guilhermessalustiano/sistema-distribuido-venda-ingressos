# sistema-distribuido-venda-ingressos

## Stack predefinida

- **Frontend:** HTML, CSS e JavaScript, hospedados na Vercel.
- **Banco de dados:** PostgreSQL, hospedado no Supabase.
- **Comunicação:** o frontend acessa uma API, que processa as requisições e realiza a conexão com o banco de dados.

Fluxo da aplicação: **Frontend (Vercel) → API → PostgreSQL (Supabase)**.

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
