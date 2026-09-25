# Planejamento de sprints

## Objetivo e referência

Organizar o desenvolvimento do **Sistema de Venda de Ingressos com Venda Imediata e Controle de Concorrência**, transformando as dez etapas do tópico 15 — Cronograma da [Documentação NP1](Trabalho%20Sistemas%20Distribuidos%20Documentacao%20NP1.md) em tarefas acompanháveis e entregas verificáveis.

## Metodologia escolhida: Scrum adaptado

O projeto tem uma equipe de cinco integrantes, escopo inicial delimitado e uma entrega acadêmica. Sprints curtas permitem distribuir o trabalho, demonstrar incrementos e corrigir problemas de integração antes da entrega final. O planejamento adota Scrum com cerimônias reduzidas à disponibilidade do grupo.

**Proposta de duração:** quatro sprints de uma semana. A documentação não informa início, prazo final nem disponibilidade individual; portanto, as semanas são relativas e as durações e atribuições abaixo são propostas, não compromissos já aprovados. No primeiro planejamento, o grupo deve registrar as datas e ajustar a quantidade de tarefas à sua capacidade.

**Objetivo do produto:** permitir consultar um evento e comprar ingressos com confirmação imediata, preservando a consistência entre estoque e vendas mesmo com solicitações simultâneas.

Permanecem fora desta entrega: pagamento real, emissão comercial de ingressos, integração com bilheterias externas, administração completa de eventos, reembolsos reais e autenticação completa.

## Organização da equipe

Todos participam do desenvolvimento, dos testes e da revisão. As responsabilidades propostas indicam quem conduz cada tarefa; não impedem colaboração ou troca de atribuições no planejamento.

| Integrante | Responsabilidade proposta |
| --- | --- |
| Guilherme Salustiano | Coordenação, priorização do backlog como Product Owner e integração da infraestrutura. |
| Caio Scorsoni Martins Oliveira | Facilitação como Scrum Master, acompanhamento de impedimentos, testes e evidências. |
| Caio Vinicius Luiz Alves | Frontend e integração da interface com a API. |
| Gustavo Henrique Rodrigues de Magalhães | Modelagem, scripts PostgreSQL e integridade transacional. |
| Robert Estevan da Silva Junior | Arquitetura da API, endpoints e regras da venda. |

Guilherme já consta como coordenador na documentação. Os demais papéis e a distribuição técnica são sugestões para este plano, sem pressupor especializações prévias.

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

| ID | Tarefa | Responsável | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| S1-01 | Revisar documentação, delimitar entrega e priorizar backlog. | Guilherme | — | Grupo registra revisão, decisões, datas e capacidade; dúvidas sobre identificação do comprador são resolvidas sem exigir autenticação completa. |
| S1-02 | Modelar usuários, eventos e vendas; criar scripts SQL e dados de demonstração em `bd/`. | Gustavo | S1-01 | Modelo possui chaves e relacionamentos definidos, quantidade de venda positiva e estoque não negativo; scripts recriam a base de demonstração. |
| S1-03 | Definir arquitetura, runtime e contratos de consulta e compra; implementar consulta. | Robert | S1-01; S1-02 para consulta real | Contratos documentam entradas, saídas e erros; consulta retorna evento e estoque persistidos. |
| S1-04 | Preparar configuração de conexão ao Supabase e estrutura de execução compatível com Vercel. | Guilherme | S1-02, S1-03 | API conecta ao banco usando configuração de servidor; exemplo de variáveis contém apenas nomes e valores fictícios; credenciais ficam fora do navegador e do repositório. |
| S1-05 | Criar página HTML/CSS/JavaScript para consultar evento e estoque. | Caio Vinicius | S1-03; S1-04 para integração | Página exibe dados reais, estado de carregamento e mensagem de falha de consulta. |
| S1-06 | Verificar o incremento e registrar o procedimento de execução. | Caio Scorsoni | S1-04, S1-05 | Outro integrante consegue executar o sistema e reproduzir a consulta seguindo as instruções. |

**Entrega da review:** consulta funcionando com persistência, modelo de dados e contratos da API. Abrange RF01–RF02 e prepara RNF03–RNF05.

## Sprint 2 — Compra com integridade transacional

**Período:** semana 2; datas a definir no planejamento.

**Meta:** concluir uma compra pela interface com registro de venda e atualização de estoque na mesma transação.

| ID | Tarefa | Responsável | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| S2-01 | Implementar operação transacional de venda com proteção contra concorrência no PostgreSQL. | Gustavo | S1-02, S1-03 | Estratégia escolhida é documentada; validação de disponibilidade, baixa e registro são atômicos; falha desfaz a operação inteira; estoque insuficiente não gera venda. |
| S2-02 | Implementar endpoint de compra, validações e respostas HTTP. | Robert | S2-01 | API rejeita quantidade zero, negativa, fracionária ou não numérica e evento inexistente; retorna sucesso apenas após confirmação da transação e diferencia indisponibilidade de erro interno. |
| S2-03 | Implementar seleção de quantidade, envio da compra e apresentação do resultado. | Caio Vinicius | S1-05, S2-02 | Interface informa sucesso ou recusa, atualiza estoque após a resposta e bloqueia novo envio enquanto a solicitação está pendente. |
| S2-04 | Testar compra válida, entradas inválidas, estoque insuficiente, rollback e disputa pelo último ingresso. | Caio Scorsoni | S2-01, S2-02; S2-03 para interface | Casos registram entrada, resultado esperado e observado; duas compras simultâneas de um ingresso com estoque inicial 1 produzem uma confirmação e uma recusa por indisponibilidade. |
| S2-05 | Revisar integração e atualizar descrição do fluxo de venda. | Guilherme | S2-03, S2-04 | Fluxo completo é demonstrável; código e documentação concordam; falhas de integridade impedem considerar a entrega concluída. |

**Entrega da review:** compra funcional e protegida, com testes iniciais de concorrência. Abrange RF03–RF09 e RNF01–RNF02. Impedir cliques repetidos na interface não substitui a proteção transacional no banco.

## Sprint 3 — Hospedagem e validação concorrente

**Período:** semana 3; datas a definir no planejamento.

**Meta:** executar o fluxo completo na infraestrutura prevista e comprovar a consistência sob solicitações simultâneas.

| ID | Tarefa | Responsável | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| S3-01 | Publicar frontend e API na Vercel e configurar conexão ao Supabase. | Guilherme | S2-05 | Aplicação acessível por HTTPS; API consulta e vende no banco remoto; configuração e limitações observadas são documentadas. |
| S3-02 | Executar regressão funcional no ambiente hospedado e corrigir integração da interface. | Caio Vinicius | S3-01 | Consulta, compra válida, quantidade inválida, estoque insuficiente e mensagens de falha funcionam pela interface; nenhuma credencial administrativa aparece no cliente. |
| S3-03 | Criar e executar roteiro automatizado de concorrência via API. | Caio Scorsoni, com Gustavo | S3-01 | Roteiro permite restaurar os dados de teste, configurar requisições simultâneas e comparar respostas, vendas e estoque conforme os cenários abaixo. |
| S3-04 | Registrar resultados, investigar falhas e corrigir API ou transação. | Robert, com Gustavo | S3-02, S3-03 | Relatório contém ambiente, configuração, resultados e evidências; toda correção relevante é seguida da reexecução do cenário que falhou. |

### Cenários mínimos de concorrência

Executar em evento e dados exclusivos de teste. Os valores abaixo são parâmetros propostos para uma demonstração acadêmica, não metas de capacidade da plataforma.

| Cenário | Preparação e execução | Resultado esperado |
| --- | --- | --- |
| Último ingresso | Estoque 1; duas solicitações simultâneas de 1 unidade. | Uma venda confirmada, uma recusa por estoque e saldo 0. |
| Demanda superior ao estoque | Estoque 10; vinte solicitações simultâneas de 1 unidade. | Sem falhas de infraestrutura, dez confirmações, dez recusas por estoque e saldo 0. |
| Quantidades diferentes | Estoque 10; solicitações simultâneas de 2, 3, 4 e 5 unidades. | Ordem de atendimento pode variar; soma das quantidades vendidas não excede 10 e saldo corresponde às vendas confirmadas. |
| Falha durante a transação | Induzir falha controlada entre baixa e registro da venda no ambiente de teste. | Transação é desfeita; não há baixa sem venda nem venda sem baixa. |

Em todos os cenários, verificar **estoque final = estoque inicial − soma das quantidades das vendas confirmadas**, estoque final não negativo e correspondência entre confirmações e registros de venda. Comparar quantidades de ingressos, não apenas número de vendas. Separar recusas por estoque de erros técnicos e timeouts; nesses casos, consultar a persistência antes de concluir o resultado. Registrar divergências e repetir o teste após correção.

**Entrega da review:** aplicação hospedada, testes reproduzíveis e relatório de resultados. Valida RF01–RF09 e RNF01–RNF06 nos cenários executados.

## Sprint 4 — Consolidação e entrega acadêmica

**Período:** semana 4; datas a definir no planejamento.

**Meta:** entregar uma versão reproduzível, documentada e pronta para demonstração.

| ID | Tarefa | Responsável | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- |
| S4-01 | Corrigir pendências e executar regressão final funcional e concorrente. | Robert e Gustavo; verificação por Caio Scorsoni | S3-04 | Não restam falhas conhecidas que violem integridade, exponham credenciais ou impeçam o fluxo principal; testes relevantes passam na versão final. |
| S4-02 | Consolidar documentação técnica e resultados em `docs/`. | Guilherme, com Caio Scorsoni | S3-04, S4-01 | Documentação descreve arquitetura real, modelo, endpoints, transação, configuração, testes, evidências e limitações; resultados correspondem à versão entregue. |
| S4-03 | Preparar e ensaiar demonstração de consulta, compra e disputa por estoque. | Caio Vinicius, com toda a equipe | S4-01, S4-02 | Roteiro tem dados preparados, sequência reproduzível e explicação do papel de cliente, API e banco; todos conhecem sua participação. |
| S4-04 | Conferir e organizar entrega final. | Guilherme, com toda a equipe | S4-02, S4-03 | Código, SQL, instruções, endereço da aplicação e relatório estão acessíveis; outro integrante reproduz a execução; formato e prazo exigidos pela disciplina são conferidos. |

**Entrega da review:** versão final, documentação e demonstração preparadas para avaliação.

## Acompanhamento das tarefas

Usar um quadro com as colunas **Backlog → A fazer na sprint → Em andamento → Em revisão/teste → Concluído**. Cada cartão usa o ID deste documento e registra responsável, dependências, critério de aceite, estimativa acordada e evidência da conclusão. Todas as tarefas deste plano começam como **Backlog**; o documento não atesta execução prévia.

- No planejamento semanal, definir datas, meta e tarefas compatíveis com a disponibilidade; estimar esforço em conjunto e dividir tarefas grandes antes de iniciá-las.
- Fazer um alinhamento diário breve, de até 15 minutos quando houver trabalho, para verificar avanço em direção à meta e impedimentos.
- Ao final de cada sprint, demonstrar o incremento na review e verificar os critérios de aceite.
- Realizar uma retrospectiva curta e escolher uma melhoria concreta para a próxima semana.
- Marcar bloqueios no cartão e avisar o facilitador; dependências não resolvidas impedem a conclusão, mas permitem adiantar atividades independentes.
- Replanejar tarefas não concluídas no próximo planejamento, registrando o motivo. Novas funcionalidades voltam ao backlog e são avaliadas frente ao prazo.

## Definição de pronto

Uma tarefa só pode ir para **Concluído** quando:

- Seu critério de aceite foi atendido e há evidência verificável, como revisão, demonstração ou resultado de teste.
- Código ou documentação foi revisado por outro integrante e integrado à versão compartilhada.
- Os testes pertinentes foram executados e as instruções afetadas estão atualizadas.
- Não foram introduzidas credenciais no código compartilhado nem exposição de acesso administrativo no navegador.
- Quando afeta compras, a consistência entre venda e estoque foi validada, inclusive em falhas e concorrência.

Se o prazo exigir redução de trabalho, priorizar o fluxo completo e a integridade do estoque, simplificando o acabamento visual e mantendo funcionalidades opcionais fora da entrega. A conclusão do projeto depende da verificação dos requisitos previstos e da entrega final, não apenas do encerramento das quatro semanas.
