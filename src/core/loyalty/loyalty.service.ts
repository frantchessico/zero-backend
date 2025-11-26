import { Types } from 'mongoose';
import { User } from '../../models/User';
import { LoyaltyProgram, ILoyaltyProgram } from '../../models/LoyaltyProgram';
import { LoyaltyTransaction } from '../../models/LoyaltyTransaction';
import { Order } from '../../models/Order';
import { Coupon } from '../../models/Coupon';
import { couponService } from '../coupon/coupon.service';
import { logger } from '../../utils/logger';

export interface EarnPointsParams {
  userId: string;
  orderId?: string;
  orderTotal: number;
  vendorId?: string;
  reason?: string;
}

export interface RedeemRewardParams {
  userId: string;
  rewardId: string;
  vendorId?: string;
}

export interface UserLoyaltyStatus {
  userId: string;
  totalPoints: number;
  availablePoints: number; // Pontos não expirados
  currentLevel: {
    name: string;
    displayName: string;
    minPoints: number;
    benefits: string[];
    discountPercentage?: number;
  } | null;
  nextLevel: {
    name: string;
    displayName: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
  pointsExpiringSoon: number; // Pontos que expiram nos próximos 30 dias
  totalEarned: number;
  totalRedeemed: number;
  transactions: any[];
}

export class LoyaltyService {
  /**
   * Obter programa de fidelidade ativo (global ou do vendor)
   */
  async getActiveProgram(vendorId?: string): Promise<ILoyaltyProgram | null> {
    const query: any = { isActive: true };
    
    if (vendorId) {
      query.$or = [
        { vendor: new Types.ObjectId(vendorId) },
        { vendor: { $exists: false } } // Programa global
      ];
    } else {
      query.vendor = { $exists: false }; // Apenas programa global
    }
    
    // Priorizar programa do vendor sobre global
    const vendorProgram = vendorId 
      ? await LoyaltyProgram.findOne({ vendor: new Types.ObjectId(vendorId), isActive: true }).exec()
      : null;
    
    if (vendorProgram) return vendorProgram;
    
    return await LoyaltyProgram.findOne({ vendor: { $exists: false }, isActive: true }).exec();
  }

  /**
   * Calcular pontos ganhos baseado no valor do pedido
   */
  async calculatePointsEarned(orderTotal: number, vendorId?: string): Promise<number> {
    const program = await this.getActiveProgram(vendorId);
    
    if (!program) return 0;
    
    // Verificar valor mínimo
    if (program.minOrderAmountForPoints && orderTotal < program.minOrderAmountForPoints) {
      return 0;
    }
    
    // Calcular pontos: orderTotal * pointsPerCurrency
    const points = Math.floor(orderTotal * program.pointsPerCurrency);
    return points;
  }

  /**
   * Adicionar pontos ao usuário (após pedido entregue)
   */
  async earnPoints(params: EarnPointsParams): Promise<{ points: number; transaction: any }> {
    const { userId, orderId, orderTotal, vendorId, reason } = params;
    
    const points = await this.calculatePointsEarned(orderTotal, vendorId);
    
    if (points <= 0) {
      throw new Error('Nenhum ponto a ser ganho para este pedido');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Obter programa para configurar expiração
    const program = await this.getActiveProgram(vendorId);
    let expiresAt: Date | undefined;
    
    if (program?.pointsExpirationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + program.pointsExpirationDays);
    }
    
    // Atualizar pontos do usuário
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: points } },
      { new: true }
    );
    
    // Criar transação
    const transaction = await LoyaltyTransaction.create({
      user: new Types.ObjectId(userId),
      type: 'earned',
      points,
      description: reason || `Pontos ganhos por pedido de ${orderTotal.toFixed(2)} MT`,
      order: orderId ? new Types.ObjectId(orderId) : undefined,
      metadata: {
        orderTotal,
        pointsPerCurrency: program?.pointsPerCurrency,
        reason: reason || 'order_completed'
      },
      expiresAt
    });
    
    // Verificar se subiu de nível
    await this.checkAndUpdateLevel(userId, vendorId);
    
    logger.info(`Usuário ${userId} ganhou ${points} pontos`);
    
    return { points, transaction };
  }

  /**
   * Verificar e atualizar nível do usuário
   */
  async checkAndUpdateLevel(userId: string, vendorId?: string): Promise<string | null> {
    const program = await this.getActiveProgram(vendorId);
    if (!program || !program.levels || program.levels.length === 0) {
      return null;
    }
    
    const user = await User.findById(userId);
    if (!user) return null;
    
    // Ordenar níveis por pontos mínimos (maior primeiro)
    const sortedLevels = [...program.levels].sort((a, b) => b.minPoints - a.minPoints);
    
    // Encontrar nível atual do usuário
    for (const level of sortedLevels) {
      if (user.loyaltyPoints >= level.minPoints) {
        // Verificar se já está neste nível (poderia salvar no User, mas por simplicidade retornamos)
        return level.name;
      }
    }
    
    return null;
  }

  /**
   * Obter nível atual do usuário
   */
  async getCurrentLevel(userId: string, vendorId?: string): Promise<any> {
    const program = await this.getActiveProgram(vendorId);
    if (!program || !program.levels || program.levels.length === 0) {
      return null;
    }
    
    const user = await User.findById(userId);
    if (!user) return null;
    
    const sortedLevels = [...program.levels].sort((a, b) => b.minPoints - a.minPoints);
    
    for (const level of sortedLevels) {
      if (user.loyaltyPoints >= level.minPoints) {
        return level;
      }
    }
    
    return null;
  }

  /**
   * Obter próximo nível do usuário
   */
  async getNextLevel(userId: string, vendorId?: string): Promise<any> {
    const program = await this.getActiveProgram(vendorId);
    if (!program || !program.levels || program.levels.length === 0) {
      return null;
    }
    
    const user = await User.findById(userId);
    if (!user) return null;
    
    const sortedLevels = [...program.levels].sort((a, b) => a.minPoints - b.minPoints);
    
    for (const level of sortedLevels) {
      if (user.loyaltyPoints < level.minPoints) {
        return {
          ...level,
          pointsNeeded: level.minPoints - user.loyaltyPoints
        };
      }
    }
    
    return null; // Já está no nível máximo
  }

  /**
   * Obter status completo de fidelidade do usuário
   */
  async getUserLoyaltyStatus(userId: string, vendorId?: string): Promise<UserLoyaltyStatus> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    const program = await this.getActiveProgram(vendorId);
    const currentLevel = await this.getCurrentLevel(userId, vendorId);
    const nextLevel = await this.getNextLevel(userId, vendorId);
    
    // Calcular pontos expirando em breve (próximos 30 dias)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringTransactions = await LoyaltyTransaction.find({
      user: new Types.ObjectId(userId),
      type: 'earned',
      expiresAt: { $lte: thirtyDaysFromNow, $gte: new Date() }
    }).exec();
    
    const pointsExpiringSoon = expiringTransactions.reduce((sum, t) => sum + t.points, 0);
    
    // Calcular totais
    const [totalEarned, totalRedeemed] = await Promise.all([
      LoyaltyTransaction.aggregate([
        { $match: { user: new Types.ObjectId(userId), type: 'earned' } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]),
      LoyaltyTransaction.aggregate([
        { $match: { user: new Types.ObjectId(userId), type: 'redeemed' } },
        { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
      ])
    ]);
    
    // Buscar últimas transações
    const transactions = await LoyaltyTransaction.find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('order', 'total status')
      .exec();
    
    return {
      userId: user._id.toString(),
      totalPoints: user.loyaltyPoints,
      availablePoints: user.loyaltyPoints, // Simplificado (poderia subtrair expirados)
      currentLevel,
      nextLevel,
      pointsExpiringSoon,
      totalEarned: totalEarned[0]?.total || 0,
      totalRedeemed: totalRedeemed[0]?.total || 0,
      transactions
    };
  }

  /**
   * Resgatar recompensa (trocar pontos por cupom/desconto)
   */
  async redeemReward(params: RedeemRewardParams): Promise<{ coupon?: any; transaction: any }> {
    const { userId, rewardId, vendorId } = params;
    
    const program = await this.getActiveProgram(vendorId);
    if (!program) {
      throw new Error('Programa de fidelidade não encontrado');
    }
    
    const reward = program.rewards.find(r => r._id?.toString() === rewardId);
    if (!reward || !reward.isActive) {
      throw new Error('Recompensa não encontrada ou inativa');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    if (user.loyaltyPoints < reward.pointsRequired) {
      throw new Error('Pontos insuficientes para resgatar esta recompensa');
    }
    
    // Deduzir pontos
    await User.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: -reward.pointsRequired } },
      { new: true }
    );
    
    // Criar transação
    const transaction = await LoyaltyTransaction.create({
      user: new Types.ObjectId(userId),
      type: 'redeemed',
      points: -reward.pointsRequired,
      description: `Recompensa resgatada: ${reward.name}`,
      reward: new Types.ObjectId(rewardId),
      metadata: {
        reason: 'reward_redemption',
        rewardName: reward.name
      }
    });
    
    let coupon = null;
    
    // Se for recompensa de cupom, criar cupom automaticamente
    if (reward.type === 'coupon' && reward.value) {
      try {
        const couponCode = `LOYALTY${Date.now().toString().slice(-6)}`;
        coupon = await couponService.createCoupon({
          vendorId: vendorId,
          code: couponCode,
          title: reward.name,
          description: reward.description || `Cupom resgatado com ${reward.pointsRequired} pontos`,
          type: 'percentage',
          value: reward.value,
          maxUses: 1, // Cupom de uso único
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Válido por 30 dias
        });
        
        // Atualizar transação com referência ao cupom
        await LoyaltyTransaction.findByIdAndUpdate(transaction._id, {
          coupon: coupon._id
        });
      } catch (error: any) {
        logger.error('Erro ao criar cupom de recompensa:', error);
        // Não falhar o resgate se o cupom falhar
      }
    }
    
    logger.info(`Usuário ${userId} resgatou recompensa ${reward.name} por ${reward.pointsRequired} pontos`);
    
    return { coupon, transaction };
  }

  /**
   * Adicionar pontos de bônus (aniversário, indicação, etc.)
   */
  async addBonusPoints(userId: string, points: number, reason: string, vendorId?: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    await User.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: points } },
      { new: true }
    );
    
    const program = await this.getActiveProgram(vendorId);
    let expiresAt: Date | undefined;
    
    if (program?.pointsExpirationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + program.pointsExpirationDays);
    }
    
    const transaction = await LoyaltyTransaction.create({
      user: new Types.ObjectId(userId),
      type: 'bonus',
      points,
      description: reason,
      metadata: { reason: 'bonus' },
      expiresAt
    });
    
    return transaction;
  }
}

export const loyaltyService = new LoyaltyService();

