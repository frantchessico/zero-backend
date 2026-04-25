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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./utils/logger");
const tracking_gateway_1 = require("./realtime/tracking.gateway");
// Obtém a porta dos argumentos de linha de comando ou do .env
const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const port = portArgIndex !== -1 ? args[portArgIndex + 1] : process.env.PORT || 4203;
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = (0, http_1.createServer)(app_1.default);
        yield tracking_gateway_1.trackingGateway.initialize(server);
        server.listen(port, () => {
            logger_1.logger.info(`Server running on port ${port}`);
        });
    });
}
bootstrap().catch((error) => {
    logger_1.logger.error('Failed to bootstrap server', error);
    process.exit(1);
});
