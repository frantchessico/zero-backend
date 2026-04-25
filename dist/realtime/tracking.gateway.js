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
exports.trackingGateway = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const tracking_sync_service_1 = require("./tracking-sync.service");
const realtime_infra_1 = require("./realtime-infra");
class TrackingGateway {
    constructor() {
        this.io = null;
    }
    chatRoom(conversationId) {
        return `chat:${conversationId}`;
    }
    initialize(server) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (this.io) {
                return this.io;
            }
            this.io = new socket_io_1.Server(server, {
                cors: {
                    origin: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ((_b = process.env.CORS_ORIGIN) === null || _b === void 0 ? void 0 : _b.split(',')) || '*',
                    credentials: true
                },
                path: '/socket.io'
            });
            yield realtime_infra_1.realtimeInfra.attachSocketAdapter(this.io);
            this.io.on('connection', (socket) => {
                socket.emit('tracking:connected', {
                    socketId: socket.id,
                    connectedAt: new Date().toISOString()
                });
                socket.on('tracking:join', (_a) => __awaiter(this, [_a], void 0, function* ({ topic }) {
                    if (!topic) {
                        return;
                    }
                    yield socket.join(topic);
                    const snapshot = yield tracking_sync_service_1.trackingSyncService.getSnapshot(topic);
                    if (snapshot) {
                        const envelope = {
                            type: 'tracking:snapshot',
                            topic,
                            payload: snapshot,
                            emittedAt: new Date().toISOString()
                        };
                        socket.emit('tracking:snapshot', envelope);
                    }
                }));
                socket.on('tracking:leave', (_a) => __awaiter(this, [_a], void 0, function* ({ topic }) {
                    if (!topic) {
                        return;
                    }
                    yield socket.leave(topic);
                }));
                socket.on('chat:join', (_a) => __awaiter(this, [_a], void 0, function* ({ conversationId }) {
                    if (!conversationId) {
                        return;
                    }
                    yield socket.join(this.chatRoom(conversationId));
                    socket.emit('chat:joined', {
                        conversationId,
                        room: this.chatRoom(conversationId),
                        connectedAt: new Date().toISOString()
                    });
                }));
                socket.on('chat:leave', (_a) => __awaiter(this, [_a], void 0, function* ({ conversationId }) {
                    if (!conversationId) {
                        return;
                    }
                    yield socket.leave(this.chatRoom(conversationId));
                }));
                socket.on('chat:typing', ({ conversationId, userId, isTyping }) => {
                    if (!conversationId || !this.io) {
                        return;
                    }
                    this.io.to(this.chatRoom(conversationId)).emit('chat:typing', {
                        conversationId,
                        userId,
                        isTyping: Boolean(isTyping),
                        emittedAt: new Date().toISOString()
                    });
                });
            });
            logger_1.logger.info('Tracking gateway initialized');
            return this.io;
        });
    }
    publish(topic_1, payload_1) {
        return __awaiter(this, arguments, void 0, function* (topic, payload, type = 'tracking:update') {
            yield tracking_sync_service_1.trackingSyncService.storeSnapshot(topic, payload);
            if (!this.io) {
                return;
            }
            const envelope = {
                type,
                topic,
                payload,
                emittedAt: new Date().toISOString()
            };
            this.io.to(topic).emit(type, envelope);
        });
    }
    publishChatEvent(conversationId, event, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.io) {
                return;
            }
            this.io.to(this.chatRoom(conversationId)).emit(event, {
                conversationId,
                payload,
                emittedAt: new Date().toISOString()
            });
        });
    }
}
exports.trackingGateway = new TrackingGateway();
