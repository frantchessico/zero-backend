import { model, Schema } from 'mongoose';
import { ICategory } from './interfaces';


const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: false,
    trim: true
  },

  type: {
    type: String,
    enum: ['food', 'medicine', 'appliance', 'service'],
    required: true
  },

  iconUrl: {
    type: String,
    required: false
  },

  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'Vendor',
    required: false
  }

}, { timestamps: true });

CategorySchema.index({ name: 1, type: 1 });

export const Category = model<ICategory>('Category', CategorySchema);
