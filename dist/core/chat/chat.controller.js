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
exports.chatController = exports.ChatController = void 0;
const chat_service_1 = require("./chat.service");
class ChatController {
    constructor() {
        this.createOrGetContextConversation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getCurrentUser(req);
                const { orderId, scope = 'customer_vendor' } = req.body;
                if (!orderId) {
                    res.status(400).json({
                        success: false,
                        message: 'orderId é obrigatório'
                    });
                    return;
                }
                const conversation = yield chat_service_1.chatService.ensureContextConversationForOrder(orderId, scope);
                const payload = yield chat_service_1.chatService.getConversationForUser(conversation._id.toString(), user._id.toString());
                res.status(200).json({
                    success: true,
                    data: payload
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao preparar conversa'
                });
            }
        });
        this.listConversations = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getCurrentUser(req);
                const conversations = yield chat_service_1.chatService.listConversationsForUser(user._id.toString(), {
                    orderId: req.query.orderId,
                    scope: req.query.scope
                });
                res.status(200).json({
                    success: true,
                    data: conversations
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao listar conversas'
                });
            }
        });
        this.getContextAvailability = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getCurrentUser(req);
                const availability = yield chat_service_1.chatService.getContextAvailability(req.params.orderId, user._id.toString());
                res.status(200).json({
                    success: true,
                    data: availability
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao buscar disponibilidade do chat'
                });
            }
        });
        this.getConversation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getCurrentUser(req);
                const conversation = yield chat_service_1.chatService.getConversationForUser(req.params.conversationId, user._id.toString());
                res.status(200).json({
                    success: true,
                    data: conversation
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao buscar conversa'
                });
            }
        });
        this.listMessages = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getCurrentUser(req);
                const messages = yield chat_service_1.chatService.getMessagesForUser(req.params.conversationId, user._id.toString(), {
                    before: req.query.before,
                    limit: req.query.limit ? Number(req.query.limit) : undefined
                });
                res.status(200).json({
                    success: true,
                    data: messages
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao listar mensagens'
                });
            }
        });
        this.sendMessage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const user = yield this.getCurrentUser(req);
                const result = yield chat_service_1.chatService.sendMessage(req.params.conversationId, user._id.toString(), {
                    body: (_a = req.body) === null || _a === void 0 ? void 0 : _a.body,
                    type: (_b = req.body) === null || _b === void 0 ? void 0 : _b.type,
                    metadata: (_c = req.body) === null || _c === void 0 ? void 0 : _c.metadata
                });
                res.status(201).json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao enviar mensagem'
                });
            }
        });
        this.markRead = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.getCurrentUser(req);
                const conversation = yield chat_service_1.chatService.markConversationRead(req.params.conversationId, user._id.toString());
                res.status(200).json({
                    success: true,
                    data: conversation
                });
            }
            catch (error) {
                res.status(this.getErrorStatus(error)).json({
                    success: false,
                    message: error.message || 'Erro ao marcar conversa como lida'
                });
            }
        });
    }
    getCurrentUser(req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return chat_service_1.chatService.resolveAuthenticatedUser((_a = req.clerkPayload) === null || _a === void 0 ? void 0 : _a.sub);
        });
    }
    getErrorStatus(error) {
        if (error.message === 'Usuário não autenticado') {
            return 401;
        }
        if (error.message === 'Usuário não encontrado') {
            return 404;
        }
        if (error.message.includes('não encontrado')) {
            return 404;
        }
        if (error.message.includes('não tem acesso')) {
            return 403;
        }
        return 400;
    }
}
exports.ChatController = ChatController;
exports.chatController = new ChatController();
