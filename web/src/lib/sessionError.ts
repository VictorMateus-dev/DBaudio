export class SessionRequiredError extends Error {
  constructor() {
    super('Sua conta está aberta no site, mas não há uma sessão válida do Supabase. Entre novamente com a conta cadastrada em Authentication. O acesso de demonstração não salva configurações na nuvem.');
    this.name = 'SessionRequiredError';
  }
}
