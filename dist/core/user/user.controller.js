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
exports.UserController = void 0;
const user_service_1 = require("./user.service");
const User_1 = require("../../models/User");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
const normalizeAddressPayload = (address) => {
    const rawStreet = typeof address.street === 'string' ? address.street.trim() : '';
    const streetParts = rawStreet.split(/\s+/).filter(Boolean);
    const streetType = address.streetType || streetParts[0] || 'Rua';
    const streetName = address.streetName ||
        (streetParts.length > 1 ? streetParts.slice(1).join(' ') : rawStreet || 'Sem nome');
    return Object.assign(Object.assign({}, address), { streetType,
        streetName, number: address.number || 'S/N', province: address.province || address.city || 'Não informado' });
};
class UserController {
    constructor() {
        /**
         * GET /users/profile - Buscar perfil do usuário autenticado
         */
        this.getProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            console.log('CHEGOU =>', (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub);
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_b = req.clerkPayload) === null || _b === void 0 ? void 0 : _b.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ userId: clerkId });
                console.log('USER =>', user);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: user
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching user profile:', error);
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar perfil'
                });
            }
        });
        /**
         * PUT /users/profile - Atualizar perfil do usuário autenticado
         */
        this.updateProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Buscar usuário pelo clerkId
                const clerkId = (_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub;
                if (!clerkId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não autenticado'
                    });
                    return;
                }
                const user = yield User_1.User.findOne({ userId: clerkId });
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                const updateData = req.body;
                const updatedUser = yield this.userService.updateUser(clerkId, updateData);
                res.status(200).json({
                    success: true,
                    message: 'Perfil atualizado com sucesso',
                    data: updatedUser
                });
            }
            catch (error) {
                logger_1.logger.error('Error updating user profile:', error);
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar perfil'
                });
            }
        });
        /**
         * POST /users - Criar novo usuário
         */
        this.createUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userData = req.body;
                // Validações básicas
                if (!userData.userId || !userData.role) {
                    res.status(400).json({
                        success: false,
                        message: 'userId e role são obrigatórios'
                    });
                    return;
                }
                const user = yield this.userService.createUser(userData);
                res.status(201).json({
                    success: true,
                    message: 'Usuário criado com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao criar usuário'
                });
            }
        });
        /**
         * GET /users/:userId - Buscar usuário por ID
         */
        this.getUserById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const user = yield this.userService.getUserById(userId);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: user
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar usuário'
                });
            }
        });
        /**
         * GET /users/email/:email - Buscar usuário por email
         */
        this.getUserByEmail = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.params;
                const user = yield this.userService.getUserByEmail(email);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: user
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar usuário'
                });
            }
        });
        /**
         * GET /users/phone/:phoneNumber - Buscar usuário por telefone
         */
        this.getUserByPhone = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { phoneNumber } = req.params;
                const user = yield this.userService.getUserByPhone(phoneNumber);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    data: user
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar usuário'
                });
            }
        });
        /**
         * GET /users - Listar todos os usuários com paginação
         */
        this.getAllUsers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = yield this.userService.getAllUsers(page, limit);
                res.status(200).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao listar usuários'
                });
            }
        });
        /**
         * GET /users/role/:role - Buscar usuários por role
         */
        this.getUsersByRole = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { role } = req.params;
                if (!['customer', 'driver', 'vendor'].includes(role)) {
                    res.status(400).json({
                        success: false,
                        message: 'Role inválido. Use: customer, driver ou vendor'
                    });
                    return;
                }
                const users = yield this.userService.getUsersByRole(role);
                res.status(200).json({
                    success: true,
                    data: users
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar usuários'
                });
            }
        });
        /**
         * PUT /users/:userId - Atualizar usuário
         */
        this.updateUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const updateData = req.body;
                // Remover campos que não devem ser atualizados diretamente
                delete updateData.userId;
                delete updateData._id;
                delete updateData.createdAt;
                delete updateData.updatedAt;
                const user = yield this.userService.updateUser(userId, updateData);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Usuário atualizado com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar usuário'
                });
            }
        });
        /**
         * DELETE /users/:userId - Desativar usuário
         */
        this.deactivateUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const success = yield this.userService.deactivateUser(userId);
                if (!success) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Usuário desativado com sucesso'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao desativar usuário'
                });
            }
        });
        /**
         * PATCH /users/:userId/reactivate - Reativar usuário
         */
        this.reactivateUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const success = yield this.userService.reactivateUser(userId);
                if (!success) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Usuário reativado com sucesso'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao reativar usuário'
                });
            }
        });
        /**
         * POST /users/:userId/addresses - Adicionar endereço de entrega
         */
        this.addDeliveryAddress = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const address = normalizeAddressPayload(req.body);
                const user = yield this.userService.addDeliveryAddress(userId, address);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Endereço adicionado com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao adicionar endereço'
                });
            }
        });
        /**
         * DELETE /users/:userId/addresses/:addressId - Remover endereço
         */
        this.removeDeliveryAddress = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, addressId } = req.params;
                const user = yield this.userService.removeDeliveryAddress(userId, addressId);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Endereço removido com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao remover endereço'
                });
            }
        });
        /**
         * PUT /users/:userId/addresses/:addressId - Atualizar endereço
         */
        this.updateDeliveryAddress = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, addressId } = req.params;
                const addressData = normalizeAddressPayload(req.body);
                const user = yield this.userService.updateDeliveryAddress(userId, addressId, addressData);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário ou endereço não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Endereço atualizado com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao atualizar endereço'
                });
            }
        });
        /**
         * POST /users/:userId/payment-methods - Adicionar método de pagamento
         */
        this.addPaymentMethod = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { paymentMethod } = req.body;
                if (!['visa', 'm-pesa', 'cash', 'paypal'].includes(paymentMethod)) {
                    res.status(400).json({
                        success: false,
                        message: 'Método de pagamento inválido'
                    });
                    return;
                }
                const user = yield this.userService.addPaymentMethod(userId, paymentMethod);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Método de pagamento adicionado com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao adicionar método de pagamento'
                });
            }
        });
        /**
         * DELETE /users/:userId/payment-methods/:paymentMethod - Remover método de pagamento
         */
        this.removePaymentMethod = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, paymentMethod } = req.params;
                const user = yield this.userService.removePaymentMethod(userId, paymentMethod);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Método de pagamento removido com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao remover método de pagamento'
                });
            }
        });
        /**
         * POST /users/:userId/loyalty-points/add - Adicionar pontos de fidelidade
         */
        this.addLoyaltyPoints = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { points } = req.body;
                if (!points || points <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Pontos devem ser um número positivo'
                    });
                    return;
                }
                const user = yield this.userService.addLoyaltyPoints(userId, points);
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Pontos de fidelidade adicionados com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao adicionar pontos'
                });
            }
        });
        /**
         * POST /users/:userId/loyalty-points/use - Usar pontos de fidelidade
         */
        this.useLoyaltyPoints = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { points } = req.body;
                if (!points || points <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Quantidade de pontos deve ser maior que zero'
                    });
                    return;
                }
                const user = yield this.userService.useLoyaltyPoints(userId, points);
                res.status(200).json({
                    success: true,
                    message: 'Pontos utilizados com sucesso',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao usar pontos'
                });
            }
        });
        /**
         * POST /users/:userId/orders - Adicionar pedido ao histórico
         */
        this.addOrderToHistory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { orderId } = req.body;
                if (!mongoose_1.Types.ObjectId.isValid(orderId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do pedido inválido'
                    });
                    return;
                }
                const user = yield this.userService.addOrderToHistory(userId, new mongoose_1.Types.ObjectId(orderId));
                if (!user) {
                    res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'Pedido adicionado ao histórico',
                    data: user
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: error.message || 'Erro ao adicionar pedido'
                });
            }
        });
        /**
         * GET /users/:userId/orders - Buscar histórico de pedidos
         */
        this.getUserOrderHistory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const orders = yield this.userService.getUserOrderHistory(userId);
                res.status(200).json({
                    success: true,
                    data: orders
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar histórico'
                });
            }
        });
        /**
         * GET /users/stats/by-role - Estatísticas por role
         */
        this.getUserStatsByRole = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.userService.countUsersByRole();
                res.status(200).json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar estatísticas'
                });
            }
        });
        /**
         * GET /users/top-loyalty - Top usuários por pontos de fidelidade
         */
        this.getTopLoyaltyUsers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const limit = parseInt(req.query.limit) || 10;
                const users = yield this.userService.getTopLoyaltyUsers(limit);
                res.status(200).json({
                    success: true,
                    data: users
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar top usuários'
                });
            }
        });
        /**
         * GET /users/:userId/exists - Verificar se usuário existe
         */
        this.checkUserExists = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const exists = yield this.userService.userExists(userId);
                res.status(200).json({
                    success: true,
                    data: { exists }
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao verificar usuário'
                });
            }
        });
        this.userService = new user_service_1.UserService();
    }
}
exports.UserController = UserController;
