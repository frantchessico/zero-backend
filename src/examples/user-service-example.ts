import { UserService, CreateUserData, UpdateUserData } from '../services/user.service';

// Exemplo de uso do UserService
export const userServiceExample = async () => {
  try {
    console.log('🚀 Exemplo de uso do UserService\n');

    // 1. Criar um novo usuário
    console.log('1. Criando usuário...');
    const newUserData: CreateUserData = {
      phoneNumber: '+258841234567',
      email: 'joao@example.com',
      deliveryAddresses: [
        {
          tipoVia: 'Avenida',
          nomeVia: '25 de Setembro',
          numero: '123',
          bairro: 'Baixa',
          pontoReferencia: 'Próximo ao Banco de Moçambique',
        }
      ],
      paymentMethods: ['m-pesa', 'visa'],
      loyaltyPoints: 0,
      isActive: true,
    };

    const newUser = await UserService.createUser(newUserData);
    console.log('✅ Usuário criado:', newUser.phoneNumber);

    // 2. Buscar usuário por ID
    console.log('\n2. Buscando usuário por ID...');
    const userById = await UserService.getUserById(newUser._id.toString());
    console.log('✅ Usuário encontrado:', userById.phoneNumber);

    // 3. Buscar usuário por telefone
    console.log('\n3. Buscando usuário por telefone...');
    const userByPhone = await UserService.getUserByPhone('+258841234567');
    console.log('✅ Usuário encontrado:', userByPhone.email);

    // 4. Adicionar endereço de entrega
    console.log('\n4. Adicionando novo endereço...');
    const newAddress = {
      tipoVia: 'Rua',
      nomeVia: 'Mouzinho de Albuquerque',
      numero: '456',
      bairro: 'Sommerschield',
      pontoReferencia: 'Próximo ao Hotel Polana',
    };

    const userWithNewAddress = await UserService.addDeliveryAddress(
      newUser._id.toString(),
      newAddress
    );
    console.log('✅ Endereço adicionado. Total de endereços:', userWithNewAddress.deliveryAddresses.length);

    // 5. Adicionar método de pagamento
    console.log('\n5. Adicionando método de pagamento...');
    const userWithPayment = await UserService.addPaymentMethod(
      newUser._id.toString(),
      'mastercard'
    );
    console.log('✅ Métodos de pagamento:', userWithPayment.paymentMethods);

    // 6. Adicionar pontos de fidelidade
    console.log('\n6. Adicionando pontos de fidelidade...');
    const userWithPoints = await UserService.addLoyaltyPoints(
      newUser._id.toString(),
      100
    );
    console.log('✅ Pontos de fidelidade:', userWithPoints.loyaltyPoints);

    // 7. Atualizar usuário
    console.log('\n7. Atualizando usuário...');
    const updateData: UpdateUserData = {
      email: 'joao.updated@example.com',
      loyaltyPoints: 150,
    };

    const updatedUser = await UserService.updateUser(
      newUser._id.toString(),
      updateData
    );
    console.log('✅ Usuário atualizado:', updatedUser.email);

    // 8. Obter estatísticas dos usuários
    console.log('\n8. Obtendo estatísticas...');
    const stats = await UserService.getUserStats();
    console.log('✅ Estatísticas:', {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      usersWithOrders: stats.usersWithOrders,
      averageLoyaltyPoints: Math.round(stats.averageLoyaltyPoints),
    });

    // 9. Listar todos os usuários
    console.log('\n9. Listando usuários...');
    const usersList = await UserService.getAllUsers(1, 5, true);
    console.log('✅ Usuários encontrados:', usersList.users.length);
    console.log('📊 Paginação:', {
      page: usersList.pagination.page,
      total: usersList.pagination.total,
      totalPages: usersList.pagination.totalPages,
    });

    // 10. Verificar se usuário existe
    console.log('\n10. Verificando existência do usuário...');
    const exists = await UserService.userExists('+258841234567');
    console.log('✅ Usuário existe:', exists);

    console.log('\n🎉 Exemplo concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no exemplo:', error);
  }
};

// Executar exemplo se este arquivo for executado diretamente
if (require.main === module) {
  userServiceExample()
    .then(() => {
      console.log('🏁 Exemplo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal no exemplo:', error);
      process.exit(1);
    });
} 