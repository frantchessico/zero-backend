"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.Order = void 0;
const mongoose_1 = require("mongoose");
const Address_1 = require("./Address");
const OrderItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    specialInstructions: {
        type: String
    }
}, { _id: false });
const OrderSchema = new mongoose_1.Schema({
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    items: {
        type: [OrderItemSchema],
        required: true,
        validate: [(arr) => arr.length > 0, 'Order must contain at least one item']
    },
    deliveryAddress: {
        type: Address_1.AddressSchema,
        required: true
    },
    deliveryType: {
        type: String,
        enum: ['delivery', 'pickup'],
        default: 'delivery'
    },
    orderType: {
        type: String,
        enum: ['food', 'medicine', 'document', 'appliance'],
        required: true
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    coupon: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    couponCode: {
        type: String,
        trim: true
    },
    appliedPromotionIds: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Promotion'
        }],
    promotionDiscountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    couponDiscountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    loyaltyDiscountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalDiscountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    payableTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    pricingSnapshot: {
        subtotalBeforeDiscounts: { type: Number, min: 0 },
        deliveryFeeBeforeDiscounts: { type: Number, min: 0 },
        taxBeforeDiscounts: { type: Number, min: 0 }
    },
    refundReason: {
        type: String
    },
    cancelledAt: {
        type: Date
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    notes: String
}, {
    timestamps: true
});
// ===== VIRTUALS BIDIRECIONAIS =====
// Virtual para delivery do order
OrderSchema.virtual('delivery', {
    ref: 'Delivery',
    localField: '_id',
    foreignField: 'order',
    justOne: true
});
// Virtual para payment do order
OrderSchema.virtual('payment', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'order',
    justOne: true
});
// Virtual para notifications do order
OrderSchema.virtual('notifications', {
    ref: 'Notification',
    localField: '_id',
    foreignField: 'order',
    justOne: false
});
// Virtual para calcular total de itens
OrderSchema.virtual('totalItems').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});
// Virtual para calcular tempo de preparação
OrderSchema.virtual('preparationTime').get(function () {
    if (this.actualDeliveryTime && this.createdAt) {
        return this.actualDeliveryTime.getTime() - this.createdAt.getTime();
    }
    return null;
});
// ===== MIDDLEWARE DE VALIDAÇÃO =====
// Validar relacionamentos antes de salvar
OrderSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validar se customer existe e está ativo
            const User = (0, mongoose_1.model)('User');
            const customer = yield User.findById(this.customer);
            if (!customer || !customer.isActive) {
                return next(new Error('Customer inválido ou inativo'));
            }
            // Validar se vendor existe e está ativo
            const Vendor = (0, mongoose_1.model)('Vendor');
            const vendor = yield Vendor.findById(this.vendor);
            if (!vendor || vendor.status !== 'active') {
                return next(new Error('Vendor inválido ou inativo'));
            }
            // Validar se todos os produtos existem e estão disponíveis
            const Product = (0, mongoose_1.model)('Product');
            for (const item of this.items) {
                const product = yield Product.findById(item.product);
                if (!product || !product.isAvailable) {
                    return next(new Error(`Produto ${item.product} inválido ou indisponível`));
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
// ===== TRIGGERS AUTOMÁTICOS =====
// Middleware: calcula subtotal e total automaticamente
OrderSchema.pre('save', function (next) {
    if (this.isModified('items') ||
        this.isModified('deliveryFee') ||
        this.isModified('tax') ||
        this.isModified('promotionDiscountAmount') ||
        this.isModified('couponDiscountAmount') ||
        this.isModified('loyaltyDiscountAmount')) {
        this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
        this.total = this.subtotal + this.deliveryFee + this.tax;
        this.totalDiscountAmount =
            (this.promotionDiscountAmount || 0) +
                (this.couponDiscountAmount || 0) +
                (this.loyaltyDiscountAmount || 0);
        this.payableTotal = Math.max(0, this.total - this.totalDiscountAmount);
    }
    if (!this.pricingSnapshot) {
        this.pricingSnapshot = {
            subtotalBeforeDiscounts: this.subtotal,
            deliveryFeeBeforeDiscounts: this.deliveryFee,
            taxBeforeDiscounts: this.tax
        };
    }
    next();
});
// Atualizar customer quando order é criado
OrderSchema.post('save', function (doc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const User = (0, mongoose_1.model)('User');
            yield User.findByIdAndUpdate(doc.customer, {
                $push: { orderHistory: doc._id }
            });
            // Criar notificação para customer
            const Notification = (0, mongoose_1.model)('Notification');
            yield Notification.create({
                user: doc.customer,
                type: 'order_status',
                message: `Pedido #${doc._id} criado com sucesso`,
                order: doc._id
            });
            // Criar notificação para vendor
            yield Notification.create({
                user: doc.vendor,
                type: 'order_status',
                message: `Novo pedido #${doc._id} recebido`,
                order: doc._id
            });
        }
        catch (error) {
            console.error('Error updating related entities:', error);
        }
    });
});
// Atualizar contadores quando order é atualizado
OrderSchema.post('findOneAndUpdate', function (doc) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const update = this.getUpdate();
        if (doc && update && typeof update === 'object' && 'status' in update) {
            try {
                const newStatus = update.status;
                // Criar notificação de mudança de status
                const Notification = (0, mongoose_1.model)('Notification');
                yield Notification.create({
                    user: doc.customer,
                    type: 'order_status',
                    message: `Status do pedido #${doc._id} alterado para: ${newStatus}`,
                    order: doc._id
                });
                // Se entregue, atualizar pontos de fidelidade usando LoyaltyService
                if (newStatus === 'delivered') {
                    try {
                        const { loyaltyService } = yield Promise.resolve().then(() => __importStar(require('../core/loyalty/loyalty.service')));
                        const vendorId = ((_b = (_a = doc.vendor) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || undefined;
                        yield loyaltyService.earnPoints({
                            userId: doc.customer.toString(),
                            orderId: doc._id.toString(),
                            orderTotal: doc.total,
                            vendorId,
                            reason: 'Pedido entregue com sucesso'
                        });
                    }
                    catch (loyaltyError) {
                        // Não falhar a atualização do pedido se o sistema de fidelidade falhar
                        console.error('Erro ao adicionar pontos de fidelidade:', loyaltyError);
                    }
                }
            }
            catch (error) {
                console.error('Error updating order status:', error);
            }
        }
    });
});
// ===== MÉTODOS DE INSTÂNCIA =====
// Verificar se order pode ser cancelado
OrderSchema.methods.canCancel = function () {
    const cancellableStatuses = ['pending', 'confirmed', 'preparing'];
    return cancellableStatuses.includes(this.status);
};
// Verificar se order pode ser entregue
OrderSchema.methods.canDeliver = function () {
    return this.status === 'ready' && this.paymentStatus === 'paid';
};
// Obter tempo estimado de entrega
OrderSchema.methods.getEstimatedDeliveryTime = function () {
    if (this.estimatedDeliveryTime) {
        return this.estimatedDeliveryTime;
    }
    // Calcular baseado no tipo de entrega
    const now = new Date();
    if (this.deliveryType === 'pickup') {
        return new Date(now.getTime() + 30 * 60 * 1000); // +30 min
    }
    else {
        return new Date(now.getTime() + 60 * 60 * 1000); // +1 hora
    }
};
// Obter estatísticas do order
OrderSchema.methods.getStats = function () {
    return {
        totalItems: this.totalItems,
        preparationTime: this.preparationTime,
        isDeliverable: this.canDeliver(),
        isCancellable: this.canCancel(),
        estimatedDelivery: this.getEstimatedDeliveryTime()
    };
};
// Configurar para incluir virtuals no JSON
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });
exports.Order = (0, mongoose_1.model)('Order', OrderSchema);
