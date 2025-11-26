import { Router } from 'express';
import CouponController from '../core/coupon/coupon.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS DO VENDOR AUTENTICADO =====
router.post('/', AuthGuard, CouponController.createCoupon);
router.get('/my', AuthGuard, CouponController.getMyCoupons);
router.patch('/:id', AuthGuard, CouponController.updateCoupon);

// ===== ROTAS PÚBLICAS / CLIENTE =====
router.get('/available', CouponController.getAvailableCoupons);
router.post('/validate', CouponController.validateCoupon);

export default router;


