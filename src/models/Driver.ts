import mongoose, { Schema, Document } from 'mongoose';

interface IDriver extends Document {
  name: string;
  phoneNumber: string;
  email?: string;
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
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  totalDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number; // em minutos
  workingHours: {
    startTime: string; // formato HH:MM
    endTime: string; // formato HH:MM
  };
  acceptedPaymentMethods: string[];
  deliveryAreas: string[]; // zonas de entrega
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

const driverSchema: Schema<IDriver> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\+258\d{9}$/, 'Número de telefone inválido para Moçambique'],
    },
    email: {
      type: String,
      required: false,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    vehicleInfo: {
      type: {
        type: String,
        enum: ['motorcycle', 'car', 'bicycle'],
        required: true,
      },
      model: {
        type: String,
        required: false,
      },
      plateNumber: {
        type: String,
        required: false,
      },
      color: {
        type: String,
        required: false,
      },
    },
    currentLocation: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
      lastUpdated: { type: Date, required: false },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageDeliveryTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    workingHours: {
      startTime: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
      },
      endTime: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
      },
    },
    acceptedPaymentMethods: {
      type: [String],
      default: [],
    },
    deliveryAreas: {
      type: [String],
      default: [],
    },
    documents: {
      license: { type: String, required: false },
      insurance: { type: String, required: false },
      vehicleRegistration: { type: String, required: false },
    },
    emergencyContact: {
      name: { type: String, required: false },
      phoneNumber: { type: String, required: false },
      relationship: { type: String, required: false },
    },
  },
  { timestamps: true }
);

// Índices para melhorar performance
driverSchema.index({ 'currentLocation': '2dsphere' });
driverSchema.index({ isAvailable: 1, isActive: 1 });
driverSchema.index({ rating: -1 });
driverSchema.index({ phoneNumber: 1 });

const DriverModel = mongoose.model<IDriver>('Driver', driverSchema);

export default DriverModel; 