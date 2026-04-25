import { Types } from 'mongoose';
import { ChatConversation } from '../../models/ChatConversation';
import { ChatMessage } from '../../models/ChatMessage';
import { Delivery } from '../../models/Delivery';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';
import type {
  ChatMessageType,
  ChatParticipantRole,
  ChatScope,
  IChatConversation,
  IChatParticipant,
} from '../../models/interfaces';
import { trackingGateway } from '../../realtime/tracking.gateway';

type ScopeConfig = {
  title: string;
  subtitle: string;
  participants: IChatParticipant[];
  participantIds: Types.ObjectId[];
};

type ParticipantSummary = {
  user: string;
  role: ChatParticipantRole;
  label: string;
};

export class ChatService {
  private conversationRoom(conversationId: string) {
    return `chat:${conversationId}`;
  }

  private normalizeMessageBody(body: string) {
    return body.replace(/\s+/g, ' ').trim();
  }

  private async resolveUserBySubject(subject: string) {
    const user = await User.findOne({
      $or: [{ clerkId: subject }, { userId: subject }]
    }).exec();

    if (!user || !user.isActive) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }

  async resolveAuthenticatedUser(subject?: string | null) {
    if (!subject) {
      throw new Error('Usuário não autenticado');
    }

    return this.resolveUserBySubject(subject);
  }

  private roleLabel(role: ChatParticipantRole, vendorName?: string) {
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

  private buildScopeTitle(scope: ChatScope, vendorName: string) {
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

  private buildScopeSubtitle(scope: ChatScope) {
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

  private summarizeMessage(body: string, type: ChatMessageType) {
    if (type === 'system') {
      return body.slice(0, 120);
    }

    return body.length > 120 ? `${body.slice(0, 117)}...` : body;
  }

  private serializeParticipants(participants: IChatParticipant[]): ParticipantSummary[] {
    return participants.map((participant) => ({
      user: participant.user.toString(),
      role: participant.role,
      label: participant.label
    }));
  }

  private serializeConversation(conversation: any, currentUserId: string) {
    const unreadCounts =
      conversation.unreadCounts instanceof Map
        ? Object.fromEntries(conversation.unreadCounts.entries())
        : conversation.unreadCounts || {};

    return {
      id: conversation._id.toString(),
      contextType: conversation.contextType,
      scope: conversation.scope,
      orderId: conversation.order?.toString?.() || String(conversation.order),
      deliveryId: conversation.delivery?.toString?.() || undefined,
      vendorId: conversation.vendor?.toString?.() || undefined,
      title: conversation.title,
      subtitle: conversation.subtitle,
      isActive: conversation.isActive,
      participants: this.serializeParticipants(conversation.participants || []),
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageSender: conversation.lastMessageSender?.toString?.() || undefined,
      unreadCount: Number(unreadCounts[currentUserId] || 0),
      room: this.conversationRoom(conversation._id.toString())
    };
  }

  private serializeMessage(message: any) {
    return {
      id: message._id.toString(),
      conversationId: message.conversation?.toString?.() || String(message.conversation),
      orderId: message.order?.toString?.() || String(message.order),
      deliveryId: message.delivery?.toString?.() || undefined,
      senderId: message.sender?.toString?.() || undefined,
      senderRole: message.senderRole,
      type: message.type,
      body: message.body,
      metadata: message.metadata || {},
      readBy: (message.readBy || []).map((receipt: any) => ({
        user: receipt.user?.toString?.() || String(receipt.user),
        readAt: receipt.readAt
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };
  }

  private async buildScopeConfig(orderId: string, scope: ChatScope): Promise<ScopeConfig> {
    const order = await Order.findById(orderId).exec();
    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const vendor = await Vendor.findById(order.vendor).populate('owner', 'userId role').exec();
    if (!vendor) {
      throw new Error('Vendor não encontrado');
    }

    const customer = await User.findById(order.customer).exec();
    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    const delivery = await Delivery.findOne({ order: order._id }).sort({ createdAt: -1 }).exec();
    const driver = delivery?.driver ? await User.findById(delivery.driver).exec() : null;

    const customerParticipant: IChatParticipant = {
      user: customer._id as Types.ObjectId,
      role: 'customer',
      label: this.roleLabel('customer')
    };

    const vendorParticipant: IChatParticipant = {
      user: vendor.owner as Types.ObjectId,
      role: 'vendor',
      label: this.roleLabel('vendor', vendor.name)
    };

    const driverParticipant: IChatParticipant | null = driver
      ? {
          user: driver._id as Types.ObjectId,
          role: 'driver',
          label: this.roleLabel('driver')
        }
      : null;

    let participants: IChatParticipant[] = [];

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
        const admins = await User.find({ role: 'admin', isActive: true }).limit(3).exec();
        participants = [
          customerParticipant,
          vendorParticipant,
          ...(driverParticipant ? [driverParticipant] : []),
          ...admins.map((admin) => ({
            user: admin._id as Types.ObjectId,
            role: 'admin' as ChatParticipantRole,
            label: this.roleLabel('admin')
          }))
        ];
        break;
      }
      default:
        participants = [customerParticipant, vendorParticipant];
    }

    const uniqueParticipants = participants.filter(
      (participant, index, array) =>
        array.findIndex((entry) => entry.user.toString() === participant.user.toString()) === index
    );

    return {
      title: this.buildScopeTitle(scope, vendor.name),
      subtitle: this.buildScopeSubtitle(scope),
      participants: uniqueParticipants,
      participantIds: uniqueParticipants.map((participant) => participant.user)
    };
  }

  private async appendSystemMessageIfNeeded(conversation: any, body: string) {
    const existingMessage = await ChatMessage.findOne({ conversation: conversation._id }).select('_id').lean().exec();
    if (existingMessage) {
      return;
    }

    await this.createSystemMessage(conversation._id.toString(), body);
  }

  async ensureContextConversationForOrder(orderId: string, scope: ChatScope) {
    const config = await this.buildScopeConfig(orderId, scope);

    const order = await Order.findById(orderId).exec();
    const delivery = await Delivery.findOne({ order: orderId }).sort({ createdAt: -1 }).select('_id').lean().exec();

    const conversation = await ChatConversation.findOneAndUpdate(
      { order: orderId, scope },
      {
        $set: {
          contextType: 'order',
          vendor: order?.vendor,
          delivery: delivery?._id,
          title: config.title,
          subtitle: config.subtitle,
          participants: config.participants,
          participantIds: config.participantIds,
          isActive: true
        },
        $setOnInsert: {
          lastMessageAt: new Date()
        }
      },
      {
        new: true,
        upsert: true
      }
    ).exec();

    await this.appendSystemMessageIfNeeded(
      conversation,
      `${config.subtitle}. Use este canal apenas para tratar detalhes do pedido e da entrega.`
    );

    return conversation;
  }

  async syncOrderConversations(orderId: string) {
    const ensured: any[] = [];

    ensured.push(await this.ensureContextConversationForOrder(orderId, 'customer_vendor'));

    try {
      ensured.push(await this.ensureContextConversationForOrder(orderId, 'customer_driver'));
      ensured.push(await this.ensureContextConversationForOrder(orderId, 'driver_vendor'));
    } catch {
      // Ainda sem driver associado: mantemos apenas o canal cliente <-> loja.
    }

    return ensured;
  }

  private async assertConversationAccess(conversationId: string, userId: string) {
    const conversation = await ChatConversation.findById(conversationId).exec();
    if (!conversation || !conversation.isActive) {
      throw new Error('Conversa não encontrada');
    }

    const isParticipant = (conversation.participantIds || []).some(
      (participantId) => participantId.toString() === userId
    );

    const currentUser = await User.findById(userId).select('role').lean().exec();
    const isAdmin = currentUser?.role === 'admin';

    if (!isParticipant && !isAdmin) {
      throw new Error('Você não tem acesso a esta conversa');
    }

    return conversation;
  }

  async getConversationForUser(conversationId: string, userId: string) {
    const conversation = await this.assertConversationAccess(conversationId, userId);
    return this.serializeConversation(conversation, userId);
  }

  async listConversationsForUser(userId: string, filters?: { orderId?: string; scope?: ChatScope }) {
    const query: Record<string, any> = {
      participantIds: new Types.ObjectId(userId),
      isActive: true
    };

    if (filters?.orderId) {
      query.order = new Types.ObjectId(filters.orderId);
    }

    if (filters?.scope) {
      query.scope = filters.scope;
    }

    const conversations = await ChatConversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .exec();

    return conversations.map((conversation) => this.serializeConversation(conversation, userId));
  }

  async getContextAvailability(orderId: string, userId: string) {
    const currentUser = await User.findById(userId).select('role').lean().exec();
    if (!currentUser) {
      throw new Error('Usuário não encontrado');
    }

    const scopeMatrix: Record<string, ChatScope[]> = {
      customer: ['customer_vendor', 'customer_driver', 'support'],
      vendor: ['customer_vendor', 'driver_vendor', 'support'],
      driver: ['customer_driver', 'driver_vendor', 'support'],
      admin: ['support']
    };

    const scopes = scopeMatrix[currentUser.role] || ['support'];

    const results = await Promise.all(
      scopes.map(async (scope) => {
        try {
          const config = await this.buildScopeConfig(orderId, scope);
          const isParticipant = config.participantIds.some((participantId) => participantId.toString() === userId);
          const existingConversation = await ChatConversation.findOne({ order: orderId, scope })
            .select('_id')
            .lean()
            .exec();

          return {
            scope,
            label: config.title,
            description: config.subtitle,
            available: isParticipant || scope === 'support',
            reason: isParticipant || scope === 'support' ? undefined : 'Você não participa deste canal',
            conversationId: existingConversation?._id?.toString()
          };
        } catch (error: any) {
          return {
            scope,
            label: this.buildScopeTitle(scope, 'Zero'),
            description: this.buildScopeSubtitle(scope),
            available: false,
            reason: error.message || 'Canal indisponível'
          };
        }
      })
    );

    return {
      orderId,
      options: results
    };
  }

  async getMessagesForUser(
    conversationId: string,
    userId: string,
    options?: { before?: string; limit?: number }
  ) {
    await this.assertConversationAccess(conversationId, userId);

    const query: Record<string, any> = {
      conversation: new Types.ObjectId(conversationId)
    };

    if (options?.before) {
      query.createdAt = { $lt: new Date(options.before) };
    }

    const limit = Math.min(Math.max(options?.limit || 40, 1), 100);

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return messages.reverse().map((message) => this.serializeMessage(message));
  }

  private computeUnreadCounts(conversation: any, senderId?: string | null) {
    const current =
      conversation.unreadCounts instanceof Map
        ? new Map(conversation.unreadCounts.entries())
        : new Map<string, number>(Object.entries(conversation.unreadCounts || {}));

    (conversation.participantIds || []).forEach((participantId: Types.ObjectId) => {
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

  async sendMessage(
    conversationId: string,
    userId: string,
    payload: { body: string; type?: ChatMessageType; metadata?: Record<string, any> }
  ) {
    const conversation = await this.assertConversationAccess(conversationId, userId);
    const normalizedBody = this.normalizeMessageBody(payload.body || '');
    if (!normalizedBody) {
      throw new Error('Mensagem vazia');
    }

    if (normalizedBody.length > 2000) {
      throw new Error('Mensagem excede o limite de 2000 caracteres');
    }

    const participant = (conversation.participants || []).find(
      (entry: any) => entry.user.toString() === userId
    );

    if (!participant) {
      throw new Error('Participante inválido para esta conversa');
    }

    const message = await ChatMessage.create({
      conversation: conversation._id,
      order: conversation.order,
      delivery: conversation.delivery,
      sender: new Types.ObjectId(userId),
      senderRole: participant.role,
      type: payload.type || 'text',
      body: normalizedBody,
      metadata: payload.metadata || {},
      readBy: [{ user: new Types.ObjectId(userId), readAt: new Date() }]
    });

    conversation.lastMessagePreview = this.summarizeMessage(normalizedBody, payload.type || 'text');
    conversation.lastMessageAt = message.createdAt || new Date();
    conversation.lastMessageSender = new Types.ObjectId(userId);
    conversation.unreadCounts = this.computeUnreadCounts(conversation, userId) as any;
    await conversation.save();

    const serializedConversation = this.serializeConversation(conversation, userId);
    const serializedMessage = this.serializeMessage(message);

    await trackingGateway.publishChatEvent(conversationId, 'chat:message', {
      conversation: serializedConversation,
      message: serializedMessage
    });

    return {
      conversation: serializedConversation,
      message: serializedMessage
    };
  }

  async createSystemMessage(conversationId: string, body: string, metadata?: Record<string, any>) {
    const conversation = await ChatConversation.findById(conversationId).exec();
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const normalizedBody = this.normalizeMessageBody(body || '');
    if (!normalizedBody) {
      return null;
    }

    const message = await ChatMessage.create({
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
    conversation.unreadCounts = this.computeUnreadCounts(conversation, null) as any;
    await conversation.save();

    await trackingGateway.publishChatEvent(conversationId, 'chat:message', {
      conversation: this.serializeConversation(conversation, conversation.participantIds[0]?.toString() || ''),
      message: this.serializeMessage(message)
    });

    return message;
  }

  async markConversationRead(conversationId: string, userId: string) {
    const conversation = await this.assertConversationAccess(conversationId, userId);
    const readAt = new Date();

    await ChatMessage.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: new Types.ObjectId(userId) },
        'readBy.user': { $ne: new Types.ObjectId(userId) }
      },
      {
        $push: {
          readBy: {
            user: new Types.ObjectId(userId),
            readAt
          }
        }
      }
    ).exec();

    const unreadCounts =
      conversation.unreadCounts instanceof Map
        ? new Map(conversation.unreadCounts.entries())
        : new Map<string, number>(Object.entries(conversation.unreadCounts || {}));
    unreadCounts.set(userId, 0);
    conversation.unreadCounts = unreadCounts as any;
    await conversation.save();

    const serializedConversation = this.serializeConversation(conversation, userId);

    await trackingGateway.publishChatEvent(conversationId, 'chat:read', {
      conversation: serializedConversation,
      userId,
      readAt: readAt.toISOString()
    });

    return serializedConversation;
  }
}

export const chatService = new ChatService();
