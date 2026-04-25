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
const Delivery_1 = require("../../models/Delivery");
const Order_1 = require("../../models/Order");
const Driver_1 = require("../../models/Driver");
const Vendor_1 = require("../../models/Vendor");
const notification_service_1 = require("../notification/notification.service");
const driver_service_1 = require("../driver/driver.service");
const mongoose_1 = require("mongoose");
class DeliveryService {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
    }
    notifyOrderStakeholders(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { order, type, customerMessage, vendorMessage, driverMessage, deliveryId, metadata } = params;
            const orderId = (_a = order._id) === null || _a === void 0 ? void 0 : _a.toString();
            if (customerMessage) {
                yield this.notificationService.createNotification(order.customer.toString(), type, customerMessage, { orderId, deliveryId, metadata });
            }
            const vendor = yield Vendor_1.Vendor.findById(order.vendor).exec();
            if ((vendor === null || vendor === void 0 ? void 0 : vendor.owner) && vendorMessage) {
                yield this.notificationService.createNotification(vendor.owner.toString(), type, vendorMessage, { orderId, deliveryId, metadata });
            }
            if (driverMessage && deliveryId) {
                const delivery = yield Delivery_1.Delivery.findById(deliveryId).select('driver').exec();
                if (delivery === null || delivery === void 0 ? void 0 : delivery.driver) {
                    yield this.notificationService.createNotification(delivery.driver.toString(), type, driverMessage, { orderId, deliveryId, metadata });
                }
            }
        });
    }
    // Criar entrega
    createDelivery(deliveryData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                if (!mongoose_1.Types.ObjectId.isValid(deliveryData.orderId)) {
                    throw new Error('ID do pedido inválido');
                }
                const existingDelivery = yield Delivery_1.Delivery.findOne({ order: deliveryData.orderId }).exec();
                if (existingDelivery) {
                    throw new Error('Já existe uma entrega para este pedido');
                }
                const order = yield Order_1.Order.findById(deliveryData.orderId)
                    .populate('customer')
                    .populate('vendor');
                if (!order)
                    throw new Error('Pedido não encontrado');
                if (order.deliveryType !== 'delivery') {
                    throw new Error('Apenas pedidos com entrega podem gerar delivery');
                }
                if (order.status !== 'ready') {
                    throw new Error('Pedido não está pronto para entrega');
                }
                if (order.paymentMethod !== 'cash' && order.paymentStatus !== 'paid') {
                    throw new Error('Pedido precisa estar pago para sair para entrega');
                }
                let assignedDriver;
                if (!deliveryData.driverId) {
                    const availableDrivers = yield driver_service_1.DriverService.findAvailableDrivers({
                        latitude: ((_a = order.deliveryAddress.coordinates) === null || _a === void 0 ? void 0 : _a.lat) || 0,
                        longitude: ((_b = order.deliveryAddress.coordinates) === null || _b === void 0 ? void 0 : _b.lng) || 0
                    }, order.deliveryAddress.neighborhood || order.deliveryAddress.city || '', 5000);
                    if (availableDrivers.length === 0) {
                        throw new Error('Nenhum motorista disponível encontrado');
                    }
                    assignedDriver = availableDrivers[0];
                }
                else {
                    assignedDriver = yield Driver_1.Driver.findById(deliveryData.driverId).exec();
                    if (!assignedDriver)
                        throw new Error('Motorista não encontrado');
                    if (!assignedDriver.isAvailable || !assignedDriver.isVerified) {
                        throw new Error('Motorista não está disponível');
                    }
                }
                const delivery = new Delivery_1.Delivery({
                    order: order._id,
                    driver: assignedDriver.userId,
                    status: 'picked_up',
                    currentLocation: assignedDriver.currentLocation
                        ? {
                            lat: assignedDriver.currentLocation.latitude,
                            lng: assignedDriver.currentLocation.longitude
                        }
                        : undefined,
                    assignedAt: new Date(),
                    estimatedTime: deliveryData.estimatedTime || new Date(Date.now() + 30 * 60000)
                });
                yield delivery.save();
                order.status = 'out_for_delivery';
                yield order.save();
                assignedDriver.isAvailable = false;
                yield assignedDriver.save();
                yield this.notifyOrderStakeholders({
                    order,
                    type: 'delivery_update',
                    customerMessage: `Seu pedido saiu para entrega com o motorista ${assignedDriver.licenseNumber}.`,
                    vendorMessage: `Pedido #${(_c = order._id) === null || _c === void 0 ? void 0 : _c.toString().slice(-8)} saiu para entrega.`,
                    driverMessage: 'Nova entrega atribuída. Verifique a rota e os detalhes do pedido.',
                    deliveryId: delivery._id.toString(),
                    metadata: {
                        status: 'picked_up'
                    }
                });
                return {
                    delivery: yield delivery.populate(['order', 'driver']),
                    driver: {
                        id: assignedDriver._id,
                        userId: assignedDriver.userId,
                        licenseNumber: assignedDriver.licenseNumber,
                        vehicleInfo: assignedDriver.vehicleInfo,
                        rating: assignedDriver.rating
                    }
                };
            }
            catch (error) {
                throw new Error(`Erro ao criar entrega: ${error.message}`);
            }
        });
    }
    // Buscar entrega por ID
    getDeliveryById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(id)) {
                    throw new Error('ID inválido');
                }
                const delivery = yield Delivery_1.Delivery.findById(id)
                    .populate({
                    path: 'order',
                    populate: [
                        { path: 'customer', select: 'userId phoneNumber email' },
                        { path: 'vendor', select: 'name type address' }
                    ]
                })
                    .populate('driver', 'licenseNumber vehicleInfo rating currentLocation');
                if (!delivery)
                    throw new Error('Entrega não encontrada');
                return delivery;
            }
            catch (error) {
                throw new Error(`Erro ao buscar entrega: ${error.message}`);
            }
        });
    }
    // Listar entregas com filtros
    getDeliveries() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            try {
                const query = {};
                if (filters.orderId)
                    query.order = filters.orderId;
                if (filters.driverId)
                    query.driver = filters.driverId;
                if (filters.status)
                    query.status = filters.status;
                if (filters.dateFrom || filters.dateTo) {
                    query.createdAt = {};
                    if (filters.dateFrom)
                        query.createdAt.$gte = filters.dateFrom;
                    if (filters.dateTo)
                        query.createdAt.$lte = filters.dateTo;
                }
                if (filters.customerId || filters.vendorId) {
                    const orders = yield Order_1.Order.find(Object.assign(Object.assign({}, (filters.customerId && { customer: filters.customerId })), (filters.vendorId && { vendor: filters.vendorId }))).select('_id');
                    query.order = { $in: orders.map((order) => order._id) };
                }
                return yield Delivery_1.Delivery.find(query)
                    .populate({
                    path: 'order',
                    populate: [
                        { path: 'customer', select: 'userId phoneNumber' },
                        { path: 'vendor', select: 'name type' }
                    ]
                })
                    .populate('driver', 'licenseNumber vehicleInfo rating')
                    .sort({ createdAt: -1 })
                    .exec();
            }
            catch (error) {
                throw new Error(`Erro ao buscar entregas: ${error.message}`);
            }
        });
    }
    // Atualizar entrega
    updateDelivery(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(id)) {
                    throw new Error('ID inválido');
                }
                const delivery = yield Delivery_1.Delivery.findById(id).populate(['order']);
                if (!delivery)
                    throw new Error('Entrega não encontrada');
                const validTransitions = {
                    picked_up: ['in_transit', 'failed'],
                    in_transit: ['delivered', 'failed'],
                    delivered: [],
                    failed: ['picked_up']
                };
                if (updateData.status && !validTransitions[delivery.status].includes(updateData.status)) {
                    throw new Error(`Transição de status inválida: ${delivery.status} -> ${updateData.status}`);
                }
                if (updateData.currentLocation) {
                    delivery.currentLocation = updateData.currentLocation;
                }
                if (updateData.estimatedTime) {
                    delivery.estimatedTime = updateData.estimatedTime;
                }
                if (updateData.status) {
                    delivery.status = updateData.status;
                }
                if (updateData.failureReason) {
                    delivery.failureReason = updateData.failureReason;
                }
                if (updateData.status === 'delivered') {
                    delivery.deliveredAt = new Date();
                }
                yield delivery.save();
                if (updateData.status) {
                    yield this.handleStatusChange(delivery, updateData.status, updateData.failureReason);
                }
                return yield delivery.populate(['order', 'driver']);
            }
            catch (error) {
                throw new Error(`Erro ao atualizar entrega: ${error.message}`);
            }
        });
    }
    handleStatusChange(delivery, newStatus, failureReason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const order = yield Order_1.Order.findById(delivery.order).exec();
            if (!order) {
                return;
            }
            switch (newStatus) {
                case 'in_transit':
                    order.status = 'out_for_delivery';
                    yield order.save();
                    yield this.notifyOrderStakeholders({
                        order,
                        type: 'delivery_update',
                        customerMessage: 'Seu pedido está a caminho.',
                        vendorMessage: `Pedido #${(_a = order._id) === null || _a === void 0 ? void 0 : _a.toString().slice(-8)} está em trânsito.`,
                        deliveryId: delivery._id.toString(),
                        metadata: { status: 'in_transit' }
                    });
                    break;
                case 'delivered':
                    yield driver_service_1.DriverService.completeDelivery(delivery._id.toString());
                    break;
                case 'failed': {
                    order.status = 'ready';
                    yield order.save();
                    const driver = yield Driver_1.Driver.findOne({ userId: delivery.driver }).exec();
                    if (driver) {
                        driver.isAvailable = true;
                        yield driver.save();
                    }
                    yield this.notifyOrderStakeholders({
                        order,
                        type: 'delivery_update',
                        customerMessage: `Houve um problema na entrega: ${failureReason || 'motivo não informado'}.`,
                        vendorMessage: `Falha na entrega do pedido #${(_b = order._id) === null || _b === void 0 ? void 0 : _b.toString().slice(-8)}.`,
                        deliveryId: delivery._id.toString(),
                        metadata: {
                            status: 'failed',
                            failureReason
                        }
                    });
                    break;
                }
            }
        });
    }
    // Rastrear entrega em tempo real
    trackDelivery(deliveryId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const delivery = yield Delivery_1.Delivery.findById(deliveryId)
                    .populate({
                    path: 'order',
                    select: 'deliveryAddress estimatedDeliveryTime customer',
                    populate: {
                        path: 'customer',
                        select: 'userId phoneNumber'
                    }
                })
                    .populate('driver', 'licenseNumber vehicleInfo currentLocation');
                if (!delivery)
                    throw new Error('Entrega não encontrada');
                const driver = delivery.driver;
                const order = delivery.order;
                let estimatedDistance = null;
                let estimatedTimeRemaining = null;
                if (driver.currentLocation && order.deliveryAddress.coordinates) {
                    const driverLat = driver.currentLocation.latitude;
                    const driverLng = driver.currentLocation.longitude;
                    const destLat = order.deliveryAddress.coordinates.lat;
                    const destLng = order.deliveryAddress.coordinates.lng;
                    estimatedDistance = this.calculateDistance(driverLat, driverLng, destLat, destLng);
                    estimatedTimeRemaining = Math.ceil((estimatedDistance / 30) * 60);
                }
                return {
                    delivery: {
                        id: delivery._id,
                        status: delivery.status,
                        estimatedTime: delivery.estimatedTime,
                        currentLocation: delivery.currentLocation
                    },
                    driver: {
                        id: driver._id,
                        licenseNumber: driver.licenseNumber,
                        vehicleInfo: driver.vehicleInfo,
                        currentLocation: driver.currentLocation
                    },
                    order: {
                        id: order._id,
                        deliveryAddress: order.deliveryAddress,
                        estimatedDeliveryTime: order.estimatedDeliveryTime
                    },
                    tracking: {
                        estimatedDistance: estimatedDistance ? `${estimatedDistance.toFixed(2)} km` : null,
                        estimatedTimeRemaining: estimatedTimeRemaining ? `${estimatedTimeRemaining} min` : null,
                        lastLocationUpdate: (_a = driver.currentLocation) === null || _a === void 0 ? void 0 : _a.lastUpdated
                    }
                };
            }
            catch (error) {
                throw new Error(`Erro ao rastrear entrega: ${error.message}`);
            }
        });
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    getActiveDeliveriesByDriver(driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(driverId)) {
                    throw new Error('ID do motorista inválido');
                }
                const driver = yield Driver_1.Driver.findById(driverId).exec();
                if (!driver) {
                    throw new Error('Motorista não encontrado');
                }
                return yield Delivery_1.Delivery.find({
                    driver: driver.userId,
                    status: { $in: ['picked_up', 'in_transit'] }
                })
                    .populate({
                    path: 'order',
                    populate: [
                        { path: 'customer', select: 'userId phoneNumber' },
                        { path: 'vendor', select: 'name address' }
                    ]
                })
                    .sort({ createdAt: -1 });
            }
            catch (error) {
                throw new Error(`Erro ao buscar entregas ativas: ${error.message}`);
            }
        });
    }
    getDeliveryHistoryByCustomer(customerId_1) {
        return __awaiter(this, arguments, void 0, function* (customerId, limit = 10) {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(customerId)) {
                    throw new Error('ID do cliente inválido');
                }
                const orders = yield Order_1.Order.find({ customer: customerId }).select('_id');
                const orderIds = orders.map((order) => order._id);
                return yield Delivery_1.Delivery.find({ order: { $in: orderIds } })
                    .populate({
                    path: 'order',
                    populate: {
                        path: 'vendor',
                        select: 'name type'
                    }
                })
                    .populate('driver', 'licenseNumber rating vehicleInfo')
                    .sort({ createdAt: -1 })
                    .limit(limit);
            }
            catch (error) {
                throw new Error(`Erro ao buscar histórico de entregas: ${error.message}`);
            }
        });
    }
    getDeliveryStatsByVendor(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.Types.ObjectId.isValid(vendorId)) {
                    throw new Error('ID do vendor inválido');
                }
                const orders = yield Order_1.Order.find({ vendor: vendorId }).select('_id actualDeliveryTime createdAt');
                const orderIds = orders.map((order) => order._id);
                const deliveries = yield Delivery_1.Delivery.find({
                    order: { $in: orderIds }
                }).populate('order');
                const totalDeliveries = deliveries.length;
                const completedDeliveries = deliveries.filter((delivery) => delivery.status === 'delivered').length;
                const failedDeliveries = deliveries.filter((delivery) => delivery.status === 'failed').length;
                const inProgressDeliveries = deliveries.filter((delivery) => ['picked_up', 'in_transit'].includes(delivery.status)).length;
                const completedWithTimes = deliveries.filter((delivery) => { var _a; return delivery.status === 'delivered' && delivery.deliveredAt && ((_a = delivery.order) === null || _a === void 0 ? void 0 : _a.createdAt); });
                let averageDeliveryTime = 0;
                if (completedWithTimes.length > 0) {
                    const totalTime = completedWithTimes.reduce((sum, delivery) => {
                        const orderTime = new Date(delivery.order.createdAt).getTime();
                        const deliveryTime = new Date(delivery.deliveredAt).getTime();
                        return sum + (deliveryTime - orderTime);
                    }, 0);
                    averageDeliveryTime = totalTime / completedWithTimes.length / (1000 * 60);
                }
                return {
                    totalDeliveries,
                    completedDeliveries,
                    failedDeliveries,
                    inProgressDeliveries,
                    successRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
                    averageDeliveryTime: Math.round(averageDeliveryTime),
                    recentDeliveries: deliveries.slice(0, 5)
                };
            }
            catch (error) {
                throw new Error(`Erro ao obter estatísticas de entregas: ${error.message}`);
            }
        });
    }
    cancelDelivery(deliveryId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const delivery = yield Delivery_1.Delivery.findById(deliveryId).exec();
                if (!delivery)
                    throw new Error('Entrega não encontrada');
                if (['delivered', 'failed'].includes(delivery.status)) {
                    throw new Error('Não é possível cancelar entrega finalizada');
                }
                delivery.status = 'failed';
                delivery.failureReason = reason;
                yield delivery.save();
                const order = yield Order_1.Order.findById(delivery.order).exec();
                if (order) {
                    order.status = 'ready';
                    yield order.save();
                }
                const driver = yield Driver_1.Driver.findOne({ userId: delivery.driver }).exec();
                if (driver) {
                    driver.isAvailable = true;
                    yield driver.save();
                }
                if (order) {
                    yield this.notifyOrderStakeholders({
                        order,
                        type: 'delivery_update',
                        customerMessage: `Entrega cancelada: ${reason}. Estamos buscando outro motorista.`,
                        vendorMessage: `Entrega do pedido #${(_a = order._id) === null || _a === void 0 ? void 0 : _a.toString().slice(-8)} cancelada.`,
                        deliveryId: delivery._id.toString(),
                        metadata: {
                            status: 'failed',
                            reason
                        }
                    });
                }
                return {
                    message: 'Entrega cancelada com sucesso',
                    delivery,
                    reason
                };
            }
            catch (error) {
                throw new Error(`Erro ao cancelar entrega: ${error.message}`);
            }
        });
    }
    reassignDelivery(deliveryId, newDriverId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const delivery = yield Delivery_1.Delivery.findById(deliveryId).exec();
                if (!delivery)
                    throw new Error('Entrega não encontrada');
                const order = yield Order_1.Order.findById(delivery.order).exec();
                if (!order)
                    throw new Error('Pedido da entrega não encontrado');
                const oldDriver = yield Driver_1.Driver.findOne({ userId: delivery.driver }).exec();
                let newDriver;
                if (newDriverId) {
                    newDriver = yield Driver_1.Driver.findById(newDriverId).exec();
                    if (!newDriver || !newDriver.isAvailable || !newDriver.isVerified) {
                        throw new Error('Novo motorista não está disponível');
                    }
                }
                else {
                    const availableDrivers = yield driver_service_1.DriverService.findAvailableDrivers({
                        latitude: ((_a = order.deliveryAddress.coordinates) === null || _a === void 0 ? void 0 : _a.lat) || 0,
                        longitude: ((_b = order.deliveryAddress.coordinates) === null || _b === void 0 ? void 0 : _b.lng) || 0
                    }, order.deliveryAddress.neighborhood || order.deliveryAddress.city || '', 5000);
                    if (availableDrivers.length === 0) {
                        throw new Error('Nenhum motorista disponível encontrado');
                    }
                    newDriver = availableDrivers[0];
                }
                delivery.driver = newDriver.userId;
                delivery.status = 'picked_up';
                delivery.failureReason = undefined;
                delivery.currentLocation = newDriver.currentLocation
                    ? {
                        lat: newDriver.currentLocation.latitude,
                        lng: newDriver.currentLocation.longitude
                    }
                    : undefined;
                delivery.assignedAt = new Date();
                yield delivery.save();
                if (oldDriver) {
                    oldDriver.isAvailable = true;
                    yield oldDriver.save();
                }
                newDriver.isAvailable = false;
                yield newDriver.save();
                yield this.notifyOrderStakeholders({
                    order,
                    type: 'delivery_update',
                    customerMessage: `Novo motorista atribuído: ${newDriver.licenseNumber}. Sua entrega está a caminho.`,
                    vendorMessage: `Entrega do pedido #${(_c = order._id) === null || _c === void 0 ? void 0 : _c.toString().slice(-8)} foi reatribuída.`,
                    driverMessage: 'Entrega reatribuída. Confira os detalhes da rota.',
                    deliveryId: delivery._id.toString(),
                    metadata: {
                        status: 'picked_up',
                        reassigned: true
                    }
                });
                return {
                    message: 'Entrega reatribuída com sucesso',
                    delivery: yield delivery.populate(['order', 'driver']),
                    oldDriver: oldDriver
                        ? {
                            id: oldDriver._id,
                            licenseNumber: oldDriver.licenseNumber
                        }
                        : null,
                    newDriver: {
                        id: newDriver._id,
                        licenseNumber: newDriver.licenseNumber,
                        vehicleInfo: newDriver.vehicleInfo
                    }
                };
            }
            catch (error) {
                throw new Error(`Erro ao reatribuir entrega: ${error.message}`);
            }
        });
    }
}
exports.default = new DeliveryService();
