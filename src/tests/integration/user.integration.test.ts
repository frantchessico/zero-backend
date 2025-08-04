import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../../models/User';

describe('User Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Configurar MongoDB em memória para testes
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Limpar banco de dados antes de cada teste
    await User.deleteMany({});
  });

  describe('POST /api/users', () => {
    it('deve criar usuário com dados válidos', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        phoneNumber: '+258123456789'
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Usuário criado com sucesso');
      expect(response.body.data.userId).toBe(userData.userId);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.loyaltyPoints).toBe(0);
    });

    it('deve retornar erro 400 quando userId está faltando', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        role: 'customer'
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('userId e role são obrigatórios');
    });

    it('deve retornar erro 400 quando role está faltando', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com'
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('userId e role são obrigatórios');
    });

    it('deve retornar erro 400 quando usuário já existe', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário primeiro
      await request(app)
        .post('/api/users')
        .send(userData);

      // Tentar criar usuário com mesmo userId
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('já existe');
    });
  });

  describe('GET /api/users/:userId', () => {
    it('deve retornar usuário quando encontrado', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      // Act
      const response = await request(app)
        .get('/api/users/user123')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(userData.userId);
      expect(response.body.data.email).toBe(userData.email);
    });

    it('deve retornar 404 quando usuário não encontrado', async () => {
      // Act & Assert
      const response = await request(app)
        .get('/api/users/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário não encontrado');
    });
  });

  describe('GET /api/users/email/:email', () => {
    it('deve retornar usuário por email', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      // Act
      const response = await request(app)
        .get('/api/users/email/test@example.com')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
    });

    it('deve retornar 404 quando email não encontrado', async () => {
      // Act & Assert
      const response = await request(app)
        .get('/api/users/email/nonexistent@example.com')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário não encontrado');
    });
  });

  describe('PUT /api/users/:userId', () => {
    it('deve atualizar usuário com sucesso', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      const updateData = {
        email: 'updated@example.com',
        phoneNumber: '+258987654321'
      };

      // Act
      const response = await request(app)
        .put('/api/users/user123')
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Usuário atualizado com sucesso');
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.phoneNumber).toBe(updateData.phoneNumber);
    });

    it('deve retornar 404 quando usuário não encontrado para atualização', async () => {
      // Arrange
      const updateData = {
        email: 'updated@example.com'
      };

      // Act & Assert
      const response = await request(app)
        .put('/api/users/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário não encontrado');
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('deve desativar usuário com sucesso', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      // Act
      const response = await request(app)
        .delete('/api/users/user123')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Usuário desativado com sucesso');

      // Verificar se usuário foi desativado
      const getUserResponse = await request(app)
        .get('/api/users/user123')
        .expect(404);

      expect(getUserResponse.body.success).toBe(false);
    });

    it('deve retornar 404 quando usuário não encontrado para desativação', async () => {
      // Act & Assert
      const response = await request(app)
        .delete('/api/users/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário não encontrado');
    });
  });

  describe('PATCH /api/users/:userId/reactivate', () => {
    it('deve reativar usuário com sucesso', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      // Desativar usuário
      await request(app)
        .delete('/api/users/user123');

      // Act
      const response = await request(app)
        .patch('/api/users/user123/reactivate')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Usuário reativado com sucesso');

      // Verificar se usuário foi reativado
      const getUserResponse = await request(app)
        .get('/api/users/user123')
        .expect(200);

      expect(getUserResponse.body.success).toBe(true);
    });
  });

  describe('POST /api/users/:userId/addresses', () => {
    it('deve adicionar endereço de entrega com sucesso', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      const address = {
        street: 'Rua das Flores',
        city: 'Maputo',
        postalCode: '1100',
        country: 'Moçambique'
      };

      // Act
      const response = await request(app)
        .post('/api/users/user123/addresses')
        .send(address)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Endereço adicionado com sucesso');
      expect(response.body.data.deliveryAddresses).toHaveLength(1);
      expect(response.body.data.deliveryAddresses[0].street).toBe(address.street);
      expect(response.body.data.deliveryAddresses[0].city).toBe(address.city);
    });
  });

  describe('POST /api/users/:userId/loyalty-points/add', () => {
    it('deve adicionar pontos de fidelidade com sucesso', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      const pointsData = {
        points: 100
      };

      // Act
      const response = await request(app)
        .post('/api/users/user123/loyalty-points/add')
        .send(pointsData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pontos de fidelidade adicionados com sucesso');
      expect(response.body.data.loyaltyPoints).toBe(100);
    });

    it('deve retornar erro quando pontos são negativos', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      // Criar usuário
      await request(app)
        .post('/api/users')
        .send(userData);

      const pointsData = {
        points: -50
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/users/user123/loyalty-points/add')
        .send(pointsData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Pontos devem ser um número positivo');
    });
  });

  describe('GET /api/users/top-loyalty', () => {
    it('deve retornar top usuários por fidelidade', async () => {
      // Arrange
      const users = [
        {
          userId: 'user1',
          email: 'user1@example.com',
          role: 'customer'
        },
        {
          userId: 'user2',
          email: 'user2@example.com',
          role: 'customer'
        }
      ];

      // Criar usuários
      for (const user of users) {
        await request(app)
          .post('/api/users')
          .send(user);
      }

      // Adicionar pontos de fidelidade
      await request(app)
        .post('/api/users/user1/loyalty-points/add')
        .send({ points: 1000 });

      await request(app)
        .post('/api/users/user2/loyalty-points/add')
        .send({ points: 800 });

      // Act
      const response = await request(app)
        .get('/api/users/top-loyalty?limit=10')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].loyaltyPoints).toBe(1000);
      expect(response.body.data[1].loyaltyPoints).toBe(800);
    });
  });

  describe('GET /api/users/stats/by-role', () => {
    it('deve retornar estatísticas por role', async () => {
      // Arrange
      const users = [
        { userId: 'user1', email: 'user1@example.com', role: 'customer' },
        { userId: 'user2', email: 'user2@example.com', role: 'customer' },
        { userId: 'driver1', email: 'driver1@example.com', role: 'driver' },
        { userId: 'vendor1', email: 'vendor1@example.com', role: 'vendor' }
      ];

      // Criar usuários
      for (const user of users) {
        await request(app)
          .post('/api/users')
          .send(user);
      }

      // Act
      const response = await request(app)
        .get('/api/users/stats/by-role')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toBe(2);
      expect(response.body.data.drivers).toBe(1);
      expect(response.body.data.vendors).toBe(1);
      expect(response.body.data.total).toBe(4);
    });
  });
}); 