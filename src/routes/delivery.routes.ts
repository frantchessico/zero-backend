// routes/deliveryRoutes.ts
import { Router } from 'express';
import DeliveryController from '../core/delivery/delivery.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/analytics', DeliveryController.getDeliveryAnalytics);
router.get('/realtime', DeliveryController.getRealTimeDeliveries);
router.get('/dashboard', DeliveryController.getDeliveryDashboard);

// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação

// ===== ROTAS DO DRIVER AUTENTICADO =====
router.get('/my-deliveries', AuthGuard, DeliveryController.getMyDeliveries); // ✅ Novo endpoint para driver autenticado
router.put('/my-deliveries/:id/status', AuthGuard, DeliveryController.updateMyDeliveryStatus); // ✅ Novo endpoint para atualizar status

// ===== ROTAS DO CUSTOMER AUTENTICADO =====
router.get('/my-orders', AuthGuard, DeliveryController.getMyOrderDeliveries); // ✅ Novo endpoint para customer autenticado

// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.post('/', AuthGuard, DeliveryController.createDelivery);
router.get('/:id', AuthGuard, DeliveryController.getDeliveryById);
router.get('/', AuthGuard, DeliveryController.getDeliveries);
router.put('/:id', AuthGuard, DeliveryController.updateDelivery);
router.get('/:id/track', AuthGuard, DeliveryController.trackDelivery);
router.get('/driver/:driverId/active', AuthGuard, DeliveryController.getActiveDeliveriesByDriver);
router.get('/customer/:customerId/history', AuthGuard, DeliveryController.getDeliveryHistoryByCustomer);
router.get('/vendor/:vendorId/stats', AuthGuard, DeliveryController.getDeliveryStatsByVendor);
router.delete('/:id/cancel', AuthGuard, DeliveryController.cancelDelivery);
router.put('/:id/reassign', AuthGuard, DeliveryController.reassignDelivery);
router.get('/status/:status', AuthGuard, DeliveryController.getDeliveriesByStatus);
router.post('/:id/location', AuthGuard, DeliveryController.updateDeliveryLocation);
router.patch('/:id/status', AuthGuard, DeliveryController.updateDeliveryStatus);

export default router;

// Para usar em app.ts ou server.ts:
// import deliveryRoutes from './routes/deliveryRoutes';
// app.use('/api/deliveries', deliveryRoutes);