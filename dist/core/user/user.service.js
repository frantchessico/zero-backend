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
exports.UserService = void 0;
const models_1 = require("../../models");
class UserService {
    buildUserLookup(identifier, isActive) {
        const filters = {
            $or: [{ userId: identifier }, { clerkId: identifier }],
        };
        if (typeof isActive === 'boolean') {
            filters.isActive = isActive;
        }
        return filters;
    }
    /**
     * Criar um novo usuário
     */
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const duplicateConditions = [];
                if (userData.userId) {
                    duplicateConditions.push({ userId: userData.userId });
                }
                if (userData.email) {
                    duplicateConditions.push({ email: userData.email });
                }
                if (userData.clerkId) {
                    duplicateConditions.push({ clerkId: userData.clerkId });
                }
                if (duplicateConditions.length > 0) {
                    const existingUser = yield models_1.User.findOne({ $or: duplicateConditions }).lean().exec();
                    if (existingUser) {
                        throw new Error('Usuário já existe com esse email ou userId');
                    }
                }
                const user = new models_1.User(userData);
                return yield user.save();
            }
            catch (error) {
                if (error.code === 11000) {
                    throw new Error('Usuário já existe com esse email ou userId');
                }
                throw error;
            }
        });
    }
    /**
     * Buscar usuário por ID
     */
    getUserById(identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOne(this.buildUserLookup(identifier, true))
                .populate('orderHistory')
                .exec();
        });
    }
    /**
     * Buscar usuário por email
     */
    getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOne({ email, isActive: true })
                .populate('orderHistory')
                .exec();
        });
    }
    /**
     * Buscar usuários por role
     */
    getUsersByRole(role) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.find({ role, isActive: true })
                .populate('orderHistory')
                .exec();
        });
    }
    /**
     * Atualizar dados do usuário
     */
    updateUser(identifier, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $set: updateData }, { new: true, runValidators: true }).populate('orderHistory');
        });
    }
    /**
     * Desativar usuário (soft delete)
     */
    deactivateUser(identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier), { $set: { isActive: false } });
            return !!result;
        });
    }
    /**
     * Reativar usuário
     */
    reactivateUser(identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier), { $set: { isActive: true } });
            return !!result;
        });
    }
    /**
     * Adicionar endereço de entrega
     */
    addDeliveryAddress(identifier, address) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $push: { deliveryAddresses: address } }, { new: true });
        });
    }
    /**
     * Remover endereço de entrega
     */
    removeDeliveryAddress(identifier, addressId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $pull: { deliveryAddresses: { _id: addressId } } }, { new: true });
        });
    }
    /**
     * Atualizar endereço de entrega
     */
    updateDeliveryAddress(identifier, addressId, addressData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(Object.assign(Object.assign({}, this.buildUserLookup(identifier, true)), { 'deliveryAddresses._id': addressId }), { $set: { 'deliveryAddresses.$': Object.assign(Object.assign({}, addressData), { _id: addressId }) } }, { new: true });
        });
    }
    /**
     * Adicionar método de pagamento
     */
    addPaymentMethod(identifier, paymentMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $addToSet: { paymentMethods: paymentMethod } }, { new: true });
        });
    }
    /**
     * Remover método de pagamento
     */
    removePaymentMethod(identifier, paymentMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $pull: { paymentMethods: paymentMethod } }, { new: true });
        });
    }
    /**
     * Adicionar pontos de fidelidade
     */
    addLoyaltyPoints(identifier, points) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $inc: { loyaltyPoints: points } }, { new: true });
        });
    }
    /**
     * Usar pontos de fidelidade
     */
    useLoyaltyPoints(identifier, points) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield models_1.User.findOne(this.buildUserLookup(identifier, true));
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
            if (((_a = user.loyaltyPoints) !== null && _a !== void 0 ? _a : 0) < points) {
                throw new Error('Pontos insuficientes');
            }
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $inc: { loyaltyPoints: -points } }, { new: true });
        });
    }
    /**
     * Adicionar pedido ao histórico
     */
    addOrderToHistory(identifier, orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOneAndUpdate(this.buildUserLookup(identifier, true), { $push: { orderHistory: orderId } }, { new: true }).populate('orderHistory');
        });
    }
    /**
     * Buscar histórico de pedidos do usuário
     */
    getUserOrderHistory(identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findOne(this.buildUserLookup(identifier, true))
                .populate('orderHistory')
                .exec();
            return (user === null || user === void 0 ? void 0 : user.orderHistory) || [];
        });
    }
    /**
     * Listar todos os usuários ativos com paginação
     */
    getAllUsers() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 10) {
            const skip = (page - 1) * limit;
            const [users, total] = yield Promise.all([
                models_1.User.find({ isActive: true })
                    .populate('orderHistory')
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: -1 })
                    .exec(),
                models_1.User.countDocuments({ isActive: true })
            ]);
            return {
                users,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        });
    }
    /**
     * Buscar usuários por telefone
     */
    getUserByPhone(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield models_1.User.findOne({ phoneNumber, isActive: true })
                .populate('orderHistory')
                .exec();
        });
    }
    /**
     * Verificar se usuário existe
     */
    userExists(identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield models_1.User.findOne(this.buildUserLookup(identifier));
            return !!user;
        });
    }
    /**
     * Contar usuários por role
     */
    countUsersByRole() {
        return __awaiter(this, void 0, void 0, function* () {
            const [customers, drivers, vendors] = yield Promise.all([
                models_1.User.countDocuments({ role: 'customer', isActive: true }),
                models_1.User.countDocuments({ role: 'driver', isActive: true }),
                models_1.User.countDocuments({ role: 'vendor', isActive: true })
            ]);
            return {
                customers,
                drivers,
                vendors,
                total: customers + drivers + vendors
            };
        });
    }
    /**
     * Buscar usuários com mais pontos de fidelidade
     */
    getTopLoyaltyUsers() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            return yield models_1.User.find({ isActive: true })
                .sort({ loyaltyPoints: -1 })
                .limit(limit)
                .exec();
        });
    }
}
exports.UserService = UserService;
