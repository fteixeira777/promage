export function recoveryLinkState(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return { recovery: params.get('type') === 'recovery', invalid: params.has('error') || params.has('error_code') };
}

export function passwordValidation(password: string, confirmation: string) {
  if (password.length < 8) return 'Usa pelo menos 8 caracteres.';
  if (password !== confirmation) return 'As palavras-passe não coincidem.';
  return '';
}

export function recoveryError(error: { code?: string; status?: number }) {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') return 'Demasiados pedidos. Aguarda alguns minutos antes de tentar novamente.';
  if (error.code === 'same_password') return 'Escolhe uma palavra-passe diferente da anterior.';
  if (error.code === 'weak_password') return 'A palavra-passe não cumpre os requisitos de segurança. Escolhe uma mais forte.';
  if (['session_not_found', 'session_expired', 'otp_expired', 'bad_jwt'].includes(error.code || '')) return 'O link expirou ou já não é válido. Pede um novo link de recuperação.';
  return 'Não foi possível concluir o pedido. Tenta novamente. Se o problema continuar, contacta o responsável pela plataforma.';
}
