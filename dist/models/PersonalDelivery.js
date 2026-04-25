"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonalDelivery = void 0;
const mongoose_1 = require("mongoose");
const PersonalDeliveryItemSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    weight: {
        type: Number,
        min: 0
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    isFragile: {
        type: Boolean,
        default: false
    },
    specialInstructions: String
}, { _id: false });
const PersonalDeliverySchema = new mongoose_1.Schema({
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pickupAddress: {
        street: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    deliveryAddress: {
        street: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    items: {
        type: [PersonalDeliveryItemSchema],
        required: true,
        validate: [(arr) => arr.length > 0, 'Personal delivery must contain at least one item']
    },
    category: {
        type: String,
        enum: ['electronics', 'documents', 'furniture', 'clothing', 'appliances', 'other'],
        required: true
    },
    totalWeight: {
        type: Number,
        min: 0
    },
    estimatedValue: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0
    },
    insuranceFee: {
        type: Number,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    driver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    route: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Route'
    },
    estimatedPickupTime: Date,
    estimatedDeliveryTime: Date,
    actualPickupTime: Date,
    actualDeliveryTime: Date,
    notes: String,
    insuranceRequired: {
        type: Boolean,
        default: false
    },
    signatureRequired: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// Índices para melhor performance
PersonalDeliverySchema.index({ customer: 1, createdAt: -1 });
PersonalDeliverySchema.index({ status: 1 });
PersonalDeliverySchema.index({ driver: 1 });
PersonalDeliverySchema.index({ route: 1 });
PersonalDeliverySchema.index({ 'pickupAddress.coordinates': '2dsphere' });
PersonalDeliverySchema.index({ 'deliveryAddress.coordinates': '2dsphere' });
exports.PersonalDelivery = (0, mongoose_1.model)('PersonalDelivery', PersonalDeliverySchema);
