# Promage — alfa

Gestão de gabinetes de arquitetura: projetos, fases, tarefas, equipa, horas, tesouraria e portal do cliente. React + Vite + Supabase.

## Desenvolvimento

Node.js 22 ou superior. Executar `npm ci`, copiar `.env.example` para `.env.local`, preencher as duas variáveis públicas do Supabase e executar `npm run dev`.

Verificação: `npm run lint`, `npm test` e `npm run build`.

O protótipo local está disponível apenas em desenvolvimento. A versão publicada exige Supabase.

## Publicação na Vercel

1. Importar o repositório GitHub `fteixeira777/promage`, ramo `main`.
2. Selecionar Vite, raiz `./`. O ficheiro `vercel.json` define a compilação e a pasta `dist`.
3. Nas variáveis de Production, configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do projeto existente. Nunca usar chaves secretas/service_role.
4. Publicar e copiar o endereço HTTPS definitivo.
5. No Supabase → Authentication → URL Configuration, definir Site URL com esse endereço e adicionar o mesmo endereço aos Redirect URLs. Manter `http://127.0.0.1:3000` para desenvolvimento. Não autorizar indiscriminadamente domínios de preview.
6. Confirmar as migrações 001–007. No projeto atual já foram executadas pelo proprietário; não repetir a inicial. Consultar `supabase/tests` para validação dos acessos.
7. No endereço publicado, testar registo, confirmação de email, entrada, criação de gabinete/cliente/projeto, recarregamento e saída. Validar o portal com outra conta e o isolamento entre gabinetes antes de carregar documentos confidenciais.

Alterações de variáveis exigem nova publicação. A alfa pede aos motores de pesquisa que não a indexem; isso não restringe o acesso ao endereço. Autenticação e políticas do Supabase protegem os dados.

## Primeiro teste com o gabinete

Criar conta, confirmar email e abrir a Área do gabinete para criar o gabinete. Começar por um projeto: cliente, fases, prazos, honorários, tarefas, equipa/custo por hora e horas trabalhadas. Validar pagamentos/despesas e comparar os totais com os registos habituais. Testar um pedido de documento com uma conta de cliente distinta.

Para reportar problemas: indicar ecrã, passos, resultado esperado e observado; evitar dados pessoais nas capturas.

Limites atuais: fecho manual de fases, custo horário guardado no momento do registo, saldo inicial simulado e despesas gerais pagas integralmente. Ainda não existe recuperação de palavra-passe na interface. Manter os registos habituais durante a validação.

Auditoria de dependências: correções compatíveis aplicadas. Permanecem avisos nas ferramentas de compilação Tailwind 3 (braces e postcss-selector-parser); não são distribuídas no navegador. A atualização para Tailwind 4 exige validação visual própria.

## Estado da alfa online

Endereço: https://promage-nine.vercel.app/

Site URL e Redirect URL configurados no Supabase. Publicação ligada ao ramo main no GitHub. Compilação, TypeScript e 41 testes passaram; página pública respondeu HTTP 200.

Pendente antes de convidar utilizadores externos: configurar SMTP próprio no Supabase. O SMTP personalizado está desativado e o serviço predefinido só envia para endereços da equipa do projeto (https://supabase.com/docs/guides/auth/auth-smtp). Falta validar registo/confirmacão e sessão no endereço publicado com utilizador externo. Não desativar confirmação de email para contornar esta limitação.
