import { Router } from 'express';
import { UserController } from '../core/user/user.controller';
import { AuthGuard } from '../guards/auth.guard';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const userController = new UserController();

const bindAuthenticatedUserId = (req: Request, _res: Response, next: NextFunction) => {
  req.params.userId = req.params.userId || req.clerkPayload?.sub || '';
  next();
};

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.post('/', userController.createUser);
router.get('/:userId/exists', userController.checkUserExists);

// ===== ROTAS PROTEGIDAS =====
// Todas as outras rotas precisam de autenticação

// ===== ROTAS BÁSICAS DE USUÁRIO =====
router.get('/', AuthGuard, userController.getAllUsers);
// ===== BUSCA POR DIFERENTES CRITÉRIOS =====
router.get('/email/:email', AuthGuard, userController.getUserByEmail);
router.get('/phone/:phoneNumber', AuthGuard, userController.getUserByPhone);
router.get('/role/:role', AuthGuard, userController.getUsersByRole);
router.get('/top-loyalty', AuthGuard, userController.getTopLoyaltyUsers);
router.get('/stats/by-role', AuthGuard, userController.getUserStatsByRole);
router.get('/profile', AuthGuard, userController.getProfile);
router.put('/profile', AuthGuard, userController.updateProfile);

// ===== ENDPOINTS DE AUTOATENDIMENTO =====
router.post('/addresses', AuthGuard, bindAuthenticatedUserId, userController.addDeliveryAddress);
router.put('/addresses/:addressId', AuthGuard, bindAuthenticatedUserId, userController.updateDeliveryAddress);
router.delete('/addresses/:addressId', AuthGuard, bindAuthenticatedUserId, userController.removeDeliveryAddress);
router.post('/payment-methods', AuthGuard, bindAuthenticatedUserId, userController.addPaymentMethod);
router.delete('/payment-methods/:paymentMethod', AuthGuard, bindAuthenticatedUserId, userController.removePaymentMethod);
router.post('/loyalty-points/add', AuthGuard, bindAuthenticatedUserId, userController.addLoyaltyPoints);
router.post('/loyalty-points/use', AuthGuard, bindAuthenticatedUserId, userController.useLoyaltyPoints);
router.post('/orders', AuthGuard, bindAuthenticatedUserId, userController.addOrderToHistory);
router.get('/orders', AuthGuard, bindAuthenticatedUserId, userController.getUserOrderHistory);

// ===== ENDPOINTS LEGADOS/ADMIN =====
router.post('/:userId/addresses', AuthGuard, userController.addDeliveryAddress);
router.put('/:userId/addresses/:addressId', AuthGuard, userController.updateDeliveryAddress);
router.delete('/:userId/addresses/:addressId', AuthGuard, userController.removeDeliveryAddress);
router.post('/:userId/payment-methods', AuthGuard, userController.addPaymentMethod);
router.delete('/:userId/payment-methods/:paymentMethod', AuthGuard, userController.removePaymentMethod);
router.post('/:userId/loyalty-points/add', AuthGuard, userController.addLoyaltyPoints);
router.post('/:userId/loyalty-points/use', AuthGuard, userController.useLoyaltyPoints);
router.post('/:userId/orders', AuthGuard, userController.addOrderToHistory);
router.get('/:userId/orders', AuthGuard, userController.getUserOrderHistory);
router.patch('/:userId/reactivate', AuthGuard, userController.reactivateUser);
router.get('/:userId', AuthGuard, userController.getUserById);
router.put('/:userId', AuthGuard, userController.updateUser);
router.delete('/:userId', AuthGuard, userController.deactivateUser);

export default router;
