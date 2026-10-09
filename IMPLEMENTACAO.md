# Primeiro fluxo de gestão do Promage

## Experimentar

Executar `npm ci` e `npm run dev`. Abrir http://localhost:3000 e selecionar o gabinete.

1. Criar um processo no Portfólio (Novo Processo), ou aceitar um orçamento.
2. Abrir o processo e criar fases com responsáveis, prazos e bloqueios.
3. Adicionar parcelas de recebimento ou pagamento, por data ou conclusão de fase.
4. Fechar a fase manualmente selecionando Concluído. A data real é o dia do fecho.
5. Registar recebimentos/pagamentos, incluindo valores parciais e datas efetivas.
6. Consultar Dashboard > Financeiro para a projeção de seis meses.

Fechar uma fase nunca confirma automaticamente um pagamento. Reabrir uma fase remove a data de conclusão e volta a usar o fim previsto; os movimentos efetivos são preservados.

O orçamento de processos por fases é calculado pela soma dos honorários das fases. Em processos com preço global, o orçamento mantém-se independente das fases.

## Dados e limites

- Os dados continuam guardados em localStorage no navegador. Não há autenticação, base de dados partilhada ou isolamento entre gabinetes.
- A projeção inclui apenas parcelas criadas nos processos. Os registos financeiros antigos e gerais são preservados numa secção separada e não entram nessa previsão.
- Parcelas sem data, com data anterior a hoje ou fora dos seis meses não entram nos totais projetados. Os compromissos pendentes continuam listados.
- O saldo inicial da projeção é um valor de simulação introduzido pelo utilizador.
- As fases abertas com pagamentos condicionados não são consideradas dívida em atraso; a previsão usa a data planeada.
- Os pagamentos a subcontratados são criados manualmente no plano financeiro. Não existe ligação automática ao cadastro de subcontratos.
- O Gantt usa agora as fases e tarefas dos processos. O botão Importar planeamento anterior converte projetos antigos em processos sem apagar os dados originais; notas e anexos dos tickets são preservados nas tarefas. A importação não duplica projetos já importados.
- Dashboard > Trabalho diário permite criar e editar tarefas gerais ou associadas a fases, atribuir responsáveis, prazos e prioridades e consultar tarefas atrasadas, de hoje, dos próximos sete dias ou concluídas.
- O fecho manual de uma fase avisa quando existem tarefas pendentes. Não altera os estados dessas tarefas nem confirma recebimentos. Para reabrir uma tarefa de uma fase concluída, reabrir a fase primeiro.
- Portal do cliente, pedidos reais de documentos e lembretes externos ainda não foram implementados.
- O saldo após custos externos não representa lucro: não inclui horas da equipa, custos gerais nem impostos.

## Verificação

Requer Node.js 24 para os testes.

```sh
npm run lint
npm test
npm run build
```

Os testes verificam datas fixas, conclusão de fases, pagamentos parciais, estados de atraso, datas em falta e mudanças de ano.
