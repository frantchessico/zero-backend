"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.VendorService = void 0;
const mongoose_1 = require("mongoose");
const Vendor_1 = require("../../models/Vendor");
const Payment_1 = require("../../models/Payment");
class VendorService {
    /**
     * Criar um novo vendor
     */
    createVendor(vendorData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const vendor = new Vendor_1.Vendor(vendorData);
                return yield vendor.save();
            }
            catch (error) {
                throw error;
            }
        });
    }
    /**
     * Obter saldo e resumo financeiro do vendor (com base em Payments)
     */
    getVendorBalance(vendorId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = {
                vendor: new mongoose_1.Types.ObjectId(vendorId),
                status: { $in: ['paid', 'refunded'] }
            };
            if (startDate || endDate) {
                match.$or = [
                    {
                        paidAt: Object.assign(Object.assign({}, (startDate ? { $gte: startDate } : {})), (endDate ? { $lte: endDate } : {}))
                    },
                    {
                        refundedAt: Object.assign(Object.assign({}, (startDate ? { $gte: startDate } : {})), (endDate ? { $lte: endDate } : {}))
                    }
                ];
            }
            const payments = yield Payment_1.Payment.find(match).exec();
            const byMethod = {};
            let grossReceived = 0;
            let refundedAmount = 0;
            let totalPaidTransactions = 0;
            let totalRefundedTransactions = 0;
            payments.forEach(p => {
                const method = p.method || 'unknown';
                if (!byMethod[method]) {
                    byMethod[method] = { total: 0, count: 0 };
                }
                const signedAmount = p.status === 'refunded' ? -p.amount : p.amount;
                byMethod[method].total += signedAmount;
                byMethod[method].count += 1;
                if (p.status === 'refunded') {
                    refundedAmount += p.amount;
                    totalRefundedTransactions += 1;
                }
                else {
                    grossReceived += p.amount;
                    totalPaidTransactions += 1;
                }
            });
            const netReceived = grossReceived - refundedAmount;
            return {
                vendorId,
                grossReceived,
                refundedAmount,
                netReceived,
                totalReceived: netReceived,
                totalPaidTransactions,
                totalRefundedTransactions,
                byMethod
            };
        });
    }
    /**
     * Buscar vendor por ID
     */
    getVendorById(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findById(vendorId)
                .populate('owner', 'userId email phoneNumber')
                .exec();
        });
    }
    /**
     * Buscar vendor por owner (dono)
     */
    getVendorByOwner(ownerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findOne({ owner: new mongoose_1.Types.ObjectId(ownerId) })
                .populate('owner', 'userId email phoneNumber')
                .exec();
        });
    }
    /**
     * Listar todos os vendors com filtros
     */
    getAllVendors() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 10, filters = {}) {
            const skip = (page - 1) * limit;
            const query = {};
            // Aplicar filtros
            if (filters.type)
                query.type = filters.type;
            if (filters.status)
                query.status = filters.status;
            if (filters.city)
                query['address.city'] = new RegExp(filters.city, 'i');
            if (filters.district)
                query['address.district'] = new RegExp(filters.district, 'i');
            if (filters.open24h !== undefined)
                query.open24h = filters.open24h;
            if (filters.temporarilyClosed !== undefined)
                query.temporarilyClosed = filters.temporarilyClosed;
            const [vendors, total] = yield Promise.all([
                Vendor_1.Vendor.find(query)
                    .populate('owner', 'userId email phoneNumber')
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 })
                    .exec(),
                Vendor_1.Vendor.countDocuments(query)
            ]);
            return {
                vendors,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    /**
     * Buscar vendors por tipo
     */
    getVendorsByType(type) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.find({ type, status: 'active' })
                .populate('owner', 'userId email phoneNumber')
                .sort({ name: 1 })
                .exec();
        });
    }
    /**
     * Buscar vendors ativos
     */
    getActiveVendors() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.find({
                status: 'active',
                temporarilyClosed: { $ne: true }
            })
                .populate('owner', 'userId email phoneNumber')
                .sort({ name: 1 })
                .exec();
        });
    }
    /**
     * Buscar vendors por localização (cidade/distrito)
     */
    getVendorsByLocation(city, district) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = { status: 'active' };
            if (city) {
                query['address.city'] = new RegExp(city, 'i');
            }
            if (district) {
                query['address.district'] = new RegExp(district, 'i');
            }
            return yield Vendor_1.Vendor.find(query)
                .populate('owner', 'userId email phoneNumber')
                .sort({ name: 1 })
                .exec();
        });
    }
    /**
     * Buscar vendors próximos por coordenadas
     */
    getNearbyVendors(latitude_1, longitude_1) {
        return __awaiter(this, arguments, void 0, function* (latitude, longitude, radiusInKm = 5) {
            // Converter km para graus (aproximadamente)
            const radiusInDegrees = radiusInKm / 111.32;
            return yield Vendor_1.Vendor.find({
                status: 'active',
                temporarilyClosed: { $ne: true },
                'address.coordinates.lat': {
                    $gte: latitude - radiusInDegrees,
                    $lte: latitude + radiusInDegrees
                },
                'address.coordinates.lng': {
                    $gte: longitude - radiusInDegrees,
                    $lte: longitude + radiusInDegrees
                }
            })
                .populate('owner', 'userId email phoneNumber')
                .exec();
        });
    }
    /**
     * Atualizar vendor
     */
    updateVendor(vendorId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, { $set: updateData }, { new: true, runValidators: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Deletar vendor
     */
    deleteVendor(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Vendor_1.Vendor.findByIdAndDelete(vendorId);
            return !!result;
        });
    }
    /**
     * Suspender vendor
     */
    suspendVendor(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, { $set: { status: 'suspended' } }, { new: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Reativar vendor
     */
    reactivateVendor(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, { $set: { status: 'active' } }, { new: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Fechar temporariamente
     */
    closeTemporarily(vendorId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = { temporarilyClosed: true };
            if (message)
                updateData.closedMessage = message;
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, { $set: updateData }, { new: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Reabrir vendor
     */
    reopenVendor(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, {
                $set: { temporarilyClosed: false },
                $unset: { closedMessage: 1 }
            }, { new: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Atualizar horário de funcionamento
     */
    updateWorkingHours(vendorId, workingHours) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, { $set: { workingHours } }, { new: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Adicionar/atualizar horário para um dia específico
     */
    updateDayWorkingHour(vendorId, day, hourData) {
        return __awaiter(this, void 0, void 0, function* () {
            const vendor = yield Vendor_1.Vendor.findById(vendorId);
            if (!vendor)
                return null;
            const existingHourIndex = vendor.workingHours.findIndex(wh => wh.day === day);
            if (existingHourIndex >= 0) {
                // Atualizar horário existente
                vendor.workingHours[existingHourIndex] = Object.assign({ day }, hourData);
            }
            else {
                // Adicionar novo horário
                vendor.workingHours.push(Object.assign({ day }, hourData));
            }
            return yield vendor.save();
        });
    }
    /**
     * Atualizar endereço
     */
    updateAddress(vendorId, address) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.findByIdAndUpdate(vendorId, { $set: { address } }, { new: true }).populate('owner', 'userId email phoneNumber');
        });
    }
    /**
     * Verificar se vendor está aberto agora
     */
    isVendorOpen(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const vendor = yield Vendor_1.Vendor.findById(vendorId);
            if (!vendor) {
                return { isOpen: false, reason: 'Vendor não encontrado' };
            }
            if (vendor.status !== 'active') {
                return { isOpen: false, reason: 'Vendor suspenso' };
            }
            if (vendor.temporarilyClosed) {
                return {
                    isOpen: false,
                    reason: vendor.closedMessage || 'Temporariamente fechado'
                };
            }
            if (vendor.open24h) {
                return { isOpen: true };
            }
            const now = new Date();
            const currentDay = now.getDay(); // 0 = Sunday
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM
            const todayHours = vendor.workingHours.find(wh => wh.day === currentDay);
            if (!todayHours || !todayHours.active) {
                // Buscar próximo dia aberto
                const nextOpenDay = vendor.workingHours
                    .filter(wh => wh.active && wh.open && wh.close)
                    .find(wh => wh.day > currentDay) ||
                    vendor.workingHours.filter(wh => wh.active && wh.open && wh.close)[0];
                return {
                    isOpen: false,
                    reason: 'Fechado hoje',
                    nextOpenTime: nextOpenDay ? `Dia ${nextOpenDay.day} às ${nextOpenDay.open}` : undefined
                };
            }
            if (!todayHours.open || !todayHours.close) {
                return { isOpen: false, reason: 'Horários não definidos' };
            }
            const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;
            return {
                isOpen,
                reason: isOpen ? undefined : 'Fora do horário de funcionamento',
                nextOpenTime: !isOpen ? `${todayHours.open}` : undefined
            };
        });
    }
    /**
     * Buscar por nome (busca parcial)
     */
    searchVendorsByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Vendor_1.Vendor.find({
                name: new RegExp(name, 'i'),
                status: 'active'
            })
                .populate('owner', 'userId email phoneNumber')
                .sort({ name: 1 })
                .exec();
        });
    }
    /**
     * Contar vendors por tipo
     */
    countVendorsByType() {
        return __awaiter(this, void 0, void 0, function* () {
            const [restaurant, pharmacy, electronics, service] = yield Promise.all([
                Vendor_1.Vendor.countDocuments({ type: 'restaurant', status: 'active' }),
                Vendor_1.Vendor.countDocuments({ type: 'pharmacy', status: 'active' }),
                Vendor_1.Vendor.countDocuments({ type: 'electronics', status: 'active' }),
                Vendor_1.Vendor.countDocuments({ type: 'service', status: 'active' })
            ]);
            return {
                restaurant,
                pharmacy,
                electronics,
                service,
                total: restaurant + pharmacy + electronics + service
            };
        });
    }
    /**
     * Contar vendors por status
     */
    countVendorsByStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const [active, suspended, temporarilyClosed] = yield Promise.all([
                Vendor_1.Vendor.countDocuments({ status: 'active', temporarilyClosed: { $ne: true } }),
                Vendor_1.Vendor.countDocuments({ status: 'suspended' }),
                Vendor_1.Vendor.countDocuments({ temporarilyClosed: true })
            ]);
            return { active, suspended, temporarilyClosed };
        });
    }
    getVendorStatsByStatus(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const Order = (yield Promise.resolve().then(() => __importStar(require('../../models/Order')))).Order;
            const Delivery = (yield Promise.resolve().then(() => __importStar(require('../../models/Delivery')))).Delivery;
            const ordersByStatus = yield Order.aggregate([
                { $match: { vendor: new mongoose_1.Types.ObjectId(vendorId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);
            const vendorOrders = yield Order.find({ vendor: new mongoose_1.Types.ObjectId(vendorId) }).select('_id');
            const deliveryStats = yield Delivery.aggregate([
                { $match: { order: { $in: vendorOrders.map(order => order._id) } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                        active: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['picked_up', 'in_transit']] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);
            const orders = {};
            ordersByStatus.forEach((stat) => {
                orders[stat._id] = stat.count;
            });
            return {
                vendorId,
                orders,
                deliveries: deliveryStats[0] || {
                    total: 0,
                    delivered: 0,
                    failed: 0,
                    active: 0
                }
            };
        });
    }
    /**
     * Verificar se vendor existe
     */
    vendorExists(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const vendor = yield Vendor_1.Vendor.findById(vendorId);
            return !!vendor;
        });
    }
}
exports.VendorService = VendorService;
