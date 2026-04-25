"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../core/order/order.controller");
const auth_guard_1 = require("../guards/auth.guard");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const orderController = new order_controller_1.OrderController();
// ===== ROTAS DE CRIAÇÃO E BUSCA =====
// POST /orders - Criar novo pedido (apenas customers)
router.post('/', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('CREATE_ORDER'), orderController.createOrder);
// GET /orders - Listar pedidos do usuário
router.get('/', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('LIST_ORDERS'), orderController.getUserOrders);
// GET /orders/:orderId - Buscar pedido específico
router.get('/:orderId', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GET_ORDER'), orderController.getOrderById);
// ===== ROTAS DE ATUALIZAÇÃO =====
// PUT /orders/:orderId - Atualizar pedido
router.put('/:orderId', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('UPDATE_ORDER'), orderController.updateOrder);
// PATCH /orders/:orderId/status - Atualizar status do pedido
router.patch('/:orderId/status', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('UPDATE_ORDER_STATUS'), orderController.updateOrderStatus);
// ===== ROTAS DE CANCELAMENTO =====
// DELETE /orders/:orderId - Cancelar pedido
router.delete('/:orderId', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('CANCEL_ORDER'), orderController.cancelOrder);
// ===== ROTAS DE VENDOR =====
// GET /orders/vendor - Listar pedidos do vendor (apenas vendors)
router.get('/vendor/orders', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('LIST_VENDOR_ORDERS'), orderController.getVendorOrders);
// PATCH /orders/:orderId/vendor/status - Vendor atualizar status
router.patch('/:orderId/vendor/status', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('UPDATE_VENDOR_ORDER_STATUS'), orderController.updateVendorOrderStatus);
// ===== ROTAS DE HISTÓRICO =====
// GET /orders/history - Histórico de pedidos
router.get('/history/orders', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GET_ORDER_HISTORY'), orderController.getOrderHistory);
// GET /orders/stats - Estatísticas de pedidos
router.get('/stats/orders', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GET_ORDER_STATS'), orderController.getOrderStats);
// ===== ROTAS DE PAGAMENTO =====
// POST /orders/:orderId/payment - Processar pagamento
router.post('/:orderId/payment', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('PROCESS_PAYMENT'), orderController.processPayment);
// GET /orders/:orderId/payment - Verificar status do pagamento
router.get('/:orderId/payment', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GET_PAYMENT_STATUS'), orderController.getPaymentStatus);
// ===== ROTAS DE ENTREGA =====
// POST /orders/:orderId/delivery - Criar entrega
router.post('/:orderId/delivery', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('CREATE_DELIVERY'), orderController.createDelivery);
// GET /orders/:orderId/delivery - Verificar status da entrega
router.get('/:orderId/delivery', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GET_DELIVERY_STATUS'), orderController.getDeliveryStatus);
// ===== ROTAS DE NOTIFICAÇÕES =====
// POST /orders/:orderId/notifications - Enviar notificação
router.post('/:orderId/notifications', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('SEND_NOTIFICATION'), orderController.sendNotification);
// GET /orders/:orderId/notifications - Listar notificações
router.get('/:orderId/notifications', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GET_NOTIFICATIONS'), orderController.getNotifications);
exports.default = router;
