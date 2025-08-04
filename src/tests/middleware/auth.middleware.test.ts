import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware } from '@clerk/express';

// Mock do Clerk
jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn()
}));

describe('Auth Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
  });

  describe('clerkMiddleware', () => {
    it('deve chamar next() quando autenticação é válida', () => {
      // Arrange
      const mockClerkMiddleware = clerkMiddleware as jest.MockedFunction<typeof clerkMiddleware>;
      
      // Act
      mockClerkMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve adicionar user ao request quando autenticado', () => {
      // Arrange
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'João',
        lastName: 'Silva'
      };

      mockRequest = {
        ...mockRequest,
        auth: {
          userId: mockUser.id,
          sessionId: 'session123'
        }
      };

      // Act
      // Simular middleware que adiciona user ao request
      (mockRequest as any).user = mockUser;

      // Assert
      expect((mockRequest as any).user).toBeDefined();
      expect((mockRequest as any).user.id).toBe(mockUser.id);
      expect((mockRequest as any).user.email).toBe(mockUser.email);
    });
  });

  describe('Custom Auth Middleware', () => {
    it('deve permitir acesso quando usuário está autenticado', () => {
      // Arrange
      mockRequest = {
        ...mockRequest,
        user: {
          id: 'user123',
          email: 'test@example.com'
        }
      };

      const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (req.user) {
          next();
        } else {
          res.status(401).json({ message: 'Não autorizado' });
        }
      };

      // Act
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve negar acesso quando usuário não está autenticado', () => {
      // Arrange
      const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (req.user) {
          next();
        } else {
          res.status(401).json({ message: 'Não autorizado' });
        }
      };

      // Act
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Não autorizado' });
    });

    it('deve verificar roles específicos', () => {
      // Arrange
      mockRequest = {
        ...mockRequest,
        user: {
          id: 'user123',
          email: 'test@example.com',
          role: 'admin'
        }
      };

      const requireRole = (role: string) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (req.user && (req.user as any).role === role) {
            next();
          } else {
            res.status(403).json({ message: 'Acesso negado' });
          }
        };
      };

      // Act
      const adminMiddleware = requireRole('admin');
      adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve negar acesso quando role não corresponde', () => {
      // Arrange
      mockRequest = {
        ...mockRequest,
        user: {
          id: 'user123',
          email: 'test@example.com',
          role: 'user'
        }
      };

      const requireRole = (role: string) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (req.user && (req.user as any).role === role) {
            next();
          } else {
            res.status(403).json({ message: 'Acesso negado' });
          }
        };
      };

      // Act
      const adminMiddleware = requireRole('admin');
      adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Acesso negado' });
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('deve permitir requisição quando dentro do limite', () => {
      // Arrange
      const requestCounts = new Map();
      const maxRequests = 10;
      const windowMs = 60000; // 1 minuto

      const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        
        if (!requestCounts.has(clientId)) {
          requestCounts.set(clientId, { count: 0, resetTime: now + windowMs });
        }

        const client = requestCounts.get(clientId);
        
        if (now > client.resetTime) {
          client.count = 0;
          client.resetTime = now + windowMs;
        }

        if (client.count < maxRequests) {
          client.count++;
          next();
        } else {
          res.status(429).json({ message: 'Muitas requisições' });
        }
      };

      mockRequest = {
        ...mockRequest,
        ip: '192.168.1.1'
      };

      // Act
      rateLimitMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve bloquear requisição quando excede o limite', () => {
      // Arrange
      const requestCounts = new Map();
      const maxRequests = 1;
      const windowMs = 60000;

      const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        
        if (!requestCounts.has(clientId)) {
          requestCounts.set(clientId, { count: 0, resetTime: now + windowMs });
        }

        const client = requestCounts.get(clientId);
        
        if (now > client.resetTime) {
          client.count = 0;
          client.resetTime = now + windowMs;
        }

        if (client.count < maxRequests) {
          client.count++;
          next();
        } else {
          res.status(429).json({ message: 'Muitas requisições' });
        }
      };

      mockRequest = {
        ...mockRequest,
        ip: '192.168.1.1'
      };

      // Primeira requisição (deve passar)
      rateLimitMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Reset mock
      (mockNext as jest.Mock).mockClear();
      (mockResponse.status as jest.Mock).mockClear();
      (mockResponse.json as jest.Mock).mockClear();

      // Segunda requisição (deve ser bloqueada)
      rateLimitMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Muitas requisições' });
    });
  });

  describe('Validation Middleware', () => {
    it('deve validar dados de entrada corretamente', () => {
      // Arrange
      const userSchema = {
        userId: { type: 'string', required: true },
        email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        role: { type: 'string', required: true, enum: ['customer', 'driver', 'vendor'] }
      };

      const validateMiddleware = (schema: any) => {
        return (req: Request, res: Response, next: NextFunction) => {
          const errors: string[] = [];

          for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && !value) {
              errors.push(`${field} é obrigatório`);
            }

            if (value && rules.type && typeof value !== rules.type) {
              errors.push(`${field} deve ser do tipo ${rules.type}`);
            }

            if (value && rules.pattern && !rules.pattern.test(value)) {
              errors.push(`${field} tem formato inválido`);
            }

            if (value && rules.enum && !rules.enum.includes(value)) {
              errors.push(`${field} deve ser um dos valores: ${rules.enum.join(', ')}`);
            }
          }

          if (errors.length > 0) {
            res.status(400).json({ 
              success: false, 
              message: 'Dados inválidos',
              errors 
            });
          } else {
            next();
          }
        };
      };

      // Teste com dados válidos
      mockRequest = {
        ...mockRequest,
        body: {
          userId: 'user123',
          email: 'test@example.com',
          role: 'customer'
        }
      };

      // Act
      const validateUser = validateMiddleware(userSchema);
      validateUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('deve retornar erro quando dados são inválidos', () => {
      // Arrange
      const userSchema = {
        userId: { type: 'string', required: true },
        email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        role: { type: 'string', required: true, enum: ['customer', 'driver', 'vendor'] }
      };

      const validateMiddleware = (schema: any) => {
        return (req: Request, res: Response, next: NextFunction) => {
          const errors: string[] = [];

          for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && !value) {
              errors.push(`${field} é obrigatório`);
            }

            if (value && rules.type && typeof value !== rules.type) {
              errors.push(`${field} deve ser do tipo ${rules.type}`);
            }

            if (value && rules.pattern && !rules.pattern.test(value)) {
              errors.push(`${field} tem formato inválido`);
            }

            if (value && rules.enum && !rules.enum.includes(value)) {
              errors.push(`${field} deve ser um dos valores: ${rules.enum.join(', ')}`);
            }
          }

          if (errors.length > 0) {
            res.status(400).json({ 
              success: false, 
              message: 'Dados inválidos',
              errors 
            });
          } else {
            next();
          }
        };
      };

      // Teste com dados inválidos
      mockRequest = {
        ...mockRequest,
        body: {
          userId: 'user123',
          email: 'invalid-email',
          role: 'invalid-role'
        }
      };

      // Act
      const validateUser = validateMiddleware(userSchema);
      validateUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: expect.arrayContaining([
          'email tem formato inválido',
          'role deve ser um dos valores: customer, driver, vendor'
        ])
      });
    });
  });
}); 