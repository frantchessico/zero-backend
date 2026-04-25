"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Delivery = exports.DeliverySchema = void 0;
const mongoose_1 = require("mongoose");
const Geo_1 = require("./Geo");
exports.DeliverySchema = new mongoose_1.Schema({
    order: { type: mongoose_1.Types.ObjectId, ref: 'Order', required: true },
    driver: { type: mongoose_1.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['picked_up', 'in_transit', 'delivered', 'failed'], default: 'picked_up' },
    currentLocation: {
        lat: Number,
        lng: Number
    },
    currentLocationGeo: {
        type: Geo_1.GeoPointSchema,
        required: false
    },
    failureReason: { type: String },
    route: { type: mongoose_1.Types.ObjectId, ref: 'Route' },
    routeGeometry: {
        type: Geo_1.GeoLineStringSchema,
        required: false
    },
    assignedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    estimatedTime: Date
}, {
    timestamps: true
});
exports.DeliverySchema.pre('validate', function (next) {
    if (this.currentLocation &&
        Number.isFinite(this.currentLocation.lat) &&
        Number.isFinite(this.currentLocation.lng)) {
        this.currentLocationGeo = {
            type: 'Point',
            coordinates: [this.currentLocation.lng, this.currentLocation.lat]
        };
    }
    next();
});
exports.DeliverySchema.index({ driver: 1, status: 1 });
exports.DeliverySchema.index({ route: 1 });
exports.DeliverySchema.index({ currentLocationGeo: '2dsphere' });
exports.Delivery = (0, mongoose_1.model)('Delivery', exports.DeliverySchema);
