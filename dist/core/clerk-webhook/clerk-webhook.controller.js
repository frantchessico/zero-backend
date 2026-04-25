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
exports.ClerkWebhookController = void 0;
const webhooks_1 = require("@clerk/express/webhooks");
const clerk_webhook_service_1 = require("./clerk-webhook.service");
const logger_1 = require("../../utils/logger");
class ClerkWebhookController {
    constructor() {
        this.webhookService = new clerk_webhook_service_1.ClerkWebhookService();
        this.handleWebhook = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
            if (!signingSecret) {
                logger_1.logger.error('Clerk webhook secret is not configured');
                res.status(500).json({
                    success: false,
                    message: 'Webhook do Clerk não configurado',
                });
                return;
            }
            try {
                const event = yield (0, webhooks_1.verifyWebhook)(req, { signingSecret });
                const result = yield this.webhookService.handleEvent(event);
                const eventId = req.header('svix-id') || req.header('webhook-id') || undefined;
                logger_1.logger.info('Processed Clerk webhook event', {
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
            }
            catch (error) {
                logger_1.logger.error('Failed to process Clerk webhook', error);
                res.status(400).json({
                    success: false,
                    message: 'Falha ao validar ou processar webhook do Clerk',
                });
            }
        });
    }
}
exports.ClerkWebhookController = ClerkWebhookController;
