"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/driverRoutes.ts
const express_1 = require("express");
const driver_controller_1 = __importDefault(require("../core/driver/driver.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS PÚBLICAS =====
// Rotas que não precisam de autenticação
router.get('/available', driver_controller_1.default.getAvailableDrivers);
router.get('/search', driver_controller_1.default.getDrivers);
// ===== ROTAS PROTEGIDAS =====
// Rotas que precisam de autenticação
// ===== ROTAS DO DRIVER AUTENTICADO =====
router.get('/my-profile', auth_guard_1.AuthGuard, driver_controller_1.default.getMyDriverProfile); // ✅ Novo endpoint para driver autenticado
router.put('/my-profile', auth_guard_1.AuthGuard, driver_controller_1.default.updateMyDriverProfile); // ✅ Novo endpoint para atualizar perfil
router.get('/my-earnings', auth_guard_1.AuthGuard, driver_controller_1.default.getMyEarnings); // ✅ Ganhos do driver autenticado
// ===== ROTAS ADMINISTRATIVAS =====
// Rotas que precisam de autenticação e são para admins
router.post('/:userId/profile', auth_guard_1.AuthGuard, driver_controller_1.default.createDriverProfile);
router.get('/:id', auth_guard_1.AuthGuard, driver_controller_1.default.getDriverById);
router.get('/:id/earnings', auth_guard_1.AuthGuard, driver_controller_1.default.getDriverEarnings);
router.get('/user/:userId', auth_guard_1.AuthGuard, driver_controller_1.default.getDriverByUserId);
router.put('/:id', auth_guard_1.AuthGuard, driver_controller_1.default.updateDriver);
router.patch('/:id/location', auth_guard_1.AuthGuard, driver_controller_1.default.updateLocation);
router.patch('/:id/availability', auth_guard_1.AuthGuard, driver_controller_1.default.toggleAvailability);
router.post('/:id/assign', auth_guard_1.AuthGuard, driver_controller_1.default.assignToOrder);
router.get('/:id/stats', auth_guard_1.AuthGuard, driver_controller_1.default.getDriverStats);
router.patch('/:id/rating', auth_guard_1.AuthGuard, driver_controller_1.default.updateRating);
router.patch('/:id/verify', auth_guard_1.AuthGuard, driver_controller_1.default.verifyDriver);
router.delete('/:id', auth_guard_1.AuthGuard, driver_controller_1.default.deleteDriver);
router.get('/:userId/dashboard', auth_guard_1.AuthGuard, driver_controller_1.default.getDriverDashboard);
exports.default = router;
