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
const delivery_service_1 = __importDefault(require("./delivery.service"));
const delivery_tracking_service_1 = require("./delivery-tracking.service");
const chat_service_1 = require("../chat/chat.service");
const User_1 = require("../../models/User");
const Driver_1 = require("../../models/Driver");
const logger_1 = require("../../utils/logger");
class DeliveryController {
    /**
     * GET /deliveries/my-deliveries - Buscar entregas do driver autenticado
     */
    getMyDeliveries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                if (user.role !== 'driver') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas drivers podem acessar esta funcionalidade'
                    });
                    return;
                }
                // Buscar driver do usuário
                const driver = yield Driver_1.Driver.findOne({ userId: user._id });
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                const filters = {
                    driverId: driver._id.toString(),
                    status: req.query.status,
                    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                    dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined
                };
                const deliveries = yield delivery_service_1.default.getDeliveries(filters);
                res.status(200).json({
                    success: true,
                    count: deliveries.length,
                    data: deliveries
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching my deliveries:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar entregas'
                });
            }
        });
    }
    /**
     * GET /deliveries/my-orders - Buscar entregas dos pedidos do customer autenticado
     */
    getMyOrderDeliveries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                if (user.role !== 'customer') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas customers podem acessar esta funcionalidade'
                    });
                    return;
                }
                const filters = {
                    customerId: user._id.toString(),
                    status: req.query.status,
                    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                    dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined
                };
                const deliveries = yield delivery_service_1.default.getDeliveries(filters);
                res.status(200).json({
                    success: true,
                    count: deliveries.length,
                    data: deliveries
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching my order deliveries:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar entregas dos pedidos'
                });
            }
        });
    }
    /**
     * PUT /deliveries/my-deliveries/:id/status - Atualizar status da entrega (driver)
     */
    updateMyDeliveryStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
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
                if (user.role !== 'driver') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas drivers podem atualizar status de entrega'
                    });
                    return;
                }
                // Buscar driver do usuário
                const driver = yield Driver_1.Driver.findOne({ userId: user._id });
                if (!driver) {
                    res.status(404).json({
                        success: false,
                        message: 'Perfil de driver não encontrado'
                    });
                    return;
                }
                const { id } = req.params;
                const { status } = req.body;
                if (!status) {
                    res.status(400).json({
                        success: false,
                        message: 'Status é obrigatório'
                    });
                    return;
                }
                // Verificar se a entrega pertence ao driver
                const delivery = yield delivery_service_1.default.getDeliveryById(id);
                if (!delivery) {
                    res.status(404).json({
                        success: false,
                        message: 'Entrega não encontrada'
                    });
                    return;
                }
                if (((_b = delivery.driver) === null || _b === void 0 ? void 0 : _b.toString()) !== user._id.toString()) {
                    res.status(403).json({
                        success: false,
                        message: 'Você não tem permissão para atualizar esta entrega'
                    });
                    return;
                }
                const updateData = { status };
                const updatedDelivery = yield delivery_service_1.default.updateDelivery(id, updateData);
                yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                res.status(200).json({
                    success: true,
                    message: 'Status da entrega atualizado com sucesso',
                    data: updatedDelivery
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating my delivery status:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar status da entrega'
                });
            }
        });
    }
    // POST /api/deliveries - Criar nova entrega
    createDelivery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const deliveryData = req.body;
                const result = yield delivery_service_1.default.createDelivery(deliveryData);
                if ((_a = result === null || result === void 0 ? void 0 : result.delivery) === null || _a === void 0 ? void 0 : _a._id) {
                    yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(result.delivery._id.toString());
                    if (result.delivery.order) {
                        yield chat_service_1.chatService.syncOrderConversations(result.delivery.order.toString());
                    }
                }
                res.status(201).json({
                    success: true,
                    message: 'Entrega criada com sucesso',
                    data: result
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/:id - Buscar entrega por ID
    getDeliveryById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const delivery = yield delivery_service_1.default.getDeliveryById(id);
                res.status(200).json({
                    success: true,
                    data: delivery
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries - Listar entregas com filtros
    getDeliveries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const filters = {
                    orderId: req.query.orderId,
                    driverId: req.query.driverId,
                    status: req.query.status,
                    customerId: req.query.customerId,
                    vendorId: req.query.vendorId,
                    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                    dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined
                };
                // Remove campos undefined
                Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
                const deliveries = yield delivery_service_1.default.getDeliveries(filters);
                res.status(200).json({
                    success: true,
                    count: deliveries.length,
                    data: deliveries
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // PUT /api/deliveries/:id - Atualizar entrega
    updateDelivery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const updatedDelivery = yield delivery_service_1.default.updateDelivery(id, updateData);
                yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                res.status(200).json({
                    success: true,
                    message: 'Entrega atualizada com sucesso',
                    data: updatedDelivery
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/:id/track - Rastrear entrega em tempo real
    trackDelivery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const trackingData = yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                res.status(200).json({
                    success: true,
                    data: trackingData
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/driver/:driverId/active - Entregas ativas de um motorista
    getActiveDeliveriesByDriver(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { driverId } = req.params;
                const activeDeliveries = yield delivery_service_1.default.getActiveDeliveriesByDriver(driverId);
                res.status(200).json({
                    success: true,
                    count: activeDeliveries.length,
                    data: activeDeliveries
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/customer/:customerId/history - Histórico de entregas de um cliente
    getDeliveryHistoryByCustomer(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId } = req.params;
                const limit = parseInt(req.query.limit) || 10;
                const deliveryHistory = yield delivery_service_1.default.getDeliveryHistoryByCustomer(customerId, limit);
                res.status(200).json({
                    success: true,
                    count: deliveryHistory.length,
                    data: deliveryHistory
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/vendor/:vendorId/stats - Estatísticas de entregas por vendor
    getDeliveryStatsByVendor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId } = req.params;
                const stats = yield delivery_service_1.default.getDeliveryStatsByVendor(vendorId);
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // DELETE /api/deliveries/:id/cancel - Cancelar entrega
    cancelDelivery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                if (!reason) {
                    res.status(400).json({
                        success: false,
                        message: 'Motivo do cancelamento é obrigatório'
                    });
                    return;
                }
                const result = yield delivery_service_1.default.cancelDelivery(id, reason);
                yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // PUT /api/deliveries/:id/reassign - Reatribuir entrega para outro motorista
    reassignDelivery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const { newDriverId } = req.body;
                const result = yield delivery_service_1.default.reassignDelivery(id, newDriverId);
                yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                if ((_a = result === null || result === void 0 ? void 0 : result.delivery) === null || _a === void 0 ? void 0 : _a.order) {
                    yield chat_service_1.chatService.syncOrderConversations(result.delivery.order.toString());
                }
                res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/status/:status - Buscar entregas por status
    getDeliveriesByStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { status } = req.params;
                const validStatuses = ['picked_up', 'in_transit', 'delivered', 'failed'];
                if (!validStatuses.includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Status inválido. Valores válidos: ' + validStatuses.join(', ')
                    });
                    return;
                }
                const deliveries = yield delivery_service_1.default.getDeliveries({ status: status });
                res.status(200).json({
                    success: true,
                    count: deliveries.length,
                    data: deliveries
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // POST /api/deliveries/:id/location - Atualizar localização da entrega
    updateDeliveryLocation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { lat, lng } = req.body;
                if (!lat || !lng) {
                    res.status(400).json({
                        success: false,
                        message: 'Coordenadas de latitude e longitude são obrigatórias'
                    });
                    return;
                }
                const updateData = {
                    currentLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }
                };
                const updatedDelivery = yield delivery_service_1.default.updateDelivery(id, updateData);
                yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                res.status(200).json({
                    success: true,
                    message: 'Localização atualizada com sucesso',
                    data: updatedDelivery
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/analytics/summary - Resumo analítico de entregas
    getDeliveryAnalytics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { dateFrom, dateTo, vendorId, driverId } = req.query;
                const filters = {
                    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
                    dateTo: dateTo ? new Date(dateTo) : undefined,
                    vendorId: vendorId,
                    driverId: driverId
                };
                // Remove campos undefined
                Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
                const deliveries = yield delivery_service_1.default.getDeliveries(filters);
                // Calcular métricas
                const totalDeliveries = deliveries.length;
                const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
                const failedCount = deliveries.filter(d => d.status === 'failed').length;
                const inProgressCount = deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status)).length;
                const successRate = totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0;
                // Agrupar por status
                const statusBreakdown = deliveries.reduce((acc, delivery) => {
                    acc[delivery.status] = (acc[delivery.status] || 0) + 1;
                    return acc;
                }, {});
                res.status(200).json({
                    success: true,
                    data: {
                        summary: {
                            totalDeliveries,
                            deliveredCount,
                            failedCount,
                            inProgressCount,
                            successRate: parseFloat(successRate.toFixed(2))
                        },
                        statusBreakdown,
                        deliveries: deliveries.slice(0, 10) // Últimas 10 entregas
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/realtime - Entregas em tempo real
    getRealTimeDeliveries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { region, radius, vendorId, driverId } = req.query;
                // Buscar entregas ativas (picked_up e in_transit)
                const filters = {
                    status: undefined, // Vamos filtrar manualmente para incluir múltiplos status
                    vendorId: vendorId,
                    driverId: driverId
                };
                // Remove campos undefined
                Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
                const allDeliveries = yield delivery_service_1.default.getDeliveries(filters);
                // Filtrar apenas entregas ativas
                const activeDeliveries = allDeliveries.filter(delivery => ['picked_up', 'in_transit'].includes(delivery.status));
                // Adicionar informações de tracking para cada entrega
                const realTimeData = yield Promise.all(activeDeliveries.map((delivery) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const trackingInfo = yield delivery_service_1.default.trackDelivery(delivery._id.toString());
                        return Object.assign(Object.assign({}, delivery.toObject()), { realTimeData: trackingInfo.tracking, driver: trackingInfo.driver, estimatedArrival: trackingInfo.tracking.estimatedTimeRemaining });
                    }
                    catch (error) {
                        // Se falhar ao obter tracking, retorna entrega sem dados em tempo real
                        return Object.assign(Object.assign({}, delivery.toObject()), { realTimeData: null, estimatedArrival: null });
                    }
                })));
                // Agrupar por status para dashboard
                const statusSummary = {
                    picked_up: realTimeData.filter(d => d.status === 'picked_up').length,
                    in_transit: realTimeData.filter(d => d.status === 'in_transit').length,
                    total_active: realTimeData.length
                };
                res.status(200).json({
                    success: true,
                    data: {
                        activeDeliveries: realTimeData,
                        summary: statusSummary,
                        lastUpdated: new Date().toISOString()
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // GET /api/deliveries/dashboard - Dashboard de entregas
    getDeliveryDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { period = '24h', vendorId, driverId } = req.query;
                // Definir período para filtros baseado no parâmetro
                let dateFrom;
                const dateTo = new Date();
                switch (period) {
                    case '1h':
                        dateFrom = new Date(Date.now() - 1 * 60 * 60 * 1000);
                        break;
                    case '6h':
                        dateFrom = new Date(Date.now() - 6 * 60 * 60 * 1000);
                        break;
                    case '24h':
                        dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        break;
                    case '7d':
                        dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    default:
                        dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
                }
                const filters = {
                    dateFrom,
                    dateTo,
                    vendorId: vendorId,
                    driverId: driverId
                };
                // Remove campos undefined
                Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
                const deliveries = yield delivery_service_1.default.getDeliveries(filters);
                // Métricas principais
                const totalDeliveries = deliveries.length;
                const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
                const failedCount = deliveries.filter(d => d.status === 'failed').length;
                const activeCount = deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status)).length;
                const successRate = totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0;
                // Distribuição por hora (últimas 24h)
                const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
                    const count = deliveries.filter(d => {
                        const deliveryHour = new Date(d.createdAt).getHours();
                        return deliveryHour === hour;
                    }).length;
                    return { hour, count };
                });
                // Top motoristas
                const driverStats = deliveries.reduce((acc, delivery) => {
                    if (delivery.driver) {
                        const driverId = delivery.driver._id || delivery.driver;
                        const driverName = delivery.driver.name || 'Driver';
                        if (!acc[driverId]) {
                            acc[driverId] = {
                                id: driverId,
                                name: driverName,
                                total: 0,
                                delivered: 0,
                                failed: 0
                            };
                        }
                        acc[driverId].total++;
                        if (delivery.status === 'delivered')
                            acc[driverId].delivered++;
                        if (delivery.status === 'failed')
                            acc[driverId].failed++;
                    }
                    return acc;
                }, {});
                const topDrivers = Object.values(driverStats)
                    .sort((a, b) => b.delivered - a.delivered)
                    .slice(0, 5);
                // Entregas recentes
                const recentDeliveries = deliveries
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10);
                // Status atual das entregas ativas
                const activeDeliveries = deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status));
                res.status(200).json({
                    success: true,
                    data: {
                        metrics: {
                            totalDeliveries,
                            deliveredCount,
                            failedCount,
                            activeCount,
                            successRate: parseFloat(successRate.toFixed(2))
                        },
                        charts: {
                            hourlyDistribution,
                            statusDistribution: {
                                delivered: deliveredCount,
                                failed: failedCount,
                                active: activeCount
                            }
                        },
                        topDrivers,
                        recentDeliveries,
                        activeDeliveries: activeDeliveries.slice(0, 5),
                        period,
                        lastUpdated: new Date().toISOString()
                    }
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
    // PATCH /api/deliveries/:id/status - Atualizar apenas o status da entrega
    updateDeliveryStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { status, failureReason, currentLocation } = req.body;
                if (!status) {
                    res.status(400).json({
                        success: false,
                        message: 'Status é obrigatório'
                    });
                    return;
                }
                const validStatuses = ['picked_up', 'in_transit', 'delivered', 'failed'];
                if (!validStatuses.includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: `Status inválido. Valores válidos: ${validStatuses.join(', ')}`
                    });
                    return;
                }
                // Se status é 'failed', motivo é obrigatório
                if (status === 'failed' && !failureReason) {
                    res.status(400).json({
                        success: false,
                        message: 'Motivo da falha é obrigatório quando status é "failed"'
                    });
                    return;
                }
                const updateData = Object.assign(Object.assign({ status }, (failureReason && { failureReason })), (currentLocation && { currentLocation }));
                const updatedDelivery = yield delivery_service_1.default.updateDelivery(id, updateData);
                yield delivery_tracking_service_1.deliveryTrackingService.publishDeliverySnapshot(id);
                res.status(200).json({
                    success: true,
                    message: `Status da entrega atualizado para "${status}"`,
                    data: {
                        delivery: updatedDelivery,
                        previousStatus: req.body.previousStatus || 'unknown',
                        newStatus: status,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            catch (error) {
                const statusCode = error.message.includes('não encontrada') ? 404 :
                    error.message.includes('Transição de status inválida') ? 422 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: error.message
                });
            }
        });
    }
}
exports.default = new DeliveryController();
