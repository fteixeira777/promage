# Começar com Supabase

Esta pasta contém a estrutura inicial. Com Supabase configurado, a entrada da aplicação oferece login/registo, criação e seleção de gabinetes e gestão de clientes, processos, fases e tarefas guardados remotamente. O protótipo local permanece acessível por um botão separado. Configurar as variáveis não importa dados locais.

## 1. Criar o projeto

Criar um projeto de desenvolvimento em https://supabase.com/dashboard. Escolher uma região europeia próxima dos utilizadores. Guardar a palavra-passe da base de dados no gestor de palavras-passe; não é necessária no frontend.

## 2. Criar as tabelas

No SQL Editor do projeto novo, executar o conteúdo de `migrations/202610090001_initial_workspace.sql`. É uma migração inicial, não um script para executar repetidamente. Deve ser revista e validada nesse projeto antes de produção.

As tabelas representam gabinetes, membros, clientes, equipa, fornecedores, orçamentos, processos, fases, tarefas, parcelas, movimentos efetivos, subcontratos, despesas, registos financeiros e documentos.

Os dados têm `organization_id`; chaves estrangeiras compostas impedem ligar dados de gabinetes diferentes. IDs antigos em texto são suportados para facilitar a migração.

RLS aplica os acessos no servidor: utilizadores autenticados só leem os gabinetes a que pertencem. Gestores alteram dados; membros da equipa podem criar/atualizar tarefas. Nesta primeira estrutura os membros leem também dados financeiros do gabinete. Não atribuir este papel a clientes externos. O portal do cliente exigirá políticas próprias por processo e campos autorizados.

A função `create_workspace` cria o gabinete e o seu proprietário numa única transação. Convites e alterações de cargos ainda não estão implementados.

## 3. Configurar o frontend

Copiar `.env.example` para `.env.local` e preencher com o Project URL e a publishable key disponíveis no painel Connect do Supabase:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca colocar secret keys, service_role, palavra-passe da base de dados ou tokens administrativos em variáveis VITE_. `.env.local` está ignorado pelo Git. Reiniciar o Vite após alterar a configuração.

Configurar Authentication > URL Configuration com o Site URL do ambiente de desenvolvimento e os redirects necessários. Criar um utilizador de teste em Authentication para testar o primeiro login. As sessões de colaboradores serão diferentes do cadastro administrativo da equipa.

## 4. Verificar isolamento

Executar `tests/tenant_isolation.sql` no projeto de desenvolvimento. Verifica acesso ao próprio gabinete, bloqueio entre gabinetes e bloqueio anónimo. Os dados de teste são revertidos. Se houver erro, fazer ROLLBACK antes de tentar novamente. Estes testes SQL não foram executados localmente porque não há uma base Supabase configurada.

## 5. Próxima implementação

O cliente oficial está em `lib/supabase.ts`. `services/workspaceService.ts` contém login, logout, listagem/criação de gabinetes e leitura de clientes.

Os serviços estão ligados à interface para autenticação, gabinetes, clientes, processos, fases e tarefas, com estados de carregamento e erros. O Gantt e a vista diária usam os registos carregados do Supabase. As alterações só são confirmadas na interface após resposta do servidor; o botão Atualizar dados recarrega alterações de outras sessões. Ainda não há Realtime ou controlo de versão para edições concorrentes do mesmo registo.

No gabinete, abrir Projetos e equipa para criar processos e fases. Cada tarefa pode pertencer a uma fase ou ser geral do gabinete. A área Equipa cria responsáveis para atribuição de tarefas, mas não cria contas de login nem convites. O valor dos honorários em modo PHASES é derivado da soma das fases.

Falta ligar documentos, implementar a importação explícita do protótipo local e testar duas sessões concorrentes. Não guardar o estado inteiro do gabinete como um único JSON, pois isso pode sobrescrever alterações de outros utilizadores.

A migração dos dados locais será uma operação explícita com pré-visualização, gabinete de destino e validação das referências. A separação atual entre empresas é visual: não assumir que os dados locais pertencem automaticamente a uma delas. Preservar a cópia local até confirmar a importação.

Uploads reais e buckets privados serão preparados numa etapa própria. A tabela documents guarda metadados, não cria armazenamento de ficheiros. Os subcontratos guardam referências de fases em array nesta versão inicial; a integridade dessas referências ainda requer uma tabela de associação ou validação específica.

Antes de ativar produção, testar também permissões por papel, relações entre fases/processos, concorrência e limites financeiros; adicionar controlo de versão por registo e políticas do portal do cliente. Atualizações de parcelas e registos efetivos precisam de um fluxo auditável de correções.

## Fontes

- https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys

## Recebimentos por projeto

Em Processos > projeto > Recebimentos, criar prestações por data fixa ou fecho de fase (mais dias). Registar recebimentos parciais, consultar histórico e editar prestações sem reduzir abaixo do valor recebido. O resumo compara honorários, plano, recebido, saldo e atrasos. Fases abertas fornecem apenas previsão; não são consideradas em atraso. Reabrir uma fase volta a tornar a data uma previsão.

Usa payment_schedules e settlements da migração inicial, sem nova migração. Gravações por registo, com RLS e validação de saldo/data no servidor. Recebimentos são imutáveis nesta versão; correções auditáveis continuam pendentes. O histórico financeiro ainda não equivale a faturação fiscal. Não há importação automática de dados locais.

## Custos e previsão mensal

Processos > projeto > Custos permite criar e editar subcontratos (fornecedor, serviço, valor e fases) e outras despesas (descrição, valor e data do custo). O saldo económico usa os honorários menos esses custos; exclui horas internas, despesas gerais e impostos.

O plano de saídas usa payment_schedules com direction=EXPENSE e settlements para pagamentos parciais. Nesta etapa, o plano é agregado por projeto, sem ligação individual entre cada prestação e cada subcontrato/despesa. O utilizador distribui manualmente os custos nas prestações e a interface alerta para diferenças no total. Registar uma despesa não significa que foi paga. Custos e prestações representam o mesmo compromisso em perspetivas diferentes e não são somados entre si.

Financeiro recarrega todos os projetos do gabinete, com prestações e liquidações. Projeta seis meses apenas com valores pendentes e datas a partir de hoje. Datas passadas e ausentes aparecem como pendências, sem serem empurradas automaticamente para o mês atual. O saldo inicial é uma simulação de sessão, não um saldo bancário guardado. A área mantém os avisos de fases abertas, custos sem plano e diferenças entre custo e saídas.

Validação: testes unitários cobrem não duplicação dos custos, liquidações parciais, datas passadas/ausentes, fecho de fase e mudança de ano. Verificação no navegador em 12/10/2026 no projeto de demonstração: subcontrato 400 €, despesa 100 €, plano de saída 500 €, pagamento parcial 100 €, projeção de saída 400 €. Nenhuma nova migração necessária.
## Acessos da equipa (ativação necessária)

Aplicar no SQL Editor a migração `migrations/202610120002_team_access.sql`, depois da inicial. Não voltar a executar a migração inicial. A chave pública não permite aplicar esta alteração. Executar `tests/team_access.sql` num ambiente de desenvolvimento para testar email errado, convite de utilização única, ocultação de valores financeiros, elevação de privilégios, proteção do proprietário e remoção de acesso. Estes testes SQL ainda não foram executados neste projeto.

O proprietário gere convites e acessos em Equipa. Gestores têm acesso operacional e financeiro; colaboradores consultam o planeamento e atualizam tarefas. A projeção member_planning omite valores financeiros; a leitura direta das tabelas que contêm esses valores exige gestor/proprietário. Os clientes continuam visíveis aos membros do gabinete. Não usar estes papéis para o futuro portal de clientes.

Os convites ficam na aplicação (sem email automático), ligados ao email confirmado da conta, expiram em sete dias e só podem ser aceites uma vez. Só o proprietário convida, revoga ou altera papéis; não é possível remover ou despromover proprietários nesta interface. Ao aceitar, cria-se um responsável na equipa ligado à conta. Cadastros anteriores permanecem separados: não são associados automaticamente pelo email.

Depois de aplicar: atualizar Equipa > Acessos, criar convite, destinatário registar/confirmar email/entrar, aceitar na seleção de gabinetes. Para testar, usar duas contas e verificar o perfil colaborador antes de utilizar dados reais. Uma sessão já aberta pode manter dados previamente carregados até atualizar, mas pedidos seguintes são sujeitos às novas regras do servidor.

## Portal do cliente e documentos (ativação necessária)

Aplicar apenas `migrations/202610120003_client_portal.sql`, depois das migrações 001 e 002. Cria um bucket privado `promage-client-documents` limitado a PDF/JPEG/PNG de 10 MB. Não altera nem publica os documentos internos existentes. Baseado no controlo de acesso do Supabase Storage: https://supabase.com/docs/guides/storage/security/access-control e downloads autenticados: https://supabase.com/docs/guides/storage/serving/downloads.

No projeto, associar primeiro o cliente e abrir **Portal e documentos**. Gestores/proprietários guardam os emails autorizados, ativam o portal e selecionam as fases a publicar. O titular entra com o mesmo email confirmado e abre **Portal do cliente**. Não é criado nenhum membro do gabinete e não são enviados emails. O cliente vê apenas título/estado do projeto, nomes/estados/datas das fases publicadas e os pedidos de documentos criados especificamente nesta área. Valores, tarefas, bloqueios, notas internas e documentos antigos ficam excluídos.

Pedidos incluem título, instruções e prazo. O cliente entrega ficheiros; o gabinete descarrega, aceita ou pede correção com uma resposta visível ao cliente. Cada nova entrega conserva as anteriores. Os gestores não enviam ficheiros em nome do cliente nesta etapa. Ficheiros são descarregados com autenticação e nunca através de URLs públicas. Revogar o email/desativar o portal bloqueia novos pedidos de download e upload; ficheiros já descarregados não podem ser retirados do dispositivo do destinatário.

O upload reserva metadados, envia o objeto e confirma a entrega verificando existência, tamanho e MIME. Se a confirmação falhar depois do envio, aparece uma ação para repetir a confirmação. Não há substituição nem eliminação de objetos pela aplicação. Reservas abandonadas podem deixar metadados/objetos pendentes invisíveis: limpeza administrativa e retenção ficam para uma etapa própria. As validações de tipo/tamanho não substituem análise antivírus.

Alterar o cliente do processo invalida os acessos anteriores automaticamente. Um portal com histórico não pode ser reatribuído a outro cliente: criar um projeto separado evita expor documentos antigos. Nomes de fases, prazos e estados publicados são atualizados com o planeamento, sem nova aprovação de publicação a cada edição.

Validação: TypeScript, compilação e 23 testes locais passaram. `tests/client_portal.sql` cobre projeção sem dados privados, cliente não membro, email não confirmado, conta alheia, upload pendente, finalização sem objeto, tentativa de mudar publicação e mudança de titular. Os testes SQL e o upload/download real ainda precisam de ser executados após aplicar a migração. Testar com duas contas: publicar uma fase, pedir um PDF, entregar, descarregar, pedir correção, reenviar e aceitar; depois revogar o email e confirmar que deixou de ter acesso.

## Alertas do gabinete

A área Alertas é a entrada inicial do planeamento. Reúne tarefas/fases abertas com prazo até sete dias, documentos por entregar/rever e prestações efetivamente em atraso (saldo ainda pendente). Prestações dependentes de fases abertas não geram atraso financeiro. Documentos já entregues geram revisão, mesmo que o prazo original tenha passado. Concluir/liquidar/aceitar remove o aviso na consulta seguinte.

A leitura usa os serviços existentes: colaboradores consultam apenas a projeção de planeamento e tarefas; gestores consultam também financeiro e pedidos do portal. Documentos são consultados em lotes de cinco projetos. Falhas parciais aparecem explicitamente. Não é necessária nova migração. Os alertas recarregam ao entrar, atualizar ou mudar o dia, sem emails nem notificações em segundo plano. Atalhos abrem o separador relevante do projeto; tarefas gerais abrem a lista de trabalho diário sem restringir a hoje.

Validação: 27 testes locais e compilação passaram. No navegador, confirmados aviso de tarefa atrasada, recebimento pendente de 300 €, documento por rever e atalho para Recebimentos. Não foram alterados registos durante esta verificação.

## Ligação de custos e prestações (ativação necessária)

Aplicar uma vez `migrations/202610130004_cost_payments.sql` no SQL Editor, após as migrações anteriores. Preserva os movimentos existentes, inicialmente sem associação. Não altera as políticas de acesso. As chaves compostas impedem associações a custos de outro projeto ou gabinete; uma prestação pode apontar para um subcontrato ou uma despesa, apenas quando é uma saída.

Em Projetos > abrir projeto > Custos, o resumo apresenta honorários, recebido/por receber, custos previstos, pago/por pagar, margem prevista e saldo de caixa. Na edição/criação de uma prestação, selecionar Custo associado. Um custo pode ter várias prestações. As prestações sem associação continuam a contar para o total do projeto; não contam para os totais individuais dos custos. Diferenças e excessos são sinalizados, sem impedir a edição dos valores previstos. Não há associação automática dos registos anteriores.

Margem = honorários menos custos externos; caixa = recebimentos menos pagamentos. Os valores por receber/pagar são diferenças face ao contratado/registado, incluindo valores ainda sem plano. A lista de movimentos pendentes usa apenas prestações existentes e identifica datas estimadas de fases abertas.

Validação local: 29 testes, TypeScript e compilação. `tests/cost_payments.sql` verifica associações válidas, preservação de liquidações, rejeição de duas associações, recebimentos associados e referências a outro projeto/gabinete, com rollback. Executar em desenvolvimento após a migração; não foi executado remotamente pelo agente. Teste funcional: associar uma prestação existente a um custo, confirmar o seu histórico, criar duas prestações para outro custo e registar um pagamento parcial; confirmar totais após atualizar a página.

## Horas e custos internos (ativação necessária)

Aplicar uma vez `migrations/202610130005_time_entries.sql` depois das migrações anteriores. A leitura financeira passa a incluir horas; até aplicar, será apresentada uma indicação de atualização necessária. Não modifica registos financeiros existentes.

Em Projeto > Horas, registar pessoa, fase opcional, data, horas/minutos e descrição. A gestão pode registar e editar horas da equipa; colaboradores apenas as próprias, através da associação de conta criada ao aceitar um convite. Pessoas sem conta podem receber horas registadas pela gestão. Novas entradas exigem pessoa ativa, data até hoje, duração positiva e no máximo 24 horas por pessoa/dia, contando todos os projetos. O servidor serializa gravações por gabinete para garantir o limite diário. A chave estável permite repetir uma gravação sem duplicar o registo. Nesta etapa não há eliminação de registos nem cronómetro.

Em Horas > Custos por hora da equipa, a gestão define o custo interno, válido para novos registos em todos os projetos. A tarifa fica guardada em cada entrada: alterar a tarifa atual não recalcula entradas já valorizadas. Entradas sem tarifa são assinaladas e podem ser valorizadas voltando a guardá-las após definir o custo. Não se infere custo por hora a partir do honorário mensal. Zero é uma tarifa explícita; ausência de tarifa significa custo incompleto.

A projeção dos colaboradores omite as tarifas, e as tabelas com custos só são legíveis pela gestão. As escritas de horas passam exclusivamente por funções que verificam gabinete, conta e pessoa. As relações de projeto/fase/pessoa incluem sempre o gabinete. O portal do cliente não recebe horas nem custos.

O resumo em Custos e a área Financeiro apresentam o custo interno e a margem após as horas registadas. O custo é arredondado aos cêntimos por registo. Não estima trabalho futuro, não inclui despesas gerais/impostos e não altera pagamentos, saldo de caixa ou prestações a liquidar. A consulta financeira pagina as horas para evitar truncamento pelo limite habitual da API.

Validação: 33 testes locais, TypeScript e compilação passaram. `tests/time_entries.sql` prepara testes com rollback para isolamento, tarifa histórica, repetição/edição, projeção do colaborador, limite diário e recusa de datas futuras. A migração e os testes SQL ainda requerem execução no Supabase. Teste funcional após ativação: definir 25 €/hora, registar 1h30 (37,50 €), atualizar a página, mudar a tarifa para 30 € e confirmar que a entrada anterior mantém 25 €. Criar nova entrada e confirmar 30 €. Entrar como colaborador e verificar que só vê as próprias horas, sem custos.

## Previsão de horas por fase

Aplicar `migrations/202610130006_phase_time_budget.sql` (pode ser repetido). Acrescenta uma previsão opcional em minutos; não altera as horas realizadas. A gestão define-a em Fases > Editar fase > Horas previstas da equipa, em incrementos de 15 minutos. Vazio significa sem previsão; zero é uma previsão explícita.

Em Horas, a gestão compara previsão e horas realizadas de toda a equipa, por fase. Aviso a partir de 80%, limite atingido a 100%, excesso quando as horas realizadas ultrapassam o previsto. A percentagem mede consumo de horas, não progresso. Horas sem fase são mostradas separadamente; fases sem estimativa tornam a previsão total incompleta. Fechar a fase preserva os desvios. Colaboradores continuam a ver apenas as próprias horas, sem comparação parcial com o orçamento global da equipa. Não há alterações ao portal nem às permissões.

Validação: TypeScript, compilação e 36 testes locais passaram. A gravação remota depende da aplicação da migração. Testar com uma fase de 2h previstas: 1h30 realizadas fica dentro, 1h45 aproxima-se do limite, 2h atinge-o e 2h15 mostra excesso de 15 minutos. Limpar a previsão deve voltar a mostrar Por definir sem remover horas realizadas.

## Despesas gerais e tesouraria consolidada

Aplicar `migrations/202610150007_office_expenses.sql`, preparado para repetição. Apenas proprietários/gestores leem e alteram estas despesas. Escritas exclusivamente pelas funções, com verificação de gabinete e bloqueios. Não altera os registos antigos de financial_transactions nem os custos/pagamentos de projetos.

Em Financeiro > Despesas gerais, criar uma despesa pontual ou uma série mensal de 1 a 60 ocorrências (12 por defeito). Não existe renovação automática: as datas e valores são materializados ao criar. Datas partem sempre do primeiro vencimento: 31 janeiro, último dia de fevereiro, 31 março. Cada ocorrência pendente pode ter valor/data ajustados, ser cancelada e reposta. Cancelar não apaga o histórico nem cancela as restantes ocorrências. A criação usa uma chave estável para evitar duplicações em tentativas repetidas.

Pagamentos são integrais e exigem uma data até hoje. Nesta versão não são editáveis nem suportam liquidações parciais. A função rejeita valores alterados desde a consulta e repetir o mesmo pagamento não duplica nada. A aplicação apenas regista pagamentos já efetuados; não movimenta dinheiro.

A previsão dos próximos seis meses combina prestações pendentes dos projetos com despesas gerais pendentes. Valores pagos/cancelados ficam fora das saídas futuras. O saldo inicial é o saldo disponível hoje, introduzido pelo utilizador, e não volta a subtrair pagamentos passados. Compromissos anteriores a hoje ficam identificados fora da projeção até as datas serem revistas. As horas internas afetam rentabilidade dos projetos, não geram saídas de caixa; salários efetivamente pagos são despesas gerais. Não duplicar uma despesa nos projetos e no gabinete. Margens de projetos não recebem rateio de despesas gerais nesta etapa.

Se as despesas gerais não carregarem, aparece um aviso explícito e a previsão permanece identificada como apenas de projetos. A leitura das despesas é paginada. Totais mostram pendente de todas as ocorrências, atraso e pagamentos do mês pela data efetiva.

Validação: TypeScript, compilação e 39 testes locais passaram. `tests/office_expenses.sql` prepara verificações com rollback para recorrência em ano bissexto, repetição idempotente, edição, valor desatualizado, data futura, cancelamento/reposição e acesso por papel/gabinete. Estes testes SQL e a gravação remota ainda requerem a migração no Supabase. Testar após ativação com uma despesa mensal, confirmar as datas, editar uma ocorrência, registar um pagamento integral e conferir que deixa de integrar a previsão futura.

## Painel de gestão

Visão geral é a entrada inicial de proprietários/gestores; colaboradores continuam em Alertas, sem consultas financeiras do painel. Não requer nova migração. Reutiliza as permissões e os serviços existentes.

Apresenta recebimentos e pagamentos efetivamente atrasados (incluindo despesas gerais pendentes), projetos com margem após horas negativa, fases acima da previsão e horas sem tarifa; mostra ainda prazos/documentos e atalhos para a área relevante. O bloco de prazos apresenta até oito itens, com ligação para todos os alertas. Despesas gerais abrem Financeiro; projetos abrem Custos, Horas, Recebimentos ou o separador correspondente.

A simulação de seis meses usa saldo inicial introduzido no painel, começando a zero, sem persistência. Não inclui compromissos anteriores a hoje até rever as datas, nem trata custos internos como pagamentos. Falhas parciais geram avisos: totais indisponíveis/incompletos não aparecem como zero e a previsão consolidada só aparece quando projetos e despesas gerais foram carregados. Atualiza ao abrir ou através de Atualizar painel; a data/hora da consulta ficam visíveis.

Validação local: TypeScript, 41 testes e compilação passaram. Cobertos atrasos parciais, exclusão de pagamentos liquidados/cancelados e fases abertas, despesas gerais, efeito do saldo inicial e margens com horas sem tarifa.
