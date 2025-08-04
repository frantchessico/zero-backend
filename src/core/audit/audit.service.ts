import { model } from 'mongoose';
import { logger } from '../../utils/logger';

export interface IAuditLog {
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  userId: string;
  userRole: string;
  oldValues?: any;
  newValues?: any;
  changes?: string[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: any;
}

const AuditLogSchema = new (require('mongoose').Schema)({
  entity: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  action: { 
    type: String, 
    enum: ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'], 
    required: true 
  },
  userId: { type: String, required: true, index: true },
  userRole: { type: String, required: true },
  oldValues: { type: Object },
  newValues: { type: Object },
  changes: [{ type: String }],
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: { type: Object }
}, {
  timestamps: true
});

// Índices para consultas eficientes
AuditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = model('AuditLog', AuditLogSchema);

export class AuditService {
  
  /**
   * Registrar mudança em entidade
   */
  static async logChange(
    entity: string,
    entityId: string,
    action: IAuditLog['action'],
    userId: string,
    userRole: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any,
    request?: any
  ): Promise<void> {
    try {
      const changes = this.detectChanges(oldValues, newValues);
      
      const auditLog = new AuditLog({
        entity,
        entityId,
        action,
        userId,
        userRole,
        oldValues,
        newValues,
        changes,
        ipAddress: request?.ip,
        userAgent: request?.headers?.['user-agent'],
        metadata
      });

      await auditLog.save();
      
      logger.info(`Audit log created: ${action} on ${entity} ${entityId} by ${userId}`);
    } catch (error) {
      logger.error('Error creating audit log:', error);
    }
  }

  /**
   * Detectar mudanças entre valores antigos e novos
   */
  private static detectChanges(oldValues: any, newValues: any): string[] {
    const changes: string[] = [];
    
    if (!oldValues || !newValues) return changes;

    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(`${key}: ${oldValue} → ${newValue}`);
      }
    }
    
    return changes;
  }

  /**
   * Registrar criação de entidade
   */
  static async logCreation(
    entity: string,
    entityId: string,
    userId: string,
    userRole: string,
    values: any,
    metadata?: any,
    request?: any
  ): Promise<void> {
    await this.logChange(
      entity,
      entityId,
      'CREATE',
      userId,
      userRole,
      undefined,
      values,
      metadata,
      request
    );
  }

  /**
   * Registrar atualização de entidade
   */
  static async logUpdate(
    entity: string,
    entityId: string,
    userId: string,
    userRole: string,
    oldValues: any,
    newValues: any,
    metadata?: any,
    request?: any
  ): Promise<void> {
    await this.logChange(
      entity,
      entityId,
      'UPDATE',
      userId,
      userRole,
      oldValues,
      newValues,
      metadata,
      request
    );
  }

  /**
   * Registrar mudança de status
   */
  static async logStatusChange(
    entity: string,
    entityId: string,
    userId: string,
    userRole: string,
    oldStatus: string,
    newStatus: string,
    metadata?: any,
    request?: any
  ): Promise<void> {
    await this.logChange(
      entity,
      entityId,
      'STATUS_CHANGE',
      userId,
      userRole,
      { status: oldStatus },
      { status: newStatus },
      metadata,
      request
    );
  }

  /**
   * Registrar deleção de entidade
   */
  static async logDeletion(
    entity: string,
    entityId: string,
    userId: string,
    userRole: string,
    values: any,
    metadata?: any,
    request?: any
  ): Promise<void> {
    await this.logChange(
      entity,
      entityId,
      'DELETE',
      userId,
      userRole,
      values,
      undefined,
      metadata,
      request
    );
  }

  /**
   * Buscar logs de auditoria
   */
  static async getAuditLogs(
    filters: {
      entity?: string;
      entityId?: string;
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {}
  ): Promise<{
    logs: IAuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};
      
      if (filters.entity) query.entity = filters.entity;
      if (filters.entityId) query.entityId = filters.entityId;
      if (filters.userId) query.userId = filters.userId;
      if (filters.action) query.action = filters.action;
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;
      const sort = options.sort || { timestamp: -1 };

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de mudanças de uma entidade
   */
  static async getEntityHistory(
    entity: string,
    entityId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<IAuditLog[]> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const logs = await AuditLog.find({
        entity,
        entityId
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return logs;
    } catch (error) {
      logger.error('Error fetching entity history:', error);
      throw error;
    }
  }

  /**
   * Buscar atividade de um usuário
   */
  static async getUserActivity(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<IAuditLog[]> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { userId };
      
      if (options.startDate || options.endDate) {
        query.timestamp = {};
        if (options.startDate) query.timestamp.$gte = options.startDate;
        if (options.endDate) query.timestamp.$lte = options.endDate;
      }

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return logs;
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Gerar relatório de auditoria
   */
  static async generateAuditReport(
    startDate: Date,
    endDate: Date,
    entity?: string
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    topUsers: Array<{ userId: string; actions: number }>;
    topEntities: Array<{ entity: string; entityId: string; actions: number }>;
  }> {
    try {
      const query: any = {
        timestamp: { $gte: startDate, $lte: endDate }
      };
      
      if (entity) query.entity = entity;

      const [
        totalActions,
        actionsByType,
        topUsers,
        topEntities
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$userId', actions: { $sum: 1 } } },
          { $sort: { actions: -1 } },
          { $limit: 10 }
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: { entity: '$entity', entityId: '$entityId' }, actions: { $sum: 1 } } },
          { $sort: { actions: -1 } },
          { $limit: 10 }
        ])
      ]);

      return {
        totalActions,
        actionsByType: actionsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topUsers: topUsers.map(item => ({
          userId: item._id,
          actions: item.actions
        })),
        topEntities: topEntities.map(item => ({
          entity: item._id.entity,
          entityId: item._id.entityId,
          actions: item.actions
        }))
      };
    } catch (error) {
      logger.error('Error generating audit report:', error);
      throw error;
    }
  }

  /**
   * Limpar logs antigos (manutenção)
   */
  static async cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} old audit logs`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error cleaning up old audit logs:', error);
      throw error;
    }
  }
} 