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
exports.DriverService = void 0;
// services/driverService.ts
const Driver_1 = require("../../models/Driver");
const User_1 = require("../../models/User");
const Order_1 = require("../../models/Order");
const Delivery_1 = require("../../models/Delivery");
const notification_service_1 = require("../notification/notification.service");
const mongoose_1 = require("mongoose");
class DriverServices {
    constructor() {
        // Regra simples de negócio: percentual da taxa de entrega que vai para o driver
        this.driverCommissionRate = 0.7; // 70% da deliveryFee
        this.notificationService = new notification_service_1.NotificationService();
    }
    calculateDistanceInMeters(latitude1, longitude1, latitude2, longitude2) {
        const earthRadius = 6371000;
        const deltaLatitude = ((latitude2 - latitude1) * Math.PI) / 180;
        const deltaLongitude = ((longitude2 - longitude1) * Math.PI) / 180;
        const a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
            Math.cos((latitude1 * Math.PI) / 180) *
                Math.cos((latitude2 * Math.PI) / 180) *
                Math.sin(deltaLongitude / 2) *
                Math.sin(deltaLongitude / 2);
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    // Criar perfil de driver para um User existente
    createDriver(userId, driverData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verificar se User existe e tem role 'driver'
                const user = yield User_1.User.findById(userId);
                if (!user) {
                    throw new Error('User não encontrado');
                }
                if (user.role !== 'driver') {
                    throw new Error('User deve ter role "driver"');
                }
                // Verificar se já existe perfil de driver para este User
                const existingDriver = yield Driver_1.Driver.findOne({ userId: new mongoose_1.Types.ObjectId(userId) });
                if (existingDriver) {
                    throw new Error('User já possui perfil de driver');
                }
                // Verificar se licenseNumber já existe
                const existingLicense = yield Driver_1.Driver.findOne({ licenseNumber: driverData.licenseNumber });
                if (existingLicense) {
                    throw new Error('Número de licença já cadastrado');
                }
                const driver = new Driver_1.Driver({
                    userId: new mongoose_1.Types.ObjectId(userId),
                    licenseNumber: driverData.licenseNumber,
                    vehicleInfo: driverData.vehicleInfo,
                    workingHours: driverData.workingHours,
                    acceptedPaymentMethods: driverData.acceptedPaymentMethods,
                    deliveryAreas: driverData.deliveryAreas,
                    documents: driverData.documents,
                    emergencyContact: driverData.emergencyContact,
                    currentLocation: {
                        latitude: 0,
                        longitude: 0,
                        lastUpdated: new Date()
                    }
                });
                const savedDriver = yield driver.save();
                // Enviar notificação de boas-vindas
                yield this.notificationService.createNotification(userId, 'order_status', 'Bem-vindo à plataforma! Seu cadastro está em análise.');
                return savedDriver;
            }
            catch (error) {
                throw new Error(`Erro ao criar driver: ${error.message}`);
            }
        });
    }
    // Buscar driver por ID
    getDriverById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield Driver_1.Driver.findById(id).populate('user', 'userId email phoneNumber role');
            }
            catch (error) {
                throw new Error(`Erro ao buscar driver: ${error.message}`);
            }
        });
    }
    // Buscar driver por User ID
    getDriverByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield Driver_1.Driver.findOne({ userId: new mongoose_1.Types.ObjectId(userId) })
                    .populate('user', 'userId email phoneNumber role');
            }
            catch (error) {
                throw new Error(`Erro ao buscar driver por User ID: ${error.message}`);
            }
        });
    }
    // Listar drivers com filtros
    getDrivers() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            try {
                const query = {};
                if (filters.isAvailable !== undefined) {
                    query.isAvailable = filters.isAvailable;
                }
                if (filters.isVerified !== undefined) {
                    query.isVerified = filters.isVerified;
                }
                if (filters.vehicleType) {
                    query['vehicleInfo.type'] = filters.vehicleType;
                }
                if (filters.deliveryArea) {
                    query.deliveryAreas = filters.deliveryArea;
                }
                if (filters.minRating) {
                    query.rating = { $gte: filters.minRating };
                }
                let drivers = yield Driver_1.Driver.find(query)
                    .populate('user', 'userId email phoneNumber role')
                    .sort({ rating: -1 });
                if (filters.nearLocation) {
                    drivers = drivers.filter((driver) => {
                        if (!driver.currentLocation) {
                            return false;
                        }
                        const distance = this.calculateDistanceInMeters(filters.nearLocation.latitude, filters.nearLocation.longitude, driver.currentLocation.latitude, driver.currentLocation.longitude);
                        return distance <= filters.nearLocation.maxDistance;
                    });
                }
                return drivers;
            }
            catch (error) {
                throw new Error(`Erro ao listar drivers: ${error.message}`);
            }
        });
    }
    // Atualizar driver
    updateDriver(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const driver = yield Driver_1.Driver.findByIdAndUpdate(id, Object.assign(Object.assign({}, updateData), (updateData.currentLocation && {
                    currentLocation: Object.assign(Object.assign({}, updateData.currentLocation), { lastUpdated: new Date(), geoPoint: {
                            type: 'Point',
                            coordinates: [updateData.currentLocation.longitude, updateData.currentLocation.latitude]
                        } })
                })), { new: true }).populate('user', 'userId email phoneNumber role');
                return driver;
            }
            catch (error) {
                throw new Error(`Erro ao atualizar driver: ${error.message}`);
            }
        });
    }
    // Buscar drivers disponíveis
    findAvailableDrivers(pickupLocation_1, deliveryArea_1) {
        return __awaiter(this, arguments, void 0, function* (pickupLocation, deliveryArea, maxDistance = 5000 // 5km padrão
        ) {
            try {
                const drivers = yield Driver_1.Driver.find(Object.assign({ isAvailable: true, isVerified: true }, (deliveryArea ? { deliveryAreas: deliveryArea } : {})))
                    .populate('user', 'userId email phoneNumber role')
                    .exec();
                return drivers
                    .filter((driver) => {
                    if (!driver.currentLocation) {
                        return false;
                    }
                    const distance = this.calculateDistanceInMeters(pickupLocation.latitude, pickupLocation.longitude, driver.currentLocation.latitude, driver.currentLocation.longitude);
                    return distance <= maxDistance;
                })
                    .sort((driverA, driverB) => {
                    if (driverB.rating !== driverA.rating) {
                        return driverB.rating - driverA.rating;
                    }
                    return driverA.averageDeliveryTime - driverB.averageDeliveryTime;
                })
                    .slice(0, 10);
            }
            catch (error) {
                throw new Error(`Erro ao buscar drivers disponíveis: ${error.message}`);
            }
        });
    }
    // Atribuir driver a um pedido
    assignDriverToOrder(orderId, driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const driver = yield Driver_1.Driver.findById(driverId);
                if (!driver) {
                    throw new Error('Driver não encontrado');
                }
                if (!driver.isAvailable || !driver.isVerified) {
                    throw new Error('Driver não está disponível ou não foi verificado');
                }
                const existingDelivery = yield Delivery_1.Delivery.findOne({ order: new mongoose_1.Types.ObjectId(orderId) }).exec();
                if (existingDelivery) {
                    throw new Error('Já existe uma entrega atribuída para este pedido');
                }
                // Criar entrega
                const delivery = new Delivery_1.Delivery({
                    order: new mongoose_1.Types.ObjectId(orderId),
                    driver: driver.userId, // Usar userId do driver
                    status: 'picked_up',
                    currentLocation: driver.currentLocation
                        ? {
                            lat: driver.currentLocation.latitude,
                            lng: driver.currentLocation.longitude
                        }
                        : undefined,
                    assignedAt: new Date()
                });
                yield delivery.save();
                // Atualizar status do driver
                yield Driver_1.Driver.findByIdAndUpdate(driverId, {
                    isAvailable: false
                });
                // Atualizar status do pedido
                yield Order_1.Order.findByIdAndUpdate(orderId, {
                    status: 'out_for_delivery'
                });
                // Enviar notificação ao driver
                yield this.notificationService.createNotification(driver.userId.toString(), 'order_status', 'Novo pedido atribuído! Verifique os detalhes.', {
                    orderId,
                    deliveryId: delivery._id.toString(),
                    metadata: { status: 'picked_up' }
                });
                return {
                    delivery,
                    driver: yield driver.populate('user', 'userId email phoneNumber')
                };
            }
            catch (error) {
                throw new Error(`Erro ao atribuir driver: ${error.message}`);
            }
        });
    }
    // Atualizar localização do driver
    updateDriverLocation(driverId, location) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const driver = yield Driver_1.Driver.findByIdAndUpdate(driverId, {
                    currentLocation: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        lastUpdated: new Date(),
                        geoPoint: {
                            type: 'Point',
                            coordinates: [location.longitude, location.latitude]
                        }
                    }
                }, { new: true }).populate('user', 'userId email phoneNumber role');
                return driver;
            }
            catch (error) {
                throw new Error(`Erro ao atualizar localização: ${error.message}`);
            }
        });
    }
    // Completar entrega
    completeDelivery(deliveryId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const delivery = yield Delivery_1.Delivery.findById(deliveryId);
                if (!delivery) {
                    throw new Error('Entrega não encontrada');
                }
                if (delivery.status === 'delivered') {
                    const existingDriver = yield Driver_1.Driver.findOne({ userId: delivery.driver }).exec();
                    return {
                        delivery,
                        driver: existingDriver ? yield existingDriver.populate('user', 'userId email phoneNumber') : null
                    };
                }
                delivery.status = 'delivered';
                delivery.deliveredAt = new Date();
                yield delivery.save();
                // Atualizar driver
                const driver = yield Driver_1.Driver.findOne({ userId: delivery.driver });
                if (driver) {
                    const deliveryTime = (((_a = delivery.deliveredAt) === null || _a === void 0 ? void 0 : _a.getTime()) || Date.now()) - delivery.createdAt.getTime();
                    driver.totalDeliveries += 1;
                    driver.completedDeliveries += 1;
                    const totalTime = (driver.averageDeliveryTime * (driver.completedDeliveries - 1)) + deliveryTime;
                    driver.averageDeliveryTime = totalTime / driver.completedDeliveries;
                    driver.isAvailable = true;
                    yield driver.save();
                }
                const order = yield Order_1.Order.findByIdAndUpdate(delivery.order, {
                    status: 'delivered',
                    actualDeliveryTime: delivery.deliveredAt
                }, { new: true });
                if (order) {
                    yield this.notificationService.createNotification(order.customer.toString(), 'order_status', 'Seu pedido foi entregue! Obrigado por escolher nossos serviços.', {
                        orderId: order._id.toString(),
                        deliveryId,
                        metadata: { status: 'delivered' }
                    });
                }
                return {
                    delivery,
                    driver: driver ? yield driver.populate('user', 'userId email phoneNumber') : null
                };
            }
            catch (error) {
                throw new Error(`Erro ao completar entrega: ${error.message}`);
            }
        });
    }
    // Atualizar rating do driver
    updateDriverRating(driverId, rating) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (rating < 1 || rating > 5) {
                    throw new Error('Rating deve estar entre 1 e 5');
                }
                const driver = yield Driver_1.Driver.findById(driverId);
                if (!driver) {
                    throw new Error('Driver não encontrado');
                }
                // Atualizar rating manualmente
                const newRating = ((driver.rating * driver.reviewCount) + rating) / (driver.reviewCount + 1);
                driver.rating = newRating;
                driver.reviewCount += 1;
                yield driver.save();
                return yield driver.populate('user', 'userId email phoneNumber role');
            }
            catch (error) {
                throw new Error(`Erro ao atualizar rating: ${error.message}`);
            }
        });
    }
    // Obter estatísticas do driver
    getDriverStats(driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const driver = yield Driver_1.Driver.findById(driverId);
                if (!driver) {
                    throw new Error('Driver não encontrado');
                }
                // Obter estatísticas de entregas
                const deliveryStats = yield Delivery_1.Delivery.aggregate([
                    { $match: { driver: driver.userId } },
                    {
                        $group: {
                            _id: null,
                            totalDeliveries: { $sum: 1 },
                            completedDeliveries: {
                                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                            },
                            averageDeliveryTime: {
                                $avg: {
                                    $cond: [
                                        { $and: [{ $eq: ['$status', 'delivered'] }, { $ifNull: ['$deliveredAt', false] }] },
                                        { $subtract: ['$deliveredAt', '$createdAt'] },
                                        null
                                    ]
                                }
                            }
                        }
                    }
                ]);
                const recentDeliveries = yield Delivery_1.Delivery.find({ driver: driver.userId })
                    .populate('order', 'status paymentStatus payableTotal total deliveryFee')
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .exec();
                const orderStats = yield Delivery_1.Delivery.aggregate([
                    { $match: { driver: driver.userId } },
                    {
                        $lookup: {
                            from: 'orders',
                            localField: 'order',
                            foreignField: '_id',
                            as: 'order'
                        }
                    },
                    { $unwind: '$order' },
                    {
                        $group: {
                            _id: null,
                            assignedOrders: { $sum: 1 },
                            deliveredOrders: {
                                $sum: { $cond: [{ $eq: ['$order.status', 'delivered'] }, 1, 0] }
                            },
                            failedOrders: {
                                $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                            },
                            totalDeliveryFeesHandled: { $sum: '$order.deliveryFee' },
                            totalOrderValueHandled: {
                                $sum: { $ifNull: ['$order.payableTotal', '$order.total'] }
                            }
                        }
                    }
                ]);
                return {
                    driverId: driver._id,
                    userId: driver.userId,
                    licenseNumber: driver.licenseNumber,
                    rating: driver.rating,
                    reviewCount: driver.reviewCount,
                    totalDeliveries: driver.totalDeliveries,
                    completedDeliveries: driver.completedDeliveries,
                    averageDeliveryTime: driver.averageDeliveryTime,
                    isAvailable: driver.isAvailable,
                    isVerified: driver.isVerified,
                    deliveryStats: deliveryStats[0] || {
                        totalDeliveries: 0,
                        completedDeliveries: 0,
                        averageDeliveryTime: 0
                    },
                    orderStats: orderStats[0] || {
                        assignedOrders: 0,
                        deliveredOrders: 0,
                        failedOrders: 0,
                        totalDeliveryFeesHandled: 0,
                        totalOrderValueHandled: 0
                    },
                    recentDeliveries
                };
            }
            catch (error) {
                throw new Error(`Erro ao obter estatísticas: ${error.message}`);
            }
        });
    }
    /**
     * Obter ganhos do driver (comissões) em um período
     */
    getDriverEarnings(driverId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = yield Driver_1.Driver.findById(driverId);
            if (!driver) {
                throw new Error('Driver não encontrado');
            }
            // Delivery.driver guarda o userId do driver em alguns fluxos;
            // para simplificar, consideramos ambos: userId e driverId.
            const match = {
                status: 'delivered',
                $or: [
                    { driver: driver.userId },
                    { driver: new mongoose_1.Types.ObjectId(driverId) }
                ]
            };
            if (startDate || endDate) {
                match.createdAt = {};
                if (startDate)
                    match.createdAt.$gte = startDate;
                if (endDate)
                    match.createdAt.$lte = endDate;
            }
            const deliveries = yield Delivery_1.Delivery.find(match)
                .populate('order', 'deliveryFee createdAt')
                .exec();
            let totalEarnings = 0;
            const detailed = deliveries.map(d => {
                var _a;
                const order = d.order;
                const deliveryFee = (order === null || order === void 0 ? void 0 : order.deliveryFee) || 0;
                const commission = deliveryFee * this.driverCommissionRate;
                totalEarnings += commission;
                return {
                    deliveryId: d._id.toString(),
                    orderId: ((_a = order === null || order === void 0 ? void 0 : order._id) === null || _a === void 0 ? void 0 : _a.toString()) || '',
                    deliveryFee,
                    commission,
                    createdAt: (order === null || order === void 0 ? void 0 : order.createdAt) || d.createdAt
                };
            });
            return {
                driverId,
                totalDeliveries: deliveries.length,
                totalEarnings,
                deliveries: detailed
            };
        });
    }
    // Verificar driver
    verifyDriver(driverId, isVerified) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const driver = yield Driver_1.Driver.findByIdAndUpdate(driverId, { isVerified }, { new: true }).populate('user', 'userId email phoneNumber role');
                if (driver) {
                    // Enviar notificação
                    yield this.notificationService.createNotification(driver.userId.toString(), 'order_status', isVerified
                        ? 'Seu cadastro foi aprovado! Você já pode receber pedidos.'
                        : 'Seu cadastro está em análise. Em breve você receberá uma resposta.');
                }
                return driver;
            }
            catch (error) {
                throw new Error(`Erro ao verificar driver: ${error.message}`);
            }
        });
    }
    // Deletar driver (soft delete)
    deleteDriver(driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const driver = yield Driver_1.Driver.findByIdAndUpdate(driverId, { isAvailable: false, isVerified: false }, { new: true });
                if (driver) {
                    // Desativar User também
                    yield User_1.User.findByIdAndUpdate(driver.userId, { isActive: false });
                    // Enviar notificação
                    yield this.notificationService.createNotification(driver.userId.toString(), 'order_status', 'Seu perfil de driver foi desativado.');
                }
                return !!driver;
            }
            catch (error) {
                throw new Error(`Erro ao deletar driver: ${error.message}`);
            }
        });
    }
}
exports.DriverService = new DriverServices();
