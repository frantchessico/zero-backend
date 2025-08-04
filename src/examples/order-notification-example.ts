import { OrderService } from '../core/order/order.service';
import { User } from '../models/User';
import { Vendor } from '../models/Vendor';
import { Product } from '../models/Product';

/**
 * Exemplo de uso das notificações automáticas de pedidos
 */
async function demonstrateOrderNotifications() {
  console.log('🚀 Demonstrando notificações automáticas de pedidos\n');

  try {
    const orderService = new OrderService();

    // 1. CRIAR USUÁRIOS DE EXEMPLO
    console.log('📝 Criando usuários de exemplo...');
    
    // Criar cliente
    const customer = new User({
      userId: 'cliente_001',
      email: 'joao@example.com',
      phoneNumber: '+258123456789',
      role: 'customer',
      isActive: true
    });
    await customer.save();
    console.log('✅ Cliente criado:', customer.userId);

    // Criar vendor
    const vendor = new User({
      userId: 'vendor_001',
      email: 'restaurante@example.com',
      phoneNumber: '+258987654321',
      role: 'vendor',
      isActive: true
    });
    await vendor.save();
    console.log('✅ Vendor criado:', vendor.userId);

    // Criar vendor profile
    const vendorProfile = new Vendor({
      userId: vendor._id,
      name: 'Restaurante Delicioso',
      type: 'restaurant',
      address: {
        street: 'Rua das Flores, 123',
        district: 'Baixa',
        city: 'Maputo'
      }
    });
    await vendorProfile.save();
    console.log('✅ Perfil de vendor criado');

    // Criar produto
    const product = new Product({
      vendor: vendor._id,
      name: 'Hambúrguer Especial',
      description: 'Hambúrguer com queijo e bacon',
      price: 150.00,
      category: 'fast_food',
      isAvailable: true
    });
    await product.save();
    console.log('✅ Produto criado:', product.name);

    // 2. CRIAR PEDIDO (VAI GERAR NOTIFICAÇÃO AUTOMÁTICA)
    console.log('\n🛒 Criando pedido...');
    
    const orderData = {
      customer: customer._id,
      vendor: vendor._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          unitPrice: product.price,
          total: product.price * 2
        }
      ],
      total: product.price * 2,
      status: 'pending',
      paymentStatus: 'pending',
      deliveryAddress: {
        street: 'Rua do Cliente, 456',
        district: 'Sommerschield',
        city: 'Maputo'
      }
    };

    const order = await orderService.createOrder(orderData);
    console.log('✅ Pedido criado:', order._id);
    console.log('📱 Notificação automática enviada para o vendor!');

    // 3. ATUALIZAR STATUS DO PEDIDO (VAI GERAR NOTIFICAÇÕES)
    console.log('\n🔄 Atualizando status do pedido...');
    
    // Confirmar pedido
    await orderService.updateOrderStatus(order._id.toString(), 'confirmed');
    console.log('✅ Pedido confirmado - Notificações enviadas!');

    // Preparar pedido
    await orderService.updateOrderStatus(order._id.toString(), 'preparing');
    console.log('✅ Pedido em preparação - Notificações enviadas!');

    // Pedido pronto
    await orderService.updateOrderStatus(order._id.toString(), 'ready');
    console.log('✅ Pedido pronto - Notificações enviadas!');

    // 4. DEMONSTRAR CANCELAMENTO
    console.log('\n❌ Demonstrando cancelamento...');
    
    const cancelReason = 'Cliente solicitou cancelamento';
    await orderService.cancelOrder(order._id.toString(), cancelReason);
    console.log('✅ Pedido cancelado - Notificações enviadas!');

    console.log('\n🎉 Demonstração concluída!');
    console.log('\n📋 Resumo das notificações enviadas:');
    console.log('   • Notificação de novo pedido para vendor');
    console.log('   • Notificações de mudança de status para cliente e vendor');
    console.log('   • Notificação de cancelamento para cliente e vendor');

  } catch (error: any) {
    console.error('❌ Erro na demonstração:', error.message);
  }
}

// Executar demonstração se chamado diretamente
if (require.main === module) {
  demonstrateOrderNotifications();
}

export { demonstrateOrderNotifications }; 