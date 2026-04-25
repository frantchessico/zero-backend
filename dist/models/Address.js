"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressSchema = void 0;
const mongoose_1 = require("mongoose");
const Geo_1 = require("./Geo");
exports.AddressSchema = new mongoose_1.Schema({
    streetType: { type: String, required: true },
    streetName: { type: String, required: true },
    number: { type: String, required: true },
    neighborhood: { type: String, required: false },
    city: { type: String, required: true },
    province: { type: String, required: true },
    country: { type: String, required: true, default: 'Mozambique' },
    postalCode: { type: String, required: false },
    referencePoint: { type: String, required: false },
    additionalInfo: { type: String, required: false },
    label: { type: String, enum: ['Home', 'Work', 'Other'], required: false },
    coordinates: {
        lat: { type: Number, required: false },
        lng: { type: Number, required: false }
    },
    geoPoint: {
        type: Geo_1.GeoPointSchema,
        required: false
    }
}, { _id: true });
exports.AddressSchema.pre('validate', function (next) {
    var _a, _b, _c, _d;
    if (((_a = this.coordinates) === null || _a === void 0 ? void 0 : _a.lat) !== undefined && ((_b = this.coordinates) === null || _b === void 0 ? void 0 : _b.lng) !== undefined) {
        this.geoPoint = {
            type: 'Point',
            coordinates: [this.coordinates.lng, this.coordinates.lat]
        };
    }
    else if (((_d = (_c = this.geoPoint) === null || _c === void 0 ? void 0 : _c.coordinates) === null || _d === void 0 ? void 0 : _d.length) === 2) {
        const [lng, lat] = this.geoPoint.coordinates;
        this.coordinates = { lat, lng };
    }
    next();
});
exports.AddressSchema.virtual('street').get(function () {
    return [this.streetType, this.streetName].filter(Boolean).join(' ').trim();
});
exports.AddressSchema.set('toJSON', { virtuals: true });
exports.AddressSchema.set('toObject', { virtuals: true });
