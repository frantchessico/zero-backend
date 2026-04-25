"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyTransaction = void 0;
const mongoose_1 = require("mongoose");
const LoyaltyTransactionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['earned', 'redeemed', 'expired', 'bonus', 'adjustment'],
        required: true
    },
    points: { type: Number, required: true },
    description: { type: String, required: true },
    order: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order' },
    reward: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Reward' },
    coupon: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon' },
    metadata: {
        orderTotal: Number,
        pointsPerCurrency: Number,
        levelReached: String,
        reason: String
    },
    expiresAt: Date
}, {
    timestamps: true
});
LoyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ user: 1, type: 1 });
LoyaltyTransactionSchema.index({ order: 1 });
exports.LoyaltyTransaction = (0, mongoose_1.model)('LoyaltyTransaction', LoyaltyTransactionSchema);
