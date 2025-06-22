import { connectDatabase, disconnectDatabase, isConnected, getConnectionInfo } from './database';

// Função para testar a conexão
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    console.log('🧪 Iniciando teste de conexão com a base de dados...');
    
    // Conecta à base de dados
    await connectDatabase();
    
    // Aguarda um pouco para garantir que a conexão foi estabelecida
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verifica se está conectado
    if (isConnected()) {
      console.log('✅ Teste de conexão bem-sucedido!');
      
      // Obtém informações da conexão
      const connectionInfo = getConnectionInfo();
      console.log('📊 Informações da conexão:', connectionInfo);
      
    } else {
      console.log('❌ Falha no teste de conexão - não está conectado');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste de conexão:', error);
  } finally {
    // Desconecta da base de dados
    await disconnectDatabase();
    console.log('🧹 Teste concluído - conexão fechada');
  }
};

// Executa o teste se este arquivo for executado diretamente
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('🏁 Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal no teste:', error);
      process.exit(1);
    });
} 