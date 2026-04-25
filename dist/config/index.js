"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
__exportStar(require("./database"), exports);
__exportStar(require("./database.test"), exports);
// Configurações gerais da aplicação
exports.config = {
    // Configurações do servidor
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        environment: process.env.NODE_ENV || 'development',
    },
    // Configurações da base de dados
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zero-delivery',
        name: process.env.DB_NAME || 'zero-delivery',
    },
    // Configurações de logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filename: process.env.LOG_FILENAME || 'logs/app.log',
    },
    // Configurações de CORS
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    mapbox: {
        accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
        profile: process.env.MAPBOX_DIRECTIONS_PROFILE || 'driving-traffic',
    },
    realtime: {
        publicBaseUrl: process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || '',
        syncAdapter: process.env.TRACKING_SYNC_ADAPTER || 'memory',
        redisUrl: process.env.REDIS_URL || '',
    },
};
