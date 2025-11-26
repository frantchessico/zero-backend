import { Schema, Types, model } from 'mongoose';

export interface IRoute {
  driver: Types.ObjectId; // Driver responsável pela rota
  personalDeliveries: Types.ObjectId[]; // Entregas pessoais incluídas na rota
  deliveries: Types.ObjectId[]; // Entregas normais (Delivery) incluídas na rota
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const RouteSchema = new Schema<IRoute>({
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  personalDeliveries: [
    {
      type: Schema.Types.ObjectId,
      ref: 'PersonalDelivery'
    }
  ],
  deliveries: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Delivery'
    }
  ],
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  startTime: Date,
  endTime: Date
}, {
  timestamps: true
});

// Índices úteis
RouteSchema.index({ driver: 1, status: 1 });

export const Route = model<IRoute>('Route', RouteSchema);



