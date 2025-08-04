import { Schema, Types, model } from "mongoose";

export const PaymentSchema = new Schema({
    order: { type: Types.ObjectId, ref: 'Order', required: true },
    method: { type: String, enum: ['mpesa', 'card', 'cash'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    amount: { type: Number, required: true },
    paidAt: Date
  }, {
    timestamps: true
  });
  
  export const Payment = model('Payment', PaymentSchema);
  