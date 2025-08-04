import { Router } from 'express';
import { AuditService } from '../core/audit/audit.service';
import { AuthGuard } from '../guards/auth.guard';
import { 
  requireAdmin,
  logAction,
  rateLimitByUser
} from '../middleware/auth.middleware';

const router = Router();

// ===== ROTAS DE AUDITORIA =====

// GET /audit/logs - Listar logs de auditoria
router.get('/logs', 
  AuthGuard,
  logAction('VIEW_AUDIT_LOGS'),
  async (req: any, res: any) => {
    try {
      const { 
        entity, 
        entityId, 
        userId, 
        action, 
        startDate, 
        endDate,
        page = 1, 
        limit = 50 
      } = req.query;

      const filters: any = {};
      if (entity) filters.entity = entity;
      if (entityId) filters.entityId = entityId;
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { timestamp: -1 }
      };

      const result = await AuditService.getAuditLogs(filters, options);

      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: options.limit
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar logs de auditoria'
      });
    }
  }
);

// GET /audit/entity/:entity/:entityId - Histórico de uma entidade
router.get('/entity/:entity/:entityId', 
  AuthGuard,
  logAction('VIEW_ENTITY_HISTORY'),
  async (req: any, res: any) => {
    try {
      const { entity, entityId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const logs = await AuditService.getEntityHistory(entity, entityId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar histórico da entidade'
      });
    }
  }
);

// GET /audit/user/:userId - Atividade de um usuário
router.get('/user/:userId', 
  AuthGuard,
  logAction('VIEW_USER_ACTIVITY'),
  async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, startDate, endDate } = req.query;

      const logs = await AuditService.getUserActivity(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar atividade do usuário'
      });
    }
  }
);

// GET /audit/report - Gerar relatório de auditoria
router.get('/report', 
  AuthGuard,
  logAction('GENERATE_AUDIT_REPORT'),
  async (req: any, res: any) => {
    try {
      const { startDate, endDate, entity } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate e endDate são obrigatórios'
        });
      }

      const report = await AuditService.generateAuditReport(
        new Date(startDate),
        new Date(endDate),
        entity
      );

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao gerar relatório de auditoria'
      });
    }
  }
);

// POST /audit/cleanup - Limpar logs antigos (apenas admin)
router.post('/cleanup', 
  AuthGuard,
  logAction('CLEANUP_AUDIT_LOGS'),
  async (req: any, res: any) => {
    try {
      const { olderThanDays = 90 } = req.body;

      const deletedCount = await AuditService.cleanupOldLogs(olderThanDays);

      res.status(200).json({
        success: true,
        message: `${deletedCount} logs antigos foram removidos`,
        data: { deletedCount }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao limpar logs antigos'
      });
    }
  }
);

// GET /audit/stats - Estatísticas de auditoria
router.get('/stats', 
  AuthGuard,
  logAction('VIEW_AUDIT_STATS'),
  async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
      const end = endDate ? new Date(endDate) : new Date();

      const report = await AuditService.generateAuditReport(start, end);

      res.status(200).json({
        success: true,
        data: {
          period: { start, end },
          ...report
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas de auditoria'
      });
    }
  }
);

export default router; 