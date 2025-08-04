import { Router } from 'express';
import { VendorController } from '../core/vendor/vendor.controller';
import { AuthGuard } from '../guards/auth.guard';

const router = Router();
const vendorController = new VendorController();

// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/', vendorController.getAllVendors);
router.get('/types', vendorController.getVendorsByType);
router.get('/active', vendorController.getActiveVendors);
router.get('/search', vendorController.searchVendorsByName);
router.get('/count/types', vendorController.countVendorsByType);
router.get('/count/status', vendorController.countVendorsByStatus);

// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação

// ===== ROTAS DO VENDOR AUTENTICADO =====
router.get('/my-vendor', AuthGuard, vendorController.getMyVendor); // ✅ Novo endpoint para vendor autenticado
router.put('/my-vendor', AuthGuard, vendorController.updateMyVendor); // ✅ Novo endpoint para atualizar vendor

// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.post('/', AuthGuard, vendorController.createVendor);
router.get('/:id', AuthGuard, vendorController.getVendorById);
router.get('/owner/:ownerId', AuthGuard, vendorController.getVendorByOwner);
router.put('/:id', AuthGuard, vendorController.updateVendor);
router.delete('/:id', AuthGuard, vendorController.deleteVendor);
router.patch('/:id/suspend', AuthGuard, vendorController.suspendVendor);
router.patch('/:id/reactivate', AuthGuard, vendorController.reactivateVendor);
router.patch('/:id/close-temporarily', AuthGuard, vendorController.closeTemporarily);
router.patch('/:id/reopen', AuthGuard, vendorController.reopenVendor);
router.put('/:id/working-hours', AuthGuard, vendorController.updateWorkingHours);
router.put('/:id/working-hours/:day', AuthGuard, vendorController.updateDayWorkingHour);
router.put('/:id/address', AuthGuard, vendorController.updateAddress);
router.get('/:id/is-open', AuthGuard, vendorController.isVendorOpen);
router.get('/nearby', AuthGuard, vendorController.getNearbyVendors);
router.get('/location', AuthGuard, vendorController.getVendorsByLocation);

export default router;