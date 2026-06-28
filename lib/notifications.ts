export const TRIAL_EXPIRED = {
  trigger: 'trial_expired' as const,
  text: 'Привет.\n\nТвой 14-дневный триал в Bad Buddhas закончился.\n\nЕсли практики были полезны — подписка откроет полный доступ и позволит продолжить путь.',
  button: {
    text: 'Открыть Bad Buddhas →',
    callbackData: 'open_app',
  },
}
