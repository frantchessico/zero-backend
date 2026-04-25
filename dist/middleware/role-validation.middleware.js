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
exports.validateRoleChange = exports.validateDeliveryDriver = exports.validateOrderVendor = exports.validateVendorProduct = exports.validateCustomerRole = exports.validateDriverRole = exports.validateVendorRole = void 0;
const User_1 = require("../models/User");
const Vendor_1 = require("../models/Vendor");
const Delivery_1 = require("../models/Delivery");
const logger_1 = require("../utils/logger");
/**
 * Middleware para validar se o usuário tem role adequado para criar vendor
 */
const validateVendorRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { owner } = req.body;
        if (owner) {
            const user = yield User_1.User.findById(owner);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }
            if (user.role !== 'vendor') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas usuários com role "vendor" podem criar estabelecimentos'
                });
            }
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Usuário inativo não pode criar estabelecimentos'
                });
            }
            // Verificar se já existe vendor para este usuário
            const existingVendor = yield Vendor_1.Vendor.findOne({ owner });
            if (existingVendor) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuário já possui um estabelecimento registrado'
                });
            }
            logger_1.logger.info(`Vendor creation validated for user ${owner}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating vendor role:', error);
        next(error);
    }
});
exports.validateVendorRole = validateVendorRole;
/**
 * Middleware para validar se o usuário tem role adequado para ser driver
 */
const validateDriverRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { driver } = req.body;
        if (driver) {
            const user = yield User_1.User.findById(driver);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Motorista não encontrado'
                });
            }
            if (user.role !== 'driver') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas usuários com role "driver" podem fazer entregas'
                });
            }
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Motorista inativo não pode fazer entregas'
                });
            }
            logger_1.logger.info(`Driver role validated for user ${driver}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating driver role:', error);
        next(error);
    }
});
exports.validateDriverRole = validateDriverRole;
/**
 * Middleware para validar se o usuário tem role adequado para fazer pedidos
 */
const validateCustomerRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customer } = req.body;
        if (customer) {
            const user = yield User_1.User.findById(customer);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente não encontrado'
                });
            }
            if (user.role !== 'customer') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas usuários com role "customer" podem fazer pedidos'
                });
            }
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Cliente inativo não pode fazer pedidos'
                });
            }
            logger_1.logger.info(`Customer role validated for user ${customer}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating customer role:', error);
        next(error);
    }
});
exports.validateCustomerRole = validateCustomerRole;
/**
 * Middleware para validar relacionamento vendor-product
 */
const validateVendorProduct = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vendor } = req.body;
        if (vendor) {
            const vendorDoc = yield Vendor_1.Vendor.findById(vendor);
            if (!vendorDoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Estabelecimento não encontrado'
                });
            }
            if (vendorDoc.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Estabelecimento inativo não pode ter produtos'
                });
            }
            if (vendorDoc.temporarilyClosed) {
                return res.status(403).json({
                    success: false,
                    message: 'Estabelecimento temporariamente fechado'
                });
            }
            logger_1.logger.info(`Vendor-product relationship validated for vendor ${vendor}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating vendor-product relationship:', error);
        next(error);
    }
});
exports.validateVendorProduct = validateVendorProduct;
/**
 * Middleware para validar relacionamento order-vendor
 */
const validateOrderVendor = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vendor } = req.body;
        if (vendor) {
            const vendorDoc = yield Vendor_1.Vendor.findById(vendor);
            if (!vendorDoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Estabelecimento não encontrado'
                });
            }
            if (vendorDoc.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Estabelecimento inativo não aceita pedidos'
                });
            }
            if (vendorDoc.temporarilyClosed) {
                return res.status(403).json({
                    success: false,
                    message: 'Estabelecimento temporariamente fechado'
                });
            }
            // Verificar horário de funcionamento
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = now.toTimeString().slice(0, 5);
            const workingHour = vendorDoc.workingHours.find(wh => wh.day === currentDay);
            if (!vendorDoc.open24h && workingHour) {
                if (!workingHour.active ||
                    (workingHour.open && currentTime < workingHour.open) ||
                    (workingHour.close && currentTime > workingHour.close)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Estabelecimento fechado neste horário'
                    });
                }
            }
            logger_1.logger.info(`Order-vendor relationship validated for vendor ${vendor}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating order-vendor relationship:', error);
        next(error);
    }
});
exports.validateOrderVendor = validateOrderVendor;
/**
 * Middleware para validar se delivery pode ser atribuída ao driver
 */
const validateDeliveryDriver = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { driver } = req.body;
        if (driver) {
            const user = yield User_1.User.findById(driver);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Motorista não encontrado'
                });
            }
            if (user.role !== 'driver') {
                return res.status(403).json({
                    success: false,
                    message: 'Apenas motoristas podem fazer entregas'
                });
            }
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Motorista inativo não pode fazer entregas'
                });
            }
            // Verificar se driver já tem delivery em andamento
            const activeDelivery = yield Delivery_1.Delivery.findOne({
                driver,
                status: { $in: ['picked_up', 'in_transit'] }
            });
            if (activeDelivery) {
                return res.status(400).json({
                    success: false,
                    message: 'Motorista já possui entrega em andamento'
                });
            }
            logger_1.logger.info(`Delivery-driver relationship validated for driver ${driver}`);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating delivery-driver relationship:', error);
        next(error);
    }
});
exports.validateDeliveryDriver = validateDeliveryDriver;
/**
 * Middleware para validar mudança de role
 */
const validateRoleChange = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role } = req.body;
        const { userId } = req.params;
        if (role && userId) {
            const user = yield User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }
            // Validar transições de role permitidas
            const allowedTransitions = {
                'customer': ['driver', 'vendor'],
                'driver': ['customer'],
                'vendor': ['customer']
            };
            const currentRole = user.role;
            const newRole = role;
            if (currentRole !== newRole) {
                const allowedRoles = allowedTransitions[currentRole];
                if (!allowedRoles || !allowedRoles.includes(newRole)) {
                    return res.status(400).json({
                        success: false,
                        message: `Transição de role não permitida: ${currentRole} → ${newRole}`
                    });
                }
                // Validações específicas por role
                if (newRole === 'vendor') {
                    const existingVendor = yield Vendor_1.Vendor.findOne({ owner: userId });
                    if (existingVendor) {
                        return res.status(400).json({
                            success: false,
                            message: 'Usuário já possui estabelecimento'
                        });
                    }
                }
                logger_1.logger.info(`Role change validated: ${currentRole} → ${newRole} for user ${userId}`);
            }
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error validating role change:', error);
        next(error);
    }
});
exports.validateRoleChange = validateRoleChange;
