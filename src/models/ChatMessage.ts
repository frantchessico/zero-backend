import { Schema, model } from 'mongoose';
import { IChatMessage } from './interfaces';

const ChatMessageReadReceiptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, required: true }
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'ChatConversation', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    delivery: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
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
    metadata: { type: Schema.Types.Mixed },
    readBy: { type: [ChatMessageReadReceiptSchema], default: [] }
  },
  {
    timestamps: true
  }
);

ChatMessageSchema.index({ conversation: 1, createdAt: -1 });
ChatMessageSchema.index({ order: 1, createdAt: -1 });

ChatMessageSchema.set('toJSON', { virtuals: true });
ChatMessageSchema.set('toObject', { virtuals: true });

export const ChatMessage = model<IChatMessage>('ChatMessage', ChatMessageSchema);
