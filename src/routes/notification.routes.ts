import { Router } from 'express';
import { NotificationController } from '../core/notification/notification.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();
const notificationController = new NotificationController();

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/drivers/nearby', notificationController.findNearbyDrivers);

// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação

// ===== ROTAS DO USUÁRIO AUTENTICADO =====
router.get('/my-notifications', AuthGuard, notificationController.getMyNotifications); // ✅ Novo endpoint para usuário autenticado
router.patch('/my-notifications/:id/read', AuthGuard, notificationController.markMyNotificationAsRead); // ✅ Novo endpoint para marcar como lida
router.patch('/my-notifications/mark-all-read', AuthGuard, notificationController.markAllMyNotificationsAsRead); // ✅ Novo endpoint para marcar todas como lidas

// ===== ROTAS DE NOTIFICAÇÃO AUTOMÁTICA =====
// Rotas para enviar notificações automáticas
router.post('/vendor/new-order', AuthGuard, notificationController.notifyVendorNewOrder);
router.post('/drivers/order-ready', AuthGuard, notificationController.notifyDriversOrderReady);
router.post('/driver/assigned', AuthGuard, notificationController.notifyDriverAssigned);
router.post('/customer/order-status', AuthGuard, notificationController.notifyCustomerOrderStatus);
router.post('/drivers/nearby', AuthGuard, notificationController.notifyNearbyDrivers);
router.post('/promotional', AuthGuard, notificationController.sendPromotionalNotification);

// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.get('/user/:userId', AuthGuard, notificationController.getUserNotifications);
router.get('/stats/:userId', AuthGuard, notificationController.getNotificationStats);
router.patch('/:id/read', AuthGuard, notificationController.markAsRead);
router.patch('/user/:userId/read-all', AuthGuard, notificationController.markAllAsRead);
router.delete('/:id', AuthGuard, notificationController.deleteNotification);
router.delete('/old', AuthGuard, notificationController.deleteOldNotifications);
router.post('/create', AuthGuard, notificationController.createNotification);

export default router;