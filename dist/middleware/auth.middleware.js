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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitByUser = exports.logAction = exports.requireRole = exports.requireOrderAccess = exports.requireDeliveryAccess = exports.requireOwnership = exports.requireAdmin = exports.requireDriver = exports.requireVendor = exports.requireCustomer = exports.authenticateUser = void 0;
const express_1 = require("@clerk/express");
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
const Vendor_1 = require("../models/Vendor");
const Product_1 = __importDefault(require("../models/Product"));
const Delivery_1 = require("../models/Delivery");
const logger_1 = require("../utils/logger");
/**
 * Middleware de autenticação básica
 */
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    try {
        // Em produção, isso viria do token JWT ou Clerk
        if (!req.clerkPayload) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticação necessário'
            });
        }
        const userId = req.clerkPayload.sub;
        const userData = yield express_1.clerkClient.users.getUser(userId);
        const userRole = userData.unsafeMetadata.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticação necessário'
            });
        }
        // Buscar usuário no banco
        const user = yield User_1.User.findOne({ clerkId: userId });
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
            sessionId: req.headers['session-id']
        };
        logger_1.logger.info(`User authenticated: ${userId} (${user.role})`);
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro de autenticação'
        });
    }
});
exports.authenticateUser = authenticateUser;
/**
 * Middleware para verificar se usuário é customer
 */
const requireCustomer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.clerkPayload) {
        return res.status(401).json({
            success: false,
            message: 'Autenticação necessária'
        });
    }
    const clerkId = req.clerkPayload.sub;
    const user = yield User_1.User.findOne({ clerkId });
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
});
exports.requireCustomer = requireCustomer;
/**
 * Middleware para verificar se usuário é vendor
 */
const requireVendor = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.clerkPayload) {
        return res.status(401).json({
            success: false,
            message: 'Autenticação necessária'
        });
    }
    const clerkId = req.clerkPayload.sub;
    const user = yield User_1.User.findOne({ clerkId });
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
});
exports.requireVendor = requireVendor;
/**
 * Middleware para verificar se usuário é driver
 */
const requireDriver = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.clerkPayload) {
        return res.status(401).json({
            success: false,
            message: 'Autenticação necessária'
        });
    }
    const clerkId = req.clerkPayload.sub;
    const user = yield User_1.User.findOne({ clerkId });
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
});
exports.requireDriver = requireDriver;
/**
 * Middleware para verificar se usuário é admin
 */
const requireAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.clerkPayload) {
        return res.status(401).json({
            success: false,
            message: 'Autenticação necessária'
        });
    }
    const clerkId = req.clerkPayload.sub;
    const user = yield User_1.User.findOne({ clerkId });
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
});
exports.requireAdmin = requireAdmin;
/**
 * Middleware para verificar se usuário pode acessar seu próprio recurso
 */
const requireOwnership = (resourceType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.clerkPayload) {
                return res.status(401).json({
                    success: false,
                    message: 'Autenticação necessária'
                });
            }
            const clerkId = req.clerkPayload.sub;
            const user = yield User_1.User.findOne({ clerkId });
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
                    const order = yield Order_1.Order.findById(resourceId);
                    isOwner = !!(order && order.customer.toString() === user._id.toString());
                    break;
                case 'vendor':
                    const vendor = yield Vendor_1.Vendor.findById(resourceId);
                    isOwner = !!(vendor && vendor.owner.toString() === user._id.toString());
                    break;
                case 'product':
                    const product = yield Product_1.default.findById(resourceId);
                    if (product) {
                        const vendor = yield Vendor_1.Vendor.findById(product.vendor);
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
        }
        catch (error) {
            logger_1.logger.error('Ownership check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar permissões'
            });
        }
    });
};
exports.requireOwnership = requireOwnership;
/**
 * Middleware para verificar se driver pode acessar delivery
 */
const requireDeliveryAccess = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.clerkPayload) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária'
            });
        }
        const clerkId = req.clerkPayload.sub;
        const user = yield User_1.User.findOne({ clerkId });
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
        const delivery = yield Delivery_1.Delivery.findById(deliveryId);
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
            const order = yield Order_1.Order.findById(delivery.order);
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
    }
    catch (error) {
        logger_1.logger.error('Delivery access check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar permissões de entrega'
        });
    }
});
exports.requireDeliveryAccess = requireDeliveryAccess;
/**
 * Middleware para verificar se vendor pode acessar pedido
 */
const requireOrderAccess = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.clerkPayload) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária'
            });
        }
        const clerkId = req.clerkPayload.sub;
        const user = yield User_1.User.findOne({ clerkId });
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
        const order = yield Order_1.Order.findById(orderId);
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
            const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
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
    }
    catch (error) {
        logger_1.logger.error('Order access check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar permissões do pedido'
        });
    }
});
exports.requireOrderAccess = requireOrderAccess;
/**
 * Middleware para verificar permissões baseadas em role
 */
const requireRole = (roles) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        if (!req.clerkPayload) {
            return res.status(401).json({
                success: false,
                message: 'Autenticação necessária'
            });
        }
        const clerkId = req.clerkPayload.sub;
        const user = yield User_1.User.findOne({ clerkId });
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
    });
};
exports.requireRole = requireRole;
/**
 * Middleware para logging de ações
 */
const logAction = (action) => {
    return (req, res, next) => {
        var _a;
        try {
            const userId = ((_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub) || 'anonymous';
            const method = req.method;
            const path = req.path;
            const ip = req.ip || req.connection.remoteAddress || 'unknown';
            logger_1.logger.info(`Action: ${action} | User: ${userId} | Method: ${method} | Path: ${path} | IP: ${ip}`);
            next();
        }
        catch (error) {
            // Se houver erro no logging, não interromper o fluxo
            logger_1.logger.error('Error in logAction:', error);
            next();
        }
    };
};
exports.logAction = logAction;
/**
 * Middleware para rate limiting por usuário
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    return (req, res, next) => {
        var _a;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || req.ip;
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
exports.rateLimitByUser = rateLimitByUser;
