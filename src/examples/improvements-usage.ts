import { User } from '../models/User';
import { Order } from '../models/Order';
import { Vendor } from '../models/Vendor';
import { AuditService } from '../core/audit/audit.service';
import { QueryService } from '../core/audit/query.service';

/**
 * Exemplos de uso das melhorias implementadas
 */
export class ImprovementsUsageExamples {

  /**
   * Exemplo 1: Usando Virtuals Bidirecionais
   */
  static async exampleVirtuals() {
    console.log('=== Exemplo 1: Virtuals Bidirecionais ===');

    // Buscar user com todos os relacionamentos
    const user = await User.findById('user123')
      .populate('vendors')
      .populate('orders')
      .populate('deliveries')
      .exec();

    if (user) {
      console.log('User:', user.userId);
      console.log('Vendors:', user.vendors?.length || 0);
      console.log('Orders:', user.orders?.length || 0);
      console.log('Deliveries:', user.deliveries?.length || 0);

      // Acessar dados relacionados
      user.vendors?.forEach(vendor => {
        console.log(`- Vendor: ${vendor.name} (${vendor.status})`);
      });

      user.orders?.forEach(order => {
        console.log(`- Order: ${order._id} (${order.status})`);
      });
    }
  }

  /**
   * Exemplo 2: Usando Métodos de Instância
   */
  static async exampleInstanceMethods() {
    console.log('\n=== Exemplo 2: Métodos de Instância ===');

    // Verificar permissões do user
    const user = await User.findById('user123');
    if (user) {
      console.log('User can order:', user.canOrder());
      console.log('User can deliver:', user.canDeliver());
      console.log('User can vendor:', user.canVendor());

      // Obter estatísticas
      const stats = await user.getStats();
      console.log('User stats:', stats);
    }

    // Verificar permissões do order
    const order = await Order.findById('order123');
    if (order) {
      console.log('Order can cancel:', order.canCancel());
      console.log('Order can deliver:', order.canDeliver());
      console.log('Order stats:', order.getStats());
      console.log('Estimated delivery:', order.getEstimatedDeliveryTime());
    }

    // Verificar permissões do vendor
    const vendor = await Vendor.findById('vendor123');
    if (vendor) {
      console.log('Vendor can receive orders:', vendor.canReceiveOrders());
      console.log('Vendor is open:', vendor.isOpen);
      console.log('Vendor stats:', await vendor.getStats());
    }
  }

  /**
   * Exemplo 3: Usando Triggers Automáticos
   */
  static async exampleTriggers() {
    console.log('\n=== Exemplo 3: Triggers Automáticos ===');

    // Criar um order (triggers automáticos serão executados)
    const orderData = {
      customer: 'user123',
      vendor: 'vendor123',
      items: [
        {
          product: 'product123',
          quantity: 2,
          unitPrice: 25.99,
          totalPrice: 51.98
        }
      ],
      deliveryAddress: {
        street: 'Rua das Flores',
        city: 'Maputo',
        country: 'Moçambique'
      },
      subtotal: 51.98,
      deliveryFee: 5.00,
      tax: 2.60,
      total: 59.58,
      paymentMethod: 'm-pesa',
      orderType: 'food'
    };

    const order = new Order(orderData);
    await order.save();

    console.log('Order criado com triggers automáticos:');
    console.log('- Customer orderHistory atualizado');
    console.log('- Notificações criadas para customer e vendor');
    console.log('- Status sincronizado com delivery');

    // Atualizar status (mais triggers)
    await Order.findByIdAndUpdate(order._id, {
      status: 'delivered'
    });

    console.log('Status atualizado com triggers:');
    console.log('- Notificação de mudança de status criada');
    console.log('- Pontos de fidelidade adicionados');
    console.log('- Delivery status sincronizado');
  }

  /**
   * Exemplo 4: Usando Sistema de Auditoria
   */
  static async exampleAudit() {
    console.log('\n=== Exemplo 4: Sistema de Auditoria ===');

    // Registrar mudança manualmente
    await AuditService.logChange(
      'User',
      'user123',
      'UPDATE',
      'admin123',
      'admin',
      { email: 'old@example.com' },
      { email: 'new@example.com' },
      { reason: 'Email update' }
    );

    // Registrar criação
    await AuditService.logCreation(
      'Product',
      'product123',
      'vendor123',
      'vendor',
      { name: 'Pizza Margherita', price: 25.99 },
      { category: 'food' }
    );

    // Registrar mudança de status
    await AuditService.logStatusChange(
      'Order',
      'order123',
      'vendor123',
      'vendor',
      'pending',
      'confirmed',
      { reason: 'Order confirmed' }
    );

    // Buscar logs de auditoria
    const logs = await AuditService.getAuditLogs({
      entity: 'User',
      userId: 'user123'
    });

    console.log('Logs de auditoria encontrados:', logs.total);

    // Buscar histórico de uma entidade
    const entityHistory = await AuditService.getEntityHistory('User', 'user123');
    console.log('Histórico da entidade:', entityHistory.length);

    // Gerar relatório
    const report = await AuditService.generateAuditReport(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
      new Date()
    );

    console.log('Relatório de auditoria:');
    console.log('- Total de ações:', report.totalActions);
    console.log('- Ações por tipo:', report.actionsByType);
    console.log('- Top usuários:', report.topUsers.length);
  }

  /**
   * Exemplo 5: Usando QueryService Otimizado
   */
  static async exampleQueryService() {
    console.log('\n=== Exemplo 5: QueryService Otimizado ===');

    // Buscar user com relacionamentos
    const userWithRelations = await QueryService.getUserWithRelations('user123');
    console.log('User com relacionamentos:', userWithRelations ? 'Encontrado' : 'Não encontrado');

    // Buscar order com relacionamentos
    const orderWithRelations = await QueryService.getOrderWithRelations('order123');
    console.log('Order com relacionamentos:', orderWithRelations ? 'Encontrado' : 'Não encontrado');

    // Buscar produtos com vendor e categoria
    const productsWithRelations = await QueryService.getProductsWithRelations(
      { isAvailable: true },
      { limit: 10, sort: { price: 1 } }
    );
    console.log('Produtos com relacionamentos:', productsWithRelations.length);

    // Buscar vendor com produtos e estatísticas
    const vendorWithRelations = await QueryService.getVendorWithRelations('vendor123');
    console.log('Vendor com relacionamentos:', vendorWithRelations ? 'Encontrado' : 'Não encontrado');

    // Buscar delivery com order e driver
    const deliveryWithRelations = await QueryService.getDeliveryWithRelations('delivery123');
    console.log('Delivery com relacionamentos:', deliveryWithRelations ? 'Encontrado' : 'Não encontrado');

    // Buscar orders do usuário
    const userOrders = await QueryService.getUserOrders('user123', {
      status: 'delivered',
      sort: { createdAt: -1 },
      limit: 5
    });
    console.log('Orders do usuário:', userOrders.length);

    // Buscar produtos do vendor
    const vendorProducts = await QueryService.getVendorProducts('vendor123', {
      isAvailable: true,
      sort: { name: 1 }
    });
    console.log('Produtos do vendor:', vendorProducts.length);

    // Buscar deliveries do driver
    const driverDeliveries = await QueryService.getDriverDeliveries('driver123', {
      status: 'delivered',
      sort: { createdAt: -1 }
    });
    console.log('Deliveries do driver:', driverDeliveries.length);

    // Buscar produtos populares
    const popularProducts = await QueryService.getPopularProducts(10);
    console.log('Produtos populares:', popularProducts.length);

    // Buscar categorias com contagem
    const categoriesWithCount = await QueryService.getCategoriesWithCount();
    console.log('Categorias com contagem:', categoriesWithCount.length);

    // Buscar dados do dashboard
    const dashboardData = await QueryService.getDashboardData();
    console.log('Dashboard data:', {
      totalUsers: dashboardData.totalUsers,
      totalVendors: dashboardData.totalVendors,
      totalProducts: dashboardData.totalProducts,
      totalOrders: dashboardData.totalOrders
    });
  }

  /**
   * Exemplo 6: Usando Validação Automática
   */
  static async exampleValidation() {
    console.log('\n=== Exemplo 6: Validação Automática ===');

    try {
      // Tentar criar order com customer inválido
      const invalidOrder = new Order({
        customer: 'invalid-customer-id',
        vendor: 'vendor123',
        items: [],
        deliveryAddress: {},
        subtotal: 0,
        deliveryFee: 0,
        tax: 0,
        total: 0,
        paymentMethod: 'm-pesa',
        orderType: 'food'
      });

      await invalidOrder.save();
    } catch (error: any) {
      console.log('Validação funcionou - Erro capturado:', error.message);
    }

    try {
      // Tentar criar vendor com owner inválido
      const invalidVendor = new Vendor({
        name: 'Invalid Vendor',
        type: 'restaurant',
        owner: 'invalid-owner-id',
        address: {}
      });

      await invalidVendor.save();
    } catch (error: any) {
      console.log('Validação funcionou - Erro capturado:', error.message);
    }
  }

  /**
   * Executar todos os exemplos
   */
  static async runAllExamples() {
    console.log('🚀 Executando exemplos das melhorias implementadas...\n');

    try {
      await this.exampleVirtuals();
      await this.exampleInstanceMethods();
      await this.exampleTriggers();
      await this.exampleAudit();
      await this.exampleQueryService();
      await this.exampleValidation();

      console.log('\n✅ Todos os exemplos executados com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao executar exemplos:', error.message);
    }
  }
}

// Exportar para uso
export default ImprovementsUsageExamples; 