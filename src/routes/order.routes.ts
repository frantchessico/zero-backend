import { Router } from 'express';
import { OrderController } from '../core/order/order.controller';
import { AuthGuard } from '../guards/auth.guard';
import { 
  logAction
} from '../middleware/auth.middleware';

const router = Router();
const orderController = new OrderController();



// ===== ROTAS DE CRIAÇÃO E BUSCA =====

// POST /orders - Criar novo pedido (apenas customers)
router.post('/', 
  AuthGuard,
  logAction('CREATE_ORDER'),
  orderController.createOrder
);

// GET /orders - Listar pedidos do usuário
router.get('/', 
  AuthGuard,
  logAction('LIST_ORDERS'),
  orderController.getUserOrders
);

// GET /orders/:orderId - Buscar pedido específico
router.get('/:orderId', 
  AuthGuard,
  logAction('GET_ORDER'),
  orderController.getOrderById
);

// ===== ROTAS DE ATUALIZAÇÃO =====

// PUT /orders/:orderId - Atualizar pedido
router.put('/:orderId', 
  AuthGuard,
  logAction('UPDATE_ORDER'),
  orderController.updateOrder
);

// PATCH /orders/:orderId/status - Atualizar status do pedido
router.patch('/:orderId/status', 
  AuthGuard,
  logAction('UPDATE_ORDER_STATUS'),
  orderController.updateOrderStatus
);

// ===== ROTAS DE CANCELAMENTO =====

// DELETE /orders/:orderId - Cancelar pedido
router.delete('/:orderId', 
  AuthGuard,
  logAction('CANCEL_ORDER'),
  orderController.cancelOrder
);

// ===== ROTAS DE VENDOR =====

// GET /orders/vendor - Listar pedidos do vendor (apenas vendors)
router.get('/vendor/orders', 
  AuthGuard,
  logAction('LIST_VENDOR_ORDERS'),
  orderController.getVendorOrders
);

// PATCH /orders/:orderId/vendor/status - Vendor atualizar status
router.patch('/:orderId/vendor/status', 
  AuthGuard,
  logAction('UPDATE_VENDOR_ORDER_STATUS'),
  orderController.updateVendorOrderStatus
);

// ===== ROTAS DE HISTÓRICO =====

// GET /orders/history - Histórico de pedidos
router.get('/history/orders', 
  AuthGuard,
  logAction('GET_ORDER_HISTORY'),
  orderController.getOrderHistory
);

// GET /orders/stats - Estatísticas de pedidos
router.get('/stats/orders', 
  AuthGuard,
  logAction('GET_ORDER_STATS'),
  orderController.getOrderStats
);

// ===== ROTAS DE PAGAMENTO =====

// POST /orders/:orderId/payment - Processar pagamento
router.post('/:orderId/payment', 
  AuthGuard,
  logAction('PROCESS_PAYMENT'),
  orderController.processPayment
);

// GET /orders/:orderId/payment - Verificar status do pagamento
router.get('/:orderId/payment', 
  AuthGuard,
  logAction('GET_PAYMENT_STATUS'),
  orderController.getPaymentStatus
);

// ===== ROTAS DE ENTREGA =====

// POST /orders/:orderId/delivery - Criar entrega
router.post('/:orderId/delivery', 
  AuthGuard,
  logAction('CREATE_DELIVERY'),
  orderController.createDelivery
);

// GET /orders/:orderId/delivery - Verificar status da entrega
router.get('/:orderId/delivery', 
  AuthGuard,
  logAction('GET_DELIVERY_STATUS'),
  orderController.getDeliveryStatus
);

// ===== ROTAS DE NOTIFICAÇÕES =====

// POST /orders/:orderId/notifications - Enviar notificação
router.post('/:orderId/notifications', 
  AuthGuard,
  logAction('SEND_NOTIFICATION'),
  orderController.sendNotification
);

// GET /orders/:orderId/notifications - Listar notificações
router.get('/:orderId/notifications', 
  AuthGuard,
  logAction('GET_NOTIFICATIONS'),
  orderController.getNotifications
);

export default router; 