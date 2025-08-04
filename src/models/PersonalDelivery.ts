import { Schema, model } from 'mongoose';

export interface IPersonalDeliveryItem {
  name: string;
  description?: string;
  quantity: number;
  weight?: number; // em kg
  dimensions?: {
    length: number; // em cm
    width: number;
    height: number;
  };
  isFragile: boolean;
  specialInstructions?: string;
}

export interface IPersonalDelivery {
  customer: Schema.Types.ObjectId;
  pickupAddress: {
    street: string;
    district: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  deliveryAddress: {
    street: string;
    district: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  items: IPersonalDeliveryItem[];
  category: 'electronics' | 'documents' | 'furniture' | 'clothing' | 'appliances' | 'other';
  totalWeight?: number; // em kg
  estimatedValue: number; // valor estimado dos itens
  deliveryFee: number;
  insuranceFee?: number; // taxa de seguro para itens valiosos
  total: number;
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  driver?: Schema.Types.ObjectId; // ID do driver
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  notes?: string;
  insuranceRequired: boolean;
  signatureRequired: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PersonalDeliveryItemSchema = new Schema<IPersonalDeliveryItem>({
  name: {
    type: String,
    required: true
  },
  description: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  isFragile: {
    type: Boolean,
    default: false
  },
  specialInstructions: String
}, { _id: false });

const PersonalDeliverySchema = new Schema<IPersonalDelivery>({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickupAddress: {
    street: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  deliveryAddress: {
    street: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  items: {
    type: [PersonalDeliveryItemSchema],
    required: true,
    validate: [(arr: string | any[]) => arr.length > 0, 'Personal delivery must contain at least one item']
  },
  category: {
    type: String,
    enum: ['electronics', 'documents', 'furniture', 'clothing', 'appliances', 'other'],
    required: true
  },
  totalWeight: {
    type: Number,
    min: 0
  },
  estimatedValue: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    required: true,
    min: 0
  },
  insuranceFee: {
    type: Number,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
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
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver'
  },
  estimatedPickupTime: Date,
  estimatedDeliveryTime: Date,
  actualPickupTime: Date,
  actualDeliveryTime: Date,
  notes: String,
  insuranceRequired: {
    type: Boolean,
    default: false
  },
  signatureRequired: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para melhor performance
PersonalDeliverySchema.index({ customer: 1, createdAt: -1 });
PersonalDeliverySchema.index({ status: 1 });
PersonalDeliverySchema.index({ driver: 1 });
PersonalDeliverySchema.index({ 'pickupAddress.coordinates': '2dsphere' });
PersonalDeliverySchema.index({ 'deliveryAddress.coordinates': '2dsphere' });

export const PersonalDelivery = model<IPersonalDelivery>('PersonalDelivery', PersonalDeliverySchema); 