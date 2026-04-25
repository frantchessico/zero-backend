"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyController = void 0;
const User_1 = require("../../models/User");
const Vendor_1 = require("../../models/Vendor");
const loyalty_service_1 = require("./loyalty.service");
const LoyaltyProgram_1 = require("../../models/LoyaltyProgram");
const logger_1 = require("../../utils/logger");
class LoyaltyController {
    constructor() {
        /**
         * GET /loyalty/status - Cliente ver seu status de fidelidade
         */
        this.getMyLoyaltyStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                const { vendorId } = req.query;
                const status = yield loyalty_service_1.loyaltyService.getUserLoyaltyStatus(user._id.toString(), vendorId);
                res.status(200).json({
                    success: true,
                    data: status
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching loyalty status:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar status de fidelidade'
                });
            }
        });
        /**
         * POST /loyalty/redeem - Resgatar recompensa (trocar pontos por cupom)
         */
        this.redeemReward = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                const { rewardId, vendorId } = req.body;
                if (!rewardId) {
                    res.status(400).json({
                        success: false,
                        message: 'rewardId é obrigatório'
                    });
                    return;
                }
                const result = yield loyalty_service_1.loyaltyService.redeemReward({
                    userId: user._id.toString(),
                    rewardId,
                    vendorId
                });
                res.status(200).json({
                    success: true,
                    message: 'Recompensa resgatada com sucesso',
                    data: result
                });
            }
            catch (error) {
                logger_1.logger.error('Error redeeming reward:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao resgatar recompensa'
                });
            }
        });
        /**
         * GET /loyalty/rewards - Listar recompensas disponíveis
         */
        this.getAvailableRewards = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId } = req.query;
                const program = yield loyalty_service_1.loyaltyService.getActiveProgram(vendorId);
                if (!program) {
                    res.status(404).json({
                        success: false,
                        message: 'Programa de fidelidade não encontrado'
                    });
                    return;
                }
                const activeRewards = program.rewards.filter(r => r.isActive);
                res.status(200).json({
                    success: true,
                    data: {
                        program: {
                            name: program.name,
                            description: program.description,
                            pointsPerCurrency: program.pointsPerCurrency
                        },
                        rewards: activeRewards
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching rewards:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar recompensas'
                });
            }
        });
        /**
         * GET /loyalty/transactions - Histórico de transações de pontos
         */
        this.getMyTransactions = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                const { page = 1, limit = 20, type } = req.query;
                const { LoyaltyTransaction } = yield Promise.resolve().then(() => __importStar(require('../../models/LoyaltyTransaction')));
                const skip = (parseInt(page) - 1) * parseInt(limit);
                const query = { user: user._id };
                if (type) {
                    query.type = type;
                }
                const [transactions, total] = yield Promise.all([
                    LoyaltyTransaction.find(query)
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(parseInt(limit))
                        .populate('order', 'total status')
                        .populate('coupon', 'code title')
                        .exec(),
                    LoyaltyTransaction.countDocuments(query)
                ]);
                res.status(200).json({
                    success: true,
                    data: {
                        transactions,
                        pagination: {
                            currentPage: parseInt(page),
                            itemsPerPage: parseInt(limit),
                            totalItems: total,
                            totalPages: Math.ceil(total / parseInt(limit))
                        }
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching transactions:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar transações'
                });
            }
        });
        // ===== ENDPOINTS ADMIN/VENDOR =====
        /**
         * POST /loyalty/program - Criar/atualizar programa de fidelidade (admin/vendor)
         */
        this.createOrUpdateProgram = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                // Apenas admin ou vendor podem criar programa
                if (user.role !== 'admin' && user.role !== 'vendor') {
                    res.status(403).json({
                        success: false,
                        message: 'Apenas admin ou vendor podem criar programa de fidelidade'
                    });
                    return;
                }
                let vendorId;
                if (user.role === 'vendor') {
                    const vendor = yield Vendor_1.Vendor.findOne({ owner: user._id });
                    if (!vendor || !vendor._id) {
                        res.status(404).json({
                            success: false,
                            message: 'Vendor não encontrado'
                        });
                        return;
                    }
                    vendorId = vendor._id.toString();
                }
                const _b = req.body, { programId } = _b, programData = __rest(_b, ["programId"]);
                if (programId) {
                    // Atualizar programa existente
                    const program = yield LoyaltyProgram_1.LoyaltyProgram.findByIdAndUpdate(programId, { $set: programData }, { new: true, runValidators: true });
                    if (!program) {
                        res.status(404).json({
                            success: false,
                            message: 'Programa não encontrado'
                        });
                        return;
                    }
                    res.status(200).json({
                        success: true,
                        message: 'Programa atualizado com sucesso',
                        data: program
                    });
                }
                else {
                    // Criar novo programa
                    const program = yield LoyaltyProgram_1.LoyaltyProgram.create(Object.assign(Object.assign({}, programData), { vendor: vendorId ? new (yield Promise.resolve().then(() => __importStar(require('mongoose')))).Types.ObjectId(vendorId) : undefined }));
                    res.status(201).json({
                        success: true,
                        message: 'Programa criado com sucesso',
                        data: program
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Error creating/updating program:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar/atualizar programa'
                });
            }
        });
        /**
         * GET /loyalty/program - Obter programa de fidelidade
         */
        this.getProgram = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vendorId } = req.query;
                const program = yield loyalty_service_1.loyaltyService.getActiveProgram(vendorId);
                if (!program) {
                    res.status(404).json({
                        success: false,
                        message: 'Programa de fidelidade não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: program
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching program:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao buscar programa'
                });
            }
        });
    }
}
exports.LoyaltyController = LoyaltyController;
exports.default = new LoyaltyController();
