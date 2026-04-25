import { NotificationService } from './notification.service';

/**
 * Exemplos de uso do sistema de notificações
 */
export class NotificationUsageExamples {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Exemplo: Fluxo completo de um pedido
   */
  async demonstrateOrderFlow() {
    const orderId = '65f1a2b3c4d5e6f7g8h9i0j1';
    const vendorId = '65f1a2b3c4d5e6f7g8h9i0j2';
    const customerId = '65f1a2b3c4d5e6f7g8h9i0j3';
    const driverId = '65f1a2b3c4d5e6f7g8h9i0j4';

    try {
      // 1. Cliente faz pedido - notificar vendor
      console.log('1. Notificando vendor sobre novo pedido...');
      await this.notificationService.notifyVendorNewOrder(vendorId, orderId);

      // 2. Vendor confirma pedido - notificar cliente
      console.log('2. Notificando cliente que pedido foi confirmado...');
      await this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'confirmed');

      // 3. Vendor prepara pedido - notificar cliente
      console.log('3. Notificando cliente que pedido está sendo preparado...');
      await this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'preparing');

      // 4. Pedido pronto - notificar drivers disponíveis
      console.log('4. Notificando drivers que pedido está pronto...');
      await this.notificationService.notifyDriversOrderReady(orderId);
      
      // 5. Driver aceita - notificar driver específico e cliente
      console.log('5. Notificando driver sobre atribuição...');
      await this.notificationService.notifyDriverAssigned(driverId, orderId);
      
      console.log('6. Notificando cliente que pedido saiu para entrega...');
      await this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'out_for_delivery');

      // 7. Pedido entregue - notificar cliente
      console.log('7. Notificando cliente que pedido foi entregue...');
      await this.notificationService.notifyCustomerOrderStatus(customerId, orderId, 'delivered');

      console.log('✅ Fluxo de notificações do pedido concluído!');
    } catch (error) {
      console.error('❌ Erro no fluxo de notificações:', error);
    }
  }

  /**
   * Exemplo: Notificar drivers próximos usando geolocalização
   */
  async demonstrateLocationBasedNotifications() {
    try {
      const orderId = '65f1a2b3c4d5e6f7g8h9i0j1';
      
      // Coordenadas de Maputo (exemplo)
      const latitude = -25.9692;
      const longitude = 32.5732;
      const radiusInKm = 5;

      console.log('📍 Buscando drivers próximos...');
      
      // Primeiro, buscar drivers disponíveis na área
      const nearbyDrivers = await this.notificationService.findNearbyDrivers(
        latitude, 
        longitude, 
        radiusInKm
      );

      console.log(`Encontrados ${nearbyDrivers.length} drivers em um raio de ${radiusInKm}km`);

      if (nearbyDrivers.length > 0) {
        // Notificar drivers próximos sobre o pedido
        await this.notificationService.notifyNearbyDrivers(
          latitude, 
          longitude, 
          orderId, 
          radiusInKm
        );
        console.log('✅ Drivers próximos notificados!');
      } else {
        console.log('⚠️ Nenhum driver disponível na área');
      }
    } catch (error) {
      console.error('❌ Erro ao notificar drivers próximos:', error);
    }
  }

  /**
   * Exemplo: Campanha promocional
   */
  async demonstratePromotionalCampaign() {
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

      const sentCount = await this.notificationService.sendPromotionalNotification(
        activeUserIds, 
        promotionalMessage
      );

      console.log(`✅ Campanha enviada para ${sentCount} usuários!`);
    } catch (error) {
      console.error('❌ Erro ao enviar campanha promocional:', error);
    }
  }

  /**
   * Exemplo: Gerenciamento de notificações do usuário
   */
  async demonstrateUserNotificationManagement() {
    const userId = '65f1a2b3c4d5e6f7g8h9i0j1';

    try {
      console.log('👤 Gerenciando notificações do usuário...');

      // 1. Buscar estatísticas
      console.log('📊 Obtendo estatísticas...');
      const stats = await this.notificationService.getNotificationStats(userId);
      console.log('Estatísticas:', {
        total: stats.total,
        naoLidas: stats.unread,
        recentes24h: stats.recent,
        porTipo: stats.byType
      });

      // 2. Buscar notificações não lidas
      console.log('📬 Buscando notificações não lidas...');
      const unreadNotifications = await this.notificationService.getUserNotifications(
        userId, 
        1, 
        10, 
        true // apenas não lidas
      );
      console.log(`Encontradas ${unreadNotifications.notifications.length} notificações não lidas`);

      // 3. Marcar todas como lidas
      if (unreadNotifications.unreadCount > 0) {
        console.log('✅ Marcando todas como lidas...');
        const markedCount = await this.notificationService.markAllAsRead(userId);
        console.log(`${markedCount} notificações marcadas como lidas`);
      }

      // 4. Buscar histórico completo com paginação
      console.log('📄 Buscando histórico completo...');
      const allNotifications = await this.notificationService.getUserNotifications(
        userId, 
        1, 
        20, 
        false // todas as notificações
      );
      
      console.log(`Página 1 de ${allNotifications.totalPages}`);
      console.log(`Total: ${allNotifications.total} notificações`);

    } catch (error) {
      console.error('❌ Erro no gerenciamento de notificações:', error);
    }
  }

  /**
   * Exemplo: Limpeza automática de notificações antigas
   */
  async demonstrateCleanupOldNotifications() {
    try {
      console.log('🧹 Iniciando limpeza de notificações antigas...');
      
      const deletedCount = await this.notificationService.deleteOldNotifications();
      
      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} notificações antigas foram removidas`);
      } else {
        console.log('ℹ️ Nenhuma notificação antiga encontrada para remoção');
      }
    } catch (error) {
      console.error('❌ Erro na limpeza de notificações:', error);
    }
  }

  /**
   * Exemplo: Fluxo de cancelamento de pedido
   */
  async demonstrateCancellationFlow() {
    const orderId = '65f1a2b3c4d5e6f7g8h9i0j1';
    const customerId = '65f1a2b3c4d5e6f7g8h9i0j3';
    const driverId = '65f1a2b3c4d5e6f7g8h9i0j4';

    try {
      console.log('❌ Processando cancelamento de pedido...');

      // Notificar cliente sobre cancelamento
      await this.notificationService.notifyCustomerOrderStatus(
        customerId, 
        orderId, 
        'cancelled'
      );

      // Se havia driver atribuído, notificar sobre cancelamento
      await this.notificationService.createNotification(
        driverId,
        'delivery_update',
        `Pedido #${orderId.slice(-6)} foi cancelado. Entrega não é mais necessária.`
      );

      console.log('✅ Notificações de cancelamento enviadas!');
    } catch (error) {
      console.error('❌ Erro ao processar cancelamento:', error);
    }
  }

  /**
   * Exemplo: Executar todos os demos
   */
  async runAllDemos() {
    console.log('🚀 Iniciando demonstração completa do sistema de notificações...\n');

    await this.demonstrateOrderFlow();
    console.log('\n' + '='.repeat(50) + '\n');

    await this.demonstrateLocationBasedNotifications();
    console.log('\n' + '='.repeat(50) + '\n');

    await this.demonstratePromotionalCampaign();
    console.log('\n' + '='.repeat(50) + '\n');

    await this.demonstrateUserNotificationManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await this.demonstrateCancellationFlow();
    console.log('\n' + '='.repeat(50) + '\n');

    await this.demonstrateCleanupOldNotifications();

    console.log('\n🎉 Demonstração completa finalizada!');
  }
}

// Exemplo de uso
export async function runNotificationExamples() {
  const examples = new NotificationUsageExamples();
  await examples.runAllDemos();
}

/**
 * Exemplo de como integrar com webhooks ou jobs
 */
export class NotificationJobExamples {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Job para limpeza diária de notificações antigas
   * Execute com cron job: 0 2 * * * (todo dia às 2h da manhã)
   */
  async dailyCleanupJob() {
    console.log('🕐 Executando job de limpeza diária...');
    
    try {
      const deletedCount = await this.notificationService.deleteOldNotifications();
      console.log(`✅ Job concluído: ${deletedCount} notificações antigas removidas`);
    } catch (error) {
      console.error('❌ Erro no job de limpeza:', error);
    }
  }

  /**
   * Webhook para quando status do pedido muda
   */
  async orderStatusWebhook(orderId: string, newStatus: string, customerId: string) {
    console.log(`🔔 Webhook ativado: Pedido ${orderId} mudou para ${newStatus}`);
    
    try {
      await this.notificationService.notifyCustomerOrderStatus(
        customerId, 
        orderId, 
        newStatus as 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
      );
      console.log('✅ Cliente notificado via webhook');
    } catch (error) {
      console.error('❌ Erro no webhook de status:', error);
    }
  }

  /**
   * Exemplo de integração com sistema de push notifications
   */
  async sendPushNotification(userId: string, message: string, type: string) {
    try {
      // Criar notificação no banco
      await this.notificationService.createNotification(userId, type as any, message);
      
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
      
    } catch (error) {
      console.error('❌ Erro ao enviar push notification:', error);
    }
  }
}
