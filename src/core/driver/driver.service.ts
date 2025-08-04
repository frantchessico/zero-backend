// services/driverService.ts
import { Driver, IDriver } from '../../models/Driver';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { Delivery } from '../../models/Delivery';
import { NotificationService } from '../notification/notification.service';
import { Types } from 'mongoose';

export interface CreateDriverDTO {
  // Dados do User (obrigatórios)
  userId: string; // ID do User existente
  licenseNumber: string;
  vehicleInfo: {
    type: 'motorcycle' | 'car' | 'bicycle';
    model?: string;
    plateNumber?: string;
    color?: string;
  };
  workingHours: {
    startTime: string;
    endTime: string;
  };
  acceptedPaymentMethods: string[];
  deliveryAreas: string[];
  documents?: {
    license?: string;
    insurance?: string;
    vehicleRegistration?: string;
  };
  emergencyContact?: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
}

export interface UpdateDriverDTO extends Partial<CreateDriverDTO> {
  isAvailable?: boolean;
  isVerified?: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface DriverFilters {
  isAvailable?: boolean;
  isVerified?: boolean;
  vehicleType?: 'motorcycle' | 'car' | 'bicycle';
  deliveryArea?: string;
  minRating?: number;
  nearLocation?: {
    latitude: number;
    longitude: number;
    maxDistance: number; // em metros
  };
}

class DriverServices {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Criar perfil de driver para um User existente
  async createDriver(userId: string, driverData: CreateDriverDTO): Promise<IDriver> {
    try {
      // Verificar se User existe e tem role 'driver'
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User não encontrado');
      }
      
      if (user.role !== 'driver') {
        throw new Error('User deve ter role "driver"');
      }
      
      // Verificar se já existe perfil de driver para este User
      const existingDriver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
      if (existingDriver) {
        throw new Error('User já possui perfil de driver');
      }
      
      // Verificar se licenseNumber já existe
      const existingLicense = await Driver.findOne({ licenseNumber: driverData.licenseNumber });
      if (existingLicense) {
        throw new Error('Número de licença já cadastrado');
      }

      const driver = new Driver({
        userId: new Types.ObjectId(userId),
        licenseNumber: driverData.licenseNumber,
        vehicleInfo: driverData.vehicleInfo,
        workingHours: driverData.workingHours,
        acceptedPaymentMethods: driverData.acceptedPaymentMethods,
        deliveryAreas: driverData.deliveryAreas,
        documents: driverData.documents,
        emergencyContact: driverData.emergencyContact,
        currentLocation: {
          latitude: 0,
          longitude: 0,
          lastUpdated: new Date()
        }
      });

      const savedDriver = await driver.save();

      // Enviar notificação de boas-vindas
      await this.notificationService.createNotification(
        userId,
        'order_status',
        'Bem-vindo à plataforma! Seu cadastro está em análise.'
      );

      return savedDriver;
    } catch (error: any) {
      throw new Error(`Erro ao criar driver: ${error.message}`);
    }
  }

  // Buscar driver por ID
  async getDriverById(id: string): Promise<IDriver | null> {
    try {
      return await Driver.findById(id).populate('user', 'userId email phoneNumber role');
    } catch (error: any) {
      throw new Error(`Erro ao buscar driver: ${error.message}`);
      }
  }

  // Buscar driver por User ID
  async getDriverByUserId(userId: string): Promise<IDriver | null> {
    try {
      return await Driver.findOne({ userId: new Types.ObjectId(userId) })
        .populate('user', 'userId email phoneNumber role');
    } catch (error: any) {
      throw new Error(`Erro ao buscar driver por User ID: ${error.message}`);
    }
  }

  // Listar drivers com filtros
  async getDrivers(filters: DriverFilters = {}): Promise<IDriver[]> {
    try {
      let query: any = {};

      if (filters.isAvailable !== undefined) {
        query.isAvailable = filters.isAvailable;
      }

      if (filters.isVerified !== undefined) {
        query.isVerified = filters.isVerified;
      }

      if (filters.vehicleType) {
        query['vehicleInfo.type'] = filters.vehicleType;
      }

      if (filters.deliveryArea) {
        query.deliveryAreas = filters.deliveryArea;
      }

      if (filters.minRating) {
        query.rating = { $gte: filters.minRating };
      }

      if (filters.nearLocation) {
        query.currentLocation = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [filters.nearLocation.longitude, filters.nearLocation.latitude]
            },
            $maxDistance: filters.nearLocation.maxDistance
          }
        };
      }

      return await Driver.find(query)
        .populate('user', 'userId email phoneNumber role')
        .sort({ rating: -1 });
    } catch (error: any) {
      throw new Error(`Erro ao listar drivers: ${error.message}`);
    }
  }

  // Atualizar driver
  async updateDriver(id: string, updateData: UpdateDriverDTO): Promise<IDriver | null> {
    try {
      const driver = await Driver.findByIdAndUpdate(
        id,
        { 
          ...updateData,
          ...(updateData.currentLocation && {
            currentLocation: {
              ...updateData.currentLocation,
              lastUpdated: new Date()
            }
          })
        },
        { new: true }
      ).populate('user', 'userId email phoneNumber role');

      return driver;
    } catch (error: any) {
      throw new Error(`Erro ao atualizar driver: ${error.message}`);
    }
  }

  // Buscar drivers disponíveis
  async findAvailableDrivers(
    pickupLocation: { latitude: number; longitude: number },
    deliveryArea: string,
    maxDistance: number = 5000 // 5km padrão
  ): Promise<IDriver[]> {
    try {
      const drivers = await Driver.find({
        isAvailable: true,
        isVerified: true,
        deliveryAreas: deliveryArea,
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [pickupLocation.longitude, pickupLocation.latitude]
            },
            $maxDistance: maxDistance
          }
        }
      })
      .populate('user', 'userId email phoneNumber role')
      .sort({ rating: -1, averageDeliveryTime: 1 })
      .limit(10);

      return drivers;
    } catch (error: any) {
      throw new Error(`Erro ao buscar drivers disponíveis: ${error.message}`);
    }
  }

  // Atribuir driver a um pedido
  async assignDriverToOrder(orderId: string, driverId: string): Promise<any> {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) {
        throw new Error('Driver não encontrado');
      }

      if (!driver.isAvailable || !driver.isVerified) {
        throw new Error('Driver não está disponível ou não foi verificado');
      }

      // Criar entrega
      const delivery = new Delivery({
        order: new Types.ObjectId(orderId),
        driver: driver.userId, // Usar userId do driver
        status: 'picked_up',
        currentLocation: driver.currentLocation
      });

      await delivery.save();

      // Atualizar status do driver
      await Driver.findByIdAndUpdate(driverId, {
        isAvailable: false
      });

      // Atualizar status do pedido
      await Order.findByIdAndUpdate(orderId, {
        status: 'out_for_delivery'
      });

      // Enviar notificação ao driver
      await this.notificationService.createNotification(
        driver.userId.toString(),
        'order_status',
        'Novo pedido atribuído! Verifique os detalhes.'
      );

      return {
        delivery,
        driver: await driver.populate('user', 'userId email phoneNumber')
      };
    } catch (error: any) {
      throw new Error(`Erro ao atribuir driver: ${error.message}`);
    }
  }

  // Atualizar localização do driver
  async updateDriverLocation(
    driverId: string, 
    location: { latitude: number; longitude: number }
  ): Promise<IDriver | null> {
    try {
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        {
          currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            lastUpdated: new Date()
          }
        },
        { new: true }
      ).populate('user', 'userId email phoneNumber role');

      return driver;
    } catch (error: any) {
      throw new Error(`Erro ao atualizar localização: ${error.message}`);
    }
  }

  // Completar entrega
  async completeDelivery(deliveryId: string): Promise<any> {
    try {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) {
        throw new Error('Entrega não encontrada');
      }

      // Atualizar status da entrega
      delivery.status = 'delivered';
      await delivery.save();

      // Atualizar driver
      const driver = await Driver.findOne({ userId: delivery.driver });
      if (driver) {
        const deliveryTime = new Date().getTime() - delivery.createdAt.getTime();
        // Atualizar estatísticas do driver manualmente
        driver.totalDeliveries += 1;
      driver.completedDeliveries += 1;
      
        // Atualizar tempo médio de entrega
        const totalTime = (driver.averageDeliveryTime * (driver.completedDeliveries - 1)) + deliveryTime;
      driver.averageDeliveryTime = totalTime / driver.completedDeliveries;
      
        driver.isAvailable = true;
      await driver.save();
      }

      // Atualizar status do pedido
      await Order.findByIdAndUpdate(delivery.order, {
        status: 'delivered',
        actualDeliveryTime: new Date()
      });

      // Enviar notificação ao cliente
      const order = await Order.findById(delivery.order);
      if (order) {
        await this.notificationService.createNotification(
          order.customer.toString(),
          'order_status',
          'Seu pedido foi entregue! Obrigado por escolher nossos serviços.'
        );
      }

      return {
        delivery,
        driver: driver ? await driver.populate('user', 'userId email phoneNumber') : null
      };
    } catch (error: any) {
      throw new Error(`Erro ao completar entrega: ${error.message}`);
    }
  }

  // Atualizar rating do driver
  async updateDriverRating(driverId: string, rating: number): Promise<IDriver | null> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating deve estar entre 1 e 5');
      }

      const driver = await Driver.findById(driverId);
      if (!driver) {
        throw new Error('Driver não encontrado');
      }

      // Atualizar rating manualmente
      const newRating = ((driver.rating * driver.reviewCount) + rating) / (driver.reviewCount + 1);
      driver.rating = newRating;
      driver.reviewCount += 1;
      await driver.save();

      return await driver.populate('user', 'userId email phoneNumber role');
    } catch (error: any) {
      throw new Error(`Erro ao atualizar rating: ${error.message}`);
    }
  }

  // Obter estatísticas do driver
  async getDriverStats(driverId: string): Promise<any> {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) {
        throw new Error('Driver não encontrado');
      }

      // Obter estatísticas de entregas
      const deliveryStats = await Delivery.aggregate([
        { $match: { driver: driver.userId } },
        {
          $group: {
            _id: null,
            totalDeliveries: { $sum: 1 },
            completedDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            averageDeliveryTime: { $avg: '$deliveryTime' }
          }
        }
      ]);

      // Adicionar estatísticas de pedidos
      const orderStats = await Order.aggregate([
        { $match: { customer: driver.userId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' }
          }
        }
      ]);

      return {
        driverId: driver._id,
        userId: driver.userId,
        licenseNumber: driver.licenseNumber,
          rating: driver.rating,
          reviewCount: driver.reviewCount,
          totalDeliveries: driver.totalDeliveries,
          completedDeliveries: driver.completedDeliveries,
          averageDeliveryTime: driver.averageDeliveryTime,
        isAvailable: driver.isAvailable,
        isVerified: driver.isVerified,
        deliveryStats: deliveryStats[0] || {
          totalDeliveries: 0,
          completedDeliveries: 0,
          averageDeliveryTime: 0
        },
        orderStats: orderStats[0] || {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0
        }
      };
    } catch (error: any) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  // Verificar driver
  async verifyDriver(driverId: string, isVerified: boolean): Promise<IDriver | null> {
    try {
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { isVerified },
        { new: true }
      ).populate('user', 'userId email phoneNumber role');

      if (driver) {
        // Enviar notificação
        await this.notificationService.createNotification(
          driver.userId.toString(),
          'order_status',
          isVerified 
            ? 'Seu cadastro foi aprovado! Você já pode receber pedidos.'
            : 'Seu cadastro está em análise. Em breve você receberá uma resposta.'
        );
      }

      return driver;
    } catch (error: any) {
      throw new Error(`Erro ao verificar driver: ${error.message}`);
    }
  }

  // Deletar driver (soft delete)
  async deleteDriver(driverId: string): Promise<boolean> {
    try {
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { isAvailable: false, isVerified: false },
        { new: true }
      );

      if (driver) {
        // Desativar User também
        await User.findByIdAndUpdate(driver.userId, { isActive: false });
        
        // Enviar notificação
        await this.notificationService.createNotification(
          driver.userId.toString(),
          'order_status',
          'Seu perfil de driver foi desativado.'
        );
      }

      return !!driver;
    } catch (error: any) {
      throw new Error(`Erro ao deletar driver: ${error.message}`);
    }
  }
}

export const DriverService = new DriverServices();