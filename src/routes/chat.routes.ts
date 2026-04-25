import { Router } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { logAction } from '../middleware/auth.middleware';
import { chatController } from '../core/chat/chat.controller';

const router = Router();

router.post(
  '/context',
  AuthGuard,
  logAction('CHAT_GET_OR_CREATE_CONTEXT'),
  chatController.createOrGetContextConversation
);

router.get(
  '/',
  AuthGuard,
  logAction('CHAT_LIST_CONVERSATIONS'),
  chatController.listConversations
);

router.get(
  '/context/:orderId/availability',
  AuthGuard,
  logAction('CHAT_CONTEXT_AVAILABILITY'),
  chatController.getContextAvailability
);

router.get(
  '/:conversationId',
  AuthGuard,
  logAction('CHAT_GET_CONVERSATION'),
  chatController.getConversation
);

router.get(
  '/:conversationId/messages',
  AuthGuard,
  logAction('CHAT_LIST_MESSAGES'),
  chatController.listMessages
);

router.post(
  '/:conversationId/messages',
  AuthGuard,
  logAction('CHAT_SEND_MESSAGE'),
  chatController.sendMessage
);

router.post(
  '/:conversationId/read',
  AuthGuard,
  logAction('CHAT_MARK_READ'),
  chatController.markRead
);

export default router;
