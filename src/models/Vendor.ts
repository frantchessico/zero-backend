import { Schema, model } from 'mongoose';
import { IVendor } from './interfaces';

const WorkingHourSchema = new Schema({
  day: { type: Number, required: true }, // 0 = Sunday
  open: { type: String },
  close: { type: String },
  active: { type: Boolean, default: true }
}, { _id: false });

export const VendorSchema = new Schema<IVendor>({
  name: { type: String, required: true },
  type: { type: String, enum: ['restaurant', 'pharmacy', 'electronics', 'service'], required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address: {
    street: String,
    district: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  open24h: { type: Boolean, default: false },
  temporarilyClosed: { type: Boolean, default: false },
  closedMessage: { type: String },
  workingHours: [WorkingHourSchema]
}, {
  timestamps: true
});

// ===== VIRTUALS BIDIRECIONAIS =====

// Virtual para produtos do vendor
VendorSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'vendor',
  justOne: false
});

// Virtual para orders do vendor
VendorSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'vendor',
  justOne: false
});

// Virtual para owner do vendor
VendorSchema.virtual('ownerDetails', {
  ref: 'User',
  localField: 'owner',
  foreignField: '_id',
  justOne: true
});

// Virtual para calcular total de produtos
VendorSchema.virtual('totalProducts').get(function() {
  return (this as any).products ? (this as any).products.length : 0;
});

// Virtual para calcular total de orders
VendorSchema.virtual('totalOrders').get(function() {
  return (this as any).orders ? (this as any).orders.length : 0;
});

// Virtual para verificar se está aberto
VendorSchema.virtual('isOpen').get(function() {
  if (this.open24h) return true;
  if (this.temporarilyClosed) return false;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const workingHour = this.workingHours.find(wh => wh.day === currentDay);
  if (!workingHour || !workingHour.active) return false;
  
  if (workingHour.open && currentTime < workingHour.open) return false;
  if (workingHour.close && currentTime > workingHour.close) return false;
  
  return true;
});

// ===== MIDDLEWARE DE VALIDAÇÃO =====

// Validar relacionamentos antes de salvar
VendorSchema.pre('save', async function(next) {
  try {
    // Validar se owner existe e tem role vendor
    const User = model('User');
    const owner = await User.findById(this.owner);
    if (!owner) {
      return next(new Error('Owner não encontrado'));
    }
    
    if (owner.role !== 'vendor') {
      return next(new Error('Owner deve ter role vendor'));
    }
    
    if (!owner.isActive) {
      return next(new Error('Owner deve estar ativo'));
    }

    // Validar se já existe vendor para este owner
    if (this.isNew) {
      const existingVendor = await model('Vendor').findOne({ owner: this.owner });
      if (existingVendor) {
        return next(new Error('Owner já possui um estabelecimento'));
      }
    }

    next();
  } catch (error) {
    next(error as any);
  }
});

// ===== TRIGGERS AUTOMÁTICOS =====

// Atualizar owner quando vendor é criado
VendorSchema.post('save', async function(doc) {
  try {
    // Criar notificação para owner
    const Notification = model('Notification');
    await Notification.create({
      user: doc.owner,
      type: 'vendor_status',
      message: `Estabelecimento "${doc.name}" criado com sucesso`
    });
  } catch (error) {
    console.error('Error creating vendor notification:', error);
  }
});

// Atualizar produtos quando vendor é suspenso
VendorSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && (this.getUpdate() as any)?.status === 'suspended') {
    try {
      // Desativar todos os produtos do vendor
      const Product = model('Product');
      await Product.updateMany(
        { vendor: doc._id },
        { isAvailable: false }
      );

      // Criar notificação
      const Notification = model('Notification');
      await Notification.create({
        user: doc.owner,
        type: 'vendor_status',
        message: `Estabelecimento "${doc.name}" foi suspenso`
      });
    } catch (error) {
      console.error('Error suspending vendor products:', error);
    }
  }
});

// ===== MÉTODOS DE INSTÂNCIA =====

// Verificar se vendor pode receber pedidos
VendorSchema.methods.canReceiveOrders = function(): boolean {
  return this.status === 'active' && !this.temporarilyClosed && this.isOpen;
};

// Obter estatísticas do vendor
VendorSchema.methods.getStats = async function() {
  const stats = {
    totalProducts: 0,
    availableProducts: 0,
    totalOrders: 0,
    completedOrders: 0,
    revenue: 0
  };

  try {
    const Product = model('Product');
    const Order = model('Order');

    // Estatísticas de produtos
    const productStats = await Product.aggregate([
      { $match: { vendor: this._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          availableProducts: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
          }
        }
      }
    ]);

    if (productStats.length > 0) {
      stats.totalProducts = productStats[0].totalProducts;
      stats.availableProducts = productStats[0].availableProducts;
    }

    // Estatísticas de orders
    const orderStats = await Order.aggregate([
      { $match: { vendor: this._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          revenue: { $sum: '$total' }
        }
      }
    ]);

    if (orderStats.length > 0) {
      stats.totalOrders = orderStats[0].totalOrders;
      stats.completedOrders = orderStats[0].completedOrders;
      stats.revenue = orderStats[0].revenue;
    }

  } catch (error) {
    console.error('Error getting vendor stats:', error);
  }

  return stats;
};

// Obter horário de funcionamento formatado
VendorSchema.methods.getWorkingHoursFormatted = function() {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  return this.workingHours.map((wh: any) => ({
    day: days[wh.day],
    open: wh.open,
    close: wh.close,
    active: wh.active
  }));
};

// Verificar se está aberto em um horário específico
VendorSchema.methods.isOpenAt = function(date: Date): boolean {
  if (this.open24h) return true;
  if (this.temporarilyClosed) return false;
  
  const day = date.getDay();
  const time = date.toTimeString().slice(0, 5);
  
  const workingHour = this.workingHours.find((wh: any) => wh.day === day);
  if (!workingHour || !workingHour.active) return false;
  
  if (workingHour.open && time < workingHour.open) return false;
  if (workingHour.close && time > workingHour.close) return false;
  
  return true;
};

// Configurar para incluir virtuals no JSON
VendorSchema.set('toJSON', { virtuals: true });
VendorSchema.set('toObject', { virtuals: true });

export const Vendor = model('Vendor', VendorSchema);
