"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const personal_delivery_controller_1 = __importDefault(require("../core/personal-delivery/personal-delivery.controller"));
const auth_guard_1 = require("../guards/auth.guard");
const router = (0, express_1.Router)();
// ===== ROTAS PÚBLICAS =====
router.post('/calculate-fee', personal_delivery_controller_1.default.calculateDeliveryFee);
// ===== ROTAS PROTEGIDAS =====
router.post('/', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.createPersonalDelivery);
router.get('/', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.getUserPersonalDeliveries);
router.get('/:id', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.getPersonalDeliveryById);
router.put('/:id', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.updatePersonalDelivery);
router.post('/:id/assign-driver', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.assignDriver);
router.delete('/:id', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.cancelPersonalDelivery);
router.get('/:id/track', auth_guard_1.AuthGuard, personal_delivery_controller_1.default.trackPersonalDelivery);
exports.default = router;
