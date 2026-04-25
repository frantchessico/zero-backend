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
exports.PersonalDeliveryController = void 0;
const personal_delivery_service_1 = require("./personal-delivery.service");
const User_1 = require("../../models/User");
const logger_1 = require("../../utils/logger");
class PersonalDeliveryController {
    constructor() {
        /**
         * POST /personal-delivery - Criar nova entrega pessoal
         */
        this.createPersonalDelivery = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
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
                const deliveryData = Object.assign(Object.assign({}, req.body), { customerId: user._id.toString() // Usar ID do usuário encontrado no banco
                 });
                // Validações básicas
                if (!deliveryData.pickupAddress || !deliveryData.deliveryAddress || !deliveryData.items || deliveryData.items.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: 'pickupAddress, deliveryAddress e items são obrigatórios'
                    });
                    return;
                }
                if (!deliveryData.category || !deliveryData.estimatedValue || !deliveryData.paymentMethod) {
                    res.status(400).json({
                        success: false,
                        message: 'category, estimatedValue e paymentMethod são obrigatórios'
                    });
                    return;
                }
                const delivery = yield this.personalDeliveryService.createPersonalDelivery(deliveryData);
                res.status(201).json({
                    success: true,
                    message: 'Entrega pessoal criada com sucesso',
                    data: {
                        id: delivery._id,
                        deliveryFee: delivery.deliveryFee,
                        insuranceFee: delivery.insuranceFee,
                        total: delivery.total,
                        status: delivery.status,
                        estimatedPickupTime: delivery.estimatedPickupTime,
                        estimatedDeliveryTime: delivery.estimatedDeliveryTime
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error creating personal delivery:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar entrega pessoal'
                });
            }
        });
        /**
         * GET /personal-delivery - Listar entregas pessoais do usuário
         */
        this.getUserPersonalDeliveries = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
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
                const userId = user._id.toString();
                const { page = 1, limit = 10 } = req.query;
                const deliveries = yield this.personalDeliveryService.getCustomerPersonalDeliveries(userId, parseInt(page), parseInt(limit));
                res.status(200).json({
                    success: true,
                    data: deliveries.deliveries,
                    pagination: {
                        currentPage: parseInt(page),
                        itemsPerPage: parseInt(limit),
                        totalItems: deliveries.total,
                        totalPages: deliveries.totalPages
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching user personal deliveries:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar entregas pessoais'
                });
            }
        });
        /**
         * GET /personal-delivery/:id - Buscar entrega pessoal específica
         */
        this.getPersonalDeliveryById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const delivery = yield this.personalDeliveryService.getPersonalDeliveryById(id);
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega pessoal não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: delivery
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching personal delivery:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar entrega pessoal'
                });
            }
        });
        /**
         * PUT /personal-delivery/:id - Atualizar entrega pessoal
         */
        this.updatePersonalDelivery = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const delivery = yield this.personalDeliveryService.updatePersonalDelivery(id, updateData);
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega pessoal não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Entrega pessoal atualizada com sucesso',
                    data: delivery
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating personal delivery:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar entrega pessoal'
                });
            }
        });
        /**
         * POST /personal-delivery/:id/assign-driver - Atribuir driver
         */
        this.assignDriver = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { driverId } = req.body;
                const delivery = yield this.personalDeliveryService.assignDriver(id, driverId);
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega pessoal não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Driver atribuído com sucesso',
                    data: {
                        id: delivery._id,
                        driver: delivery.driver,
                        estimatedPickupTime: delivery.estimatedPickupTime,
                        estimatedDeliveryTime: delivery.estimatedDeliveryTime
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error assigning driver:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atribuir driver'
                });
            }
        });
        /**
         * DELETE /personal-delivery/:id - Cancelar entrega pessoal
         */
        this.cancelPersonalDelivery = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                const delivery = yield this.personalDeliveryService.cancelPersonalDelivery(id, reason);
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega pessoal não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Entrega pessoal cancelada com sucesso',
                    data: {
                        id: delivery._id,
                        status: delivery.status,
                        paymentStatus: delivery.paymentStatus
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error canceling personal delivery:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao cancelar entrega pessoal'
                });
            }
        });
        /**
         * GET /personal-delivery/:id/track - Rastrear entrega pessoal
         */
        this.trackPersonalDelivery = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const delivery = yield this.personalDeliveryService.getPersonalDeliveryById(id);
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega pessoal não encontrada'
                    });
                    return;
                }
                // Calcular informações de rastreamento
                const trackingInfo = {
                    id: delivery._id,
                    status: delivery.status,
                    pickupAddress: delivery.pickupAddress,
                    deliveryAddress: delivery.deliveryAddress,
                    driver: delivery.driver,
                    estimatedPickupTime: delivery.estimatedPickupTime,
                    estimatedDeliveryTime: delivery.estimatedDeliveryTime,
                    actualPickupTime: delivery.actualPickupTime,
                    actualDeliveryTime: delivery.actualDeliveryTime,
                    items: delivery.items,
                    category: delivery.category,
                    totalWeight: delivery.totalWeight,
                    insuranceRequired: delivery.insuranceRequired,
                    signatureRequired: delivery.signatureRequired
                };
                res.status(200).json({
                    success: true,
                    data: trackingInfo
                });
            }
            catch (error) {
                logger_1.logger.error('Error tracking personal delivery:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao rastrear entrega pessoal'
                });
            }
        });
        /**
         * GET /personal-delivery/calculate-fee - Calcular taxa de entrega
         */
        this.calculateDeliveryFee = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { pickupAddress, deliveryAddress, items } = req.body;
                if (!pickupAddress || !deliveryAddress || !items) {
                    res.status(400).json({
                        success: false,
                        message: 'pickupAddress, deliveryAddress e items são obrigatórios'
                    });
                    return;
                }
                // Simular cálculo de taxa (em produção, usar método do service)
                const distance = 10; // km (simulado)
                const totalWeight = items.reduce((sum, item) => {
                    return sum + (item.weight || 0) * item.quantity;
                }, 0);
                const baseFee = 50;
                const distanceFee = distance * 10;
                const weightFee = totalWeight * 5;
                const fragileFee = items.filter((item) => item.isFragile).length * 20;
                const totalFee = baseFee + distanceFee + weightFee + fragileFee;
                res.status(200).json({
                    success: true,
                    data: {
                        baseFee,
                        distanceFee,
                        weightFee,
                        fragileFee,
                        totalFee,
                        distance,
                        totalWeight
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error calculating delivery fee:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao calcular taxa de entrega'
                });
            }
        });
        this.personalDeliveryService = personal_delivery_service_1.PersonalDeliveryService;
    }
}
exports.PersonalDeliveryController = PersonalDeliveryController;
exports.default = new PersonalDeliveryController();
