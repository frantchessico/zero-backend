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
exports.loyaltyService = exports.LoyaltyService = void 0;
const mongoose_1 = require("mongoose");
const User_1 = require("../../models/User");
const LoyaltyProgram_1 = require("../../models/LoyaltyProgram");
const LoyaltyTransaction_1 = require("../../models/LoyaltyTransaction");
const coupon_service_1 = require("../coupon/coupon.service");
const logger_1 = require("../../utils/logger");
const Product_1 = __importDefault(require("../../models/Product"));
class LoyaltyService {
    getUserPoints(user) {
        var _a;
        return (_a = user.loyaltyPoints) !== null && _a !== void 0 ? _a : 0;
    }
    getAvailablePointsBalance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const now = new Date();
            const aggregates = yield LoyaltyTransaction_1.LoyaltyTransaction.aggregate([
                {
                    $match: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        $or: [
                            { expiresAt: { $exists: false } },
                            { expiresAt: null },
                            { expiresAt: { $gte: now } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$points' }
                    }
                }
            ]);
            return Math.max(0, ((_a = aggregates[0]) === null || _a === void 0 ? void 0 : _a.total) || 0);
        });
    }
    /**
     * Obter programa de fidelidade ativo (global ou do vendor)
     */
    getActiveProgram(vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = { isActive: true };
            if (vendorId) {
                query.$or = [
                    { vendor: new mongoose_1.Types.ObjectId(vendorId) },
                    { vendor: { $exists: false } } // Programa global
                ];
            }
            else {
                query.vendor = { $exists: false }; // Apenas programa global
            }
            // Priorizar programa do vendor sobre global
            const vendorProgram = vendorId
                ? yield LoyaltyProgram_1.LoyaltyProgram.findOne({ vendor: new mongoose_1.Types.ObjectId(vendorId), isActive: true }).exec()
                : null;
            if (vendorProgram)
                return vendorProgram;
            return yield LoyaltyProgram_1.LoyaltyProgram.findOne({ vendor: { $exists: false }, isActive: true }).exec();
        });
    }
    /**
     * Calcular pontos ganhos baseado no valor do pedido
     */
    calculatePointsEarned(orderTotal, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield this.getActiveProgram(vendorId);
            if (!program)
                return 0;
            // Verificar valor mínimo
            if (program.minOrderAmountForPoints && orderTotal < program.minOrderAmountForPoints) {
                return 0;
            }
            // Calcular pontos: orderTotal * pointsPerCurrency
            const points = Math.floor(orderTotal * program.pointsPerCurrency);
            return points;
        });
    }
    /**
     * Adicionar pontos ao usuário (após pedido entregue)
     */
    earnPoints(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, orderId, orderTotal, vendorId, reason } = params;
            if (orderId) {
                const existingTransaction = yield LoyaltyTransaction_1.LoyaltyTransaction.findOne({
                    user: new mongoose_1.Types.ObjectId(userId),
                    order: new mongoose_1.Types.ObjectId(orderId),
                    type: 'earned'
                }).exec();
                if (existingTransaction) {
                    return { points: existingTransaction.points, transaction: existingTransaction };
                }
            }
            const points = yield this.calculatePointsEarned(orderTotal, vendorId);
            if (points <= 0) {
                throw new Error('Nenhum ponto a ser ganho para este pedido');
            }
            const user = yield User_1.User.findById(userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            // Obter programa para configurar expiração
            const program = yield this.getActiveProgram(vendorId);
            let expiresAt;
            if (program === null || program === void 0 ? void 0 : program.pointsExpirationDays) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + program.pointsExpirationDays);
            }
            // Atualizar pontos do usuário
            yield User_1.User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } }, { new: true });
            // Criar transação
            const transaction = yield LoyaltyTransaction_1.LoyaltyTransaction.create({
                user: new mongoose_1.Types.ObjectId(userId),
                type: 'earned',
                points,
                description: reason || `Pontos ganhos por pedido de ${orderTotal.toFixed(2)} MT`,
                order: orderId ? new mongoose_1.Types.ObjectId(orderId) : undefined,
                metadata: {
                    orderTotal,
                    pointsPerCurrency: program === null || program === void 0 ? void 0 : program.pointsPerCurrency,
                    reason: reason || 'order_completed'
                },
                expiresAt
            });
            // Verificar se subiu de nível
            yield this.checkAndUpdateLevel(userId, vendorId);
            logger_1.logger.info(`Usuário ${userId} ganhou ${points} pontos`);
            return { points, transaction };
        });
    }
    /**
     * Verificar e atualizar nível do usuário
     */
    checkAndUpdateLevel(userId, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield this.getActiveProgram(vendorId);
            if (!program || !program.levels || program.levels.length === 0) {
                return null;
            }
            const user = yield User_1.User.findById(userId);
            if (!user)
                return null;
            // Ordenar níveis por pontos mínimos (maior primeiro)
            const sortedLevels = [...program.levels].sort((a, b) => b.minPoints - a.minPoints);
            // Encontrar nível atual do usuário
            for (const level of sortedLevels) {
                if (this.getUserPoints(user) >= level.minPoints) {
                    // Verificar se já está neste nível (poderia salvar no User, mas por simplicidade retornamos)
                    return level.name;
                }
            }
            return null;
        });
    }
    /**
     * Obter nível atual do usuário
     */
    getCurrentLevel(userId, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield this.getActiveProgram(vendorId);
            if (!program || !program.levels || program.levels.length === 0) {
                return null;
            }
            const user = yield User_1.User.findById(userId);
            if (!user)
                return null;
            const sortedLevels = [...program.levels].sort((a, b) => b.minPoints - a.minPoints);
            for (const level of sortedLevels) {
                if (this.getUserPoints(user) >= level.minPoints) {
                    return level;
                }
            }
            return null;
        });
    }
    /**
     * Obter próximo nível do usuário
     */
    getNextLevel(userId, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield this.getActiveProgram(vendorId);
            if (!program || !program.levels || program.levels.length === 0) {
                return null;
            }
            const user = yield User_1.User.findById(userId);
            if (!user)
                return null;
            const sortedLevels = [...program.levels].sort((a, b) => a.minPoints - b.minPoints);
            for (const level of sortedLevels) {
                if (this.getUserPoints(user) < level.minPoints) {
                    return Object.assign(Object.assign({}, level), { pointsNeeded: level.minPoints - this.getUserPoints(user) });
                }
            }
            return null; // Já está no nível máximo
        });
    }
    /**
     * Obter status completo de fidelidade do usuário
     */
    getUserLoyaltyStatus(userId, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const user = yield User_1.User.findById(userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            const currentLevel = yield this.getCurrentLevel(userId, vendorId);
            const nextLevel = yield this.getNextLevel(userId, vendorId);
            const availablePoints = yield this.getAvailablePointsBalance(userId);
            // Calcular pontos expirando em breve (próximos 30 dias)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const expiringTransactions = yield LoyaltyTransaction_1.LoyaltyTransaction.find({
                user: new mongoose_1.Types.ObjectId(userId),
                type: 'earned',
                expiresAt: { $lte: thirtyDaysFromNow, $gte: new Date() }
            }).exec();
            const pointsExpiringSoon = expiringTransactions.reduce((sum, t) => sum + t.points, 0);
            // Calcular totais
            const [totalEarned, totalRedeemed] = yield Promise.all([
                LoyaltyTransaction_1.LoyaltyTransaction.aggregate([
                    { $match: { user: new mongoose_1.Types.ObjectId(userId), type: 'earned' } },
                    { $group: { _id: null, total: { $sum: '$points' } } }
                ]),
                LoyaltyTransaction_1.LoyaltyTransaction.aggregate([
                    { $match: { user: new mongoose_1.Types.ObjectId(userId), type: 'redeemed' } },
                    { $group: { _id: null, total: { $sum: { $abs: '$points' } } } }
                ])
            ]);
            // Buscar últimas transações
            const transactions = yield LoyaltyTransaction_1.LoyaltyTransaction.find({ user: new mongoose_1.Types.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('order', 'total status')
                .exec();
            return {
                userId: user._id.toString(),
                totalPoints: this.getUserPoints(user),
                availablePoints,
                currentLevel,
                nextLevel,
                pointsExpiringSoon,
                totalEarned: ((_a = totalEarned[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
                totalRedeemed: ((_b = totalRedeemed[0]) === null || _b === void 0 ? void 0 : _b.total) || 0,
                transactions
            };
        });
    }
    /**
     * Resgatar recompensa (trocar pontos por cupom/desconto)
     */
    redeemReward(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, rewardId, vendorId } = params;
            const program = yield this.getActiveProgram(vendorId);
            if (!program) {
                throw new Error('Programa de fidelidade não encontrado');
            }
            const reward = program.rewards.find((r) => { var _a; return ((_a = r._id) === null || _a === void 0 ? void 0 : _a.toString()) === rewardId; });
            if (!reward || !reward.isActive) {
                throw new Error('Recompensa não encontrada ou inativa');
            }
            const user = yield User_1.User.findById(userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            const availablePoints = yield this.getAvailablePointsBalance(userId);
            if (availablePoints < reward.pointsRequired) {
                throw new Error('Pontos insuficientes para resgatar esta recompensa');
            }
            // Deduzir pontos
            yield User_1.User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: -reward.pointsRequired } }, { new: true });
            // Criar transação
            const transaction = yield LoyaltyTransaction_1.LoyaltyTransaction.create({
                user: new mongoose_1.Types.ObjectId(userId),
                type: 'redeemed',
                points: -reward.pointsRequired,
                description: `Recompensa resgatada: ${reward.name}`,
                reward: new mongoose_1.Types.ObjectId(rewardId),
                metadata: {
                    reason: 'reward_redemption',
                    rewardName: reward.name
                }
            });
            let coupon = null;
            try {
                const couponCode = `LOYALTY${Date.now().toString().slice(-6)}`;
                const baseCouponData = {
                    vendorId,
                    code: couponCode,
                    title: reward.name,
                    description: reward.description || `Recompensa resgatada com ${reward.pointsRequired} pontos`,
                    maxUses: 1,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                };
                if (reward.type === 'coupon' && reward.value) {
                    coupon = yield coupon_service_1.couponService.createCoupon(Object.assign(Object.assign({}, baseCouponData), { type: 'percentage', value: reward.value, scope: 'order_total' }));
                }
                else if (reward.type === 'discount' && reward.value) {
                    coupon = yield coupon_service_1.couponService.createCoupon(Object.assign(Object.assign({}, baseCouponData), { type: reward.value <= 100 ? 'percentage' : 'fixed', value: reward.value, scope: 'order_total' }));
                }
                else if (reward.type === 'free_delivery') {
                    coupon = yield coupon_service_1.couponService.createCoupon(Object.assign(Object.assign({}, baseCouponData), { type: 'fixed', value: reward.value || 999999, scope: 'delivery_fee' }));
                }
                else if (reward.type === 'product' && reward.value) {
                    const product = yield Product_1.default.findById(reward.value).exec();
                    if (!product) {
                        throw new Error('Produto de recompensa não encontrado');
                    }
                    coupon = yield coupon_service_1.couponService.createCoupon(Object.assign(Object.assign({}, baseCouponData), { vendorId: product.vendor.toString(), description: reward.description ||
                            `Produto resgatado: ${product.name}. Cupom equivalente ao valor do produto.`, type: 'fixed', value: product.price, scope: 'order_total' }));
                }
                if (coupon) {
                    yield LoyaltyTransaction_1.LoyaltyTransaction.findByIdAndUpdate(transaction._id, {
                        coupon: coupon._id
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Erro ao criar benefício de recompensa:', error);
            }
            logger_1.logger.info(`Usuário ${userId} resgatou recompensa ${reward.name} por ${reward.pointsRequired} pontos`);
            return { coupon, transaction };
        });
    }
    /**
     * Adicionar pontos de bônus (aniversário, indicação, etc.)
     */
    addBonusPoints(userId, points, reason, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.User.findById(userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            yield User_1.User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: points } }, { new: true });
            const program = yield this.getActiveProgram(vendorId);
            let expiresAt;
            if (program === null || program === void 0 ? void 0 : program.pointsExpirationDays) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + program.pointsExpirationDays);
            }
            const transaction = yield LoyaltyTransaction_1.LoyaltyTransaction.create({
                user: new mongoose_1.Types.ObjectId(userId),
                type: 'bonus',
                points,
                description: reason,
                metadata: { reason: 'bonus' },
                expiresAt
            });
            return transaction;
        });
    }
    getAutomaticDiscount(userId, orderTotal, vendorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentLevel = yield this.getCurrentLevel(userId, vendorId);
            if (!(currentLevel === null || currentLevel === void 0 ? void 0 : currentLevel.discountPercentage)) {
                return 0;
            }
            return Number(((orderTotal * currentLevel.discountPercentage) / 100).toFixed(2));
        });
    }
}
exports.LoyaltyService = LoyaltyService;
exports.loyaltyService = new LoyaltyService();
