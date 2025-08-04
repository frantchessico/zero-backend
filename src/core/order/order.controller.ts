import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { QueryService } from '../audit/query.service';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * POST /orders - Criar novo pedido
   */
  createOrder = async (req: Request, res: Response): Promise<void> => {
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

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const orderData = {
        ...req.body,
        customer: user._id // Usar ID do usuário encontrado no banco
      };

      // Validações básicas
      if (!orderData.vendor || !orderData.items || orderData.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'vendor e items são obrigatórios'
        });
        return;
      }

      const order = await this.orderService.createOrder(orderData);

      // Buscar order com relacionamentos para resposta
      const orderWithRelations = await QueryService.getOrderWithRelations(order._id?.toString() || '');

      res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: orderWithRelations
      });
    } catch (error: any) {
      logger.error('Error creating order:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar pedido'
      });
    }
  };

  /**
   * GET /orders - Listar pedidos do usuário
   */
  getUserOrders = async (req: Request, res: Response): Promise<void> => {
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

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const userId = user._id;
      const { status, page = 1, limit = 10 } = req.query;

      const options = {
        status: status as string,
        sort: { createdAt: -1 },
        limit: parseInt(limit as string),
        skip: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const orders = await QueryService.getUserOrders(userId.toString(), options);

      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          currentPage: parseInt(page as string),
          itemsPerPage: parseInt(limit as string),
          totalItems: orders.length // Em produção, usar count separado
        }
      });
    } catch (error: any) {
      logger.error('Error fetching user orders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar pedidos'
      });
    }
  };

  /**
   * GET /orders/:orderId - Buscar pedido específico
   */
  getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      const order = await QueryService.getOrderWithRelations(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error: any) {
      logger.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar pedido'
      });
    }
  };

  /**
   * PUT /orders/:orderId - Atualizar pedido
   */
  updateOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const updateData = req.body;

      // Usar updateOrderStatus se for atualização de status
      if (updateData.status) {
        const order = await this.orderService.updateOrderStatus(orderId, updateData.status);
        
        if (!order) {
          res.status(404).json({
            success: false,
            message: 'Pedido não encontrado'
          });
          return;
        }

        // Buscar order atualizado com relacionamentos
        const orderWithRelations = await QueryService.getOrderWithRelations(orderId);

        res.status(200).json({
          success: true,
          message: 'Pedido atualizado com sucesso',
          data: orderWithRelations
        });
        return;
      }

      // Para outras atualizações, usar métodos específicos
      res.status(400).json({
        success: false,
        message: 'Método de atualização não suportado'
      });
    } catch (error: any) {
      logger.error('Error updating order:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar pedido'
      });
    }
  };

  /**
   * PATCH /orders/:orderId/status - Atualizar status do pedido
   */
  updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status é obrigatório'
        });
        return;
      }

      const order = await this.orderService.updateOrderStatus(orderId, status);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      // Buscar order atualizado com relacionamentos
      const orderWithRelations = await QueryService.getOrderWithRelations(orderId);

      res.status(200).json({
        success: true,
        message: 'Status do pedido atualizado com sucesso',
        data: orderWithRelations
      });
    } catch (error: any) {
      logger.error('Error updating order status:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar status do pedido'
      });
    }
  };

  /**
   * DELETE /orders/:orderId - Cancelar pedido
   */
  cancelOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      const order = await this.orderService.cancelOrder(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Pedido cancelado com sucesso'
      });
    } catch (error: any) {
      logger.error('Error canceling order:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao cancelar pedido'
      });
    }
  };

  /**
   * GET /orders/vendor/orders - Listar pedidos do vendor
   */
  getVendorOrders = async (req: Request, res: Response): Promise<void> => {
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

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const vendorId = user.vendorId; // Assumindo que vendor tem vendorId
      
      if (!vendorId) {
        res.status(403).json({
          success: false,
          message: 'Usuário não é um vendor válido'
        });
        return;
      }

      const vendorIdString = vendorId.toString();
      const { status, page = 1, limit = 10 } = req.query;

      const orders = await this.orderService.getOrdersByVendor(
        vendorIdString,
        parseInt(page as string),
        parseInt(limit as string),
        status as string
      );

      res.status(200).json({
        success: true,
        data: orders.orders,
        pagination: {
          currentPage: parseInt(page as string),
          itemsPerPage: parseInt(limit as string),
          totalItems: orders.total,
          totalPages: orders.totalPages
        }
      });
    } catch (error: any) {
      logger.error('Error fetching vendor orders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar pedidos do vendor'
      });
    }
  };

  /**
   * PATCH /orders/:orderId/vendor/status - Vendor atualizar status
   */
  updateVendorOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status é obrigatório'
        });
        return;
      }

      const order = await this.orderService.updateOrderStatus(orderId, status);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      // Buscar order atualizado com relacionamentos
      const orderWithRelations = await QueryService.getOrderWithRelations(orderId);

      res.status(200).json({
        success: true,
        message: 'Status do pedido atualizado com sucesso',
        data: orderWithRelations
      });
    } catch (error: any) {
      logger.error('Error updating vendor order status:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao atualizar status do pedido'
      });
    }
  };

  /**
   * GET /orders/history/orders - Histórico de pedidos
   */
  getOrderHistory = async (req: Request, res: Response): Promise<void> => {
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

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const userId = user._id;
      const { page = 1, limit = 10 } = req.query;

      const options = {
        sort: { createdAt: -1 },
        limit: parseInt(limit as string),
        skip: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const orders = await QueryService.getUserOrders(userId.toString(), options);

      res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          currentPage: parseInt(page as string),
          itemsPerPage: parseInt(limit as string),
          totalItems: orders.length
        }
      });
    } catch (error: any) {
      logger.error('Error fetching order history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar histórico de pedidos'
      });
    }
  };

  /**
   * GET /orders/stats/orders - Estatísticas de pedidos
   */
  getOrderStats = async (req: Request, res: Response): Promise<void> => {
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

      const user = await User.findOne({ clerkId });
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
        return;
      }

      const userId = user._id;
      const { vendorId, startDate, endDate } = req.query;

      const stats = await this.orderService.getOrderStatistics(
        vendorId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching order stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas de pedidos'
      });
    }
  };

  /**
   * POST /orders/:orderId/payment - Processar pagamento
   */
  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { paymentStatus } = req.body;

      if (!paymentStatus) {
        res.status(400).json({
          success: false,
          message: 'Status do pagamento é obrigatório'
        });
        return;
      }

      const order = await this.orderService.updatePaymentStatus(orderId, paymentStatus);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Status do pagamento atualizado com sucesso',
        data: order
      });
    } catch (error: any) {
      logger.error('Error processing payment:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao processar pagamento'
      });
    }
  };

  /**
   * GET /orders/:orderId/payment - Verificar status do pagamento
   */
  getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      const order = await this.orderService.getOrderById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          orderId: order._id,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          total: order.total
        }
      });
    } catch (error: any) {
      logger.error('Error fetching payment status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar status do pagamento'
      });
    }
  };

  /**
   * POST /orders/:orderId/delivery - Criar entrega
   */
  createDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const deliveryData = req.body;

      // Verificar se o pedido existe
      const order = await this.orderService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      // Atualizar status do pedido para 'out_for_delivery'
      const updatedOrder = await this.orderService.updateOrderStatus(orderId, 'out_for_delivery');

      res.status(201).json({
        success: true,
        message: 'Entrega criada com sucesso',
        data: updatedOrder
      });
    } catch (error: any) {
      logger.error('Error creating delivery:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao criar entrega'
      });
    }
  };

  /**
   * GET /orders/:orderId/delivery - Verificar status da entrega
   */
  getDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      const delivery = await QueryService.getDeliveryWithRelations(orderId);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Entrega não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: delivery
      });
    } catch (error: any) {
      logger.error('Error fetching delivery status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar status da entrega'
      });
    }
  };

  /**
   * POST /orders/:orderId/notifications - Enviar notificação
   */
  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { message, type } = req.body;

      if (!message || !type) {
        res.status(400).json({
          success: false,
          message: 'Mensagem e tipo são obrigatórios'
        });
        return;
      }

      // Verificar se o pedido existe
      const order = await this.orderService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notificação enviada com sucesso',
        data: {
          orderId,
          message,
          type,
          sentAt: new Date()
        }
      });
    } catch (error: any) {
      logger.error('Error sending notification:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao enviar notificação'
      });
    }
  };

  /**
   * GET /orders/:orderId/notifications - Listar notificações
   */
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      // Verificar se o pedido existe
      const order = await this.orderService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      // Retornar notificações mock (em produção, buscar do banco)
      res.status(200).json({
        success: true,
        data: [
          {
            id: '1',
            orderId,
            type: 'order_status',
            message: 'Pedido confirmado',
            sentAt: new Date()
          }
        ]
      });
    } catch (error: any) {
      logger.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar notificações'
      });
    }
  };
}