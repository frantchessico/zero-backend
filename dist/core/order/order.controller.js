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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("./order.service");
const query_service_1 = require("../audit/query.service");
const User_1 = require("../../models/User");
const logger_1 = require("../../utils/logger");
const payment_service_1 = require("../payment/payment.service");
const coupon_service_1 = require("../coupon/coupon.service");
const notification_service_1 = require("../notification/notification.service");
const delivery_service_1 = __importDefault(require("../delivery/delivery.service"));
const chat_service_1 = require("../chat/chat.service");
const Delivery_1 = require("../../models/Delivery");
const Vendor_1 = require("../../models/Vendor");
class OrderController {
    constructor() {
        /**
         * POST /orders - Criar novo pedido
         */
        this.createOrder = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
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
                const orderData = Object.assign(Object.assign({}, req.body), { customer: user._id // Usar ID do usuário encontrado no banco
                 });
                // Validações básicas
                if (!orderData.vendor || !orderData.items || orderData.items.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: 'vendor e items são obrigatórios'
                    });
                    return;
                }
                const order = yield this.orderService.createOrder(orderData);
                yield chat_service_1.chatService.syncOrderConversations(((_b = order._id) === null || _b === void 0 ? void 0 : _b.toString()) || '');
                // Buscar order com relacionamentos para resposta
                const orderWithRelations = yield query_service_1.QueryService.getOrderWithRelations(((_c = order._id) === null || _c === void 0 ? void 0 : _c.toString()) || '');
                res.status(201).json({
                    success: true,
                    message: 'Pedido criado com sucesso',
                    data: orderWithRelations
                });
            }
            catch (error) {
                logger_1.logger.error('Error creating order:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar pedido'
                });
            }
        });
        /**
         * GET /orders - Listar pedidos do usuário
         */
        this.getUserOrders = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const userId = user._id;
                const { status, page = 1, limit = 10 } = req.query;
                const options = {
                    status: status,
                    sort: { createdAt: -1 },
                    limit: parseInt(limit),
                    skip: (parseInt(page) - 1) * parseInt(limit)
                };
                const orders = yield query_service_1.QueryService.getUserOrders(userId.toString(), options);
                res.status(200).json({
                    success: true,
                    data: orders,
                    pagination: {
                        currentPage: parseInt(page),
                        itemsPerPage: parseInt(limit),
                        totalItems: orders.length // Em produção, usar count separado
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching user orders:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar pedidos'
                });
            }
        });
        /**
         * GET /orders/:orderId - Buscar pedido específico
         */
        this.getOrderById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const order = yield query_service_1.QueryService.getOrderWithRelations(orderId);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: order
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching order:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar pedido'
                });
            }
        });
        /**
         * PUT /orders/:orderId - Atualizar pedido
         */
        this.updateOrder = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const updateData = req.body;
                // Usar updateOrderStatus se for atualização de status
                if (updateData.status) {
                    const order = yield this.orderService.updateOrderStatus(orderId, updateData.status);
                    if (!order) {
                        res.status(404).json({
                            success: false,
                            message: 'Pedido não encontrado'
                        });
                        return;
                    }
                    // Buscar order atualizado com relacionamentos
                    const orderWithRelations = yield query_service_1.QueryService.getOrderWithRelations(orderId);
                    res.status(200).json({
                        success: true,
                        message: 'Pedido atualizado com sucesso',
                        data: orderWithRelations
                    });
                    return;
                }
                // Para outras atualizações, usar métodos específicos
                res.status(400).json({
                    success: false,
                    message: 'Método de atualização não suportado'
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating order:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar pedido'
                });
            }
        });
        /**
         * PATCH /orders/:orderId/status - Atualizar status do pedido
         */
        this.updateOrderStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const { status } = req.body;
                if (!status) {
                    res.status(400).json({
                        success: false,
                        message: 'Status é obrigatório'
                    });
                    return;
                }
                const order = yield this.orderService.updateOrderStatus(orderId, status);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                // Buscar order atualizado com relacionamentos
                const orderWithRelations = yield query_service_1.QueryService.getOrderWithRelations(orderId);
                res.status(200).json({
                    success: true,
                    message: 'Status do pedido atualizado com sucesso',
                    data: orderWithRelations
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating order status:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar status do pedido'
                });
            }
        });
        /**
         * DELETE /orders/:orderId - Cancelar pedido
         */
        this.cancelOrder = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const order = yield this.orderService.cancelOrder(orderId);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Pedido cancelado com sucesso'
                });
            }
            catch (error) {
                logger_1.logger.error('Error canceling order:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao cancelar pedido'
                });
            }
        });
        /**
         * GET /orders/vendor/orders - Listar pedidos do vendor
         */
        this.getVendorOrders = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const vendorId = user.vendorId; // Assumindo que vendor tem vendorId
                if (!vendorId) {
                    res.status(403).json({
                        success: false,
                        message: 'Usuário não é um vendor válido'
                    });
                    return;
                }
                const vendorIdString = vendorId.toString();
                const { status, page = 1, limit = 10 } = req.query;
                const orders = yield this.orderService.getOrdersByVendor(vendorIdString, parseInt(page), parseInt(limit), status);
                res.status(200).json({
                    success: true,
                    data: orders.orders,
                    pagination: {
                        currentPage: parseInt(page),
                        itemsPerPage: parseInt(limit),
                        totalItems: orders.total,
                        totalPages: orders.totalPages
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching vendor orders:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar pedidos do vendor'
                });
            }
        });
        /**
         * PATCH /orders/:orderId/vendor/status - Vendor atualizar status
         */
        this.updateVendorOrderStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const { status } = req.body;
                if (!status) {
                    res.status(400).json({
                        success: false,
                        message: 'Status é obrigatório'
                    });
                    return;
                }
                const order = yield this.orderService.updateOrderStatus(orderId, status);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                // Buscar order atualizado com relacionamentos
                const orderWithRelations = yield query_service_1.QueryService.getOrderWithRelations(orderId);
                res.status(200).json({
                    success: true,
                    message: 'Status do pedido atualizado com sucesso',
                    data: orderWithRelations
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating vendor order status:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar status do pedido'
                });
            }
        });
        /**
         * GET /orders/history/orders - Histórico de pedidos
         */
        this.getOrderHistory = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const userId = user._id;
                const { page = 1, limit = 10 } = req.query;
                const options = {
                    sort: { createdAt: -1 },
                    limit: parseInt(limit),
                    skip: (parseInt(page) - 1) * parseInt(limit)
                };
                const orders = yield query_service_1.QueryService.getUserOrders(userId.toString(), options);
                res.status(200).json({
                    success: true,
                    data: orders,
                    pagination: {
                        currentPage: parseInt(page),
                        itemsPerPage: parseInt(limit),
                        totalItems: orders.length
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching order history:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar histórico de pedidos'
                });
            }
        });
        /**
         * GET /orders/stats/orders - Estatísticas de pedidos
         */
        this.getOrderStats = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const userId = user._id;
                const { vendorId, startDate, endDate } = req.query;
                const stats = yield this.orderService.getOrderStatistics(vendorId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching order stats:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar estatísticas de pedidos'
                });
            }
        });
        /**
         * POST /orders/:orderId/payment - Processar pagamento
         */
        this.processPayment = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const { orderId } = req.params;
                const { phoneNumber, amount, paymentType, appPaymentOrigin, couponCode, idempotencyKey } = req.body;
                if (!phoneNumber) {
                    res.status(400).json({
                        success: false,
                        message: 'phoneNumber é obrigatório para pagamento M-Pesa'
                    });
                    return;
                }
                // Buscar pedido para validar cupom e valor
                const order = yield this.orderService.getOrderById(orderId);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                let couponId;
                let discountAmount;
                // Aplicar cupom se informado
                if (couponCode) {
                    const vendorId = typeof order.vendor === 'object' && order.vendor
                        ? (((_b = (_a = order.vendor._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_d = (_c = order.vendor).toString) === null || _d === void 0 ? void 0 : _d.call(_c)))
                        : String(order.vendor);
                    const validation = yield coupon_service_1.couponService.validateCoupon({
                        code: couponCode,
                        vendorId,
                        paymentMethod: 'mpesa',
                        orderTotal: order.subtotal,
                        deliveryFee: order.deliveryFee
                    });
                    if (!validation.valid) {
                        res.status(400).json({
                            success: false,
                            message: validation.reason || 'Cupom inválido'
                        });
                        return;
                    }
                    couponId = validation.couponId;
                    discountAmount = validation.discountAmount;
                    const repricedOrder = yield this.orderService.applyCouponToOrder({
                        orderId,
                        couponId: validation.couponId || '',
                        couponCode,
                        discountAmount: validation.discountAmount || 0
                    });
                    if (!repricedOrder) {
                        res.status(404).json({
                            success: false,
                            message: 'Pedido não encontrado'
                        });
                        return;
                    }
                }
                const { mpesaResponse, paymentLog } = yield this.paymentService.createMpesaPayment({
                    orderId,
                    phoneNumber,
                    amount,
                    paymentType,
                    appPaymentOrigin,
                    couponId,
                    discountAmount,
                    idempotencyKey
                });
                const finalStatus = ((paymentLog === null || paymentLog === void 0 ? void 0 : paymentLog.status) || 'pending');
                const updatedOrder = yield this.orderService.updatePaymentStatus(orderId, finalStatus);
                if (!updatedOrder) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                // Registrar uso do cupom se aplicável
                if (couponId && finalStatus === 'paid') {
                    const registered = yield coupon_service_1.couponService.registerUse(couponId);
                    if (!registered) {
                        logger_1.logger.warn(`Coupon usage could not be registered for coupon ${couponId}`);
                    }
                }
                res.status(200).json({
                    success: true,
                    message: 'Pagamento processado com sucesso',
                    data: {
                        order: updatedOrder,
                        payment: paymentLog,
                        mpesa: mpesaResponse
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error processing payment:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao processar pagamento'
                });
            }
        });
        /**
         * GET /orders/:orderId/payment - Verificar status do pagamento
         */
        this.getPaymentStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const order = yield this.orderService.getOrderById(orderId);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: {
                        orderId: order._id,
                        paymentStatus: order.paymentStatus,
                        paymentMethod: order.paymentMethod,
                        total: order.total
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching payment status:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar status do pagamento'
                });
            }
        });
        /**
         * POST /orders/:orderId/delivery - Criar entrega
         */
        this.createDelivery = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const deliveryData = req.body || {};
                const createdDelivery = yield delivery_service_1.default.createDelivery({
                    orderId,
                    driverId: deliveryData.driverId,
                    estimatedTime: deliveryData.estimatedTime ? new Date(deliveryData.estimatedTime) : undefined
                });
                yield chat_service_1.chatService.syncOrderConversations(orderId);
                res.status(201).json({
                    success: true,
                    message: 'Entrega criada com sucesso',
                    data: createdDelivery
                });
            }
            catch (error) {
                logger_1.logger.error('Error creating delivery:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar entrega'
                });
            }
        });
        /**
         * GET /orders/:orderId/delivery - Verificar status da entrega
         */
        this.getDeliveryStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const deliveryRecord = yield Delivery_1.Delivery.findOne({ order: orderId }).select('_id').exec();
                if (!deliveryRecord) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega não encontrada'
                    });
                    return;
                }
                const delivery = yield query_service_1.QueryService.getDeliveryWithRelations(deliveryRecord._id.toString());
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: delivery
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching delivery status:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar status da entrega'
                });
            }
        });
        /**
         * POST /orders/:orderId/notifications - Enviar notificação
         */
        this.sendNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { orderId } = req.params;
                const { message, type, recipient = 'customer' } = req.body;
                if (!message || !type) {
                    res.status(400).json({
                        success: false,
                        message: 'Mensagem e tipo são obrigatórios'
                    });
                    return;
                }
                // Verificar se o pedido existe
                const order = yield this.orderService.getOrderById(orderId);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                const notifications = [];
                if (recipient === 'customer' || recipient === 'both') {
                    notifications.push(yield this.notificationService.createNotification(String(((_a = order.customer) === null || _a === void 0 ? void 0 : _a._id) || order.customer), type, message, { orderId }));
                }
                if (recipient === 'vendor' || recipient === 'both') {
                    const vendor = yield Vendor_1.Vendor.findById(((_b = order.vendor) === null || _b === void 0 ? void 0 : _b._id) || order.vendor).exec();
                    if (vendor === null || vendor === void 0 ? void 0 : vendor.owner) {
                        notifications.push(yield this.notificationService.createNotification(vendor.owner.toString(), type, message, { orderId }));
                    }
                }
                res.status(200).json({
                    success: true,
                    message: 'Notificação enviada com sucesso',
                    data: notifications
                });
            }
            catch (error) {
                logger_1.logger.error('Error sending notification:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao enviar notificação'
                });
            }
        });
        /**
         * GET /orders/:orderId/notifications - Listar notificações
         */
        this.getNotifications = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                // Verificar se o pedido existe
                const order = yield this.orderService.getOrderById(orderId);
                if (!order) {
                    res.status(404).json({
                        success: false,
                        message: 'Pedido não encontrado'
                    });
                    return;
                }
                const notifications = yield this.notificationService.getOrderNotifications(orderId);
                res.status(200).json({
                    success: true,
                    data: notifications
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching notifications:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar notificações'
                });
            }
        });
        this.orderService = new order_service_1.OrderService();
        this.paymentService = new payment_service_1.PaymentService();
        this.notificationService = new notification_service_1.NotificationService();
    }
}
exports.OrderController = OrderController;
