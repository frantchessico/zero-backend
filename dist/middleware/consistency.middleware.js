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
exports.validateStatusConsistency = exports.syncDeliveryOrderStatus = exports.syncOrderDeliveryStatus = void 0;
const Order_1 = require("../models/Order");
const Delivery_1 = require("../models/Delivery");
const logger_1 = require("../utils/logger");
/**
 * Middleware para sincronizar status do Order com Delivery
 */
const syncOrderDeliveryStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        // Mapeamento de status entre Order e Delivery
        const statusMapping = {
            'pending': 'pending',
            'confirmed': 'pending',
            'preparing': 'pending',
            'ready': 'picked_up',
            'out_for_delivery': 'in_transit',
            'delivered': 'delivered',
            'cancelled': 'failed'
        };
        // Se estamos atualizando um Order
        if (orderId && status && statusMapping[status]) {
            const deliveryStatus = statusMapping[status];
            // Atualizar Delivery status automaticamente
            yield Delivery_1.Delivery.findOneAndUpdate({ order: orderId }, Object.assign(Object.assign({ status: deliveryStatus }, (deliveryStatus === 'delivered' && { actualDeliveryTime: new Date() })), (deliveryStatus === 'picked_up' && { estimatedTime: new Date(Date.now() + 30 * 60 * 1000) }) // +30 min
            ), { new: true });
            logger_1.logger.info(`Order ${orderId} status synced to delivery: ${status} → ${deliveryStatus}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error syncing order-delivery status:', error);
        next(error);
    }
});
exports.syncOrderDeliveryStatus = syncOrderDeliveryStatus;
/**
 * Middleware para sincronizar status do Delivery com Order
 */
const syncDeliveryOrderStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deliveryId } = req.params;
        const { status } = req.body;
        // Mapeamento reverso de status entre Delivery e Order
        const statusMapping = {
            'picked_up': 'ready',
            'in_transit': 'out_for_delivery',
            'delivered': 'delivered',
            'failed': 'cancelled'
        };
        // Se estamos atualizando um Delivery
        if (deliveryId && status && statusMapping[status]) {
            const orderStatus = statusMapping[status];
            // Buscar o delivery para obter o orderId
            const delivery = yield Delivery_1.Delivery.findById(deliveryId);
            if (delivery) {
                // Atualizar Order status automaticamente
                yield Order_1.Order.findByIdAndUpdate(delivery.order, Object.assign({ status: orderStatus }, (orderStatus === 'delivered' && { actualDeliveryTime: new Date() })), { new: true });
                logger_1.logger.info(`Delivery ${deliveryId} status synced to order: ${status} → ${orderStatus}`);
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error syncing delivery-order status:', error);
        next(error);
    }
});
exports.syncDeliveryOrderStatus = syncDeliveryOrderStatus;
/**
 * Middleware para validar consistência de status
 */
const validateStatusConsistency = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (orderId) {
            const order = yield Order_1.Order.findById(orderId);
            const delivery = yield Delivery_1.Delivery.findOne({ order: orderId });
            if (order && delivery) {
                // Validar se os status estão consistentes
                const validCombinations = [
                    { order: 'pending', delivery: 'pending' },
                    { order: 'confirmed', delivery: 'pending' },
                    { order: 'preparing', delivery: 'pending' },
                    { order: 'ready', delivery: 'picked_up' },
                    { order: 'out_for_delivery', delivery: 'in_transit' },
                    { order: 'delivered', delivery: 'delivered' },
                    { order: 'cancelled', delivery: 'failed' }
                ];
                const isValid = validCombinations.some(combo => combo.order === order.status && combo.delivery === delivery.status);
                if (!isValid) {
                    logger_1.logger.warn(`Status inconsistency detected: Order ${order.status}, Delivery ${delivery.status}`);
                    return res.status(400).json({
                        success: false,
                        message: 'Status inconsistency detected between order and delivery'
                    });
                }
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating status consistency:', error);
        next(error);
    }
});
exports.validateStatusConsistency = validateStatusConsistency;
