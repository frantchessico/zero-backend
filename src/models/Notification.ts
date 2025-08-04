import { Schema, Types, model } from "mongoose";

export const NotificationSchema = new Schema({
    user: { type: Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['order_status', 'delivery_update', 'promotion'] },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now }
  });
  
  export const Notification = model('Notification', NotificationSchema);
  