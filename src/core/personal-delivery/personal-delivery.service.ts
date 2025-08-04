import { Types } from 'mongoose';
import { PersonalDelivery, IPersonalDelivery, IPersonalDeliveryItem } from '../../models/PersonalDelivery';
import { User } from '../../models/User';
import { Driver } from '../../models/Driver';
import { DriverService } from '../driver/driver.service';
import { NotificationService } from '../notification/notification.service';

export interface CreatePersonalDeliveryDTO {
  customerId: string;
  pickupAddress: {
    street: string;
    district: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  deliveryAddress: {
    street: string;
    district: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  items: IPersonalDeliveryItem[];
  category: 'electronics' | 'documents' | 'furniture' | 'clothing' | 'appliances' | 'other';
  estimatedValue: number;
  paymentMethod: string;
  notes?: string;
  insuranceRequired?: boolean;
  signatureRequired?: boolean;
}

export interface UpdatePersonalDeliveryDTO {
  status?: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  driverId?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  notes?: string;
}

export interface PersonalDeliveryFilters {
  customerId?: string;
  status?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  driverId?: string;
}

class PersonalDeliveryServiceClass {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Criar nova entrega pessoal
   */
  async createPersonalDelivery(deliveryData: CreatePersonalDeliveryDTO): Promise<IPersonalDelivery> {
    try {
      // Validar se o cliente existe
      const customer = await User.findById(deliveryData.customerId);
      if (!customer) {
        throw new Error('Cliente não encontrado');
      }

      // Calcular taxa de entrega baseada na distância e peso
      const deliveryFee = await this.calculateDeliveryFee(
        deliveryData.pickupAddress,
        deliveryData.deliveryAddress,
        deliveryData.items
      );

      // Calcular taxa de seguro se necessário
      let insuranceFee = 0;
      if (deliveryData.insuranceRequired || deliveryData.estimatedValue > 1000) {
        insuranceFee = deliveryData.estimatedValue * 0.02; // 2% do valor estimado
      }

      // Calcular peso total
      const totalWeight = deliveryData.items.reduce((sum, item) => {
        return sum + (item.weight || 0) * item.quantity;
      }, 0);

      const personalDelivery = new PersonalDelivery({
        customer: new Types.ObjectId(deliveryData.customerId),
        pickupAddress: deliveryData.pickupAddress,
        deliveryAddress: deliveryData.deliveryAddress,
        items: deliveryData.items,
        category: deliveryData.category,
        totalWeight,
        estimatedValue: deliveryData.estimatedValue,
        deliveryFee,
        insuranceFee,
        total: deliveryFee + insuranceFee,
        paymentMethod: deliveryData.paymentMethod,
        notes: deliveryData.notes,
        insuranceRequired: deliveryData.insuranceRequired || false,
        signatureRequired: deliveryData.signatureRequired !== false // true por padrão
      });

      const savedDelivery = await personalDelivery.save();

      // Notificar cliente sobre criação da entrega
      await this.notifyCustomerDeliveryCreated(savedDelivery);

      return savedDelivery;
    } catch (error: any) {
      throw new Error(`Erro ao criar entrega pessoal: ${error.message}`);
    }
  }

  /**
   * Calcular taxa de entrega
   */
  private async calculateDeliveryFee(
    pickupAddress: any,
    deliveryAddress: any,
    items: IPersonalDeliveryItem[]
  ): Promise<number> {
    // Calcular distância (simulação - em produção usar API de geocoding)
    const distance = this.calculateDistance(
      pickupAddress.coordinates?.lat || 0,
      pickupAddress.coordinates?.lng || 0,
      deliveryAddress.coordinates?.lat || 0,
      deliveryAddress.coordinates?.lng || 0
    );

    // Calcular peso total
    const totalWeight = items.reduce((sum, item) => {
      return sum + (item.weight || 0) * item.quantity;
    }, 0);

    // Taxa base
    let fee = 50; // Taxa base de 50 MT

    // Adicionar por distância (10 MT por km)
    fee += distance * 10;

    // Adicionar por peso (5 MT por kg)
    fee += totalWeight * 5;

    // Adicionar taxa para itens frágeis
    const fragileItems = items.filter(item => item.isFragile);
    fee += fragileItems.length * 20; // 20 MT por item frágil

    return Math.round(fee);
  }

  /**
   * Calcular distância usando fórmula de Haversine
   */
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

  /**
   * Buscar entrega pessoal por ID
   */
  async getPersonalDeliveryById(id: string): Promise<IPersonalDelivery | null> {
    try {
      return await PersonalDelivery.findById(id)
        .populate('customer', 'userId email phoneNumber')
        .populate('driver', 'licenseNumber vehicleInfo rating')
        .exec();
    } catch (error: any) {
      throw new Error(`Erro ao buscar entrega pessoal: ${error.message}`);
    }
  }

  /**
   * Listar entregas pessoais do cliente
   */
  async getCustomerPersonalDeliveries(
    customerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    deliveries: IPersonalDelivery[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [deliveries, total] = await Promise.all([
        PersonalDelivery.find({ customer: new Types.ObjectId(customerId) })
          .populate('driver', 'licenseNumber vehicleInfo rating')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        PersonalDelivery.countDocuments({ customer: new Types.ObjectId(customerId) })
      ]);

      return {
        deliveries,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error: any) {
      throw new Error(`Erro ao buscar entregas pessoais: ${error.message}`);
    }
  }

  /**
   * Atualizar entrega pessoal
   */
  async updatePersonalDelivery(
    id: string,
    updateData: UpdatePersonalDeliveryDTO
  ): Promise<IPersonalDelivery | null> {
    try {
      const delivery = await PersonalDelivery.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      )
        .populate('customer', 'userId email phoneNumber')
        .populate('driver', 'licenseNumber vehicleInfo rating')
        .exec();

      if (delivery && updateData.status) {
        await this.notifyStatusChange(delivery, updateData.status);
      }

      return delivery;
    } catch (error: any) {
      throw new Error(`Erro ao atualizar entrega pessoal: ${error.message}`);
    }
  }

  /**
   * Atribuir driver à entrega
   */
  async assignDriver(deliveryId: string, driverId?: string): Promise<IPersonalDelivery | null> {
    try {
      const delivery = await PersonalDelivery.findById(deliveryId);
      if (!delivery) {
        throw new Error('Entrega pessoal não encontrada');
      }

      let driver;
      
      if (driverId) {
        driver = await Driver.findById(driverId);
        if (!driver || !driver.isAvailable) {
          throw new Error('Driver não está disponível');
        }
      } else {
        // Encontrar driver automaticamente
        const availableDrivers = await DriverService.findAvailableDrivers(
          {
            latitude: delivery.pickupAddress.coordinates?.lat || 0,
            longitude: delivery.pickupAddress.coordinates?.lng || 0
          },
          delivery.pickupAddress.district || '',
          5000
        );

        if (availableDrivers.length === 0) {
          throw new Error('Nenhum driver disponível encontrado');
        }

        driver = availableDrivers[0];
      }

      // Atualizar entrega
      delivery.driver = driver._id as any;
      delivery.status = 'confirmed';
      delivery.estimatedPickupTime = new Date(Date.now() + 30 * 60000); // 30 min
      delivery.estimatedDeliveryTime = new Date(Date.now() + 90 * 60000); // 90 min

      const updatedDelivery = await delivery.save();

      // Notificar cliente
      await this.notifyDriverAssigned(updatedDelivery, driver);

      return updatedDelivery;
    } catch (error: any) {
      throw new Error(`Erro ao atribuir driver: ${error.message}`);
    }
  }

  /**
   * Cancelar entrega pessoal
   */
  async cancelPersonalDelivery(deliveryId: string, reason?: string): Promise<IPersonalDelivery | null> {
    try {
      const delivery = await PersonalDelivery.findByIdAndUpdate(
        deliveryId,
        {
          status: 'cancelled',
          paymentStatus: 'refunded',
          notes: reason
        },
        { new: true }
      )
        .populate('customer', 'userId email phoneNumber')
        .populate('driver', 'licenseNumber vehicleInfo rating')
        .exec();

      if (delivery) {
        await this.notifyCancellation(delivery, reason);
      }

      return delivery;
    } catch (error: any) {
      throw new Error(`Erro ao cancelar entrega pessoal: ${error.message}`);
    }
  }

  /**
   * Notificar cliente sobre criação da entrega
   */
  private async notifyCustomerDeliveryCreated(delivery: IPersonalDelivery): Promise<void> {
    try {
      const message = `Sua entrega pessoal foi criada com sucesso! Taxa: ${delivery.deliveryFee} MT, Total: ${delivery.total} MT`;

      await this.notificationService.createNotification(
        delivery.customer.toString(),
        'delivery_update',
        message
      );

      console.log(`✅ Notificação de criação enviada para cliente - Entrega ${(delivery as any)._id}`);
    } catch (error: any) {
      console.error('❌ Erro ao notificar criação:', error.message);
    }
  }

  /**
   * Notificar sobre mudança de status
   */
  private async notifyStatusChange(delivery: IPersonalDelivery, newStatus: string): Promise<void> {
    try {
      const statusMessages = {
        'confirmed': 'Sua entrega foi confirmada! Driver será atribuído em breve.',
        'picked_up': 'Seus itens foram coletados e estão a caminho!',
        'in_transit': 'Sua entrega está em trânsito!',
        'delivered': 'Sua entrega foi entregue com sucesso!',
        'cancelled': 'Sua entrega foi cancelada.'
      };

      const message = statusMessages[newStatus as keyof typeof statusMessages] || 
        `Status da entrega atualizado para: ${newStatus}`;

      await this.notificationService.createNotification(
        delivery.customer.toString(),
        'delivery_update',
        message
      );

      console.log(`✅ Notificação de status enviada: ${newStatus} - Entrega ${(delivery as any)._id}`);
    } catch (error: any) {
      console.error('❌ Erro ao notificar mudança de status:', error.message);
    }
  }

  /**
   * Notificar sobre driver atribuído
   */
  private async notifyDriverAssigned(delivery: IPersonalDelivery, driver: any): Promise<void> {
    try {
      const message = `Driver ${driver.licenseNumber} foi atribuído à sua entrega. Tempo estimado de coleta: 30 minutos.`;

      await this.notificationService.createNotification(
        delivery.customer.toString(),
        'delivery_update',
        message
      );

      console.log(`✅ Notificação de driver atribuído enviada - Entrega ${(delivery as any)._id}`);
    } catch (error: any) {
      console.error('❌ Erro ao notificar atribuição de driver:', error.message);
    }
  }

  /**
   * Notificar sobre cancelamento
   */
  private async notifyCancellation(delivery: IPersonalDelivery, reason?: string): Promise<void> {
    try {
      const message = reason 
        ? `Sua entrega foi cancelada. Motivo: ${reason}`
        : 'Sua entrega foi cancelada.';

      await this.notificationService.createNotification(
        delivery.customer.toString(),
        'delivery_update',
        message
      );

      console.log(`✅ Notificação de cancelamento enviada - Entrega ${(delivery as any)._id}`);
    } catch (error: any) {
      console.error('❌ Erro ao notificar cancelamento:', error.message);
    }
  }
}

export const PersonalDeliveryService = new PersonalDeliveryServiceClass(); 