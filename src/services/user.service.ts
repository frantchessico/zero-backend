import User from '../models/User';
import { Types } from 'mongoose';

export interface CreateUserData {
  phoneNumber: string;
  email?: string;
  deliveryAddresses?: Array<{
    tipoVia: string;
    nomeVia: string;
    numero: string;
    bairro?: string;
    pontoReferencia?: string;
    outrasInformacoes?: string;
  }>;
  paymentMethods?: string[];
  loyaltyPoints?: number;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  deliveryAddresses?: Array<{
    tipoVia: string;
    nomeVia: string;
    numero: string;
    bairro?: string;
    pontoReferencia?: string;
    outrasInformacoes?: string;
  }>;
  paymentMethods?: string[];
  loyaltyPoints?: number;
  isActive?: boolean;
}

export interface AddAddressData {
  tipoVia: string;
  nomeVia: string;
  numero: string;
  bairro?: string;
  pontoReferencia?: string;
  outrasInformacoes?: string;
}

export class UserService {
  /**
   * Criar um novo usuário
   */
  static async createUser(userData: CreateUserData) {
    try {
      // Verificar se o usuário já existe
      const existingUser = await User.findOne({ phoneNumber: userData.phoneNumber });
      if (existingUser) {
        throw new Error('Usuário com este número de telefone já existe');
      }

      const user = new User(userData);
      await user.save();
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar usuário por ID
   */
  static async getUserById(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar usuário por número de telefone
   */
  static async getUserByPhone(phoneNumber: string) {
    try {
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar usuário por email
   */
  static async getUserByEmail(email: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Listar todos os usuários com paginação
   */
  static async getAllUsers(page: number = 1, limit: number = 10, isActive?: boolean) {
    try {
      const skip = (page - 1) * limit;
      const filter: any = {};
      
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      const users = await User.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(filter);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar usuário
   */
  static async updateUser(userId: string, updateData: UpdateUserData) {
    try {
      const user = await User.findOneAndUpdate(
        {userId: userId},
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletar usuário (soft delete)
   */
  static async deleteUser(userId: string) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adicionar endereço de entrega
   */
  static async addDeliveryAddress(userId: string, addressData: AddAddressData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      user.deliveryAddresses.push(addressData);
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualizar endereço de entrega
   */
  static async updateDeliveryAddress(userId: string, addressIndex: number, addressData: AddAddressData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (addressIndex < 0 || addressIndex >= user.deliveryAddresses.length) {
        throw new Error('Índice de endereço inválido');
      }

      user.deliveryAddresses[addressIndex] = addressData;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remover endereço de entrega
   */
  static async removeDeliveryAddress(userId: string, addressIndex: number) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (addressIndex < 0 || addressIndex >= user.deliveryAddresses.length) {
        throw new Error('Índice de endereço inválido');
      }

      user.deliveryAddresses.splice(addressIndex, 1);
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adicionar método de pagamento
   */
  static async addPaymentMethod(userId: string, paymentMethod: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (!user.paymentMethods.includes(paymentMethod)) {
        user.paymentMethods.push(paymentMethod);
        await user.save();
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remover método de pagamento
   */
  static async removePaymentMethod(userId: string, paymentMethod: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      user.paymentMethods = user.paymentMethods.filter(method => method !== paymentMethod);
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adicionar pontos de fidelidade
   */
  static async addLoyaltyPoints(userId: string, points: number) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      user.loyaltyPoints = (user.loyaltyPoints || 0) + points;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usar pontos de fidelidade
   */
  static async useLoyaltyPoints(userId: string, points: number) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const currentPoints = user.loyaltyPoints || 0;
      if (currentPoints < points) {
        throw new Error('Pontos de fidelidade insuficientes');
      }

      user.loyaltyPoints = currentPoints - points;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adicionar pedido ao histórico
   */
  static async addOrderToHistory(userId: string, orderId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      if (!user.orderHistory.includes(new Types.ObjectId(orderId))) {
        user.orderHistory.push(new Types.ObjectId(orderId));
        await user.save();
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obter histórico de pedidos do usuário
   */
  static async getUserOrderHistory(userId: string, page: number = 1, limit: number = 10) {
    try {
      const user = await User.findById(userId).populate({
        path: 'orderHistory',
        options: {
          skip: (page - 1) * limit,
          limit,
          sort: { createdAt: -1 },
        },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const total = user.orderHistory.length;

      return {
        orders: user.orderHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar usuários por localização (próximos a um ponto)
   */
  static async getUsersNearLocation(latitude: number, longitude: number, radiusKm: number = 5) {
    try {
      // Esta funcionalidade seria implementada se tivermos coordenadas dos usuários
      // Por enquanto, retorna todos os usuários ativos
      const users = await User.find({ isActive: true });
      return users;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Estatísticas dos usuários
   */
  static async getUserStats() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const usersWithOrders = await User.countDocuments({ 'orderHistory.0': { $exists: true } });
      const usersWithLoyaltyPoints = await User.countDocuments({ loyaltyPoints: { $gt: 0 } });

      return {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        usersWithOrders,
        usersWithLoyaltyPoints,
        averageLoyaltyPoints: await User.aggregate([
          { $group: { _id: null, avgPoints: { $avg: '$loyaltyPoints' } } }
        ]).then(result => result[0]?.avgPoints || 0),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verificar se usuário existe
   */
  static async userExists(phoneNumber: string): Promise<boolean> {
    try {
      const user = await User.findOne({ phoneNumber });
      return !!user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ativar/Desativar usuário
   */
  static async toggleUserStatus(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      user.isActive = !user.isActive;
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }
} 