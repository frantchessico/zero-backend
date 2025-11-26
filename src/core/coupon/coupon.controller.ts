import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import { couponService } from './coupon.service';
import { NotificationService } from '../notification/notification.service';
import { logger } from '../../utils/logger';

export class CouponController {
  /**
   * POST /coupons - Vendor autenticado cria cupom
   */
  createCoupon = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Apenas vendors podem criar cupons'
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

      const {
        code,
        title,
        description,
        type,
        value,
        allowedPaymentMethods,
        minOrderAmount,
        maxDiscountAmount,
        maxUses,
        startDate,
        endDate
      } = req.body;

      if (!code || !type || value === undefined) {
        res.status(400).json({
          success: false,
          message: 'code, type e value são obrigatórios'
        });
        return;
      }

      const coupon = await couponService.createCoupon({
        vendorId: vendor._id.toString(),
        code: code.toUpperCase(),
        title,
        description,
        type,
        value,
        allowedPaymentMethods,
        minOrderAmount,
        maxDiscountAmount,
        maxUses,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      // Emitir notificações para clientes e usuários
      try {
        const notificationService = new NotificationService();
        
        // Montar informações do desconto
        const discountInfo = type === 'percentage' 
          ? `${value}% de desconto`
          : `${value} MT de desconto`;
        
        // Notificar apenas clientes sobre o cupom
        await notificationService.notifyCustomersAboutCoupon(
          coupon.code,
          vendor.name,
          discountInfo
        );

        logger.info(`Notificações de cupom ${coupon.code} enviadas para clientes`);
      } catch (notifError: any) {
        // Não falhar a criação do cupom se a notificação falhar
        logger.error('Erro ao enviar notificações de cupom:', notifError);
      }

      res.status(201).json({
        success: true,
        message: 'Cupom criado com sucesso',
        data: coupon
      });
    } catch (error: any) {
      logger.error('Error creating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar cupom'
      });
    }
  };

  /**
   * GET /coupons/my - Listar cupons do vendor autenticado
   */
  getMyCoupons = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Apenas vendors podem ver cupons'
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

      const coupons = await couponService.getVendorCoupons(vendor._id.toString());

      res.status(200).json({
        success: true,
        data: coupons
      });
    } catch (error: any) {
      logger.error('Error fetching vendor coupons:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar cupons'
      });
    }
  };

  /**
   * PATCH /coupons/:id - Atualizar/ativar/desativar cupom (vendor)
   */
  updateCoupon = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Apenas vendors podem atualizar cupons'
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
      
      // Verificar se o cupom existe e pertence ao vendor
      const existingCoupon = await couponService.getCouponById(id);
      if (!existingCoupon) {
        res.status(404).json({
          success: false,
          message: 'Cupom não encontrado'
        });
        return;
      }

      // Validar ownership: vendor só pode atualizar seus próprios cupons
      if (existingCoupon.vendor && existingCoupon.vendor.toString() !== vendor._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para atualizar este cupom'
        });
        return;
      }

      const updateData = req.body;
      const coupon = await couponService.updateCoupon(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Cupom atualizado com sucesso',
        data: coupon
      });
    } catch (error: any) {
      logger.error('Error updating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar cupom'
      });
    }
  };

  /**
   * POST /coupons/validate - Validar cupom para um pedido
   */
  validateCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, vendorId, paymentMethod, orderTotal } = req.body;

      if (!code || !paymentMethod || orderTotal === undefined) {
        res.status(400).json({
          success: false,
          message: 'code, paymentMethod e orderTotal são obrigatórios'
        });
        return;
      }

      const result = await couponService.validateCoupon({
        code,
        vendorId,
        paymentMethod,
        orderTotal
      });

      if (!result.valid) {
        res.status(400).json({
          success: false,
          message: result.reason || 'Cupom inválido',
          data: result
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error validating coupon:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao validar cupom'
      });
    }
  };

  /**
   * GET /coupons/available - Listar cupons disponíveis (público ou autenticado)
   */
  getAvailableCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vendorId } = req.query;

      const coupons = await couponService.getAvailableCouponsForVendor(
        vendorId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: coupons
      });
    } catch (error: any) {
      logger.error('Error fetching available coupons:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar cupons disponíveis'
      });
    }
  };
}

export default new CouponController();


