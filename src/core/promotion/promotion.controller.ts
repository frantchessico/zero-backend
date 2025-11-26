import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import { promotionService } from './promotion.service';
import { NotificationService } from '../notification/notification.service';
import { logger } from '../../utils/logger';

export class PromotionController {
  /**
   * POST /promotions - Vendor autenticado cria promoção
   */
  createPromotion = async (req: Request, res: Response): Promise<void> => {
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

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem criar promoções'
        });
        return;
      }

      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor || !vendor._id) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      const { productId, title, description, type, value, minOrderAmount, maxDiscountAmount, startDate, endDate } = req.body;

      if (!title || !type || value === undefined) {
        res.status(400).json({
          success: false,
          message: 'title, type e value são obrigatórios'
        });
        return;
      }

      const promotion = await promotionService.createPromotion({
        vendorId: vendor._id.toString(),
        productId,
        title,
        description,
        type,
        value,
        minOrderAmount,
        maxDiscountAmount,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      // Emitir notificações para clientes e usuários
      try {
        const notificationService = new NotificationService();
        
        // Notificar apenas clientes sobre a promoção
        await notificationService.notifyCustomersAboutPromotion(
          promotion.title || title,
          vendor.name,
          description
        );

        logger.info(`Notificações de promoção "${promotion.title || title}" enviadas para clientes`);
      } catch (notifError: any) {
        // Não falhar a criação da promoção se a notificação falhar
        logger.error('Erro ao enviar notificações de promoção:', notifError);
      }

      res.status(201).json({
        success: true,
        message: 'Promoção criada com sucesso',
        data: promotion
      });
    } catch (error: any) {
      logger.error('Error creating promotion:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar promoção'
      });
    }
  };

  /**
   * GET /promotions/my - Listar promoções do vendor autenticado
   */
  getMyPromotions = async (req: Request, res: Response): Promise<void> => {
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

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem ver promoções'
        });
        return;
      }

      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor || !vendor._id) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      const { onlyActive } = req.query;

      const promotions = await promotionService.getVendorPromotions(
        vendor._id.toString(),
        onlyActive === 'true'
      );

      res.status(200).json({
        success: true,
        data: promotions
      });
    } catch (error: any) {
      logger.error('Error fetching vendor promotions:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar promoções'
      });
    }
  };

  /**
   * PATCH /promotions/:id - Atualizar/ativar/desativar promoção (vendor)
   */
  updatePromotion = async (req: Request, res: Response): Promise<void> => {
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

      if (user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas vendors podem atualizar promoções'
        });
        return;
      }

      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor || !vendor._id) {
        res.status(404).json({
          success: false,
          message: 'Vendor não encontrado para este usuário'
        });
        return;
      }

      const { id } = req.params;
      const updateData = req.body;

      const promotion = await promotionService.updatePromotion(id, updateData);

      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Promoção não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Promoção atualizada com sucesso',
        data: promotion
      });
    } catch (error: any) {
      logger.error('Error updating promotion:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar promoção'
      });
    }
  };

  /**
   * GET /promotions/vendor/:vendorId - Promoções públicas ativas de um vendor
   */
  getVendorPublicPromotions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vendorId } = req.params;

      const promotions = await promotionService.getVendorPromotions(vendorId, true);

      res.status(200).json({
        success: true,
        data: promotions
      });
    } catch (error: any) {
      logger.error('Error fetching public promotions:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar promoções do vendor'
      });
    }
  };
}

export default new PromotionController();


