"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = exports.NotificationSchema = void 0;
const mongoose_1 = require("mongoose");
exports.NotificationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['order_status', 'delivery_update', 'promotion', 'payment_update', 'vendor_status', 'system'] },
    message: { type: String, required: true },
    order: { type: mongoose_1.Types.ObjectId, ref: 'Order' },
    delivery: { type: mongoose_1.Types.ObjectId, ref: 'Delivery' },
    personalDelivery: { type: mongoose_1.Types.ObjectId, ref: 'PersonalDelivery' },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now }
});
exports.NotificationSchema.index({ user: 1, sentAt: -1 });
exports.NotificationSchema.index({ order: 1, sentAt: -1 });
exports.Notification = (0, mongoose_1.model)('Notification', exports.NotificationSchema);
