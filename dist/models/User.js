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
exports.User = exports.UserSchema = void 0;
const mongoose_1 = require("mongoose");
const Address_1 = require("./Address");
exports.UserSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    clerkId: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    phoneNumber: { type: String, required: false },
    email: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['customer', 'driver', 'vendor', 'admin'], required: true },
    // ✅ Campos novos e úteis:
    deliveryAddresses: { type: [Address_1.AddressSchema], default: [] },
    orderHistory: [{ type: mongoose_1.Types.ObjectId, ref: 'Order' }],
    paymentMethods: [{ type: String, enum: ['visa', 'm-pesa', 'cash', 'paypal'] }],
    loyaltyPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // ✅ Campo para vendor (se role = 'vendor')
    vendorId: { type: mongoose_1.Types.ObjectId, ref: 'Vendor', required: false }
}, {
    timestamps: true
});
// ===== VIRTUALS BIDIRECIONAIS =====
// Virtual para vendors do usuário
exports.UserSchema.virtual('vendors', {
    ref: 'Vendor',
    localField: '_id',
    foreignField: 'owner',
    justOne: false
});
// Virtual para deliveries do usuário (como driver)
exports.UserSchema.virtual('deliveries', {
    ref: 'Delivery',
    localField: '_id',
    foreignField: 'driver',
    justOne: false
});
// Virtual para perfil de driver (se role = 'driver')
exports.UserSchema.virtual('driverProfile', {
    ref: 'Driver',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});
// Virtual para orders do usuário (como customer)
exports.UserSchema.virtual('orders', {
    ref: 'Order',
    localField: '_id',
    foreignField: 'customer',
    justOne: false
});
// Virtual para notificações do usuário
exports.UserSchema.virtual('notifications', {
    ref: 'Notification',
    localField: '_id',
    foreignField: 'user',
    justOne: false
});
// Virtual para pagamentos do usuário
exports.UserSchema.virtual('payments', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'user',
    justOne: false
});
// ===== MIDDLEWARE DE VALIDAÇÃO =====
// Validar role antes de salvar
exports.UserSchema.pre('save', function (next) {
    if (this.isModified('role')) {
        const validRoles = ['customer', 'driver', 'vendor', 'admin'];
        if (!validRoles.includes(this.role)) {
            return next(new Error('Role inválida'));
        }
    }
    next();
});
// ===== TRIGGERS AUTOMÁTICOS =====
// Atualizar contadores quando order é adicionado
exports.UserSchema.methods.addOrderToHistory = function (orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        this.orderHistory.push(orderId);
        yield this.save();
    });
};
// Atualizar pontos de fidelidade
exports.UserSchema.methods.updateLoyaltyPoints = function (points) {
    return __awaiter(this, void 0, void 0, function* () {
        this.loyaltyPoints += points;
        if (this.loyaltyPoints < 0)
            this.loyaltyPoints = 0;
        yield this.save();
    });
};
// ===== MÉTODOS DE INSTÂNCIA =====
// Verificar se usuário pode fazer pedidos
exports.UserSchema.methods.canOrder = function () {
    return this.isActive && this.role === 'customer';
};
// Verificar se usuário pode fazer entregas
exports.UserSchema.methods.canDeliver = function () {
    return this.isActive && this.role === 'driver';
};
// Verificar se usuário tem perfil de driver
exports.UserSchema.methods.hasDriverProfile = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.role !== 'driver')
            return false;
        const Driver = (0, mongoose_1.model)('Driver');
        const driver = yield Driver.findOne({ userId: this._id });
        return !!driver;
    });
};
// Obter perfil de driver do usuário
exports.UserSchema.methods.getDriverProfile = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.role !== 'driver') {
            throw new Error('Usuário não é driver');
        }
        const Driver = (0, mongoose_1.model)('Driver');
        const driver = yield Driver.findOne({ userId: this._id });
        if (!driver) {
            throw new Error('Perfil de driver não encontrado');
        }
        return driver;
    });
};
// Verificar se usuário pode ter estabelecimento
exports.UserSchema.methods.canVendor = function () {
    return this.isActive && this.role === 'vendor';
};
// Obter estatísticas do usuário
exports.UserSchema.methods.getStats = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = {
            totalOrders: this.orderHistory.length,
            loyaltyPoints: this.loyaltyPoints,
            deliveryAddresses: this.deliveryAddresses.length,
            paymentMethods: this.paymentMethods.length
        };
        // Se for driver, adicionar stats de entrega
        if (this.role === 'driver') {
            try {
                const driver = yield this.getDriverProfile();
                stats.driverStats = {
                    name: driver.name,
                    licenseNumber: driver.licenseNumber,
                    rating: driver.rating,
                    totalDeliveries: driver.totalDeliveries,
                    completedDeliveries: driver.completedDeliveries,
                    isAvailable: driver.isAvailable,
                    isVerified: driver.isVerified
                };
            }
            catch (error) {
                // Driver profile não encontrado, mas user tem role 'driver'
                stats.driverStats = {
                    hasProfile: false,
                    message: 'Perfil de driver não configurado'
                };
            }
        }
        // Se for vendor, adicionar stats de vendor
        if (this.role === 'vendor') {
            const Vendor = (0, mongoose_1.model)('Vendor');
            const vendor = yield Vendor.findOne({ owner: this._id });
            if (vendor) {
                stats.vendorName = vendor.name;
                stats.vendorStatus = vendor.status;
            }
        }
        return stats;
    });
};
// Configurar para incluir virtuals no JSON
exports.UserSchema.set('toJSON', { virtuals: true });
exports.UserSchema.set('toObject', { virtuals: true });
exports.User = (0, mongoose_1.model)('User', exports.UserSchema);
