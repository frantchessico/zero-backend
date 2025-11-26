import { Schema, Types, model } from 'mongoose';

export interface IPromotion {
  vendor: Types.ObjectId;
  product?: Types.ObjectId;
  title: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number; // percentual (0-100) ou valor fixo em MT
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PromotionSchema = new Schema<IPromotion>({
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, min: 0 },
  maxDiscountAmount: { type: Number, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

PromotionSchema.index({ vendor: 1, isActive: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ product: 1, isActive: 1 });

export const Promotion = model<IPromotion>('Promotion', PromotionSchema);


