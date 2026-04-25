import { Types } from 'mongoose';
import { Coupon } from '../../models/Coupon';

export interface CreateCouponDTO {
  vendorId?: string;
  code: string;
  title?: string;
  description?: string;
  type: 'percentage' | 'fixed';
  scope?: 'order_total' | 'delivery_fee';
  value: number;
  allowedPaymentMethods?: Array<'mpesa' | 'card' | 'cash'>;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateCouponDTO extends Partial<CreateCouponDTO> {
  isActive?: boolean;
}

export class CouponService {
  async createCoupon(data: CreateCouponDTO) {
    // Verificar se código já existe
    const existingCoupon = await Coupon.findOne({ code: data.code.toUpperCase().trim() }).exec();
    if (existingCoupon) {
      throw new Error('Código do cupom já existe');
    }

    const coupon = new Coupon({
      vendor: data.vendorId ? new Types.ObjectId(data.vendorId) : undefined,
      code: data.code.toUpperCase().trim(),
      title: data.title,
      description: data.description,
      type: data.type,
      scope: data.scope || 'order_total',
      value: data.value,
      allowedPaymentMethods: data.allowedPaymentMethods,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount,
      maxUses: data.maxUses,
      startDate: data.startDate,
      endDate: data.endDate
    });

    return await coupon.save();
  }

  async updateCoupon(couponId: string, data: UpdateCouponDTO) {
    return await Coupon.findByIdAndUpdate(
      couponId,
      {
        $set: {
          ...(data.vendorId && { vendor: new Types.ObjectId(data.vendorId) }),
          ...(data.code && { code: data.code }),
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.type && { type: data.type }),
          ...(data.scope && { scope: data.scope }),
          ...(data.value !== undefined && { value: data.value }),
          ...(data.allowedPaymentMethods && { allowedPaymentMethods: data.allowedPaymentMethods }),
          ...(data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount }),
          ...(data.maxDiscountAmount !== undefined && { maxDiscountAmount: data.maxDiscountAmount }),
          ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
          ...(data.startDate && { startDate: data.startDate }),
          ...(data.endDate && { endDate: data.endDate }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      },
      { new: true, runValidators: true }
    );
  }

  async getCouponById(couponId: string) {
    return await Coupon.findById(couponId).exec();
  }

  async getVendorCoupons(vendorId: string) {
    return await Coupon.find({ vendor: new Types.ObjectId(vendorId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Buscar cupons disponíveis para um vendor (ativos e válidos)
   */
  async getAvailableCouponsForVendor(vendorId?: string) {
    const now = new Date();
    const query: any = {
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
    };

    if (vendorId) {
      query.$and.push({
        $or: [
          { vendor: new Types.ObjectId(vendorId) },
          { vendor: { $exists: false } } // Cupons globais
        ]
      });
    } else {
      query.vendor = { $exists: false }; // Apenas cupons globais
    }

    return await Coupon.find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Validar cupom para um pedido
   */
  async validateCoupon(params: {
    code: string;
    vendorId?: string;
    paymentMethod: 'mpesa' | 'card' | 'cash';
    orderTotal: number;
    deliveryFee?: number;
  }): Promise<{
    valid: boolean;
    reason?: string;
    discountAmount?: number;
    couponId?: string;
    scope?: 'order_total' | 'delivery_fee';
  }> {
    const { code, vendorId, paymentMethod, orderTotal, deliveryFee = 0 } = params;

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() }).exec();
    if (!coupon) {
      return { valid: false, reason: 'Cupom não encontrado' };
    }

    const now = new Date();

    if (!coupon.isActive) {
      return { valid: false, reason: 'Cupom inativo' };
    }

    if (coupon.startDate && coupon.startDate > now) {
      return { valid: false, reason: 'Cupom ainda não está válido' };
    }

    if (coupon.endDate && coupon.endDate < now) {
      return { valid: false, reason: 'Cupom expirado' };
    }

    if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, reason: 'Limite de uso do cupom atingido' };
    }

    if (coupon.vendor && !vendorId) {
      return { valid: false, reason: 'Cupom exige um estabelecimento específico' };
    }

    if (coupon.vendor && vendorId && coupon.vendor.toString() !== vendorId) {
      return { valid: false, reason: 'Cupom não é válido para este estabelecimento' };
    }

    if (coupon.allowedPaymentMethods && coupon.allowedPaymentMethods.length > 0) {
      if (!coupon.allowedPaymentMethods.includes(paymentMethod)) {
        return { valid: false, reason: 'Cupom não é válido para este método de pagamento' };
      }
    }

    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return { valid: false, reason: 'Valor mínimo de pedido não atingido' };
    }

    // Calcular desconto
    const baseAmount = coupon.scope === 'delivery_fee' ? deliveryFee : orderTotal;

    let discountAmount =
      coupon.type === 'percentage'
        ? (baseAmount * coupon.value) / 100
        : coupon.value;

    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    if (discountAmount <= 0) {
      return { valid: false, reason: 'Desconto calculado é zero' };
    }

    return {
      valid: true,
      discountAmount,
      couponId: coupon._id.toString(),
      scope: coupon.scope || 'order_total'
    };
  }

  async registerUse(couponId: string): Promise<boolean> {
    const coupon = await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        $or: [
          { maxUses: { $exists: false } },
          { $expr: { $lt: ['$usedCount', '$maxUses'] } }
        ]
      },
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    return !!coupon;
  }
}

export const couponService = new CouponService();

