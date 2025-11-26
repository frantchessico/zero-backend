import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Driver } from '../../models/Driver';
import { Route } from '../../models/Route';
import { RouteService } from './route.service';
import { logger } from '../../utils/logger';

export class RouteController {
  /**
   * POST /routes/my/build - Driver autenticado monta sua rota
   */
  buildMyRoute = async (req: Request, res: Response): Promise<void> => {
    try {
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
          message: 'Apenas drivers podem montar rotas'
        });
        return;
      }

      const driver = await Driver.findOne({ userId: user._id });
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      const { maxStops, includePersonal, includeDeliveries, personalDeliveryIds, deliveryIds } = req.body || {};

      const route = await RouteService.buildRouteForDriver((driver._id as any).toString(), {
        maxStops,
        includePersonal,
        includeDeliveries,
        personalDeliveryIds,
        deliveryIds
      });

      res.status(201).json({
        success: true,
        message: 'Rota planejada com sucesso',
        data: route
      });
    } catch (error: any) {
      logger.error('Error building driver route:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao montar rota'
      });
    }
  };

  /**
   * POST /routes/:driverId/build - Montar rota para um driver específico (admin/ops)
   */
  buildRouteForDriver = async (req: Request, res: Response): Promise<void> => {
    try {
      const { driverId } = req.params;
      const { maxStops, includePersonal, includeDeliveries, personalDeliveryIds, deliveryIds } = req.body || {};

      const driver = await Driver.findById(driverId);
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver não encontrado'
        });
        return;
      }

      const route = await RouteService.buildRouteForDriver((driver._id as any).toString(), {
        maxStops,
        includePersonal,
        includeDeliveries,
        personalDeliveryIds,
        deliveryIds
      });

      res.status(201).json({
        success: true,
        message: 'Rota planejada com sucesso',
        data: route
      });
    } catch (error: any) {
      logger.error('Error building route for driver:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao montar rota para driver'
      });
    }
  };

  /**
   * GET /routes/my/active - Buscar rota ativa do driver autenticado
   */
  getMyActiveRoute = async (req: Request, res: Response): Promise<void> => {
    try {
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
          message: 'Apenas drivers podem acessar a rota ativa'
        });
        return;
      }

      const driver = await Driver.findOne({ userId: user._id });
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Perfil de driver não encontrado'
        });
        return;
      }

      const route = await Route.findOne({
        driver: driver._id,
        status: { $in: ['planned', 'in_progress'] }
      })
        .populate('personalDeliveries')
        .populate('deliveries')
        .exec();

      if (!route) {
        res.status(404).json({
          success: false,
          message: 'Nenhuma rota ativa encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: route
      });
    } catch (error: any) {
      logger.error('Error fetching active route:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar rota ativa'
      });
    }
  };
}

export default new RouteController();


