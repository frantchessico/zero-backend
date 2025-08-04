import { Router } from 'express';
import PersonalDeliveryController from '../core/personal-delivery/personal-delivery.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS PÚBLICAS =====
router.post('/calculate-fee', PersonalDeliveryController.calculateDeliveryFee);

// ===== ROTAS PROTEGIDAS =====
router.post('/', AuthGuard, PersonalDeliveryController.createPersonalDelivery);
router.get('/', AuthGuard, PersonalDeliveryController.getUserPersonalDeliveries);
router.get('/:id', AuthGuard, PersonalDeliveryController.getPersonalDeliveryById);
router.put('/:id', AuthGuard, PersonalDeliveryController.updatePersonalDelivery);
router.post('/:id/assign-driver', AuthGuard, PersonalDeliveryController.assignDriver);
router.delete('/:id', AuthGuard, PersonalDeliveryController.cancelPersonalDelivery);
router.get('/:id/track', AuthGuard, PersonalDeliveryController.trackPersonalDelivery);

export default router; 