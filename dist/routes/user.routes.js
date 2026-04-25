"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../core/user/user.controller");
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
const bindAuthenticatedUserId = (req, _res, next) => {
    var _a;
    req.params.userId = req.params.userId || ((_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub) || '';
    next();
};
// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.post('/', userController.createUser);
router.get('/:userId/exists', userController.checkUserExists);
// ===== ROTAS PROTEGIDAS =====
// Todas as outras rotas precisam de autenticação
// ===== ROTAS BÁSICAS DE USUÁRIO =====
router.get('/', auth_guard_1.AuthGuard, userController.getAllUsers);
// ===== BUSCA POR DIFERENTES CRITÉRIOS =====
router.get('/email/:email', auth_guard_1.AuthGuard, userController.getUserByEmail);
router.get('/phone/:phoneNumber', auth_guard_1.AuthGuard, userController.getUserByPhone);
router.get('/role/:role', auth_guard_1.AuthGuard, userController.getUsersByRole);
router.get('/top-loyalty', auth_guard_1.AuthGuard, userController.getTopLoyaltyUsers);
router.get('/stats/by-role', auth_guard_1.AuthGuard, userController.getUserStatsByRole);
router.get('/profile', auth_guard_1.AuthGuard, userController.getProfile);
router.put('/profile', auth_guard_1.AuthGuard, userController.updateProfile);
// ===== ENDPOINTS DE AUTOATENDIMENTO =====
router.post('/addresses', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.addDeliveryAddress);
router.put('/addresses/:addressId', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.updateDeliveryAddress);
router.delete('/addresses/:addressId', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.removeDeliveryAddress);
router.post('/payment-methods', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.addPaymentMethod);
router.delete('/payment-methods/:paymentMethod', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.removePaymentMethod);
router.post('/loyalty-points/add', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.addLoyaltyPoints);
router.post('/loyalty-points/use', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.useLoyaltyPoints);
router.post('/orders', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.addOrderToHistory);
router.get('/orders', auth_guard_1.AuthGuard, bindAuthenticatedUserId, userController.getUserOrderHistory);
// ===== ENDPOINTS LEGADOS/ADMIN =====
router.post('/:userId/addresses', auth_guard_1.AuthGuard, userController.addDeliveryAddress);
router.put('/:userId/addresses/:addressId', auth_guard_1.AuthGuard, userController.updateDeliveryAddress);
router.delete('/:userId/addresses/:addressId', auth_guard_1.AuthGuard, userController.removeDeliveryAddress);
router.post('/:userId/payment-methods', auth_guard_1.AuthGuard, userController.addPaymentMethod);
router.delete('/:userId/payment-methods/:paymentMethod', auth_guard_1.AuthGuard, userController.removePaymentMethod);
router.post('/:userId/loyalty-points/add', auth_guard_1.AuthGuard, userController.addLoyaltyPoints);
router.post('/:userId/loyalty-points/use', auth_guard_1.AuthGuard, userController.useLoyaltyPoints);
router.post('/:userId/orders', auth_guard_1.AuthGuard, userController.addOrderToHistory);
router.get('/:userId/orders', auth_guard_1.AuthGuard, userController.getUserOrderHistory);
router.patch('/:userId/reactivate', auth_guard_1.AuthGuard, userController.reactivateUser);
router.get('/:userId', auth_guard_1.AuthGuard, userController.getUserById);
router.put('/:userId', auth_guard_1.AuthGuard, userController.updateUser);
router.delete('/:userId', auth_guard_1.AuthGuard, userController.deactivateUser);
exports.default = router;
