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
exports.getConnectionInfo = exports.isConnected = exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Configuração da base de dados
const databaseConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zero-delivery',
    options: {
        maxPoolSize: 10, // Número máximo de conexões no pool
        serverSelectionTimeoutMS: 5000, // Timeout para seleção do servidor
        socketTimeoutMS: 45000, // Timeout para operações de socket
        bufferCommands: false, // Desabilita buffer de comandos
    },
};
// Função para conectar à base de dados
const connectDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Configuração de eventos do mongoose
        mongoose_1.default.connection.on('connected', () => {
            console.log('✅ Conectado ao MongoDB com sucesso!');
        });
        mongoose_1.default.connection.on('error', (error) => {
            console.error('❌ Erro na conexão com MongoDB:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('⚠️  Desconectado do MongoDB');
        });
        // Configuração de eventos para encerramento gracioso
        process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield mongoose_1.default.connection.close();
                console.log('🔌 Conexão com MongoDB fechada devido ao encerramento da aplicação');
                process.exit(0);
            }
            catch (error) {
                console.error('❌ Erro ao fechar conexão com MongoDB:', error);
                process.exit(1);
            }
        }));
        // Conecta ao MongoDB
        yield mongoose_1.default.connect(databaseConfig.uri, databaseConfig.options);
    }
    catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
});
exports.connectDatabase = connectDatabase;
// Função para desconectar da base de dados
const disconnectDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connection.close();
        console.log('🔌 Desconectado do MongoDB com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro ao desconectar do MongoDB:', error);
        throw error;
    }
});
exports.disconnectDatabase = disconnectDatabase;
// Função para verificar se está conectado
const isConnected = () => {
    return mongoose_1.default.connection.readyState === 1;
};
exports.isConnected = isConnected;
// Função para obter informações da conexão
const getConnectionInfo = () => {
    return {
        readyState: mongoose_1.default.connection.readyState,
        host: mongoose_1.default.connection.host,
        port: mongoose_1.default.connection.port,
        name: mongoose_1.default.connection.name,
    };
};
exports.getConnectionInfo = getConnectionInfo;
exports.default = exports.connectDatabase;
