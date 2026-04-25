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
exports.auditCriticalActions = exports.auditDeletion = exports.auditStatusChanges = exports.auditCreation = exports.auditAction = void 0;
const audit_service_1 = require("../core/audit/audit.service");
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
/**
 * Middleware para logging automático de ações
 */
const auditAction = (action, entity) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Obter informações do usuário
            let userId = 'anonymous';
            let userRole = 'anonymous';
            if (req.clerkPayload) {
                const clerkId = req.clerkPayload.sub;
                const user = yield User_1.User.findOne({ clerkId });
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
            logger_1.logger.info(`Audit Action: ${action}`, auditData);
            // Salvar no banco de dados (opcional)
            yield audit_service_1.AuditService.logAction(auditData);
            next();
        }
        catch (error) {
            logger_1.logger.error('Audit middleware error:', error);
            next(); // Continuar mesmo se o audit falhar
        }
    });
};
exports.auditAction = auditAction;
/**
 * Middleware para auditar criação de entidades
 */
const auditCreation = (entity) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const originalSend = res.send;
        const originalJson = res.json;
        res.send = function (data) {
            var _a;
            try {
                if (req.user && req.method === 'POST' && res.statusCode === 201) {
                    const responseData = typeof data === 'string' ? JSON.parse(data) : data;
                    const entityId = ((_a = responseData === null || responseData === void 0 ? void 0 : responseData.data) === null || _a === void 0 ? void 0 : _a._id) || (responseData === null || responseData === void 0 ? void 0 : responseData._id);
                    if (entityId) {
                        audit_service_1.AuditService.logCreation(entity, entityId, req.user.userId || req.user._id, req.user.role, req.body, {
                            method: req.method,
                            path: req.path,
                            userAgent: req.headers['user-agent']
                        }, req);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit creation middleware:', error);
            }
            return originalSend.call(this, data);
        };
        res.json = function (data) {
            var _a;
            try {
                if (req.user && req.method === 'POST' && res.statusCode === 201) {
                    const entityId = ((_a = data === null || data === void 0 ? void 0 : data.data) === null || _a === void 0 ? void 0 : _a._id) || (data === null || data === void 0 ? void 0 : data._id);
                    if (entityId) {
                        audit_service_1.AuditService.logCreation(entity, entityId, req.user.userId || req.user._id, req.user.role, req.body, {
                            method: req.method,
                            path: req.path,
                            userAgent: req.headers['user-agent']
                        }, req);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit creation middleware:', error);
            }
            return originalJson.call(this, data);
        };
        next();
    });
};
exports.auditCreation = auditCreation;
/**
 * Middleware para auditar mudanças de status
 */
const auditStatusChanges = (entity) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const originalSend = res.send;
        const originalJson = res.json;
        // Capturar status original
        let originalStatus = null;
        const entityId = req.params.id || req.params.orderId || req.params.userId || req.params.vendorId;
        if (entityId && req.body.status) {
            try {
                const Model = require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`).default ||
                    require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`);
                const originalData = yield Model.findById(entityId).select('status').lean();
                originalStatus = originalData === null || originalData === void 0 ? void 0 : originalData.status;
            }
            catch (error) {
                logger_1.logger.error('Error fetching original status for audit:', error);
            }
        }
        res.send = function (data) {
            try {
                if (req.user && req.body.status && originalStatus && originalStatus !== req.body.status) {
                    audit_service_1.AuditService.logStatusChange(entity, entityId, req.user.userId || req.user._id, req.user.role, originalStatus, req.body.status, {
                        method: req.method,
                        path: req.path,
                        userAgent: req.headers['user-agent']
                    }, req);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit status change middleware:', error);
            }
            return originalSend.call(this, data);
        };
        res.json = function (data) {
            try {
                if (req.user && req.body.status && originalStatus && originalStatus !== req.body.status) {
                    audit_service_1.AuditService.logStatusChange(entity, entityId, req.user.userId || req.user._id, req.user.role, originalStatus, req.body.status, {
                        method: req.method,
                        path: req.path,
                        userAgent: req.headers['user-agent']
                    }, req);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit status change middleware:', error);
            }
            return originalJson.call(this, data);
        };
        next();
    });
};
exports.auditStatusChanges = auditStatusChanges;
/**
 * Middleware para auditar deleções
 */
const auditDeletion = (entity) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const originalSend = res.send;
        const originalJson = res.json;
        // Capturar dados antes da deleção
        let originalData = null;
        const entityId = req.params.id || req.params.orderId || req.params.userId || req.params.vendorId;
        if (entityId && req.method === 'DELETE') {
            try {
                const Model = require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`).default ||
                    require(`../models/${entity.charAt(0).toUpperCase() + entity.slice(1)}`);
                originalData = yield Model.findById(entityId).lean();
            }
            catch (error) {
                logger_1.logger.error('Error fetching original data for deletion audit:', error);
            }
        }
        res.send = function (data) {
            try {
                if (req.user && req.method === 'DELETE' && originalData) {
                    audit_service_1.AuditService.logDeletion(entity, entityId, req.user.userId || req.user._id, req.user.role, originalData, {
                        method: req.method,
                        path: req.path,
                        userAgent: req.headers['user-agent']
                    }, req);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit deletion middleware:', error);
            }
            return originalSend.call(this, data);
        };
        res.json = function (data) {
            try {
                if (req.user && req.method === 'DELETE' && originalData) {
                    audit_service_1.AuditService.logDeletion(entity, entityId, req.user.userId || req.user._id, req.user.role, originalData, {
                        method: req.method,
                        path: req.path,
                        userAgent: req.headers['user-agent']
                    }, req);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit deletion middleware:', error);
            }
            return originalJson.call(this, data);
        };
        next();
    });
};
exports.auditDeletion = auditDeletion;
/**
 * Middleware para auditar ações críticas
 */
const auditCriticalActions = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const criticalActions = [
            'role_change',
            'status_change',
            'payment_process',
            'delivery_assign',
            'vendor_suspend',
            'user_deactivate'
        ];
        const isCriticalAction = criticalActions.some(action => req.path.includes(action) || req.body.action === action);
        if (isCriticalAction && req.user) {
            try {
                const entityId = req.params.id || req.params.orderId || req.params.userId || req.params.vendorId;
                if (entityId) {
                    audit_service_1.AuditService.logChange('system', entityId, 'UPDATE', req.user.userId || req.user._id, req.user.role, undefined, req.body, {
                        action: 'CRITICAL_ACTION',
                        method: req.method,
                        path: req.path,
                        userAgent: req.headers['user-agent']
                    }, req);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in audit critical actions middleware:', error);
            }
        }
        next();
    });
};
exports.auditCriticalActions = auditCriticalActions;
