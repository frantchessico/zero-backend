import { Schema, Types, model } from 'mongoose';

export interface ILoyaltyProgram {
  vendor?: Types.ObjectId; // Se null, é programa global
  name: string;
  description?: string;
  isActive: boolean;
  
  // Configuração de pontos
  pointsPerCurrency: number; // Ex: 1 ponto por cada 10 MT (0.1)
  minOrderAmountForPoints?: number; // Valor mínimo do pedido para ganhar pontos
  
  // Sistema de níveis
  levels: Array<{
    name: string; // 'bronze', 'silver', 'gold', 'platinum'
    displayName: string; // 'Bronze', 'Prata', 'Ouro', 'Platina'
    minPoints: number; // Pontos mínimos para atingir este nível
    benefits: string[]; // Benefícios do nível (ex: "5% desconto extra", "Entrega grátis")
    discountPercentage?: number; // Desconto automático para este nível
  }>;
  
  // Recompensas
  rewards: Array<{
    name: string;
    description?: string;
    pointsRequired: number;
    type: 'coupon' | 'discount' | 'free_delivery' | 'product';
    value?: number; // Valor do desconto ou ID do produto
    couponCode?: string; // Código do cupom gerado automaticamente
    isActive: boolean;
  }>;
  
  // Configurações adicionais
  pointsExpirationDays?: number; // Dias até os pontos expirarem (null = não expiram)
  birthdayBonus?: number; // Pontos extras no aniversário
  referralBonus?: number; // Pontos por indicar amigos
  
  createdAt?: Date;
  updatedAt?: Date;
}

const LoyaltyProgramSchema = new Schema<ILoyaltyProgram>({
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  
  pointsPerCurrency: { type: Number, required: true, default: 0.1 }, // 1 ponto por 10 MT
  minOrderAmountForPoints: { type: Number, min: 0 },
  
  levels: [{
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    minPoints: { type: Number, required: true, min: 0 },
    benefits: [{ type: String }],
    discountPercentage: { type: Number, min: 0, max: 100 }
  }],
  
  rewards: [{
    name: { type: String, required: true },
    description: String,
    pointsRequired: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['coupon', 'discount', 'free_delivery', 'product'], required: true },
    value: Number,
    couponCode: String,
    isActive: { type: Boolean, default: true }
  }],
  
  pointsExpirationDays: { type: Number, min: 1 },
  birthdayBonus: { type: Number, min: 0, default: 0 },
  referralBonus: { type: Number, min: 0, default: 0 }
}, {
  timestamps: true
});

LoyaltyProgramSchema.index({ vendor: 1, isActive: 1 });

export const LoyaltyProgram = model<ILoyaltyProgram>('LoyaltyProgram', LoyaltyProgramSchema);

