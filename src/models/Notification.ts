import { Schema, Types, model } from "mongoose";

export const NotificationSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['order_status', 'delivery_update', 'promotion', 'payment_update', 'vendor_status', 'system'] },
    message: { type: String, required: true },
    order: { type: Types.ObjectId, ref: 'Order' },
    delivery: { type: Types.ObjectId, ref: 'Delivery' },
    personalDelivery: { type: Types.ObjectId, ref: 'PersonalDelivery' },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now }
  });

  NotificationSchema.index({ user: 1, sentAt: -1 });
  NotificationSchema.index({ order: 1, sentAt: -1 });
  
  export const Notification = model('Notification', NotificationSchema);
  
