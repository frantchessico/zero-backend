import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

// Prefixo para todas as rotas da API
const API_PREFIX = '/api';

// Rotas de usuário
router.use(`${API_PREFIX}/users`, userRoutes);

// Rota de health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota 404 para rotas não encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

export default router; 