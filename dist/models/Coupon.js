"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
const mongoose_1 = require("mongoose");
const CouponSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, trim: true },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor' },
    title: { type: String },
    description: { type: String },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    scope: { type: String, enum: ['order_total', 'delivery_fee'], default: 'order_total' },
    value: { type: Number, required: true, min: 0 },
    allowedPaymentMethods: [{ type: String, enum: ['mpesa', 'card', 'cash'] }],
    minOrderAmount: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});
CouponSchema.index({ vendor: 1, isActive: 1 });
exports.Coupon = (0, mongoose_1.model)('Coupon', CouponSchema);
