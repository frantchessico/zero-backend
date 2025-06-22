import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from '../routes';
import { connectDatabase } from '../config/database';

// Exemplo de servidor Express com as rotas de usuário
export const createExampleServer = () => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middlewares
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rotas
  app.use(routes);

  return { app, PORT };
};

// Função para iniciar o servidor
export const startExampleServer = async () => {
  try {
    console.log('🚀 Iniciando servidor de exemplo...');
    
    // Conectar à base de dados
    await connectDatabase();
    
    const { app, PORT } = createExampleServer();
    
    app.listen(PORT, () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log('\n📋 Endpoints disponíveis:');
      console.log('├── POST   /api/users                    - Criar usuário');
      console.log('├── GET    /api/users                    - Listar usuários (admin)');
      console.log('├── GET    /api/users/:id                - Buscar usuário por ID (próprio usuário)');
      console.log('├── GET    /api/users/exists/:phone      - Verificar existência');
      console.log('├── PUT    /api/users/:id                - Atualizar usuário (próprio usuário)');
      console.log('├── DELETE /api/users/:id                - Deletar usuário (próprio usuário)');
      console.log('├── GET    /api/users/profile            - Perfil do usuário (auth)');
      console.log('├── PUT    /api/users/profile            - Atualizar perfil (auth)');
      console.log('├── POST   /api/users/addresses          - Adicionar endereço (auth)');
      console.log('├── PUT    /api/users/addresses/:idx     - Atualizar endereço (auth)');
      console.log('├── DELETE /api/users/addresses/:idx     - Remover endereço (auth)');
      console.log('├── POST   /api/users/payment-methods    - Adicionar pagamento (auth)');
      console.log('├── DELETE /api/users/payment-methods    - Remover pagamento (auth)');
      console.log('├── POST   /api/users/loyalty-points     - Adicionar pontos (auth)');
      console.log('├── POST   /api/users/loyalty-points/use - Usar pontos (auth)');
      console.log('├── GET    /api/users/orders             - Histórico de pedidos (auth)');
      console.log('├── GET    /api/users/stats              - Estatísticas (admin)');
      console.log('├── PATCH  /api/users/:id/toggle-status  - Ativar/Desativar (admin)');
      console.log('└── GET    /health                       - Health check');
      console.log('\n🔐 Rotas com (auth) requerem autenticação via Clerk');
      console.log('📝 Use o header: Authorization: Bearer <token>');
      console.log('\n🔒 Segurança:');
      console.log('   - Usuários só podem acessar seus próprios dados');
      console.log('   - Rotas de admin requerem permissões especiais');
      console.log('   - Todas as operações são baseadas no userId autenticado');
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Executar se este arquivo for executado diretamente
if (require.main === module) {
  startExampleServer()
    .then(() => {
      console.log('🏁 Servidor iniciado com sucesso');
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
} 