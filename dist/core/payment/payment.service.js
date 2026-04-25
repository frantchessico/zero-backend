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
exports.PaymentService = void 0;
const mongoose_1 = require("mongoose");
const mpesa_1 = require("../../config/mpesa");
const Payment_1 = require("../../models/Payment");
const Order_1 = require("../../models/Order");
class PaymentService {
    generateReference() {
        const digits = Array.from({ length: 10 }, (_, i) => i);
        for (let i = digits.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [digits[i], digits[j]] = [digits[j], digits[i]];
        }
        return digits.slice(0, 9).join('');
    }
    resolvePaymentStatus(providerStatus) {
        if (!providerStatus) {
            return 'pending';
        }
        if (['INSUFFICIENT_BALANCE', 'FAILED', 'ERROR', 'CANCELLED'].includes(providerStatus)) {
            return 'failed';
        }
        if (['PENDING', 'QUEUED', 'PROCESSING'].includes(providerStatus)) {
            return 'pending';
        }
        return 'paid';
    }
    /**
     * Cria um pagamento via M-Pesa e registra o log em Payment
     */
    createMpesaPayment(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { orderId, phoneNumber, amount, paymentType, appPaymentOrigin, couponId, discountAmount, idempotencyKey } = params;
            // Garante que a order existe
            const order = yield Order_1.Order.findById(new mongoose_1.Types.ObjectId(orderId));
            if (!order) {
                throw new Error('Pedido não encontrado para pagamento');
            }
            if (order.status === 'cancelled') {
                throw new Error('Não é possível pagar um pedido cancelado');
            }
            if (order.paymentStatus === 'paid') {
                throw new Error('Este pedido já foi pago');
            }
            const expectedAmount = Number(((_a = order.payableTotal) !== null && _a !== void 0 ? _a : order.total).toFixed(2));
            if (amount !== undefined && Number(amount.toFixed(2)) !== expectedAmount) {
                throw new Error(`Valor do pagamento divergente. Esperado: ${expectedAmount.toFixed(2)} MT`);
            }
            const existingPayment = yield Payment_1.Payment.findOne({
                order: order._id,
                status: { $in: ['pending', 'paid'] }
            })
                .sort({ createdAt: -1 })
                .exec();
            if ((existingPayment === null || existingPayment === void 0 ? void 0 : existingPayment.status) === 'paid') {
                throw new Error('Já existe um pagamento confirmado para este pedido');
            }
            if ((existingPayment === null || existingPayment === void 0 ? void 0 : existingPayment.status) === 'pending' && idempotencyKey && existingPayment.idempotencyKey === idempotencyKey) {
                return {
                    mpesaResponse: existingPayment.providerPayload || { status: existingPayment.providerStatus || 'PENDING' },
                    paymentLog: existingPayment
                };
            }
            const transactionId = this.generateReference();
            const referenceId = this.generateReference();
            const safeIdempotencyKey = idempotencyKey || `${orderId}:${expectedAmount}:${phoneNumber}`;
            const paymentData = {
                from: phoneNumber,
                transaction: transactionId,
                reference: referenceId,
                amount: expectedAmount
            };
            const paymentLog = yield Payment_1.Payment.create(Object.assign(Object.assign(Object.assign({ order: order._id, payer: order.customer, vendor: order.vendor, method: 'mpesa', status: 'pending', amount: expectedAmount, phoneNumber, paymentConversation: undefined, transaction: transactionId, paymentRef: referenceId }, (couponId && { coupon: new mongoose_1.Types.ObjectId(couponId) })), (discountAmount && { discountAmount })), { paymentType,
                appPaymentOrigin, idempotencyKey: safeIdempotencyKey }));
            // Chamada ao SDK da M-Pesa
            const mpesaResponse = yield mpesa_1.mpesaClient.receive(paymentData);
            const mappedStatus = this.resolvePaymentStatus(mpesaResponse === null || mpesaResponse === void 0 ? void 0 : mpesaResponse.status);
            const updatedPaymentLog = yield Payment_1.Payment.findByIdAndUpdate(paymentLog._id, {
                $set: {
                    status: mappedStatus,
                    paidAt: mappedStatus === 'paid' ? new Date() : undefined,
                    paymentConversation: mpesaResponse === null || mpesaResponse === void 0 ? void 0 : mpesaResponse.conversation,
                    transaction: (mpesaResponse === null || mpesaResponse === void 0 ? void 0 : mpesaResponse.transaction) || transactionId,
                    paymentRef: (mpesaResponse === null || mpesaResponse === void 0 ? void 0 : mpesaResponse.reference) || referenceId,
                    providerStatus: (mpesaResponse === null || mpesaResponse === void 0 ? void 0 : mpesaResponse.status) || 'UNKNOWN',
                    providerPayload: mpesaResponse
                }
            }, { new: true }).exec();
            return { mpesaResponse, paymentLog: updatedPaymentLog || paymentLog };
        });
    }
    refundPayment(orderId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield Payment_1.Payment.findOne({
                order: new mongoose_1.Types.ObjectId(orderId),
                status: 'paid'
            })
                .sort({ createdAt: -1 })
                .exec();
            if (!payment) {
                return null;
            }
            if (payment.status === 'refunded') {
                return payment;
            }
            return yield Payment_1.Payment.findByIdAndUpdate(payment._id, {
                $set: {
                    status: 'refunded',
                    refundedAt: new Date(),
                    refundReason: reason,
                    providerStatus: 'REFUND_RECORDED_LOCALLY'
                }
            }, { new: true }).exec();
        });
    }
}
exports.PaymentService = PaymentService;
