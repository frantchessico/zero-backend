"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_routes_1 = __importDefault(require("./user.routes"));
const driver_routes_1 = __importDefault(require("./driver.routes"));
const route_routes_1 = __importDefault(require("./route.routes"));
const vendor_routes_1 = __importDefault(require("./vendor.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const order_routes_1 = __importDefault(require("./order.routes"));
const delivery_routes_1 = __importDefault(require("./delivery.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const audit_routes_1 = __importDefault(require("./audit.routes"));
const personal_delivery_routes_1 = __importDefault(require("./personal-delivery.routes"));
const promotion_routes_1 = __importDefault(require("./promotion.routes"));
const coupon_routes_1 = __importDefault(require("./coupon.routes"));
const loyalty_routes_1 = __importDefault(require("./loyalty.routes"));
const router = (0, express_1.Router)();
// Prefixo para todas as rotas da API
const API_PREFIX = '/api';
// Rotas de usuário
router.use(`${API_PREFIX}/users`, user_routes_1.default);
// Rotas de driver
router.use(`${API_PREFIX}/drivers`, driver_routes_1.default);
// Rotas de rota (planejamento de entregas)
router.use(`${API_PREFIX}/routes`, route_routes_1.default);
// Rotas de vendor
router.use(`${API_PREFIX}/vendors`, vendor_routes_1.default);
// Rotas de produto
router.use(`${API_PREFIX}/products`, product_routes_1.default);
// Rotas de pedido
router.use(`${API_PREFIX}/orders`, order_routes_1.default);
// Rotas de entrega
router.use(`${API_PREFIX}/deliveries`, delivery_routes_1.default);
// Rotas de notificação
router.use(`${API_PREFIX}/notifications`, notification_routes_1.default);
// Rotas de auditoria
router.use(`${API_PREFIX}/audit`, audit_routes_1.default);
// Rotas de entrega pessoal
router.use(`${API_PREFIX}/personal-delivery`, personal_delivery_routes_1.default);
// Promoções & descontos
router.use(`${API_PREFIX}/promotions`, promotion_routes_1.default);
router.use(`${API_PREFIX}/coupons`, coupon_routes_1.default);
// Sistema de fidelidade
router.use(`${API_PREFIX}/loyalty`, loyalty_routes_1.default);
// Rota de health check
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API está funcionando!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Rota 404 para rotas não encontradas
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        path: req.originalUrl
    });
});
exports.default = router;
