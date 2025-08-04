import { PersonalDeliveryService } from '../core/personal-delivery/personal-delivery.service';
import { User } from '../models/User';
import { Driver } from '../models/Driver';

/**
 * Exemplo de uso do sistema de entrega pessoal
 */
async function demonstratePersonalDelivery() {
  console.log('🚀 Demonstrando sistema de entrega pessoal\n');

  try {
    // 1. CRIAR USUÁRIO DE EXEMPLO
    console.log('📝 Criando usuário de exemplo...');
    
    const customer = new User({
      userId: 'cliente_002',
      email: 'maria@example.com',
      phoneNumber: '+258123456789',
      role: 'customer',
      isActive: true
    });
    await customer.save();
    console.log('✅ Cliente criado:', customer.userId);

    // 2. CRIAR DRIVER DE EXEMPLO
    console.log('\n🚗 Criando driver de exemplo...');
    
    const driver = new Driver({
      userId: customer._id, // Usar o mesmo ID do usuário
      licenseNumber: 'LIC789012',
      vehicleInfo: {
        type: 'motorcycle',
        model: 'Honda CG 150',
        plateNumber: 'XYZ-5678',
        color: 'Azul'
      },
      isAvailable: true,
      isVerified: true,
      rating: 4.5,
      totalDeliveries: 50,
      completedDeliveries: 48
    });
    await driver.save();
    console.log('✅ Driver criado:', driver.licenseNumber);

    // 3. CRIAR ENTREGA PESSOAL - TV
    console.log('\n📺 Criando entrega de TV...');
    
    const tvDeliveryData = {
      customerId: customer._id.toString(),
      pickupAddress: {
        street: 'Rua das Flores, 123',
        district: 'Baixa',
        city: 'Maputo',
        coordinates: {
          lat: -25.9692,
          lng: 32.5732
        }
      },
      deliveryAddress: {
        street: 'Avenida 25 de Setembro, 456',
        district: 'Sommerschield',
        city: 'Maputo',
        coordinates: {
          lat: -25.9695,
          lng: 32.5735
        }
      },
      items: [
        {
          name: 'Smart TV Samsung 55"',
          description: 'TV Smart 4K com Netflix',
          quantity: 1,
          weight: 15, // kg
          dimensions: {
            length: 120, // cm
            width: 70,
            height: 10
          },
          isFragile: true,
          specialInstructions: 'Manusear com cuidado, item frágil'
        }
      ],
      category: 'electronics',
      estimatedValue: 2500, // MT
      paymentMethod: 'm-pesa',
      insuranceRequired: true,
      signatureRequired: true,
      notes: 'Entregar no horário comercial'
    };

    const tvDelivery = await PersonalDeliveryService.createPersonalDelivery(tvDeliveryData);
    console.log('✅ Entrega de TV criada:', tvDelivery._id);
    console.log('💰 Taxa de entrega:', tvDelivery.deliveryFee, 'MT');
    console.log('🛡️ Taxa de seguro:', tvDelivery.insuranceFee, 'MT');
    console.log('💵 Total:', tvDelivery.total, 'MT');

    // 4. CRIAR ENTREGA PESSOAL - DOCUMENTOS
    console.log('\n📄 Criando entrega de documentos...');
    
    const documentDeliveryData = {
      customerId: customer._id.toString(),
      pickupAddress: {
        street: 'Rua do Cliente, 789',
        district: 'Polana',
        city: 'Maputo',
        coordinates: {
          lat: -25.9700,
          lng: 32.5740
        }
      },
      deliveryAddress: {
        street: 'Rua da Empresa, 321',
        district: 'Centro',
        city: 'Maputo',
        coordinates: {
          lat: -25.9705,
          lng: 32.5745
        }
      },
      items: [
        {
          name: 'Contrato de Venda',
          description: 'Documento importante para assinatura',
          quantity: 1,
          weight: 0.1, // kg
          isFragile: false,
          specialInstructions: 'Entregar apenas para pessoa autorizada'
        },
        {
          name: 'Certidão de Nascimento',
          description: 'Documento oficial',
          quantity: 2,
          weight: 0.05, // kg
          isFragile: false,
          specialInstructions: 'Manter em envelope lacrado'
        }
      ],
      category: 'documents',
      estimatedValue: 500, // MT
      paymentMethod: 'cash',
      insuranceRequired: false,
      signatureRequired: true,
      notes: 'Entregar no horário de expediente'
    };

    const documentDelivery = await PersonalDeliveryService.createPersonalDelivery(documentDeliveryData);
    console.log('✅ Entrega de documentos criada:', documentDelivery._id);
    console.log('💰 Taxa de entrega:', documentDelivery.deliveryFee, 'MT');
    console.log('💵 Total:', documentDelivery.total, 'MT');

    // 5. ATRIBUIR DRIVER À ENTREGA DE TV
    console.log('\n🚗 Atribuindo driver à entrega de TV...');
    
    const tvDeliveryWithDriver = await PersonalDeliveryService.assignDriver(tvDelivery._id.toString());
    console.log('✅ Driver atribuído:', tvDeliveryWithDriver?.driver);
    console.log('⏰ Tempo estimado de coleta:', tvDeliveryWithDriver?.estimatedPickupTime);
    console.log('📦 Tempo estimado de entrega:', tvDeliveryWithDriver?.estimatedDeliveryTime);

    // 6. ATUALIZAR STATUS DAS ENTREGAS
    console.log('\n🔄 Atualizando status das entregas...');
    
    // TV - Coletada
    await PersonalDeliveryService.updatePersonalDelivery(tvDelivery._id.toString(), {
      status: 'picked_up',
      actualPickupTime: new Date()
    });
    console.log('✅ TV coletada');

    // TV - Em trânsito
    await PersonalDeliveryService.updatePersonalDelivery(tvDelivery._id.toString(), {
      status: 'in_transit'
    });
    console.log('✅ TV em trânsito');

    // TV - Entregue
    await PersonalDeliveryService.updatePersonalDelivery(tvDelivery._id.toString(), {
      status: 'delivered',
      actualDeliveryTime: new Date()
    });
    console.log('✅ TV entregue');

    // 7. CANCELAR ENTREGA DE DOCUMENTOS
    console.log('\n❌ Cancelando entrega de documentos...');
    
    await PersonalDeliveryService.cancelPersonalDelivery(
      documentDelivery._id.toString(),
      'Cliente solicitou cancelamento'
    );
    console.log('✅ Entrega de documentos cancelada');

    // 8. LISTAR ENTREGAS DO CLIENTE
    console.log('\n📋 Listando entregas do cliente...');
    
    const customerDeliveries = await PersonalDeliveryService.getCustomerPersonalDeliveries(
      customer._id.toString(),
      1,
      10
    );
    
    console.log('📊 Total de entregas:', customerDeliveries.total);
    console.log('📦 Entregas:', customerDeliveries.deliveries.map(d => ({
      id: d._id,
      status: d.status,
      category: d.category,
      total: d.total
    })));

    console.log('\n🎉 Demonstração concluída!');
    console.log('\n📋 Resumo das funcionalidades testadas:');
    console.log('   • Criação de entrega de TV (eletrônicos)');
    console.log('   • Criação de entrega de documentos');
    console.log('   • Cálculo automático de taxas');
    console.log('   • Atribuição de driver');
    console.log('   • Atualização de status');
    console.log('   • Cancelamento de entrega');
    console.log('   • Listagem de entregas do cliente');

  } catch (error: any) {
    console.error('❌ Erro na demonstração:', error.message);
  }
}

// Executar demonstração se chamado diretamente
if (require.main === module) {
  demonstratePersonalDelivery();
}

export { demonstratePersonalDelivery }; 