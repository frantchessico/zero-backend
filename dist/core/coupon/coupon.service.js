"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.couponService = exports.CouponService = void 0;
const mongoose_1 = require("mongoose");
const Coupon_1 = require("../../models/Coupon");
class CouponService {
    createCoupon(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verificar se código já existe
            const existingCoupon = yield Coupon_1.Coupon.findOne({ code: data.code.toUpperCase().trim() }).exec();
            if (existingCoupon) {
                throw new Error('Código do cupom já existe');
            }
            const coupon = new Coupon_1.Coupon({
                vendor: data.vendorId ? new mongoose_1.Types.ObjectId(data.vendorId) : undefined,
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
            return yield coupon.save();
        });
    }
    updateCoupon(couponId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Coupon_1.Coupon.findByIdAndUpdate(couponId, {
                $set: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (data.vendorId && { vendor: new mongoose_1.Types.ObjectId(data.vendorId) })), (data.code && { code: data.code })), (data.title && { title: data.title })), (data.description && { description: data.description })), (data.type && { type: data.type })), (data.scope && { scope: data.scope })), (data.value !== undefined && { value: data.value })), (data.allowedPaymentMethods && { allowedPaymentMethods: data.allowedPaymentMethods })), (data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount })), (data.maxDiscountAmount !== undefined && { maxDiscountAmount: data.maxDiscountAmount })), (data.maxUses !== undefined && { maxUses: data.maxUses })), (data.startDate && { startDate: data.startDate })), (data.endDate && { endDate: data.endDate })), (data.isActive !== undefined && { isActive: data.isActive }))
            }, { new: true, runValidators: true });
        });
    }
    getCouponById(couponId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Coupon_1.Coupon.findById(couponId).exec();
        });
    }
    getVendorCoupons(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Coupon_1.Coupon.find({ vendor: new mongoose_1.Types.ObjectId(vendorId) })
                .sort({ createdAt: -1 })
                .exec();
        });
    }
    /**
     * Buscar cupons disponíveis para um vendor (ativos e válidos)
     */
    getAvailableCouponsForVendor(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const query = {
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
                        { vendor: new mongoose_1.Types.ObjectId(vendorId) },
                        { vendor: { $exists: false } } // Cupons globais
                    ]
                });
            }
            else {
                query.vendor = { $exists: false }; // Apenas cupons globais
            }
            return yield Coupon_1.Coupon.find(query)
                .sort({ createdAt: -1 })
                .exec();
        });
    }
    /**
     * Validar cupom para um pedido
     */
    validateCoupon(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, vendorId, paymentMethod, orderTotal, deliveryFee = 0 } = params;
            const coupon = yield Coupon_1.Coupon.findOne({ code: code.trim().toUpperCase() }).exec();
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
            let discountAmount = coupon.type === 'percentage'
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
        });
    }
    registerUse(couponId) {
        return __awaiter(this, void 0, void 0, function* () {
            const coupon = yield Coupon_1.Coupon.findOneAndUpdate({
                _id: couponId,
                $or: [
                    { maxUses: { $exists: false } },
                    { $expr: { $lt: ['$usedCount', '$maxUses'] } }
                ]
            }, { $inc: { usedCount: 1 } }, { new: true });
            return !!coupon;
        });
    }
}
exports.CouponService = CouponService;
exports.couponService = new CouponService();
