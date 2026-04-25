"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponController = void 0;
const User_1 = require("../../models/User");
const Vendor_1 = require("../../models/Vendor");
const coupon_service_1 = require("./coupon.service");
const notification_service_1 = require("../notification/notification.service");
const logger_1 = require("../../utils/logger");
class CouponController {
    constructor() {
        /**
         * POST /coupons - Vendor autenticado cria cupom
         */
        this.createCoupon = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                if (user.role !== 'vendor') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas vendors podem criar cupons'
                    });
                    return;
                }
                const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                if (!vendor || !vendor._id) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const { code, title, description, type, value, allowedPaymentMethods, minOrderAmount, maxDiscountAmount, maxUses, startDate, endDate } = req.body;
                if (!code || !type || value === undefined) {
                    res.status(400).json({
                        success: false,
                        message: 'code, type e value são obrigatórios'
                    });
                    return;
                }
                const coupon = yield coupon_service_1.couponService.createCoupon({
                    vendorId: vendor._id.toString(),
                    code: code.toUpperCase(),
                    title,
                    description,
                    type,
                    value,
                    allowedPaymentMethods,
                    minOrderAmount,
                    maxDiscountAmount,
                    maxUses,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined
                });
                // Emitir notificações para clientes e usuários
                try {
                    const notificationService = new notification_service_1.NotificationService();
                    // Montar informações do desconto
                    const discountInfo = type === 'percentage'
                        ? `${value}% de desconto`
                        : `${value} MT de desconto`;
                    // Notificar apenas clientes sobre o cupom
                    yield notificationService.notifyCustomersAboutCoupon(coupon.code, vendor.name, discountInfo);
                    logger_1.logger.info(`Notificações de cupom ${coupon.code} enviadas para clientes`);
                }
                catch (notifError) {
                    // Não falhar a criação do cupom se a notificação falhar
                    logger_1.logger.error('Erro ao enviar notificações de cupom:', notifError);
                }
                res.status(201).json({
                    success: true,
                    message: 'Cupom criado com sucesso',
                    data: coupon
                });
            }
            catch (error) {
                logger_1.logger.error('Error creating coupon:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar cupom'
                });
            }
        });
        /**
         * GET /coupons/my - Listar cupons do vendor autenticado
         */
        this.getMyCoupons = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                if (user.role !== 'vendor') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas vendors podem ver cupons'
                    });
                    return;
                }
                const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                if (!vendor || !vendor._id) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const coupons = yield coupon_service_1.couponService.getVendorCoupons(vendor._id.toString());
                res.status(200).json({
                    success: true,
                    data: coupons
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor coupons:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar cupons'
                });
            }
        });
        /**
         * PATCH /coupons/:id - Atualizar/ativar/desativar cupom (vendor)
         */
        this.updateCoupon = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                if (user.role !== 'vendor') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas vendors podem atualizar cupons'
                    });
                    return;
                }
                const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                if (!vendor || !vendor._id) {
                    res.status(404).json({
                        success: false,
                        message: 'Vendor não encontrado para este usuário'
                    });
                    return;
                }
                const { id } = req.params;
                // Verificar se o cupom existe e pertence ao vendor
                const existingCoupon = yield coupon_service_1.couponService.getCouponById(id);
                if (!existingCoupon) {
                    res.status(404).json({
                        success: false,
                        message: 'Cupom não encontrado'
                    });
                    return;
                }
                // Validar ownership: vendor só pode atualizar seus próprios cupons
                if (existingCoupon.vendor && existingCoupon.vendor.toString() !== vendor._id.toString()) {
                    res.status(403).json({
                        success: false,
                        message: 'Você não tem permissão para atualizar este cupom'
                    });
                    return;
                }
                const updateData = req.body;
                const coupon = yield coupon_service_1.couponService.updateCoupon(id, updateData);
                res.status(200).json({
                    success: true,
                    message: 'Cupom atualizado com sucesso',
                    data: coupon
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating coupon:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar cupom'
                });
            }
        });
        /**
         * POST /coupons/validate - Validar cupom para um pedido
         */
        this.validateCoupon = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, vendorId, paymentMethod, orderTotal } = req.body;
                if (!code || !paymentMethod || orderTotal === undefined) {
                    res.status(400).json({
                        success: false,
                        message: 'code, paymentMethod e orderTotal são obrigatórios'
                    });
                    return;
                }
                const result = yield coupon_service_1.couponService.validateCoupon({
                    code,
                    vendorId,
                    paymentMethod,
                    orderTotal
                });
                if (!result.valid) {
                    res.status(400).json({
                        success: false,
                        message: result.reason || 'Cupom inválido',
                        data: result
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                logger_1.logger.error('Error validating coupon:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao validar cupom'
                });
            }
        });
        /**
         * GET /coupons/available - Listar cupons disponíveis (público ou autenticado)
         */
        this.getAvailableCoupons = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId } = req.query;
                const coupons = yield coupon_service_1.couponService.getAvailableCouponsForVendor(vendorId);
                res.status(200).json({
                    success: true,
                    data: coupons
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching available coupons:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar cupons disponíveis'
                });
            }
        });
    }
}
exports.CouponController = CouponController;
exports.default = new CouponController();
