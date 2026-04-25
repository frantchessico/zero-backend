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
exports.OrderService = void 0;
const mongoose_1 = require("mongoose");
const Order_1 = require("../../models/Order");
const notification_service_1 = require("../notification/notification.service");
const User_1 = require("../../models/User");
const Vendor_1 = require("../../models/Vendor");
const Product_1 = __importDefault(require("../../models/Product"));
const promotion_service_1 = require("../promotion/promotion.service");
const loyalty_service_1 = require("../loyalty/loyalty.service");
const payment_service_1 = require("../payment/payment.service");
class OrderService {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
        this.paymentService = new payment_service_1.PaymentService();
    }
    toObjectId(value, fieldName) {
        const rawValue = value instanceof mongoose_1.Types.ObjectId ? value.toString() : String(value || '');
        if (!mongoose_1.Types.ObjectId.isValid(rawValue)) {
            throw new Error(`${fieldName} inválido`);
        }
        return new mongoose_1.Types.ObjectId(rawValue);
    }
    getNumber(value, fallback = 0) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return fallback;
        }
        return Number(parsed.toFixed(2));
    }
    normalizeOrderType(requestedType, firstProductType) {
        if (requestedType && ['food', 'medicine', 'document', 'appliance'].includes(requestedType)) {
            return requestedType;
        }
        switch (firstProductType) {
            case 'food':
                return 'food';
            case 'medicine':
                return 'medicine';
            case 'appliance':
                return 'appliance';
            default:
                return 'document';
        }
    }
    ensureVendorCanReceiveOrders(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const vendor = yield Vendor_1.Vendor.findById(vendorId).exec();
            if (!vendor) {
                throw new Error('Estabelecimento não encontrado');
            }
            if (vendor.status !== 'active') {
                throw new Error('Estabelecimento indisponível para pedidos');
            }
            if (vendor.temporarilyClosed) {
                throw new Error(vendor.closedMessage || 'Estabelecimento temporariamente fechado');
            }
            if (!vendor.open24h) {
                const now = new Date();
                const currentDay = now.getDay();
                const currentTime = now.toTimeString().slice(0, 5);
                const todayHours = vendor.workingHours.find((workingHour) => workingHour.day === currentDay);
                if (!todayHours || !todayHours.active) {
                    throw new Error('Estabelecimento fechado hoje');
                }
                if (!todayHours.open || !todayHours.close) {
                    throw new Error('Horário de funcionamento indisponível');
                }
                if (currentTime < todayHours.open || currentTime > todayHours.close) {
                    throw new Error('Estabelecimento fora do horário de funcionamento');
                }
            }
            return vendor;
        });
    }
    resolvePricing(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const vendorId = this.toObjectId(orderData.vendor, 'vendor');
            const customerId = this.toObjectId(orderData.customer, 'customer');
            const requestItems = orderData.items || [];
            if (!requestItems.length) {
                throw new Error('O pedido deve conter pelo menos um item');
            }
            const products = yield Product_1.default.find({
                _id: { $in: requestItems.map((item) => this.toObjectId(item.product, 'produto')) },
                vendor: vendorId,
                isAvailable: true
            }).exec();
            if (products.length !== requestItems.length) {
                throw new Error('Um ou mais produtos são inválidos, não pertencem ao estabelecimento ou estão indisponíveis');
            }
            const productById = new Map(products.map((product) => [String(product._id), product]));
            const resolvedItems = requestItems.map((item) => {
                const productId = this.toObjectId(item.product, 'produto').toString();
                const product = productById.get(productId);
                if (!product) {
                    throw new Error(`Produto ${productId} não encontrado para este estabelecimento`);
                }
                const quantity = Number(item.quantity);
                if (!Number.isFinite(quantity) || quantity <= 0) {
                    throw new Error(`Quantidade inválida para o produto ${product.name}`);
                }
                const unitPrice = Number(product.price.toFixed(2));
                const totalPrice = Number((unitPrice * quantity).toFixed(2));
                return {
                    product: product._id,
                    quantity,
                    unitPrice,
                    totalPrice,
                    specialInstructions: item.specialInstructions
                };
            });
            const subtotal = Number(resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
            const deliveryFee = orderData.deliveryType === 'pickup' ? 0 : this.getNumber(orderData.deliveryFee, 0);
            const tax = this.getNumber(orderData.tax, 0);
            const promotionPricing = yield promotion_service_1.promotionService.calculateOrderPromotions(vendorId.toString(), resolvedItems.map((item) => ({
                productId: item.product.toString(),
                unitPrice: item.unitPrice,
                quantity: item.quantity
            })), subtotal);
            const loyaltyDiscountAmount = yield loyalty_service_1.loyaltyService.getAutomaticDiscount(customerId.toString(), subtotal, vendorId.toString());
            const total = Number((subtotal + deliveryFee + tax).toFixed(2));
            const totalDiscountAmount = Number(Math.min(total, promotionPricing.totalDiscountAmount + loyaltyDiscountAmount).toFixed(2));
            const payableTotal = Number(Math.max(0, total - totalDiscountAmount).toFixed(2));
            return {
                items: resolvedItems,
                subtotal,
                deliveryFee,
                tax,
                total,
                promotionDiscountAmount: Number(promotionPricing.totalDiscountAmount.toFixed(2)),
                loyaltyDiscountAmount: Number(loyaltyDiscountAmount.toFixed(2)),
                totalDiscountAmount,
                payableTotal,
                appliedPromotionIds: promotionPricing.appliedPromotionIds.map((id) => new mongoose_1.Types.ObjectId(id)),
                pricingSnapshot: {
                    subtotalBeforeDiscounts: subtotal,
                    deliveryFeeBeforeDiscounts: deliveryFee,
                    taxBeforeDiscounts: tax
                },
                orderType: this.normalizeOrderType(orderData.orderType, (_a = products[0]) === null || _a === void 0 ? void 0 : _a.type)
            };
        });
    }
    notifyVendorNewOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const vendor = yield Vendor_1.Vendor.findById(order.vendor).exec();
                if (!(vendor === null || vendor === void 0 ? void 0 : vendor.owner)) {
                    return;
                }
                const customer = yield User_1.User.findById(order.customer).exec();
                const customerName = (customer === null || customer === void 0 ? void 0 : customer.userId) || 'Cliente';
                const orderId = ((_a = order._id) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                const message = `Novo pedido #${orderId.slice(-6)} recebido de ${customerName}. Total a pagar: ${((_b = order.payableTotal) !== null && _b !== void 0 ? _b : order.total).toFixed(2)} MT`;
                yield this.notificationService.createNotification(vendor.owner.toString(), 'order_status', message, {
                    orderId,
                    metadata: {
                        status: order.status,
                        payableTotal: (_c = order.payableTotal) !== null && _c !== void 0 ? _c : order.total
                    }
                });
            }
            catch (error) {
                console.error('❌ Erro ao notificar vendor:', error.message);
            }
        });
    }
    notifyOrderStatusChange(order, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const orderId = ((_a = order._id) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                const statusMessages = {
                    pending: 'Seu pedido foi criado e está aguardando confirmação.',
                    confirmed: 'Seu pedido foi confirmado e está sendo preparado.',
                    preparing: 'Seu pedido está em preparação.',
                    ready: 'Seu pedido está pronto.',
                    out_for_delivery: 'Seu pedido saiu para entrega.',
                    delivered: 'Seu pedido foi entregue com sucesso.',
                    cancelled: 'Seu pedido foi cancelado.'
                };
                if (order.customer) {
                    yield this.notificationService.createNotification(order.customer.toString(), 'order_status', statusMessages[newStatus], {
                        orderId,
                        metadata: {
                            status: newStatus
                        }
                    });
                }
                const vendor = yield Vendor_1.Vendor.findById(order.vendor).exec();
                if (vendor === null || vendor === void 0 ? void 0 : vendor.owner) {
                    yield this.notificationService.createNotification(vendor.owner.toString(), 'order_status', `Pedido #${orderId.slice(-6)} atualizado para ${newStatus}.`, {
                        orderId,
                        metadata: {
                            status: newStatus
                        }
                    });
                }
            }
            catch (error) {
                console.error('❌ Erro ao notificar mudança de status:', error.message);
            }
        });
    }
    notifyOrderCancellation(order, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const orderId = ((_a = order._id) === null || _a === void 0 ? void 0 : _a.toString()) || '';
                const reasonSuffix = reason ? ` Motivo: ${reason}` : '';
                if (order.customer) {
                    yield this.notificationService.createNotification(order.customer.toString(), 'order_status', `Seu pedido foi cancelado.${reasonSuffix}`, {
                        orderId,
                        metadata: {
                            status: 'cancelled',
                            reason
                        }
                    });
                }
                const vendor = yield Vendor_1.Vendor.findById(order.vendor).exec();
                if (vendor === null || vendor === void 0 ? void 0 : vendor.owner) {
                    yield this.notificationService.createNotification(vendor.owner.toString(), 'order_status', `Pedido #${orderId.slice(-6)} cancelado.${reasonSuffix}`, {
                        orderId,
                        metadata: {
                            status: 'cancelled',
                            reason
                        }
                    });
                }
            }
            catch (error) {
                console.error('❌ Erro ao notificar cancelamento:', error.message);
            }
        });
    }
    getValidNextStatuses(order) {
        const statusMap = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['preparing', 'ready', 'cancelled'],
            preparing: ['ready', 'cancelled'],
            ready: order.deliveryType === 'pickup' ? ['delivered', 'cancelled'] : ['out_for_delivery', 'cancelled'],
            out_for_delivery: ['delivered'],
            delivered: [],
            cancelled: []
        };
        return statusMap[order.status];
    }
    /**
     * Criar um novo pedido
     */
    createOrder(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!orderData.vendor || !orderData.customer || !orderData.paymentMethod || !orderData.deliveryAddress) {
                    throw new Error('customer, vendor, paymentMethod e deliveryAddress são obrigatórios');
                }
                yield this.ensureVendorCanReceiveOrders(this.toObjectId(orderData.vendor, 'vendor'));
                const resolvedPricing = yield this.resolvePricing(orderData);
                const order = new Order_1.Order(Object.assign(Object.assign({}, orderData), { customer: this.toObjectId(orderData.customer, 'customer'), vendor: this.toObjectId(orderData.vendor, 'vendor'), items: resolvedPricing.items, deliveryType: orderData.deliveryType || 'delivery', orderType: resolvedPricing.orderType, subtotal: resolvedPricing.subtotal, deliveryFee: resolvedPricing.deliveryFee, tax: resolvedPricing.tax, total: resolvedPricing.total, status: orderData.status || 'pending', paymentStatus: orderData.paymentStatus || 'pending', promotionDiscountAmount: resolvedPricing.promotionDiscountAmount, couponDiscountAmount: 0, loyaltyDiscountAmount: resolvedPricing.loyaltyDiscountAmount, totalDiscountAmount: resolvedPricing.totalDiscountAmount, payableTotal: resolvedPricing.payableTotal, appliedPromotionIds: resolvedPricing.appliedPromotionIds, pricingSnapshot: resolvedPricing.pricingSnapshot }));
                const savedOrder = yield order.save();
                yield this.notifyVendorNewOrder(savedOrder);
                return savedOrder;
            }
            catch (error) {
                throw error;
            }
        });
    }
    /**
     * Buscar pedido por ID
     */
    getOrderById(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Order_1.Order.findById(orderId)
                .populate('customer', 'userId email phoneNumber')
                .populate('vendor', 'name type address')
                .populate('items.product', 'name price images category')
                .exec();
        });
    }
    /**
     * Listar todos os pedidos com filtros e paginação
     */
    getAllOrders() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 10, filters = {}) {
            const skip = (page - 1) * limit;
            const query = {};
            if (filters.customer)
                query.customer = new mongoose_1.Types.ObjectId(filters.customer);
            if (filters.vendor)
                query.vendor = new mongoose_1.Types.ObjectId(filters.vendor);
            if (filters.status)
                query.status = filters.status;
            if (filters.paymentStatus)
                query.paymentStatus = filters.paymentStatus;
            if (filters.orderType)
                query.orderType = filters.orderType;
            if (filters.deliveryType)
                query.deliveryType = filters.deliveryType;
            if (filters.startDate || filters.endDate) {
                query.createdAt = {};
                if (filters.startDate)
                    query.createdAt.$gte = filters.startDate;
                if (filters.endDate)
                    query.createdAt.$lte = filters.endDate;
            }
            const [orders, total] = yield Promise.all([
                Order_1.Order.find(query)
                    .populate('customer', 'userId email phoneNumber')
                    .populate('vendor', 'name type address')
                    .populate('items.product', 'name price images category')
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 })
                    .exec(),
                Order_1.Order.countDocuments(query)
            ]);
            return {
                orders,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    /**
     * Buscar pedidos por cliente
     */
    getOrdersByCustomer(customerId_1) {
        return __awaiter(this, arguments, void 0, function* (customerId, page = 1, limit = 10) {
            const skip = (page - 1) * limit;
            const query = { customer: new mongoose_1.Types.ObjectId(customerId) };
            const [orders, total] = yield Promise.all([
                Order_1.Order.find(query)
                    .populate('vendor', 'name type address')
                    .populate('items.product', 'name price images category')
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 })
                    .exec(),
                Order_1.Order.countDocuments(query)
            ]);
            return {
                orders,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    /**
     * Buscar pedidos por vendor
     */
    getOrdersByVendor(vendorId_1) {
        return __awaiter(this, arguments, void 0, function* (vendorId, page = 1, limit = 10, status) {
            const skip = (page - 1) * limit;
            const query = { vendor: new mongoose_1.Types.ObjectId(vendorId) };
            if (status)
                query.status = status;
            const [orders, total] = yield Promise.all([
                Order_1.Order.find(query)
                    .populate('customer', 'userId email phoneNumber')
                    .populate('items.product', 'name price images category')
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 })
                    .exec(),
                Order_1.Order.countDocuments(query)
            ]);
            return {
                orders,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    /**
     * Buscar pedidos por status
     */
    getOrdersByStatus(status) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Order_1.Order.find({ status })
                .populate('customer', 'userId email phoneNumber')
                .populate('vendor', 'name type address')
                .populate('items.product', 'name price images category')
                .sort({ createdAt: -1 })
                .exec();
        });
    }
    /**
     * Atualizar status do pedido
     */
    updateOrderStatus(orderId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const order = yield Order_1.Order.findById(orderId).exec();
            if (!order) {
                return null;
            }
            if (status === 'cancelled') {
                return yield this.cancelOrder(orderId);
            }
            const validNextStatuses = this.getValidNextStatuses(order);
            if (!validNextStatuses.includes(status)) {
                throw new Error(`Transição de status inválida: ${order.status} -> ${status}`);
            }
            if (['ready', 'out_for_delivery', 'delivered'].includes(status) &&
                order.paymentMethod !== 'cash' &&
                order.paymentStatus !== 'paid') {
                throw new Error('O pedido precisa estar pago antes de avançar para este status');
            }
            order.status = status;
            if (status === 'delivered') {
                order.actualDeliveryTime = new Date();
                if (order.paymentMethod === 'cash' && order.paymentStatus === 'pending') {
                    order.paymentStatus = 'paid';
                }
            }
            const updatedOrder = yield order.save();
            if (status === 'delivered') {
                try {
                    yield loyalty_service_1.loyaltyService.earnPoints({
                        userId: order.customer.toString(),
                        orderId: order._id.toString(),
                        orderTotal: (_a = order.payableTotal) !== null && _a !== void 0 ? _a : order.total,
                        vendorId: order.vendor.toString()
                    });
                }
                catch (error) {
                    console.warn(`⚠️ Não foi possível creditar pontos do pedido ${order._id}: ${error.message}`);
                }
            }
            yield this.notifyOrderStatusChange(updatedOrder, status);
            return yield this.getOrderById(orderId);
        });
    }
    /**
     * Atualizar status de pagamento
     */
    updatePaymentStatus(orderId, paymentStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const order = yield Order_1.Order.findById(orderId).exec();
            if (!order) {
                return null;
            }
            order.paymentStatus = paymentStatus;
            if (paymentStatus === 'paid' && order.status === 'pending') {
                order.status = 'confirmed';
            }
            if (paymentStatus === 'refunded' && order.status !== 'cancelled') {
                order.status = 'cancelled';
                order.cancelledAt = order.cancelledAt || new Date();
            }
            const updatedOrder = yield order.save();
            yield this.notificationService.createNotification(order.customer.toString(), 'payment_update', `Pagamento do pedido #${order._id.toString().slice(-6)} atualizado para ${paymentStatus}.`, {
                orderId,
                metadata: {
                    paymentStatus,
                    payableTotal: (_a = order.payableTotal) !== null && _a !== void 0 ? _a : order.total
                }
            });
            return updatedOrder;
        });
    }
    applyCouponToOrder(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { orderId, couponId, couponCode, discountAmount } = params;
            const order = yield Order_1.Order.findById(orderId).exec();
            if (!order) {
                return null;
            }
            order.coupon = new mongoose_1.Types.ObjectId(couponId);
            order.couponCode = couponCode.trim().toUpperCase();
            order.couponDiscountAmount = Number(Math.max(0, discountAmount).toFixed(2));
            order.totalDiscountAmount = Number(((order.promotionDiscountAmount || 0) +
                (order.loyaltyDiscountAmount || 0) +
                order.couponDiscountAmount).toFixed(2));
            order.payableTotal = Number(Math.max(0, order.total - order.totalDiscountAmount).toFixed(2));
            return yield order.save();
        });
    }
    /**
     * Cancelar pedido
     */
    cancelOrder(orderId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId).exec();
            if (!order) {
                return null;
            }
            if (order.status === 'delivered') {
                throw new Error('Não é possível cancelar um pedido já entregue');
            }
            let nextPaymentStatus = order.paymentStatus;
            if (order.paymentStatus === 'paid') {
                const refund = yield this.paymentService.refundPayment(orderId, reason);
                nextPaymentStatus = refund ? 'refunded' : 'paid';
            }
            order.status = 'cancelled';
            order.paymentStatus = nextPaymentStatus;
            order.cancelledAt = new Date();
            order.refundReason = reason;
            if (reason) {
                order.notes = order.notes ? `${order.notes}\nCancelamento: ${reason}` : `Cancelamento: ${reason}`;
            }
            const cancelledOrder = yield order.save();
            yield this.notifyOrderCancellation(cancelledOrder, reason);
            return yield this.getOrderById(orderId);
        });
    }
    /**
     * Atualizar tempo estimado de entrega
     */
    updateEstimatedDeliveryTime(orderId, estimatedDeliveryTime) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Order_1.Order.findByIdAndUpdate(orderId, { $set: { estimatedDeliveryTime } }, { new: true })
                .populate('customer', 'userId email phoneNumber')
                .populate('vendor', 'name type address')
                .populate('items.product', 'name price images category');
        });
    }
    /**
     * Adicionar notas ao pedido
     */
    addOrderNotes(orderId, notes) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Order_1.Order.findByIdAndUpdate(orderId, { $set: { notes } }, { new: true })
                .populate('customer', 'userId email phoneNumber')
                .populate('vendor', 'name type address')
                .populate('items.product', 'name price images category');
        });
    }
    /**
     * Atualizar endereço de entrega
     */
    updateDeliveryAddress(orderId, deliveryAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId).exec();
            if (!order) {
                return null;
            }
            if (!['pending', 'confirmed'].includes(order.status)) {
                throw new Error('O endereço só pode ser alterado antes do preparo do pedido');
            }
            order.deliveryAddress = deliveryAddress;
            return yield order.save();
        });
    }
    /**
     * Calcular estatísticas de pedidos
     */
    getOrderStatistics(vendorId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const matchQuery = {};
            if (vendorId)
                matchQuery.vendor = new mongoose_1.Types.ObjectId(vendorId);
            if (startDate || endDate) {
                matchQuery.createdAt = {};
                if (startDate)
                    matchQuery.createdAt.$gte = startDate;
                if (endDate)
                    matchQuery.createdAt.$lte = endDate;
            }
            const [totalStats, statusStats, typeStats] = yield Promise.all([
                Order_1.Order.aggregate([
                    { $match: matchQuery },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            totalRevenue: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $eq: ['$paymentStatus', 'paid'] },
                                                { $ne: ['$status', 'cancelled'] }
                                            ]
                                        },
                                        { $ifNull: ['$payableTotal', '$total'] },
                                        0
                                    ]
                                }
                            },
                            completedOrders: {
                                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                            },
                            cancelledOrders: {
                                $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                            }
                        }
                    }
                ]),
                Order_1.Order.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ]),
                Order_1.Order.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: '$orderType', count: { $sum: 1 } } }
                ])
            ]);
            const stats = totalStats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                completedOrders: 0,
                cancelledOrders: 0
            };
            const ordersByStatus = {};
            statusStats.forEach((stat) => {
                ordersByStatus[stat._id] = stat.count;
            });
            const ordersByType = {};
            typeStats.forEach((stat) => {
                ordersByType[stat._id] = stat.count;
            });
            return Object.assign(Object.assign({}, stats), { averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0, ordersByStatus,
                ordersByType });
        });
    }
}
exports.OrderService = OrderService;
