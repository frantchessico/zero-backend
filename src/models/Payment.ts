import { Schema, Types, model } from "mongoose";

export const PaymentSchema = new Schema({
  order: { type: Types.ObjectId, ref: 'Order', required: true },
  // Quem paga e para quem é o pagamento
  payer: { type: Types.ObjectId, ref: 'User' },   // Usuário que está pagando (lógico)
  vendor: { type: Types.ObjectId, ref: 'Vendor' }, // Estabelecimento que recebe
  method: { type: String, enum: ['mpesa', 'card', 'cash'], required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  amount: { type: Number, required: true },
  paidAt: Date,

  // Informações de desconto/cupom aplicados
  coupon: { type: Types.ObjectId, ref: 'Coupon' },
  discountAmount: { type: Number, default: 0 },
  providerStatus: { type: String },
  providerPayload: { type: Schema.Types.Mixed },
  refundReason: { type: String },
  refundedAt: { type: Date },
  idempotencyKey: { type: String, index: true, sparse: true },

  // Campos específicos de integrações externas (ex: M-Pesa)
  phoneNumber: { type: String },
  paymentConversation: { type: String, unique: true, sparse: true },
  paymentRef: { type: String, unique: true, sparse: true },
  transaction: { type: String, unique: true, sparse: true },
  paymentType: { type: String, enum: ['purchase', 'subscription'], required: false },
  appPaymentOrigin: { type: String }
}, {
  timestamps: true
});

PaymentSchema.index({ order: 1, createdAt: -1 });
PaymentSchema.index({ order: 1, status: 1 });

export const Payment = model('Payment', PaymentSchema);
