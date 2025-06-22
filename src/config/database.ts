import mongoose from 'mongoose';


// Interface para configuração da base de dados
interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

// Configuração da base de dados
const databaseConfig: DatabaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zero-delivery',
  options: {
    maxPoolSize: 10, // Número máximo de conexões no pool
    serverSelectionTimeoutMS: 5000, // Timeout para seleção do servidor
    socketTimeoutMS: 45000, // Timeout para operações de socket
    bufferCommands: false, // Desabilita buffer de comandos
  },
};

// Função para conectar à base de dados
export const connectDatabase = async (): Promise<void> => {
  try {
    // Configuração de eventos do mongoose
    mongoose.connection.on('connected', () => {
      console.log('✅ Conectado ao MongoDB com sucesso!');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Erro na conexão com MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Desconectado do MongoDB');
    });

    // Configuração de eventos para encerramento gracioso
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔌 Conexão com MongoDB fechada devido ao encerramento da aplicação');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro ao fechar conexão com MongoDB:', error);
        process.exit(1);
      }
    });

    // Conecta ao MongoDB
    await mongoose.connect(databaseConfig.uri, databaseConfig.options);
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

// Função para desconectar da base de dados
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('🔌 Desconectado do MongoDB com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao desconectar do MongoDB:', error);
    throw error;
  }
};

// Função para verificar se está conectado
export const isConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Função para obter informações da conexão
export const getConnectionInfo = () => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
  };
};

export default connectDatabase; 