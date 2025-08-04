import 'dotenv/config';
import express from "express"
import cors from "cors"
import morgan from "morgan"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { clerkMiddleware } from '@clerk/express'

import { logger } from "./utils/logger"
import connectDatabase from "./config/database"
import initializeClerk from "./config/clerk"

// Importar rotas
import userRoutes from './routes/user.routes'
import productRoutes from './routes/product.routes'
import orderRoutes from './routes/order.routes'
import vendorRoutes from './routes/vendor.routes'
import deliveryRoutes from './routes/delivery.routes'
import driverRoutes from './routes/driver.routes'
import notificationRoutes from './routes/notification.routes'
import auditRoutes from './routes/audit.routes'

// Importar middlewares de segurança
import { authenticateUser } from './middleware/auth.middleware'
import { logAction } from './middleware/auth.middleware'

// Importar middlewares de auditoria
import { auditCriticalActions } from './middleware/audit.middleware'

const app = express()

// Inicializar Clerk
initializeClerk();

// Configurar trust proxy para resolver problemas com X-Forwarded-For
app.set('trust proxy', 1);

app.use(clerkMiddleware())
// Connect to MongoDB
connectDatabase()

// ===== MIDDLEWARES DE SEGURANÇA =====

// Helmet para headers de segurança
app.use(helmet())

// CORS configurado
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))

// Rate limiting global - corrigido para evitar problemas com X-Forwarded-For
const limiter = rateLimit({
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
    return req.headers['x-forwarded-for'] as string || req.ip || req.connection.remoteAddress || 'unknown';
  }
})
app.use(limiter)

// Logging
app.use(morgan("dev"))

// Body parsing
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
  limit: "50mb"
}))

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

// Logging de ações para todas as rotas da API
app.use('/api', logAction('API_REQUEST'))

// Rotas da API
app.use("/api/users", userRoutes)
app.use("/api/products", productRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/vendors", vendorRoutes)
app.use("/api/deliveries", deliveryRoutes)
app.use("/api/drivers", driverRoutes)
app.use("/api/notifications", notificationRoutes)

// Rotas de auditoria (apenas para admins)
app.use("/api/audit", auditRoutes)

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
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

export default app