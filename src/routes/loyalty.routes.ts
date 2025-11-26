import { Router } from 'express';
import LoyaltyController from '../core/loyalty/loyalty.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS DO CLIENTE =====
router.get('/status', AuthGuard, LoyaltyController.getMyLoyaltyStatus);
router.get('/rewards', LoyaltyController.getAvailableRewards); // Público
router.post('/redeem', AuthGuard, LoyaltyController.redeemReward);
router.get('/transactions', AuthGuard, LoyaltyController.getMyTransactions);

// ===== ROTAS ADMIN/VENDOR =====
router.post('/program', AuthGuard, LoyaltyController.createOrUpdateProgram);
router.get('/program', LoyaltyController.getProgram); // Público para ver programa

export default router;

