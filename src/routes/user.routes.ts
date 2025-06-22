import { Router } from 'express';
import { UserController } from '../services/user.controller';
import { AuthGuard } from '../guards/auth.guard';
import { isCompleteAccount } from '../services/check.service';

const router = Router();

// Rotas públicas (sem autenticação)
router.post('/users',  AuthGuard,  UserController.createUser);
router.put('/users/:userId', AuthGuard,  UserController.createUser);
router.get('/exists/:phoneNumber',   UserController.checkUserExists);

router.get('/users/account/is-complete', AuthGuard, isCompleteAccount);

// Rotas protegidas (com autenticação)
// router.use(AuthGuard);

// Rotas de perfil do usuário autenticado
router.get('/profile', UserController.getProfile);
router.get('/users/:userId', AuthGuard, UserController.getProfile);
router.put('/profile', UserController.updateProfile);

// Rotas de administração (requerem autenticação)
router.get('/', UserController.getAllUsers);
router.get('/stats', UserController.getUserStats);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);
router.patch('/:id/toggle-status', UserController.toggleUserStatus);

// Rotas de endereços (baseadas no usuário autenticado)
router.post('/addresses', UserController.addDeliveryAddress);
router.put('/addresses/:addressIndex', UserController.updateDeliveryAddress);
router.delete('/addresses/:addressIndex', UserController.removeDeliveryAddress);

// Rotas de métodos de pagamento (baseadas no usuário autenticado)
router.post('/payment-methods', UserController.addPaymentMethod);
router.delete('/payment-methods/:paymentMethod', UserController.removePaymentMethod);

// Rotas de pontos de fidelidade (baseadas no usuário autenticado)
router.post('/loyalty-points', UserController.addLoyaltyPoints);
router.post('/loyalty-points/use', UserController.useLoyaltyPoints);

// Rotas de histórico de pedidos (baseadas no usuário autenticado)
router.get('/orders', UserController.getUserOrderHistory);

export default router; 