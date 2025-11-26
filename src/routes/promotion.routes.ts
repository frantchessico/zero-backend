import { Router } from 'express';
import PromotionController from '../core/promotion/promotion.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS PÚBLICAS =====
router.get('/vendor/:vendorId', PromotionController.getVendorPublicPromotions);

// ===== ROTAS DO VENDOR AUTENTICADO =====
router.post('/', AuthGuard, PromotionController.createPromotion);
router.get('/my', AuthGuard, PromotionController.getMyPromotions);
router.patch('/:id', AuthGuard, PromotionController.updatePromotion);

export default router;


