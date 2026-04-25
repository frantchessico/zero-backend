"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatConversation = void 0;
const mongoose_1 = require("mongoose");
const ChatParticipantSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
        type: String,
        enum: ['customer', 'driver', 'vendor', 'admin', 'support'],
        required: true
    },
    label: { type: String, required: true, trim: true }
}, { _id: false });
const ChatConversationSchema = new mongoose_1.Schema({
    contextType: {
        type: String,
        enum: ['order'],
        default: 'order',
        required: true
    },
    scope: {
        type: String,
        enum: ['customer_vendor', 'customer_driver', 'driver_vendor', 'support'],
        required: true
    },
    order: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order', required: true },
    delivery: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Delivery' },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor' },
    participantIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }],
    participants: { type: [ChatParticipantSchema], default: [] },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    lastMessagePreview: { type: String, trim: true },
    lastMessageAt: { type: Date },
    lastMessageSender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});
ChatConversationSchema.index({ order: 1, scope: 1 }, { unique: true });
ChatConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
ChatConversationSchema.index({ delivery: 1 });
ChatConversationSchema.set('toJSON', { virtuals: true });
ChatConversationSchema.set('toObject', { virtuals: true });
exports.ChatConversation = (0, mongoose_1.model)('ChatConversation', ChatConversationSchema);
