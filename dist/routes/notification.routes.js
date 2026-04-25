"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../core/notification/notification.controller");
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
const notificationController = new notification_controller_1.NotificationController();
// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/drivers/nearby', notificationController.findNearbyDrivers);
// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação
// ===== ROTAS DO USUÁRIO AUTENTICADO =====
router.get('/my-notifications', auth_guard_1.AuthGuard, notificationController.getMyNotifications); // ✅ Novo endpoint para usuário autenticado
router.patch('/my-notifications/:id/read', auth_guard_1.AuthGuard, notificationController.markMyNotificationAsRead); // ✅ Novo endpoint para marcar como lida
router.patch('/my-notifications/mark-all-read', auth_guard_1.AuthGuard, notificationController.markAllMyNotificationsAsRead); // ✅ Novo endpoint para marcar todas como lidas
// ===== ROTAS DE NOTIFICAÇÃO AUTOMÁTICA =====
// Rotas para enviar notificações automáticas
router.post('/vendor/new-order', auth_guard_1.AuthGuard, notificationController.notifyVendorNewOrder);
router.post('/drivers/order-ready', auth_guard_1.AuthGuard, notificationController.notifyDriversOrderReady);
router.post('/driver/assigned', auth_guard_1.AuthGuard, notificationController.notifyDriverAssigned);
router.post('/customer/order-status', auth_guard_1.AuthGuard, notificationController.notifyCustomerOrderStatus);
router.post('/drivers/nearby', auth_guard_1.AuthGuard, notificationController.notifyNearbyDrivers);
router.post('/promotional', auth_guard_1.AuthGuard, notificationController.sendPromotionalNotification);
// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.get('/user/:userId', auth_guard_1.AuthGuard, notificationController.getUserNotifications);
router.get('/stats/:userId', auth_guard_1.AuthGuard, notificationController.getNotificationStats);
router.patch('/:id/read', auth_guard_1.AuthGuard, notificationController.markAsRead);
router.patch('/user/:userId/read-all', auth_guard_1.AuthGuard, notificationController.markAllAsRead);
router.delete('/:id', auth_guard_1.AuthGuard, notificationController.deleteNotification);
router.delete('/old', auth_guard_1.AuthGuard, notificationController.deleteOldNotifications);
router.post('/create', auth_guard_1.AuthGuard, notificationController.createNotification);
exports.default = router;
