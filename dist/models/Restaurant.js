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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const operatingHoursSchema = new mongoose_1.Schema({
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true,
    },
    openTime: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    closeTime: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    isOpen: {
        type: Boolean,
        default: true,
    },
});
const restaurantSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    logoUrl: {
        type: String,
        required: false,
    },
    coverImageUrl: {
        type: String,
        required: false,
    },
    address: {
        tipoVia: { type: String, required: true },
        nomeVia: { type: String, required: true },
        numero: { type: String, required: true },
        bairro: { type: String, required: false },
        cidade: { type: String, required: true },
        provincia: { type: String, required: true },
        codigoPostal: { type: String, required: false },
        coordenadas: {
            latitude: { type: Number, required: false },
            longitude: { type: Number, required: false },
        },
    },
    phoneNumber: {
        type: String,
        required: true,
        match: [/^\+258\d{9}$/, 'Número de telefone inválido para Moçambique'],
    },
    email: {
        type: String,
        required: false,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    website: {
        type: String,
        required: false,
    },
    cuisineType: {
        type: [String],
        required: true,
        validate: [(cuisineType) => cuisineType.length > 0, 'Pelo menos um tipo de cozinha deve ser especificado'],
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    reviewCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0,
    },
    minimumOrder: {
        type: Number,
        required: true,
        min: 0,
    },
    averagePreparationTime: {
        type: Number,
        required: true,
        min: 0,
    },
    isOpen: {
        type: Boolean,
        default: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    operatingHours: {
        type: [operatingHoursSchema],
        default: [],
    },
    acceptedPaymentMethods: {
        type: [String],
        default: [],
    },
    deliveryRadius: {
        type: Number,
        required: true,
        min: 0,
    },
    specialFeatures: {
        type: [String],
        default: [],
    },
}, { timestamps: true });
// Índices para melhorar performance
restaurantSchema.index({ 'address.coordenadas': '2dsphere' });
restaurantSchema.index({ isOpen: 1, isActive: 1 });
restaurantSchema.index({ cuisineType: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ name: 'text', description: 'text' });
const RestaurantModel = mongoose_1.default.model('Restaurant', restaurantSchema);
exports.default = RestaurantModel;
