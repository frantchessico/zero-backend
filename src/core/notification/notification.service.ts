import { Notification } from '../../models/Notification';
import { Driver } from '../../models/Driver';
import { Order } from '../../models/Order';
import { Types } from 'mongoose';
import { INotification } from '../../models/interfaces';


export class NotificationService {
  /**
   * Criar uma nova notificação
   */
  async createNotification(
    userId: string,
    type: 'order_status' | 'delivery_update' | 'promotion',
    message: string
  ): Promise<INotification> {
    try {
      const notification = new Notification({
        user: new Types.ObjectId(userId),
        type,
        message
      });
      const saved = await notification.save();
      
      // Converter para nossa interface
      return {
        _id: saved._id.toString(),
        user: saved.user.toString(),
        type: saved.type as 'order_status' | 'delivery_update' | 'promotion',
        message: saved.message,
        read: saved.read,
        sentAt: saved.sentAt
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Notificar vendor sobre novo pedido
   */
  async notifyVendorNewOrder(vendorId: string, orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'userId')
        .populate('vendor', 'name owner')
        .exec();
      
      if (!order) throw new Error('Pedido não encontrado');



      const message = `Novo pedido #${orderId.slice(-6)} recebido de ${order.customer}. Total: ${order.total.toFixed(2)} MT`;

      await this.createNotification(
        (vendorId as any)._id.toString(),
        'order_status',
        message
      );

      // Aqui você pode integrar com push notifications, SMS, email, etc.
      console.log(`Notificação enviada para vendor ${vendorId}: ${message}`);
    } catch (error) {
      console.error('Erro ao notificar vendor:', error);
      throw error;
    }
  }

  /**
   * Notificar drivers disponíveis sobre pedido pronto para entrega
   */
  async notifyDriversOrderReady(orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId)
        .populate('vendor', 'name address')
        .populate('customer', 'userId')
        .exec();
      
      if (!order) throw new Error('Pedido não encontrado');

      // Buscar drivers disponíveis na área
      const availableDrivers = await Driver.find({
        isAvailable: true,
        isActive: true,
        isVerified: true,
        deliveryAreas: { $in: [order.deliveryAddress.neighborhood, order.deliveryAddress.city] }
      }).exec();

      const message = `Novo pedido disponível para entrega! De: ${(order.vendor as any).name} Para: ${order.deliveryAddress.neighborhood}. Valor: ${order.total.toFixed(2)} MT`;

      // Enviar notificação para todos os drivers disponíveis
      const notifications = availableDrivers.map(driver => 
        this.createNotification(
          (driver._id as Types.ObjectId).toString(),
          'delivery_update',
          message
        )
      );

      await Promise.all(notifications);

      console.log(`Notificação enviada para ${availableDrivers.length} drivers sobre pedido #${orderId.slice(-6)}`);
    } catch (error) {
      console.error('Erro ao notificar drivers:', error);
      throw error;
    }
  }

  /**
   * Notificar driver específico sobre atribuição de entrega
   */
  async notifyDriverAssigned(driverId: string, orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId)
        .populate('vendor', 'name address')
        .populate('customer', 'userId phoneNumber')
        .exec();
      
      if (!order) throw new Error('Pedido não encontrado');

      const message = `Entrega atribuída! Retirar em: ${(order.vendor as any).name} (${(order.vendor as any).address.streetName}). Entregar em: ${order.deliveryAddress.streetName}, ${order.deliveryAddress.neighborhood}`;

      await this.createNotification(
        driverId,
        'delivery_update',
        message
      );

      console.log(`Driver ${driverId} notificado sobre atribuição do pedido #${orderId.slice(-6)}`);
    } catch (error) {
      console.error('Erro ao notificar driver sobre atribuição:', error);
      throw error;
    }
  }

  /**
   * Notificar cliente sobre mudança de status do pedido
   */
  async notifyCustomerOrderStatus(
    customerId: string, 
    orderId: string, 
    status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
  ): Promise<void> {
    try {
      const statusMessages: Record<string, string> = {
        confirmed: 'Seu pedido foi confirmado e está sendo preparado',
        preparing: 'Seu pedido está sendo preparado',
        ready: 'Seu pedido está pronto e aguardando entrega',
        out_for_delivery: 'Seu pedido saiu para entrega',
        delivered: 'Seu pedido foi entregue com sucesso',
        cancelled: 'Seu pedido foi cancelado'
      };

      const message = `Pedido #${orderId.slice(-6)}: ${statusMessages[status] || 'Status atualizado'}`;

      await this.createNotification(
        customerId,
        'order_status',
        message
      );

      console.log(`Cliente ${customerId} notificado sobre mudança de status: ${status}`);
    } catch (error) {
      console.error('Erro ao notificar cliente:', error);
      throw error;
    }
  }

  /**
   * Buscar notificações de um usuário
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { user: new Types.ObjectId(userId) };
    
    if (unreadOnly) query.read = false;

    const [notificationDocs, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ sentAt: -1 })
        .exec(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: new Types.ObjectId(userId), read: false })
    ]);

    // Converter documentos do Mongoose para nossa interface
    const notifications: INotification[] = notificationDocs.map(doc => ({
      _id: doc._id.toString(),
      user: doc.user.toString(),
      type: doc.type as 'order_status' | 'delivery_update' | 'promotion',
      message: doc.message,
      read: doc.read,
      sentAt: doc.sentAt
    }));

    return {
      notifications,
      total,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: string): Promise<INotification | null> {
    const doc = await Notification.findByIdAndUpdate(
      notificationId,
      { $set: { read: true } },
      { new: true }
    ).exec();

    if (!doc) return null;

    // Converter para nossa interface
    return {
      _id: doc._id.toString(),
      user: doc.user.toString(),
      type: doc.type as 'order_status' | 'delivery_update' | 'promotion',
      message: doc.message,
      read: doc.read,
      sentAt: doc.sentAt
    };
  }

  /**
   * Marcar todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { user: new Types.ObjectId(userId), read: false },
      { $set: { read: true } }
    );
    return result.modifiedCount;
  }

  /**
   * Deletar notificação
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await Notification.findByIdAndDelete(notificationId);
    return !!result;
  }

  /**
   * Deletar notificações antigas (mais de 30 dias)
   */
  async deleteOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      sentAt: { $lt: thirtyDaysAgo }
    });

    return result.deletedCount;
  }

  /**
   * Obter estatísticas de notificações
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recent: number; // últimas 24h
  }> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [totalCount, unreadCount, typeStats, recentCount] = await Promise.all([
      Notification.countDocuments({ user: new Types.ObjectId(userId) }),
      Notification.countDocuments({ user: new Types.ObjectId(userId), read: false }),
      Notification.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Notification.countDocuments({
        user: new Types.ObjectId(userId),
        sentAt: { $gte: twentyFourHoursAgo }
      })
    ]);

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byType[stat._id] = stat.count;
    });

    return {
      total: totalCount,
      unread: unreadCount,
      byType,
      recent: recentCount
    };
  }

  /**
   * Buscar drivers próximos para notificação
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusInKm: number = 10
  ): Promise<any> {
    // Converter km para metros para o MongoDB
    const radiusInMeters = radiusInKm * 1000;

    return await Driver.find({
      isAvailable: true,
      isActive: true,
      isVerified: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).limit(10).exec();
  }

  /**
   * Notificar drivers próximos sobre pedido disponível
   */
  async notifyNearbyDrivers(
    latitude: number,
    longitude: number,
    orderId: string,
    radiusInKm: number = 10
  ): Promise<void> {
    try {
      const nearbyDrivers = await this.findNearbyDrivers(latitude, longitude, radiusInKm);
      
      if (nearbyDrivers.length === 0) {
        console.log('Nenhum driver disponível encontrado na área');
        return;
      }

      const order = await Order.findById(orderId)
        .populate('vendor', 'name')
        .exec();
      
      if (!order) throw new Error('Pedido não encontrado');

      const message = `Novo pedido próximo a você! De: ${(order.vendor as any).name}. Distância estimada: ${radiusInKm}km. Valor: ${order.total.toFixed(2)} MT`;

      const notifications = nearbyDrivers.map((driver: any) => 
        this.createNotification(
          (driver._id as Types.ObjectId).toString(),
          'delivery_update',
          message
        )
      );

      await Promise.all(notifications);

      console.log(`${nearbyDrivers.length} drivers próximos notificados sobre pedido #${orderId.slice(-6)}`);
    } catch (error) {
      console.error('Erro ao notificar drivers próximos:', error);
      throw error;
    }
  }

  /**
   * Enviar notificação promocional
   */
  async sendPromotionalNotification(
    userIds: string[],
    message: string
  ): Promise<number> {
    try {
      const notifications = userIds.map(userId => 
        this.createNotification(userId, 'promotion', message)
      );

      await Promise.all(notifications);
      return userIds.length;
    } catch (error) {
      console.error('Erro ao enviar notificações promocionais:', error);
      throw error;
    }
  }
}