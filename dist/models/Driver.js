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
exports.Driver = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Geo_1 = require("./Geo");
const driverSchema = new mongoose_1.Schema({
    // Referência obrigatória ao User
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Campos específicos de Driver (sem duplicação)
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    vehicleInfo: {
        type: {
            type: String,
            enum: ['motorcycle', 'car', 'bicycle'],
            required: true
        },
        model: String,
        plateNumber: String,
        color: String
    },
    currentLocation: {
        latitude: Number,
        longitude: Number,
        lastUpdated: Date,
        geoPoint: {
            type: Geo_1.GeoPointSchema,
            required: false
        }
    },
    isAvailable: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 },
    workingHours: {
        startTime: {
            type: String,
            match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
        },
        endTime: {
            type: String,
            match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
        }
    },
    acceptedPaymentMethods: { type: [String], default: [] },
    deliveryAreas: { type: [String], default: [] },
    documents: {
        license: String,
        insurance: String,
        vehicleRegistration: String
    },
    emergencyContact: {
        name: String,
        phoneNumber: String,
        relationship: String
    }
}, {
    timestamps: true
});
// ===== VIRTUALS BIDIRECIONAIS =====
// Virtual para acessar dados do User
driverSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});
// Virtual para deliveries do driver
driverSchema.virtual('deliveries', {
    ref: 'Delivery',
    localField: 'userId',
    foreignField: 'driver',
    justOne: false
});
// Virtual para obter nome completo do driver (User + Driver)
driverSchema.virtual('fullName').get(function () {
    var _a;
    if (this.populated('user')) {
        return `${(_a = this.user) === null || _a === void 0 ? void 0 : _a.userId} - ${this.licenseNumber}`;
    }
    return this.licenseNumber;
});
// ===== MIDDLEWARE DE VALIDAÇÃO =====
// Validar se User existe e tem role 'driver'
driverSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (this.currentLocation &&
                Number.isFinite(this.currentLocation.latitude) &&
                Number.isFinite(this.currentLocation.longitude)) {
                this.currentLocation.geoPoint = {
                    type: 'Point',
                    coordinates: [this.currentLocation.longitude, this.currentLocation.latitude]
                };
            }
            const User = mongoose_1.default.model('User');
            const user = yield User.findById(this.userId);
            if (!user) {
                return next(new Error('User não encontrado'));
            }
            if (user.role !== 'driver') {
                return next(new Error('User deve ter role "driver"'));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
// ===== MÉTODOS DE INSTÂNCIA =====
// Atualizar rating do driver
driverSchema.methods.updateRating = function (newRating) {
    return __awaiter(this, void 0, void 0, function* () {
        this.rating = ((this.rating * this.reviewCount) + newRating) / (this.reviewCount + 1);
        this.reviewCount += 1;
        yield this.save();
        return this;
    });
};
// Adicionar entrega completada
driverSchema.methods.addCompletedDelivery = function (deliveryTime) {
    return __awaiter(this, void 0, void 0, function* () {
        this.totalDeliveries += 1;
        this.completedDeliveries += 1;
        // Atualizar tempo médio de entrega
        const totalTime = (this.averageDeliveryTime * (this.completedDeliveries - 1)) + deliveryTime;
        this.averageDeliveryTime = totalTime / this.completedDeliveries;
        yield this.save();
        return this;
    });
};
// Verificar se driver está disponível
driverSchema.methods.isDriverAvailable = function () {
    return this.isAvailable && this.isVerified;
};
// Obter dados completos do driver (User + Driver)
driverSchema.methods.getCompleteDriverData = function () {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        yield this.populate('user', 'userId email phoneNumber role');
        return {
            driverId: this._id,
            userId: this.userId,
            userData: {
                userId: (_a = this.user) === null || _a === void 0 ? void 0 : _a.userId,
                email: (_b = this.user) === null || _b === void 0 ? void 0 : _b.email,
                phoneNumber: (_c = this.user) === null || _c === void 0 ? void 0 : _c.phoneNumber,
                role: (_d = this.user) === null || _d === void 0 ? void 0 : _d.role
            },
            driverData: {
                licenseNumber: this.licenseNumber,
                vehicleInfo: this.vehicleInfo,
                isAvailable: this.isAvailable,
                isVerified: this.isVerified,
                rating: this.rating,
                totalDeliveries: this.totalDeliveries,
                completedDeliveries: this.completedDeliveries
            }
        };
    });
};
// Obter estatísticas completas do driver
driverSchema.methods.getDriverStats = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const Delivery = mongoose_1.default.model('Delivery');
        const deliveryStats = yield Delivery.aggregate([
            { $match: { driver: this.userId } },
            {
                $group: {
                    _id: null,
                    totalDeliveries: { $sum: 1 },
                    completedDeliveries: {
                        $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                    },
                    averageDeliveryTime: { $avg: '$deliveryTime' }
                }
            }
        ]);
        return Object.assign(Object.assign({}, this.toObject()), { deliveryStats: deliveryStats[0] || {
                totalDeliveries: 0,
                completedDeliveries: 0,
                averageDeliveryTime: 0
            } });
    });
};
// ===== MÉTODOS ESTÁTICOS =====
// Buscar drivers disponíveis
driverSchema.statics.findAvailableDrivers = function () {
    return this.find({
        isAvailable: true,
        isVerified: true
    }).populate('user', 'userId email phoneNumber');
};
// Buscar drivers por área de entrega
driverSchema.statics.findDriversByArea = function (area) {
    return this.find({
        deliveryAreas: area,
        isAvailable: true,
        isVerified: true
    }).populate('user', 'userId email phoneNumber');
};
// Buscar drivers por rating
driverSchema.statics.findDriversByRating = function (minRating = 4.0) {
    return this.find({
        rating: { $gte: minRating },
        isVerified: true
    }).populate('user', 'userId email phoneNumber');
};
// ===== INDEXES =====
// Indexes para consultas eficientes
driverSchema.index({ 'currentLocation.geoPoint': '2dsphere' });
driverSchema.index({ isAvailable: 1, isVerified: 1 });
driverSchema.index({ rating: -1 });
// Configurar para incluir virtuals no JSON
driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });
exports.Driver = mongoose_1.default.model('Driver', driverSchema);
