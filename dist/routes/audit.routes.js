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
const express_1 = require("express");
const audit_service_1 = require("../core/audit/audit.service");
const auth_guard_1 = require("../guards/auth.guard");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ===== ROTAS DE AUDITORIA =====
// GET /audit/logs - Listar logs de auditoria
router.get('/logs', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('VIEW_AUDIT_LOGS'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entity, entityId, userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
        const filters = {};
        if (entity)
            filters.entity = entity;
        if (entityId)
            filters.entityId = entityId;
        if (userId)
            filters.userId = userId;
        if (action)
            filters.action = action;
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { timestamp: -1 }
        };
        const result = yield audit_service_1.AuditService.getAuditLogs(filters, options);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar logs de auditoria'
        });
    }
}));
// GET /audit/entity/:entity/:entityId - Histórico de uma entidade
router.get('/entity/:entity/:entityId', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('VIEW_ENTITY_HISTORY'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entity, entityId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const logs = yield audit_service_1.AuditService.getEntityHistory(entity, entityId, {
            page: parseInt(page),
            limit: parseInt(limit)
        });
        res.status(200).json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar histórico da entidade'
        });
    }
}));
// GET /audit/user/:userId - Atividade de um usuário
router.get('/user/:userId', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('VIEW_USER_ACTIVITY'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20, startDate, endDate } = req.query;
        const logs = yield audit_service_1.AuditService.getUserActivity(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });
        res.status(200).json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar atividade do usuário'
        });
    }
}));
// GET /audit/report - Gerar relatório de auditoria
router.get('/report', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('GENERATE_AUDIT_REPORT'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, entity } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate e endDate são obrigatórios'
            });
        }
        const report = yield audit_service_1.AuditService.generateAuditReport(new Date(startDate), new Date(endDate), entity);
        res.status(200).json({
            success: true,
            data: report
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao gerar relatório de auditoria'
        });
    }
}));
// POST /audit/cleanup - Limpar logs antigos (apenas admin)
router.post('/cleanup', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('CLEANUP_AUDIT_LOGS'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { olderThanDays = 90 } = req.body;
        const deletedCount = yield audit_service_1.AuditService.cleanupOldLogs(olderThanDays);
        res.status(200).json({
            success: true,
            message: `${deletedCount} logs antigos foram removidos`,
            data: { deletedCount }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao limpar logs antigos'
        });
    }
}));
// GET /audit/stats - Estatísticas de auditoria
router.get('/stats', auth_guard_1.AuthGuard, (0, auth_middleware_1.logAction)('VIEW_AUDIT_STATS'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
        const end = endDate ? new Date(endDate) : new Date();
        const report = yield audit_service_1.AuditService.generateAuditReport(start, end);
        res.status(200).json({
            success: true,
            data: Object.assign({ period: { start, end } }, report)
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar estatísticas de auditoria'
        });
    }
}));
exports.default = router;
