import mongoose, { Schema, Document } from 'mongoose';

interface ICategory extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  parentCategoryId?: mongoose.Types.ObjectId;
  restaurantId?: mongoose.Types.ObjectId;
  isGlobal: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    icon: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      required: false,
      match: [/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal (#RRGGBB)'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: false,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: false,
    },
    isGlobal: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ restaurantId: 1, isActive: 1 });
categorySchema.index({ parentCategoryId: 1 });
categorySchema.index({ name: 'text', description: 'text' });

const CategoryModel = mongoose.model<ICategory>('Category', categorySchema);

export default CategoryModel; 