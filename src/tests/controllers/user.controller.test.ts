import { Request, Response } from 'express';
import { UserController } from '../../core/user/user.controller';
import { UserService } from '../../core/user/user.service';

// Mock do UserService
jest.mock('../../core/user/user.service');

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset dos mocks
    jest.clearAllMocks();
    
    // Mock do UserService
    mockUserService = new UserService() as jest.Mocked<UserService>;
    userController = new UserController();
    
    // Mock do response
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('createUser', () => {
    it('deve criar usuário com sucesso', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        phoneNumber: '+258123456789'
      };

      const createdUser = {
        _id: '507f1f77bcf86cd799439011',
        ...userData,
        isActive: true,
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest = {
        body: userData
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'createUser')
        .mockResolvedValue(createdUser);

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuário criado com sucesso',
        data: createdUser
      });
    });

    it('deve retornar erro 400 quando userId está faltando', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        role: 'customer'
      };

      mockRequest = {
        body: userData
      };

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'userId e role são obrigatórios'
      });
    });

    it('deve retornar erro 400 quando role está faltando', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com'
      };

      mockRequest = {
        body: userData
      };

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'userId e role são obrigatórios'
      });
    });

    it('deve retornar erro 400 quando service lança exceção', async () => {
      // Arrange
      const userData = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer'
      };

      mockRequest = {
        body: userData
      };

      // Mock do service lançando erro
      jest.spyOn(userController['userService'], 'createUser')
        .mockRejectedValue(new Error('Usuário já existe'));

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário já existe'
      });
    });
  });

  describe('getUserById', () => {
    it('deve retornar usuário quando encontrado', async () => {
      // Arrange
      const userId = 'user123';
      const user = {
        _id: '507f1f77bcf86cd799439011',
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        isActive: true
      };

      mockRequest = {
        params: { userId }
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'getUserById')
        .mockResolvedValue(user);

      // Act
      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: user
      });
    });

    it('deve retornar 404 quando usuário não encontrado', async () => {
      // Arrange
      const userId = 'nonexistent';

      mockRequest = {
        params: { userId }
      };

      // Mock do service retornando null
      jest.spyOn(userController['userService'], 'getUserById')
        .mockResolvedValue(null);

      // Act
      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não encontrado'
      });
    });

    it('deve retornar erro 500 quando service lança exceção', async () => {
      // Arrange
      const userId = 'user123';

      mockRequest = {
        params: { userId }
      };

      // Mock do service lançando erro
      jest.spyOn(userController['userService'], 'getUserById')
        .mockRejectedValue(new Error('Erro de banco de dados'));

      // Act
      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Erro de banco de dados'
      });
    });
  });

  describe('getUserByEmail', () => {
    it('deve retornar usuário por email', async () => {
      // Arrange
      const email = 'test@example.com';
      const user = {
        _id: '507f1f77bcf86cd799439011',
        userId: 'user123',
        email: 'test@example.com',
        role: 'customer',
        isActive: true
      };

      mockRequest = {
        params: { email }
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'getUserByEmail')
        .mockResolvedValue(user);

      // Act
      await userController.getUserByEmail(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: user
      });
    });
  });

  describe('getAllUsers', () => {
    it('deve retornar lista de usuários com paginação', async () => {
      // Arrange
      const users = [
        {
          _id: '507f1f77bcf86cd799439011',
          userId: 'user1',
          email: 'user1@example.com',
          role: 'customer',
          isActive: true
        },
        {
          _id: '507f1f77bcf86cd799439012',
          userId: 'user2',
          email: 'user2@example.com',
          role: 'driver',
          isActive: true
        }
      ];

      const paginationResult = {
        users,
        total: 2,
        totalPages: 1,
        currentPage: 1
      };

      mockRequest = {
        query: { page: '1', limit: '10' }
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'getAllUsers')
        .mockResolvedValue(paginationResult);

      // Act
      await userController.getAllUsers(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: users,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 10
        }
      });
    });
  });

  describe('updateUser', () => {
    it('deve atualizar usuário com sucesso', async () => {
      // Arrange
      const userId = 'user123';
      const updateData = {
        email: 'updated@example.com',
        phoneNumber: '+258987654321'
      };

      const updatedUser = {
        _id: '507f1f77bcf86cd799439011',
        userId: 'user123',
        ...updateData,
        role: 'customer',
        isActive: true
      };

      mockRequest = {
        params: { userId },
        body: updateData
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'updateUser')
        .mockResolvedValue(updatedUser);

      // Act
      await userController.updateUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: updatedUser
      });
    });

    it('deve retornar 404 quando usuário não encontrado para atualização', async () => {
      // Arrange
      const userId = 'nonexistent';
      const updateData = {
        email: 'updated@example.com'
      };

      mockRequest = {
        params: { userId },
        body: updateData
      };

      // Mock do service retornando null
      jest.spyOn(userController['userService'], 'updateUser')
        .mockResolvedValue(null);

      // Act
      await userController.updateUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não encontrado'
      });
    });
  });

  describe('deactivateUser', () => {
    it('deve desativar usuário com sucesso', async () => {
      // Arrange
      const userId = 'user123';

      mockRequest = {
        params: { userId }
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'deactivateUser')
        .mockResolvedValue(true);

      // Act
      await userController.deactivateUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuário desativado com sucesso'
      });
    });

    it('deve retornar 404 quando usuário não encontrado para desativação', async () => {
      // Arrange
      const userId = 'nonexistent';

      mockRequest = {
        params: { userId }
      };

      // Mock do service retornando false
      jest.spyOn(userController['userService'], 'deactivateUser')
        .mockResolvedValue(false);

      // Act
      await userController.deactivateUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuário não encontrado'
      });
    });
  });

  describe('addDeliveryAddress', () => {
    it('deve adicionar endereço de entrega com sucesso', async () => {
      // Arrange
      const userId = 'user123';
      const address = {
        street: 'Rua das Flores',
        city: 'Maputo',
        postalCode: '1100',
        country: 'Moçambique'
      };

      const updatedUser = {
        _id: '507f1f77bcf86cd799439011',
        userId: 'user123',
        deliveryAddresses: [address],
        isActive: true
      };

      mockRequest = {
        params: { userId },
        body: address
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'addDeliveryAddress')
        .mockResolvedValue(updatedUser);

      // Act
      await userController.addDeliveryAddress(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Endereço adicionado com sucesso',
        data: updatedUser
      });
    });
  });

  describe('addLoyaltyPoints', () => {
    it('deve adicionar pontos de fidelidade com sucesso', async () => {
      // Arrange
      const userId = 'user123';
      const points = 100;

      const updatedUser = {
        _id: '507f1f77bcf86cd799439011',
        userId: 'user123',
        loyaltyPoints: 150,
        isActive: true
      };

      mockRequest = {
        params: { userId },
        body: { points }
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'addLoyaltyPoints')
        .mockResolvedValue(updatedUser);

      // Act
      await userController.addLoyaltyPoints(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Pontos de fidelidade adicionados com sucesso',
        data: updatedUser
      });
    });

    it('deve retornar erro quando pontos são negativos', async () => {
      // Arrange
      const userId = 'user123';
      const points = -50;

      mockRequest = {
        params: { userId },
        body: { points }
      };

      // Act
      await userController.addLoyaltyPoints(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Pontos devem ser um número positivo'
      });
    });
  });

  describe('getTopLoyaltyUsers', () => {
    it('deve retornar top usuários por fidelidade', async () => {
      // Arrange
      const topUsers = [
        {
          _id: '507f1f77bcf86cd799439011',
          userId: 'user1',
          loyaltyPoints: 1000,
          isActive: true
        },
        {
          _id: '507f1f77bcf86cd799439012',
          userId: 'user2',
          loyaltyPoints: 800,
          isActive: true
        }
      ];

      mockRequest = {
        query: { limit: '10' }
      };

      // Mock do service
      jest.spyOn(userController['userService'], 'getTopLoyaltyUsers')
        .mockResolvedValue(topUsers);

      // Act
      await userController.getTopLoyaltyUsers(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: topUsers
      });
    });
  });
}); 