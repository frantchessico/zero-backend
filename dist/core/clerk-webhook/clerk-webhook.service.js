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
exports.ClerkWebhookService = void 0;
const models_1 = require("../../models");
const logger_1 = require("../../utils/logger");
class ClerkWebhookService {
    handleEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (event.type) {
                case 'user.created':
                case 'user.updated': {
                    const user = yield this.upsertUserFromClerk(event.data);
                    return {
                        action: 'upserted',
                        eventType: event.type,
                        userId: user.userId,
                    };
                }
                case 'user.deleted': {
                    const clerkUserId = event.data.id;
                    if (!clerkUserId) {
                        return {
                            action: 'ignored',
                            eventType: event.type,
                        };
                    }
                    yield this.deactivateUser(clerkUserId);
                    return {
                        action: 'deactivated',
                        eventType: event.type,
                        userId: clerkUserId,
                    };
                }
                default:
                    return {
                        action: 'ignored',
                        eventType: event.type,
                    };
            }
        });
    }
    upsertUserFromClerk(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const clerkUserId = payload.id;
            const email = this.extractPrimaryEmail(payload);
            const phoneNumber = this.extractPrimaryPhone(payload);
            const identityMatch = yield models_1.User.findOne({
                $or: [{ clerkId: clerkUserId }, { userId: clerkUserId }],
            }).exec();
            if (identityMatch) {
                identityMatch.set({
                    userId: clerkUserId,
                    clerkId: clerkUserId,
                    email,
                    phoneNumber,
                    isActive: true,
                });
                yield identityMatch.save();
                return identityMatch;
            }
            if (email) {
                const existingByEmail = yield models_1.User.findOne({ email }).exec();
                if (existingByEmail) {
                    existingByEmail.set({
                        clerkId: clerkUserId,
                        email,
                        phoneNumber,
                        isActive: true,
                    });
                    yield existingByEmail.save();
                    return existingByEmail;
                }
            }
            const createdUser = yield models_1.User.create({
                userId: clerkUserId,
                clerkId: clerkUserId,
                email,
                phoneNumber,
                role: 'customer',
                deliveryAddresses: [],
                orderHistory: [],
                paymentMethods: [],
                loyaltyPoints: 0,
                isActive: true,
            });
            return createdUser;
        });
    }
    deactivateUser(clerkUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedUser = yield models_1.User.findOneAndUpdate({
                $or: [{ clerkId: clerkUserId }, { userId: clerkUserId }],
            }, {
                $set: {
                    clerkId: clerkUserId,
                    isActive: false,
                },
            }, { new: true }).exec();
            if (!updatedUser) {
                logger_1.logger.warn('Clerk user delete webhook received for unknown user', {
                    clerkUserId,
                });
            }
            return updatedUser;
        });
    }
    extractPrimaryEmail(payload) {
        var _a, _b, _c, _d;
        const primaryEmailId = payload.primary_email_address_id;
        return (((_b = (_a = payload.email_addresses) === null || _a === void 0 ? void 0 : _a.find((entry) => entry.id === primaryEmailId)) === null || _b === void 0 ? void 0 : _b.email_address) ||
            ((_d = (_c = payload.email_addresses) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.email_address) ||
            undefined);
    }
    extractPrimaryPhone(payload) {
        var _a, _b, _c, _d;
        const primaryPhoneId = payload.primary_phone_number_id;
        return (((_b = (_a = payload.phone_numbers) === null || _a === void 0 ? void 0 : _a.find((entry) => entry.id === primaryPhoneId)) === null || _b === void 0 ? void 0 : _b.phone_number) ||
            ((_d = (_c = payload.phone_numbers) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.phone_number) ||
            undefined);
    }
}
exports.ClerkWebhookService = ClerkWebhookService;
