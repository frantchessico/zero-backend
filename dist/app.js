"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_2 = require("@clerk/express");
const logger_1 = require("./utils/logger");
const database_1 = __importDefault(require("./config/database"));
const clerk_1 = __importDefault(require("./config/clerk"));
// Importar rotas
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const vendor_routes_1 = __importDefault(require("./routes/vendor.routes"));
const delivery_routes_1 = __importDefault(require("./routes/delivery.routes"));
const driver_routes_1 = __importDefault(require("./routes/driver.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const route_routes_1 = __importDefault(require("./routes/route.routes"));
const personal_delivery_routes_1 = __importDefault(require("./routes/personal-delivery.routes"));
const promotion_routes_1 = __importDefault(require("./routes/promotion.routes"));
const coupon_routes_1 = __importDefault(require("./routes/coupon.routes"));
const loyalty_routes_1 = __importDefault(require("./routes/loyalty.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const clerk_webhook_routes_1 = __importDefault(require("./routes/clerk-webhook.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const app = (0, express_1.default)();
const isTestEnv = process.env.NODE_ENV === 'test';
// Inicializar Clerk
if (!isTestEnv) {
    (0, clerk_1.default)();
}
// Configurar trust proxy para resolver problemas com X-Forwarded-For
app.set('trust proxy', 1);
if (!isTestEnv) {
    app.use((0, express_2.clerkMiddleware)());
}
// Connect to MongoDB outside test runs; integration tests manage their own connection.
if (!isTestEnv) {
    (0, database_1.default)();
}
// ===== MIDDLEWARES DE SEGURANÇA =====
// Helmet para headers de segurança
app.use((0, helmet_1.default)());
// CORS configurado
app.use((0, cors_1.default)({
    origin: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ((_b = process.env.CORS_ORIGIN) === null || _b === void 0 ? void 0 : _b.split(',')) || ['http://localhost:3000'],
    credentials: true
}));
// Rate limiting global - corrigido para evitar problemas com X-Forwarded-For
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite por IP
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Muitas requisições deste IP, tente novamente mais tarde.'
    },
    skip: (req) => {
        // Pular rate limiting para health checks e algumas rotas específicas
        return req.path === '/health' || req.path.startsWith('/api/health');
    },
    // Configuração adicional para melhor compatibilidade
    keyGenerator: (req) => {
        // Usar X-Forwarded-For se disponível, senão usar IP direto
        return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
    }
});
app.use(limiter);
// Logging
app.use((0, morgan_1.default)("dev"));
// Body parsing
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
    limit: "50mb"
}));
// ===== ROTAS PÚBLICAS =====
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API está funcionando',
        timestamp: new Date().toISOString()
    });
});
// ===== ROTAS PROTEGIDAS =====
// Webhooks públicos
app.use('/api/webhooks', clerk_webhook_routes_1.default);
// Logging de ações para todas as rotas da API
app.use('/api', (0, auth_middleware_1.logAction)('API_REQUEST'));
// Rotas da API
app.use("/api/users", user_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/orders", order_routes_1.default);
app.use("/api/vendors", vendor_routes_1.default);
app.use("/api/deliveries", delivery_routes_1.default);
app.use("/api/drivers", driver_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/routes", route_routes_1.default);
app.use("/api/personal-delivery", personal_delivery_routes_1.default);
app.use("/api/promotions", promotion_routes_1.default);
app.use("/api/coupons", coupon_routes_1.default);
app.use("/api/loyalty", loyalty_routes_1.default);
app.use("/api/chats", chat_routes_1.default);
// Rotas de auditoria (apenas para admins)
app.use("/api/audit", audit_routes_1.default);
// ===== ERROR HANDLING =====
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});
// Global error handler
app.use((err, _req, res, _next) => {
    logger_1.logger.error('Unhandled error:', err);
    // Verificar se a resposta já foi enviada
    if (res.headersSent) {
        return;
    }
    res.status(500).json({
        success: false,
        error: "Internal server error",
        message: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : err.message,
    });
});
exports.default = app;
