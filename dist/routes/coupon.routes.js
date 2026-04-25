"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = __importDefault(require("../core/coupon/coupon.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS DO VENDOR AUTENTICADO =====
router.post('/', auth_guard_1.AuthGuard, coupon_controller_1.default.createCoupon);
router.get('/my', auth_guard_1.AuthGuard, coupon_controller_1.default.getMyCoupons);
router.patch('/:id', auth_guard_1.AuthGuard, coupon_controller_1.default.updateCoupon);
// ===== ROTAS PÚBLICAS / CLIENTE =====
router.get('/available', coupon_controller_1.default.getAvailableCoupons);
router.post('/validate', coupon_controller_1.default.validateCoupon);
exports.default = router;
