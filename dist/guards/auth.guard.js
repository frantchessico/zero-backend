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
exports.AuthGuard = void 0;
const express_1 = require("@clerk/express");
const logger_1 = require("../utils/logger");
const AuthGuard = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (process.env.NODE_ENV === 'test') {
        const fallbackUserId = req.params.userId ||
            ((_a = req.body) === null || _a === void 0 ? void 0 : _a.userId) ||
            req.headers['x-test-user-id'] ||
            'test-user';
        req.clerkPayload = {
            sub: fallbackUserId,
            azp: 'test',
            exp: Math.floor(Date.now() / 1000) + 3600,
            fva: [0, 0],
            iat: Math.floor(Date.now() / 1000),
            iss: 'test',
            nbf: undefined,
            sid: undefined,
            org_id: undefined,
            org_role: undefined,
            org_slug: undefined,
            org_permissions: [],
            isPremium: false,
            tier: 'free',
            expiresAt: null,
            nextBillingDate: null,
        };
        return next();
    }
    try {
        // Usar o middleware requireAuth do @clerk/express
        yield (0, express_1.requireAuth)()(req, res, (err) => {
            if (err) {
                console.log('Auth error:', err);
                logger_1.logger.error("Auth error:", err);
                return res.status(401).json({ error: "Authentication failed" });
            }
            // Obter dados do usuário autenticado
            const { userId } = (0, express_1.getAuth)(req);
            if (!userId) {
                console.log("No user ID found");
                return res.status(401).json({ error: "User not authenticated" });
            }
            console.log('USER_ID: ', userId);
            // Buscar dados completos do usuário
            express_1.clerkClient.users.getUser(userId)
                .then((user) => {
                var _a, _b, _c, _d, _e, _f;
                if (!user) {
                    console.log('User not found in Clerk');
                    return res.status(401).json({ error: "User not found" });
                }
                // Adicionar informações do usuário ao request
                req.clerkPayload = {
                    sub: userId,
                    azp: ((_b = (_a = user.externalAccounts) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.provider) || '',
                    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
                    fva: [0, 0],
                    iat: Math.floor(Date.now() / 1000),
                    iss: 'clerk',
                    nbf: undefined,
                    sid: undefined,
                    org_id: undefined,
                    org_role: undefined,
                    org_slug: undefined,
                    org_permissions: [],
                    isPremium: (_c = user.unsafeMetadata) === null || _c === void 0 ? void 0 : _c.isPremium,
                    tier: (_d = user.unsafeMetadata) === null || _d === void 0 ? void 0 : _d.tier,
                    expiresAt: (_e = user.unsafeMetadata) === null || _e === void 0 ? void 0 : _e.expiresAt,
                    nextBillingDate: (_f = user.unsafeMetadata) === null || _f === void 0 ? void 0 : _f.nextBillingDate
                };
                console.log('User authenticated successfully:', userId);
                next();
            })
                .catch((error) => {
                console.log('User fetch error:', error);
                logger_1.logger.error("User fetch error:", error);
                return res.status(500).json({ error: "Failed to fetch user data" });
            });
        });
    }
    catch (error) {
        console.log('Auth error:', error);
        logger_1.logger.error("Auth error:", error);
        return res.status(401).json({ error: "Authentication failed" });
    }
});
exports.AuthGuard = AuthGuard;
