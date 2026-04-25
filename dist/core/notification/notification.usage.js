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
exports.NotificationJobExamples = exports.NotificationUsageExamples = void 0;
exports.runNotificationExamples = runNotificationExamples;
const notification_service_1 = require("./notification.service");
/**
 * Exemplos de uso do sistema de notificações
 */
class NotificationUsageExamples {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
    }
    /**
     * Exemplo: Fluxo completo de um pedido
     */
    demonstrateOrderFlow() {
        return __awaiter(this, void 0, void 0, function* () {
            const orderId = '65f1a2b3c4d5e6f7g8h9i0j1';
            const vendorId = '65f1a2b3c4d5e6f7g8h9i0j2';
            const customerId = '65f1a2b3c4d5e6f7g8h9i0j3';
            const driverId = '65f1a2b3c4d5e6f7g8h9i0j4';
            try {
                // 1. Cliente faz pedido - notificar vendor
                console.log('1. Notificando vendor sobre novo pedido...');
                yield this.notificationService.notifyVendorNewOrder(vendorId, orderId);
                // 2. Vendor confirma pedido - notificar cliente
                console.log('2. Notificando cliente que pedido foi confirmado...');
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'confirmed');
                // 3. Vendor prepara pedido - notificar cliente
                console.log('3. Notificando cliente que pedido está sendo preparado...');
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'preparing');
                // 4. Pedido pronto - notificar drivers disponíveis
                console.log('4. Notificando drivers que pedido está pronto...');
                yield this.notificationService.notifyDriversOrderReady(orderId);
                // 5. Driver aceita - notificar driver específico e cliente
                console.log('5. Notificando driver sobre atribuição...');
                yield this.notificationService.notifyDriverAssigned(driverId, orderId);
                console.log('6. Notificando cliente que pedido saiu para entrega...');
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'out_for_delivery');
                // 7. Pedido entregue - notificar cliente
                console.log('7. Notificando cliente que pedido foi entregue...');
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'delivered');
                console.log('✅ Fluxo de notificações do pedido concluído!');
            }
            catch (error) {
                console.error('❌ Erro no fluxo de notificações:', error);
            }
        });
    }
    /**
     * Exemplo: Notificar drivers próximos usando geolocalização
     */
    demonstrateLocationBasedNotifications() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const orderId = '65f1a2b3c4d5e6f7g8h9i0j1';
                // Coordenadas de Maputo (exemplo)
                const latitude = -25.9692;
                const longitude = 32.5732;
                const radiusInKm = 5;
                console.log('📍 Buscando drivers próximos...');
                // Primeiro, buscar drivers disponíveis na área
                const nearbyDrivers = yield this.notificationService.findNearbyDrivers(latitude, longitude, radiusInKm);
                console.log(`Encontrados ${nearbyDrivers.length} drivers em um raio de ${radiusInKm}km`);
                if (nearbyDrivers.length > 0) {
                    // Notificar drivers próximos sobre o pedido
                    yield this.notificationService.notifyNearbyDrivers(latitude, longitude, orderId, radiusInKm);
                    console.log('✅ Drivers próximos notificados!');
                }
                else {
                    console.log('⚠️ Nenhum driver disponível na área');
                }
            }
            catch (error) {
                console.error('❌ Erro ao notificar drivers próximos:', error);
            }
        });
    }
    /**
     * Exemplo: Campanha promocional
     */
    demonstratePromotionalCampaign() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Lista de usuários ativos
                const activeUserIds = [
                    '65f1a2b3c4d5e6f7g8h9i0j1',
                    '65f1a2b3c4d5e6f7g8h9i0j2',
                    '65f1a2b3c4d5e6f7g8h9i0j3',
                    '65f1a2b3c4d5e6f7g8h9i0j4',
                    '65f1a2b3c4d5e6f7g8h9i0j5'
                ];
                const promotionalMessage = '🎉 Promoção especial! 20% de desconto em todos os pedidos até domingo. Use o código: PROMO20';
                console.log('📢 Enviando campanha promocional...');
                const sentCount = yield this.notificationService.sendPromotionalNotification(activeUserIds, promotionalMessage);
                console.log(`✅ Campanha enviada para ${sentCount} usuários!`);
            }
            catch (error) {
                console.error('❌ Erro ao enviar campanha promocional:', error);
            }
        });
    }
    /**
     * Exemplo: Gerenciamento de notificações do usuário
     */
    demonstrateUserNotificationManagement() {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = '65f1a2b3c4d5e6f7g8h9i0j1';
            try {
                console.log('👤 Gerenciando notificações do usuário...');
                // 1. Buscar estatísticas
                console.log('📊 Obtendo estatísticas...');
                const stats = yield this.notificationService.getNotificationStats(userId);
                console.log('Estatísticas:', {
                    total: stats.total,
                    naoLidas: stats.unread,
                    recentes24h: stats.recent,
                    porTipo: stats.byType
                });
                // 2. Buscar notificações não lidas
                console.log('📬 Buscando notificações não lidas...');
                const unreadNotifications = yield this.notificationService.getUserNotifications(userId, 1, 10, true // apenas não lidas
                );
                console.log(`Encontradas ${unreadNotifications.notifications.length} notificações não lidas`);
                // 3. Marcar todas como lidas
                if (unreadNotifications.unreadCount > 0) {
                    console.log('✅ Marcando todas como lidas...');
                    const markedCount = yield this.notificationService.markAllAsRead(userId);
                    console.log(`${markedCount} notificações marcadas como lidas`);
                }
                // 4. Buscar histórico completo com paginação
                console.log('📄 Buscando histórico completo...');
                const allNotifications = yield this.notificationService.getUserNotifications(userId, 1, 20, false // todas as notificações
                );
                console.log(`Página 1 de ${allNotifications.totalPages}`);
                console.log(`Total: ${allNotifications.total} notificações`);
            }
            catch (error) {
                console.error('❌ Erro no gerenciamento de notificações:', error);
            }
        });
    }
    /**
     * Exemplo: Limpeza automática de notificações antigas
     */
    demonstrateCleanupOldNotifications() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🧹 Iniciando limpeza de notificações antigas...');
                const deletedCount = yield this.notificationService.deleteOldNotifications();
                if (deletedCount > 0) {
                    console.log(`✅ ${deletedCount} notificações antigas foram removidas`);
                }
                else {
                    console.log('ℹ️ Nenhuma notificação antiga encontrada para remoção');
                }
            }
            catch (error) {
                console.error('❌ Erro na limpeza de notificações:', error);
            }
        });
    }
    /**
     * Exemplo: Fluxo de cancelamento de pedido
     */
    demonstrateCancellationFlow() {
        return __awaiter(this, void 0, void 0, function* () {
            const orderId = '65f1a2b3c4d5e6f7g8h9i0j1';
            const customerId = '65f1a2b3c4d5e6f7g8h9i0j3';
            const driverId = '65f1a2b3c4d5e6f7g8h9i0j4';
            try {
                console.log('❌ Processando cancelamento de pedido...');
                // Notificar cliente sobre cancelamento
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'cancelled');
                // Se havia driver atribuído, notificar sobre cancelamento
                yield this.notificationService.createNotification(driverId, 'delivery_update', `Pedido #${orderId.slice(-6)} foi cancelado. Entrega não é mais necessária.`);
                console.log('✅ Notificações de cancelamento enviadas!');
            }
            catch (error) {
                console.error('❌ Erro ao processar cancelamento:', error);
            }
        });
    }
    /**
     * Exemplo: Executar todos os demos
     */
    runAllDemos() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🚀 Iniciando demonstração completa do sistema de notificações...\n');
            yield this.demonstrateOrderFlow();
            console.log('\n' + '='.repeat(50) + '\n');
            yield this.demonstrateLocationBasedNotifications();
            console.log('\n' + '='.repeat(50) + '\n');
            yield this.demonstratePromotionalCampaign();
            console.log('\n' + '='.repeat(50) + '\n');
            yield this.demonstrateUserNotificationManagement();
            console.log('\n' + '='.repeat(50) + '\n');
            yield this.demonstrateCancellationFlow();
            console.log('\n' + '='.repeat(50) + '\n');
            yield this.demonstrateCleanupOldNotifications();
            console.log('\n🎉 Demonstração completa finalizada!');
        });
    }
}
exports.NotificationUsageExamples = NotificationUsageExamples;
// Exemplo de uso
function runNotificationExamples() {
    return __awaiter(this, void 0, void 0, function* () {
        const examples = new NotificationUsageExamples();
        yield examples.runAllDemos();
    });
}
/**
 * Exemplo de como integrar com webhooks ou jobs
 */
class NotificationJobExamples {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
    }
    /**
     * Job para limpeza diária de notificações antigas
     * Execute com cron job: 0 2 * * * (todo dia às 2h da manhã)
     */
    dailyCleanupJob() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🕐 Executando job de limpeza diária...');
            try {
                const deletedCount = yield this.notificationService.deleteOldNotifications();
                console.log(`✅ Job concluído: ${deletedCount} notificações antigas removidas`);
            }
            catch (error) {
                console.error('❌ Erro no job de limpeza:', error);
            }
        });
    }
    /**
     * Webhook para quando status do pedido muda
     */
    orderStatusWebhook(orderId, newStatus, customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🔔 Webhook ativado: Pedido ${orderId} mudou para ${newStatus}`);
            try {
                yield this.notificationService.notifyCustomerOrderStatus(customerId, orderId, newStatus);
                console.log('✅ Cliente notificado via webhook');
            }
            catch (error) {
                console.error('❌ Erro no webhook de status:', error);
            }
        });
    }
    /**
     * Exemplo de integração com sistema de push notifications
     */
    sendPushNotification(userId, message, type) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Criar notificação no banco
                yield this.notificationService.createNotification(userId, type, message);
                // Aqui você integraria com serviços como Firebase, OneSignal, etc.
                console.log(`📱 Push notification enviado para usuário ${userId}: ${message}`);
                // Exemplo de integração com Firebase:
                // await firebaseAdmin.messaging().send({
                //   token: userDeviceToken,
                //   notification: {
                //     title: 'Nova Notificação',
                //     body: message
                //   },
                //   data: {
                //     type: type,
                //     userId: userId
                //   }
                // });
            }
            catch (error) {
                console.error('❌ Erro ao enviar push notification:', error);
            }
        });
    }
}
exports.NotificationJobExamples = NotificationJobExamples;
