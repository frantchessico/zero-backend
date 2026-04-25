"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promotion_controller_1 = __importDefault(require("../core/promotion/promotion.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS PÚBLICAS =====
router.get('/vendor/:vendorId', promotion_controller_1.default.getVendorPublicPromotions);
// ===== ROTAS DO VENDOR AUTENTICADO =====
router.post('/', auth_guard_1.AuthGuard, promotion_controller_1.default.createPromotion);
router.get('/my', auth_guard_1.AuthGuard, promotion_controller_1.default.getMyPromotions);
router.patch('/:id', auth_guard_1.AuthGuard, promotion_controller_1.default.updatePromotion);
exports.default = router;
