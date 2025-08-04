// services/deliveryService.ts
import { Delivery } from '../../models/Delivery';
import { Order } from '../../models/Order';
import { Driver } from '../../models/Driver';
import { User } from '../../models/User';
import { NotificationService } from '../notification/notification.service';
import { DriverService } from '../driver/driver.service';
import { Types } from 'mongoose';

export interface CreateDeliveryDTO {
  orderId: string;
  driverId?: string; // Opcional, pode ser atribuído automaticamente
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

  // Criar entrega (integração com Order, Driver, User, Vendor)
  async createDelivery(deliveryData: CreateDeliveryDTO): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(deliveryData.orderId)) {
        throw new Error('ID do pedido inválido');
      }

      // Buscar pedido
      const order = await Order.findById(deliveryData.orderId)
        .populate('customer')
        .populate('vendor');

      if (!order) throw new Error('Pedido não encontrado');
      if (order.status !== 'ready' && order.status !== 'confirmed') {
        throw new Error('Pedido não está pronto para entrega');
      }

      let assignedDriver;
      
      // Se motorista não foi especificado, encontrar um disponível
      if (!deliveryData.driverId) {
        const availableDrivers = await DriverService.findAvailableDrivers(
          {
            latitude: order.deliveryAddress.coordinates?.lat || 0,
            longitude: order.deliveryAddress.coordinates?.lng || 0
          },
          order.deliveryAddress.neighborhood || '',
          5000 // 5km
        );

        if (availableDrivers.length === 0) {
          throw new Error('Nenhum motorista disponível encontrado');
        }

        assignedDriver = availableDrivers[0];
        deliveryData.driverId = assignedDriver._id?.toString() || '';
      } else {
        assignedDriver = await Driver.findById(deliveryData.driverId);
        if (!assignedDriver) throw new Error('Motorista não encontrado');
        if (!assignedDriver.isAvailable) throw new Error('Motorista não está disponível');
      }

      // Criar entrega
      const delivery = new Delivery({
        order: deliveryData.orderId,
        driver: deliveryData.driverId,
        status: 'picked_up',
        currentLocation: assignedDriver.currentLocation ? {
          lat: assignedDriver.currentLocation.latitude,
          lng: assignedDriver.currentLocation.longitude
        } : undefined,
        estimatedTime: deliveryData.estimatedTime || new Date(Date.now() + 30 * 60000) // 30 min padrão
      });

      await delivery.save();

      // Atualizar status do pedido
      order.status = 'out_for_delivery';
      await order.save();

      // Atualizar status do motorista
      assignedDriver.isAvailable = false;
      assignedDriver.totalDeliveries += 1;
      await assignedDriver.save();

      // Notificar cliente
      const customer = await User.findById(order.customer);
      if (customer) {
        await this.notificationService.createNotification(
          customer._id?.toString() || '',
          'delivery_update',
          `Seu pedido saiu para entrega! Motorista: ${assignedDriver.licenseNumber}`
        );
      }

      // Notificar vendor
      const vendor = await User.findOne({ role: 'vendor' }).populate({
        path: 'vendor',
        match: { _id: order.vendor }
      });

      if (vendor) {
        await this.notificationService.createNotification(
          vendor._id?.toString() || '',
          'delivery_update',
          `Pedido #${order._id?.toString().slice(-8)} foi coletado para entrega`
        );
      }

      return {
        delivery: await delivery.populate(['order', 'driver']),
        driver: {
          id: assignedDriver._id,
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

      let deliveryQuery = Delivery.find(query)
        .populate({
          path: 'order',
          populate: [
            { path: 'customer', select: 'userId phoneNumber' },
            { path: 'vendor', select: 'name type' }
          ]
        })
        .populate('driver', 'licenseNumber vehicleInfo rating')
        .sort({ createdAt: -1 });

      // Filtros adicionais baseados no pedido
      if (filters.customerId || filters.vendorId) {
        const orders = await Order.find({
          ...(filters.customerId && { customer: filters.customerId }),
          ...(filters.vendorId && { vendor: filters.vendorId })
        }).select('_id');

        const orderIds = orders.map(order => order._id);
        query.order = { $in: orderIds };
        
        deliveryQuery = Delivery.find(query)
          .populate({
            path: 'order',
            populate: [
              { path: 'customer', select: 'userId phoneNumber' },
              { path: 'vendor', select: 'name type' }
            ]
          })
          .populate('driver', 'licenseNumber vehicleInfo rating')
          .sort({ createdAt: -1 });
      }

      return await deliveryQuery.exec();
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

      const delivery = await Delivery.findById(id).populate(['order', 'driver']);
      if (!delivery) throw new Error('Entrega não encontrada');

      // Validar transições de status
      const validTransitions: Record<string, string[]> = {
        'picked_up': ['in_transit', 'failed'],
        'in_transit': ['delivered', 'failed'],
        'delivered': [], // Status final
        'failed': ['picked_up'] // Pode tentar novamente
      };

      if (updateData.status && !validTransitions[delivery.status].includes(updateData.status)) {
        throw new Error(`Transição de status inválida: ${delivery.status} -> ${updateData.status}`);
      }

      // Atualizar entrega
      const updatedDelivery = await Delivery.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate(['order', 'driver']);

      // Processar mudanças de status
      if (updateData.status && updateData.status !== delivery.status) {
        await this.handleStatusChange(updatedDelivery, updateData.status, updateData.failureReason);
      }

      return updatedDelivery;
    } catch (error: any) {
      throw new Error(`Erro ao atualizar entrega: ${error.message}`);
    }
  }

  // Processar mudanças de status (integração com Order, Driver, Notification)
  private async handleStatusChange(delivery: any, newStatus: string, failureReason?: string): Promise<void> {
    const order = delivery.order;
    const driver = delivery.driver;

    switch (newStatus) {
      case 'in_transit':
        // Atualizar status do pedido
        order.status = 'out_for_delivery';
        await order.save();

        // Notificar cliente
        const customer = await User.findById(order.customer);
        if (customer) {
          await this.notificationService.createNotification(
            customer._id?.toString() || '',
            'delivery_update',
            'Seu pedido está a caminho!'
          );
        }
        break;

      case 'delivered':
        // Finalizar entrega usando DriverService
        await DriverService.completeDelivery(delivery._id.toString());
        break;

      case 'failed':
        // Atualizar status do pedido
        order.status = 'confirmed'; // Voltar para status anterior
        await order.save();

        // Liberar motorista
        await Driver.findByIdAndUpdate(driver._id, { isAvailable: true });

        // Notificar cliente sobre falha
        const customerFailed = await User.findById(order.customer);
        if (customerFailed) {
          await this.notificationService.createNotification(
            customerFailed._id?.toString() || '',
            'delivery_update',
            `Problema na entrega: ${failureReason || 'Motivo não informado'}. Estamos providenciando uma solução.`
          );
        }

        // Notificar vendor
        const vendorFailed = await User.findOne({ role: 'vendor' }).populate({
          path: 'vendor',
          match: { _id: order.vendor }
        });

        if (vendorFailed) {
          await this.notificationService.createNotification(
            vendorFailed._id?.toString() || '',
            'delivery_update',
            `Falha na entrega do pedido #${order._id?.toString().slice(-8)}: ${failureReason}`
          );
        }
        break;
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

      // Calcular distância estimada e tempo restante
      const driver = delivery.driver as any;
      const order = delivery.order as any;
      
      let estimatedDistance = null;
      let estimatedTimeRemaining = null;

      if (driver.currentLocation && order.deliveryAddress.coordinates) {
        // Cálculo simples de distância (Haversine)
        const driverLat = driver.currentLocation.latitude;
        const driverLng = driver.currentLocation.longitude;
        const destLat = order.deliveryAddress.coordinates.lat;
        const destLng = order.deliveryAddress.coordinates.lng;

        estimatedDistance = this.calculateDistance(driverLat, driverLng, destLat, destLng);
        
        // Estimar tempo baseado na velocidade média (assumindo 30 km/h)
        estimatedTimeRemaining = Math.ceil((estimatedDistance / 30) * 60); // em minutos
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

  // Calcular distância usando fórmula de Haversine
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Obter entregas ativas de um motorista
  async getActiveDeliveriesByDriver(driverId: string): Promise<any[]> {
    try {
      if (!Types.ObjectId.isValid(driverId)) {
        throw new Error('ID do motorista inválido');
      }

      return await Delivery.find({
        driver: driverId,
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

  // Obter histórico de entregas de um cliente
  async getDeliveryHistoryByCustomer(customerId: string, limit: number = 10): Promise<any[]> {
    try {
      if (!Types.ObjectId.isValid(customerId)) {
        throw new Error('ID do cliente inválido');
      }

      // Buscar pedidos do cliente
      const orders = await Order.find({ customer: customerId }).select('_id');
      const orderIds = orders.map(order => order._id);

      return await Delivery.find({
        order: { $in: orderIds }
      })
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

  // Obter estatísticas de entregas por vendor
  async getDeliveryStatsByVendor(vendorId: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(vendorId)) {
        throw new Error('ID do vendor inválido');
      }

      // Buscar pedidos do vendor
      const orders = await Order.find({ vendor: vendorId }).select('_id');
      const orderIds = orders.map(order => order._id);

      const deliveries = await Delivery.find({
        order: { $in: orderIds }
      }).populate('order');

      const totalDeliveries = deliveries.length;
      const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
      const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
      const inProgressDeliveries = deliveries.filter(d => 
        ['picked_up', 'in_transit'].includes(d.status)
      ).length;

      // Calcular tempo médio de entrega
      const completedWithTimes = deliveries.filter(d => 
        d.status === 'delivered' && (d.order as any).actualDeliveryTime
      );

      let averageDeliveryTime = 0;
      if (completedWithTimes.length > 0) {
        const totalTime = completedWithTimes.reduce((sum, delivery) => {
          const orderTime = new Date((delivery.order as any).createdAt).getTime();
          const deliveryTime = new Date((delivery.order as any).actualDeliveryTime).getTime();
          return sum + (deliveryTime - orderTime);
        }, 0);
        
        averageDeliveryTime = totalTime / completedWithTimes.length / (1000 * 60); // em minutos
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

  // Cancelar entrega
  async cancelDelivery(deliveryId: string, reason: string): Promise<any> {
    try {
      const delivery = await Delivery.findById(deliveryId).populate(['order', 'driver']);
      if (!delivery) throw new Error('Entrega não encontrada');

      if (['delivered', 'failed'].includes(delivery.status)) {
        throw new Error('Não é possível cancelar entrega finalizada');
      }

      // Atualizar status para failed
      delivery.status = 'failed';
      await delivery.save();

      const order = delivery.order as any;
      const driver = delivery.driver as any;

      // Atualizar pedido
      order.status = 'confirmed';
      await order.save();

      // Liberar motorista
      driver.isAvailable = true;
      await driver.save();

      // Notificar partes envolvidas
      const customer = await User.findById(order.customer);
      if (customer) {
        await this.notificationService.createNotification(
          customer._id?.toString() || '',
          'delivery_update',
          `Entrega cancelada: ${reason}. Estamos buscando outro motorista.`
        );
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

  // Reatribuir entrega para outro motorista
  async reassignDelivery(deliveryId: string, newDriverId?: string): Promise<any> {
    try {
      const delivery = await Delivery.findById(deliveryId).populate(['order', 'driver']);
      if (!delivery) throw new Error('Entrega não encontrada');

      const order = delivery.order as any;
      const oldDriver = delivery.driver as any;

      let newDriver;
      
      if (newDriverId) {
        newDriver = await Driver.findById(newDriverId);
        if (!newDriver || !newDriver.isAvailable) {
          throw new Error('Novo motorista não está disponível');
        }
      } else {
        // Encontrar motorista automaticamente
        const availableDrivers = await DriverService.findAvailableDrivers(
          {
            latitude: order.deliveryAddress.coordinates?.lat || 0,
            longitude: order.deliveryAddress.coordinates?.lng || 0
          },
          order.deliveryAddress.district || '',
          5000
        );

        if (availableDrivers.length === 0) {
          throw new Error('Nenhum motorista disponível encontrado');
        }

        newDriver = availableDrivers[0];
      }

      // Atualizar entrega
      delivery.driver = newDriver._id as any;
      delivery.status = 'picked_up';
      delivery.currentLocation = newDriver.currentLocation ? {
        lat: newDriver.currentLocation.latitude,
        lng: newDriver.currentLocation.longitude
      } : undefined;
      await delivery.save();

      // Liberar motorista anterior
      oldDriver.isAvailable = true;
      await oldDriver.save();

      // Ocupar novo motorista
      newDriver.isAvailable = false;
      newDriver.totalDeliveries += 1;
      await newDriver.save();

      // Notificar cliente
      const customer = await User.findById(order.customer);
      if (customer) {
        await this.notificationService.createNotification(
          customer._id?.toString() || '',
          'delivery_update',
          `Novo motorista atribuído: ${newDriver.licenseNumber}. Sua entrega está a caminho!`
        );
      }

      return {
        message: 'Entrega reatribuída com sucesso',
        delivery: await delivery.populate(['order', 'driver']),
        oldDriver: {
          id: oldDriver._id,
          licenseNumber: oldDriver.licenseNumber
        },
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