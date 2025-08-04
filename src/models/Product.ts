import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  categoryId?: Types.ObjectId;
  vendor: Types.ObjectId;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  preparationTime?: number;
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  ingredients?: string[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  type: 'food' | 'medicine' | 'appliance' | 'service';
  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  imageUrl: { type: String },

  type: {
    type: String,
    enum: ['food', 'medicine', 'appliance', 'service'],
    required: true
  },

  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  isVegetarian: { type: Boolean, default: false },
  isVegan: { type: Boolean, default: false },
  isGlutenFree: { type: Boolean, default: false },
  isSpicy: { type: Boolean, default: false },
  preparationTime: { type: Number, min: 0 },

  allergens: { type: [String], default: [] },
  nutritionalInfo: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fat: { type: Number, min: 0 },
    fiber: { type: Number, min: 0 },
  },
  ingredients: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true
});

productSchema.index({ vendor: 1, categoryId: 1 });
productSchema.index({ isAvailable: 1, isPopular: 1 });
productSchema.index({ name: 'text', description: 'text' });

const ProductModel = mongoose.model<IProduct>('Product', productSchema);
export default ProductModel;
