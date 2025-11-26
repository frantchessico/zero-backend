import { Types } from 'mongoose';
import { Promotion } from '../../models/Promotion';

export interface CreatePromotionDTO {
  vendorId: string;
  productId?: string;
  title: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdatePromotionDTO extends Partial<CreatePromotionDTO> {
  isActive?: boolean;
}

export class PromotionService {
  async createPromotion(data: CreatePromotionDTO) {
    const promotion = new Promotion({
      vendor: new Types.ObjectId(data.vendorId),
      product: data.productId ? new Types.ObjectId(data.productId) : undefined,
      title: data.title,
      description: data.description,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount,
      startDate: data.startDate,
      endDate: data.endDate
    });

    return await promotion.save();
  }

  async updatePromotion(
    promotionId: string,
    data: UpdatePromotionDTO
  ) {
    return await Promotion.findByIdAndUpdate(
      promotionId,
      {
        $set: {
          ...(data.productId && { product: new Types.ObjectId(data.productId) }),
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.type && { type: data.type }),
          ...(data.value !== undefined && { value: data.value }),
          ...(data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount }),
          ...(data.maxDiscountAmount !== undefined && { maxDiscountAmount: data.maxDiscountAmount }),
          ...(data.startDate && { startDate: data.startDate }),
          ...(data.endDate && { endDate: data.endDate }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      },
      { new: true, runValidators: true }
    );
  }

  async getVendorPromotions(
    vendorId: string,
    onlyActive: boolean = false
  ) {
    const query: any = {
      vendor: new Types.ObjectId(vendorId)
    };

    if (onlyActive) {
      const now = new Date();
      query.isActive = true;
      query.$and = [
        {
          $or: [
            { startDate: { $lte: now } },
            { startDate: { $exists: false } }
          ]
        },
        {
          $or: [
            { endDate: { $gte: now } },
            { endDate: { $exists: false } }
          ]
        }
      ];
    }

    return await Promotion.find(query)
      .populate('product', 'name price type')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getProductActivePromotions(productId: string) {
    const now = new Date();
    return await Promotion.find({
      product: new Types.ObjectId(productId),
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $lte: now } },
            { startDate: { $exists: false } }
          ]
        },
        {
          $or: [
            { endDate: { $gte: now } },
            { endDate: { $exists: false } }
          ]
        }
      ]
    })
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const promotionService = new PromotionService();


