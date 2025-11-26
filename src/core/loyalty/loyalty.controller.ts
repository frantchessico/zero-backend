import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import { loyaltyService } from './loyalty.service';
import { LoyaltyProgram } from '../../models/LoyaltyProgram';
import { logger } from '../../utils/logger';

export class LoyaltyController {
  /**
   * GET /loyalty/status - Cliente ver seu status de fidelidade
   */
  getMyLoyaltyStatus = async (req: Request, res: Response): Promise<void> => {
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

      const { vendorId } = req.query;

      const status = await loyaltyService.getUserLoyaltyStatus(
        user._id.toString(),
        vendorId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error: any) {
      logger.error('Error fetching loyalty status:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar status de fidelidade'
      });
    }
  };

  /**
   * POST /loyalty/redeem - Resgatar recompensa (trocar pontos por cupom)
   */
  redeemReward = async (req: Request, res: Response): Promise<void> => {
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

      const { rewardId, vendorId } = req.body;

      if (!rewardId) {
        res.status(400).json({
          success: false,
          message: 'rewardId é obrigatório'
        });
        return;
      }

      const result = await loyaltyService.redeemReward({
        userId: user._id.toString(),
        rewardId,
        vendorId
      });

      res.status(200).json({
        success: true,
        message: 'Recompensa resgatada com sucesso',
        data: result
      });
    } catch (error: any) {
      logger.error('Error redeeming reward:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao resgatar recompensa'
      });
    }
  };

  /**
   * GET /loyalty/rewards - Listar recompensas disponíveis
   */
  getAvailableRewards = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vendorId } = req.query;

      const program = await loyaltyService.getActiveProgram(vendorId as string | undefined);

      if (!program) {
        res.status(404).json({
          success: false,
          message: 'Programa de fidelidade não encontrado'
        });
        return;
      }

      const activeRewards = program.rewards.filter(r => r.isActive);

      res.status(200).json({
        success: true,
        data: {
          program: {
            name: program.name,
            description: program.description,
            pointsPerCurrency: program.pointsPerCurrency
          },
          rewards: activeRewards
        }
      });
    } catch (error: any) {
      logger.error('Error fetching rewards:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar recompensas'
      });
    }
  };

  /**
   * GET /loyalty/transactions - Histórico de transações de pontos
   */
  getMyTransactions = async (req: Request, res: Response): Promise<void> => {
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

      const { page = 1, limit = 20, type } = req.query;

      const { LoyaltyTransaction } = await import('../../models/LoyaltyTransaction');
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const query: any = { user: user._id };
      if (type) {
        query.type = type;
      }

      const [transactions, total] = await Promise.all([
        LoyaltyTransaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string))
          .populate('order', 'total status')
          .populate('coupon', 'code title')
          .exec(),
        LoyaltyTransaction.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            currentPage: parseInt(page as string),
            itemsPerPage: parseInt(limit as string),
            totalItems: total,
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching transactions:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar transações'
      });
    }
  };

  // ===== ENDPOINTS ADMIN/VENDOR =====

  /**
   * POST /loyalty/program - Criar/atualizar programa de fidelidade (admin/vendor)
   */
  createOrUpdateProgram = async (req: Request, res: Response): Promise<void> => {
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

      // Apenas admin ou vendor podem criar programa
      if (user.role !== 'admin' && user.role !== 'vendor') {
        res.status(403).json({
          success: false,
          message: 'Apenas admin ou vendor podem criar programa de fidelidade'
        });
        return;
      }

      let vendorId: string | undefined;
      if (user.role === 'vendor') {
        const vendor = await Vendor.findOne({ owner: user._id });
        if (!vendor || !vendor._id) {
          res.status(404).json({
            success: false,
            message: 'Vendor não encontrado'
          });
          return;
        }
        vendorId = vendor._id.toString();
      }

      const { programId, ...programData } = req.body;

      if (programId) {
        // Atualizar programa existente
        const program = await LoyaltyProgram.findByIdAndUpdate(
          programId,
          { $set: programData },
          { new: true, runValidators: true }
        );

        if (!program) {
          res.status(404).json({
            success: false,
            message: 'Programa não encontrado'
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Programa atualizado com sucesso',
          data: program
        });
      } else {
        // Criar novo programa
        const program = await LoyaltyProgram.create({
          ...programData,
          vendor: vendorId ? new (await import('mongoose')).Types.ObjectId(vendorId) : undefined
        });

        res.status(201).json({
          success: true,
          message: 'Programa criado com sucesso',
          data: program
        });
      }
    } catch (error: any) {
      logger.error('Error creating/updating program:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar/atualizar programa'
      });
    }
  };

  /**
   * GET /loyalty/program - Obter programa de fidelidade
   */
  getProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const { vendorId } = req.query;

      const program = await loyaltyService.getActiveProgram(vendorId as string | undefined);

      if (!program) {
        res.status(404).json({
          success: false,
          message: 'Programa de fidelidade não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: program
      });
    } catch (error: any) {
      logger.error('Error fetching program:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar programa'
      });
    }
  };
}

export default new LoyaltyController();

