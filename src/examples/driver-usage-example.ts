// Exemplo de uso da relação User ↔ Driver
// Este arquivo demonstra como usar a nova implementação onde Driver é uma extensão do User

import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { DriverService } from '../core/driver/driver.service';

async function demonstrateUserDriverRelationship() {
  console.log('🚀 Demonstrando relação User ↔ Driver\n');

  try {
    // ===== 1. CRIAR USER COM ROLE 'DRIVER' =====
    console.log('1️⃣ Criando User com role "driver"...');
    
    const user = new User({
      userId: 'driver_001',
      phoneNumber: '+258123456789',
      email: 'joao@example.com',
      role: 'driver',
      isActive: true
    });
    
    await user.save();
    console.log('✅ User criado:', {
      id: user._id,
      userId: user.userId,
      role: user.role,
      isActive: user.isActive
    });

    // ===== 2. CRIAR PERFIL DE DRIVER =====
    console.log('\n2️⃣ Criando perfil de Driver...');
    
    const driverData = {
      userId: user._id.toString(),
      licenseNumber: 'LIC123456',
      vehicleInfo: {
        type: 'motorcycle' as const,
        model: 'Honda CG 150',
        plateNumber: 'ABC-1234',
        color: 'Vermelho'
      },
      workingHours: {
        startTime: '08:00',
        endTime: '18:00'
      },
      acceptedPaymentMethods: ['cash', 'm-pesa'],
      deliveryAreas: ['Maputo Centro', 'Matola'],
      documents: {
        license: 'license_url_here',
        insurance: 'insurance_url_here'
      },
      emergencyContact: {
        name: 'Maria Silva',
        phoneNumber: '+258987654321',
        relationship: 'Esposa'
      }
    };

    const driver = await DriverService.createDriver(user._id.toString(), driverData);
    console.log('✅ Driver criado:', {
      id: driver._id,
      licenseNumber: driver.licenseNumber,
      isVerified: driver.isVerified
    });

    // ===== 3. VERIFICAR RELACIONAMENTOS =====
    console.log('\n3️⃣ Verificando relacionamentos...');
    
    // Buscar User com perfil de driver
    const userWithDriver = await User.findById(user._id).populate('driverProfile');
    console.log('✅ User com perfil de driver:', {
      userId: userWithDriver?.userId,
      role: userWithDriver?.role,
      hasDriverProfile: await userWithDriver?.hasDriverProfile(),
      driverProfile: userWithDriver?.driverProfile ? {
        licenseNumber: userWithDriver.driverProfile.licenseNumber
      } : null
    });

    // Buscar Driver com dados do User
    const driverWithUser = await Driver.findById(driver._id).populate('user');
    console.log('✅ Driver com dados do User:', {
      driverId: driverWithUser?._id,
      licenseNumber: driverWithUser?.licenseNumber,
      userData: driverWithUser?.user ? {
        userId: driverWithUser.user.userId,
        email: driverWithUser.user.email,
        role: driverWithUser.user.role
      } : null
    });

    // ===== 4. TESTAR MÉTODOS DE INSTÂNCIA =====
    console.log('\n4️⃣ Testando métodos de instância...');
    
    // Verificar se User pode fazer entregas
    console.log('✅ User pode fazer entregas:', user.canDeliver());
    
    // Verificar se Driver está disponível
    console.log('✅ Driver está disponível:', driver.isDriverAvailable());
    
    // Atualizar rating do driver
    await driver.updateRating(4.5);
    console.log('✅ Rating atualizado:', {
      rating: driver.rating,
      reviewCount: driver.reviewCount
    });

    // ===== 5. TESTAR MÉTODOS ESTÁTICOS =====
    console.log('\n5️⃣ Testando métodos estáticos...');
    
    // Buscar drivers disponíveis
    const availableDrivers = await Driver.findAvailableDrivers();
    console.log('✅ Drivers disponíveis:', availableDrivers.length);
    
    // Buscar drivers por rating
    const topDrivers = await Driver.findDriversByRating(4.0);
    console.log('✅ Top drivers (rating >= 4.0):', topDrivers.length);

    // ===== 6. TESTAR ESTATÍSTICAS =====
    console.log('\n6️⃣ Testando estatísticas...');
    
    // Estatísticas do User
    const userStats = await user.getStats();
    console.log('✅ Estatísticas do User:', {
      totalOrders: userStats.totalOrders,
      loyaltyPoints: userStats.loyaltyPoints,
      driverStats: userStats.driverStats
    });

    // Estatísticas do Driver
    const driverStats = await driver.getDriverStats();
    console.log('✅ Estatísticas do Driver:', {
      totalDeliveries: driverStats.totalDeliveries,
      completedDeliveries: driverStats.completedDeliveries,
      rating: driverStats.rating
    });

    // ===== 7. TESTAR OPERAÇÕES DE DRIVER =====
    console.log('\n7️⃣ Testando operações de Driver...');
    
    // Atualizar localização
    await DriverService.updateDriverLocation(driver._id.toString(), {
      latitude: -25.9692,
      longitude: 32.5732
    });
    console.log('✅ Localização atualizada');
    
    // Verificar driver (admin)
    await DriverService.verifyDriver(driver._id.toString(), true);
    console.log('✅ Driver verificado');

    // ===== 8. DEMONSTRAR CONSULTAS COMPLEXAS =====
    console.log('\n8️⃣ Consultas complexas...');
    
    // Buscar driver por User ID
    const driverByUserId = await DriverService.getDriverByUserId(user._id.toString());
    console.log('✅ Driver por User ID:', driverByUserId ? 'Encontrado' : 'Não encontrado');
    
    // Dashboard do driver
    const dashboard = await DriverService.getDriverStats(driver._id.toString());
    console.log('✅ Dashboard do driver:', {
      hasStats: !!dashboard,
      totalDeliveries: dashboard?.totalDeliveries || 0
    });

    console.log('\n🎉 Demonstração concluída com sucesso!');
    console.log('\n📋 Resumo da relação User ↔ Driver:');
    console.log('• User é a entidade base com dados comuns');
    console.log('• Driver é uma extensão especializada do User');
    console.log('• User.role = "driver" indica que é motorista');
    console.log('• Driver contém atributos específicos de motorista');
    console.log('• Relacionamento via Driver.userId → User._id');
    console.log('• Virtuals permitem consultas bidirecionais');

  } catch (error) {
    console.error('❌ Erro na demonstração:', error);
  }
}

// Executar demonstração
if (require.main === module) {
  demonstrateUserDriverRelationship();
}

export { demonstrateUserDriverRelationship }; 