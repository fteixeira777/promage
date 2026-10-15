import { requireSupabase } from '../lib/supabase';
import { paymentFromRow, paymentToRow } from '../lib/databaseRows';
import type { PaymentSchedule } from '../types';

export async function loadPayments(organizationId: string, processId: string, direction: PaymentSchedule['direction'] = 'INCOME') {
  const { data, error } = await requireSupabase().from('payment_schedules').select('id,description,direction,amount,rule,due_date,phase_id,offset_days,subcontract_id,expense_id,settlements(*)')
    .eq('organization_id', organizationId).eq('process_id', processId).eq('direction', direction).order('id');
  if (error) throw error;
  return (data || []).map(paymentFromRow);
}
export async function savePayment(organizationId: string, processId: string, payment: PaymentSchedule, existing: boolean) {
  const db = requireSupabase();
  const row = paymentToRow(organizationId, processId, payment);
  const query = existing ? db.from('payment_schedules').update(row).eq('organization_id', organizationId).eq('process_id', processId).eq('id', payment.id) : db.from('payment_schedules').insert(row);
  const { error } = await query.select('id').single();
  if (error) {
    if (error.code === 'PGRST204' && /subcontract_id|expense_id/.test(error.message)) throw new Error('É necessário aplicar a atualização de ligação dos custos no Supabase antes de guardar prestações de saída.');
    throw error;
  }
}
export async function recordReceipt(organizationId: string, paymentId: string, receipt: PaymentSchedule['settlements'][number]) {
  // Stable id makes a retry safe if the connection drops after the insert succeeds.
  const db = requireSupabase();
  const { error } = await db.from('settlements').insert({ organization_id: organizationId, payment_id: paymentId, ...receipt }).select('id').single();
  if (!error) return;
  if (error.code === '23505') {
    const result = await db.from('settlements').select('payment_id,amount,date').eq('organization_id', organizationId).eq('id', receipt.id).single();
    if (!result.error && result.data.payment_id === paymentId && Number(result.data.amount) === receipt.amount && result.data.date === receipt.date) return;
  }
  throw error;
}
