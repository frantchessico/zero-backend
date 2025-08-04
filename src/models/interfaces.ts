
import { Types } from "mongoose";

export interface IAddress {
    streetType: string;
    streetName: string;
    number: string;
    neighborhood?: string;
    city: string;
    province: string;
    country: string;
    postalCode?: string;
    referencePoint?: string;
    additionalInfo?: string;
    label?: 'Home' | 'Work' | 'Other';
    coordinates?: {
      lat: number;
      lng: number;
    };
  }
  
  


  export interface IUser  {
    userId: string;
    _id: Types.ObjectId
    clerkId?: string;
    phoneNumber: string;
    email?: string;
    deliveryAddresses: IAddress[];
    orderHistory: Types.ObjectId[]; // Referências aos IDs dos pedidos
    paymentMethods?: string[]; // Ex: ["visa", "m-pesa"]
    role: 'customer' | 'driver' | 'vendor' | 'admin';
    loyaltyPoints?: number;
    isActive?: boolean;
    vendorId?: Types.ObjectId; // Referência ao Vendor (se role = 'vendor')
    createdAt?: Date;
    updatedAt?: Date;
  }
  

  

  export interface IWorkingHour {
    day: number; // 0 = Sunday, 6 = Saturday
    open?: string; // "HH:MM"
    close?: string; // "HH:MM"
    active: boolean;
  }
  
  export interface IVendor {
    _id?: string;
    name: string;
    type: 'restaurant' | 'pharmacy' | 'electronics' | 'service';
    owner: Types.ObjectId; // user ID
    address: IAddress;
    status: 'active' | 'suspended';
    open24h?: boolean;
    temporarilyClosed?: boolean;
    closedMessage?: string;
    workingHours: IWorkingHour[];
    createdAt?: Date;
    updatedAt?: Date;
  }

  
  export interface IProduct {
    _id?: string;
    name: string;
    type: 'food' | 'medicine' | 'appliance' | 'service';
    price: number;
    stock?: number;
    vendor: string; // vendor ID
    description?: string;
    attributes?: Record<string, any>; // custom attributes
    createdAt?: Date;
    updatedAt?: Date;
  }

  
  export interface IOrderItem {
    product: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specialInstructions?: string;
  }

  
  


  export interface IOrder {
    _id?: string;
    customer: Types.ObjectId;
    vendor: Types.ObjectId;
    items: IOrderItem[];
    deliveryAddress: IAddress;
    deliveryType: 'delivery' | 'pickup';
    orderType: 'food' | 'medicine' | 'document' | 'appliance';
    subtotal: number;
    deliveryFee: number;
    tax: number;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: string;
    estimatedDeliveryTime?: Date;
    actualDeliveryTime?: Date;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  
  export interface ILocation {
    lat: number;
    lng: number;
  }
  
  export interface IDelivery {
    _id?: string;
    order: string; // order ID
    driver: string; // user ID
    status: 'picked_up' | 'in_transit' | 'delivered' | 'failed';
    currentLocation?: ILocation;
    estimatedTime?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  
  export interface IPayment {
    _id?: string;
    order: string; // order ID
    method: 'mpesa' | 'card' | 'cash';
    status: 'pending' | 'paid' | 'failed';
    amount: number;
    paidAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  
  export interface INotification {
    _id?: string;
    user: string; // user ID
    type: 'order_status' | 'delivery_update' | 'promotion';
    message: string;
    read?: boolean;
    sentAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface ICategory extends Document {
    name: string;
    description?: string;
    type: 'food' | 'medicine' | 'appliance' | 'service';
    iconUrl?: string;
    vendor?: Types.ObjectId; // opcional, se for por loja específica
    createdAt?: Date;
    updatedAt?: Date;
  }
  