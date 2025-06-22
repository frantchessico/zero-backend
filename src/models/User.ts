import mongoose, { Schema, Document } from 'mongoose';

interface IAddress {
  tipoVia: string;
  nomeVia: string;
  numero: string;
  bairro?: string;
  pontoReferencia?: string;
  outrasInformacoes?: string;
}

const addressSchema = new Schema<IAddress>({
  tipoVia: { type: String, required: true },
  nomeVia: { type: String, required: true },
  numero: { type: String, required: true },
  bairro: { type: String, required: false },
  pontoReferencia: { type: String, required: false },
  outrasInformacoes: { type: String, required: false },
});

interface IUser  {
  userId: string
  phoneNumber: string;
  email?: string;
  deliveryAddresses: IAddress[];
  orderHistory: mongoose.Types.ObjectId[]; // Referências aos IDs dos pedidos
  paymentMethods?: string[]; // Ex: ["visa", "m-pesa"]
  loyaltyPoints?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema: Schema<IUser> = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true, // Número de telefone para login
      match: [/^\+258\d{9}$/, 'Número de telefone inválido para Moçambique'],
    },
    deliveryAddresses: {
      type: [addressSchema], // Array para múltiplos endereços de entrega
      default: [],
    },
    orderHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order', // Referência ao modelo de Pedido (a ser criado)
      default: [],
    }],
    paymentMethods: {
      type: [String],
      default: [],
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true } // Adiciona automaticamente os campos createdAt e updatedAt
);

const UserModel = mongoose.model<IUser>('User', userSchema);

export default UserModel;