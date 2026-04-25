import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { QueryService } from '../audit/query.service';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';
import { PaymentService } from '../payment/payment.service';
import { couponService } from '../coupon/coupon.service';
import { NotificationService } from '../notification/notification.service';
import deliveryService from '../delivery/delivery.service';
import { chatService } from '../chat/chat.service';
import { Delivery } from '../../models/Delivery';
import { Vendor } from '../../models/Vendor';

export class OrderController {
  private orderService: OrderService;
  private paymentService: PaymentService;
  private notificationService: NotificationService;

  constructor() {
    this.orderService = new OrderService();
    this.paymentService = new PaymentService();
    this.notificationService = new NotificationService();
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
      await chatService.syncOrderConversations(order._id?.toString() || '');

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
      const { phoneNumber, amount, paymentType, appPaymentOrigin, couponCode, idempotencyKey } = req.body;

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: 'phoneNumber é obrigatório para pagamento M-Pesa'
        });
        return;
      }

      // Buscar pedido para validar cupom e valor
      const order = await this.orderService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      let couponId: string | undefined;
      let discountAmount: number | undefined;

      // Aplicar cupom se informado
      if (couponCode) {
        const vendorId = typeof order.vendor === 'object' && order.vendor
          ? ((order.vendor as any)._id?.toString?.() || (order.vendor as any).toString?.())
          : String(order.vendor);

        const validation = await couponService.validateCoupon({
          code: couponCode,
          vendorId,
          paymentMethod: 'mpesa',
          orderTotal: order.subtotal,
          deliveryFee: order.deliveryFee
        });

        if (!validation.valid) {
          res.status(400).json({
            success: false,
            message: validation.reason || 'Cupom inválido'
          });
          return;
        }

        couponId = validation.couponId;
        discountAmount = validation.discountAmount;
        const repricedOrder = await this.orderService.applyCouponToOrder({
          orderId,
          couponId: validation.couponId || '',
          couponCode,
          discountAmount: validation.discountAmount || 0
        });

        if (!repricedOrder) {
          res.status(404).json({
            success: false,
            message: 'Pedido não encontrado'
          });
          return;
        }
      }

      const { mpesaResponse, paymentLog } = await this.paymentService.createMpesaPayment({
        orderId,
        phoneNumber,
        amount,
        paymentType,
        appPaymentOrigin,
        couponId,
        discountAmount,
        idempotencyKey
      });

      const finalStatus = (paymentLog?.status || 'pending') as 'pending' | 'paid' | 'failed' | 'refunded';

      const updatedOrder = await this.orderService.updatePaymentStatus(orderId, finalStatus);

      if (!updatedOrder) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      // Registrar uso do cupom se aplicável
      if (couponId && finalStatus === 'paid') {
        const registered = await couponService.registerUse(couponId);
        if (!registered) {
          logger.warn(`Coupon usage could not be registered for coupon ${couponId}`);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Pagamento processado com sucesso',
        data: {
          order: updatedOrder,
          payment: paymentLog,
          mpesa: mpesaResponse
        }
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
      const deliveryData = req.body || {};

      const createdDelivery = await deliveryService.createDelivery({
        orderId,
        driverId: deliveryData.driverId,
        estimatedTime: deliveryData.estimatedTime ? new Date(deliveryData.estimatedTime) : undefined
      });
      await chatService.syncOrderConversations(orderId);

      res.status(201).json({
        success: true,
        message: 'Entrega criada com sucesso',
        data: createdDelivery
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

      const deliveryRecord = await Delivery.findOne({ order: orderId }).select('_id').exec();
      if (!deliveryRecord) {
        res.status(404).json({
          success: false,
          message: 'Entrega não encontrada'
        });
        return;
      }

      const delivery = await QueryService.getDeliveryWithRelations(deliveryRecord._id.toString());

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
      const { message, type, recipient = 'customer' } = req.body;

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

      const notifications = [];

      if (recipient === 'customer' || recipient === 'both') {
        notifications.push(
          await this.notificationService.createNotification(
            String((order.customer as any)?._id || order.customer),
            type,
            message,
            { orderId }
          )
        );
      }

      if (recipient === 'vendor' || recipient === 'both') {
        const vendor = await Vendor.findById((order.vendor as any)?._id || order.vendor).exec();
        if (vendor?.owner) {
          notifications.push(
            await this.notificationService.createNotification(
              vendor.owner.toString(),
              type,
              message,
              { orderId }
            )
          );
        }
      }

      res.status(200).json({
        success: true,
        message: 'Notificação enviada com sucesso',
        data: notifications
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

      const notifications = await this.notificationService.getOrderNotifications(orderId);

      res.status(200).json({
        success: true,
        data: notifications
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
