import { Router } from 'express';
import { ClerkWebhookController } from '../core/clerk-webhook/clerk-webhook.controller';

const router = Router();
const controller = new ClerkWebhookController();

router.post('/clerk', controller.handleWebhook);

export default router;
