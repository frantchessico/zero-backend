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
exports.NotificationService = void 0;
const Notification_1 = require("../../models/Notification");
const Driver_1 = require("../../models/Driver");
const Order_1 = require("../../models/Order");
const User_1 = require("../../models/User");
const mongoose_1 = require("mongoose");
class NotificationService {
    calculateDistanceInKm(lat1, lon1, lat2, lon2) {
        const earthRadius = 6371;
        const deltaLatitude = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLongitude = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(deltaLongitude / 2) *
                Math.sin(deltaLongitude / 2);
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    /**
     * Criar uma nova notificação
     */
    createNotification(userId, type, message, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const notification = new Notification_1.Notification(Object.assign(Object.assign(Object.assign(Object.assign({ user: new mongoose_1.Types.ObjectId(userId), type,
                    message }, ((options === null || options === void 0 ? void 0 : options.orderId) && { order: new mongoose_1.Types.ObjectId(options.orderId) })), ((options === null || options === void 0 ? void 0 : options.deliveryId) && { delivery: new mongoose_1.Types.ObjectId(options.deliveryId) })), ((options === null || options === void 0 ? void 0 : options.personalDeliveryId) && { personalDelivery: new mongoose_1.Types.ObjectId(options.personalDeliveryId) })), ((options === null || options === void 0 ? void 0 : options.metadata) && { metadata: options.metadata })));
                const saved = yield notification.save();
                // Converter para nossa interface
                return {
                    _id: saved._id.toString(),
                    user: saved.user.toString(),
                    type: saved.type,
                    message: saved.message,
                    order: (_a = saved.order) === null || _a === void 0 ? void 0 : _a.toString(),
                    delivery: (_b = saved.delivery) === null || _b === void 0 ? void 0 : _b.toString(),
                    personalDelivery: (_c = saved.personalDelivery) === null || _c === void 0 ? void 0 : _c.toString(),
                    metadata: saved.metadata,
                    read: saved.read,
                    sentAt: saved.sentAt
                };
            }
            catch (error) {
                throw error;
            }
        });
    }
    /**
     * Notificar vendor sobre novo pedido
     */
    notifyVendorNewOrder(vendorId, orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const order = yield Order_1.Order.findById(orderId)
                    .populate('customer', 'userId')
                    .populate('vendor', 'name owner')
                    .exec();
                if (!order)
                    throw new Error('Pedido não encontrado');
                const customer = order.customer;
                const vendorOwnerId = typeof vendorId === 'string' ? vendorId : (_b = (_a = vendorId === null || vendorId === void 0 ? void 0 : vendorId._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a);
                const message = `Novo pedido #${orderId.slice(-6)} recebido de ${(customer === null || customer === void 0 ? void 0 : customer.userId) || 'Cliente'}. Total: ${order.total.toFixed(2)} MT`;
                yield this.createNotification(vendorOwnerId || String(((_c = order.vendor) === null || _c === void 0 ? void 0 : _c.owner) || ''), 'order_status', message, {
                    orderId,
                    metadata: {
                        status: order.status
                    }
                });
                // Aqui você pode integrar com push notifications, SMS, email, etc.
                console.log(`Notificação enviada para vendor ${vendorId}: ${message}`);
            }
            catch (error) {
                console.error('Erro ao notificar vendor:', error);
                throw error;
            }
        });
    }
    /**
     * Notificar drivers disponíveis sobre pedido pronto para entrega
     */
    notifyDriversOrderReady(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield Order_1.Order.findById(orderId)
                    .populate('vendor', 'name address')
                    .populate('customer', 'userId')
                    .exec();
                if (!order)
                    throw new Error('Pedido não encontrado');
                // Buscar drivers disponíveis na área
                const availableDrivers = yield Driver_1.Driver.find({
                    isAvailable: true,
                    isActive: true,
                    isVerified: true,
                    deliveryAreas: { $in: [order.deliveryAddress.neighborhood, order.deliveryAddress.city] }
                }).exec();
                const message = `Novo pedido disponível para entrega! De: ${order.vendor.name} Para: ${order.deliveryAddress.neighborhood}. Valor: ${order.total.toFixed(2)} MT`;
                // Enviar notificação para todos os drivers disponíveis
                const notifications = availableDrivers.map(driver => this.createNotification(driver.userId.toString(), 'delivery_update', message, {
                    orderId,
                    metadata: {
                        status: order.status
                    }
                }));
                yield Promise.all(notifications);
                console.log(`Notificação enviada para ${availableDrivers.length} drivers sobre pedido #${orderId.slice(-6)}`);
            }
            catch (error) {
                console.error('Erro ao notificar drivers:', error);
                throw error;
            }
        });
    }
    /**
     * Notificar driver específico sobre atribuição de entrega
     */
    notifyDriverAssigned(driverId, orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield Order_1.Order.findById(orderId)
                    .populate('vendor', 'name address')
                    .populate('customer', 'userId phoneNumber')
                    .exec();
                if (!order)
                    throw new Error('Pedido não encontrado');
                const message = `Entrega atribuída! Retirar em: ${order.vendor.name} (${order.vendor.address.streetName}). Entregar em: ${order.deliveryAddress.streetName}, ${order.deliveryAddress.neighborhood}`;
                yield this.createNotification(driverId, 'delivery_update', message, {
                    orderId,
                    metadata: {
                        status: order.status
                    }
                });
                console.log(`Driver ${driverId} notificado sobre atribuição do pedido #${orderId.slice(-6)}`);
            }
            catch (error) {
                console.error('Erro ao notificar driver sobre atribuição:', error);
                throw error;
            }
        });
    }
    /**
     * Notificar cliente sobre mudança de status do pedido
     */
    notifyCustomerOrderStatus(customerId, orderId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const statusMessages = {
                    confirmed: 'Seu pedido foi confirmado e está sendo preparado',
                    preparing: 'Seu pedido está sendo preparado',
                    ready: 'Seu pedido está pronto e aguardando entrega',
                    out_for_delivery: 'Seu pedido saiu para entrega',
                    delivered: 'Seu pedido foi entregue com sucesso',
                    cancelled: 'Seu pedido foi cancelado'
                };
                const message = `Pedido #${orderId.slice(-6)}: ${statusMessages[status] || 'Status atualizado'}`;
                yield this.createNotification(customerId, 'order_status', message, {
                    orderId,
                    metadata: {
                        status
                    }
                });
                console.log(`Cliente ${customerId} notificado sobre mudança de status: ${status}`);
            }
            catch (error) {
                console.error('Erro ao notificar cliente:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar notificações de um usuário
     */
    getUserNotifications(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20, unreadOnly = false) {
            const skip = (page - 1) * limit;
            const query = { user: new mongoose_1.Types.ObjectId(userId) };
            if (unreadOnly)
                query.read = false;
            const [notificationDocs, total, unreadCount] = yield Promise.all([
                Notification_1.Notification.find(query)
                    .skip(skip)
                    .limit(limit)
                    .sort({ sentAt: -1 })
                    .exec(),
                Notification_1.Notification.countDocuments(query),
                Notification_1.Notification.countDocuments({ user: new mongoose_1.Types.ObjectId(userId), read: false })
            ]);
            // Converter documentos do Mongoose para nossa interface
            const notifications = notificationDocs.map(doc => {
                var _a, _b, _c;
                return ({
                    _id: doc._id.toString(),
                    user: doc.user.toString(),
                    type: doc.type,
                    message: doc.message,
                    order: (_a = doc.order) === null || _a === void 0 ? void 0 : _a.toString(),
                    delivery: (_b = doc.delivery) === null || _b === void 0 ? void 0 : _b.toString(),
                    personalDelivery: (_c = doc.personalDelivery) === null || _c === void 0 ? void 0 : _c.toString(),
                    metadata: doc.metadata,
                    read: doc.read,
                    sentAt: doc.sentAt
                });
            });
            return {
                notifications,
                total,
                unreadCount,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    /**
     * Marcar notificação como lida
     */
    markAsRead(notificationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const doc = yield Notification_1.Notification.findByIdAndUpdate(notificationId, { $set: { read: true } }, { new: true }).exec();
            if (!doc)
                return null;
            // Converter para nossa interface
            return {
                _id: doc._id.toString(),
                user: doc.user.toString(),
                type: doc.type,
                message: doc.message,
                order: (_a = doc.order) === null || _a === void 0 ? void 0 : _a.toString(),
                delivery: (_b = doc.delivery) === null || _b === void 0 ? void 0 : _b.toString(),
                personalDelivery: (_c = doc.personalDelivery) === null || _c === void 0 ? void 0 : _c.toString(),
                metadata: doc.metadata,
                read: doc.read,
                sentAt: doc.sentAt
            };
        });
    }
    /**
     * Marcar todas as notificações de um usuário como lidas
     */
    markAllAsRead(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Notification_1.Notification.updateMany({ user: new mongoose_1.Types.ObjectId(userId), read: false }, { $set: { read: true } });
            return result.modifiedCount;
        });
    }
    /**
     * Deletar notificação
     */
    deleteNotification(notificationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Notification_1.Notification.findByIdAndDelete(notificationId);
            return !!result;
        });
    }
    getOrderNotifications(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const docs = yield Notification_1.Notification.find({ order: new mongoose_1.Types.ObjectId(orderId) })
                .sort({ sentAt: -1 })
                .exec();
            return docs.map((doc) => {
                var _a, _b, _c;
                return ({
                    _id: doc._id.toString(),
                    user: doc.user.toString(),
                    type: doc.type,
                    message: doc.message,
                    order: (_a = doc.order) === null || _a === void 0 ? void 0 : _a.toString(),
                    delivery: (_b = doc.delivery) === null || _b === void 0 ? void 0 : _b.toString(),
                    personalDelivery: (_c = doc.personalDelivery) === null || _c === void 0 ? void 0 : _c.toString(),
                    metadata: doc.metadata,
                    read: doc.read,
                    sentAt: doc.sentAt
                });
            });
        });
    }
    /**
     * Deletar notificações antigas (mais de 30 dias)
     */
    deleteOldNotifications() {
        return __awaiter(this, void 0, void 0, function* () {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const result = yield Notification_1.Notification.deleteMany({
                sentAt: { $lt: thirtyDaysAgo }
            });
            return result.deletedCount;
        });
    }
    /**
     * Obter estatísticas de notificações
     */
    getNotificationStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            const [totalCount, unreadCount, typeStats, recentCount] = yield Promise.all([
                Notification_1.Notification.countDocuments({ user: new mongoose_1.Types.ObjectId(userId) }),
                Notification_1.Notification.countDocuments({ user: new mongoose_1.Types.ObjectId(userId), read: false }),
                Notification_1.Notification.aggregate([
                    { $match: { user: new mongoose_1.Types.ObjectId(userId) } },
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ]),
                Notification_1.Notification.countDocuments({
                    user: new mongoose_1.Types.ObjectId(userId),
                    sentAt: { $gte: twentyFourHoursAgo }
                })
            ]);
            const byType = {};
            typeStats.forEach(stat => {
                byType[stat._id] = stat.count;
            });
            return {
                total: totalCount,
                unread: unreadCount,
                byType,
                recent: recentCount
            };
        });
    }
    /**
     * Buscar drivers próximos para notificação
     */
    findNearbyDrivers(latitude_1, longitude_1) {
        return __awaiter(this, arguments, void 0, function* (latitude, longitude, radiusInKm = 10) {
            const drivers = yield Driver_1.Driver.find({
                isAvailable: true,
                isVerified: true
            }).limit(50).exec();
            return drivers
                .filter((driver) => {
                if (!driver.currentLocation) {
                    return false;
                }
                const distance = this.calculateDistanceInKm(latitude, longitude, driver.currentLocation.latitude, driver.currentLocation.longitude);
                return distance <= radiusInKm;
            })
                .slice(0, 10);
        });
    }
    /**
     * Notificar drivers próximos sobre pedido disponível
     */
    notifyNearbyDrivers(latitude_1, longitude_1, orderId_1) {
        return __awaiter(this, arguments, void 0, function* (latitude, longitude, orderId, radiusInKm = 10) {
            try {
                const nearbyDrivers = yield this.findNearbyDrivers(latitude, longitude, radiusInKm);
                if (nearbyDrivers.length === 0) {
                    console.log('Nenhum driver disponível encontrado na área');
                    return;
                }
                const order = yield Order_1.Order.findById(orderId)
                    .populate('vendor', 'name')
                    .exec();
                if (!order)
                    throw new Error('Pedido não encontrado');
                const message = `Novo pedido próximo a você! De: ${order.vendor.name}. Distância estimada: ${radiusInKm}km. Valor: ${order.total.toFixed(2)} MT`;
                const notifications = nearbyDrivers.map((driver) => this.createNotification(driver.userId.toString(), 'delivery_update', message, {
                    orderId,
                    metadata: {
                        radiusInKm
                    }
                }));
                yield Promise.all(notifications);
                console.log(`${nearbyDrivers.length} drivers próximos notificados sobre pedido #${orderId.slice(-6)}`);
            }
            catch (error) {
                console.error('Erro ao notificar drivers próximos:', error);
                throw error;
            }
        });
    }
    /**
     * Enviar notificação promocional
     */
    sendPromotionalNotification(userIds, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const notifications = userIds.map(userId => this.createNotification(userId, 'promotion', message));
                yield Promise.all(notifications);
                return userIds.length;
            }
            catch (error) {
                console.error('Erro ao enviar notificações promocionais:', error);
                throw error;
            }
        });
    }
    /**
     * Notificar clientes sobre novo cupom disponível
     */
    notifyCustomersAboutCoupon(couponCode, vendorName, discountInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar todos os clientes ativos
                const customers = yield User_1.User.find({
                    role: 'customer',
                    isActive: true
                }).exec();
                if (customers.length === 0) {
                    console.log('Nenhum cliente encontrado para notificar sobre cupom');
                    return 0;
                }
                const vendorText = vendorName ? ` da ${vendorName}` : '';
                const discountText = discountInfo || '';
                const message = `🎉 Novo cupom disponível${vendorText}! Use o código ${couponCode}${discountText ? ` e ganhe ${discountText}` : ''}`;
                const notifications = customers.map(customer => this.createNotification(customer._id.toString(), 'promotion', message));
                yield Promise.all(notifications);
                console.log(`Notificação de cupom enviada para ${customers.length} clientes`);
                return customers.length;
            }
            catch (error) {
                console.error('Erro ao notificar clientes sobre cupom:', error);
                throw error;
            }
        });
    }
    /**
     * Notificar clientes sobre nova promoção disponível
     */
    notifyCustomersAboutPromotion(promotionTitle, vendorName, description) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar todos os clientes ativos
                const customers = yield User_1.User.find({
                    role: 'customer',
                    isActive: true
                }).exec();
                if (customers.length === 0) {
                    console.log('Nenhum cliente encontrado para notificar sobre promoção');
                    return 0;
                }
                const vendorText = vendorName ? ` da ${vendorName}` : '';
                const descText = description ? `: ${description}` : '';
                const message = `🎊 Nova promoção${vendorText}! ${promotionTitle}${descText}`;
                const notifications = customers.map(customer => this.createNotification(customer._id.toString(), 'promotion', message));
                yield Promise.all(notifications);
                console.log(`Notificação de promoção enviada para ${customers.length} clientes`);
                return customers.length;
            }
            catch (error) {
                console.error('Erro ao notificar clientes sobre promoção:', error);
                throw error;
            }
        });
    }
    /**
     * Notificar todos os usuários ativos (clientes, drivers, etc) sobre cupom ou promoção
     */
    notifyAllActiveUsers(message, excludeRoles) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = {
                    isActive: true
                };
                if (excludeRoles && excludeRoles.length > 0) {
                    query.role = { $nin: excludeRoles };
                }
                const users = yield User_1.User.find(query).exec();
                if (users.length === 0) {
                    console.log('Nenhum usuário ativo encontrado para notificar');
                    return 0;
                }
                const notifications = users.map(user => this.createNotification(user._id.toString(), 'promotion', message));
                yield Promise.all(notifications);
                console.log(`Notificação enviada para ${users.length} usuários ativos`);
                return users.length;
            }
            catch (error) {
                console.error('Erro ao notificar todos os usuários:', error);
                throw error;
            }
        });
    }
}
exports.NotificationService = NotificationService;
