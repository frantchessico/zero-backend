import { model, Schema, Types } from 'mongoose';
import { IUser } from './interfaces';
import { AddressSchema } from './Address';

export const UserSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clerkId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true
  },
  phoneNumber: { type: String, required: false },
  email: { type: String, unique: true, sparse: true },
  
  role: { type: String, enum: ['customer', 'driver', 'vendor', 'admin'], required: true },

  // ✅ Campos novos e úteis:
  deliveryAddresses: { type: [AddressSchema], default: [] },
  orderHistory: [{ type: Types.ObjectId, ref: 'Order' }],
  paymentMethods: [{ type: String, enum: ['visa', 'm-pesa', 'cash', 'paypal'] }],
  loyaltyPoints: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  // ✅ Campo para vendor (se role = 'vendor')
  vendorId: { type: Types.ObjectId, ref: 'Vendor', required: false }

}, {
  timestamps: true
});

// ===== VIRTUALS BIDIRECIONAIS =====

// Virtual para vendors do usuário
UserSchema.virtual('vendors', {
  ref: 'Vendor',
  localField: '_id',
  foreignField: 'owner',
  justOne: false
});

// Virtual para deliveries do usuário (como driver)
UserSchema.virtual('deliveries', {
  ref: 'Delivery',
  localField: '_id',
  foreignField: 'driver',
  justOne: false
});

// Virtual para perfil de driver (se role = 'driver')
UserSchema.virtual('driverProfile', {
  ref: 'Driver',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Virtual para orders do usuário (como customer)
UserSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'customer',
  justOne: false
});

// Virtual para notificações do usuário
UserSchema.virtual('notifications', {
  ref: 'Notification',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// Virtual para pagamentos do usuário
UserSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// ===== MIDDLEWARE DE VALIDAÇÃO =====

// Validar role antes de salvar
UserSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    const validRoles = ['customer', 'driver', 'vendor', 'admin'];
    if (!validRoles.includes(this.role)) {
      return next(new Error('Role inválida'));
    }
  }
  next();
});

// ===== TRIGGERS AUTOMÁTICOS =====

// Atualizar contadores quando order é adicionado
UserSchema.methods.addOrderToHistory = async function(orderId: Types.ObjectId) {
  this.orderHistory.push(orderId);
  await this.save();
};

// Atualizar pontos de fidelidade
UserSchema.methods.updateLoyaltyPoints = async function(points: number) {
  this.loyaltyPoints += points;
  if (this.loyaltyPoints < 0) this.loyaltyPoints = 0;
  await this.save();
};

// ===== MÉTODOS DE INSTÂNCIA =====

// Verificar se usuário pode fazer pedidos
UserSchema.methods.canOrder = function(): boolean {
  return this.isActive && this.role === 'customer';
};

// Verificar se usuário pode fazer entregas
UserSchema.methods.canDeliver = function(): boolean {
  return this.isActive && this.role === 'driver';
};

// Verificar se usuário tem perfil de driver
UserSchema.methods.hasDriverProfile = async function(): Promise<boolean> {
  if (this.role !== 'driver') return false;
  
  const Driver = model('Driver');
  const driver = await Driver.findOne({ userId: this._id });
  return !!driver;
};

// Obter perfil de driver do usuário
UserSchema.methods.getDriverProfile = async function() {
  if (this.role !== 'driver') {
    throw new Error('Usuário não é driver');
  }
  
  const Driver = model('Driver');
  const driver = await Driver.findOne({ userId: this._id });
  
  if (!driver) {
    throw new Error('Perfil de driver não encontrado');
  }
  
  return driver;
};

// Verificar se usuário pode ter estabelecimento
UserSchema.methods.canVendor = function(): boolean {
  return this.isActive && this.role === 'vendor';
};

// Obter estatísticas do usuário
UserSchema.methods.getStats = async function() {
  const stats: any = {
    totalOrders: this.orderHistory.length,
    loyaltyPoints: this.loyaltyPoints,
    deliveryAddresses: this.deliveryAddresses.length,
    paymentMethods: this.paymentMethods.length
  };

  // Se for driver, adicionar stats de entrega
  if (this.role === 'driver') {
    try {
      const driver = await this.getDriverProfile();
      stats.driverStats = {
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        rating: driver.rating,
        totalDeliveries: driver.totalDeliveries,
        completedDeliveries: driver.completedDeliveries,
        isAvailable: driver.isAvailable,
        isVerified: driver.isVerified
      };
    } catch (error) {
      // Driver profile não encontrado, mas user tem role 'driver'
      stats.driverStats = {
        hasProfile: false,
        message: 'Perfil de driver não configurado'
      };
    }
  }

  // Se for vendor, adicionar stats de vendor
  if (this.role === 'vendor') {
    const Vendor = model('Vendor');
    const vendor = await Vendor.findOne({ owner: this._id });
    if (vendor) {
      stats.vendorName = vendor.name;
      stats.vendorStatus = vendor.status;
    }
  }

  return stats;
};

// Configurar para incluir virtuals no JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export const User = model('User', UserSchema);
