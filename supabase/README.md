# Começar com Supabase

Esta pasta contém a estrutura inicial. A aplicação AINDA usa localStorage: configurar as variáveis não migra dados nem ativa sincronização.

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

Falta ligar estes serviços à interface, substituir o estado/localStorage por operações remotas por registo, tratar loading/erros e testar duas sessões concorrentes. Não guardar o estado inteiro do gabinete como um único JSON, pois isso pode sobrescrever alterações de outros utilizadores.

A migração dos dados locais será uma operação explícita com pré-visualização, gabinete de destino e validação das referências. A separação atual entre empresas é visual: não assumir que os dados locais pertencem automaticamente a uma delas. Preservar a cópia local até confirmar a importação.

Uploads reais e buckets privados serão preparados numa etapa própria. A tabela documents guarda metadados, não cria armazenamento de ficheiros. Os subcontratos guardam referências de fases em array nesta versão inicial; a integridade dessas referências ainda requer uma tabela de associação ou validação específica.

Antes de ativar produção, testar também permissões por papel, relações entre fases/processos, concorrência e limites financeiros; adicionar controlo de versão por registo e políticas do portal do cliente. Atualizações de parcelas e registos efetivos precisam de um fluxo auditável de correções.

## Fontes

- https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
