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
exports.PersonalDeliveryService = void 0;
const mongoose_1 = require("mongoose");
const PersonalDelivery_1 = require("../../models/PersonalDelivery");
const User_1 = require("../../models/User");
const Driver_1 = require("../../models/Driver");
const driver_service_1 = require("../driver/driver.service");
const notification_service_1 = require("../notification/notification.service");
class PersonalDeliveryServiceClass {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
    }
    getCategoryMultiplier(category) {
        switch (category) {
            case 'documents':
                return 0.85;
            case 'electronics':
                return 1.2;
            case 'furniture':
                return 1.45;
            case 'appliances':
                return 1.35;
            default:
                return 1;
        }
    }
    getVolumetricWeight(items) {
        return items.reduce((sum, item) => {
            if (!item.dimensions) {
                return sum;
            }
            const volumeCm = item.dimensions.length * item.dimensions.width * item.dimensions.height;
            const volumetricWeight = volumeCm / 5000;
            return sum + volumetricWeight * item.quantity;
        }, 0);
    }
    /**
     * Criar nova entrega pessoal
     */
    createPersonalDelivery(deliveryData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validar se o cliente existe
                const customer = yield User_1.User.findById(deliveryData.customerId);
                if (!customer) {
                    throw new Error('Cliente não encontrado');
                }
                // Calcular taxa de entrega baseada na distância e peso
                const deliveryFee = yield this.calculateDeliveryFee(deliveryData.pickupAddress, deliveryData.deliveryAddress, deliveryData.items, deliveryData.category, deliveryData.signatureRequired !== false);
                // Calcular taxa de seguro se necessário
                let insuranceFee = 0;
                if (deliveryData.insuranceRequired || deliveryData.estimatedValue > 1000) {
                    insuranceFee = deliveryData.estimatedValue * 0.02; // 2% do valor estimado
                }
                // Calcular peso total
                const totalWeight = deliveryData.items.reduce((sum, item) => {
                    return sum + (item.weight || 0) * item.quantity;
                }, 0);
                const personalDelivery = new PersonalDelivery_1.PersonalDelivery({
                    customer: new mongoose_1.Types.ObjectId(deliveryData.customerId),
                    pickupAddress: deliveryData.pickupAddress,
                    deliveryAddress: deliveryData.deliveryAddress,
                    items: deliveryData.items,
                    category: deliveryData.category,
                    totalWeight,
                    estimatedValue: deliveryData.estimatedValue,
                    deliveryFee,
                    insuranceFee,
                    total: deliveryFee + insuranceFee,
                    paymentMethod: deliveryData.paymentMethod,
                    notes: deliveryData.notes,
                    insuranceRequired: deliveryData.insuranceRequired || false,
                    signatureRequired: deliveryData.signatureRequired !== false // true por padrão
                });
                const savedDelivery = yield personalDelivery.save();
                // Notificar cliente sobre criação da entrega
                yield this.notifyCustomerDeliveryCreated(savedDelivery);
                return savedDelivery;
            }
            catch (error) {
                throw new Error(`Erro ao criar entrega pessoal: ${error.message}`);
            }
        });
    }
    /**
     * Calcular taxa de entrega
     */
    calculateDeliveryFee(pickupAddress, deliveryAddress, items, category, signatureRequired) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const distance = this.calculateDistance(((_a = pickupAddress.coordinates) === null || _a === void 0 ? void 0 : _a.lat) || 0, ((_b = pickupAddress.coordinates) === null || _b === void 0 ? void 0 : _b.lng) || 0, ((_c = deliveryAddress.coordinates) === null || _c === void 0 ? void 0 : _c.lat) || 0, ((_d = deliveryAddress.coordinates) === null || _d === void 0 ? void 0 : _d.lng) || 0);
            const actualWeight = items.reduce((sum, item) => {
                return sum + (item.weight || 0) * item.quantity;
            }, 0);
            const volumetricWeight = this.getVolumetricWeight(items);
            const chargeableWeight = Math.max(actualWeight, volumetricWeight);
            const fragileItems = items.filter(item => item.isFragile);
            const bulkyItems = items.filter((item) => {
                if (!item.dimensions) {
                    return false;
                }
                return item.dimensions.length > 100 || item.dimensions.width > 80 || item.dimensions.height > 80;
            });
            const zoneMultiplier = distance <= 3 ? 1 : distance <= 8 ? 1.12 : distance <= 15 ? 1.28 : 1.45;
            const categoryMultiplier = this.getCategoryMultiplier(category);
            let fee = 65;
            fee += distance * 12;
            fee += chargeableWeight * 6;
            fee += fragileItems.length * 25;
            fee += bulkyItems.length * 30;
            if (signatureRequired) {
                fee += 15;
            }
            fee *= zoneMultiplier;
            fee *= categoryMultiplier;
            return Math.max(75, Math.round(fee));
        });
    }
    /**
     * Calcular distância usando fórmula de Haversine
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
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
    /**
     * Buscar entrega pessoal por ID
     */
    getPersonalDeliveryById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield PersonalDelivery_1.PersonalDelivery.findById(id)
                    .populate('customer', 'userId email phoneNumber')
                    .populate('driver', 'licenseNumber vehicleInfo rating')
                    .exec();
            }
            catch (error) {
                throw new Error(`Erro ao buscar entrega pessoal: ${error.message}`);
            }
        });
    }
    /**
     * Listar entregas pessoais do cliente
     */
    getCustomerPersonalDeliveries(customerId_1) {
        return __awaiter(this, arguments, void 0, function* (customerId, page = 1, limit = 10) {
            try {
                const skip = (page - 1) * limit;
                const [deliveries, total] = yield Promise.all([
                    PersonalDelivery_1.PersonalDelivery.find({ customer: new mongoose_1.Types.ObjectId(customerId) })
                        .populate('driver', 'licenseNumber vehicleInfo rating')
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .exec(),
                    PersonalDelivery_1.PersonalDelivery.countDocuments({ customer: new mongoose_1.Types.ObjectId(customerId) })
                ]);
                return {
                    deliveries,
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page
                };
            }
            catch (error) {
                throw new Error(`Erro ao buscar entregas pessoais: ${error.message}`);
            }
        });
    }
    /**
     * Atualizar entrega pessoal
     */
    updatePersonalDelivery(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const delivery = yield PersonalDelivery_1.PersonalDelivery.findByIdAndUpdate(id, updateData, { new: true })
                    .populate('customer', 'userId email phoneNumber')
                    .populate('driver', 'licenseNumber vehicleInfo rating')
                    .exec();
                if (delivery && updateData.status) {
                    yield this.notifyStatusChange(delivery, updateData.status);
                }
                return delivery;
            }
            catch (error) {
                throw new Error(`Erro ao atualizar entrega pessoal: ${error.message}`);
            }
        });
    }
    /**
     * Atribuir driver à entrega
     */
    assignDriver(deliveryId, driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const delivery = yield PersonalDelivery_1.PersonalDelivery.findById(deliveryId);
                if (!delivery) {
                    throw new Error('Entrega pessoal não encontrada');
                }
                let driver;
                if (driverId) {
                    driver = yield Driver_1.Driver.findById(driverId);
                    if (!driver || !driver.isAvailable) {
                        throw new Error('Driver não está disponível');
                    }
                }
                else {
                    // Encontrar driver automaticamente
                    const availableDrivers = yield driver_service_1.DriverService.findAvailableDrivers({
                        latitude: ((_a = delivery.pickupAddress.coordinates) === null || _a === void 0 ? void 0 : _a.lat) || 0,
                        longitude: ((_b = delivery.pickupAddress.coordinates) === null || _b === void 0 ? void 0 : _b.lng) || 0
                    }, delivery.pickupAddress.district || '', 5000);
                    if (availableDrivers.length === 0) {
                        throw new Error('Nenhum driver disponível encontrado');
                    }
                    driver = availableDrivers[0];
                }
                // Atualizar entrega
                delivery.driver = driver._id;
                delivery.status = 'confirmed';
                delivery.estimatedPickupTime = new Date(Date.now() + 30 * 60000); // 30 min
                delivery.estimatedDeliveryTime = new Date(Date.now() + 90 * 60000); // 90 min
                const updatedDelivery = yield delivery.save();
                // Notificar cliente
                yield this.notifyDriverAssigned(updatedDelivery, driver);
                return updatedDelivery;
            }
            catch (error) {
                throw new Error(`Erro ao atribuir driver: ${error.message}`);
            }
        });
    }
    /**
     * Cancelar entrega pessoal
     */
    cancelPersonalDelivery(deliveryId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const delivery = yield PersonalDelivery_1.PersonalDelivery.findByIdAndUpdate(deliveryId, {
                    status: 'cancelled',
                    paymentStatus: 'refunded',
                    notes: reason
                }, { new: true })
                    .populate('customer', 'userId email phoneNumber')
                    .populate('driver', 'licenseNumber vehicleInfo rating')
                    .exec();
                if (delivery) {
                    yield this.notifyCancellation(delivery, reason);
                }
                return delivery;
            }
            catch (error) {
                throw new Error(`Erro ao cancelar entrega pessoal: ${error.message}`);
            }
        });
    }
    /**
     * Notificar cliente sobre criação da entrega
     */
    notifyCustomerDeliveryCreated(delivery) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const message = `Sua entrega pessoal foi criada com sucesso! Taxa: ${delivery.deliveryFee} MT, Total: ${delivery.total} MT`;
                yield this.notificationService.createNotification(delivery.customer.toString(), 'delivery_update', message, {
                    personalDeliveryId: (_a = delivery._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    metadata: {
                        status: delivery.status,
                        total: delivery.total
                    }
                });
                console.log(`✅ Notificação de criação enviada para cliente - Entrega ${delivery._id}`);
            }
            catch (error) {
                console.error('❌ Erro ao notificar criação:', error.message);
            }
        });
    }
    /**
     * Notificar sobre mudança de status
     */
    notifyStatusChange(delivery, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const statusMessages = {
                    'confirmed': 'Sua entrega foi confirmada! Driver será atribuído em breve.',
                    'picked_up': 'Seus itens foram coletados e estão a caminho!',
                    'in_transit': 'Sua entrega está em trânsito!',
                    'delivered': 'Sua entrega foi entregue com sucesso!',
                    'cancelled': 'Sua entrega foi cancelada.'
                };
                const message = statusMessages[newStatus] ||
                    `Status da entrega atualizado para: ${newStatus}`;
                yield this.notificationService.createNotification(delivery.customer.toString(), 'delivery_update', message, {
                    personalDeliveryId: (_a = delivery._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    metadata: {
                        status: newStatus
                    }
                });
                console.log(`✅ Notificação de status enviada: ${newStatus} - Entrega ${delivery._id}`);
            }
            catch (error) {
                console.error('❌ Erro ao notificar mudança de status:', error.message);
            }
        });
    }
    /**
     * Notificar sobre driver atribuído
     */
    notifyDriverAssigned(delivery, driver) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const message = `Driver ${driver.licenseNumber} foi atribuído à sua entrega. Tempo estimado de coleta: 30 minutos.`;
                yield this.notificationService.createNotification(delivery.customer.toString(), 'delivery_update', message, {
                    personalDeliveryId: (_a = delivery._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    metadata: {
                        status: delivery.status,
                        driverId: ((_c = (_b = driver._id) === null || _b === void 0 ? void 0 : _b.toString) === null || _c === void 0 ? void 0 : _c.call(_b)) || ((_e = (_d = driver.userId) === null || _d === void 0 ? void 0 : _d.toString) === null || _e === void 0 ? void 0 : _e.call(_d))
                    }
                });
                console.log(`✅ Notificação de driver atribuído enviada - Entrega ${delivery._id}`);
            }
            catch (error) {
                console.error('❌ Erro ao notificar atribuição de driver:', error.message);
            }
        });
    }
    /**
     * Notificar sobre cancelamento
     */
    notifyCancellation(delivery, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const message = reason
                    ? `Sua entrega foi cancelada. Motivo: ${reason}`
                    : 'Sua entrega foi cancelada.';
                yield this.notificationService.createNotification(delivery.customer.toString(), 'delivery_update', message, {
                    personalDeliveryId: (_a = delivery._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    metadata: {
                        status: 'cancelled',
                        reason
                    }
                });
                console.log(`✅ Notificação de cancelamento enviada - Entrega ${delivery._id}`);
            }
            catch (error) {
                console.error('❌ Erro ao notificar cancelamento:', error.message);
            }
        });
    }
}
exports.PersonalDeliveryService = new PersonalDeliveryServiceClass();
