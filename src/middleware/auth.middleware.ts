import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth, getAuth } from '@clerk/express'
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Vendor } from '../models/Vendor';
import ProductModel from '../models/Product';
import { Delivery } from '../models/Delivery';
import { logger } from '../utils/logger';

// Extender interface Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      auth?: any;
    }
  }
}

/**
 * Middleware de autenticação básica
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  console.log(req.body)
  try {
    // Em produção, isso viria do token JWT ou Clerk
    if (!req.clerkPayload) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação necessário'
      });
    }

    const userId = req.clerkPayload.sub;
    const userData = await clerkClient.users.getUser(userId);

    const userRole = userData.unsafeMetadata.role as string;
  
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação necessário'
      });
    }
  
    // Buscar usuário no banco
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo'
      });
    }

    // Adicionar user ao request
    req.user = user;
    req.auth = {
      userId: user._id,
      userRole: user.role,
      sessionId: req.headers['session-id'] as string
    };

    logger.info(`User authenticated: ${userId} (${user.role})`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro de autenticação'
    });
  }
};

/**
 * Middleware para verificar se usuário é customer
 */
export const requireCustomer = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.clerkPayload) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária'
    });
  }

  const clerkId = req.clerkPayload.sub;
  const user = await User.findOne({ clerkId });
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  if (user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: apenas clientes podem realizar esta ação'
    });
  }

  next();
};

/**
 * Middleware para verificar se usuário é vendor
 */
export const requireVendor = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.clerkPayload) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária'
    });
  }

  const clerkId = req.clerkPayload.sub;
  const user = await User.findOne({ clerkId });
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  if (user.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: apenas vendedores podem realizar esta ação'
    });
  }

  next();
};

/**
 * Middleware para verificar se usuário é driver
 */
export const requireDriver = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.clerkPayload) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária'
    });
  }

  const clerkId = req.clerkPayload.sub;
  const user = await User.findOne({ clerkId });
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  if (user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: apenas motoristas podem realizar esta ação'
    });
  }

  next();
};

/**
 * Middleware para verificar se usuário é admin
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.clerkPayload) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária'
    });
  }

  const clerkId = req.clerkPayload.sub;
  const user = await User.findOne({ clerkId });
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: apenas administradores podem realizar esta ação'
    });
  }

  next();
};

/**
 * Middleware para verificar se usuário pode acessar seu próprio recurso
 */
export const requireOwnership = (resourceType: 'user' | 'order' | 'vendor' | 'product') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.clerkPayload) {
        return res.status(401).json({
          success: false,
          message: 'Autenticação necessária'
        });
      }

      const clerkId = req.clerkPayload.sub;
      const user = await User.findOne({ clerkId });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const resourceId = req.params.id || req.params.userId || req.params.orderId || req.params.vendorId || req.params.productId;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'ID do recurso necessário'
        });
      }

      let isOwner = false;

      switch (resourceType) {
        case 'user':
          isOwner = user._id.toString() === resourceId;
          break;

        case 'order':
          const order = await Order.findById(resourceId);
          isOwner = !!(order && order.customer.toString() === user._id.toString());
          break;

        case 'vendor':
          const vendor = await Vendor.findById(resourceId);
          isOwner = !!(vendor && vendor.owner.toString() === user._id.toString());
          break;

        case 'product':
          const product = await ProductModel.findById(resourceId);
          if (product) {
            const vendor = await Vendor.findById(product.vendor);
            isOwner = !!(vendor && vendor.owner.toString() === user._id.toString());
          }
          break;
      }

      if (!isOwner && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado: você não possui permissão para este recurso'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissões'
      });
    }
  };
};

/**
 * Middleware para verificar se driver pode acessar delivery
 */
export const requireDeliveryAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.clerkPayload) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária'
      });
    }

    const clerkId = req.clerkPayload.sub;
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const deliveryId = req.params.deliveryId || req.params.id;
    
    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message: 'ID da entrega necessário'
      });
    }

    const delivery = await Delivery.findById(deliveryId);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Entrega não encontrada'
      });
    }

    // Driver pode acessar apenas suas próprias entregas
    if (user.role === 'driver' && delivery.driver.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: você não possui permissão para esta entrega'
      });
    }

    // Customer pode acessar entregas de seus pedidos
    if (user.role === 'customer') {
      const order = await Order.findById(delivery.order);
      if (!order || order.customer.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado: você não possui permissão para esta entrega'
        });
      }
    }

    // Admin pode acessar qualquer entrega
    if (user.role === 'admin') {
      return next();
    }

    next();
  } catch (error) {
    logger.error('Delivery access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões de entrega'
    });
  }
};

/**
 * Middleware para verificar se vendor pode acessar pedido
 */
export const requireOrderAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.clerkPayload) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária'
      });
    }

    const clerkId = req.clerkPayload.sub;
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const orderId = req.params.orderId || req.params.id;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido necessário'
      });
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Customer pode acessar apenas seus próprios pedidos
    if (user.role === 'customer' && order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: você não possui permissão para este pedido'
      });
    }

    // Vendor pode acessar apenas pedidos de seus estabelecimentos
    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ owner: user._id });
      if (!vendor || order.vendor.toString() !== vendor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado: você não possui permissão para este pedido'
        });
      }
    }

    // Admin pode acessar qualquer pedido
    if (user.role === 'admin') {
      return next();
    }

    next();
  } catch (error) {
    logger.error('Order access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões do pedido'
    });
  }
};

/**
 * Middleware para verificar permissões baseadas em role
 */
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.clerkPayload) {
      return res.status(401).json({
        success: false,
        message: 'Autenticação necessária'
      });
    }

    const clerkId = req.clerkPayload.sub;
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado: roles permitidos: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware para logging de ações
 */
export const logAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.clerkPayload?.sub || 'anonymous';
      const method = req.method;
      const path = req.path;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      logger.info(`Action: ${action} | User: ${userId} | Method: ${method} | Path: ${path} | IP: ${ip}`);

      next();
    } catch (error) {
      // Se houver erro no logging, não interromper o fluxo
      logger.error('Error in logAction:', error);
      next();
    }
  };
};

/**
 * Middleware para rate limiting por usuário
 */
export const rateLimitByUser = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId || req.ip;
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, { count: 0, resetTime: now + windowMs });
    }

    const userRequests = requests.get(userId);

    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + windowMs;
    }

    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente mais tarde.'
      });
    }

    userRequests.count++;
    next();
  };
}; 