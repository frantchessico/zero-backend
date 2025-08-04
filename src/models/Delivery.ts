import { Schema, Types, model } from "mongoose";

export const DeliverySchema = new Schema({
    order: { type: Types.ObjectId, ref: 'Order', required: true },
    driver: { type: Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['picked_up', 'in_transit', 'delivered', 'failed'], default: 'picked_up' },
    currentLocation: {
      lat: Number,
      lng: Number
    },
    estimatedTime: Date
  }, {
    timestamps: true
  });
  
  export const Delivery = model('Delivery', DeliverySchema);
  