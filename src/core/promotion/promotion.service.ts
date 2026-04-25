import { Types } from 'mongoose';
import { Promotion } from '../../models/Promotion';
import ProductModel from '../../models/Product';

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

export interface PromotionPricingItem {
  productId: string;
  unitPrice: number;
  quantity: number;
}

export interface PromotionPricingResult {
  appliedPromotionIds: string[];
  productDiscountAmount: number;
  vendorDiscountAmount: number;
  totalDiscountAmount: number;
}

export class PromotionService {
  async createPromotion(data: CreatePromotionDTO) {
    await this.validatePromotionInput(data);

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
    if (data.vendorId || data.productId || data.type || data.value !== undefined) {
      const current = await Promotion.findById(promotionId).exec();
      if (!current) {
        return null;
      }

      await this.validatePromotionInput({
        vendorId: data.vendorId || current.vendor.toString(),
        productId: data.productId || current.product?.toString(),
        title: data.title || current.title,
        description: data.description || current.description,
        type: data.type || current.type,
        value: data.value ?? current.value,
        minOrderAmount: data.minOrderAmount ?? current.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount ?? current.maxDiscountAmount,
        startDate: data.startDate || current.startDate,
        endDate: data.endDate || current.endDate
      });
    }

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

  async calculateOrderPromotions(
    vendorId: string,
    items: PromotionPricingItem[],
    subtotal: number
  ): Promise<PromotionPricingResult> {
    const now = new Date();
    const [productPromotions, vendorPromotions] = await Promise.all([
      Promotion.find({
        vendor: new Types.ObjectId(vendorId),
        product: { $exists: true },
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
      }).exec(),
      Promotion.find({
        vendor: new Types.ObjectId(vendorId),
        product: { $exists: false },
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
      }).exec()
    ]);

    const appliedPromotionIds = new Set<string>();
    let productDiscountAmount = 0;

    for (const item of items) {
      const eligibleProductPromotions = productPromotions.filter(
        (promotion) =>
          promotion.product?.toString() === item.productId &&
          (!promotion.minOrderAmount || subtotal >= promotion.minOrderAmount)
      );

      if (eligibleProductPromotions.length === 0) {
        continue;
      }

      const itemBaseAmount = item.unitPrice * item.quantity;
      let bestDiscount = 0;
      let bestPromotionId: string | null = null;

      for (const promotion of eligibleProductPromotions) {
        let discount =
          promotion.type === 'percentage'
            ? (itemBaseAmount * promotion.value) / 100
            : promotion.value * item.quantity;

        if (promotion.maxDiscountAmount && discount > promotion.maxDiscountAmount) {
          discount = promotion.maxDiscountAmount;
        }

        discount = Math.min(discount, itemBaseAmount);

        if (discount > bestDiscount) {
          bestDiscount = discount;
          bestPromotionId = promotion._id.toString();
        }
      }

      if (bestPromotionId && bestDiscount > 0) {
        appliedPromotionIds.add(bestPromotionId);
        productDiscountAmount += bestDiscount;
      }
    }

    const remainingSubtotal = Math.max(0, subtotal - productDiscountAmount);
    let vendorDiscountAmount = 0;
    let bestVendorPromotionId: string | null = null;

    for (const promotion of vendorPromotions) {
      if (promotion.minOrderAmount && remainingSubtotal < promotion.minOrderAmount) {
        continue;
      }

      let discount =
        promotion.type === 'percentage'
          ? (remainingSubtotal * promotion.value) / 100
          : promotion.value;

      if (promotion.maxDiscountAmount && discount > promotion.maxDiscountAmount) {
        discount = promotion.maxDiscountAmount;
      }

      discount = Math.min(discount, remainingSubtotal);

      if (discount > vendorDiscountAmount) {
        vendorDiscountAmount = discount;
        bestVendorPromotionId = promotion._id.toString();
      }
    }

    if (bestVendorPromotionId && vendorDiscountAmount > 0) {
      appliedPromotionIds.add(bestVendorPromotionId);
    }

    return {
      appliedPromotionIds: [...appliedPromotionIds],
      productDiscountAmount,
      vendorDiscountAmount,
      totalDiscountAmount: productDiscountAmount + vendorDiscountAmount
    };
  }

  private async validatePromotionInput(data: CreatePromotionDTO): Promise<void> {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error('A data inicial da promoção não pode ser maior que a data final');
    }

    if (data.type === 'percentage' && data.value > 100) {
      throw new Error('Promoções percentuais não podem exceder 100%');
    }

    if (data.productId) {
      const product = await ProductModel.findById(data.productId).exec();
      if (!product) {
        throw new Error('Produto da promoção não encontrado');
      }

      if (product.vendor.toString() !== data.vendorId) {
        throw new Error('O produto precisa pertencer ao mesmo vendor da promoção');
      }
    }
  }
}

export const promotionService = new PromotionService();

