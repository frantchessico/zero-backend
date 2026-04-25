"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Promotion = void 0;
const mongoose_1 = require("mongoose");
const PromotionSchema = new mongoose_1.Schema({
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});
PromotionSchema.index({ vendor: 1, isActive: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ product: 1, isActive: 1 });
exports.Promotion = (0, mongoose_1.model)('Promotion', PromotionSchema);
