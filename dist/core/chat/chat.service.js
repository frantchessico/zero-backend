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
exports.chatService = exports.ChatService = void 0;
const mongoose_1 = require("mongoose");
const ChatConversation_1 = require("../../models/ChatConversation");
const ChatMessage_1 = require("../../models/ChatMessage");
const Delivery_1 = require("../../models/Delivery");
const Order_1 = require("../../models/Order");
const User_1 = require("../../models/User");
const Vendor_1 = require("../../models/Vendor");
const tracking_gateway_1 = require("../../realtime/tracking.gateway");
class ChatService {
    conversationRoom(conversationId) {
        return `chat:${conversationId}`;
    }
    normalizeMessageBody(body) {
        return body.replace(/\s+/g, ' ').trim();
    }
    resolveUserBySubject(subject) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield User_1.User.findOne({
                $or: [{ clerkId: subject }, { userId: subject }]
            }).exec();
            if (!user || !user.isActive) {
                throw new Error('Usuário não encontrado');
            }
            return user;
        });
    }
    resolveAuthenticatedUser(subject) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!subject) {
                throw new Error('Usuário não autenticado');
            }
            return this.resolveUserBySubject(subject);
        });
    }
    roleLabel(role, vendorName) {
        switch (role) {
            case 'customer':
                return 'Cliente';
            case 'driver':
                return 'Entregador';
            case 'vendor':
                return vendorName ? `Loja ${vendorName}` : 'Loja';
            case 'admin':
                return 'Admin';
            case 'support':
                return 'Suporte';
            default:
                return 'Participante';
        }
    }
    buildScopeTitle(scope, vendorName) {
        switch (scope) {
            case 'customer_vendor':
                return vendorName;
            case 'customer_driver':
                return 'Entregador da entrega';
            case 'driver_vendor':
                return `${vendorName} · Operacao`;
            case 'support':
                return 'Suporte Zero';
            default:
                return 'Chat operacional';
        }
    }
    buildScopeSubtitle(scope) {
        switch (scope) {
            case 'customer_vendor':
                return 'Canal do pedido entre cliente e loja';
            case 'customer_driver':
                return 'Canal do pedido entre cliente e entregador';
            case 'driver_vendor':
                return 'Canal operacional entre loja e entregador';
            case 'support':
                return 'Canal de suporte do pedido';
            default:
                return 'Canal contextual do pedido';
        }
    }
    summarizeMessage(body, type) {
        if (type === 'system') {
            return body.slice(0, 120);
        }
        return body.length > 120 ? `${body.slice(0, 117)}...` : body;
    }
    serializeParticipants(participants) {
        return participants.map((participant) => ({
            user: participant.user.toString(),
            role: participant.role,
            label: participant.label
        }));
    }
    serializeConversation(conversation, currentUserId) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const unreadCounts = conversation.unreadCounts instanceof Map
            ? Object.fromEntries(conversation.unreadCounts.entries())
            : conversation.unreadCounts || {};
        return {
            id: conversation._id.toString(),
            contextType: conversation.contextType,
            scope: conversation.scope,
            orderId: ((_b = (_a = conversation.order) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || String(conversation.order),
            deliveryId: ((_d = (_c = conversation.delivery) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) || undefined,
            vendorId: ((_f = (_e = conversation.vendor) === null || _e === void 0 ? void 0 : _e.toString) === null || _f === void 0 ? void 0 : _f.call(_e)) || undefined,
            title: conversation.title,
            subtitle: conversation.subtitle,
            isActive: conversation.isActive,
            participants: this.serializeParticipants(conversation.participants || []),
            lastMessagePreview: conversation.lastMessagePreview,
            lastMessageAt: conversation.lastMessageAt,
            lastMessageSender: ((_h = (_g = conversation.lastMessageSender) === null || _g === void 0 ? void 0 : _g.toString) === null || _h === void 0 ? void 0 : _h.call(_g)) || undefined,
            unreadCount: Number(unreadCounts[currentUserId] || 0),
            room: this.conversationRoom(conversation._id.toString())
        };
    }
    serializeMessage(message) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return {
            id: message._id.toString(),
            conversationId: ((_b = (_a = message.conversation) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || String(message.conversation),
            orderId: ((_d = (_c = message.order) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) || String(message.order),
            deliveryId: ((_f = (_e = message.delivery) === null || _e === void 0 ? void 0 : _e.toString) === null || _f === void 0 ? void 0 : _f.call(_e)) || undefined,
            senderId: ((_h = (_g = message.sender) === null || _g === void 0 ? void 0 : _g.toString) === null || _h === void 0 ? void 0 : _h.call(_g)) || undefined,
            senderRole: message.senderRole,
            type: message.type,
            body: message.body,
            metadata: message.metadata || {},
            readBy: (message.readBy || []).map((receipt) => {
                var _a, _b;
                return ({
                    user: ((_b = (_a = receipt.user) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || String(receipt.user),
                    readAt: receipt.readAt
                });
            }),
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
        };
    }
    buildScopeConfig(orderId, scope) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId).exec();
            if (!order) {
                throw new Error('Pedido não encontrado');
            }
            const vendor = yield Vendor_1.Vendor.findById(order.vendor).populate('owner', 'userId role').exec();
            if (!vendor) {
                throw new Error('Vendor não encontrado');
            }
            const customer = yield User_1.User.findById(order.customer).exec();
            if (!customer) {
                throw new Error('Cliente não encontrado');
            }
            const delivery = yield Delivery_1.Delivery.findOne({ order: order._id }).sort({ createdAt: -1 }).exec();
            const driver = (delivery === null || delivery === void 0 ? void 0 : delivery.driver) ? yield User_1.User.findById(delivery.driver).exec() : null;
            const customerParticipant = {
                user: customer._id,
                role: 'customer',
                label: this.roleLabel('customer')
            };
            const vendorParticipant = {
                user: vendor.owner,
                role: 'vendor',
                label: this.roleLabel('vendor', vendor.name)
            };
            const driverParticipant = driver
                ? {
                    user: driver._id,
                    role: 'driver',
                    label: this.roleLabel('driver')
                }
                : null;
            let participants = [];
            switch (scope) {
                case 'customer_vendor':
                    participants = [customerParticipant, vendorParticipant];
                    break;
                case 'customer_driver':
                    if (!driverParticipant || !delivery) {
                        throw new Error('Entrega ainda não possui driver associado');
                    }
                    participants = [customerParticipant, driverParticipant];
                    break;
                case 'driver_vendor':
                    if (!driverParticipant || !delivery) {
                        throw new Error('Entrega ainda não possui driver associado');
                    }
                    participants = [driverParticipant, vendorParticipant];
                    break;
                case 'support': {
                    const admins = yield User_1.User.find({ role: 'admin', isActive: true }).limit(3).exec();
                    participants = [
                        customerParticipant,
                        vendorParticipant,
                        ...(driverParticipant ? [driverParticipant] : []),
                        ...admins.map((admin) => ({
                            user: admin._id,
                            role: 'admin',
                            label: this.roleLabel('admin')
                        }))
                    ];
                    break;
                }
                default:
                    participants = [customerParticipant, vendorParticipant];
            }
            const uniqueParticipants = participants.filter((participant, index, array) => array.findIndex((entry) => entry.user.toString() === participant.user.toString()) === index);
            return {
                title: this.buildScopeTitle(scope, vendor.name),
                subtitle: this.buildScopeSubtitle(scope),
                participants: uniqueParticipants,
                participantIds: uniqueParticipants.map((participant) => participant.user)
            };
        });
    }
    appendSystemMessageIfNeeded(conversation, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingMessage = yield ChatMessage_1.ChatMessage.findOne({ conversation: conversation._id }).select('_id').lean().exec();
            if (existingMessage) {
                return;
            }
            yield this.createSystemMessage(conversation._id.toString(), body);
        });
    }
    ensureContextConversationForOrder(orderId, scope) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.buildScopeConfig(orderId, scope);
            const order = yield Order_1.Order.findById(orderId).exec();
            const delivery = yield Delivery_1.Delivery.findOne({ order: orderId }).sort({ createdAt: -1 }).select('_id').lean().exec();
            const conversation = yield ChatConversation_1.ChatConversation.findOneAndUpdate({ order: orderId, scope }, {
                $set: {
                    contextType: 'order',
                    vendor: order === null || order === void 0 ? void 0 : order.vendor,
                    delivery: delivery === null || delivery === void 0 ? void 0 : delivery._id,
                    title: config.title,
                    subtitle: config.subtitle,
                    participants: config.participants,
                    participantIds: config.participantIds,
                    isActive: true
                },
                $setOnInsert: {
                    lastMessageAt: new Date()
                }
            }, {
                new: true,
                upsert: true
            }).exec();
            yield this.appendSystemMessageIfNeeded(conversation, `${config.subtitle}. Use este canal apenas para tratar detalhes do pedido e da entrega.`);
            return conversation;
        });
    }
    syncOrderConversations(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const ensured = [];
            ensured.push(yield this.ensureContextConversationForOrder(orderId, 'customer_vendor'));
            try {
                ensured.push(yield this.ensureContextConversationForOrder(orderId, 'customer_driver'));
                ensured.push(yield this.ensureContextConversationForOrder(orderId, 'driver_vendor'));
            }
            catch (_a) {
                // Ainda sem driver associado: mantemos apenas o canal cliente <-> loja.
            }
            return ensured;
        });
    }
    assertConversationAccess(conversationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversation = yield ChatConversation_1.ChatConversation.findById(conversationId).exec();
            if (!conversation || !conversation.isActive) {
                throw new Error('Conversa não encontrada');
            }
            const isParticipant = (conversation.participantIds || []).some((participantId) => participantId.toString() === userId);
            const currentUser = yield User_1.User.findById(userId).select('role').lean().exec();
            const isAdmin = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === 'admin';
            if (!isParticipant && !isAdmin) {
                throw new Error('Você não tem acesso a esta conversa');
            }
            return conversation;
        });
    }
    getConversationForUser(conversationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversation = yield this.assertConversationAccess(conversationId, userId);
            return this.serializeConversation(conversation, userId);
        });
    }
    listConversationsForUser(userId, filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = {
                participantIds: new mongoose_1.Types.ObjectId(userId),
                isActive: true
            };
            if (filters === null || filters === void 0 ? void 0 : filters.orderId) {
                query.order = new mongoose_1.Types.ObjectId(filters.orderId);
            }
            if (filters === null || filters === void 0 ? void 0 : filters.scope) {
                query.scope = filters.scope;
            }
            const conversations = yield ChatConversation_1.ChatConversation.find(query)
                .sort({ lastMessageAt: -1, updatedAt: -1 })
                .exec();
            return conversations.map((conversation) => this.serializeConversation(conversation, userId));
        });
    }
    getContextAvailability(orderId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentUser = yield User_1.User.findById(userId).select('role').lean().exec();
            if (!currentUser) {
                throw new Error('Usuário não encontrado');
            }
            const scopeMatrix = {
                customer: ['customer_vendor', 'customer_driver', 'support'],
                vendor: ['customer_vendor', 'driver_vendor', 'support'],
                driver: ['customer_driver', 'driver_vendor', 'support'],
                admin: ['support']
            };
            const scopes = scopeMatrix[currentUser.role] || ['support'];
            const results = yield Promise.all(scopes.map((scope) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const config = yield this.buildScopeConfig(orderId, scope);
                    const isParticipant = config.participantIds.some((participantId) => participantId.toString() === userId);
                    const existingConversation = yield ChatConversation_1.ChatConversation.findOne({ order: orderId, scope })
                        .select('_id')
                        .lean()
                        .exec();
                    return {
                        scope,
                        label: config.title,
                        description: config.subtitle,
                        available: isParticipant || scope === 'support',
                        reason: isParticipant || scope === 'support' ? undefined : 'Você não participa deste canal',
                        conversationId: (_a = existingConversation === null || existingConversation === void 0 ? void 0 : existingConversation._id) === null || _a === void 0 ? void 0 : _a.toString()
                    };
                }
                catch (error) {
                    return {
                        scope,
                        label: this.buildScopeTitle(scope, 'Zero'),
                        description: this.buildScopeSubtitle(scope),
                        available: false,
                        reason: error.message || 'Canal indisponível'
                    };
                }
            })));
            return {
                orderId,
                options: results
            };
        });
    }
    getMessagesForUser(conversationId, userId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.assertConversationAccess(conversationId, userId);
            const query = {
                conversation: new mongoose_1.Types.ObjectId(conversationId)
            };
            if (options === null || options === void 0 ? void 0 : options.before) {
                query.createdAt = { $lt: new Date(options.before) };
            }
            const limit = Math.min(Math.max((options === null || options === void 0 ? void 0 : options.limit) || 40, 1), 100);
            const messages = yield ChatMessage_1.ChatMessage.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .exec();
            return messages.reverse().map((message) => this.serializeMessage(message));
        });
    }
    computeUnreadCounts(conversation, senderId) {
        const current = conversation.unreadCounts instanceof Map
            ? new Map(conversation.unreadCounts.entries())
            : new Map(Object.entries(conversation.unreadCounts || {}));
        (conversation.participantIds || []).forEach((participantId) => {
            const key = participantId.toString();
            if (senderId && key === senderId) {
                current.set(key, 0);
                return;
            }
            const nextValue = Number(current.get(key) || 0) + 1;
            current.set(key, nextValue);
        });
        return current;
    }
    sendMessage(conversationId, userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversation = yield this.assertConversationAccess(conversationId, userId);
            const normalizedBody = this.normalizeMessageBody(payload.body || '');
            if (!normalizedBody) {
                throw new Error('Mensagem vazia');
            }
            if (normalizedBody.length > 2000) {
                throw new Error('Mensagem excede o limite de 2000 caracteres');
            }
            const participant = (conversation.participants || []).find((entry) => entry.user.toString() === userId);
            if (!participant) {
                throw new Error('Participante inválido para esta conversa');
            }
            const message = yield ChatMessage_1.ChatMessage.create({
                conversation: conversation._id,
                order: conversation.order,
                delivery: conversation.delivery,
                sender: new mongoose_1.Types.ObjectId(userId),
                senderRole: participant.role,
                type: payload.type || 'text',
                body: normalizedBody,
                metadata: payload.metadata || {},
                readBy: [{ user: new mongoose_1.Types.ObjectId(userId), readAt: new Date() }]
            });
            conversation.lastMessagePreview = this.summarizeMessage(normalizedBody, payload.type || 'text');
            conversation.lastMessageAt = message.createdAt || new Date();
            conversation.lastMessageSender = new mongoose_1.Types.ObjectId(userId);
            conversation.unreadCounts = this.computeUnreadCounts(conversation, userId);
            yield conversation.save();
            const serializedConversation = this.serializeConversation(conversation, userId);
            const serializedMessage = this.serializeMessage(message);
            yield tracking_gateway_1.trackingGateway.publishChatEvent(conversationId, 'chat:message', {
                conversation: serializedConversation,
                message: serializedMessage
            });
            return {
                conversation: serializedConversation,
                message: serializedMessage
            };
        });
    }
    createSystemMessage(conversationId, body, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const conversation = yield ChatConversation_1.ChatConversation.findById(conversationId).exec();
            if (!conversation) {
                throw new Error('Conversa não encontrada');
            }
            const normalizedBody = this.normalizeMessageBody(body || '');
            if (!normalizedBody) {
                return null;
            }
            const message = yield ChatMessage_1.ChatMessage.create({
                conversation: conversation._id,
                order: conversation.order,
                delivery: conversation.delivery,
                senderRole: 'system',
                type: 'system',
                body: normalizedBody,
                metadata: metadata || {},
                readBy: []
            });
            conversation.lastMessagePreview = this.summarizeMessage(normalizedBody, 'system');
            conversation.lastMessageAt = message.createdAt || new Date();
            conversation.lastMessageSender = undefined;
            conversation.unreadCounts = this.computeUnreadCounts(conversation, null);
            yield conversation.save();
            yield tracking_gateway_1.trackingGateway.publishChatEvent(conversationId, 'chat:message', {
                conversation: this.serializeConversation(conversation, ((_a = conversation.participantIds[0]) === null || _a === void 0 ? void 0 : _a.toString()) || ''),
                message: this.serializeMessage(message)
            });
            return message;
        });
    }
    markConversationRead(conversationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversation = yield this.assertConversationAccess(conversationId, userId);
            const readAt = new Date();
            yield ChatMessage_1.ChatMessage.updateMany({
                conversation: conversation._id,
                sender: { $ne: new mongoose_1.Types.ObjectId(userId) },
                'readBy.user': { $ne: new mongoose_1.Types.ObjectId(userId) }
            }, {
                $push: {
                    readBy: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        readAt
                    }
                }
            }).exec();
            const unreadCounts = conversation.unreadCounts instanceof Map
                ? new Map(conversation.unreadCounts.entries())
                : new Map(Object.entries(conversation.unreadCounts || {}));
            unreadCounts.set(userId, 0);
            conversation.unreadCounts = unreadCounts;
            yield conversation.save();
            const serializedConversation = this.serializeConversation(conversation, userId);
            yield tracking_gateway_1.trackingGateway.publishChatEvent(conversationId, 'chat:read', {
                conversation: serializedConversation,
                userId,
                readAt: readAt.toISOString()
            });
            return serializedConversation;
        });
    }
}
exports.ChatService = ChatService;
exports.chatService = new ChatService();
