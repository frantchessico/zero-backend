import { Router } from 'express';
import { UserController } from '../core/user/user.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();
const userController = new UserController();

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.post('/', userController.createUser);
router.get('/:userId/exists', userController.checkUserExists);

// ===== ROTAS PROTEGIDAS =====
// Todas as outras rotas precisam de autenticação

// ===== ROTAS BÁSICAS DE USUÁRIO =====
router.get('/', AuthGuard, userController.getAllUsers);
router.get('/profile', AuthGuard, userController.getProfile); // ✅ Novo endpoint para perfil autenticado
router.put('/profile', AuthGuard, userController.updateProfile); // ✅ Novo endpoint para atualizar perfil
router.get('/:userId', AuthGuard, userController.getUserById); // Mantido para admins
router.put('/:userId', AuthGuard, userController.updateUser); // Mantido para admins
router.delete('/:userId', AuthGuard, userController.deactivateUser); // Mantido para admins
router.patch('/:userId/reactivate', AuthGuard, userController.reactivateUser); // Mantido para admins

// ===== BUSCA POR DIFERENTES CRITÉRIOS =====
router.get('/email/:email', AuthGuard, userController.getUserByEmail);
router.get('/phone/:phoneNumber', AuthGuard, userController.getUserByPhone);
router.get('/role/:role', AuthGuard, userController.getUsersByRole);

// ===== GERENCIAMENTO DE ENDEREÇOS =====
router.post('/addresses', AuthGuard, userController.addDeliveryAddress); // ✅ Removido /:userId
router.put('/addresses/:addressId', AuthGuard, userController.updateDeliveryAddress); // ✅ Removido /:userId
router.delete('/addresses/:addressId', AuthGuard, userController.removeDeliveryAddress); // ✅ Removido /:userId

// ===== GERENCIAMENTO DE MÉTODOS DE PAGAMENTO =====
router.post('/payment-methods', AuthGuard, userController.addPaymentMethod); // ✅ Removido /:userId
router.delete('/payment-methods/:paymentMethod', AuthGuard, userController.removePaymentMethod); // ✅ Removido /:userId

// ===== SISTEMA DE FIDELIDADE =====
router.post('/loyalty-points/add', AuthGuard, userController.addLoyaltyPoints); // ✅ Removido /:userId
router.post('/loyalty-points/use', AuthGuard, userController.useLoyaltyPoints); // ✅ Removido /:userId
router.get('/top-loyalty', AuthGuard, userController.getTopLoyaltyUsers);

// ===== HISTÓRICO DE PEDIDOS =====
router.post('/orders', AuthGuard, userController.addOrderToHistory); // ✅ Removido /:userId
router.get('/orders', AuthGuard, userController.getUserOrderHistory); // ✅ Removido /:userId

// ===== ESTATÍSTICAS =====
router.get('/stats/by-role', AuthGuard, userController.getUserStatsByRole);

export default router;