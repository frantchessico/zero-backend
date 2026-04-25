"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
const mongoose_1 = require("mongoose");
const Geo_1 = require("./Geo");
const RouteSchema = new mongoose_1.Schema({
    driver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    personalDeliveries: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'PersonalDelivery'
        }
    ],
    deliveries: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Delivery'
        }
    ],
    geometry: {
        type: Geo_1.GeoLineStringSchema,
        required: false
    },
    status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled'],
        default: 'planned'
    },
    startTime: Date,
    endTime: Date
}, {
    timestamps: true
});
// Índices úteis
RouteSchema.index({ driver: 1, status: 1 });
exports.Route = (0, mongoose_1.model)('Route', RouteSchema);
