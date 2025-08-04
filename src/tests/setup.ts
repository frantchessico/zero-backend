import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Configuração global para testes
beforeAll(async () => {
  // Configurar variáveis de ambiente para teste
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  
  // Configurar timezone para testes
  process.env.TZ = 'UTC';
});

afterAll(async () => {
  // Limpeza global após todos os testes
  await mongoose.disconnect();
});

// Configuração global do Jest
global.console = {
  ...console,
  // Suprimir logs durante testes
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock global do Winston logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// Configuração de timeout para testes
jest.setTimeout(10000);

// Helper para limpar mocks entre testes
beforeEach(() => {
  jest.clearAllMocks();
});

// Helper para criar dados de teste
export const createTestUser = (overrides = {}) => ({
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'customer',
  phoneNumber: '+258123456789',
  isActive: true,
  loyaltyPoints: 0,
  deliveryAddresses: [],
  paymentMethods: [],
  orderHistory: [],
  ...overrides
});

export const createTestProduct = (overrides = {}) => ({
  name: 'Test Product',
  price: 25.99,
  vendor: 'test-vendor-123',
  type: 'food',
  description: 'Test product description',
  categoryId: 'test-category-123',
  isAvailable: true,
  rating: 0,
  ...overrides
});

export const createTestOrder = (overrides = {}) => ({
  orderId: 'test-order-123',
  customerId: 'test-user-123',
  vendorId: 'test-vendor-123',
  items: [
    {
      productId: 'test-product-123',
      quantity: 2,
      price: 25.99
    }
  ],
  totalAmount: 51.98,
  status: 'pending',
  ...overrides
});

// Helper para mock de Request
export const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  ...overrides
});

// Helper para mock de Response
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

// Helper para mock de NextFunction
export const createMockNext = () => jest.fn();

// Configuração de banco de dados em memória para testes
export const setupTestDatabase = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  return {
    mongoServer,
    disconnect: async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  };
};

// Helper para limpar banco de dados
export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Configuração de autenticação mock
export const mockAuthUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer'
};

// Helper para adicionar usuário autenticado ao request
export const addAuthToRequest = (req: any, user = mockAuthUser) => {
  req.user = user;
  req.auth = {
    userId: user.id,
    sessionId: 'test-session-123'
  };
  return req;
};

// Configuração de rate limiting para testes
export const mockRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite por IP
  message: 'Muitas requisições deste IP'
};

// Helper para validar resposta de API
export const validateApiResponse = (response: any, expectedStatus: number, expectedSuccess: boolean) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', expectedSuccess);
};

// Helper para validar estrutura de paginação
export const validatePagination = (response: any) => {
  expect(response.body).toHaveProperty('pagination');
  expect(response.body.pagination).toHaveProperty('currentPage');
  expect(response.body.pagination).toHaveProperty('totalPages');
  expect(response.body.pagination).toHaveProperty('totalItems');
  expect(response.body.pagination).toHaveProperty('itemsPerPage');
};

// Helper para validar estrutura de erro
export const validateErrorResponse = (response: any, expectedStatus: number, expectedMessage?: string) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', false);
  if (expectedMessage) {
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain(expectedMessage);
  }
};

// Configuração de timeouts específicos
export const TEST_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000
};

// Configuração de dados de teste
export const TEST_DATA = {
  USERS: {
    CUSTOMER: {
      userId: 'customer-123',
      email: 'customer@example.com',
      role: 'customer'
    },
    DRIVER: {
      userId: 'driver-123',
      email: 'driver@example.com',
      role: 'driver'
    },
    VENDOR: {
      userId: 'vendor-123',
      email: 'vendor@example.com',
      role: 'vendor'
    }
  },
  PRODUCTS: {
    FOOD: {
      name: 'Pizza Margherita',
      price: 25.99,
      type: 'food',
      categoryId: 'food-category-123'
    },
    MEDICINE: {
      name: 'Paracetamol',
      price: 5.99,
      type: 'medicine',
      categoryId: 'medicine-category-123'
    }
  },
  ORDERS: {
    PENDING: {
      status: 'pending',
      totalAmount: 25.99
    },
    CONFIRMED: {
      status: 'confirmed',
      totalAmount: 25.99
    },
    DELIVERED: {
      status: 'delivered',
      totalAmount: 25.99
    }
  }
}; 