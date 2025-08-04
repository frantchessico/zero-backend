import { Router } from 'express';
import userRoutes from './user.routes';
import driverRoutes from './driver.routes';
import vendorRoutes from './vendor.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import deliveryRoutes from './delivery.routes';
import notificationRoutes from './notification.routes';
import auditRoutes from './audit.routes';
import personalDeliveryRoutes from './personal-delivery.routes';

const router = Router();

// Prefixo para todas as rotas da API
const API_PREFIX = '/api';

// Rotas de usuário
router.use(`${API_PREFIX}/users`, userRoutes);

// Rotas de driver
router.use(`${API_PREFIX}/drivers`, driverRoutes);

// Rotas de vendor
router.use(`${API_PREFIX}/vendors`, vendorRoutes);

// Rotas de produto
router.use(`${API_PREFIX}/products`, productRoutes);

// Rotas de pedido
router.use(`${API_PREFIX}/orders`, orderRoutes);

// Rotas de entrega
router.use(`${API_PREFIX}/deliveries`, deliveryRoutes);

// Rotas de notificação
router.use(`${API_PREFIX}/notifications`, notificationRoutes);

// Rotas de auditoria
router.use(`${API_PREFIX}/audit`, auditRoutes);

// Rotas de entrega pessoal
router.use(`${API_PREFIX}/personal-delivery`, personalDeliveryRoutes);

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