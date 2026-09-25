# **Guia 1**

 

**UNIVERSIDADE PAULISTA**

**CURSO DE CIÊNCIA DA COMPUTAÇÃO**

 

 

 

 

 

**DESENVOLVIMENTO DE SISTEMAS DISTRIBUÍDOS**

 

   

 

 

 

 

**SISTEMA DE VENDA DE INGRESSOS COM VENDA IMEDIATA E CONTROLE DE CONCORRÊNCIA \- DOCUMENTAÇÃO**

 

 

 

 

 

 

 

**CAMPINAS**

**2026**

**CAIO SCORSONI MARTINS OLIVEIRA \- F346EH2 \- CC8Q12**

**CAIO VINICIUS LUIZ ALVES \- F351041 \- CC8P12**

**GUILHERME DOS SANTOS SALUSTIANO \- G7661F0 \- CC8P12**

**GUSTAVO HENRIQUE RODRIGUES DE MAGALHÃES \- F354776 \- CC8P12**

**ROBERT ESTEVAN DA SILVA JUNIOR \- N8794F6 \- CC8P12**

   
   
   
   
   
   
   
   
**SISTEMA DE VENDA DE INGRESSOS COM VENDA IMEDIATA E CONTROLE DE CONCORRÊNCIA – DOCUMENTAÇÃO**

Trabalho acadêmico apresentado à disciplina Desenvolvimento de Sistemas Distribuídos, do curso de Ciência da Computação da Universidade Paulista – UNIP, como parte da avaliação NP1.  
Professor: Marcelo Passaro Fontana.

**CAMPINAS**  
**2026**

## **SUMÁRIO**

[**1\. IDENTIFICAÇÃO DO PROJETO**](#1-identificação-do-projeto)

[**2\. INTRODUÇÃO**](#2-introdução)

[**3\. JUSTIFICATIVA**](#3-justificativa)

[**4\. OBJETIVOS**](#4-objetivos)

[4.1. Objetivo Geral](#4.1-objetivo-geral)

[4.2. Objetivos Específicos](#4.2-objetivos-específicos)

[**5\. ESCOPO DO PROJETO**](#5-escopo-do-projeto)

[5.1. Funcionalidades Incluídas](#5.1-funcionalidades-incluídas)

[5.2. Funcionalidades Não Incluídas no Escopo Inicial](#5.2-funcionalidades-não-incluídas-no-escopo-inicial)

[**6\. ARQUITETURA DO SISTEMA**](#6-arquitetura-do-sistema)

[6.1. Visão Geral](#6.1-visão-geral)

[6.2. Cliente](#6.2-cliente)

[6.3. Servidor de Aplicação](#6.3-servidor-de-aplicação)

[6.4. Servidor de Banco de Dados](#6.4-servidor-de-banco-de-dados)

[**7\. TECNOLOGIAS UTILIZADAS**](#7-tecnologias-utilizadas)

[7.1. Frontend](#7.1-frontend)

[7.2. Backend](#7.2-backend)

[7.3. Banco de Dados](#7.3-banco-de-dados)

[7.4. Hospedagem](#7.4-hospedagem)

[**8\. MODELO DE DADOS**](#8-modelo-de-dados)

[8.1. Usuários](#8.1-usuários)

[8.2. Eventos](#8.2-eventos)

[8.3. Vendas](#8.3-vendas)

[**9\. CONTROLE DE CONCORRÊNCIA**](#9-controle-de-concorrência)

[9.1. Descrição do Problema](#9.1-descrição-do-problema)

[9.2. Estratégia de Controle](#9.2-estratégia-de-controle)

[9.3. Comportamento Esperado](#9.3-comportamento-esperado)

[**10\. COMUNICAÇÃO ENTRE OS COMPONENTES**](#10-comunicação-entre-os-componentes)

[**11\. REQUISITOS FUNCIONAIS**](#11-requisitos-funcionais)

[**12\. REQUISITOS NÃO FUNCIONAIS**](#12-requisitos-não-funcionais)

[**13\. TESTES DO SISTEMA**](#13-testes-do-sistema)

[13.1. Testes Funcionais](#13.1-testes-funcionais)

[13.2. Testes de Concorrência](#13.2-testes-de-concorrência)

[**14\. LIMITAÇÕES E CONSIDERAÇÕES**](#14-limitações-e-considerações)

[**15\. CRONOGRAMA**](#15-cronograma)

[**16\. RESULTADOS ESPERADOS**](#16-resultados-esperados)

[**17\. CONSIDERAÇÕES FINAIS**](#17-considerações-finais)

## **1 IDENTIFICAÇÃO DO PROJETO** {#1-identificação-do-projeto}

Título: Sistema de Venda de Ingressos com Venda Imediata e Controle de Concorrência  
Disciplina: Desenvolvimento de Sistemas Distribuídos  
Curso: Ciência da Computação  
Instituição: Universidade Paulista – UNIP  
Coordenador do grupo: Guilherme Salustiano  
---

## **2 INTRODUÇÃO** {#2-introdução}

O presente projeto consiste no desenvolvimento de um sistema web de venda de ingressos para eventos com quantidade limitada de unidades disponíveis.  
A aplicação permitirá que os usuários consultem o evento, informem a quantidade de ingressos desejada e realizem uma solicitação de compra com confirmação imediata, condicionada à disponibilidade de estoque.  
O principal objetivo técnico do projeto é demonstrar o funcionamento de um sistema distribuído composto por uma camada de aplicação e uma camada de persistência de dados, com foco no controle de concorrência e na integridade das informações armazenadas.  
O sistema será desenvolvido utilizando HTML, CSS e JavaScript no frontend, uma API para o processamento das requisições e PostgreSQL como sistema gerenciador de banco de dados. A infraestrutura proposta utilizará a Vercel para hospedagem da aplicação e o Supabase para hospedagem do banco de dados PostgreSQL.  
---

## **3 JUSTIFICATIVA** {#3-justificativa}

Sistemas de venda de ingressos apresentam um problema relevante de concorrência, pois diversos usuários podem tentar adquirir unidades de um recurso limitado simultaneamente.  
Quando o controle de estoque não é realizado de forma adequada, podem ocorrer inconsistências, como a venda de uma quantidade superior à disponível ou a confirmação de operações incompatíveis.  
O projeto busca demonstrar, em um cenário prático, a utilização de mecanismos de controle de concorrência e transações de banco de dados para preservar a integridade do estoque.  
A separação entre a aplicação e o banco de dados também permite representar a comunicação entre componentes distribuídos, tornando possível observar o fluxo de requisições e o processamento das operações de venda.  
---

## **4 OBJETIVOS** {#4-objetivos}

### 4.1 Objetivo Geral {#4.1-objetivo-geral}

Desenvolver um sistema web de venda imediata de ingressos com controle de concorrência, utilizando uma arquitetura distribuída composta por uma camada de aplicação e um banco de dados PostgreSQL.

### 4.2 Objetivos Específicos {#4.2-objetivos-específicos}

* Desenvolver uma interface web utilizando HTML, CSS e JavaScript.  
* Disponibilizar informações sobre o evento e a quantidade de ingressos disponíveis.  
* Permitir que o usuário informe a quantidade de ingressos desejada.  
* Implementar uma API para receber e processar solicitações de compra.  
* Armazenar informações de usuários, eventos, estoque e vendas no PostgreSQL.  
* Implementar uma operação de venda protegida contra condições de corrida.  
* Garantir que o estoque não seja reduzido abaixo de zero.  
* Registrar as vendas de maneira consistente com a atualização do estoque.  
* Demonstrar a comunicação entre a aplicação e o banco de dados em servidores distintos.  
* Realizar testes com requisições concorrentes para verificar a integridade do estoque.

---

## **5 ESCOPO DO PROJETO** {#5-escopo-do-projeto}

### 5.1 Funcionalidades Incluídas {#5.1-funcionalidades-incluídas}

O sistema terá como escopo inicial:

1. Exibição das informações do evento.  
2. Consulta da quantidade de ingressos disponíveis.  
3. Seleção da quantidade de ingressos pelo usuário.  
4. Envio de uma solicitação de compra.  
5. Validação da disponibilidade do estoque.  
6. Registro da venda quando houver disponibilidade.  
7. Atualização do estoque de forma consistente.  
8. Retorno de mensagens de sucesso ou falha.  
9. Persistência dos dados no banco de dados PostgreSQL.  
10. Testes de concorrência para avaliar o comportamento do sistema em solicitações simultâneas.

### 5.2 Funcionalidades Não Incluídas no Escopo Inicial {#5.2-funcionalidades-não-incluídas-no-escopo-inicial}

O projeto não prevê, nesta etapa, a implementação obrigatória de:

* Integração com gateways de pagamento reais.  
* Emissão de ingressos com validade comercial.  
* Integração com sistemas externos de bilheteria.  
* Sistema completo de administração de eventos.  
* Processamento de reembolsos reais.

Essas funcionalidades poderão ser consideradas como extensões futuras, caso sejam necessárias e compatíveis com o cronograma da disciplina.  
---

## **6 ARQUITETURA DO SISTEMA** {#6-arquitetura-do-sistema}

### 6.1 Visão Geral {#6.1-visão-geral}

A arquitetura proposta é composta por três elementos principais:

* Cliente: navegador utilizado pelo usuário.  
* Servidor de aplicação: hospeda o frontend e a API responsável pela lógica do sistema.  
* Servidor de banco de dados: hospeda o PostgreSQL e mantém os dados persistidos.

A hospedagem da aplicação será realizada na Vercel, enquanto o banco de dados PostgreSQL será disponibilizado por meio do Supabase.  
O cliente não realizará acesso direto às credenciais administrativas do banco de dados. As requisições serão encaminhadas à camada de aplicação, responsável por executar as validações e interagir com o banco de dados.

### 6.2 Cliente {#6.2-cliente}

O cliente será executado no navegador e utilizará HTML, CSS e JavaScript para disponibilizar a interface de interação com o sistema.  
Suas responsabilidades incluem:

* Apresentar as informações do evento.  
* Permitir a seleção da quantidade de ingressos.  
* NEnviar requisições para a API.  
* Apresentar o resultado das operações ao usuário.

### 6.3 Servidor de Aplicação {#6.3-servidor-de-aplicação}

O servidor de aplicação será responsável por processar as requisições enviadas pelo cliente e intermediar a comunicação com o banco de dados.  
Suas responsabilidades incluem:

* Receber requisições HTTP.  
* Validar os dados enviados pelo cliente.  
* Encaminhar operações de consulta e venda ao PostgreSQL.  
* Processar os resultados das operações.  
* Retornar respostas HTTP adequadas.

A aplicação será hospedada na Vercel utilizando o modelo de execução de backend compatível com a plataforma. A documentação da plataforma apresenta o Node.js como uma das opções de execução de funções de backend (Vercel, \[s. d.\]).

### 6.4 Servidor de Banco de Dados {#6.4-servidor-de-banco-de-dados}

O servidor de banco de dados será responsável por armazenar e manter a integridade das informações do sistema.  
O PostgreSQL será utilizado para armazenar:

* Dados de usuários.  
* Dados dos eventos.  
* Quantidade de ingressos disponíveis.  
* Registros das vendas.

A camada de banco de dados será responsável por executar as operações transacionais necessárias à atualização consistente do estoque e ao registro das vendas.  
---

## **7 TECNOLOGIAS UTILIZADAS** {#7-tecnologias-utilizadas}

### 7.1 Frontend {#7.1-frontend}

* HTML5: estrutura das páginas web.  
* CSS3: estilização e apresentação visual.  
* JavaScript: interatividade, validações do cliente e comunicação com a API.

### 7.2 Backend {#7.2-backend}

* API HTTP: camada responsável pelo processamento das requisições e pela aplicação das regras de negócio.  
* Runtime e estrutura de execução: definidos conforme a implementação escolhida para hospedagem na Vercel.

### 7.3 Banco de Dados {#7.3-banco-de-dados}

* PostgreSQL: sistema gerenciador de banco de dados relacional utilizado para persistência e controle da integridade das informações.  
* Supabase: plataforma de hospedagem e gerenciamento do banco de dados PostgreSQL (Supabase, \[s. d.\]).

### 7.4 Hospedagem {#7.4-hospedagem}

* Vercel: hospedagem da aplicação web e da camada de backend, conforme os recursos disponibilizados pela plataforma.  
* Supabase: hospedagem do banco de dados PostgreSQL.

---

## **8 MODELO DE DADOS** {#8-modelo-de-dados}

O sistema deverá possuir uma estrutura relacional capaz de armazenar os dados necessários à operação de venda de ingressos.  
As entidades inicialmente previstas são:

### 8.1 Usuários {#8.1-usuários}

Armazena os dados dos usuários envolvidos nas operações do sistema.  
A estrutura poderá conter identificador, nome, e-mail e data de cadastro, conforme os requisitos que forem definidos.

### 8.2 Eventos {#8.2-eventos}

Armazena as informações do evento e o estoque de ingressos disponível.  
A estrutura deverá contemplar um identificador do evento e a quantidade de ingressos disponíveis, além de outros atributos necessários à apresentação do evento.

### 8.3 Vendas {#8.3-vendas}

Armazena os registros de compras confirmadas.  
A estrutura deverá permitir identificar o evento, a quantidade adquirida, o usuário relacionado quando aplicável e os dados necessários para registrar a operação.  
O modelo de dados definitivo será elaborado durante a etapa de modelagem do banco de dados, considerando as regras de integridade e os requisitos funcionais do sistema.  
---

## **9 CONTROLE DE CONCORRÊNCIA** {#9-controle-de-concorrência}

### 9.1 Descrição do Problema {#9.1-descrição-do-problema}

O sistema deverá lidar com solicitações de compra que podem ser realizadas simultaneamente por diferentes usuários.  
Considerando um estoque limitado, duas ou mais requisições podem tentar adquirir ingressos ao mesmo tempo. Caso as operações de consulta e atualização do estoque sejam executadas sem proteção adequada, existe o risco de ocorrerem inconsistências no estoque.

### 9.2 Estratégia de Controle {#9.2-estratégia-de-controle}

A operação de venda deverá utilizar mecanismos de controle de concorrência disponibilizados pelo PostgreSQL (PostgreSQL Global Development Group, \[s. d.\]).  
A validação da quantidade disponível e a atualização do estoque deverão ser realizadas de forma que operações concorrentes não permitam a confirmação de vendas acima da quantidade disponível.  
O registro da venda e a alteração do estoque deverão ser tratados de forma transacional, garantindo que a operação seja confirmada integralmente ou desfeita em caso de falha.

### 9.3 Comportamento Esperado {#9.3-comportamento-esperado}

Quando houver estoque suficiente:

1. O sistema valida os dados da solicitação.  
2. O banco de dados realiza a operação de controle do estoque.  
3. A venda é registrada.  
4. A transação é confirmada.  
5. O cliente recebe uma resposta de sucesso.

Quando não houver estoque suficiente:

1. O sistema identifica a indisponibilidade.  
2. A operação de venda não é confirmada.  
3. O estoque permanece consistente.  
4. O cliente recebe uma resposta informando a falha.

---

## **10 COMUNICAÇÃO ENTRE OS COMPONENTES** {#10-comunicação-entre-os-componentes}

A comunicação do sistema ocorrerá por meio de requisições HTTP entre o cliente e o servidor de aplicação.  
O servidor de aplicação será responsável por se comunicar com o banco de dados PostgreSQL para consultar e atualizar as informações necessárias.  
O fluxo geral de uma compra será:

1. O usuário acessa a aplicação pelo navegador.  
2. O frontend apresenta as informações do evento.  
3. O usuário informa a quantidade desejada.  
4. O frontend envia uma requisição HTTP à API.  
5. A API valida os dados recebidos.  
6. A API solicita ao PostgreSQL a execução da operação de venda.  
7. O banco de dados processa a operação e retorna o resultado.  
8. A API envia uma resposta ao frontend.  
9. O frontend informa o resultado ao usuário.

Essa comunicação representa a interação entre o cliente, a camada de aplicação e a camada de persistência de dados.  
---

## **11 REQUISITOS FUNCIONAIS** {#11-requisitos-funcionais}

### RF01 – Exibir evento

O sistema deverá apresentar as informações do evento disponível para venda.

### RF02 – Consultar estoque

O sistema deverá permitir a consulta da quantidade de ingressos disponíveis.

### RF03 – Informar quantidade

O usuário deverá informar a quantidade de ingressos que deseja adquirir.

### RF04 – Solicitar compra

O sistema deverá permitir o envio de uma solicitação de compra à API.

### RF05 – Validar estoque

O sistema deverá verificar se a quantidade solicitada está disponível para venda.

### RF06 – Registrar venda

O sistema deverá registrar a venda quando a operação for concluída com sucesso.

### RF07 – Atualizar estoque

O sistema deverá atualizar a quantidade de ingressos disponíveis após uma venda confirmada.

### RF08 – Informar resultado

O sistema deverá informar ao usuário se a compra foi confirmada ou recusada.

### RF09 – Proteger operações concorrentes

O sistema deverá utilizar mecanismos de controle de concorrência para impedir a confirmação de vendas incompatíveis com o estoque disponível.  
---

## **12 REQUISITOS NÃO FUNCIONAIS** {#12-requisitos-não-funcionais}

### RNF01 – Integridade dos dados

O sistema deverá preservar a consistência dos dados armazenados no PostgreSQL.

### RNF02 – Controle de concorrência

O sistema deverá utilizar operações transacionais e mecanismos de controle de concorrência para proteger a atualização do estoque.

### RNF03 – Separação de responsabilidades

A interface do cliente deverá ser separada da lógica de aplicação e da camada de persistência.

### RNF04 – Comunicação

A comunicação entre o cliente e a API deverá utilizar HTTP/HTTPS conforme a configuração de hospedagem.

### RNF05 – Segurança das credenciais

As credenciais de acesso ao banco de dados não deverão ser disponibilizadas diretamente ao código executado no navegador.

### RNF06 – Disponibilidade da aplicação

A aplicação deverá ser disponibilizada por meio da infraestrutura de hospedagem selecionada, respeitando os limites e as características dos serviços utilizados.  
---

## **13 TESTES DO SISTEMA** {#13-testes-do-sistema}

Os testes deverão avaliar tanto o comportamento funcional quanto a integridade do estoque em situações concorrentes.

### 13.1 Testes Funcionais {#13.1-testes-funcionais}

* Consulta das informações do evento.  
* Consulta da quantidade de ingressos.  
* Compra com quantidade válida.  
* Compra com quantidade superior ao estoque.  
* Compra com quantidade inválida.  
* Verificação do registro de venda.  
* Verificação da atualização do estoque.

### 13.2 Testes de Concorrência {#13.2-testes-de-concorrência}

Os testes de concorrência deverão enviar múltiplas solicitações de compra de maneira simultânea, utilizando um estoque limitado.  
O objetivo será verificar se:

* O estoque não fica negativo.  
* O número de ingressos vendidos não excede a quantidade disponível.  
* As operações confirmadas possuem registros de venda consistentes.  
* Solicitações que não podem ser atendidas são recusadas.  
* A aplicação mantém o comportamento esperado diante de requisições simultâneas.

Os resultados dos testes deverão ser registrados e analisados para demonstrar o funcionamento do controle de concorrência implementado.  
---

## **14 LIMITAÇÕES E CONSIDERAÇÕES** {#14-limitações-e-considerações}

A hospedagem em plataformas gerenciadas não elimina a necessidade de projetar corretamente a comunicação entre os serviços e o acesso ao banco de dados.  
A configuração de conexão com o PostgreSQL deverá ser compatível com o ambiente de execução utilizado pela API. Além disso, as regras de concorrência deverão ser implementadas no nível apropriado, preferencialmente com suporte das transações e dos mecanismos de integridade do banco de dados.  
A infraestrutura proposta tem como finalidade atender ao escopo acadêmico do projeto. Recursos adicionais, como autenticação completa, pagamento real e administração de eventos, não são requisitos obrigatórios nesta versão inicial.  
---

## **15 CRONOGRAMA** {#15-cronograma}

O cronograma deverá contemplar as seguintes etapas:

1. Revisão e aprovação da documentação.  
2. Modelagem do banco de dados PostgreSQL.  
3. Definição da arquitetura da aplicação e dos endpoints da API.  
4. Desenvolvimento do frontend em HTML, CSS e JavaScript.  
5. Desenvolvimento da lógica de venda.  
6. Implementação do controle de concorrência.  
7. Integração com a infraestrutura Vercel e Supabase.  
8. Realização dos testes funcionais e concorrentes.  
9. Documentação dos resultados.  
10. Preparação da entrega final.

---

## **16 RESULTADOS ESPERADOS** {#16-resultados-esperados}

Espera-se que o sistema permita realizar vendas de ingressos de maneira imediata, mantendo a integridade do estoque mesmo quando diferentes usuários realizam solicitações simultaneamente.  
Também se espera demonstrar, por meio da arquitetura distribuída e dos testes realizados, como a camada de aplicação e o banco de dados se comunicam para processar operações que envolvem um recurso limitado.  
O projeto deverá fornecer evidências do funcionamento do controle de concorrência implementado e da consistência dos registros de venda.  
---

## **17 CONSIDERAÇÕES FINAIS** {#17-considerações-finais}

O projeto propõe a construção de uma aplicação web distribuída com foco na venda imediata de ingressos e no controle de concorrência.  
A utilização de HTML, CSS, JavaScript e PostgreSQL permite desenvolver uma solução com tecnologias adequadas ao escopo, enquanto a hospedagem na Vercel e no Supabase possibilita separar a aplicação do banco de dados.  
O principal desafio técnico consiste em garantir que as operações de venda e atualização do estoque sejam realizadas de forma consistente, preservando a integridade dos dados em cenários de acesso concorrente.  
A implementação e os testes do sistema deverão demonstrar como os mecanismos do PostgreSQL e a arquitetura da aplicação contribuem para o cumprimento dos requisitos definidos.

## 

## **REFERÊNCIAS**

POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL 18 documentation: concurrency control**. \[S. l.\]: PostgreSQL Global Development Group, \[s. d.\]. Disponível em: [https://www.postgresql.org/docs/18/mvcc.html](https://www.postgresql.org/docs/18/mvcc.html). Acesso em: 22 set. 2026\.

SUPABASE. **Database**. \[S. l.\]: Supabase, \[s. d.\]. Disponível em: [https://supabase.com/docs/guides/database/overview](https://supabase.com/docs/guides/database/overview). Acesso em: 22 set. 2026\.

VERCEL. **Using the Node.js runtime with Vercel Functions**. \[S. l.\]: Vercel, \[s. d.\]. Disponível em: [https://vercel.com/docs/functions/runtimes/node-js](https://vercel.com/docs/functions/runtimes/node-js). Acesso em: 22 set. 2026\.