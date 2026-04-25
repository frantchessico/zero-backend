"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoLineStringSchema = exports.GeoPointSchema = void 0;
const mongoose_1 = require("mongoose");
exports.GeoPointSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
    },
    coordinates: {
        type: [Number],
        default: undefined,
        validate: {
            validator: (value) => !value || value.length === 2,
            message: 'GeoJSON Point must contain [longitude, latitude]'
        }
    }
}, { _id: false });
exports.GeoLineStringSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString'
    },
    coordinates: {
        type: [[Number]],
        default: undefined,
        validate: {
            validator: (value) => !value || value.every((pair) => Array.isArray(pair) && pair.length === 2),
            message: 'GeoJSON LineString must contain coordinate pairs'
        }
    },
    metadata: {
        provider: { type: String },
        distanceMeters: { type: Number, min: 0 },
        durationSeconds: { type: Number, min: 0 }
    }
}, { _id: false });
