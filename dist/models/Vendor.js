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
exports.Vendor = exports.VendorSchema = void 0;
const mongoose_1 = require("mongoose");
const WorkingHourSchema = new mongoose_1.Schema({
    day: { type: Number, required: true }, // 0 = Sunday
    open: { type: String },
    close: { type: String },
    active: { type: Boolean, default: true }
}, { _id: false });
exports.VendorSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['restaurant', 'pharmacy', 'electronics', 'service'], required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    address: {
        street: String,
        district: String,
        city: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    open24h: { type: Boolean, default: false },
    temporarilyClosed: { type: Boolean, default: false },
    closedMessage: { type: String },
    workingHours: [WorkingHourSchema]
}, {
    timestamps: true
});
// ===== VIRTUALS BIDIRECIONAIS =====
// Virtual para produtos do vendor
exports.VendorSchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'vendor',
    justOne: false
});
// Virtual para orders do vendor
exports.VendorSchema.virtual('orders', {
    ref: 'Order',
    localField: '_id',
    foreignField: 'vendor',
    justOne: false
});
// Virtual para owner do vendor
exports.VendorSchema.virtual('ownerDetails', {
    ref: 'User',
    localField: 'owner',
    foreignField: '_id',
    justOne: true
});
// Virtual para calcular total de produtos
exports.VendorSchema.virtual('totalProducts').get(function () {
    return this.products ? this.products.length : 0;
});
// Virtual para calcular total de orders
exports.VendorSchema.virtual('totalOrders').get(function () {
    return this.orders ? this.orders.length : 0;
});
// Virtual para verificar se está aberto
exports.VendorSchema.virtual('isOpen').get(function () {
    if (this.open24h)
        return true;
    if (this.temporarilyClosed)
        return false;
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const workingHour = this.workingHours.find(wh => wh.day === currentDay);
    if (!workingHour || !workingHour.active)
        return false;
    if (workingHour.open && currentTime < workingHour.open)
        return false;
    if (workingHour.close && currentTime > workingHour.close)
        return false;
    return true;
});
// ===== MIDDLEWARE DE VALIDAÇÃO =====
// Validar relacionamentos antes de salvar
exports.VendorSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validar se owner existe e tem role vendor
            const User = (0, mongoose_1.model)('User');
            const owner = yield User.findById(this.owner);
            if (!owner) {
                return next(new Error('Owner não encontrado'));
            }
            if (owner.role !== 'vendor') {
                return next(new Error('Owner deve ter role vendor'));
            }
            if (!owner.isActive) {
                return next(new Error('Owner deve estar ativo'));
            }
            // Validar se já existe vendor para este owner
            if (this.isNew) {
                const existingVendor = yield (0, mongoose_1.model)('Vendor').findOne({ owner: this.owner });
                if (existingVendor) {
                    return next(new Error('Owner já possui um estabelecimento'));
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
// ===== TRIGGERS AUTOMÁTICOS =====
// Atualizar owner quando vendor é criado
exports.VendorSchema.post('save', function (doc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Criar notificação para owner
            const Notification = (0, mongoose_1.model)('Notification');
            yield Notification.create({
                user: doc.owner,
                type: 'vendor_status',
                message: `Estabelecimento "${doc.name}" criado com sucesso`
            });
        }
        catch (error) {
            console.error('Error creating vendor notification:', error);
        }
    });
});
// Atualizar produtos quando vendor é suspenso
exports.VendorSchema.post('findOneAndUpdate', function (doc) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (doc && ((_a = this.getUpdate()) === null || _a === void 0 ? void 0 : _a.status) === 'suspended') {
            try {
                // Desativar todos os produtos do vendor
                const Product = (0, mongoose_1.model)('Product');
                yield Product.updateMany({ vendor: doc._id }, { isAvailable: false });
                // Criar notificação
                const Notification = (0, mongoose_1.model)('Notification');
                yield Notification.create({
                    user: doc.owner,
                    type: 'vendor_status',
                    message: `Estabelecimento "${doc.name}" foi suspenso`
                });
            }
            catch (error) {
                console.error('Error suspending vendor products:', error);
            }
        }
    });
});
// ===== MÉTODOS DE INSTÂNCIA =====
// Verificar se vendor pode receber pedidos
exports.VendorSchema.methods.canReceiveOrders = function () {
    return this.status === 'active' && !this.temporarilyClosed && this.isOpen;
};
// Obter estatísticas do vendor
exports.VendorSchema.methods.getStats = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = {
            totalProducts: 0,
            availableProducts: 0,
            totalOrders: 0,
            completedOrders: 0,
            revenue: 0
        };
        try {
            const Product = (0, mongoose_1.model)('Product');
            const Order = (0, mongoose_1.model)('Order');
            // Estatísticas de produtos
            const productStats = yield Product.aggregate([
                { $match: { vendor: this._id } },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        availableProducts: {
                            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
                        }
                    }
                }
            ]);
            if (productStats.length > 0) {
                stats.totalProducts = productStats[0].totalProducts;
                stats.availableProducts = productStats[0].availableProducts;
            }
            // Estatísticas de orders
            const orderStats = yield Order.aggregate([
                { $match: { vendor: this._id } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        completedOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                        },
                        revenue: { $sum: '$total' }
                    }
                }
            ]);
            if (orderStats.length > 0) {
                stats.totalOrders = orderStats[0].totalOrders;
                stats.completedOrders = orderStats[0].completedOrders;
                stats.revenue = orderStats[0].revenue;
            }
        }
        catch (error) {
            console.error('Error getting vendor stats:', error);
        }
        return stats;
    });
};
// Obter horário de funcionamento formatado
exports.VendorSchema.methods.getWorkingHoursFormatted = function () {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return this.workingHours.map((wh) => ({
        day: days[wh.day],
        open: wh.open,
        close: wh.close,
        active: wh.active
    }));
};
// Verificar se está aberto em um horário específico
exports.VendorSchema.methods.isOpenAt = function (date) {
    if (this.open24h)
        return true;
    if (this.temporarilyClosed)
        return false;
    const day = date.getDay();
    const time = date.toTimeString().slice(0, 5);
    const workingHour = this.workingHours.find((wh) => wh.day === day);
    if (!workingHour || !workingHour.active)
        return false;
    if (workingHour.open && time < workingHour.open)
        return false;
    if (workingHour.close && time > workingHour.close)
        return false;
    return true;
};
// Configurar para incluir virtuals no JSON
exports.VendorSchema.set('toJSON', { virtuals: true });
exports.VendorSchema.set('toObject', { virtuals: true });
exports.Vendor = (0, mongoose_1.model)('Vendor', exports.VendorSchema);
