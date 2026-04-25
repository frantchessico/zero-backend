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
exports.testDatabaseConnection = void 0;
const database_1 = require("./database");
// Função para testar a conexão
const testDatabaseConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Iniciando teste de conexão com a base de dados...');
        // Conecta à base de dados
        yield (0, database_1.connectDatabase)();
        // Aguarda um pouco para garantir que a conexão foi estabelecida
        yield new Promise(resolve => setTimeout(resolve, 1000));
        // Verifica se está conectado
        if ((0, database_1.isConnected)()) {
            console.log('✅ Teste de conexão bem-sucedido!');
            // Obtém informações da conexão
            const connectionInfo = (0, database_1.getConnectionInfo)();
            console.log('📊 Informações da conexão:', connectionInfo);
        }
        else {
            console.log('❌ Falha no teste de conexão - não está conectado');
        }
    }
    catch (error) {
        console.error('❌ Erro durante o teste de conexão:', error);
    }
    finally {
        // Desconecta da base de dados
        yield (0, database_1.disconnectDatabase)();
        console.log('🧹 Teste concluído - conexão fechada');
    }
});
exports.testDatabaseConnection = testDatabaseConnection;
// Executa o teste se este arquivo for executado diretamente
if (require.main === module) {
    (0, exports.testDatabaseConnection)()
        .then(() => {
        console.log('🏁 Teste finalizado');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Erro fatal no teste:', error);
        process.exit(1);
    });
}
