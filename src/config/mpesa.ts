import { Client } from '@paymentsds/mpesa';

if (!process.env.MPESA_APIKEY || !process.env.PUBLIC_KEY || !process.env.SERVICE_PROVIDER_CODE) {
  // Em produção, você pode querer falhar o boot da aplicação ou logar de forma mais visível
  console.warn('[M-PESA] Variáveis de ambiente não configuradas completamente (MPESA_APIKEY, PUBLIC_KEY, SERVICE_PROVIDER_CODE)');
}

export const mpesaClient = new Client({
  apiKey: process.env.MPESA_APIKEY || '',
  publicKey: process.env.PUBLIC_KEY || '',
  serviceProviderCode: process.env.SERVICE_PROVIDER_CODE || '',
  host: process.env.MPESA_HOST || 'api.vm.co.mz'
});


