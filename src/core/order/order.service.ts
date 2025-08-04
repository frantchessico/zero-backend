import { Types } from 'mongoose';
import { IOrder, IOrderItem } from '../../models/interfaces';
import { Order } from '../../models/Order';
import { NotificationService } from '../notification/notification.service';
import { User } from '../../models/User';

export class OrderService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Criar um novo pedido
   */
  async createOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    try {
      const order = new Order(orderData);
      const savedOrder = await order.save();

      // Notificar vendor automaticamente
      await this.notifyVendorNewOrder(savedOrder);

      return savedOrder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Notificar vendor sobre novo pedido
   */
  private async notifyVendorNewOrder(order: IOrder): Promise<void> {
    try {
      // Buscar o vendor associado ao pedido
      const vendor = await User.findOne({ 
        role: 'vendor',
        vendorId: order.vendor 
      });

      if (vendor) {
        // Buscar dados do cliente para a mensagem
        const customer = await User.findById(order.customer);
        const customerName = customer?.userId || 'Cliente';

        const message = `Novo pedido #${order._id?.toString().slice(-6)} recebido de ${customerName}. Total: ${order.total?.toFixed(2)} MT`;

        await this.notificationService.createNotification(
          vendor._id?.toString() || '',
          'order_status',
          message
        );

        console.log(`✅ Notificação enviada para vendor ${vendor.userId}: ${message}`);
      } else {
        console.warn(`⚠️ Vendor não encontrado para o pedido ${order._id}`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao notificar vendor:', error.message);
      // Não interromper o fluxo principal se a notificação falhar
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

    // Aplicar filtros
    if (filters.customer) query.customer = new Types.ObjectId(filters.customer);
    if (filters.vendor) query.vendor = new Types.ObjectId(filters.vendor);
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.orderType) query.orderType = filters.orderType;
    if (filters.deliveryType) query.deliveryType = filters.deliveryType;
    
    // Filtro por data
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
  async updateOrderStatus(
    orderId: string, 
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
  ): Promise<IOrder | null> {
    const updateData: any = { status };
    
    // Se o status for 'delivered', definir o tempo de entrega
    if (status === 'delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');

    if (updatedOrder) {
      // Notificar sobre mudança de status
      await this.notifyOrderStatusChange(updatedOrder, status);
    }

    return updatedOrder;
  }

  /**
   * Notificar sobre mudança de status do pedido
   */
  private async notifyOrderStatusChange(order: IOrder, newStatus: string): Promise<void> {
    try {
      const statusMessages = {
        'confirmed': 'Seu pedido foi confirmado e está sendo preparado!',
        'preparing': 'Seu pedido está sendo preparado!',
        'ready': 'Seu pedido está pronto para entrega!',
        'out_for_delivery': 'Seu pedido saiu para entrega!',
        'delivered': 'Seu pedido foi entregue! Obrigado por escolher nossos serviços.',
        'cancelled': 'Seu pedido foi cancelado.'
      };

      const message = statusMessages[newStatus as keyof typeof statusMessages] || `Status do pedido atualizado para: ${newStatus}`;

      // Notificar cliente
      if (order.customer) {
        await this.notificationService.createNotification(
          order.customer.toString(),
          'order_status',
          message
        );
      }

      // Notificar vendor sobre mudanças importantes
      if (['confirmed', 'preparing', 'ready', 'delivered'].includes(newStatus)) {
        const vendor = await User.findOne({ 
          role: 'vendor',
          vendorId: order.vendor 
        });

        if (vendor) {
          const vendorMessage = `Pedido #${order._id?.toString().slice(-6)} - Status: ${newStatus}`;
          await this.notificationService.createNotification(
            vendor._id?.toString() || '',
            'order_status',
            vendorMessage
          );
        }
      }

      console.log(`✅ Notificação de status enviada: ${newStatus} - Pedido ${order._id}`);
    } catch (error: any) {
      console.error('❌ Erro ao notificar mudança de status:', error.message);
      // Não interromper o fluxo principal se a notificação falhar
    }
  }

  /**
   * Atualizar status de pagamento
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  ): Promise<IOrder | null> {
    return await Order.findByIdAndUpdate(
      orderId,
      { $set: { paymentStatus } },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');
  }

  /**
   * Cancelar pedido
   */
  async cancelOrder(orderId: string, reason?: string): Promise<IOrder | null> {
    const updateData: any = { 
      status: 'cancelled',
      paymentStatus: 'refunded'
    };
    
    if (reason) {
      updateData.notes = reason;
    }

    const cancelledOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');

    if (cancelledOrder) {
      // Notificar sobre cancelamento
      await this.notifyOrderCancellation(cancelledOrder, reason);
    }

    return cancelledOrder;
  }

  /**
   * Notificar sobre cancelamento do pedido
   */
  private async notifyOrderCancellation(order: IOrder, reason?: string): Promise<void> {
    try {
      const cancelMessage = reason 
        ? `Seu pedido foi cancelado. Motivo: ${reason}`
        : 'Seu pedido foi cancelado.';

      // Notificar cliente
      if (order.customer) {
        await this.notificationService.createNotification(
          order.customer.toString(),
          'order_status',
          cancelMessage
        );
      }

      // Notificar vendor
      const vendor = await User.findOne({ 
        role: 'vendor',
        vendorId: order.vendor 
      });

      if (vendor) {
        const vendorMessage = `Pedido #${order._id?.toString().slice(-6)} foi cancelado${reason ? ` - Motivo: ${reason}` : ''}`;
        await this.notificationService.createNotification(
          vendor._id?.toString() || '',
          'order_status',
          vendorMessage
        );
      }

      console.log(`✅ Notificação de cancelamento enviada - Pedido ${order._id}`);
    } catch (error: any) {
      console.error('❌ Erro ao notificar cancelamento:', error.message);
      // Não interromper o fluxo principal se a notificação falhar
    }
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
    return await Order.findByIdAndUpdate(
      orderId,
      { $set: { deliveryAddress } },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');
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

    const [
      totalStats,
      statusStats,
      typeStats
    ] = await Promise.all([
      Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
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
    statusStats.forEach(stat => {
      ordersByStatus[stat._id] = stat.count;
    });

    const ordersByType: Record<string, number> = {};
    typeStats.forEach(stat => {
      ordersByType[stat._id] = stat.count;
    });

    return {
      ...stats,
      averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
      ordersByStatus,
      ordersByType
    };
  }

  /**
   * Buscar pedidos próximos ao tempo de entrega
   */
  async getOrdersNearDeliveryTime(minutesBefore: number = 15): Promise<IOrder[]> {
    const now = new Date();
    const timeLimit = new Date(now.getTime() + (minutesBefore * 60 * 1000));

    return await Order.find({
      status: { $in: ['preparing', 'ready', 'out_for_delivery'] },
      estimatedDeliveryTime: {
        $gte: now,
        $lte: timeLimit
      }
    })
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category')
      .sort({ estimatedDeliveryTime: 1 })
      .exec();
  }

  /**
   * Buscar pedidos atrasados
   */
  async getOverdueOrders(): Promise<IOrder[]> {
    const now = new Date();

    return await Order.find({
      status: { $in: ['preparing', 'ready', 'out_for_delivery'] },
      estimatedDeliveryTime: { $lt: now }
    })
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category')
      .sort({ estimatedDeliveryTime: 1 })
      .exec();
  }

  /**
   * Buscar receita por período
   */
  async getRevenueByPeriod(
    startDate: Date,
    endDate: Date,
    vendorId?: string
  ): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    dailyRevenue: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
  }> {
    const matchQuery: any = {
      status: 'delivered',
      paymentStatus: 'paid',
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (vendorId) matchQuery.vendor = new Types.ObjectId(vendorId);

    const [totalStats, dailyStats] = await Promise.all([
      Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const stats = totalStats[0] || { totalRevenue: 0, totalOrders: 0 };
    const dailyRevenue = dailyStats.map(stat => ({
      date: stat._id,
      revenue: stat.revenue,
      orders: stat.orders
    }));

    return {
      ...stats,
      averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
      dailyRevenue
    };
  }

  /**
   * Deletar pedido (apenas para admin)
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    const result = await Order.findByIdAndDelete(orderId);
    return !!result;
  }

  /**
   * Verificar se pedido existe
   */
  async orderExists(orderId: string): Promise<boolean> {
    const order = await Order.findById(orderId);
    return !!order;
  }

  /**
   * Atualizar itens do pedido (apenas para pedidos pending)
   */
  async updateOrderItems(
    orderId: string,
    items: IOrderItem[]
  ): Promise<IOrder | null> {
    const order = await Order.findById(orderId);
    
    if (!order || order.status !== 'pending') {
      throw new Error('Não é possível atualizar itens de pedidos que não estão pendentes');
    }

    return await Order.findByIdAndUpdate(
      orderId,
      { $set: { items } },
      { new: true }
    )
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category');
  }

  /**
   * Buscar pedidos por intervalo de datas
   */
  async getOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    vendorId?: string
  ): Promise<IOrder[]> {
    const query: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (vendorId) query.vendor = new Types.ObjectId(vendorId);

    return await Order.find(query)
      .populate('customer', 'userId email phoneNumber')
      .populate('vendor', 'name type address')
      .populate('items.product', 'name price images category')
      .sort({ createdAt: -1 })
      .exec();
  }
}