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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promotionService = exports.PromotionService = void 0;
const mongoose_1 = require("mongoose");
const Promotion_1 = require("../../models/Promotion");
const Product_1 = __importDefault(require("../../models/Product"));
class PromotionService {
    createPromotion(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.validatePromotionInput(data);
            const promotion = new Promotion_1.Promotion({
                vendor: new mongoose_1.Types.ObjectId(data.vendorId),
                product: data.productId ? new mongoose_1.Types.ObjectId(data.productId) : undefined,
                title: data.title,
                description: data.description,
                type: data.type,
                value: data.value,
                minOrderAmount: data.minOrderAmount,
                maxDiscountAmount: data.maxDiscountAmount,
                startDate: data.startDate,
                endDate: data.endDate
            });
            return yield promotion.save();
        });
    }
    updatePromotion(promotionId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (data.vendorId || data.productId || data.type || data.value !== undefined) {
                const current = yield Promotion_1.Promotion.findById(promotionId).exec();
                if (!current) {
                    return null;
                }
                yield this.validatePromotionInput({
                    vendorId: data.vendorId || current.vendor.toString(),
                    productId: data.productId || ((_a = current.product) === null || _a === void 0 ? void 0 : _a.toString()),
                    title: data.title || current.title,
                    description: data.description || current.description,
                    type: data.type || current.type,
                    value: (_b = data.value) !== null && _b !== void 0 ? _b : current.value,
                    minOrderAmount: (_c = data.minOrderAmount) !== null && _c !== void 0 ? _c : current.minOrderAmount,
                    maxDiscountAmount: (_d = data.maxDiscountAmount) !== null && _d !== void 0 ? _d : current.maxDiscountAmount,
                    startDate: data.startDate || current.startDate,
                    endDate: data.endDate || current.endDate
                });
            }
            return yield Promotion_1.Promotion.findByIdAndUpdate(promotionId, {
                $set: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (data.productId && { product: new mongoose_1.Types.ObjectId(data.productId) })), (data.title && { title: data.title })), (data.description && { description: data.description })), (data.type && { type: data.type })), (data.value !== undefined && { value: data.value })), (data.minOrderAmount !== undefined && { minOrderAmount: data.minOrderAmount })), (data.maxDiscountAmount !== undefined && { maxDiscountAmount: data.maxDiscountAmount })), (data.startDate && { startDate: data.startDate })), (data.endDate && { endDate: data.endDate })), (data.isActive !== undefined && { isActive: data.isActive }))
            }, { new: true, runValidators: true });
        });
    }
    getVendorPromotions(vendorId_1) {
        return __awaiter(this, arguments, void 0, function* (vendorId, onlyActive = false) {
            const query = {
                vendor: new mongoose_1.Types.ObjectId(vendorId)
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
            return yield Promotion_1.Promotion.find(query)
                .populate('product', 'name price type')
                .sort({ createdAt: -1 })
                .exec();
        });
    }
    getProductActivePromotions(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            return yield Promotion_1.Promotion.find({
                product: new mongoose_1.Types.ObjectId(productId),
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
        });
    }
    calculateOrderPromotions(vendorId, items, subtotal) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const [productPromotions, vendorPromotions] = yield Promise.all([
                Promotion_1.Promotion.find({
                    vendor: new mongoose_1.Types.ObjectId(vendorId),
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
                Promotion_1.Promotion.find({
                    vendor: new mongoose_1.Types.ObjectId(vendorId),
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
            const appliedPromotionIds = new Set();
            let productDiscountAmount = 0;
            for (const item of items) {
                const eligibleProductPromotions = productPromotions.filter((promotion) => {
                    var _a;
                    return ((_a = promotion.product) === null || _a === void 0 ? void 0 : _a.toString()) === item.productId &&
                        (!promotion.minOrderAmount || subtotal >= promotion.minOrderAmount);
                });
                if (eligibleProductPromotions.length === 0) {
                    continue;
                }
                const itemBaseAmount = item.unitPrice * item.quantity;
                let bestDiscount = 0;
                let bestPromotionId = null;
                for (const promotion of eligibleProductPromotions) {
                    let discount = promotion.type === 'percentage'
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
            let bestVendorPromotionId = null;
            for (const promotion of vendorPromotions) {
                if (promotion.minOrderAmount && remainingSubtotal < promotion.minOrderAmount) {
                    continue;
                }
                let discount = promotion.type === 'percentage'
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
        });
    }
    validatePromotionInput(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.startDate && data.endDate && data.startDate > data.endDate) {
                throw new Error('A data inicial da promoção não pode ser maior que a data final');
            }
            if (data.type === 'percentage' && data.value > 100) {
                throw new Error('Promoções percentuais não podem exceder 100%');
            }
            if (data.productId) {
                const product = yield Product_1.default.findById(data.productId).exec();
                if (!product) {
                    throw new Error('Produto da promoção não encontrado');
                }
                if (product.vendor.toString() !== data.vendorId) {
                    throw new Error('O produto precisa pertencer ao mesmo vendor da promoção');
                }
            }
        });
    }
}
exports.PromotionService = PromotionService;
exports.promotionService = new PromotionService();
