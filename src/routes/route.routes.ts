import { Router } from 'express';
import RouteController from '../core/route/route.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS DO DRIVER AUTENTICADO =====
router.post('/my/build', AuthGuard, RouteController.buildMyRoute);
router.get('/my/active', AuthGuard, RouteController.getMyActiveRoute);

// ===== ROTAS ADMIN/OPS =====
router.post('/:driverId/build', AuthGuard, RouteController.buildRouteForDriver);

export default router;


