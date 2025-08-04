// controllers/deliveryController.ts
import { Request, Response } from 'express';
import DeliveryService, { CreateDeliveryDTO, UpdateDeliveryDTO, DeliveryFilters } from './delivery.service';
import { User } from '../../models/User';
import { Driver } from '../../models/Driver';
import { logger } from '../../utils/logger';

class DeliveryController {
  /**
   * GET /deliveries/my-deliveries - Buscar entregas do driver autenticado
   */
  async getMyDeliveries(req: Request, res: Response): Promise<void> {
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

      // Buscar driver do usuário
      const driver = await Driver.findOne({ userId: user._id });
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      const filters: DeliveryFilters = {
        driverId: (driver as any)._id.toString(),
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const deliveries = await DeliveryService.getDeliveries(filters);
      
      res.status(200).json({
        success: true,
        count: deliveries.length,
        data: deliveries
      });
    } catch (error: any) {
      logger.error('Error fetching my deliveries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar entregas'
      });
    }
  }

  /**
   * GET /deliveries/my-orders - Buscar entregas dos pedidos do customer autenticado
   */
  async getMyOrderDeliveries(req: Request, res: Response): Promise<void> {
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

      if (user.role !== 'customer') {
        res.status(403).json({
          success: false,
          message: 'Apenas customers podem acessar esta funcionalidade'
        });
        return;
      }

      const filters: DeliveryFilters = {
        customerId: user._id.toString(),
        status: req.query.status as any,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const deliveries = await DeliveryService.getDeliveries(filters);
      
      res.status(200).json({
        success: true,
        count: deliveries.length,
        data: deliveries
      });
    } catch (error: any) {
      logger.error('Error fetching my order deliveries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar entregas dos pedidos'
      });
    }
  }

  /**
   * PUT /deliveries/my-deliveries/:id/status - Atualizar status da entrega (driver)
   */
  async updateMyDeliveryStatus(req: Request, res: Response): Promise<void> {
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
          message: 'Apenas drivers podem atualizar status de entrega'
        });
        return;
      }

      // Buscar driver do usuário
      const driver = await Driver.findOne({ userId: user._id });
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status é obrigatório'
        });
        return;
      }

      // Verificar se a entrega pertence ao driver
      const delivery = await DeliveryService.getDeliveryById(id);
      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega não encontrada'
        });
        return;
      }

      if (delivery.driver?.toString() !== (driver as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para atualizar esta entrega'
        });
        return;
      }

      const updateData: UpdateDeliveryDTO = { status };
      const updatedDelivery = await DeliveryService.updateDelivery(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Status da entrega atualizado com sucesso',
        data: updatedDelivery
      });
    } catch (error: any) {
      logger.error('Error updating my delivery status:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar status da entrega'
      });
    }
  }

  // POST /api/deliveries - Criar nova entrega
  async createDelivery(req: Request, res: Response): Promise<void> {
    try {
      const deliveryData: CreateDeliveryDTO = req.body;
      
      const result = await DeliveryService.createDelivery(deliveryData);
      
      res.status(201).json({
        success: true,
        message: 'Entrega criada com sucesso',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/:id - Buscar entrega por ID
  async getDeliveryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const delivery = await DeliveryService.getDeliveryById(id);
      
      res.status(200).json({
        success: true,
        data: delivery
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries - Listar entregas com filtros
  async getDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const filters: DeliveryFilters = {
        orderId: req.query.orderId as string,
        driverId: req.query.driverId as string,
        status: req.query.status as any,
        customerId: req.query.customerId as string,
        vendorId: req.query.vendorId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      // Remove campos undefined
      Object.keys(filters).forEach(key => 
        filters[key as keyof DeliveryFilters] === undefined && delete filters[key as keyof DeliveryFilters]
      );

      const deliveries = await DeliveryService.getDeliveries(filters);
      
      res.status(200).json({
        success: true,
        count: deliveries.length,
        data: deliveries
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // PUT /api/deliveries/:id - Atualizar entrega
  async updateDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateDeliveryDTO = req.body;
      
      const updatedDelivery = await DeliveryService.updateDelivery(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Entrega atualizada com sucesso',
        data: updatedDelivery
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/:id/track - Rastrear entrega em tempo real
  async trackDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const trackingData = await DeliveryService.trackDelivery(id);
      
      res.status(200).json({
        success: true,
        data: trackingData
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/driver/:driverId/active - Entregas ativas de um motorista
  async getActiveDeliveriesByDriver(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;
      
      const activeDeliveries = await DeliveryService.getActiveDeliveriesByDriver(driverId);
      
      res.status(200).json({
        success: true,
        count: activeDeliveries.length,
        data: activeDeliveries
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/customer/:customerId/history - Histórico de entregas de um cliente
  async getDeliveryHistoryByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const deliveryHistory = await DeliveryService.getDeliveryHistoryByCustomer(customerId, limit);
      
      res.status(200).json({
        success: true,
        count: deliveryHistory.length,
        data: deliveryHistory
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/vendor/:vendorId/stats - Estatísticas de entregas por vendor
  async getDeliveryStatsByVendor(req: Request, res: Response): Promise<void> {
    try {
      const { vendorId } = req.params;
      
      const stats = await DeliveryService.getDeliveryStatsByVendor(vendorId);
      
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

  // DELETE /api/deliveries/:id/cancel - Cancelar entrega
  async cancelDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Motivo do cancelamento é obrigatório'
        });
        return;
      }
      
      const result = await DeliveryService.cancelDelivery(id, reason);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // PUT /api/deliveries/:id/reassign - Reatribuir entrega para outro motorista
  async reassignDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newDriverId } = req.body;
      
      const result = await DeliveryService.reassignDelivery(id, newDriverId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/status/:status - Buscar entregas por status
  async getDeliveriesByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      
      const validStatuses = ['picked_up', 'in_transit', 'delivered', 'failed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Status inválido. Valores válidos: ' + validStatuses.join(', ')
        });
        return;
      }
      
      const deliveries = await DeliveryService.getDeliveries({ status: status as any });
      
      res.status(200).json({
        success: true,
        count: deliveries.length,
        data: deliveries
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/deliveries/:id/location - Atualizar localização da entrega
  async updateDeliveryLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;
      
      if (!lat || !lng) {
        res.status(400).json({
          success: false,
          message: 'Coordenadas de latitude e longitude são obrigatórias'
        });
        return;
      }
      
      const updateData: UpdateDeliveryDTO = {
        currentLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }
      };
      
      const updatedDelivery = await DeliveryService.updateDelivery(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Localização atualizada com sucesso',
        data: updatedDelivery
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/analytics/summary - Resumo analítico de entregas
  async getDeliveryAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { dateFrom, dateTo, vendorId, driverId } = req.query;
      
      const filters: DeliveryFilters = {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        vendorId: vendorId as string,
        driverId: driverId as string
      };

      // Remove campos undefined
      Object.keys(filters).forEach(key => 
        filters[key as keyof DeliveryFilters] === undefined && delete filters[key as keyof DeliveryFilters]
      );

      const deliveries = await DeliveryService.getDeliveries(filters);
      
      // Calcular métricas
      const totalDeliveries = deliveries.length;
      const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
      const failedCount = deliveries.filter(d => d.status === 'failed').length;
      const inProgressCount = deliveries.filter(d => 
        ['picked_up', 'in_transit'].includes(d.status)
      ).length;
      
      const successRate = totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0;
      
      // Agrupar por status
      const statusBreakdown = deliveries.reduce((acc, delivery) => {
        acc[delivery.status] = (acc[delivery.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalDeliveries,
            deliveredCount,
            failedCount,
            inProgressCount,
            successRate: parseFloat(successRate.toFixed(2))
          },
          statusBreakdown,
          deliveries: deliveries.slice(0, 10) // Últimas 10 entregas
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/realtime - Entregas em tempo real
  async getRealTimeDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const { region, radius, vendorId, driverId } = req.query;
      
      // Buscar entregas ativas (picked_up e in_transit)
      const filters: DeliveryFilters = {
        status: undefined, // Vamos filtrar manualmente para incluir múltiplos status
        vendorId: vendorId as string,
        driverId: driverId as string
      };

      // Remove campos undefined
      Object.keys(filters).forEach(key => 
        filters[key as keyof DeliveryFilters] === undefined && delete filters[key as keyof DeliveryFilters]
      );

      const allDeliveries = await DeliveryService.getDeliveries(filters);
      
      // Filtrar apenas entregas ativas
      const activeDeliveries = allDeliveries.filter(delivery => 
        ['picked_up', 'in_transit'].includes(delivery.status)
      );

      // Adicionar informações de tracking para cada entrega
      const realTimeData = await Promise.all(
        activeDeliveries.map(async (delivery) => {
          try {
            const trackingInfo = await DeliveryService.trackDelivery(delivery._id.toString());
            return {
              ...delivery.toObject(),
              realTimeData: trackingInfo.tracking,
              driver: trackingInfo.driver,
              estimatedArrival: trackingInfo.tracking.estimatedTimeRemaining
            };
          } catch (error) {
            // Se falhar ao obter tracking, retorna entrega sem dados em tempo real
            return {
              ...delivery.toObject(),
              realTimeData: null,
              estimatedArrival: null
            };
          }
        })
      );

      // Agrupar por status para dashboard
      const statusSummary = {
        picked_up: realTimeData.filter(d => d.status === 'picked_up').length,
        in_transit: realTimeData.filter(d => d.status === 'in_transit').length,
        total_active: realTimeData.length
      };

      res.status(200).json({
        success: true,
        data: {
          activeDeliveries: realTimeData,
          summary: statusSummary,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/deliveries/dashboard - Dashboard de entregas
  async getDeliveryDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { period = '24h', vendorId, driverId } = req.query;
      
      // Definir período para filtros baseado no parâmetro
      let dateFrom: Date;
      const dateTo = new Date();
      
      switch (period) {
        case '1h':
          dateFrom = new Date(Date.now() - 1 * 60 * 60 * 1000);
          break;
        case '6h':
          dateFrom = new Date(Date.now() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const filters: DeliveryFilters = {
        dateFrom,
        dateTo,
        vendorId: vendorId as string,
        driverId: driverId as string
      };

      // Remove campos undefined
      Object.keys(filters).forEach(key => 
        filters[key as keyof DeliveryFilters] === undefined && delete filters[key as keyof DeliveryFilters]
      );

      const deliveries = await DeliveryService.getDeliveries(filters);

      // Métricas principais
      const totalDeliveries = deliveries.length;
      const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
      const failedCount = deliveries.filter(d => d.status === 'failed').length;
      const activeCount = deliveries.filter(d => 
        ['picked_up', 'in_transit'].includes(d.status)
      ).length;

      const successRate = totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0;

      // Distribuição por hora (últimas 24h)
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const count = deliveries.filter(d => {
          const deliveryHour = new Date(d.createdAt).getHours();
          return deliveryHour === hour;
        }).length;
        return { hour, count };
      });

      // Top motoristas
      const driverStats = deliveries.reduce((acc, delivery) => {
        if (delivery.driver) {
          const driverId = delivery.driver._id || delivery.driver;
          const driverName = delivery.driver.name || 'Driver';
          
          if (!acc[driverId]) {
            acc[driverId] = {
              id: driverId,
              name: driverName,
              total: 0,
              delivered: 0,
              failed: 0
            };
          }
          
          acc[driverId].total++;
          if (delivery.status === 'delivered') acc[driverId].delivered++;
          if (delivery.status === 'failed') acc[driverId].failed++;
        }
        return acc;
      }, {} as Record<string, any>);

      const topDrivers = Object.values(driverStats)
        .sort((a: any, b: any) => b.delivered - a.delivered)
        .slice(0, 5);

      // Entregas recentes
      const recentDeliveries = deliveries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Status atual das entregas ativas
      const activeDeliveries = deliveries.filter(d => 
        ['picked_up', 'in_transit'].includes(d.status)
      );

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalDeliveries,
            deliveredCount,
            failedCount,
            activeCount,
            successRate: parseFloat(successRate.toFixed(2))
          },
          charts: {
            hourlyDistribution,
            statusDistribution: {
              delivered: deliveredCount,
              failed: failedCount,
              active: activeCount
            }
          },
          topDrivers,
          recentDeliveries,
          activeDeliveries: activeDeliveries.slice(0, 5),
          period,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // PATCH /api/deliveries/:id/status - Atualizar apenas o status da entrega
  async updateDeliveryStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, failureReason, currentLocation } = req.body;
      
      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status é obrigatório'
        });
        return;
      }

      const validStatuses = ['picked_up', 'in_transit', 'delivered', 'failed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Status inválido. Valores válidos: ${validStatuses.join(', ')}`
        });
        return;
      }

      // Se status é 'failed', motivo é obrigatório
      if (status === 'failed' && !failureReason) {
        res.status(400).json({
          success: false,
          message: 'Motivo da falha é obrigatório quando status é "failed"'
        });
        return;
      }

      const updateData: UpdateDeliveryDTO = {
        status,
        ...(failureReason && { failureReason }),
        ...(currentLocation && { currentLocation })
      };
      
      const updatedDelivery = await DeliveryService.updateDelivery(id, updateData);
      
      res.status(200).json({
        success: true,
        message: `Status da entrega atualizado para "${status}"`,
        data: {
          delivery: updatedDelivery,
          previousStatus: req.body.previousStatus || 'unknown',
          newStatus: status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      const statusCode = error.message.includes('não encontrada') ? 404 : 
                         error.message.includes('Transição de status inválida') ? 422 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new DeliveryController();