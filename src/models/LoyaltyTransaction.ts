import { Schema, Types, model } from 'mongoose';

export interface ILoyaltyTransaction {
  user: Types.ObjectId;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment';
  points: number; // Positivo para ganhos, negativo para gastos
  description: string;
  
  // Referências opcionais
  order?: Types.ObjectId; // Se ganhou pontos de um pedido
  reward?: Types.ObjectId; // Se resgatou uma recompensa
  coupon?: Types.ObjectId; // Se resgatou um cupom
  
  // Metadados
  metadata?: {
    orderTotal?: number;
    pointsPerCurrency?: number;
    levelReached?: string;
    reason?: string;
  };
  
  expiresAt?: Date; // Data de expiração dos pontos (se aplicável)
  
  createdAt?: Date;
}

const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['earned', 'redeemed', 'expired', 'bonus', 'adjustment'],
    required: true 
  },
  points: { type: Number, required: true },
  description: { type: String, required: true },
  
  order: { type: Schema.Types.ObjectId, ref: 'Order' },
  reward: { type: Schema.Types.ObjectId, ref: 'Reward' },
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  
  metadata: {
    orderTotal: Number,
    pointsPerCurrency: Number,
    levelReached: String,
    reason: String
  },
  
  expiresAt: Date
}, {
  timestamps: true
});

LoyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ user: 1, type: 1 });
LoyaltyTransactionSchema.index({ order: 1 });

export const LoyaltyTransaction = model<ILoyaltyTransaction>('LoyaltyTransaction', LoyaltyTransactionSchema);

