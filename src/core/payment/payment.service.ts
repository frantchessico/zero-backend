import { Types } from 'mongoose';
import { mpesaClient } from '../../config/mpesa';
import { Payment } from '../../models/Payment';
import { Order } from '../../models/Order';

export interface CreateMpesaPaymentParams {
  orderId: string;
  phoneNumber: string;
  amount: number;
  paymentType?: 'purchase' | 'subscription';
  appPaymentOrigin?: string;
  couponId?: string;
  discountAmount?: number;
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

  /**
   * Cria um pagamento via M-Pesa e registra o log em Payment
   */
  async createMpesaPayment(params: CreateMpesaPaymentParams) {
    const { orderId, phoneNumber, amount, paymentType, appPaymentOrigin, couponId, discountAmount } = params;

    // Garante que a order existe
    const order = await Order.findById(new Types.ObjectId(orderId));
    if (!order) {
      throw new Error('Pedido não encontrado para pagamento');
    }

    const transactionId = this.generateReference();
    const referenceId = this.generateReference();

    const paymentData = {
      from: phoneNumber,
      transaction: transactionId,
      reference: referenceId,
      amount
    };

    // Chamada ao SDK da M-Pesa
    const mpesaResponse = await mpesaClient.receive(paymentData as any);

    const paymentLog = await Payment.create({
      order: order._id,
      payer: order.customer,      // quem fez o pedido (user lógico)
      vendor: order.vendor,      // estabelecimento associado ao pedido
      method: 'mpesa',
      status: mpesaResponse?.status === 'INSUFFICIENT_BALANCE' || mpesaResponse?.status === 'FAILED'
        ? 'failed'
        : 'paid',
      amount,
      paidAt: new Date(),
      phoneNumber,
      paymentConversation: (mpesaResponse as any)?.conversation,
      transaction: (mpesaResponse as any)?.transaction,
      paymentRef: (mpesaResponse as any)?.reference,
      ...(couponId && { coupon: new Types.ObjectId(couponId) }),
      ...(discountAmount && { discountAmount }),
      paymentType,
      appPaymentOrigin
    });

    return { mpesaResponse, paymentLog };
  }
}


