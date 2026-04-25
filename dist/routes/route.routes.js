"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const route_controller_1 = __importDefault(require("../core/route/route.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS DO DRIVER AUTENTICADO =====
router.post('/my/build', auth_guard_1.AuthGuard, route_controller_1.default.buildMyRoute);
router.get('/my/active', auth_guard_1.AuthGuard, route_controller_1.default.getMyActiveRoute);
// ===== ROTAS ADMIN/OPS =====
router.post('/:driverId/build', auth_guard_1.AuthGuard, route_controller_1.default.buildRouteForDriver);
exports.default = router;
