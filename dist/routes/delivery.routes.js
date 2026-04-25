"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/deliveryRoutes.ts
const express_1 = require("express");
const delivery_controller_1 = __importDefault(require("../core/delivery/delivery.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/analytics', delivery_controller_1.default.getDeliveryAnalytics);
router.get('/realtime', delivery_controller_1.default.getRealTimeDeliveries);
router.get('/dashboard', delivery_controller_1.default.getDeliveryDashboard);
// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação
// ===== ROTAS DO DRIVER AUTENTICADO =====
router.get('/my-deliveries', auth_guard_1.AuthGuard, delivery_controller_1.default.getMyDeliveries); // ✅ Novo endpoint para driver autenticado
router.put('/my-deliveries/:id/status', auth_guard_1.AuthGuard, delivery_controller_1.default.updateMyDeliveryStatus); // ✅ Novo endpoint para atualizar status
// ===== ROTAS DO CUSTOMER AUTENTICADO =====
router.get('/my-orders', auth_guard_1.AuthGuard, delivery_controller_1.default.getMyOrderDeliveries); // ✅ Novo endpoint para customer autenticado
// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.post('/', auth_guard_1.AuthGuard, delivery_controller_1.default.createDelivery);
router.get('/:id', auth_guard_1.AuthGuard, delivery_controller_1.default.getDeliveryById);
router.get('/', auth_guard_1.AuthGuard, delivery_controller_1.default.getDeliveries);
router.put('/:id', auth_guard_1.AuthGuard, delivery_controller_1.default.updateDelivery);
router.get('/:id/track', auth_guard_1.AuthGuard, delivery_controller_1.default.trackDelivery);
router.get('/driver/:driverId/active', auth_guard_1.AuthGuard, delivery_controller_1.default.getActiveDeliveriesByDriver);
router.get('/customer/:customerId/history', auth_guard_1.AuthGuard, delivery_controller_1.default.getDeliveryHistoryByCustomer);
router.get('/vendor/:vendorId/stats', auth_guard_1.AuthGuard, delivery_controller_1.default.getDeliveryStatsByVendor);
router.delete('/:id/cancel', auth_guard_1.AuthGuard, delivery_controller_1.default.cancelDelivery);
router.put('/:id/reassign', auth_guard_1.AuthGuard, delivery_controller_1.default.reassignDelivery);
router.get('/status/:status', auth_guard_1.AuthGuard, delivery_controller_1.default.getDeliveriesByStatus);
router.post('/:id/location', auth_guard_1.AuthGuard, delivery_controller_1.default.updateDeliveryLocation);
router.patch('/:id/status', auth_guard_1.AuthGuard, delivery_controller_1.default.updateDeliveryStatus);
exports.default = router;
// Para usar em app.ts ou server.ts:
// import deliveryRoutes from './routes/deliveryRoutes';
// app.use('/api/deliveries', deliveryRoutes);
