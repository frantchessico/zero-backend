# Testes da API Zero Backend 🧪

Este diretório contém todos os testes da aplicação, organizados por tipo e funcionalidade.

## 📁 Estrutura dos Testes

```
src/tests/
├── controllers/          # Testes unitários dos controllers
│   ├── user.controller.test.ts
│   ├── product.controller.test.ts
│   └── ...
├── integration/          # Testes de integração
│   ├── user.integration.test.ts
│   ├── product.integration.test.ts
│   └── ...
├── middleware/           # Testes de middleware
│   ├── auth.middleware.test.ts
│   ├── validation.middleware.test.ts
│   └── ...
├── unit/                # Testes unitários de services
│   ├── user.service.test.ts
│   ├── product.service.test.ts
│   └── ...
├── e2e/                 # Testes end-to-end
│   ├── api.e2e.test.ts
│   └── ...
├── setup.ts             # Configuração global dos testes
├── setup.integration.ts # Setup específico para testes de integração
├── setup.e2e.ts         # Setup específico para testes e2e
└── README.md            # Esta documentação
```

## 🚀 Como Executar os Testes

### Todos os Testes
```bash
npm test
```

### Testes em Modo Watch (desenvolvimento)
```bash
npm run test:watch
```

### Testes com Cobertura
```bash
npm run test:coverage
```

### Testes Específicos
```bash
# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes e2e
npm run test:e2e

# Testes de controllers
npm run test:controllers

# Testes de middleware
npm run test:middleware
```

## 📊 Tipos de Testes Implementados

### 1. Testes Unitários (Controllers) 🎯

**Localização:** `src/tests/controllers/`

**O que testam:**
- Lógica dos controllers
- Validação de entrada
- Tratamento de erros
- Respostas HTTP corretas
- Mocks de services

**Exemplo:**
```typescript
describe('UserController', () => {
  it('deve criar usuário com sucesso', async () => {
    // Arrange
    const userData = { userId: 'user123', role: 'customer' };
    
    // Act
    await userController.createUser(mockRequest, mockResponse);
    
    // Assert
    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      message: 'Usuário criado com sucesso'
    });
  });
});
```

### 2. Testes de Integração 🔗

**Localização:** `src/tests/integration/`

**O que testam:**
- Fluxo completo da API
- Interação com banco de dados
- Middleware em conjunto
- Rotas completas
- Banco de dados em memória

**Exemplo:**
```typescript
describe('User Integration Tests', () => {
  it('deve criar usuário via API', async () => {
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);
      
    expect(response.body.success).toBe(true);
  });
});
```

### 3. Testes de Middleware 🛡️

**Localização:** `src/tests/middleware/`

**O que testam:**
- Autenticação
- Validação de dados
- Rate limiting
- Logging
- Error handling

**Exemplo:**
```typescript
describe('Auth Middleware', () => {
  it('deve permitir acesso quando autenticado', () => {
    const req = addAuthToRequest(mockRequest);
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
```

## 🛠️ Ferramentas e Configurações

### Jest Configuration
- **Arquivo:** `jest.config.js`
- **Timeout:** 10 segundos
- **Cobertura:** HTML, LCOV, Text
- **Ambiente:** Node.js

### Banco de Dados de Teste
- **MongoDB Memory Server** para testes isolados
- **Limpeza automática** entre testes
- **Configuração separada** para cada tipo de teste

### Mocks e Helpers
- **Mocks automáticos** do Winston logger
- **Helpers para Request/Response** mock
- **Dados de teste** padronizados
- **Validação de respostas** API

## 📋 Cenários de Teste Implementados

### Controllers

#### UserController
- ✅ Criar usuário
- ✅ Buscar usuário por ID
- ✅ Buscar usuário por email
- ✅ Listar todos os usuários
- ✅ Atualizar usuário
- ✅ Desativar/reativar usuário
- ✅ Adicionar endereço de entrega
- ✅ Gerenciar pontos de fidelidade
- ✅ Histórico de pedidos
- ✅ Estatísticas por role

#### ProductController
- ✅ Criar produto
- ✅ Buscar produto por ID
- ✅ Listar produtos com filtros
- ✅ Atualizar produto
- ✅ Deletar produto
- ✅ Buscar por vendor
- ✅ Buscar por categoria
- ✅ Produtos populares
- ✅ Pesquisa de produtos
- ✅ Rating de produtos
- ✅ Toggle de disponibilidade

### Middleware

#### Auth Middleware
- ✅ Autenticação válida
- ✅ Usuário não autenticado
- ✅ Verificação de roles
- ✅ Rate limiting
- ✅ Validação de dados

## 🎯 Cobertura de Testes

### Métricas Alvo
- **Controllers:** 90%+
- **Services:** 85%+
- **Middleware:** 95%+
- **Integração:** 80%+

### Cenários Críticos
- ✅ Validação de entrada
- ✅ Tratamento de erros
- ✅ Respostas HTTP corretas
- ✅ Autenticação e autorização
- ✅ Operações de banco de dados
- ✅ Paginação
- ✅ Filtros e busca

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente para Teste
```bash
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test
TZ=UTC
```

### Dependências de Teste
```json
{
  "jest": "^29.5.0",
  "ts-jest": "^29.1.0",
  "supertest": "^6.3.3",
  "mongodb-memory-server": "^8.12.0",
  "@types/jest": "^29.5.0",
  "@types/supertest": "^2.0.12"
}
```

## 📝 Boas Práticas

### 1. Estrutura AAA (Arrange, Act, Assert)
```typescript
it('deve fazer algo', async () => {
  // Arrange - Preparar dados
  const userData = createTestUser();
  
  // Act - Executar ação
  const result = await service.createUser(userData);
  
  // Assert - Verificar resultado
  expect(result).toBeDefined();
});
```

### 2. Mocks Consistentes
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockUserService.createUser.mockResolvedValue(mockUser);
});
```

### 3. Dados de Teste Reutilizáveis
```typescript
export const createTestUser = (overrides = {}) => ({
  userId: 'test-user-123',
  email: 'test@example.com',
  role: 'customer',
  ...overrides
});
```

### 4. Validação de Respostas
```typescript
export const validateApiResponse = (response, status, success) => {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(success);
};
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Timeout nos Testes
```bash
# Aumentar timeout no jest.config.js
testTimeout: 30000
```

#### 2. Banco de Dados não Conecta
```bash
# Verificar se MongoDB Memory Server está funcionando
npm run test:db
```

#### 3. Mocks não Funcionam
```bash
# Limpar cache do Jest
npx jest --clearCache
```

#### 4. Cobertura Baixa
```bash
# Verificar arquivos não testados
npm run test:coverage
```

## 📈 Próximos Passos

### Testes Pendentes
- [ ] Testes de Services (unitários)
- [ ] Testes de Models
- [ ] Testes de Utils
- [ ] Testes de Config
- [ ] Testes de Performance
- [ ] Testes de Segurança

### Melhorias Planejadas
- [ ] Testes de carga (load testing)
- [ ] Testes de stress
- [ ] Testes de regressão
- [ ] Testes de compatibilidade
- [ ] Testes de acessibilidade

## 🤝 Contribuição

Para adicionar novos testes:

1. **Crie o arquivo de teste** no diretório apropriado
2. **Siga a estrutura AAA** (Arrange, Act, Assert)
3. **Use os helpers** disponíveis em `setup.ts`
4. **Adicione mocks** quando necessário
5. **Execute os testes** para verificar
6. **Atualize esta documentação** se necessário

## 📞 Suporte

Para dúvidas sobre testes:
- Consulte esta documentação
- Verifique exemplos existentes
- Use os helpers disponíveis
- Siga as boas práticas estabelecidas 