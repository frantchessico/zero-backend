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
exports.trackingSyncService = void 0;
const realtime_infra_1 = require("./realtime-infra");
class InMemoryTrackingSyncAdapter {
    constructor() {
        this.snapshots = new Map();
    }
    get(topic) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.snapshots.get(topic) || null;
        });
    }
    set(topic, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            this.snapshots.set(topic, payload);
        });
    }
}
class RedisTrackingSyncAdapter {
    constructor() {
        this.keyPrefix = 'zero:tracking:snapshot:';
    }
    get(topic) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield realtime_infra_1.realtimeInfra.getSnapshotClient();
            if (!client) {
                return null;
            }
            const payload = yield client.get(`${this.keyPrefix}${topic}`);
            return payload ? JSON.parse(payload) : null;
        });
    }
    set(topic, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield realtime_infra_1.realtimeInfra.getSnapshotClient();
            if (!client) {
                return;
            }
            yield client.set(`${this.keyPrefix}${topic}`, JSON.stringify(payload), {
                EX: 60 * 60
            });
        });
    }
}
class TrackingSyncService {
    constructor() {
        this.memoryAdapter = new InMemoryTrackingSyncAdapter();
        this.redisAdapter = new RedisTrackingSyncAdapter();
    }
    getSnapshot(topic) {
        return __awaiter(this, void 0, void 0, function* () {
            const redisSnapshot = yield this.redisAdapter.get(topic);
            if (redisSnapshot) {
                return redisSnapshot;
            }
            return this.memoryAdapter.get(topic);
        });
    }
    storeSnapshot(topic, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.memoryAdapter.set(topic, payload);
            yield this.redisAdapter.set(topic, payload);
        });
    }
}
exports.trackingSyncService = new TrackingSyncService();
