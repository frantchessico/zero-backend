import { Types } from 'mongoose';
import { IUser } from '../../models/interfaces';
import { User } from '../../models';

export class UserService {
  private buildUserLookup(identifier: string, isActive?: boolean) {
    const filters: Record<string, unknown> = {
      $or: [{ userId: identifier }, { clerkId: identifier }],
    };

    if (typeof isActive === 'boolean') {
      filters.isActive = isActive;
    }

    return filters;
  }

  /**
   * Criar um novo usuário
   */
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      const duplicateConditions = [];

      if (userData.userId) {
        duplicateConditions.push({ userId: userData.userId });
      }

      if (userData.email) {
        duplicateConditions.push({ email: userData.email });
      }

      if (userData.clerkId) {
        duplicateConditions.push({ clerkId: userData.clerkId });
      }

      if (duplicateConditions.length > 0) {
        const existingUser = await User.findOne({ $or: duplicateConditions }).lean().exec();
        if (existingUser) {
          throw new Error('Usuário já existe com esse email ou userId');
        }
      }

      const user = new User(userData);
      return await user.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error('Usuário já existe com esse email ou userId');
      }
      throw error;
    }
  }

  /**
   * Buscar usuário por ID
   */
  async getUserById(identifier: string): Promise<IUser | null> {
    return await User.findOne(this.buildUserLookup(identifier, true))
      .populate('orderHistory')
      .exec();
  }

  /**
   * Buscar usuário por email
   */
  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email, isActive: true })
      .populate('orderHistory')
      .exec();
  }

  /**
   * Buscar usuários por role
   */
  async getUsersByRole(role: 'customer' | 'driver' | 'vendor'): Promise<IUser[]> {
    return await User.find({ role, isActive: true })
      .populate('orderHistory')
      .exec();
  }

  /**
   * Atualizar dados do usuário
   */
  async updateUser(identifier: string, updateData: Partial<IUser>): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('orderHistory');
  }

  /**
   * Desativar usuário (soft delete)
   */
  async deactivateUser(identifier: string): Promise<boolean> {
    const result = await User.findOneAndUpdate(
      this.buildUserLookup(identifier),
      { $set: { isActive: false } }
    );
    return !!result;
  }

  /**
   * Reativar usuário
   */
  async reactivateUser(identifier: string): Promise<boolean> {
    const result = await User.findOneAndUpdate(
      this.buildUserLookup(identifier),
      { $set: { isActive: true } }
    );
    return !!result;
  }

  /**
   * Adicionar endereço de entrega
   */
  async addDeliveryAddress(identifier: string, address: any): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $push: { deliveryAddresses: address } },
      { new: true }
    );
  }

  /**
   * Remover endereço de entrega
   */
  async removeDeliveryAddress(identifier: string, addressId: string): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $pull: { deliveryAddresses: { _id: addressId } } },
      { new: true }
    );
  }

  /**
   * Atualizar endereço de entrega
   */
  async updateDeliveryAddress(identifier: string, addressId: string, addressData: any): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      { ...this.buildUserLookup(identifier, true), 'deliveryAddresses._id': addressId },
      { $set: { 'deliveryAddresses.$': { ...addressData, _id: addressId } } },
      { new: true }
    );
  }

  /**
   * Adicionar método de pagamento
   */
  async addPaymentMethod(identifier: string, paymentMethod: 'visa' | 'm-pesa' | 'cash' | 'paypal'): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $addToSet: { paymentMethods: paymentMethod } },
      { new: true }
    );
  }

  /**
   * Remover método de pagamento
   */
  async removePaymentMethod(identifier: string, paymentMethod: string): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $pull: { paymentMethods: paymentMethod } },
      { new: true }
    );
  }

  /**
   * Adicionar pontos de fidelidade
   */
  async addLoyaltyPoints(identifier: string, points: number): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $inc: { loyaltyPoints: points } },
      { new: true }
    );
  }

  /**
   * Usar pontos de fidelidade
   */
  async useLoyaltyPoints(identifier: string, points: number): Promise<IUser | null> {
    const user = await User.findOne(this.buildUserLookup(identifier, true));
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if ((user.loyaltyPoints ?? 0) < points) {
      throw new Error('Pontos insuficientes');
    }

    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $inc: { loyaltyPoints: -points } },
      { new: true }
    );
  }

  /**
   * Adicionar pedido ao histórico
   */
  async addOrderToHistory(identifier: string, orderId: Types.ObjectId): Promise<IUser | null> {
    return await User.findOneAndUpdate(
      this.buildUserLookup(identifier, true),
      { $push: { orderHistory: orderId } },
      { new: true }
    ).populate('orderHistory');
  }

  /**
   * Buscar histórico de pedidos do usuário
   */
  async getUserOrderHistory(identifier: string): Promise<any[]> {
    const user = await User.findOne(this.buildUserLookup(identifier, true))
      .populate('orderHistory')
      .exec();
    
    return user?.orderHistory || [];
  }

  /**
   * Listar todos os usuários ativos com paginação
   */
  async getAllUsers(page: number = 1, limit: number = 10): Promise<{
    users: IUser[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find({ isActive: true })
        .populate('orderHistory')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      User.countDocuments({ isActive: true })
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Buscar usuários por telefone
   */
  async getUserByPhone(phoneNumber: string): Promise<IUser | null> {
    return await User.findOne({ phoneNumber, isActive: true })
      .populate('orderHistory')
      .exec();
  }

  /**
   * Verificar se usuário existe
   */
  async userExists(identifier: string): Promise<boolean> {
    const user = await User.findOne(this.buildUserLookup(identifier));
    return !!user;
  }

  /**
   * Contar usuários por role
   */
  async countUsersByRole(): Promise<{
    customers: number;
    drivers: number;
    vendors: number;
    total: number;
  }> {
    const [customers, drivers, vendors] = await Promise.all([
      User.countDocuments({ role: 'customer', isActive: true }),
      User.countDocuments({ role: 'driver', isActive: true }),
      User.countDocuments({ role: 'vendor', isActive: true })
    ]);

    return {
      customers,
      drivers,
      vendors,
      total: customers + drivers + vendors
    };
  }

  /**
   * Buscar usuários com mais pontos de fidelidade
   */
  async getTopLoyaltyUsers(limit: number = 10): Promise<IUser[]> {
    return await User.find({ isActive: true })
      .sort({ loyaltyPoints: -1 })
      .limit(limit)
      .exec();
  }
}
