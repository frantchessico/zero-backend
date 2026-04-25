"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clerk_webhook_controller_1 = require("../core/clerk-webhook/clerk-webhook.controller");
const router = (0, express_1.Router)();
const controller = new clerk_webhook_controller_1.ClerkWebhookController();
router.post('/clerk', controller.handleWebhook);
exports.default = router;
