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
exports.PromotionController = void 0;
const User_1 = require("../../models/User");
const Vendor_1 = require("../../models/Vendor");
const promotion_service_1 = require("./promotion.service");
const notification_service_1 = require("../notification/notification.service");
const logger_1 = require("../../utils/logger");
class PromotionController {
    constructor() {
        /**
         * POST /promotions - Vendor autenticado cria promoção
         */
        this.createPromotion = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                        message: 'Apenas vendors podem criar promoções'
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
                const { productId, title, description, type, value, minOrderAmount, maxDiscountAmount, startDate, endDate } = req.body;
                if (!title || !type || value === undefined) {
                    res.status(400).json({
                        success: false,
                        message: 'title, type e value são obrigatórios'
                    });
                    return;
                }
                const promotion = yield promotion_service_1.promotionService.createPromotion({
                    vendorId: vendor._id.toString(),
                    productId,
                    title,
                    description,
                    type,
                    value,
                    minOrderAmount,
                    maxDiscountAmount,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined
                });
                // Emitir notificações para clientes e usuários
                try {
                    const notificationService = new notification_service_1.NotificationService();
                    // Notificar apenas clientes sobre a promoção
                    yield notificationService.notifyCustomersAboutPromotion(promotion.title || title, vendor.name, description);
                    logger_1.logger.info(`Notificações de promoção "${promotion.title || title}" enviadas para clientes`);
                }
                catch (notifError) {
                    // Não falhar a criação da promoção se a notificação falhar
                    logger_1.logger.error('Erro ao enviar notificações de promoção:', notifError);
                }
                res.status(201).json({
                    success: true,
                    message: 'Promoção criada com sucesso',
                    data: promotion
                });
            }
            catch (error) {
                logger_1.logger.error('Error creating promotion:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar promoção'
                });
            }
        });
        /**
         * GET /promotions/my - Listar promoções do vendor autenticado
         */
        this.getMyPromotions = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                        message: 'Apenas vendors podem ver promoções'
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
                const { onlyActive } = req.query;
                const promotions = yield promotion_service_1.promotionService.getVendorPromotions(vendor._id.toString(), onlyActive === 'true');
                res.status(200).json({
                    success: true,
                    data: promotions
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor promotions:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar promoções'
                });
            }
        });
        /**
         * PATCH /promotions/:id - Atualizar/ativar/desativar promoção (vendor)
         */
        this.updatePromotion = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                        message: 'Apenas vendors podem atualizar promoções'
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
                const updateData = req.body;
                const promotion = yield promotion_service_1.promotionService.updatePromotion(id, updateData);
                if (!promotion) {
                    res.status(404).json({
                        success: false,
                        message: 'Promoção não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Promoção atualizada com sucesso',
                    data: promotion
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating promotion:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar promoção'
                });
            }
        });
        /**
         * GET /promotions/vendor/:vendorId - Promoções públicas ativas de um vendor
         */
        this.getVendorPublicPromotions = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId } = req.params;
                const promotions = yield promotion_service_1.promotionService.getVendorPromotions(vendorId, true);
                res.status(200).json({
                    success: true,
                    data: promotions
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching public promotions:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar promoções do vendor'
                });
            }
        });
    }
}
exports.PromotionController = PromotionController;
exports.default = new PromotionController();
