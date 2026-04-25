import { Request, Response } from 'express';
import { chatService } from './chat.service';
import type { ChatScope } from '../../models/interfaces';

export class ChatController {
  private async getCurrentUser(req: Request) {
    return chatService.resolveAuthenticatedUser(req.clerkPayload?.sub);
  }

  private getErrorStatus(error: Error) {
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

  createOrGetContextConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const { orderId, scope = 'customer_vendor' } = req.body as {
        orderId?: string;
        scope?: ChatScope;
      };

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'orderId é obrigatório'
        });
        return;
      }

      const conversation = await chatService.ensureContextConversationForOrder(orderId, scope);
      const payload = await chatService.getConversationForUser(conversation._id.toString(), user._id.toString());

      res.status(200).json({
        success: true,
        data: payload
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao preparar conversa'
      });
    }
  };

  listConversations = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const conversations = await chatService.listConversationsForUser(user._id.toString(), {
        orderId: req.query.orderId as string | undefined,
        scope: req.query.scope as ChatScope | undefined
      });

      res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao listar conversas'
      });
    }
  };

  getContextAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const availability = await chatService.getContextAvailability(
        req.params.orderId,
        user._id.toString()
      );

      res.status(200).json({
        success: true,
        data: availability
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao buscar disponibilidade do chat'
      });
    }
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const conversation = await chatService.getConversationForUser(
        req.params.conversationId,
        user._id.toString()
      );

      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao buscar conversa'
      });
    }
  };

  listMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const messages = await chatService.getMessagesForUser(req.params.conversationId, user._id.toString(), {
        before: req.query.before as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      });

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao listar mensagens'
      });
    }
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const result = await chatService.sendMessage(req.params.conversationId, user._id.toString(), {
        body: req.body?.body,
        type: req.body?.type,
        metadata: req.body?.metadata
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao enviar mensagem'
      });
    }
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.getCurrentUser(req);
      const conversation = await chatService.markConversationRead(
        req.params.conversationId,
        user._id.toString()
      );

      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error: any) {
      res.status(this.getErrorStatus(error)).json({
        success: false,
        message: error.message || 'Erro ao marcar conversa como lida'
      });
    }
  };
}

export const chatController = new ChatController();
