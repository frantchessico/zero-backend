export * from './database';
export * from './database.test';

// Configurações gerais da aplicação
export const config = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Configurações da base de dados
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zero-delivery',
    name: process.env.DB_NAME || 'zero-delivery',
  },
  
  // Configurações de segurança
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
  
  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filename: process.env.LOG_FILENAME || 'logs/app.log',
  },
  
  // Configurações de CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
}; 