import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../core/audit/audit.service';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Middleware para logging automático de ações
 */
export const auditAction = (action: string, entity?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Obter informações do usuário
      let userId = 'anonymous';
      let userRole = 'anonymous';

      if (req.clerkPayload) {
        const clerkId = req.clerkPayload.sub;
        const user = await User.findOne({ clerkId });
        
        if (user) {
          userId = user._id.toString();
          userRole = user.role;
        }
      }

      // Capturar informações da requisição
      const auditData = {
        action,
        entity: entity || req.params.entity || 'unknown',
        entityId: req.params.id || req.params.entityId || 'unknown',
        userId,
        userRole,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        requestBody: req.body,
        queryParams: req.query
      };

      // Log da ação
      logger.info(`Audit Action: ${action}`, auditData);

      // Salvar no banco de dados (opcional)
      await AuditService.logAction(auditData);

      next();
    } catch (error) {
      logger.error('Audit middleware error:', error);
      next(); // Continuar mesmo se o audit falhar
    }
  };
};

/**
 * Middleware para auditar criação de entidades
 */
export const auditCreation = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data: any) {
      try {
        if (req.user && req.method === 'POST' && res.statusCode === 201) {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          const entityId = responseData?.data?._id || responseData?._id;
          
          if (entityId) {
            AuditService.logCreation(
              entity,
              entityId,
              req.user.userId || req.user._id,
              req.user.role,
              req.body,
              {
                method: req.method,
                path: req.path,
                userAgent: req.headers['user-agent']
              },
              req
            );
          }
        }
      } catch (error) {
        logger.error('Error in audit creation middleware:', error);
      }
      
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      try {
        if (req.user && req.method === 'POST' && res.statusCode === 201) {
          const entityId = data?.data?._id || data?._id;
          
          if (entityId) {
            AuditService.logCreation(
              entity,
              entityId,
              req.user.userId || req.user._id,
              req.user.role,
              req.body,
              {
                method: req.method,
                path: req.path,
                userAgent: req.headers['user-agent']
              },
              req
            );
          }
        }
      } catch (error) {
        logger.error('Error in audit creation middleware:', error);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para auditar mudanças de status
 */
export const auditStatusChanges = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Capturar status original
    let originalStatus: string | null = null;
    const entityId = req.params.id || req.params.orderId || req.params.userId || req.params.vendorId;
    
    if (entityId && req.body.status) {
      try {
        const Model = require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`).default || 
                     require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`);
        const originalData = await Model.findById(entityId).select('status').lean();
        originalStatus = originalData?.status;
      } catch (error) {
        logger.error('Error fetching original status for audit:', error);
      }
    }
    
    res.send = function(data: any) {
      try {
        if (req.user && req.body.status && originalStatus && originalStatus !== req.body.status) {
          AuditService.logStatusChange(
            entity,
            entityId,
            req.user.userId || req.user._id,
            req.user.role,
            originalStatus,
            req.body.status,
            {
              method: req.method,
              path: req.path,
              userAgent: req.headers['user-agent']
            },
            req
          );
        }
      } catch (error) {
        logger.error('Error in audit status change middleware:', error);
      }
      
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      try {
        if (req.user && req.body.status && originalStatus && originalStatus !== req.body.status) {
          AuditService.logStatusChange(
            entity,
            entityId,
            req.user.userId || req.user._id,
            req.user.role,
            originalStatus,
            req.body.status,
            {
              method: req.method,
              path: req.path,
              userAgent: req.headers['user-agent']
            },
            req
          );
        }
      } catch (error) {
        logger.error('Error in audit status change middleware:', error);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para auditar deleções
 */
export const auditDeletion = (entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Capturar dados antes da deleção
    let originalData: any = null;
    const entityId = req.params.id || req.params.orderId || req.params.userId || req.params.vendorId;
    
    if (entityId && req.method === 'DELETE') {
      try {
        const Model = require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`).default || 
                     require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`);
        originalData = await Model.findById(entityId).lean();
      } catch (error) {
        logger.error('Error fetching original data for deletion audit:', error);
      }
    }
    
    res.send = function(data: any) {
      try {
        if (req.user && req.method === 'DELETE' && originalData) {
          AuditService.logDeletion(
            entity,
            entityId,
            req.user.userId || req.user._id,
            req.user.role,
            originalData,
            {
              method: req.method,
              path: req.path,
              userAgent: req.headers['user-agent']
            },
            req
          );
        }
      } catch (error) {
        logger.error('Error in audit deletion middleware:', error);
      }
      
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      try {
        if (req.user && req.method === 'DELETE' && originalData) {
          AuditService.logDeletion(
            entity,
            entityId,
            req.user.userId || req.user._id,
            req.user.role,
            originalData,
            {
              method: req.method,
              path: req.path,
              userAgent: req.headers['user-agent']
            },
            req
          );
        }
      } catch (error) {
        logger.error('Error in audit deletion middleware:', error);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Middleware para auditar ações críticas
 */
export const auditCriticalActions = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const criticalActions = [
      'role_change',
      'status_change',
      'payment_process',
      'delivery_assign',
      'vendor_suspend',
      'user_deactivate'
    ];
    
    const isCriticalAction = criticalActions.some(action => 
      req.path.includes(action) || req.body.action === action
    );
    
    if (isCriticalAction && req.user) {
      try {
        const entityId = req.params.id || req.params.orderId || req.params.userId || req.params.vendorId;
        
        if (entityId) {
          AuditService.logChange(
            'system',
            entityId,
            'UPDATE',
            req.user.userId || req.user._id,
            req.user.role,
            undefined,
            req.body,
            {
              action: 'CRITICAL_ACTION',
              method: req.method,
              path: req.path,
              userAgent: req.headers['user-agent']
            },
            req
          );
        }
      } catch (error) {
        logger.error('Error in audit critical actions middleware:', error);
      }
    }
    
    next();
  };
}; 