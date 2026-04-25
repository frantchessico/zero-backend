import { Types } from 'mongoose';
import { IOrder, IOrderItem } from '../../models/interfaces';
import { Order } from '../../models/Order';
import { NotificationService } from '../notification/notification.service';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import ProductModel from '../../models/Product';
import { promotionService } from '../promotion/promotion.service';
import { loyaltyService } from '../loyalty/loyalty.service';
import { PaymentService } from '../payment/payment.service';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface ResolvedOrderPricing {
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  promotionDiscountAmount: number;
  loyaltyDiscountAmount: number;
  totalDiscountAmount: number;
  payableTotal: number;
  appliedPromotionIds: Types.ObjectId[];
  pricingSnapshot: NonNullable<IOrder['pricingSnapshot']>;
  orderType: IOrder['orderType'];
}

export class OrderService {
  private notificationService: NotificationService;
  private paymentService: PaymentService;

  constructor() {
    this.notificationService = new NotificationService();
    this.paymentService = new PaymentService();
  }

  private toObjectId(value: unknown, fieldName: string): Types.ObjectId {
    const rawValue = value instanceof Types.ObjectId ? value.toString() : String(value || '');

    if (!Types.ObjectId.isValid(rawValue)) {
      throw new Error(`${fieldName} inválido`);
    }

    return new Types.ObjectId(rawValue);
  }

  private getNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }

    return Number(parsed.toFixed(2));
  }

  private normalizeOrderType(
    requestedType: IOrder['orderType'] | undefined,
    firstProductType?: string
  ): IOrder['orderType'] {
    if (requestedType && ['food', 'medicine', 'document', 'appliance'].includes(requestedType)) {
      return requestedType;
    }

    switch (firstProductType) {
      case 'food':
        return 'food';
      case 'medicine':
        return 'medicine';
      case 'appliance':
        return 'appliance';
      default:
        return 'document';
    }
  }

  private async ensureVendorCanReceiveOrders(vendorId: Types.ObjectId) {
    const vendor = await Vendor.findById(vendorId).exec();
    if (!vendor) {
      throw new Error('Estabelecimento não encontrado');
    }

    if (vendor.status !== 'active') {
      throw new Error('Estabelecimento indisponível para pedidos');
    }

    if (vendor.temporarilyClosed) {
      throw new Error(vendor.closedMessage || 'Estabelecimento temporariamente fechado');
    }

    if (!vendor.open24h) {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5);
      const todayHours = vendor.workingHours.find((workingHour) => workingHour.day === currentDay);

      if (!todayHours || !todayHours.active) {
        throw new Error('Estabelecimento fechado hoje');
      }

      if (!todayHours.open || !todayHours.close) {
        throw new Error('Horário de funcionamento indisponível');
      }

      if (currentTime < todayHours.open || currentTime > todayHours.close) {
        throw new Error('Estabelecimento fora do horário de funcionamento');
      }
    }

    return vendor;
  }

  private async resolvePricing(orderData: Partial<IOrder>): Promise<ResolvedOrderPricing> {
    const vendorId = this.toObjectId(orderData.vendor, 'vendor');
    const customerId = this.toObjectId(orderData.customer, 'customer');
    const requestItems = orderData.items || [];

    if (!requestItems.length) {
      throw new Error('O pedido deve conter pelo menos um item');
    }

    const products = await ProductModel.find({
      _id: { $in: requestItems.map((item) => this.toObjectId(item.product, 'produto')) },
      vendor: vendorId,
      isAvailable: true
    }).exec();

    if (products.length !== requestItems.length) {
      throw new Error('Um ou mais produtos são inválidos, não pertencem ao estabelecimento ou estão indisponíveis');
    }

    const productById = new Map(products.map((product) => [String(product._id), product]));
    const resolvedItems: IOrderItem[] = requestItems.map((item) => {
      const productId = this.toObjectId(item.product, 'produto').toString();
      const product = productById.get(productId);

      if (!product) {
        throw new Error(`Produto ${productId} não encontrado para este estabelecimento`);
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inválida para o produto ${product.name}`);
      }

      const unitPrice = Number(product.price.toFixed(2));
      const totalPrice = Number((unitPrice * quantity).toFixed(2));

      return {
        product: product._id as Types.ObjectId,
        quantity,
        unitPrice,
        totalPrice,
        specialInstructions: item.specialInstructions
      };
    });

    const subtotal = Number(resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
    const deliveryFee = orderData.deliveryType === 'pickup' ? 0 : this.getNumber(orderData.deliveryFee, 0);
    const tax = this.getNumber(orderData.tax, 0);

    const promotionPricing = await promotionService.calculateOrderPromotions(
      vendorId.toString(),
      resolvedItems.map((item) => ({
        productId: item.product.toString(),
        unitPrice: item.unitPrice,
        quantity: item.quantity
      })),
      subtotal
    );

    const loyaltyDiscountAmount = await loyaltyService.getAutomaticDiscount(
      customerId.toString(),
      subtotal,
      vendorId.toString()
    );

    const total = Number((subtotal + deliveryFee + tax).toFixed(2));
    const totalDiscountAmount = Number(
      Math.min(total, promotionPricing.totalDiscountAmount + loyaltyDiscountAmount).toFixed(2)
    );
    const payableTotal = Number(Math.max(0, total - totalDiscountAmount).toFixed(2));

    return {
      items: resolvedItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      promotionDiscountAmount: Number(promotionPricing.totalDiscountAmount.toFixed(2)),
      loyaltyDiscountAmount: Number(loyaltyDiscountAmount.toFixed(2)),
      totalDiscountAmount,
      payableTotal,
      appliedPromotionIds: promotionPricing.appliedPromotionIds.map((id) => new Types.ObjectId(id)),
      pricingSnapshot: {
        subtotalBeforeDiscounts: subtotal,
        deliveryFeeBeforeDiscounts: deliveryFee,
        taxBeforeDiscounts: tax
      },
      orderType: this.normalizeOrderType(orderData.orderType, products[0]?.type)
    };
  }

  private async notifyVendorNewOrder(order: IOrder): Promise<void> {
    try {
      const vendor = await Vendor.findById(order.vendor).exec();
      if (!vendor?.owner) {
        return;
      }

      const customer = await User.findById(order.customer).exec();
      const customerName = customer?.userId || 'Cliente';
      const orderId = order._id?.toString() || '';
      const message = `Novo pedido #${orderId.slice(-6)} recebido de ${customerName}. Total a pagar: ${(order.payableTotal ?? order.total).toFixed(2)} MT`;

      await this.notificationService.createNotification(
        vendor.owner.toString(),
        'order_status',
        message,
        {
          orderId,
          metadata: {
            status: order.status,
            payableTotal: order.payableTotal ?? order.total
          }
        }
      );
    } catch (error: any) {
      console.error('❌ Erro ao notificar vendor:', error.message);
    }
  }

  private async notifyOrderStatusChange(order: IOrder, newStatus: OrderStatus): Promise<void> {
    try {
      const orderId = order._id?.toString() || '';
      const statusMessages: Record<OrderStatus, string> = {
        pending: 'Seu pedido foi criado e está aguardando confirmação.',
        confirmed: 'Seu pedido foi confirmado e está sendo preparado.',
        preparing: 'Seu pedido está em preparação.',
        ready: 'Seu pedido está pronto.',
        out_for_delivery: 'Seu pedido saiu para entrega.',
        delivered: 'Seu pedido foi entregue com sucesso.',
        cancelled: 'Seu pedido foi cancelado.'
      };

      if (order.customer) {
        await this.notificationService.createNotification(
          order.customer.toString(),
          'order_status',
          statusMessages[newStatus],
          {
            orderId,
            metadata: {
              status: newStatus
            }
          }
        );
      }

      const vendor = await Vendor.findById(order.vendor).exec();
      if (vendor?.owner) {
        await this.notificationService.createNotification(
          vendor.owner.toString(),
          'order_status',
          `Pedido #${orderId.slice(-6)} atualizado para ${newStatus}.`,
          {
            orderId,
            metadata: {
              status: newStatus
            }
          }
        );
      }
    } catch (error: any) {
      console.error('❌ Erro ao notificar mudança de status:', error.message);
    }
  }

  private async notifyOrderCancellation(order: IOrder, reason?: string): Promise<void> {
    try {
      const orderId = order._id?.toString() || '';
      const reasonSuffix = reason ? ` Motivo: ${reason}` : '';

      if (order.customer) {
        await this.notificationService.createNotification(
          order.customer.toString(),
          'order_status',
          `Seu pedido foi cancelado.${reasonSuffix}`,
          {
            orderId,
            metadata: {
              status: 'cancelled',
              reason
            }
          }
        );
      }

      const vendor = await Vendor.findById(order.vendor).exec();
      if (vendor?.owner) {
        await this.notificationService.createNotification(
          vendor.owner.toString(),
          'order_status',
          `Pedido #${orderId.slice(-6)} cancelado.${reasonSuffix}`,
          {
            orderId,
            metadata: {
              status: 'cancelled',
              reason
            }
          }
        );
      }
    } catch (error: any) {
      console.error('❌ Erro ao notificar cancelamento:', error.message);
    }
  }

  private getValidNextStatuses(order: IOrder): OrderStatus[] {
    const statusMap: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'ready', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: order.deliveryType === 'pickup' ? ['delivered', 'cancelled'] : ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered'],
      delivered: [],
      cancelled: []
    };

    return statusMap[order.status];
  }

  /**
   * Criar um novo pedido
   */
  async createOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    try {
      if (!orderData.vendor || !orderData.customer || !orderData.paymentMethod || !orderData.deliveryAddress) {
        throw new Error('customer, vendor, paymentMethod e deliveryAddress são obrigatórios');
      }

      await this.ensureVendorCanReceiveOrders(this.toObjectId(orderData.vendor, 'vendor'));
      const resolvedPricing = await this.resolvePricing(orderData);

      const order = new Order({
        ...orderData,
        customer: this.toObjectId(orderData.customer, 'customer'),
        vendor: this.toObjectId(orderData.vendor, 'vendor'),
        items: resolvedPricing.items,
        deliveryType: orderData.deliveryType || 'delivery',
        orderType: resolvedPricing.orderType,
        subtotal: resolvedPricing.subtotal,
        deliveryFee: resolvedPricing.deliveryFee,
        tax: resolvedPricing.tax,
        total: resolvedPricing.total,
        status: orderData.status || 'pending',
        paymentStatus: orderData.paymentStatus || 'pending',
        promotionDiscountAmount: resolvedPricing.promotionDiscountAmount,
        couponDiscountAmount: 0,
        loyaltyDiscountAmount: resolvedPricing.loyaltyDiscountAmount,
        totalDiscountAmount: resolvedPricing.totalDiscountAmount,
        payableTotal: resolvedPricing.payableTotal,
        appliedPromotionIds: resolvedPricing.appliedPromotionIds,
        pricingSnapshot: resolvedPricing.pricingSnapshot
      });

      const savedOrder = await order.save();
      await this.notifyVendorNewOrder(savedOrder);

      return savedOrder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar pedido por ID
   */
  async getOrderById(orderId: string): Promise<IOrder | null> {
    return await Order.findById(orderId)
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category')
      .exec();
  }

  /**
   * Listar todos os pedidos com filtros e paginação
   */
  async getAllOrders(
    page: number = 1,
    limit: number = 10,
    filters: {
      customer?: string;
      vendor?: string;
      status?: string;
      paymentStatus?: string;
      orderType?: string;
      deliveryType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    orders: IOrder[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.customer) query.customer = new Types.ObjectId(filters.customer);
    if (filters.vendor) query.vendor = new Types.ObjectId(filters.vendor);
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.orderType) query.orderType = filters.orderType;
    if (filters.deliveryType) query.deliveryType = filters.deliveryType;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'userId email phoneNumber')
        .populate('vendor', 'name type address')
        .populate('items.product', 'name price images category')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Order.countDocuments(query)
    ]);

    return {
      orders,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Buscar pedidos por cliente
   */
  async getOrdersByCustomer(
    customerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: IOrder[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const query = { customer: new Types.ObjectId(customerId) };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('vendor', 'name type address')
        .populate('items.product', 'name price images category')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Order.countDocuments(query)
    ]);

    return {
      orders,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Buscar pedidos por vendor
   */
  async getOrdersByVendor(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    orders: IOrder[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { vendor: new Types.ObjectId(vendorId) };

    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'userId email phoneNumber')
        .populate('items.product', 'name price images category')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      Order.countDocuments(query)
    ]);

    return {
      orders,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Buscar pedidos por status
   */
  async getOrdersByStatus(status: string): Promise<IOrder[]> {
    return await Order.find({ status })
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Atualizar status do pedido
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<IOrder | null> {
    const order = await Order.findById(orderId).exec();
    if (!order) {
      return null;
    }

    if (status === 'cancelled') {
      return await this.cancelOrder(orderId);
    }

    const validNextStatuses = this.getValidNextStatuses(order);
    if (!validNextStatuses.includes(status)) {
      throw new Error(`Transição de status inválida: ${order.status} -> ${status}`);
    }

    if (
      ['ready', 'out_for_delivery', 'delivered'].includes(status) &&
      order.paymentMethod !== 'cash' &&
      order.paymentStatus !== 'paid'
    ) {
      throw new Error('O pedido precisa estar pago antes de avançar para este status');
    }

    order.status = status;

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();

      if (order.paymentMethod === 'cash' && order.paymentStatus === 'pending') {
        order.paymentStatus = 'paid';
      }
    }

    const updatedOrder = await order.save();

    if (status === 'delivered') {
      try {
        await loyaltyService.earnPoints({
          userId: order.customer.toString(),
          orderId: order._id.toString(),
          orderTotal: order.payableTotal ?? order.total,
          vendorId: order.vendor.toString()
        });
      } catch (error: any) {
        console.warn(`⚠️ Não foi possível creditar pontos do pedido ${order._id}: ${error.message}`);
      }
    }

    await this.notifyOrderStatusChange(updatedOrder, status);
    return await this.getOrderById(orderId);
  }

  /**
   * Atualizar status de pagamento
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<IOrder | null> {
    const order = await Order.findById(orderId).exec();
    if (!order) {
      return null;
    }

    order.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid' && order.status === 'pending') {
      order.status = 'confirmed';
    }

    if (paymentStatus === 'refunded' && order.status !== 'cancelled') {
      order.status = 'cancelled';
      order.cancelledAt = order.cancelledAt || new Date();
    }

    const updatedOrder = await order.save();

    await this.notificationService.createNotification(
      order.customer.toString(),
      'payment_update',
      `Pagamento do pedido #${order._id.toString().slice(-6)} atualizado para ${paymentStatus}.`,
      {
        orderId,
        metadata: {
          paymentStatus,
          payableTotal: order.payableTotal ?? order.total
        }
      }
    );

    return updatedOrder;
  }

  async applyCouponToOrder(params: {
    orderId: string;
    couponId: string;
    couponCode: string;
    discountAmount: number;
  }): Promise<IOrder | null> {
    const { orderId, couponId, couponCode, discountAmount } = params;
    const order = await Order.findById(orderId).exec();
    if (!order) {
      return null;
    }

    order.coupon = new Types.ObjectId(couponId);
    order.couponCode = couponCode.trim().toUpperCase();
    order.couponDiscountAmount = Number(Math.max(0, discountAmount).toFixed(2));
    order.totalDiscountAmount = Number(
      (
        (order.promotionDiscountAmount || 0) +
        (order.loyaltyDiscountAmount || 0) +
        order.couponDiscountAmount
      ).toFixed(2)
    );
    order.payableTotal = Number(Math.max(0, order.total - order.totalDiscountAmount).toFixed(2));

    return await order.save();
  }

  /**
   * Cancelar pedido
   */
  async cancelOrder(orderId: string, reason?: string): Promise<IOrder | null> {
    const order = await Order.findById(orderId).exec();
    if (!order) {
      return null;
    }

    if (order.status === 'delivered') {
      throw new Error('Não é possível cancelar um pedido já entregue');
    }

    let nextPaymentStatus = order.paymentStatus;
    if (order.paymentStatus === 'paid') {
      const refund = await this.paymentService.refundPayment(orderId, reason);
      nextPaymentStatus = refund ? 'refunded' : 'paid';
    }

    order.status = 'cancelled';
    order.paymentStatus = nextPaymentStatus;
    order.cancelledAt = new Date();
    order.refundReason = reason;

    if (reason) {
      order.notes = order.notes ? `${order.notes}\nCancelamento: ${reason}` : `Cancelamento: ${reason}`;
    }

    const cancelledOrder = await order.save();
    await this.notifyOrderCancellation(cancelledOrder, reason);

    return await this.getOrderById(orderId);
  }

  /**
   * Atualizar tempo estimado de entrega
   */
  async updateEstimatedDeliveryTime(
    orderId: string,
    estimatedDeliveryTime: Date
  ): Promise<IOrder | null> {
    return await Order.findByIdAndUpdate(
      orderId,
      { $set: { estimatedDeliveryTime } },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');
  }

  /**
   * Adicionar notas ao pedido
   */
  async addOrderNotes(orderId: string, notes: string): Promise<IOrder | null> {
    return await Order.findByIdAndUpdate(
      orderId,
      { $set: { notes } },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');
  }

  /**
   * Atualizar endereço de entrega
   */
  async updateDeliveryAddress(
    orderId: string,
    deliveryAddress: {
      street: string;
      district: string;
      city: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    }
  ): Promise<IOrder | null> {
    const order = await Order.findById(orderId).exec();
    if (!order) {
      return null;
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new Error('O endereço só pode ser alterado antes do preparo do pedido');
    }

    order.deliveryAddress = deliveryAddress as any;
    return await order.save();
  }

  /**
   * Calcular estatísticas de pedidos
   */
  async getOrderStatistics(
    vendorId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    ordersByType: Record<string, number>;
    completedOrders: number;
    cancelledOrders: number;
  }> {
    const matchQuery: any = {};

    if (vendorId) matchQuery.vendor = new Types.ObjectId(vendorId);
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = startDate;
      if (endDate) matchQuery.createdAt.$lte = endDate;
    }

    const [totalStats, statusStats, typeStats] = await Promise.all([
      Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$paymentStatus', 'paid'] },
                      { $ne: ['$status', 'cancelled'] }
                    ]
                  },
                  { $ifNull: ['$payableTotal', '$total'] },
                  0
                ]
              }
            },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$orderType', count: { $sum: 1 } } }
      ])
    ]);

    const stats = totalStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    const ordersByStatus: Record<string, number> = {};
    statusStats.forEach((stat) => {
      ordersByStatus[stat._id] = stat.count;
    });

    const ordersByType: Record<string, number> = {};
    typeStats.forEach((stat) => {
      ordersByType[stat._id] = stat.count;
    });

    return {
      ...stats,
      averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
      ordersByStatus,
      ordersByType
    };
  }
}
