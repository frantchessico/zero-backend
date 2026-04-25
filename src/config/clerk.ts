import { clerkClient } from '@clerk/express';

// Configuração do Clerk
export const initializeClerk = () => {
  // Verificar se as variáveis de ambiente estão configuradas
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  const isTest = process.env.NODE_ENV === 'test';

  if (!publishableKey) {
    if (isTest) {
      return {
        publishableKey: 'pk_test_mock_key',
        secretKey: secretKey || 'sk_test_mock_key',
        clerkClient
      };
    }
    console.error('❌ CLERK_PUBLISHABLE_KEY não está configurada');
    console.error('💡 Adicione CLERK_PUBLISHABLE_KEY ao seu arquivo .env');
    console.error('🔗 Obtenha a chave em: https://dashboard.clerk.com/last-active?path=api-keys');
    process.exit(1);
  }

  if (!secretKey) {
    if (isTest) {
      return {
        publishableKey: publishableKey || 'pk_test_mock_key',
        secretKey: 'sk_test_mock_key',
        clerkClient
      };
    }
    console.error('❌ CLERK_SECRET_KEY não está configurada');
    console.error('💡 Adicione CLERK_SECRET_KEY ao seu arquivo .env');
    console.error('🔗 Obtenha a chave em: https://dashboard.clerk.com/last-active?path=api-keys');
    process.exit(1);
  }

  console.log('✅ Clerk configurado com sucesso');
  console.log(`📋 Publishable Key: ${publishableKey.substring(0, 20)}...`);
  console.log(`🔐 Secret Key: ${secretKey.substring(0, 20)}...`);

  return {
    publishableKey,
    secretKey,
    clerkClient
  };
};

export default initializeClerk; 
