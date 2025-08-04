// controllers/driverController.ts
import { Request, Response } from 'express';
import { DriverService, CreateDriverDTO, UpdateDriverDTO, DriverFilters } from './driver.service';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';

export class DriverController {
  private driverService: typeof DriverService;

  constructor() {
    this.driverService = DriverService;
  }

  /**
   * GET /drivers/my-profile - Buscar perfil do driver autenticado
   */
  getMyDriverProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'driver') {
        res.status(403).json({
          success: false,
          message: 'Apenas drivers podem acessar esta funcionalidade'
        });
        return;
      }

      const driver = await this.driverService.getDriverByUserId(user._id.toString());
      
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      logger.error('Error fetching my driver profile:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar perfil de driver'
      });
    }
  };

  /**
   * PUT /drivers/my-profile - Atualizar perfil do driver autenticado
   */
  updateMyDriverProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      if (user.role !== 'driver') {
        res.status(403).json({
          success: false,
          message: 'Apenas drivers podem acessar esta funcionalidade'
        });
        return;
      }

      const driver = await this.driverService.getDriverByUserId(user._id.toString());
      
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      const updateData = req.body;
      const updatedDriver = await this.driverService.updateDriver(driver._id!.toString(), updateData);

      res.status(200).json({
        success: true,
        message: 'Perfil de driver atualizado com sucesso',
        data: updatedDriver
      });
    } catch (error: any) {
      logger.error('Error updating my driver profile:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar perfil de driver'
      });
    }
  };

  // Criar perfil de driver para um User existente
  async createDriverProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const driverData: CreateDriverDTO = req.body;
      
      // Validações básicas
      if (!driverData.licenseNumber) {
        res.status(400).json({
          success: false,
          message: 'Campo obrigatório: licenseNumber'
        });
        return;
      }

      if (!driverData.vehicleInfo?.type) {
        res.status(400).json({
          success: false,
          message: 'Informações do veículo são obrigatórias'
        });
        return;
      }

      const driver = await this.driverService.createDriver(userId, driverData);
      
      res.status(201).json({
        success: true,
        message: 'Perfil de driver criado com sucesso. Aguarde aprovação.',
        data: {
          id: driver._id,
          licenseNumber: driver.licenseNumber,
          isVerified: driver.isVerified,
          vehicleInfo: driver.vehicleInfo
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar motorista por ID
  async getDriverById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const driver = await this.driverService.getDriverById(id);
      
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar motorista por User ID
  async getDriverByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const driverProfile = await this.driverService.getDriverByUserId(userId);
      
      if (!driverProfile) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado para este usuário'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driverProfile
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Listar motoristas com filtros
  async getDrivers(req: Request, res: Response): Promise<void> {
    try {
      const filters: DriverFilters = {
        isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
        isVerified: req.query.isVerified ? req.query.isVerified === 'true' : undefined,
        vehicleType: req.query.vehicleType as 'motorcycle' | 'car' | 'bicycle',
        deliveryArea: req.query.deliveryArea as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined
      };

      // Filtro por proximidade
      if (req.query.lat && req.query.lng && req.query.maxDistance) {
        filters.nearLocation = {
          latitude: parseFloat(req.query.lat as string),
          longitude: parseFloat(req.query.lng as string),
          maxDistance: parseInt(req.query.maxDistance as string)
        };
      }

      const drivers = await this.driverService.getDrivers(filters);
      
      res.status(200).json({
        success: true,
        data: drivers,
        count: drivers.length
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Atualizar motorista
  async updateDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateDriverDTO = req.body;
      
      const driver = await this.driverService.updateDriver(id, updateData);
      
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Motorista atualizado com sucesso',
        data: driver
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Atualizar localização do motorista
  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          message: 'Latitude e longitude são obrigatórias'
        });
        return;
      }

      const driver = await this.driverService.updateDriverLocation(id, { latitude, longitude });
      
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Localização atualizada com sucesso',
        data: {
          id: driver._id,
          currentLocation: driver.currentLocation
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Alternar disponibilidade do motorista
  async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;

      const driver = await this.driverService.updateDriver(id, { isAvailable });
      
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Motorista ${driver.isAvailable ? 'disponível' : 'indisponível'}`,
        data: {
          id: driver._id,
          isAvailable: driver.isAvailable
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Buscar motoristas disponíveis
  async getAvailableDrivers(req: Request, res: Response): Promise<void> {
    try {
      const { lat, lng, area, maxDistance = '5000' } = req.query;
      
      if (!lat || !lng || !area) {
        res.status(400).json({
          success: false,
          message: 'Parâmetros obrigatórios: lat, lng, area'
        });
        return;
      }

      const drivers = await this.driverService.findAvailableDrivers(
        {
          latitude: parseFloat(lat as string),
          longitude: parseFloat(lng as string)
        },
        area as string,
        parseInt(maxDistance as string)
      );

      res.status(200).json({
        success: true,
        data: drivers,
        count: drivers.length
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Atribuir motorista a um pedido
  async assignToOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, driverId } = req.body;
      
      if (!orderId || !driverId) {
        res.status(400).json({
          success: false,
          message: 'orderId e driverId são obrigatórios'
        });
        return;
      }

      const result = await this.driverService.assignDriverToOrder(orderId, driverId);
      
      res.status(200).json({
        success: true,
        message: 'Motorista atribuído ao pedido com sucesso',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Obter estatísticas do motorista
  async getDriverStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.driverService.getDriverStats(id);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Atualizar rating do motorista
  async updateRating(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating deve estar entre 1 e 5'
        });
        return;
      }

      const driver = await this.driverService.updateDriverRating(id, rating);

      res.status(200).json({
        success: true,
        message: 'Rating atualizado com sucesso',
        data: {
          id: driver?._id,
          rating: driver?.rating,
          reviewCount: driver?.reviewCount
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verificar motorista (admin)
  async verifyDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isVerified } = req.body;
      
      const driver = await this.driverService.verifyDriver(id, isVerified);

      res.status(200).json({
        success: true,
        message: `Motorista ${isVerified ? 'verificado' : 'não verificado'}`,
        data: {
          id: driver?._id,
          isVerified: driver?.isVerified
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Deletar motorista (soft delete)
  async deleteDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.driverService.deleteDriver(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Motorista não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Motorista deletado com sucesso'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Dashboard do motorista
  async getDriverDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Verificar se user existe e é driver
      const user = await User.findById(userId);
      if (!user || user.role !== 'driver') {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado ou não é driver'
        });
        return;
      }

      // Buscar perfil de driver
      const driver = await this.driverService.getDriverByUserId(userId);
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      // Obter estatísticas
      const stats = await this.driverService.getDriverStats(driver._id?.toString() || '');

      res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user.userId,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            isActive: user.isActive
          },
          driver: {
            licenseNumber: driver.licenseNumber,
            vehicleInfo: driver.vehicleInfo,
            isAvailable: driver.isAvailable,
            isVerified: driver.isVerified,
            rating: driver.rating,
            totalDeliveries: driver.totalDeliveries,
            completedDeliveries: driver.completedDeliveries
          },
          stats
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new DriverController();