import { Request, Response } from 'express';
import { UserService } from './user.service';
import { User } from '../../models/User';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * GET /users/profile - Buscar perfil do usuário autenticado
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    console.log('CHEGOU =>',req.clerkPayload?.sub)
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ userId: clerkId });
      console.log('USER =>',user)  
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar perfil'
      });
    }
  };

  /**
   * PUT /users/profile - Atualizar perfil do usuário autenticado
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // Buscar usuário pelo clerkId
      const clerkId = req.clerkPayload?.sub;
      if (!clerkId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const user = await User.findOne({ userId: clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const updateData = req.body;
      const updatedUser = await this.userService.updateUser(clerkId, updateData);

      res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedUser
      });
    } catch (error: any) {
      logger.error('Error updating user profile:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar perfil'
      });
    }
  };

  /**
   * POST /users - Criar novo usuário
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = req.body;

      // Validações básicas
      if (!userData.userId || !userData.role) {
        res.status(400).json({
          success: false,
          message: 'userId e role são obrigatórios'
        });
        return;
      }

      const user = await this.userService.createUser(userData);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar usuário'
      });
    }
  };

  /**
   * GET /users/:userId - Buscar usuário por ID
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = await this.userService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar usuário'
      });
    }
  };

  /**
   * GET /users/email/:email - Buscar usuário por email
   */
  getUserByEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      const user = await this.userService.getUserByEmail(email);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar usuário'
      });
    }
  };

  /**
   * GET /users/phone/:phoneNumber - Buscar usuário por telefone
   */
  getUserByPhone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber } = req.params;
      const user = await this.userService.getUserByPhone(phoneNumber);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar usuário'
      });
    }
  };

  /**
   * GET /users - Listar todos os usuários com paginação
   */
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.userService.getAllUsers(page, limit);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao listar usuários'
      });
    }
  };

  /**
   * GET /users/role/:role - Buscar usuários por role
   */
  getUsersByRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = req.params;

      if (!['customer', 'driver', 'vendor'].includes(role)) {
        res.status(400).json({
          success: false,
          message: 'Role inválido. Use: customer, driver ou vendor'
        });
        return;
      }

      const users = await this.userService.getUsersByRole(role as any);

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar usuários'
      });
    }
  };

  /**
   * PUT /users/:userId - Atualizar usuário
   */
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Remover campos que não devem ser atualizados diretamente
      delete updateData.userId;
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      const user = await this.userService.updateUser(userId, updateData);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar usuário'
      });
    }
  };

  /**
   * DELETE /users/:userId - Desativar usuário
   */
  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await this.userService.deactivateUser(userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Usuário desativado com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao desativar usuário'
      });
    }
  };

  /**
   * PATCH /users/:userId/reactivate - Reativar usuário
   */
  reactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await this.userService.reactivateUser(userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Usuário reativado com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao reativar usuário'
      });
    }
  };

  /**
   * POST /users/:userId/addresses - Adicionar endereço de entrega
   */
  addDeliveryAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const address = req.body;

      const user = await this.userService.addDeliveryAddress(userId, address);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Endereço adicionado com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar endereço'
      });
    }
  };

  /**
   * DELETE /users/:userId/addresses/:addressId - Remover endereço
   */
  removeDeliveryAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, addressId } = req.params;

      const user = await this.userService.removeDeliveryAddress(userId, addressId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Endereço removido com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao remover endereço'
      });
    }
  };

  /**
   * PUT /users/:userId/addresses/:addressId - Atualizar endereço
   */
  updateDeliveryAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, addressId } = req.params;
      const addressData = req.body;

      const user = await this.userService.updateDeliveryAddress(userId, addressId, addressData);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário ou endereço não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Endereço atualizado com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar endereço'
      });
    }
  };

  /**
   * POST /users/:userId/payment-methods - Adicionar método de pagamento
   */
  addPaymentMethod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { paymentMethod } = req.body;

      if (!['visa', 'm-pesa', 'cash', 'paypal'].includes(paymentMethod)) {
        res.status(400).json({
          success: false,
          message: 'Método de pagamento inválido'
        });
        return;
      }

      const user = await this.userService.addPaymentMethod(userId, paymentMethod);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Método de pagamento adicionado com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar método de pagamento'
      });
    }
  };

  /**
   * DELETE /users/:userId/payment-methods/:paymentMethod - Remover método de pagamento
   */
  removePaymentMethod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, paymentMethod } = req.params;

      const user = await this.userService.removePaymentMethod(userId, paymentMethod);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Método de pagamento removido com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao remover método de pagamento'
      });
    }
  };

  /**
   * POST /users/:userId/loyalty-points/add - Adicionar pontos de fidelidade
   */
  addLoyaltyPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { points } = req.body;

      if (!points || points <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantidade de pontos deve ser maior que zero'
        });
        return;
      }

      const user = await this.userService.addLoyaltyPoints(userId, points);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Pontos adicionados com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar pontos'
      });
    }
  };

  /**
   * POST /users/:userId/loyalty-points/use - Usar pontos de fidelidade
   */
  useLoyaltyPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { points } = req.body;

      if (!points || points <= 0) {
        res.status(400).json({
          success: false,
          message: 'Quantidade de pontos deve ser maior que zero'
        });
        return;
      }

      const user = await this.userService.useLoyaltyPoints(userId, points);

      res.status(200).json({
        success: true,
        message: 'Pontos utilizados com sucesso',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao usar pontos'
      });
    }
  };

  /**
   * POST /users/:userId/orders - Adicionar pedido ao histórico
   */
  addOrderToHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { orderId } = req.body;

      if (!Types.ObjectId.isValid(orderId)) {
        res.status(400).json({
          success: false,
          message: 'ID do pedido inválido'
        });
        return;
      }

      const user = await this.userService.addOrderToHistory(userId, new Types.ObjectId(orderId));

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Pedido adicionado ao histórico',
        data: user
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao adicionar pedido'
      });
    }
  };

  /**
   * GET /users/:userId/orders - Buscar histórico de pedidos
   */
  getUserOrderHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const orders = await this.userService.getUserOrderHistory(userId);

      res.status(200).json({
        success: true,
        data: orders
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar histórico'
      });
    }
  };

  /**
   * GET /users/stats/by-role - Estatísticas por role
   */
  getUserStatsByRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.userService.countUsersByRole();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas'
      });
    }
  };

  /**
   * GET /users/top-loyalty - Top usuários por pontos de fidelidade
   */
  getTopLoyaltyUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const users = await this.userService.getTopLoyaltyUsers(limit);

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar top usuários'
      });
    }
  };

  /**
   * GET /users/:userId/exists - Verificar se usuário existe
   */
  checkUserExists = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const exists = await this.userService.userExists(userId);

      res.status(200).json({
        success: true,
        data: { exists }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao verificar usuário'
      });
    }
  };
}