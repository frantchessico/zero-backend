import { Request, Response } from 'express';
import { PersonalDeliveryService } from './personal-delivery.service';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';

export class PersonalDeliveryController {
  private personalDeliveryService: typeof PersonalDeliveryService;

  constructor() {
    this.personalDeliveryService = PersonalDeliveryService;
  }

  /**
   * POST /personal-delivery - Criar nova entrega pessoal
   */
  createPersonalDelivery = async (req: Request, res: Response): Promise<void> => {
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

      const deliveryData = {
        ...req.body,
        customerId: user._id.toString() // Usar ID do usuário encontrado no banco
      };

      // Validações básicas
      if (!deliveryData.pickupAddress || !deliveryData.deliveryAddress || !deliveryData.items || deliveryData.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'pickupAddress, deliveryAddress e items são obrigatórios'
        });
        return;
      }

      if (!deliveryData.category || !deliveryData.estimatedValue || !deliveryData.paymentMethod) {
        res.status(400).json({
          success: false,
          message: 'category, estimatedValue e paymentMethod são obrigatórios'
        });
        return;
      }

      const delivery = await this.personalDeliveryService.createPersonalDelivery(deliveryData);

      res.status(201).json({
        success: true,
        message: 'Entrega pessoal criada com sucesso',
        data: {
          id: (delivery as any)._id,
          deliveryFee: delivery.deliveryFee,
          insuranceFee: delivery.insuranceFee,
          total: delivery.total,
          status: delivery.status,
          estimatedPickupTime: delivery.estimatedPickupTime,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime
        }
      });
    } catch (error: any) {
      logger.error('Error creating personal delivery:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar entrega pessoal'
      });
    }
  };

  /**
   * GET /personal-delivery - Listar entregas pessoais do usuário
   */
  getUserPersonalDeliveries = async (req: Request, res: Response): Promise<void> => {
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

      const userId = user._id.toString();
      const { page = 1, limit = 10 } = req.query;

      const deliveries = await this.personalDeliveryService.getCustomerPersonalDeliveries(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: deliveries.deliveries,
        pagination: {
          currentPage: parseInt(page as string),
          itemsPerPage: parseInt(limit as string),
          totalItems: deliveries.total,
          totalPages: deliveries.totalPages
        }
      });
    } catch (error: any) {
      logger.error('Error fetching user personal deliveries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar entregas pessoais'
      });
    }
  };

  /**
   * GET /personal-delivery/:id - Buscar entrega pessoal específica
   */
  getPersonalDeliveryById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const delivery = await this.personalDeliveryService.getPersonalDeliveryById(id);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega pessoal não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: delivery
      });
    } catch (error: any) {
      logger.error('Error fetching personal delivery:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar entrega pessoal'
      });
    }
  };

  /**
   * PUT /personal-delivery/:id - Atualizar entrega pessoal
   */
  updatePersonalDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const delivery = await this.personalDeliveryService.updatePersonalDelivery(id, updateData);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega pessoal não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Entrega pessoal atualizada com sucesso',
        data: delivery
      });
    } catch (error: any) {
      logger.error('Error updating personal delivery:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar entrega pessoal'
      });
    }
  };

  /**
   * POST /personal-delivery/:id/assign-driver - Atribuir driver
   */
  assignDriver = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { driverId } = req.body;

      const delivery = await this.personalDeliveryService.assignDriver(id, driverId);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega pessoal não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Driver atribuído com sucesso',
        data: {
          id: (delivery as any)._id,
          driver: delivery.driver,
          estimatedPickupTime: delivery.estimatedPickupTime,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime
        }
      });
    } catch (error: any) {
      logger.error('Error assigning driver:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atribuir driver'
      });
    }
  };

  /**
   * DELETE /personal-delivery/:id - Cancelar entrega pessoal
   */
  cancelPersonalDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const delivery = await this.personalDeliveryService.cancelPersonalDelivery(id, reason);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega pessoal não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Entrega pessoal cancelada com sucesso',
        data: {
          id: (delivery as any)._id,
          status: delivery.status,
          paymentStatus: delivery.paymentStatus
        }
      });
    } catch (error: any) {
      logger.error('Error canceling personal delivery:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao cancelar entrega pessoal'
      });
    }
  };

  /**
   * GET /personal-delivery/:id/track - Rastrear entrega pessoal
   */
  trackPersonalDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const delivery = await this.personalDeliveryService.getPersonalDeliveryById(id);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega pessoal não encontrada'
        });
        return;
      }

      // Calcular informações de rastreamento
      const trackingInfo = {
        id: (delivery as any)._id,
        status: delivery.status,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        driver: delivery.driver,
        estimatedPickupTime: delivery.estimatedPickupTime,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        actualPickupTime: delivery.actualPickupTime,
        actualDeliveryTime: delivery.actualDeliveryTime,
        items: delivery.items,
        category: delivery.category,
        totalWeight: delivery.totalWeight,
        insuranceRequired: delivery.insuranceRequired,
        signatureRequired: delivery.signatureRequired
      };

      res.status(200).json({
        success: true,
        data: trackingInfo
      });
    } catch (error: any) {
      logger.error('Error tracking personal delivery:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao rastrear entrega pessoal'
      });
    }
  };

  /**
   * GET /personal-delivery/calculate-fee - Calcular taxa de entrega
   */
  calculateDeliveryFee = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pickupAddress, deliveryAddress, items } = req.body;

      if (!pickupAddress || !deliveryAddress || !items) {
        res.status(400).json({
          success: false,
          message: 'pickupAddress, deliveryAddress e items são obrigatórios'
        });
        return;
      }

      // Simular cálculo de taxa (em produção, usar método do service)
      const distance = 10; // km (simulado)
      const totalWeight = items.reduce((sum: number, item: any) => {
        return sum + (item.weight || 0) * item.quantity;
      }, 0);

      const baseFee = 50;
      const distanceFee = distance * 10;
      const weightFee = totalWeight * 5;
      const fragileFee = items.filter((item: any) => item.isFragile).length * 20;

      const totalFee = baseFee + distanceFee + weightFee + fragileFee;

      res.status(200).json({
        success: true,
        data: {
          baseFee,
          distanceFee,
          weightFee,
          fragileFee,
          totalFee,
          distance,
          totalWeight
        }
      });
    } catch (error: any) {
      logger.error('Error calculating delivery fee:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao calcular taxa de entrega'
      });
    }
  };
}

export default new PersonalDeliveryController(); 