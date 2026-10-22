# Planejamento de sprints

## Objetivo e referência

Organizar o desenvolvimento do **Sistema de Venda de Ingressos com Venda Imediata e Controle de Concorrência**, transformando as dez etapas do tópico 15 — Cronograma da [Documentação NP1](Trabalho%20Sistemas%20Distribuidos%20Documentacao%20NP1.md) em tarefas acompanháveis e entregas verificáveis.

## Metodologia escolhida: Scrum adaptado

O projeto tem uma equipe de cinco integrantes, escopo inicial delimitado e uma entrega acadêmica. Sprints curtas permitem distribuir o trabalho, demonstrar incrementos e corrigir problemas de integração antes da entrega final. O planejamento adota Scrum com cerimônias reduzidas à disponibilidade do grupo.

**Proposta de duração:** quatro sprints de uma semana. A documentação não informa início, prazo final nem disponibilidade individual; portanto, as semanas são relativas e as durações abaixo são propostas, não compromissos já aprovados. No primeiro planejamento, o grupo deve registrar as datas e ajustar a quantidade de tarefas à sua capacidade.

**Objetivo do produto:** permitir consultar um evento e comprar ingressos com confirmação imediata, preservando a consistência entre estoque e vendas mesmo com solicitações simultâneas.

Permanecem fora desta entrega: pagamento real, emissão comercial de ingressos, integração com bilheterias externas, administração completa de eventos, reembolsos reais e autenticação completa.

## Como executar

O formato segue as sprints do projeto do TCC: visão geral das entregas, itens identificados, dependências técnicas e checklists de execução e aceite. Os IDs S1-01 a S4-04 são mantidos para facilitar o acompanhamento e a correspondência com o cronograma.

- A numeração organiza o backlog; o início de cada tarefa depende dos pré-requisitos indicados. Atividades independentes podem avançar em paralelo.
- Contratos, interfaces e roteiros podem ser preparados com dados de exemplo; o aceite exige integração real com as dependências disponíveis na versão compartilhada.
- Cada tarefa contém um checklist e um critério de aceite. Marcar os itens somente após a execução e registrar a evidência correspondente.
- Todas as tarefas começam pendentes neste planejamento; o documento não comprova execução prévia.
- Datas e capacidade devem ser ajustadas no planejamento semanal. Não há atribuições individuais neste documento.

## Correspondência com o cronograma

| Etapa do tópico 15 | Sprint | Tarefas |
| --- | --- | --- |
| 1. Revisão e aprovação da documentação | 1 | S1-01 |
| 2. Modelagem do banco PostgreSQL | 1 | S1-02 |
| 3. Arquitetura e endpoints da API | 1 | S1-03 |
| 4. Frontend em HTML, CSS e JavaScript | 1 e 2 | S1-05, S2-03 |
| 5. Lógica de venda | 2 | S2-01, S2-02 |
| 6. Controle de concorrência | 2 e 3 | S2-01, S2-04, S3-03 |
| 7. Integração Vercel e Supabase | 1 e 3 | S1-04, S3-01, S3-02 |
| 8. Testes funcionais e concorrentes | 2, 3 e 4 | S2-04, S3-02, S3-03, S4-01 |
| 9. Documentação dos resultados | 3 e 4 | S3-04, S4-02 |
| 10. Preparação da entrega final | 4 | S4-03, S4-04 |

A ordem das etapas é ajustada para antecipar a integração e validar cada incremento. Testes e documentação acompanham o desenvolvimento.

## Sprint 1 — Base do sistema e consulta do evento

**Período:** semana 1; datas a definir no planejamento.

**Meta:** demonstrar uma consulta de evento e estoque pelo fluxo navegador → API → PostgreSQL.

### Visão geral

| ID | Entrega | Dependências técnicas |
| --- | --- | --- |
| S1-01 | Revisar documentação, delimitar entrega e priorizar backlog. | — |
| S1-02 | Modelar usuários, eventos e vendas; criar scripts SQL e dados de demonstração em `bd/`. | S1-01 |
| S1-03 | Definir arquitetura, runtime e contratos de consulta e compra; implementar consulta. | S1-01; S1-02 para consulta real |
| S1-04 | Preparar configuração de conexão ao Supabase e estrutura de execução compatível com Vercel. | S1-02, S1-03 |
| S1-05 | Criar página HTML/CSS/JavaScript para consultar evento e estoque. | S1-03; S1-04 para integração |
| S1-06 | Verificar o incremento e registrar o procedimento de execução. | S1-04, S1-05 |

### S1-01 — Revisar documentação, delimitar entrega e priorizar backlog

**Dependências:** nenhuma.

- [ ] Revisar os requisitos e registrar dúvidas e decisões de escopo.
- [ ] Definir como identificar o comprador sem exigir autenticação completa.
- [ ] Priorizar o backlog e registrar datas e capacidade para a sprint.

**Critério de aceite:** Grupo registra revisão, decisões, datas e capacidade; dúvidas sobre identificação do comprador são resolvidas sem exigir autenticação completa.

### S1-02 — Modelar usuários, eventos e vendas; criar scripts SQL e dados de demonstração em `bd/`

**Dependências:** S1-01.

- [ ] Modelar usuários, eventos e vendas e atualizar o DER.
- [ ] Definir chaves, relacionamentos e restrições de quantidade positiva e estoque não negativo.
- [ ] Criar scripts SQL e dados de demonstração em `bd/`.
- [ ] Executar os scripts em uma base vazia e verificar a recriação dos dados.

**Critério de aceite:** Modelo possui chaves e relacionamentos definidos, quantidade de venda positiva e estoque não negativo; scripts recriam a base de demonstração.

### S1-03 — Definir arquitetura, runtime e contratos de consulta e compra; implementar consulta

**Dependências:** S1-01; S1-02 para consulta real.

- [ ] Definir arquitetura e runtime compatíveis com a hospedagem prevista.
- [ ] Documentar entradas, saídas e erros dos contratos de consulta e compra.
- [ ] Implementar consulta de evento e estoque persistidos no PostgreSQL.
- [ ] Verificar as respostas de consulta válida e evento inexistente.

**Critério de aceite:** Contratos documentam entradas, saídas e erros; consulta retorna evento e estoque persistidos.

### S1-04 — Preparar configuração de conexão ao Supabase e estrutura de execução compatível com Vercel

**Dependências:** S1-02, S1-03.

- [ ] Preparar a estrutura de execução da API para a Vercel.
- [ ] Configurar a conexão ao Supabase por variáveis de ambiente no servidor.
- [ ] Criar exemplo de configuração com nomes e valores fictícios.
- [ ] Verificar a conexão e garantir que credenciais não estejam no navegador nem no repositório.

**Critério de aceite:** API conecta ao banco usando configuração de servidor; exemplo de variáveis contém apenas nomes e valores fictícios; credenciais ficam fora do navegador e do repositório.

### S1-05 — Criar página HTML/CSS/JavaScript para consultar evento e estoque

**Dependências:** S1-03; S1-04 para integração.

- [ ] Criar a página do evento em HTML, CSS e JavaScript.
- [ ] Integrar a consulta à API e exibir evento e estoque reais.
- [ ] Exibir estado de carregamento e mensagem de falha de consulta.

**Critério de aceite:** Página exibe dados reais, estado de carregamento e mensagem de falha de consulta.

### S1-06 — Verificar o incremento e registrar o procedimento de execução

**Dependências:** S1-04, S1-05.

- [ ] Verificar o fluxo navegador → API → PostgreSQL.
- [ ] Documentar instalação, configuração e execução do incremento.
- [ ] Reproduzir a consulta seguindo as instruções e registrar evidências.

**Critério de aceite:** Outro integrante consegue executar o sistema e reproduzir a consulta seguindo as instruções.

**Entrega da sprint:** consulta funcionando com persistência, modelo de dados e contratos da API. Abrange RF01–RF02 e prepara RNF03–RNF05.

## Sprint 2 — Compra com integridade transacional

**Período:** semana 2; datas a definir no planejamento.

**Meta:** concluir uma compra pela interface com registro de venda e atualização de estoque na mesma transação.

### Visão geral

| ID | Entrega | Dependências técnicas |
| --- | --- | --- |
| S2-01 | Implementar operação transacional de venda com proteção contra concorrência no PostgreSQL. | S1-02, S1-03 |
| S2-02 | Implementar endpoint de compra, validações e respostas HTTP. | S2-01 |
| S2-03 | Implementar seleção de quantidade, envio da compra e apresentação do resultado. | S1-05, S2-02 |
| S2-04 | Testar compra válida, entradas inválidas, estoque insuficiente, rollback e disputa pelo último ingresso. | S2-01, S2-02; S2-03 para interface |
| S2-05 | Revisar integração e atualizar descrição do fluxo de venda. | S2-03, S2-04 |

### S2-01 — Implementar operação transacional de venda com proteção contra concorrência no PostgreSQL

**Dependências:** S1-02, S1-03.

- [ ] Definir e documentar a estratégia de controle de concorrência no PostgreSQL.
- [ ] Implementar validação de disponibilidade, baixa de estoque e registro da venda na mesma transação.
- [ ] Garantir recusa sem venda quando o estoque for insuficiente.
- [ ] Verificar rollback integral em falha e preservação do estoque não negativo.

**Critério de aceite:** Estratégia escolhida é documentada; validação de disponibilidade, baixa e registro são atômicos; falha desfaz a operação inteira; estoque insuficiente não gera venda.

### S2-02 — Implementar endpoint de compra, validações e respostas HTTP

**Dependências:** S2-01.

- [ ] Implementar o endpoint de compra integrado à operação transacional.
- [ ] Rejeitar quantidade zero, negativa, fracionária ou não numérica e evento inexistente.
- [ ] Retornar sucesso somente após a confirmação da transação.
- [ ] Diferenciar nas respostas HTTP a indisponibilidade de estoque dos erros internos.

**Critério de aceite:** API rejeita quantidade zero, negativa, fracionária ou não numérica e evento inexistente; retorna sucesso apenas após confirmação da transação e diferencia indisponibilidade de erro interno.

### S2-03 — Implementar seleção de quantidade, envio da compra e apresentação do resultado

**Dependências:** S1-05, S2-02.

- [ ] Implementar seleção de quantidade e envio da solicitação de compra.
- [ ] Bloquear novo envio enquanto a solicitação estiver pendente.
- [ ] Exibir confirmação, recusa ou falha e atualizar o estoque após a resposta.
- [ ] Verificar o fluxo completo pela interface com a API real.

**Critério de aceite:** Interface informa sucesso ou recusa, atualiza estoque após a resposta e bloqueia novo envio enquanto a solicitação está pendente.

### S2-04 — Testar compra válida, entradas inválidas, estoque insuficiente, rollback e disputa pelo último ingresso

**Dependências:** S2-01, S2-02; S2-03 para interface.

- [ ] Testar compra válida e conferir venda registrada e estoque atualizado.
- [ ] Testar entradas inválidas e estoque insuficiente sem alterações indevidas na base.
- [ ] Induzir falha controlada em teste e verificar rollback integral.
- [ ] Disputar o último ingresso com duas requisições simultâneas e conferir uma confirmação e uma recusa.
- [ ] Registrar entradas, resultados esperados e observados e evidências.

**Critério de aceite:** Casos registram entrada, resultado esperado e observado; duas compras simultâneas de um ingresso com estoque inicial 1 produzem uma confirmação e uma recusa por indisponibilidade.

### S2-05 — Revisar integração e atualizar descrição do fluxo de venda

**Dependências:** S2-03, S2-04.

- [ ] Revisar a integração entre interface, API e transação.
- [ ] Atualizar a documentação do fluxo de venda conforme a implementação.
- [ ] Demonstrar o fluxo completo e corrigir falhas de integridade antes do aceite.

**Critério de aceite:** Fluxo completo é demonstrável; código e documentação concordam; falhas de integridade impedem considerar a entrega concluída.

**Entrega da sprint:** compra funcional e protegida, com testes iniciais de concorrência. Abrange RF03–RF09 e RNF01–RNF02. Impedir cliques repetidos na interface não substitui a proteção transacional no banco.

## Sprint 3 — Hospedagem e validação concorrente

**Período:** semana 3; datas a definir no planejamento.

**Meta:** executar o fluxo completo na infraestrutura prevista e comprovar a consistência sob solicitações simultâneas.

### Visão geral

| ID | Entrega | Dependências técnicas |
| --- | --- | --- |
| S3-01 | Publicar frontend e API na Vercel e configurar conexão ao Supabase. | S2-05 |
| S3-02 | Executar regressão funcional no ambiente hospedado e corrigir integração da interface. | S3-01 |
| S3-03 | Criar e executar roteiro automatizado de concorrência via API. | S3-01 |
| S3-04 | Registrar resultados, investigar falhas e corrigir API ou transação. | S3-02, S3-03 |

### S3-01 — Publicar frontend e API na Vercel e configurar conexão ao Supabase

**Dependências:** S2-05.

- [ ] Configurar o ambiente da Vercel e a conexão ao Supabase.
- [ ] Publicar frontend e API e verificar o acesso por HTTPS.
- [ ] Validar consulta e compra no banco remoto.
- [ ] Documentar configuração e limitações observadas sem expor credenciais.

**Critério de aceite:** Aplicação acessível por HTTPS; API consulta e vende no banco remoto; configuração e limitações observadas são documentadas.

### S3-02 — Executar regressão funcional no ambiente hospedado e corrigir integração da interface

**Dependências:** S3-01.

- [ ] Executar consulta e compra válida pela interface hospedada.
- [ ] Verificar quantidade inválida, estoque insuficiente e mensagens de falha.
- [ ] Corrigir problemas de integração e repetir os casos afetados.
- [ ] Verificar que o cliente não expõe credenciais administrativas e registrar evidências.

**Critério de aceite:** Consulta, compra válida, quantidade inválida, estoque insuficiente e mensagens de falha funcionam pela interface; nenhuma credencial administrativa aparece no cliente.

### S3-03 — Criar e executar roteiro automatizado de concorrência via API

**Dependências:** S3-01.

- [ ] Criar roteiro automatizado via API com restauração dos dados exclusivos de teste.
- [ ] Permitir configurar estoque, quantidades e requisições simultâneas.
- [ ] Executar os quatro cenários mínimos de concorrência descritos abaixo.
- [ ] Comparar respostas, registros de vendas e estoque final; separar recusas de erros técnicos e timeouts.
- [ ] Registrar parâmetros e evidências para reprodução dos testes.

**Critério de aceite:** Roteiro permite restaurar os dados de teste, configurar requisições simultâneas e comparar respostas, vendas e estoque conforme os cenários abaixo.

### S3-04 — Registrar resultados, investigar falhas e corrigir API ou transação

**Dependências:** S3-02, S3-03.

- [ ] Consolidar ambiente, configuração, resultados e evidências dos testes.
- [ ] Investigar divergências entre respostas, vendas e estoque.
- [ ] Corrigir falhas na API ou na transação e reexecutar os cenários afetados.
- [ ] Atualizar o relatório com os resultados após as correções e limitações restantes.

**Critério de aceite:** Relatório contém ambiente, configuração, resultados e evidências; toda correção relevante é seguida da reexecução do cenário que falhou.

### Cenários mínimos de concorrência

Executar em evento e dados exclusivos de teste. Os valores abaixo são parâmetros propostos para uma demonstração acadêmica, não metas de capacidade da plataforma.

| Cenário | Preparação e execução | Resultado esperado |
| --- | --- | --- |
| Último ingresso | Estoque 1; duas solicitações simultâneas de 1 unidade. | Uma venda confirmada, uma recusa por estoque e saldo 0. |
| Demanda superior ao estoque | Estoque 10; vinte solicitações simultâneas de 1 unidade. | Sem falhas de infraestrutura, dez confirmações, dez recusas por estoque e saldo 0. |
| Quantidades diferentes | Estoque 10; solicitações simultâneas de 2, 3, 4 e 5 unidades. | Ordem de atendimento pode variar; soma das quantidades vendidas não excede 10 e saldo corresponde às vendas confirmadas. |
| Falha durante a transação | Induzir falha controlada entre baixa e registro da venda no ambiente de teste. | Transação é desfeita; não há baixa sem venda nem venda sem baixa. |

Em todos os cenários, verificar **estoque final = estoque inicial − soma das quantidades das vendas confirmadas**, estoque final não negativo e correspondência entre confirmações e registros de venda. Comparar quantidades de ingressos, não apenas número de vendas. Separar recusas por estoque de erros técnicos e timeouts; nesses casos, consultar a persistência antes de concluir o resultado. Registrar divergências e repetir o teste após correção.

**Entrega da sprint:** aplicação hospedada, testes reproduzíveis e relatório de resultados. Valida RF01–RF09 e RNF01–RNF06 nos cenários executados.

## Sprint 4 — Consolidação e entrega acadêmica

**Período:** semana 4; datas a definir no planejamento.

**Meta:** entregar uma versão reproduzível, documentada e pronta para demonstração.

### Visão geral

| ID | Entrega | Dependências técnicas |
| --- | --- | --- |
| S4-01 | Corrigir pendências e executar regressão final funcional e concorrente. | S3-04 |
| S4-02 | Consolidar documentação técnica e resultados em `docs/`. | S3-04, S4-01 |
| S4-03 | Preparar e ensaiar demonstração de consulta, compra e disputa por estoque. | S4-01, S4-02 |
| S4-04 | Conferir e organizar entrega final. | S4-02, S4-03 |

### S4-01 — Corrigir pendências e executar regressão final funcional e concorrente

**Dependências:** S3-04.

- [ ] Revisar e corrigir as pendências do relatório de testes.
- [ ] Executar regressão funcional e concorrente na versão final.
- [ ] Verificar integridade do estoque, proteção de credenciais e funcionamento do fluxo principal.
- [ ] Registrar os resultados e resolver falhas que impeçam a entrega.

**Critério de aceite:** Não restam falhas conhecidas que violem integridade, exponham credenciais ou impeçam o fluxo principal; testes relevantes passam na versão final.

### S4-02 — Consolidar documentação técnica e resultados em `docs/`

**Dependências:** S3-04, S4-01.

- [ ] Consolidar arquitetura, modelo de dados, endpoints e estratégia transacional em `docs/`.
- [ ] Atualizar instruções de configuração e execução.
- [ ] Organizar testes, evidências e limitações da versão entregue.
- [ ] Conferir a correspondência entre documentação e implementação final.

**Critério de aceite:** Documentação descreve arquitetura real, modelo, endpoints, transação, configuração, testes, evidências e limitações; resultados correspondem à versão entregue.

### S4-03 — Preparar e ensaiar demonstração de consulta, compra e disputa por estoque

**Dependências:** S4-01, S4-02.

- [ ] Preparar dados e roteiro de consulta, compra e disputa pelo estoque.
- [ ] Explicar no roteiro o papel do cliente, da API e do banco.
- [ ] Ensaiar a demonstração e verificar a reprodução da sequência.

**Critério de aceite:** Roteiro tem dados preparados, sequência reproduzível e explicação do papel de cliente, API e banco; a sequência foi ensaiada e pode ser reproduzida.

### S4-04 — Conferir e organizar entrega final

**Dependências:** S4-02, S4-03.

- [ ] Organizar código, scripts SQL, instruções e relatório para acesso na entrega.
- [ ] Conferir endereço e funcionamento da aplicação hospedada.
- [ ] Reproduzir a execução a partir das instruções finais.
- [ ] Conferir formato e prazo exigidos pela disciplina e registrar pendências, se houver.

**Critério de aceite:** Código, SQL, instruções, endereço da aplicação e relatório estão acessíveis; outro integrante reproduz a execução; formato e prazo exigidos pela disciplina são conferidos.

**Entrega da sprint:** versão final, documentação e demonstração preparadas para avaliação.

## Acompanhamento das tarefas

Usar um quadro com as colunas **Backlog → A fazer na sprint → Em andamento → Em revisão/teste → Concluído**. Cada cartão usa o ID deste documento e registra dependências, checklist, critério de aceite, estimativa acordada e evidência da conclusão. Todas as tarefas deste plano começam como **Backlog**; o documento não atesta execução prévia.

- No planejamento semanal, definir datas, meta e tarefas compatíveis com a disponibilidade; estimar esforço em conjunto e dividir tarefas grandes antes de iniciá-las.
- Fazer um alinhamento diário breve, de até 15 minutos quando houver trabalho, para verificar avanço em direção à meta e impedimentos.
- Ao final de cada sprint, demonstrar o incremento na review e verificar os critérios de aceite.
- Realizar uma retrospectiva curta e escolher uma melhoria concreta para a próxima semana.
- Registrar bloqueios no cartão e comunicar ao grupo; dependências não resolvidas impedem a conclusão, mas permitem adiantar atividades independentes.
- Replanejar tarefas não concluídas no próximo planejamento, registrando o motivo. Novas funcionalidades voltam ao backlog e são avaliadas frente ao prazo.

## Definição de pronto

Uma tarefa só pode ir para **Concluído** quando:

- Seu critério de aceite foi atendido e há evidência verificável, como revisão, demonstração ou resultado de teste.
- Código ou documentação foi revisado por outro integrante e integrado à versão compartilhada.
- Os testes pertinentes foram executados e as instruções afetadas estão atualizadas.
- Não foram introduzidas credenciais no código compartilhado nem exposição de acesso administrativo no navegador.
- Quando afeta compras, a consistência entre venda e estoque foi validada, inclusive em falhas e concorrência.

Se o prazo exigir redução de trabalho, priorizar o fluxo completo e a integridade do estoque, simplificando o acabamento visual e mantendo funcionalidades opcionais fora da entrega. A conclusão do projeto depende da verificação dos requisitos previstos e da entrega final, não apenas do encerramento das quatro semanas.
