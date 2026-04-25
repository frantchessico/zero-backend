import { Request, Response } from 'express';
import { verifyWebhook } from '@clerk/express/webhooks';
import { ClerkWebhookService } from './clerk-webhook.service';
import { logger } from '../../utils/logger';

export class ClerkWebhookController {
  private readonly webhookService = new ClerkWebhookService();

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (!signingSecret) {
      logger.error('Clerk webhook secret is not configured');
      res.status(500).json({
        success: false,
        message: 'Webhook do Clerk não configurado',
      });
      return;
    }

    try {
      const event = await verifyWebhook(req, { signingSecret });
      const result = await this.webhookService.handleEvent(event);
      const eventId = req.header('svix-id') || req.header('webhook-id') || undefined;

      logger.info('Processed Clerk webhook event', {
        eventId,
        eventType: event.type,
        action: result.action,
        userId: 'userId' in result ? result.userId : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to process Clerk webhook', error);
      res.status(400).json({
        success: false,
        message: 'Falha ao validar ou processar webhook do Clerk',
      });
    }
  };
}
