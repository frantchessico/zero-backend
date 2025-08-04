import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDriver extends Document {
  // Referência ao User
  userId: Types.ObjectId; // Referência ao User
  
  // Campos específicos de Driver (sem duplicação)
  licenseNumber: string;
  vehicleInfo: {
    type: 'motorcycle' | 'car' | 'bicycle';
    model?: string;
    plateNumber?: string;
    color?: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  isAvailable: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  totalDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number;
  workingHours: {
    startTime: string;
    endTime: string;
  };
  acceptedPaymentMethods: string[];
  deliveryAreas: string[];
  documents: {
    license?: string;
    insurance?: string;
    vehicleRegistration?: string;
  };
  emergencyContact?: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const driverSchema: Schema<IDriver> = new Schema({
  // Referência obrigatória ao User
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Campos específicos de Driver (sem duplicação)
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  vehicleInfo: {
    type: {
      type: String,
      enum: ['motorcycle', 'car', 'bicycle'],
      required: true
    },
    model: String,
    plateNumber: String,
    color: String
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date
  },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  totalDeliveries: { type: Number, default: 0 },
  completedDeliveries: { type: Number, default: 0 },
  averageDeliveryTime: { type: Number, default: 0 },
  workingHours: {
    startTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    endTime: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    }
  },
  acceptedPaymentMethods: { type: [String], default: [] },
  deliveryAreas: { type: [String], default: [] },
  documents: {
    license: String,
    insurance: String,
    vehicleRegistration: String
  },
  emergencyContact: {
    name: String,
    phoneNumber: String,
    relationship: String
  }
}, {
  timestamps: true
});

// ===== VIRTUALS BIDIRECIONAIS =====

// Virtual para acessar dados do User
driverSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual para deliveries do driver
driverSchema.virtual('deliveries', {
  ref: 'Delivery',
  localField: 'userId',
  foreignField: 'driver',
  justOne: false
});

// Virtual para obter nome completo do driver (User + Driver)
driverSchema.virtual('fullName').get(function() {
  if (this.populated('user')) {
    return `${(this as any).user?.userId} - ${this.licenseNumber}`;
  }
  return this.licenseNumber;
});

// ===== MIDDLEWARE DE VALIDAÇÃO =====

// Validar se User existe e tem role 'driver'
driverSchema.pre('save', async function(next) {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    
    if (!user) {
      return next(new Error('User não encontrado'));
    }
    
    if (user.role !== 'driver') {
      return next(new Error('User deve ter role "driver"'));
    }
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// ===== MÉTODOS DE INSTÂNCIA =====

// Atualizar rating do driver
driverSchema.methods.updateRating = async function(newRating: number) {
  this.rating = ((this.rating * this.reviewCount) + newRating) / (this.reviewCount + 1);
  this.reviewCount += 1;
  await this.save();
  return this;
};

// Adicionar entrega completada
driverSchema.methods.addCompletedDelivery = async function(deliveryTime: number) {
  this.totalDeliveries += 1;
  this.completedDeliveries += 1;
  
  // Atualizar tempo médio de entrega
  const totalTime = (this.averageDeliveryTime * (this.completedDeliveries - 1)) + deliveryTime;
  this.averageDeliveryTime = totalTime / this.completedDeliveries;
  
  await this.save();
  return this;
};

// Verificar se driver está disponível
driverSchema.methods.isDriverAvailable = function(): boolean {
  return this.isAvailable && this.isVerified;
};

// Obter dados completos do driver (User + Driver)
driverSchema.methods.getCompleteDriverData = async function() {
  await this.populate('user', 'userId email phoneNumber role');
  
  return {
    driverId: this._id,
    userId: this.userId,
    userData: {
      userId: this.user?.userId,
      email: this.user?.email,
      phoneNumber: this.user?.phoneNumber,
      role: this.user?.role
    },
    driverData: {
      licenseNumber: this.licenseNumber,
      vehicleInfo: this.vehicleInfo,
      isAvailable: this.isAvailable,
      isVerified: this.isVerified,
      rating: this.rating,
      totalDeliveries: this.totalDeliveries,
      completedDeliveries: this.completedDeliveries
    }
  };
};

// Obter estatísticas completas do driver
driverSchema.methods.getDriverStats = async function() {
  const Delivery = mongoose.model('Delivery');
  
  const deliveryStats = await Delivery.aggregate([
    { $match: { driver: this.userId } },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        completedDeliveries: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        averageDeliveryTime: { $avg: '$deliveryTime' }
      }
    }
  ]);
  
  return {
    ...this.toObject(),
    deliveryStats: deliveryStats[0] || {
      totalDeliveries: 0,
      completedDeliveries: 0,
      averageDeliveryTime: 0
    }
  };
};

// ===== MÉTODOS ESTÁTICOS =====

// Buscar drivers disponíveis
driverSchema.statics.findAvailableDrivers = function() {
  return this.find({
    isAvailable: true,
    isVerified: true
  }).populate('user', 'userId email phoneNumber');
};

// Buscar drivers por área de entrega
driverSchema.statics.findDriversByArea = function(area: string) {
  return this.find({
    deliveryAreas: area,
    isAvailable: true,
    isVerified: true
  }).populate('user', 'userId email phoneNumber');
};

// Buscar drivers por rating
driverSchema.statics.findDriversByRating = function(minRating: number = 4.0) {
  return this.find({
    rating: { $gte: minRating },
    isVerified: true
  }).populate('user', 'userId email phoneNumber');
};

// ===== INDEXES =====

// Indexes para consultas eficientes
driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ isAvailable: 1, isVerified: 1 });
driverSchema.index({ rating: -1 });
driverSchema.index({ userId: 1 });
driverSchema.index({ licenseNumber: 1 });

// Configurar para incluir virtuals no JSON
driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

export const Driver = mongoose.model<IDriver>('Driver', driverSchema);
