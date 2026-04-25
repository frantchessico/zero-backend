"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
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
const AuditLog = (0, mongoose_1.model)('AuditLog', AuditLogSchema);
class AuditService {
    static logAction(auditData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const auditLog = new AuditLog({
                    entity: auditData.entity || 'unknown',
                    entityId: auditData.entityId || 'unknown',
                    action: 'UPDATE',
                    userId: auditData.userId,
                    userRole: auditData.userRole,
                    newValues: auditData.requestBody,
                    timestamp: auditData.timestamp || new Date(),
                    ipAddress: auditData.ip,
                    userAgent: auditData.userAgent,
                    metadata: {
                        actionLabel: auditData.action,
                        method: auditData.method,
                        path: auditData.path,
                        queryParams: auditData.queryParams,
                    },
                });
                yield auditLog.save();
            }
            catch (error) {
                logger_1.logger.error('Error logging audit action:', error);
            }
        });
    }
    /**
     * Registrar mudança em entidade
     */
    static logChange(entity, entityId, action, userId, userRole, oldValues, newValues, metadata, request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                    ipAddress: request === null || request === void 0 ? void 0 : request.ip,
                    userAgent: (_a = request === null || request === void 0 ? void 0 : request.headers) === null || _a === void 0 ? void 0 : _a['user-agent'],
                    metadata
                });
                yield auditLog.save();
                logger_1.logger.info(`Audit log created: ${action} on ${entity} ${entityId} by ${userId}`);
            }
            catch (error) {
                logger_1.logger.error('Error creating audit log:', error);
            }
        });
    }
    /**
     * Detectar mudanças entre valores antigos e novos
     */
    static detectChanges(oldValues, newValues) {
        const changes = [];
        if (!oldValues || !newValues)
            return changes;
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
    static logCreation(entity, entityId, userId, userRole, values, metadata, request) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.logChange(entity, entityId, 'CREATE', userId, userRole, undefined, values, metadata, request);
        });
    }
    /**
     * Registrar atualização de entidade
     */
    static logUpdate(entity, entityId, userId, userRole, oldValues, newValues, metadata, request) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.logChange(entity, entityId, 'UPDATE', userId, userRole, oldValues, newValues, metadata, request);
        });
    }
    /**
     * Registrar mudança de status
     */
    static logStatusChange(entity, entityId, userId, userRole, oldStatus, newStatus, metadata, request) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.logChange(entity, entityId, 'STATUS_CHANGE', userId, userRole, { status: oldStatus }, { status: newStatus }, metadata, request);
        });
    }
    /**
     * Registrar deleção de entidade
     */
    static logDeletion(entity, entityId, userId, userRole, values, metadata, request) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.logChange(entity, entityId, 'DELETE', userId, userRole, values, undefined, metadata, request);
        });
    }
    /**
     * Buscar logs de auditoria
     */
    static getAuditLogs() {
        return __awaiter(this, arguments, void 0, function* (filters = {}, options = {}) {
            try {
                const query = {};
                if (filters.entity)
                    query.entity = filters.entity;
                if (filters.entityId)
                    query.entityId = filters.entityId;
                if (filters.userId)
                    query.userId = filters.userId;
                if (filters.action)
                    query.action = filters.action;
                if (filters.startDate || filters.endDate) {
                    query.timestamp = {};
                    if (filters.startDate)
                        query.timestamp.$gte = filters.startDate;
                    if (filters.endDate)
                        query.timestamp.$lte = filters.endDate;
                }
                const page = options.page || 1;
                const limit = options.limit || 50;
                const skip = (page - 1) * limit;
                const sort = options.sort || { timestamp: -1 };
                const [logs, total] = yield Promise.all([
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching audit logs:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar histórico de mudanças de uma entidade
     */
    static getEntityHistory(entity_1, entityId_1) {
        return __awaiter(this, arguments, void 0, function* (entity, entityId, options = {}) {
            try {
                const page = options.page || 1;
                const limit = options.limit || 20;
                const skip = (page - 1) * limit;
                const logs = yield AuditLog.find({
                    entity,
                    entityId
                })
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec();
                return logs;
            }
            catch (error) {
                logger_1.logger.error('Error fetching entity history:', error);
                throw error;
            }
        });
    }
    /**
     * Buscar atividade de um usuário
     */
    static getUserActivity(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, options = {}) {
            try {
                const page = options.page || 1;
                const limit = options.limit || 20;
                const skip = (page - 1) * limit;
                const query = { userId };
                if (options.startDate || options.endDate) {
                    query.timestamp = {};
                    if (options.startDate)
                        query.timestamp.$gte = options.startDate;
                    if (options.endDate)
                        query.timestamp.$lte = options.endDate;
                }
                const logs = yield AuditLog.find(query)
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec();
                return logs;
            }
            catch (error) {
                logger_1.logger.error('Error fetching user activity:', error);
                throw error;
            }
        });
    }
    /**
     * Gerar relatório de auditoria
     */
    static generateAuditReport(startDate, endDate, entity) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = {
                    timestamp: { $gte: startDate, $lte: endDate }
                };
                if (entity)
                    query.entity = entity;
                const [totalActions, actionsByType, topUsers, topEntities] = yield Promise.all([
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
            }
            catch (error) {
                logger_1.logger.error('Error generating audit report:', error);
                throw error;
            }
        });
    }
    /**
     * Limpar logs antigos (manutenção)
     */
    static cleanupOldLogs() {
        return __awaiter(this, arguments, void 0, function* (olderThanDays = 90) {
            try {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                const result = yield AuditLog.deleteMany({
                    timestamp: { $lt: cutoffDate }
                });
                logger_1.logger.info(`Cleaned up ${result.deletedCount} old audit logs`);
                return result.deletedCount || 0;
            }
            catch (error) {
                logger_1.logger.error('Error cleaning up old audit logs:', error);
                throw error;
            }
        });
    }
}
exports.AuditService = AuditService;
