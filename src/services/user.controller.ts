import { Request, Response } from 'express';
import { clerkClient } from "@clerk/clerk-sdk-node"
import { UserService, CreateUserData, UpdateUserData, AddAddressData } from './user.service';

export class UserController {

  
  /**
   * Criar um novo usuário
   * POST /api/users
   */
  static async createUser(req: Request, res: Response): Promise<any>  {
    const userId = req.clerkPayload?.sub as string;
    try {
      console.log('BODY: ', req.body)
      const userData: CreateUserData = req.body;
      userData.userId = userId;
      console.log(userData)
      // Validações básicas
      if (!userData.phoneNumber) {
        return res.status(400).json({ 
          success: false, 
          message: 'Número de telefone é obrigatório' 
        });
      }

      const user = await UserService.createUser(userData);
      await clerkClient.users.updateUserMetadata(userId, {
        unsafeMetadata: {
          phoneNumber: userData.phoneNumber,
          deliveryAddresses: userData.deliveryAddresses,
          isActive: userData.isActive
        }
      })
      return res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar usuário',
        error: error.message
      });
    }
  }

  /**
   * Buscar usuário por ID (apenas admin ou próprio usuário)
   * GET /api/users/:id
   */
  static async getUserById(req: Request, res: Response): Promise<any>  {
    try {
      const userId = req.clerkPayload?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await UserService.getUserById(userId);
      
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Usuário não encontrado',
        error: error.message
      });
    }
  }

  /**
   * Buscar usuário por número de telefone (apenas admin)
   * GET /api/users/phone/:phoneNumber
   */
  static async getUserByPhone(req: Request, res: Response): Promise<any>  {
    try {
      const { phoneNumber } = req.params;
      const authenticatedUserId = req.clerkPayload?.sub;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone é obrigatório'
        });
      }

      const user = await UserService.getUserByPhone(phoneNumber);
      
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Usuário não encontrado',
        error: error.message
      });
    }
  }

  /**
   * Listar todos os usuários com paginação (apenas admin)
   * GET /api/users
   */
  static async getAllUsers(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const isActive = req.query.isActive !== undefined 
        ? req.query.isActive === 'true' 
        : undefined;

      const result = await UserService.getAllUsers(page, limit, isActive);
      
      return res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuários',
        error: error.message
      });
    }
  }

  /**
   * Atualizar usuário (apenas próprio usuário)
   * PUT /api/users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<any>  {
    try {
      const userId = req.clerkPayload?.sub;
      const updateData: UpdateUserData = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await UserService.updateUser(userId, updateData);
      await clerkClient.users.updateUserMetadata(userId, {
        unsafeMetadata: {
          deliveryAddresses: updateData.deliveryAddresses,
          isActive: updateData.isActive
        }
      })
      
      return res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar usuário',
        error: error.message
      });
    }
  }

  /**
   * Deletar usuário (soft delete) - apenas próprio usuário
   * DELETE /api/users/:id
   */
  static async deleteUser(req: Request, res: Response): Promise<any>  {
    try {
      const userId = req.clerkPayload?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await UserService.deleteUser(userId);
      
      return res.status(200).json({
        success: true,
        message: 'Usuário desativado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao deletar usuário',
        error: error.message
      });
    }
  }

  /**
   * Adicionar endereço de entrega (apenas próprio usuário)
   * POST /api/users/addresses
   */
  static async addDeliveryAddress(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      const addressData: AddAddressData = req.body;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validações do endereço
      if (!addressData.tipoVia || !addressData.nomeVia || !addressData.numero) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de via, nome da via e número são obrigatórios'
        });
      }

      const user = await UserService.addDeliveryAddress(authenticatedUserId, addressData);
      
      return res.status(200).json({
        success: true,
        message: 'Endereço adicionado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar endereço',
        error: error.message
      });
    }
  }

  /**
   * Atualizar endereço de entrega (apenas próprio usuário)
   * PUT /api/users/addresses/:addressIndex
   */
  static async updateDeliveryAddress(req: Request, res: Response): Promise<any>  {
    try {
      const { addressIndex } = req.params;
      const authenticatedUserId = req.clerkPayload?.sub;
      const addressData: AddAddressData = req.body;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (addressIndex === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Índice do endereço é obrigatório'
        });
      }

      const index = parseInt(addressIndex);
      if (isNaN(index) || index < 0) {
        return res.status(400).json({
          success: false,
          message: 'Índice do endereço deve ser um número válido'
        });
      }

      const user = await UserService.updateDeliveryAddress(authenticatedUserId, index, addressData);
      
      return res.status(200).json({
        success: true,
        message: 'Endereço atualizado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar endereço',
        error: error.message
      });
    }
  }

  /**
   * Remover endereço de entrega (apenas próprio usuário)
   * DELETE /api/users/addresses/:addressIndex
   */
  static async removeDeliveryAddress(req: Request, res: Response): Promise<any>  {
    try {
      const { addressIndex } = req.params;
      const authenticatedUserId = req.clerkPayload?.sub;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (addressIndex === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Índice do endereço é obrigatório'
        });
      }

      const index = parseInt(addressIndex);
      if (isNaN(index) || index < 0) {
        return res.status(400).json({
          success: false,
          message: 'Índice do endereço deve ser um número válido'
        });
      }

      const user = await UserService.removeDeliveryAddress(authenticatedUserId, index);
      
      return res.status(200).json({
        success: true,
        message: 'Endereço removido com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao remover endereço',
        error: error.message
      });
    }
  }

  /**
   * Adicionar método de pagamento (apenas próprio usuário)
   * POST /api/users/payment-methods
   */
  static async addPaymentMethod(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      const { paymentMethod } = req.body;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Método de pagamento é obrigatório'
        });
      }

      const user = await UserService.addPaymentMethod(authenticatedUserId, paymentMethod);
      
      return res.status(200).json({
        success: true,
        message: 'Método de pagamento adicionado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar método de pagamento',
        error: error.message
      });
    }
  }

  /**
   * Remover método de pagamento (apenas próprio usuário)
   * DELETE /api/users/payment-methods/:paymentMethod
   */
  static async removePaymentMethod(req: Request, res: Response): Promise<any>  {
    try {
      const { paymentMethod } = req.params;
      const authenticatedUserId = req.clerkPayload?.sub;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Método de pagamento é obrigatório'
        });
      }

      const user = await UserService.removePaymentMethod(authenticatedUserId, paymentMethod);
      
      return res.status(200).json({
        success: true,
        message: 'Método de pagamento removido com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao remover método de pagamento',
        error: error.message
      });
    }
  }

  /**
   * Adicionar pontos de fidelidade (apenas próprio usuário)
   * POST /api/users/loyalty-points
   */
  static async addLoyaltyPoints(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      const { points } = req.body;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (points === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Pontos são obrigatórios'
        });
      }

      const pointsNumber = parseInt(points);
      if (isNaN(pointsNumber) || pointsNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pontos devem ser um número positivo'
        });
      }

      const user = await UserService.addLoyaltyPoints(authenticatedUserId, pointsNumber);
      
      return res.status(200).json({
        success: true,
        message: 'Pontos de fidelidade adicionados com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar pontos de fidelidade',
        error: error.message
      });
    }
  }

  /**
   * Usar pontos de fidelidade (apenas próprio usuário)
   * POST /api/users/loyalty-points/use
   */
  static async useLoyaltyPoints(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      const { points } = req.body;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (points === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Pontos são obrigatórios'
        });
      }

      const pointsNumber = parseInt(points);
      if (isNaN(pointsNumber) || pointsNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pontos devem ser um número positivo'
        });
      }

      const user = await UserService.useLoyaltyPoints(authenticatedUserId, pointsNumber);
      
      return res.status(200).json({
        success: true,
        message: 'Pontos de fidelidade utilizados com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao usar pontos de fidelidade',
        error: error.message
      });
    }
  }

  /**
   * Obter histórico de pedidos do usuário autenticado
   * GET /api/users/orders
   */
  static async getUserOrderHistory(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = await UserService.getUserOrderHistory(authenticatedUserId, page, limit);
      
      return res.status(200).json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao buscar histórico de pedidos',
        error: error.message
      });
    }
  }

  /**
   * Obter estatísticas dos usuários (apenas admin)
   * GET /api/users/stats
   */
  static async getUserStats(req: Request, res: Response): Promise<any>  {
    try {
      const authenticatedUserId = req.clerkPayload?.sub;
      
      if (!authenticatedUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await UserService.getUserStats();
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: error.message
      });
    }
  }

  /**
   * Verificar se usuário existe
   * GET /api/users/exists/:phoneNumber
   */
  static async checkUserExists(req: Request, res: Response): Promise<any>  {
    try {
      const { phoneNumber } = req.params;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone é obrigatório'
        });
      }

      const exists = await UserService.userExists(phoneNumber);
      
      return res.status(200).json({
        success: true,
        data: { exists }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar existência do usuário',
        error: error.message
      });
    }
  }

  /**
   * Ativar/Desativar usuário (apenas admin)
   * PATCH /api/users/:id/toggle-status
   */
  static async toggleUserStatus(req: Request, res: Response): Promise<any>  {
    try {
      const userId = req.clerkPayload?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await UserService.toggleUserStatus(userId);
      
      return res.status(200).json({
        success: true,
        message: `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao alterar status do usuário',
        error: error.message
      });
    }
  }

  /**
   * Obter perfil do usuário autenticado
   * GET /api/users/profile
   */
  static async getProfile(req: Request, res: Response): Promise<any>  {
    try {
      const userId = req.clerkPayload?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await clerkClient.users.getUser(userId);
      console.log(user)
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Perfil não encontrado',
        error: error.message
      });
    }
  }

  /**
   * Atualizar perfil do usuário autenticado
   * PUT /api/users/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<any>  {
    try {
      const userId = req.clerkPayload?.sub;
      const updateData: UpdateUserData = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await UserService.updateUser(userId, updateData);
      
      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: user
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar perfil',
        error: error.message
      });
    }
  }
} 



