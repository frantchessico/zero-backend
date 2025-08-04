// routes/driverRoutes.ts
import { Router } from 'express';
import DriverController from '../core/driver/driver.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/available', DriverController.getAvailableDrivers);
router.get('/search', DriverController.getDrivers);

// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação

// ===== ROTAS DO DRIVER AUTENTICADO =====
router.get('/my-profile', AuthGuard, DriverController.getMyDriverProfile); // ✅ Novo endpoint para driver autenticado
router.put('/my-profile', AuthGuard, DriverController.updateMyDriverProfile); // ✅ Novo endpoint para atualizar perfil

// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.post('/:userId/profile', AuthGuard, DriverController.createDriverProfile);
router.get('/:id', AuthGuard, DriverController.getDriverById);
router.get('/user/:userId', AuthGuard, DriverController.getDriverByUserId);
router.put('/:id', AuthGuard, DriverController.updateDriver);
router.patch('/:id/location', AuthGuard, DriverController.updateLocation);
router.patch('/:id/availability', AuthGuard, DriverController.toggleAvailability);
router.post('/:id/assign', AuthGuard, DriverController.assignToOrder);
router.get('/:id/stats', AuthGuard, DriverController.getDriverStats);
router.patch('/:id/rating', AuthGuard, DriverController.updateRating);
router.patch('/:id/verify', AuthGuard, DriverController.verifyDriver);
router.delete('/:id', AuthGuard, DriverController.deleteDriver);
router.get('/:userId/dashboard', AuthGuard, DriverController.getDriverDashboard);

export default router;