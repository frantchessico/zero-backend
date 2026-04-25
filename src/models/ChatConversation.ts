import { Schema, model } from 'mongoose';
import { IChatConversation } from './interfaces';

const ChatParticipantSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['customer', 'driver', 'vendor', 'admin', 'support'],
      required: true
    },
    label: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const ChatConversationSchema = new Schema<IChatConversation>(
  {
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
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    delivery: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    participants: { type: [ChatParticipantSchema], default: [] },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    lastMessagePreview: { type: String, trim: true },
    lastMessageAt: { type: Date },
    lastMessageSender: { type: Schema.Types.ObjectId, ref: 'User' },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

ChatConversationSchema.index({ order: 1, scope: 1 }, { unique: true });
ChatConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
ChatConversationSchema.index({ delivery: 1 });

ChatConversationSchema.set('toJSON', { virtuals: true });
ChatConversationSchema.set('toObject', { virtuals: true });

export const ChatConversation = model<IChatConversation>('ChatConversation', ChatConversationSchema);
