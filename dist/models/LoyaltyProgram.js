"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyProgram = void 0;
const mongoose_1 = require("mongoose");
const LoyaltyProgramSchema = new mongoose_1.Schema({
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor' },
    name: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    pointsPerCurrency: { type: Number, required: true, default: 0.1 }, // 1 ponto por 10 MT
    minOrderAmountForPoints: { type: Number, min: 0 },
    levels: [{
            name: { type: String, required: true },
            displayName: { type: String, required: true },
            minPoints: { type: Number, required: true, min: 0 },
            benefits: [{ type: String }],
            discountPercentage: { type: Number, min: 0, max: 100 }
        }],
    rewards: [{
            name: { type: String, required: true },
            description: String,
            pointsRequired: { type: Number, required: true, min: 0 },
            type: { type: String, enum: ['coupon', 'discount', 'free_delivery', 'product'], required: true },
            value: Number,
            couponCode: String,
            isActive: { type: Boolean, default: true }
        }],
    pointsExpirationDays: { type: Number, min: 1 },
    birthdayBonus: { type: Number, min: 0, default: 0 },
    referralBonus: { type: Number, min: 0, default: 0 }
}, {
    timestamps: true
});
LoyaltyProgramSchema.index({ vendor: 1, isActive: 1 });
exports.LoyaltyProgram = (0, mongoose_1.model)('LoyaltyProgram', LoyaltyProgramSchema);
