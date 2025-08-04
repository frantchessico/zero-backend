import { Schema, model } from 'mongoose';
import { IOrder, IOrderItem } from './interfaces';
import { AddressSchema } from './Address';

const OrderItemSchema = new Schema<IOrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  specialInstructions: {
    type: String
  }
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  items: {
    type: [OrderItemSchema],
    required: true,
    validate: [(arr: string | any[]) => arr.length > 0, 'Order must contain at least one item']
  },
  deliveryAddress: {
    type: AddressSchema,
    required: true
  },
  deliveryType: {
    type: String,
    enum: ['delivery', 'pickup'],
    default: 'delivery'
  },
  orderType: {
    type: String,
    enum: ['food', 'medicine', 'document', 'appliance'],
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  notes: String
}, {
  timestamps: true
});

// ===== VIRTUALS BIDIRECIONAIS =====

// Virtual para delivery do order
OrderSchema.virtual('delivery', {
  ref: 'Delivery',
  localField: '_id',
  foreignField: 'order',
  justOne: true
});

// Virtual para payment do order
OrderSchema.virtual('payment', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'order',
  justOne: true
});

// Virtual para notifications do order
OrderSchema.virtual('notifications', {
  ref: 'Notification',
  localField: '_id',
  foreignField: 'order',
  justOne: false
});

// Virtual para calcular total de itens
OrderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual para calcular tempo de preparação
OrderSchema.virtual('preparationTime').get(function() {
  if (this.actualDeliveryTime && this.createdAt) {
    return this.actualDeliveryTime.getTime() - this.createdAt.getTime();
  }
  return null;
});

// ===== MIDDLEWARE DE VALIDAÇÃO =====

// Validar relacionamentos antes de salvar
OrderSchema.pre('save', async function(next) {
  try {
    // Validar se customer existe e está ativo
    const User = model('User');
    const customer = await User.findById(this.customer);
    if (!customer || !customer.isActive) {
      return next(new Error('Customer inválido ou inativo'));
    }

    // Validar se vendor existe e está ativo
    const Vendor = model('Vendor');
    const vendor = await Vendor.findById(this.vendor);
    if (!vendor || vendor.status !== 'active') {
      return next(new Error('Vendor inválido ou inativo'));
    }

    // Validar se todos os produtos existem e estão disponíveis
    const Product = model('Product');
    for (const item of this.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isAvailable) {
        return next(new Error(`Produto ${item.product} inválido ou indisponível`));
      }
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// ===== TRIGGERS AUTOMÁTICOS =====

// Middleware: calcula subtotal e total automaticamente
OrderSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('deliveryFee') || this.isModified('tax')) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.total = this.subtotal + this.deliveryFee + this.tax;
  }
  next();
});

// Atualizar customer quando order é criado
OrderSchema.post('save', async function(doc) {
  try {
    const User = model('User');
    await User.findByIdAndUpdate(doc.customer, {
      $push: { orderHistory: doc._id }
    });

    // Criar notificação para customer
    const Notification = model('Notification');
    await Notification.create({
      user: doc.customer,
      type: 'order_status',
      message: `Pedido #${doc._id} criado com sucesso`,
      order: doc._id
    });

    // Criar notificação para vendor
    await Notification.create({
      user: doc.vendor,
      type: 'order_status',
      message: `Novo pedido #${doc._id} recebido`,
      order: doc._id
    });

  } catch (error: any) {
    console.error('Error updating related entities:', error);
  }
});

// Atualizar contadores quando order é atualizado
OrderSchema.post('findOneAndUpdate', async function(doc) {
  const update = this.getUpdate();
  if (doc && update && typeof update === 'object' && 'status' in update) {
    try {
      const newStatus = (update as any).status;
      
      // Criar notificação de mudança de status
      const Notification = model('Notification');
      await Notification.create({
        user: doc.customer,
        type: 'order_status',
        message: `Status do pedido #${doc._id} alterado para: ${newStatus}`,
        order: doc._id
      });

      // Se entregue, atualizar pontos de fidelidade
      if (newStatus === 'delivered') {
        const User = model('User');
        const pointsEarned = Math.floor(doc.total / 10); // 1 ponto por cada 10 unidades
        await User.findByIdAndUpdate(doc.customer, {
          $inc: { loyaltyPoints: pointsEarned }
        });
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
    }
  }
});

// ===== MÉTODOS DE INSTÂNCIA =====

// Verificar se order pode ser cancelado
OrderSchema.methods.canCancel = function(): boolean {
  const cancellableStatuses = ['pending', 'confirmed', 'preparing'];
  return cancellableStatuses.includes(this.status);
};

// Verificar se order pode ser entregue
OrderSchema.methods.canDeliver = function(): boolean {
  return this.status === 'ready' && this.paymentStatus === 'paid';
};

// Obter tempo estimado de entrega
OrderSchema.methods.getEstimatedDeliveryTime = function(): Date | null {
  if (this.estimatedDeliveryTime) {
    return this.estimatedDeliveryTime;
  }
  
  // Calcular baseado no tipo de entrega
  const now = new Date();
  if (this.deliveryType === 'pickup') {
    return new Date(now.getTime() + 30 * 60 * 1000); // +30 min
  } else {
    return new Date(now.getTime() + 60 * 60 * 1000); // +1 hora
  }
};

// Obter estatísticas do order
OrderSchema.methods.getStats = function() {
  return {
    totalItems: this.totalItems,
    preparationTime: this.preparationTime,
    isDeliverable: this.canDeliver(),
    isCancellable: this.canCancel(),
    estimatedDelivery: this.getEstimatedDeliveryTime()
  };
};

// Configurar para incluir virtuals no JSON
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

export const Order = model('Order', OrderSchema);
