import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * GET /notifications/my-notifications - Buscar notificações do usuário autenticado
   */
  getMyNotifications = async (req: Request, res: Response): Promise<void> => {
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

      const { page = 1, limit = 10, unreadOnly = false } = req.query;

      const notifications = await this.notificationService.getUserNotifications(
        user._id.toString(),
        parseInt(page as string),
        parseInt(limit as string),
        unreadOnly === 'true'
      );

      res.status(200).json({
        success: true,
        data: notifications.notifications,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: notifications.totalPages,
          totalItems: notifications.total,
          itemsPerPage: parseInt(limit as string)
        }
      });
    } catch (error: any) {
      logger.error('Error fetching my notifications:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar notificações'
      });
    }
  };

  /**
   * PATCH /notifications/my-notifications/:id/read - Marcar notificação como lida
   */
  markMyNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
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

      const { id } = req.params;

      const notification = await this.notificationService.markAsRead(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notificação não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notificação marcada como lida',
        data: notification
      });
    } catch (error: any) {
      logger.error('Error marking notification as read:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao marcar notificação como lida'
      });
    }
  };

  /**
   * PATCH /notifications/my-notifications/mark-all-read - Marcar todas como lidas
   */
  markAllMyNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.notificationService.markAllAsRead(user._id.toString());

      res.status(200).json({
        success: true,
        message: 'Todas as notificações marcadas como lidas',
        data: {
          updatedCount: result
        }
      });
    } catch (error: any) {
      logger.error('Error marking all notifications as read:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao marcar notificações como lidas'
      });
    }
  };

  // POST /notifications/vendor/new-order - Notificar vendor sobre novo pedido
  notifyVendorNewOrder = async (req: Request, res: Response): Promise<any> => {
    try {
      const { vendorId, orderId } = req.body;

      if (!vendorId || !orderId) {
        return res.status(400).json({
          success: false,
          message: 'VendorId e orderId são obrigatórios'
        });
      }

      await this.notificationService.notifyVendorNewOrder(vendorId, orderId);

      res.status(200).json({
        success: true,
        message: 'Vendor notificado sobre novo pedido'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // POST /notifications/drivers/order-ready - Notificar drivers sobre pedido pronto
  notifyDriversOrderReady = async (req: Request, res: Response): Promise<any> => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'OrderId é obrigatório'
        });
      }

      await this.notificationService.notifyDriversOrderReady(orderId);

      res.status(200).json({
        success: true,
        message: 'Drivers notificados sobre pedido pronto'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // POST /notifications/driver/assigned - Notificar driver sobre atribuição
  notifyDriverAssigned = async (req: Request, res: Response): Promise<any> => {
    try {
      const { driverId, orderId } = req.body;

      if (!driverId || !orderId) {
        return res.status(400).json({
          success: false,
          message: 'DriverId e orderId são obrigatórios'
        });
      }

      await this.notificationService.notifyDriverAssigned(driverId, orderId);

      res.status(200).json({
        success: true,
        message: 'Driver notificado sobre atribuição de entrega'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // POST /notifications/customer/order-status - Notificar cliente sobre status
  notifyCustomerOrderStatus = async (req: Request, res: Response): Promise<any> => {
    try {
      const { customerId, orderId, status } = req.body;

      if (!customerId || !orderId || !status) {
        return res.status(400).json({
          success: false,
          message: 'CustomerId, orderId e status são obrigatórios'
        });
      }

      const validStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido'
        });
      }

      await this.notificationService.notifyCustomerOrderStatus(customerId, orderId, status);

      res.status(200).json({
        success: true,
        message: 'Cliente notificado sobre mudança de status'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // POST /notifications/drivers/nearby - Notificar drivers próximos
  notifyNearbyDrivers = async (req: Request, res: Response): Promise<any> => {
    try {
      const { latitude, longitude, orderId, radiusInKm = 10 } = req.body;

      if (!latitude || !longitude || !orderId) {
        return res.status(400).json({
          success: false,
          message: 'Latitude, longitude e orderId são obrigatórios'
        });
      }

      await this.notificationService.notifyNearbyDrivers(
        latitude, 
        longitude, 
        orderId, 
        radiusInKm
      );

      res.status(200).json({
        success: true,
        message: 'Drivers próximos notificados'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // POST /notifications/promotional - Enviar notificação promocional
  sendPromotionalNotification = async (req: Request, res: Response): Promise<any> => {
    try {
      const { userIds, message } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !message) {
        return res.status(400).json({
          success: false,
          message: 'UserIds (array) e message são obrigatórios'
        });
      }

      const count = await this.notificationService.sendPromotionalNotification(userIds, message);

      res.status(200).json({
        success: true,
        message: `Notificação promocional enviada para ${count} usuários`,
        data: { sentCount: count }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // GET /notifications/user/:userId - Buscar notificações do usuário
  getUserNotifications = async (req: Request, res: Response): Promise<any> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'UserId é obrigatório'
        });
      }

      const result = await this.notificationService.getUserNotifications(
        userId, 
        page, 
        limit, 
        unreadOnly
      );

      res.status(200).json({
        success: true,
        message: 'Notificações encontradas',
        data: result
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // GET /notifications/stats/:userId - Obter estatísticas de notificações
  getNotificationStats = async (req: Request, res: Response): Promise<any> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'UserId é obrigatório'
        });
      }

      const stats = await this.notificationService.getNotificationStats(userId);

      res.status(200).json({
        success: true,
        message: 'Estatísticas de notificações',
        data: stats
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // PATCH /notifications/:id/read - Marcar notificação como lida
  markAsRead = async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da notificação é obrigatório'
        });
      }

      const notification = await this.notificationService.markAsRead(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificação não encontrada'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notificação marcada como lida',
        data: notification
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // PATCH /notifications/user/:userId/read-all - Marcar todas como lidas
  markAllAsRead = async (req: Request, res: Response): Promise<any> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'UserId é obrigatório'
        });
      }

      const modifiedCount = await this.notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: `${modifiedCount} notificações marcadas como lidas`,
        data: { modifiedCount }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // DELETE /notifications/:id - Deletar notificação
  deleteNotification = async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID da notificação é obrigatório'
        });
      }

      const deleted = await this.notificationService.deleteNotification(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Notificação não encontrada'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notificação deletada com sucesso'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // DELETE /notifications/old - Deletar notificações antigas
  deleteOldNotifications = async (req: Request, res: Response): Promise<any> => {
    try {
      const deletedCount = await this.notificationService.deleteOldNotifications();

      res.status(200).json({
        success: true,
        message: `${deletedCount} notificações antigas foram deletadas`,
        data: { deletedCount }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // GET /notifications/drivers/nearby - Buscar drivers próximos
  findNearbyDrivers = async (req: Request, res: Response): Promise<any> => {
    try {
      const { latitude, longitude, radiusInKm = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude e longitude são obrigatórios'
        });
      }

      const drivers = await this.notificationService.findNearbyDrivers(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseInt(radiusInKm as string)
      );

      res.status(200).json({
        success: true,
        message: `${drivers.length} drivers encontrados na área`,
        data: drivers
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };

  // POST /notifications/create - Criar notificação manual
  createNotification = async (req: Request, res: Response): Promise<any> => {
    try {
      const { userId, type, message } = req.body;

      if (!userId || !type || !message) {
        return res.status(400).json({
          success: false,
          message: 'UserId, type e message são obrigatórios'
        });
      }

      const validTypes = ['order_status', 'delivery_update', 'promotion'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de notificação inválido'
        });
      }

      const notification = await this.notificationService.createNotification(userId, type, message);

      res.status(201).json({
        success: true,
        message: 'Notificação criada com sucesso',
        data: notification
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  };
}