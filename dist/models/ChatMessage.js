"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const mongoose_1 = require("mongoose");
const ChatMessageReadReceiptSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, required: true }
}, { _id: false });
const ChatMessageSchema = new mongoose_1.Schema({
    conversation: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ChatConversation', required: true },
    order: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order', required: true },
    delivery: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Delivery' },
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    senderRole: {
        type: String,
        enum: ['customer', 'driver', 'vendor', 'admin', 'support', 'system'],
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'system'],
        default: 'text',
        required: true
    },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    readBy: { type: [ChatMessageReadReceiptSchema], default: [] }
}, {
    timestamps: true
});
ChatMessageSchema.index({ conversation: 1, createdAt: -1 });
ChatMessageSchema.index({ order: 1, createdAt: -1 });
ChatMessageSchema.set('toJSON', { virtuals: true });
ChatMessageSchema.set('toObject', { virtuals: true });
exports.ChatMessage = (0, mongoose_1.model)('ChatMessage', ChatMessageSchema);
