import { Delivery } from '../../models/Delivery';
import { Order } from '../../models/Order';
import { Driver } from '../../models/Driver';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import { NotificationService } from '../notification/notification.service';
import { DriverService } from '../driver/driver.service';
import { Types } from 'mongoose';

export interface CreateDeliveryDTO {
  orderId: string;
  driverId?: string;
  estimatedTime?: Date;
}

export interface UpdateDeliveryDTO {
  status?: 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  currentLocation?: {
    lat: number;
    lng: number;
  };
  estimatedTime?: Date;
  failureReason?: string;
}

export interface DeliveryFilters {
  orderId?: string;
  driverId?: string;
  status?: 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  vendorId?: string;
}

class DeliveryService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  private async notifyOrderStakeholders(params: {
    order: any;
    type: 'delivery_update' | 'order_status';
    customerMessage?: string;
    vendorMessage?: string;
    driverMessage?: string;
    deliveryId?: string;
    metadata?: Record<string, any>;
  }) {
    const { order, type, customerMessage, vendorMessage, driverMessage, deliveryId, metadata } = params;
    const orderId = order._id?.toString();

    if (customerMessage) {
      await this.notificationService.createNotification(
        order.customer.toString(),
        type,
        customerMessage,
        { orderId, deliveryId, metadata }
      );
    }

    const vendor = await Vendor.findById(order.vendor).exec();
    if (vendor?.owner && vendorMessage) {
      await this.notificationService.createNotification(
        vendor.owner.toString(),
        type,
        vendorMessage,
        { orderId, deliveryId, metadata }
      );
    }

    if (driverMessage && deliveryId) {
      const delivery = await Delivery.findById(deliveryId).select('driver').exec();
      if (delivery?.driver) {
        await this.notificationService.createNotification(
          delivery.driver.toString(),
          type,
          driverMessage,
          { orderId, deliveryId, metadata }
        );
      }
    }
  }

  // Criar entrega
  async createDelivery(deliveryData: CreateDeliveryDTO): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(deliveryData.orderId)) {
        throw new Error('ID do pedido inválido');
      }

      const existingDelivery = await Delivery.findOne({ order: deliveryData.orderId }).exec();
      if (existingDelivery) {
        throw new Error('Já existe uma entrega para este pedido');
      }

      const order = await Order.findById(deliveryData.orderId)
        .populate('customer')
        .populate('vendor');

      if (!order) throw new Error('Pedido não encontrado');
      if (order.deliveryType !== 'delivery') {
        throw new Error('Apenas pedidos com entrega podem gerar delivery');
      }

      if (order.status !== 'ready') {
        throw new Error('Pedido não está pronto para entrega');
      }

      if (order.paymentMethod !== 'cash' && order.paymentStatus !== 'paid') {
        throw new Error('Pedido precisa estar pago para sair para entrega');
      }

      let assignedDriver;

      if (!deliveryData.driverId) {
        const availableDrivers = await DriverService.findAvailableDrivers(
          {
            latitude: order.deliveryAddress.coordinates?.lat || 0,
            longitude: order.deliveryAddress.coordinates?.lng || 0
          },
          order.deliveryAddress.neighborhood || order.deliveryAddress.city || '',
          5000
        );

        if (availableDrivers.length === 0) {
          throw new Error('Nenhum motorista disponível encontrado');
        }

        assignedDriver = availableDrivers[0];
      } else {
        assignedDriver = await Driver.findById(deliveryData.driverId).exec();
        if (!assignedDriver) throw new Error('Motorista não encontrado');
        if (!assignedDriver.isAvailable || !assignedDriver.isVerified) {
          throw new Error('Motorista não está disponível');
        }
      }

      const delivery = new Delivery({
        order: order._id,
        driver: assignedDriver.userId,
        status: 'picked_up',
        currentLocation: assignedDriver.currentLocation
          ? {
              lat: assignedDriver.currentLocation.latitude,
              lng: assignedDriver.currentLocation.longitude
            }
          : undefined,
        assignedAt: new Date(),
        estimatedTime: deliveryData.estimatedTime || new Date(Date.now() + 30 * 60000)
      });

      await delivery.save();

      order.status = 'out_for_delivery';
      await order.save();

      assignedDriver.isAvailable = false;
      await assignedDriver.save();

      await this.notifyOrderStakeholders({
        order,
        type: 'delivery_update',
        customerMessage: `Seu pedido saiu para entrega com o motorista ${assignedDriver.licenseNumber}.`,
        vendorMessage: `Pedido #${order._id?.toString().slice(-8)} saiu para entrega.`,
        driverMessage: 'Nova entrega atribuída. Verifique a rota e os detalhes do pedido.',
        deliveryId: delivery._id.toString(),
        metadata: {
          status: 'picked_up'
        }
      });

      return {
        delivery: await delivery.populate(['order', 'driver']),
        driver: {
          id: assignedDriver._id,
          userId: assignedDriver.userId,
          licenseNumber: assignedDriver.licenseNumber,
          vehicleInfo: assignedDriver.vehicleInfo,
          rating: assignedDriver.rating
        }
      };
    } catch (error: any) {
      throw new Error(`Erro ao criar entrega: ${error.message}`);
    }
  }

  // Buscar entrega por ID
  async getDeliveryById(id: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('ID inválido');
      }

      const delivery = await Delivery.findById(id)
        .populate({
          path: 'order',
          populate: [
            { path: 'customer', select: 'userId phoneNumber email' },
            { path: 'vendor', select: 'name type address' }
          ]
        })
        .populate('driver', 'licenseNumber vehicleInfo rating currentLocation');

      if (!delivery) throw new Error('Entrega não encontrada');
      return delivery;
    } catch (error: any) {
      throw new Error(`Erro ao buscar entrega: ${error.message}`);
    }
  }

  // Listar entregas com filtros
  async getDeliveries(filters: DeliveryFilters = {}): Promise<any[]> {
    try {
      const query: any = {};

      if (filters.orderId) query.order = filters.orderId;
      if (filters.driverId) query.driver = filters.driverId;
      if (filters.status) query.status = filters.status;

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
        if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
      }

      if (filters.customerId || filters.vendorId) {
        const orders = await Order.find({
          ...(filters.customerId && { customer: filters.customerId }),
          ...(filters.vendorId && { vendor: filters.vendorId })
        }).select('_id');

        query.order = { $in: orders.map((order) => order._id) };
      }

      return await Delivery.find(query)
        .populate({
          path: 'order',
          populate: [
            { path: 'customer', select: 'userId phoneNumber' },
            { path: 'vendor', select: 'name type' }
          ]
        })
        .populate('driver', 'licenseNumber vehicleInfo rating')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new Error(`Erro ao buscar entregas: ${error.message}`);
    }
  }

  // Atualizar entrega
  async updateDelivery(id: string, updateData: UpdateDeliveryDTO): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('ID inválido');
      }

      const delivery = await Delivery.findById(id).populate(['order']);
      if (!delivery) throw new Error('Entrega não encontrada');

      const validTransitions: Record<string, string[]> = {
        picked_up: ['in_transit', 'failed'],
        in_transit: ['delivered', 'failed'],
        delivered: [],
        failed: ['picked_up']
      };

      if (updateData.status && !validTransitions[delivery.status].includes(updateData.status)) {
        throw new Error(`Transição de status inválida: ${delivery.status} -> ${updateData.status}`);
      }

      if (updateData.currentLocation) {
        delivery.currentLocation = updateData.currentLocation;
      }

      if (updateData.estimatedTime) {
        delivery.estimatedTime = updateData.estimatedTime;
      }

      if (updateData.status) {
        delivery.status = updateData.status;
      }

      if (updateData.failureReason) {
        delivery.failureReason = updateData.failureReason;
      }

      if (updateData.status === 'delivered') {
        delivery.deliveredAt = new Date();
      }

      await delivery.save();

      if (updateData.status) {
        await this.handleStatusChange(delivery, updateData.status, updateData.failureReason);
      }

      return await delivery.populate(['order', 'driver']);
    } catch (error: any) {
      throw new Error(`Erro ao atualizar entrega: ${error.message}`);
    }
  }

  private async handleStatusChange(delivery: any, newStatus: string, failureReason?: string): Promise<void> {
    const order = await Order.findById(delivery.order).exec();
    if (!order) {
      return;
    }

    switch (newStatus) {
      case 'in_transit':
        order.status = 'out_for_delivery';
        await order.save();

        await this.notifyOrderStakeholders({
          order,
          type: 'delivery_update',
          customerMessage: 'Seu pedido está a caminho.',
          vendorMessage: `Pedido #${order._id?.toString().slice(-8)} está em trânsito.`,
          deliveryId: delivery._id.toString(),
          metadata: { status: 'in_transit' }
        });
        break;

      case 'delivered':
        await DriverService.completeDelivery(delivery._id.toString());
        break;

      case 'failed': {
        order.status = 'ready';
        await order.save();

        const driver = await Driver.findOne({ userId: delivery.driver }).exec();
        if (driver) {
          driver.isAvailable = true;
          await driver.save();
        }

        await this.notifyOrderStakeholders({
          order,
          type: 'delivery_update',
          customerMessage: `Houve um problema na entrega: ${failureReason || 'motivo não informado'}.`,
          vendorMessage: `Falha na entrega do pedido #${order._id?.toString().slice(-8)}.`,
          deliveryId: delivery._id.toString(),
          metadata: {
            status: 'failed',
            failureReason
          }
        });
        break;
      }
    }
  }

  // Rastrear entrega em tempo real
  async trackDelivery(deliveryId: string): Promise<any> {
    try {
      const delivery = await Delivery.findById(deliveryId)
        .populate({
          path: 'order',
          select: 'deliveryAddress estimatedDeliveryTime customer',
          populate: {
            path: 'customer',
            select: 'userId phoneNumber'
          }
        })
        .populate('driver', 'licenseNumber vehicleInfo currentLocation');

      if (!delivery) throw new Error('Entrega não encontrada');

      const driver = delivery.driver as any;
      const order = delivery.order as any;

      let estimatedDistance = null;
      let estimatedTimeRemaining = null;

      if (driver.currentLocation && order.deliveryAddress.coordinates) {
        const driverLat = driver.currentLocation.latitude;
        const driverLng = driver.currentLocation.longitude;
        const destLat = order.deliveryAddress.coordinates.lat;
        const destLng = order.deliveryAddress.coordinates.lng;

        estimatedDistance = this.calculateDistance(driverLat, driverLng, destLat, destLng);
        estimatedTimeRemaining = Math.ceil((estimatedDistance / 30) * 60);
      }

      return {
        delivery: {
          id: delivery._id,
          status: delivery.status,
          estimatedTime: delivery.estimatedTime,
          currentLocation: delivery.currentLocation
        },
        driver: {
          id: driver._id,
          licenseNumber: driver.licenseNumber,
          vehicleInfo: driver.vehicleInfo,
          currentLocation: driver.currentLocation
        },
        order: {
          id: order._id,
          deliveryAddress: order.deliveryAddress,
          estimatedDeliveryTime: order.estimatedDeliveryTime
        },
        tracking: {
          estimatedDistance: estimatedDistance ? `${estimatedDistance.toFixed(2)} km` : null,
          estimatedTimeRemaining: estimatedTimeRemaining ? `${estimatedTimeRemaining} min` : null,
          lastLocationUpdate: driver.currentLocation?.lastUpdated
        }
      };
    } catch (error: any) {
      throw new Error(`Erro ao rastrear entrega: ${error.message}`);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getActiveDeliveriesByDriver(driverId: string): Promise<any[]> {
    try {
      if (!Types.ObjectId.isValid(driverId)) {
        throw new Error('ID do motorista inválido');
      }

      const driver = await Driver.findById(driverId).exec();
      if (!driver) {
        throw new Error('Motorista não encontrado');
      }

      return await Delivery.find({
        driver: driver.userId,
        status: { $in: ['picked_up', 'in_transit'] }
      })
        .populate({
          path: 'order',
          populate: [
            { path: 'customer', select: 'userId phoneNumber' },
            { path: 'vendor', select: 'name address' }
          ]
        })
        .sort({ createdAt: -1 });
    } catch (error: any) {
      throw new Error(`Erro ao buscar entregas ativas: ${error.message}`);
    }
  }

  async getDeliveryHistoryByCustomer(customerId: string, limit: number = 10): Promise<any[]> {
    try {
      if (!Types.ObjectId.isValid(customerId)) {
        throw new Error('ID do cliente inválido');
      }

      const orders = await Order.find({ customer: customerId }).select('_id');
      const orderIds = orders.map((order) => order._id);

      return await Delivery.find({ order: { $in: orderIds } })
        .populate({
          path: 'order',
          populate: {
            path: 'vendor',
            select: 'name type'
          }
        })
        .populate('driver', 'licenseNumber rating vehicleInfo')
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error: any) {
      throw new Error(`Erro ao buscar histórico de entregas: ${error.message}`);
    }
  }

  async getDeliveryStatsByVendor(vendorId: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(vendorId)) {
        throw new Error('ID do vendor inválido');
      }

      const orders = await Order.find({ vendor: vendorId }).select('_id actualDeliveryTime createdAt');
      const orderIds = orders.map((order) => order._id);

      const deliveries = await Delivery.find({
        order: { $in: orderIds }
      }).populate('order');

      const totalDeliveries = deliveries.length;
      const completedDeliveries = deliveries.filter((delivery) => delivery.status === 'delivered').length;
      const failedDeliveries = deliveries.filter((delivery) => delivery.status === 'failed').length;
      const inProgressDeliveries = deliveries.filter((delivery) =>
        ['picked_up', 'in_transit'].includes(delivery.status)
      ).length;

      const completedWithTimes = deliveries.filter((delivery: any) =>
        delivery.status === 'delivered' && delivery.deliveredAt && delivery.order?.createdAt
      );

      let averageDeliveryTime = 0;
      if (completedWithTimes.length > 0) {
        const totalTime = completedWithTimes.reduce((sum: number, delivery: any) => {
          const orderTime = new Date(delivery.order.createdAt).getTime();
          const deliveryTime = new Date(delivery.deliveredAt).getTime();
          return sum + (deliveryTime - orderTime);
        }, 0);

        averageDeliveryTime = totalTime / completedWithTimes.length / (1000 * 60);
      }

      return {
        totalDeliveries,
        completedDeliveries,
        failedDeliveries,
        inProgressDeliveries,
        successRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        recentDeliveries: deliveries.slice(0, 5)
      };
    } catch (error: any) {
      throw new Error(`Erro ao obter estatísticas de entregas: ${error.message}`);
    }
  }

  async cancelDelivery(deliveryId: string, reason: string): Promise<any> {
    try {
      const delivery = await Delivery.findById(deliveryId).exec();
      if (!delivery) throw new Error('Entrega não encontrada');

      if (['delivered', 'failed'].includes(delivery.status)) {
        throw new Error('Não é possível cancelar entrega finalizada');
      }

      delivery.status = 'failed';
      delivery.failureReason = reason;
      await delivery.save();

      const order = await Order.findById(delivery.order).exec();
      if (order) {
        order.status = 'ready';
        await order.save();
      }

      const driver = await Driver.findOne({ userId: delivery.driver }).exec();
      if (driver) {
        driver.isAvailable = true;
        await driver.save();
      }

      if (order) {
        await this.notifyOrderStakeholders({
          order,
          type: 'delivery_update',
          customerMessage: `Entrega cancelada: ${reason}. Estamos buscando outro motorista.`,
          vendorMessage: `Entrega do pedido #${order._id?.toString().slice(-8)} cancelada.`,
          deliveryId: delivery._id.toString(),
          metadata: {
            status: 'failed',
            reason
          }
        });
      }

      return {
        message: 'Entrega cancelada com sucesso',
        delivery,
        reason
      };
    } catch (error: any) {
      throw new Error(`Erro ao cancelar entrega: ${error.message}`);
    }
  }

  async reassignDelivery(deliveryId: string, newDriverId?: string): Promise<any> {
    try {
      const delivery = await Delivery.findById(deliveryId).exec();
      if (!delivery) throw new Error('Entrega não encontrada');

      const order = await Order.findById(delivery.order).exec();
      if (!order) throw new Error('Pedido da entrega não encontrado');

      const oldDriver = await Driver.findOne({ userId: delivery.driver }).exec();

      let newDriver;
      if (newDriverId) {
        newDriver = await Driver.findById(newDriverId).exec();
        if (!newDriver || !newDriver.isAvailable || !newDriver.isVerified) {
          throw new Error('Novo motorista não está disponível');
        }
      } else {
        const availableDrivers = await DriverService.findAvailableDrivers(
          {
            latitude: order.deliveryAddress.coordinates?.lat || 0,
            longitude: order.deliveryAddress.coordinates?.lng || 0
          },
          order.deliveryAddress.neighborhood || order.deliveryAddress.city || '',
          5000
        );

        if (availableDrivers.length === 0) {
          throw new Error('Nenhum motorista disponível encontrado');
        }

        newDriver = availableDrivers[0];
      }

      delivery.driver = newDriver.userId as any;
      delivery.status = 'picked_up';
      delivery.failureReason = undefined;
      delivery.currentLocation = newDriver.currentLocation
        ? {
            lat: newDriver.currentLocation.latitude,
            lng: newDriver.currentLocation.longitude
          }
        : undefined;
      delivery.assignedAt = new Date();
      await delivery.save();

      if (oldDriver) {
        oldDriver.isAvailable = true;
        await oldDriver.save();
      }

      newDriver.isAvailable = false;
      await newDriver.save();

      await this.notifyOrderStakeholders({
        order,
        type: 'delivery_update',
        customerMessage: `Novo motorista atribuído: ${newDriver.licenseNumber}. Sua entrega está a caminho.`,
        vendorMessage: `Entrega do pedido #${order._id?.toString().slice(-8)} foi reatribuída.`,
        driverMessage: 'Entrega reatribuída. Confira os detalhes da rota.',
        deliveryId: delivery._id.toString(),
        metadata: {
          status: 'picked_up',
          reassigned: true
        }
      });

      return {
        message: 'Entrega reatribuída com sucesso',
        delivery: await delivery.populate(['order', 'driver']),
        oldDriver: oldDriver
          ? {
              id: oldDriver._id,
              licenseNumber: oldDriver.licenseNumber
            }
          : null,
        newDriver: {
          id: newDriver._id,
          licenseNumber: newDriver.licenseNumber,
          vehicleInfo: newDriver.vehicleInfo
        }
      };
    } catch (error: any) {
      throw new Error(`Erro ao reatribuir entrega: ${error.message}`);
    }
  }
}

export default new DeliveryService();
