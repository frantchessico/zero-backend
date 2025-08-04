import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { Delivery } from '../models/Delivery';
import { logger } from '../utils/logger';

/**
 * Middleware para sincronizar status do Order com Delivery
 */
export const syncOrderDeliveryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Mapeamento de status entre Order e Delivery
    const statusMapping = {
      'pending': 'pending',
      'confirmed': 'pending',
      'preparing': 'pending',
      'ready': 'picked_up',
      'out_for_delivery': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'failed'
    };

    // Se estamos atualizando um Order
    if (orderId && status && statusMapping[status as keyof typeof statusMapping]) {
      const deliveryStatus = statusMapping[status as keyof typeof statusMapping];
      
      // Atualizar Delivery status automaticamente
      await Delivery.findOneAndUpdate(
        { order: orderId },
        { 
          status: deliveryStatus,
          ...(deliveryStatus === 'delivered' && { actualDeliveryTime: new Date() }),
          ...(deliveryStatus === 'picked_up' && { estimatedTime: new Date(Date.now() + 30 * 60 * 1000) }) // +30 min
        },
        { new: true }
      );

      logger.info(`Order ${orderId} status synced to delivery: ${status} → ${deliveryStatus}`);
    }

    next();
  } catch (error) {
    logger.error('Error syncing order-delivery status:', error);
    next(error);
  }
};

/**
 * Middleware para sincronizar status do Delivery com Order
 */
export const syncDeliveryOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;

    // Mapeamento reverso de status entre Delivery e Order
    const statusMapping = {
      'picked_up': 'ready',
      'in_transit': 'out_for_delivery',
      'delivered': 'delivered',
      'failed': 'cancelled'
    };

    // Se estamos atualizando um Delivery
    if (deliveryId && status && statusMapping[status as keyof typeof statusMapping]) {
      const orderStatus = statusMapping[status as keyof typeof statusMapping];
      
      // Buscar o delivery para obter o orderId
      const delivery = await Delivery.findById(deliveryId);
      if (delivery) {
        // Atualizar Order status automaticamente
        await Order.findByIdAndUpdate(
          delivery.order,
          { 
            status: orderStatus,
            ...(orderStatus === 'delivered' && { actualDeliveryTime: new Date() })
          },
          { new: true }
        );

        logger.info(`Delivery ${deliveryId} status synced to order: ${status} → ${orderStatus}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Error syncing delivery-order status:', error);
    next(error);
  }
};

/**
 * Middleware para validar consistência de status
 */
export const validateStatusConsistency = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    
    if (orderId) {
      const order = await Order.findById(orderId);
      const delivery = await Delivery.findOne({ order: orderId });

      if (order && delivery) {
        // Validar se os status estão consistentes
        const validCombinations = [
          { order: 'pending', delivery: 'pending' },
          { order: 'confirmed', delivery: 'pending' },
          { order: 'preparing', delivery: 'pending' },
          { order: 'ready', delivery: 'picked_up' },
          { order: 'out_for_delivery', delivery: 'in_transit' },
          { order: 'delivered', delivery: 'delivered' },
          { order: 'cancelled', delivery: 'failed' }
        ];

        const isValid = validCombinations.some(combo => 
          combo.order === order.status && combo.delivery === delivery.status
        );

        if (!isValid) {
          logger.warn(`Status inconsistency detected: Order ${order.status}, Delivery ${delivery.status}`);
          return res.status(400).json({
            success: false,
            message: 'Status inconsistency detected between order and delivery'
          });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Error validating status consistency:', error);
    next(error);
  }
}; 