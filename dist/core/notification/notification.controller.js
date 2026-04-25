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
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
const User_1 = require("../../models/User");
const logger_1 = require("../../utils/logger");
class NotificationController {
    constructor() {
        /**
         * GET /notifications/my-notifications - Buscar notificações do usuário autenticado
         */
        this.getMyNotifications = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const { page = 1, limit = 10, unreadOnly = false } = req.query;
                const notifications = yield this.notificationService.getUserNotifications(user._id.toString(), parseInt(page), parseInt(limit), unreadOnly === 'true');
                res.status(200).json({
                    success: true,
                    data: notifications.notifications,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: notifications.totalPages,
                        totalItems: notifications.total,
                        itemsPerPage: parseInt(limit)
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching my notifications:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar notificações'
                });
            }
        });
        /**
         * PATCH /notifications/my-notifications/:id/read - Marcar notificação como lida
         */
        this.markMyNotificationAsRead = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const { id } = req.params;
                const notification = yield this.notificationService.markAsRead(id);
                if (!notification) {
                    res.status(404).json({
                        success: false,
                        message: 'Notificação não encontrada'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Notificação marcada como lida',
                    data: notification
                });
            }
            catch (error) {
                logger_1.logger.error('Error marking notification as read:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao marcar notificação como lida'
                });
            }
        });
        /**
         * PATCH /notifications/my-notifications/mark-all-read - Marcar todas como lidas
         */
        this.markAllMyNotificationsAsRead = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const result = yield this.notificationService.markAllAsRead(user._id.toString());
                res.status(200).json({
                    success: true,
                    message: 'Todas as notificações marcadas como lidas',
                    data: {
                        updatedCount: result
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error marking all notifications as read:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao marcar notificações como lidas'
                });
            }
        });
        // POST /notifications/vendor/new-order - Notificar vendor sobre novo pedido
        this.notifyVendorNewOrder = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId, orderId } = req.body;
                if (!vendorId || !orderId) {
                    return res.status(400).json({
                        success: false,
                        message: 'VendorId e orderId são obrigatórios'
                    });
                }
                yield this.notificationService.notifyVendorNewOrder(vendorId, orderId);
                res.status(200).json({
                    success: true,
                    message: 'Vendor notificado sobre novo pedido'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // POST /notifications/drivers/order-ready - Notificar drivers sobre pedido pronto
        this.notifyDriversOrderReady = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.body;
                if (!orderId) {
                    return res.status(400).json({
                        success: false,
                        message: 'OrderId é obrigatório'
                    });
                }
                yield this.notificationService.notifyDriversOrderReady(orderId);
                res.status(200).json({
                    success: true,
                    message: 'Drivers notificados sobre pedido pronto'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // POST /notifications/driver/assigned - Notificar driver sobre atribuição
        this.notifyDriverAssigned = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { driverId, orderId } = req.body;
                if (!driverId || !orderId) {
                    return res.status(400).json({
                        success: false,
                        message: 'DriverId e orderId são obrigatórios'
                    });
                }
                yield this.notificationService.notifyDriverAssigned(driverId, orderId);
                res.status(200).json({
                    success: true,
                    message: 'Driver notificado sobre atribuição de entrega'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // POST /notifications/customer/order-status - Notificar cliente sobre status
        this.notifyCustomerOrderStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId, orderId, status } = req.body;
                if (!customerId || !orderId || !status) {
                    return res.status(400).json({
                        success: false,
                        message: 'CustomerId, orderId e status são obrigatórios'
                    });
                }
                const validStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Status inválido'
                    });
                }
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, status);
                res.status(200).json({
                    success: true,
                    message: 'Cliente notificado sobre mudança de status'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // POST /notifications/drivers/nearby - Notificar drivers próximos
        this.notifyNearbyDrivers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { latitude, longitude, orderId, radiusInKm = 10 } = req.body;
                if (!latitude || !longitude || !orderId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Latitude, longitude e orderId são obrigatórios'
                    });
                }
                yield this.notificationService.notifyNearbyDrivers(latitude, longitude, orderId, radiusInKm);
                res.status(200).json({
                    success: true,
                    message: 'Drivers próximos notificados'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // POST /notifications/promotional - Enviar notificação promocional
        this.sendPromotionalNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userIds, message } = req.body;
                if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !message) {
                    return res.status(400).json({
                        success: false,
                        message: 'UserIds (array) e message são obrigatórios'
                    });
                }
                const count = yield this.notificationService.sendPromotionalNotification(userIds, message);
                res.status(200).json({
                    success: true,
                    message: `Notificação promocional enviada para ${count} usuários`,
                    data: { sentCount: count }
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // GET /notifications/user/:userId - Buscar notificações do usuário
        this.getUserNotifications = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const unreadOnly = req.query.unreadOnly === 'true';
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: 'UserId é obrigatório'
                    });
                }
                const result = yield this.notificationService.getUserNotifications(userId, page, limit, unreadOnly);
                res.status(200).json({
                    success: true,
                    message: 'Notificações encontradas',
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // GET /notifications/stats/:userId - Obter estatísticas de notificações
        this.getNotificationStats = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: 'UserId é obrigatório'
                    });
                }
                const stats = yield this.notificationService.getNotificationStats(userId);
                res.status(200).json({
                    success: true,
                    message: 'Estatísticas de notificações',
                    data: stats
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // PATCH /notifications/:id/read - Marcar notificação como lida
        this.markAsRead = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID da notificação é obrigatório'
                    });
                }
                const notification = yield this.notificationService.markAsRead(id);
                if (!notification) {
                    return res.status(404).json({
                        success: false,
                        message: 'Notificação não encontrada'
                    });
                }
                res.status(200).json({
                    success: true,
                    message: 'Notificação marcada como lida',
                    data: notification
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // PATCH /notifications/user/:userId/read-all - Marcar todas como lidas
        this.markAllAsRead = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        message: 'UserId é obrigatório'
                    });
                }
                const modifiedCount = yield this.notificationService.markAllAsRead(userId);
                res.status(200).json({
                    success: true,
                    message: `${modifiedCount} notificações marcadas como lidas`,
                    data: { modifiedCount }
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // DELETE /notifications/:id - Deletar notificação
        this.deleteNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID da notificação é obrigatório'
                    });
                }
                const deleted = yield this.notificationService.deleteNotification(id);
                if (!deleted) {
                    return res.status(404).json({
                        success: false,
                        message: 'Notificação não encontrada'
                    });
                }
                res.status(200).json({
                    success: true,
                    message: 'Notificação deletada com sucesso'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // DELETE /notifications/old - Deletar notificações antigas
        this.deleteOldNotifications = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedCount = yield this.notificationService.deleteOldNotifications();
                res.status(200).json({
                    success: true,
                    message: `${deletedCount} notificações antigas foram deletadas`,
                    data: { deletedCount }
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // GET /notifications/drivers/nearby - Buscar drivers próximos
        this.findNearbyDrivers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { latitude, longitude, radiusInKm = 10 } = req.query;
                if (!latitude || !longitude) {
                    return res.status(400).json({
                        success: false,
                        message: 'Latitude e longitude são obrigatórios'
                    });
                }
                const drivers = yield this.notificationService.findNearbyDrivers(parseFloat(latitude), parseFloat(longitude), parseInt(radiusInKm));
                res.status(200).json({
                    success: true,
                    message: `${drivers.length} drivers encontrados na área`,
                    data: drivers
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        // POST /notifications/create - Criar notificação manual
        this.createNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, type, message } = req.body;
                if (!userId || !type || !message) {
                    return res.status(400).json({
                        success: false,
                        message: 'UserId, type e message são obrigatórios'
                    });
                }
                const validTypes = ['order_status', 'delivery_update', 'promotion'];
                if (!validTypes.includes(type)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tipo de notificação inválido'
                    });
                }
                const notification = yield this.notificationService.createNotification(userId, type, message);
                res.status(201).json({
                    success: true,
                    message: 'Notificação criada com sucesso',
                    data: notification
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro interno do servidor'
                });
            }
        });
        this.notificationService = new notification_service_1.NotificationService();
    }
}
exports.NotificationController = NotificationController;
