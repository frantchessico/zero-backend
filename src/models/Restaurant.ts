import mongoose, { Schema, Document } from 'mongoose';

interface IOperatingHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  openTime: string; // formato HH:MM
  closeTime: string; // formato HH:MM
  isOpen: boolean;
}

const operatingHoursSchema = new Schema<IOperatingHours>({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  openTime: {
    type: String,
    required: true,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
  },
  closeTime: {
    type: String,
    required: true,
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
});

interface IRestaurant extends Document {
  name: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address: {
    tipoVia: string;
    nomeVia: string;
    numero: string;
    bairro?: string;
    cidade: string;
    provincia: string;
    codigoPostal?: string;
    coordenadas?: {
      latitude: number;
      longitude: number;
    };
  };
  phoneNumber: string;
  email?: string;
  website?: string;
  cuisineType: string[]; // Ex: ["pizza", "italiano", "fast-food"]
  rating: number;
  reviewCount: number;
  deliveryFee: number;
  minimumOrder: number;
  averagePreparationTime: number; // em minutos
  isOpen: boolean;
  isActive: boolean;
  isVerified: boolean;
  operatingHours: IOperatingHours[];
  acceptedPaymentMethods: string[];
  deliveryRadius: number; // em km
  specialFeatures?: string[]; // Ex: ["vegetariano", "sem glúten", "24h"]
  createdAt?: Date;
  updatedAt?: Date;
}

const restaurantSchema: Schema<IRestaurant> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      required: false,
    },
    coverImageUrl: {
      type: String,
      required: false,
    },
    address: {
      tipoVia: { type: String, required: true },
      nomeVia: { type: String, required: true },
      numero: { type: String, required: true },
      bairro: { type: String, required: false },
      cidade: { type: String, required: true },
      provincia: { type: String, required: true },
      codigoPostal: { type: String, required: false },
      coordenadas: {
        latitude: { type: Number, required: false },
        longitude: { type: Number, required: false },
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^\+258\d{9}$/, 'Número de telefone inválido para Moçambique'],
    },
    email: {
      type: String,
      required: false,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    website: {
      type: String,
      required: false,
    },
    cuisineType: {
      type: [String],
      required: true,
      validate: [cuisineType => cuisineType.length > 0, 'Pelo menos um tipo de cozinha deve ser especificado'],
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
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumOrder: {
      type: Number,
      required: true,
      min: 0,
    },
    averagePreparationTime: {
      type: Number,
      required: true,
      min: 0,
    },
    isOpen: {
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
    operatingHours: {
      type: [operatingHoursSchema],
      default: [],
    },
    acceptedPaymentMethods: {
      type: [String],
      default: [],
    },
    deliveryRadius: {
      type: Number,
      required: true,
      min: 0,
    },
    specialFeatures: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Índices para melhorar performance
restaurantSchema.index({ 'address.coordenadas': '2dsphere' });
restaurantSchema.index({ isOpen: 1, isActive: 1 });
restaurantSchema.index({ cuisineType: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ name: 'text', description: 'text' });

const RestaurantModel = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);

export default RestaurantModel; 