import { Types } from 'mongoose';
import { mpesaClient } from '../../config/mpesa';
import { Payment } from '../../models/Payment';
import { Order } from '../../models/Order';

export interface CreateMpesaPaymentParams {
  orderId: string;
  phoneNumber: string;
  amount?: number;
  paymentType?: 'purchase' | 'subscription';
  appPaymentOrigin?: string;
  couponId?: string;
  discountAmount?: number;
  idempotencyKey?: string;
}

export class PaymentService {
  private generateReference(): string {
    const digits = Array.from({ length: 10 }, (_, i) => i);

    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }

    return digits.slice(0, 9).join('');
  }

  private resolvePaymentStatus(providerStatus?: string): 'pending' | 'paid' | 'failed' {
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
  async createMpesaPayment(params: CreateMpesaPaymentParams) {
    const {
      orderId,
      phoneNumber,
      amount,
      paymentType,
      appPaymentOrigin,
      couponId,
      discountAmount,
      idempotencyKey
    } = params;

    // Garante que a order existe
    const order = await Order.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw new Error('Pedido não encontrado para pagamento');
    }

    if (order.status === 'cancelled') {
      throw new Error('Não é possível pagar um pedido cancelado');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('Este pedido já foi pago');
    }

    const expectedAmount = Number((order.payableTotal ?? order.total).toFixed(2));
    if (amount !== undefined && Number(amount.toFixed(2)) !== expectedAmount) {
      throw new Error(`Valor do pagamento divergente. Esperado: ${expectedAmount.toFixed(2)} MT`);
    }

    const existingPayment = await Payment.findOne({
      order: order._id,
      status: { $in: ['pending', 'paid'] }
    })
      .sort({ createdAt: -1 })
      .exec();

    if (existingPayment?.status === 'paid') {
      throw new Error('Já existe um pagamento confirmado para este pedido');
    }

    if (existingPayment?.status === 'pending' && idempotencyKey && existingPayment.idempotencyKey === idempotencyKey) {
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

    const paymentLog = await Payment.create({
      order: order._id,
      payer: order.customer,
      vendor: order.vendor,
      method: 'mpesa',
      status: 'pending',
      amount: expectedAmount,
      phoneNumber,
      paymentConversation: undefined,
      transaction: transactionId,
      paymentRef: referenceId,
      ...(couponId && { coupon: new Types.ObjectId(couponId) }),
      ...(discountAmount && { discountAmount }),
      paymentType,
      appPaymentOrigin,
      idempotencyKey: safeIdempotencyKey
    });

    // Chamada ao SDK da M-Pesa
    const mpesaResponse = await mpesaClient.receive(paymentData as any);
    const mappedStatus = this.resolvePaymentStatus((mpesaResponse as any)?.status);

    const updatedPaymentLog = await Payment.findByIdAndUpdate(
      paymentLog._id,
      {
        $set: {
          status: mappedStatus,
          paidAt: mappedStatus === 'paid' ? new Date() : undefined,
          paymentConversation: (mpesaResponse as any)?.conversation,
          transaction: (mpesaResponse as any)?.transaction || transactionId,
          paymentRef: (mpesaResponse as any)?.reference || referenceId,
          providerStatus: (mpesaResponse as any)?.status || 'UNKNOWN',
          providerPayload: mpesaResponse
        }
      },
      { new: true }
    ).exec();

    return { mpesaResponse, paymentLog: updatedPaymentLog || paymentLog };
  }

  async refundPayment(orderId: string, reason?: string) {
    const payment = await Payment.findOne({
      order: new Types.ObjectId(orderId),
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

    return await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          status: 'refunded',
          refundedAt: new Date(),
          refundReason: reason,
          providerStatus: 'REFUND_RECORDED_LOCALLY'
        }
      },
      { new: true }
    ).exec();
  }
}

