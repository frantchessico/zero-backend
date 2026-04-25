"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loyalty_controller_1 = __importDefault(require("../core/loyalty/loyalty.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS DO CLIENTE =====
router.get('/status', auth_guard_1.AuthGuard, loyalty_controller_1.default.getMyLoyaltyStatus);
router.get('/rewards', loyalty_controller_1.default.getAvailableRewards); // Público
router.post('/redeem', auth_guard_1.AuthGuard, loyalty_controller_1.default.redeemReward);
router.get('/transactions', auth_guard_1.AuthGuard, loyalty_controller_1.default.getMyTransactions);
// ===== ROTAS ADMIN/VENDOR =====
router.post('/program', auth_guard_1.AuthGuard, loyalty_controller_1.default.createOrUpdateProgram);
router.get('/program', loyalty_controller_1.default.getProgram); // Público para ver programa
exports.default = router;
