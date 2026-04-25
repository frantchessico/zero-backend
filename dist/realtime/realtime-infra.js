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
exports.realtimeInfra = void 0;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RealtimeInfra {
    constructor() {
        this.snapshotClient = null;
        this.pubClient = null;
        this.subClient = null;
        this.socketAdapterReady = false;
    }
    get redisUrl() {
        return process.env.REDIS_URL || '';
    }
    get redisEnabled() {
        return !!this.redisUrl && process.env.NODE_ENV !== 'test';
    }
    getSnapshotClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.redisEnabled) {
                return null;
            }
            if (this.snapshotClient) {
                return this.snapshotClient;
            }
            try {
                this.snapshotClient = (0, redis_1.createClient)({ url: this.redisUrl });
                this.snapshotClient.on('error', (error) => {
                    logger_1.logger.warn(`Redis snapshot client error: ${error.message}`);
                });
                yield this.snapshotClient.connect();
                logger_1.logger.info('Redis snapshot client connected');
                return this.snapshotClient;
            }
            catch (error) {
                logger_1.logger.warn(`Redis snapshot client unavailable, using memory fallback: ${error.message}`);
                this.snapshotClient = null;
                return null;
            }
        });
    }
    attachSocketAdapter(io) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.redisEnabled) {
                return false;
            }
            if (this.socketAdapterReady && this.pubClient && this.subClient) {
                return true;
            }
            try {
                this.pubClient = (0, redis_1.createClient)({ url: this.redisUrl });
                this.subClient = this.pubClient.duplicate();
                this.pubClient.on('error', (error) => {
                    logger_1.logger.warn(`Redis pub client error: ${error.message}`);
                });
                this.subClient.on('error', (error) => {
                    logger_1.logger.warn(`Redis sub client error: ${error.message}`);
                });
                yield Promise.all([this.pubClient.connect(), this.subClient.connect()]);
                io.adapter((0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient));
                this.socketAdapterReady = true;
                logger_1.logger.info('Socket.IO Redis adapter connected');
                return true;
            }
            catch (error) {
                logger_1.logger.warn(`Socket.IO Redis adapter unavailable, using in-memory adapter: ${error.message}`);
                this.socketAdapterReady = false;
                this.pubClient = null;
                this.subClient = null;
                return false;
            }
        });
    }
}
exports.realtimeInfra = new RealtimeInfra();
