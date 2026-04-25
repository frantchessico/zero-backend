import { Schema, Types, model } from 'mongoose';

export interface ICoupon {
  code: string;
  vendor?: Types.ObjectId;
  title?: string;
  description?: string;
  type: 'percentage' | 'fixed';
  scope?: 'order_total' | 'delivery_fee';
  value: number;
  allowedPaymentMethods?: Array<'mpesa' | 'card' | 'cash'>;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  usedCount: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, trim: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  title: { type: String },
  description: { type: String },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  scope: { type: String, enum: ['order_total', 'delivery_fee'], default: 'order_total' },
  value: { type: Number, required: true, min: 0 },
  allowedPaymentMethods: [{ type: String, enum: ['mpesa', 'card', 'cash'] }],
  minOrderAmount: { type: Number, min: 0 },
  maxDiscountAmount: { type: Number, min: 0 },
  maxUses: { type: Number, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

CouponSchema.index({ vendor: 1, isActive: 1 });

export const Coupon = model<ICoupon>('Coupon', CouponSchema);
