"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_controller_1 = require("../core/vendor/vendor.controller");
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
const vendorController = new vendor_controller_1.VendorController();
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
router.get('/my-vendor', auth_guard_1.AuthGuard, vendorController.getMyVendor); // ✅ Novo endpoint para vendor autenticado
router.put('/my-vendor', auth_guard_1.AuthGuard, vendorController.updateMyVendor); // ✅ Novo endpoint para atualizar vendor
router.get('/my-balance', auth_guard_1.AuthGuard, vendorController.getMyBalance); // ✅ Saldo do vendor autenticado
// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.post('/', auth_guard_1.AuthGuard, vendorController.createVendor);
router.get('/:id', auth_guard_1.AuthGuard, vendorController.getVendorById);
router.get('/owner/:ownerId', auth_guard_1.AuthGuard, vendorController.getVendorByOwner);
router.put('/:id', auth_guard_1.AuthGuard, vendorController.updateVendor);
router.delete('/:id', auth_guard_1.AuthGuard, vendorController.deleteVendor);
router.patch('/:id/suspend', auth_guard_1.AuthGuard, vendorController.suspendVendor);
router.patch('/:id/reactivate', auth_guard_1.AuthGuard, vendorController.reactivateVendor);
router.patch('/:id/close-temporarily', auth_guard_1.AuthGuard, vendorController.closeTemporarily);
router.patch('/:id/reopen', auth_guard_1.AuthGuard, vendorController.reopenVendor);
router.put('/:id/working-hours', auth_guard_1.AuthGuard, vendorController.updateWorkingHours);
router.put('/:id/working-hours/:day', auth_guard_1.AuthGuard, vendorController.updateDayWorkingHour);
router.put('/:id/address', auth_guard_1.AuthGuard, vendorController.updateAddress);
router.get('/:id/is-open', auth_guard_1.AuthGuard, vendorController.isVendorOpen);
router.get('/nearby', auth_guard_1.AuthGuard, vendorController.getNearbyVendors);
router.get('/location', auth_guard_1.AuthGuard, vendorController.getVendorsByLocation);
exports.default = router;
