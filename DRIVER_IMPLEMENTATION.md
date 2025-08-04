# Implementação da Relação User ↔ Driver 🚗

## 📋 Visão Geral

Esta implementação estabelece uma **relação de extensão** onde **Driver** é uma **especialização** do **User**. Um usuário pode ter role 'driver' e possuir um perfil de driver com atributos específicos.

## 🏗️ Arquitetura

### **User (Entidade Base)**
```typescript
User {
  _id: ObjectId,
  userId: string,
  email: string,
  phoneNumber: string,
  role: 'customer' | 'driver' | 'vendor',
  isActive: boolean,
  // ... outros campos comuns
}
```

### **Driver (Extensão Especializada)**
```typescript
Driver {
  _id: ObjectId,
  userId: ObjectId, // ← Referência ao User
  licenseNumber: string,
  vehicleInfo: object,
  isAvailable: boolean,
  isVerified: boolean,
  rating: number,
  // ... campos específicos de motorista
}
```

## 🔗 Relacionamentos

### **1. User → Driver (1:1)**
- Um User com role 'driver' pode ter um perfil Driver
- Relacionamento via `Driver.userId → User._id`

### **2. Driver → User (N:1)**
- Driver sempre referencia um User existente
- Validação: User deve ter role 'driver'

### **3. Virtuals Bidirecionais**
```typescript
// No User
UserSchema.virtual('driverProfile', {
  ref: 'Driver',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// No Driver
DriverSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});
```

## 🚀 Como Usar

### **1. Criar User com Role 'driver'**
```typescript
const user = new User({
  userId: 'driver_001',
  phoneNumber: '+258123456789',
  email: 'joao@example.com',
  role: 'driver',
  isActive: true
});
await user.save();
```

### **2. Criar Perfil de Driver**
```typescript
const driverData = {
  userId: user._id.toString(),
  licenseNumber: 'LIC123456',
  vehicleInfo: {
    type: 'motorcycle',
    model: 'Honda CG 150',
    plateNumber: 'ABC-1234'
  },
  // ... outros campos
};

const driver = await DriverService.createDriver(user._id.toString(), driverData);
```

### **3. Consultas Relacionadas**
```typescript
// Buscar User com perfil de driver
const userWithDriver = await User.findById(userId).populate('driverProfile');

// Buscar Driver com dados do User
const driverWithUser = await Driver.findById(driverId).populate('user');

// Verificar se User tem perfil de driver
const hasProfile = await user.hasDriverProfile();

// Obter perfil de driver do User
const driverProfile = await user.getDriverProfile();
```

## 📊 Funcionalidades Implementadas

### **Modelo Driver**
- ✅ Referência obrigatória ao User
- ✅ Validação de role 'driver'
- ✅ Campos específicos de motorista
- ✅ Virtuals bidirecionais
- ✅ Métodos de instância
- ✅ Métodos estáticos
- ✅ Índices otimizados

### **DriverService**
- ✅ Criar perfil de driver
- ✅ Buscar por ID e User ID
- ✅ Listar com filtros
- ✅ Atualizar dados
- ✅ Buscar drivers disponíveis
- ✅ Atribuir a pedidos
- ✅ Atualizar localização
- ✅ Completar entregas
- ✅ Atualizar rating
- ✅ Obter estatísticas
- ✅ Verificar driver
- ✅ Deletar (soft delete)

### **DriverController**
- ✅ Criar perfil de driver
- ✅ Buscar por diferentes critérios
- ✅ Atualizar dados
- ✅ Gerenciar disponibilidade
- ✅ Dashboard do driver
- ✅ Operações administrativas

### **Rotas**
- ✅ Rotas públicas (busca)
- ✅ Rotas protegidas (driver)
- ✅ Rotas administrativas
- ✅ Middleware de autorização

## 🎯 Vantagens da Implementação

### **1. Flexibilidade**
- User pode ter múltiplos roles
- Driver é opcional para User com role 'driver'
- Dados específicos separados dos dados comuns

### **2. Consistência**
- Validação automática de relacionamentos
- Middleware de validação
- Virtuals para consultas bidirecionais

### **3. Performance**
- Índices otimizados
- Populate automático
- Consultas eficientes

### **4. Escalabilidade**
- Fácil adicionar novos campos
- Estrutura modular
- Separação de responsabilidades

## 🔧 Exemplo de Uso Completo

```typescript
// 1. Criar User
const user = new User({
  userId: 'driver_001',
  role: 'driver',
  phoneNumber: '+258123456789'
});
await user.save();

// 2. Criar Driver
const driver = await DriverService.createDriver(user._id.toString(), {
  licenseNumber: 'LIC123456',
  vehicleInfo: { type: 'motorcycle' }
});

// 3. Consultar relacionamentos
const userWithDriver = await User.findById(user._id).populate('driverProfile');
const driverWithUser = await Driver.findById(driver._id).populate('user');

// 4. Usar métodos específicos
const canDeliver = user.canDeliver();
const isAvailable = driver.isDriverAvailable();
const stats = await user.getStats();
```

## 📝 Scripts Disponíveis

```bash
# Executar exemplo de uso
npm run example:driver

# Testar funcionalidades
npm test

# Executar em modo desenvolvimento
npm run dev
```

## 🚨 Pontos de Atenção

### **1. Validação de Dados**
- User deve ter role 'driver' antes de criar Driver
- LicenseNumber deve ser único
- PhoneNumber pode estar duplicado (User e Driver)

### **2. Sincronização**
- Dados duplicados precisam ser sincronizados
- Mudanças em User podem afetar Driver

### **3. Performance**
- Use populate() para consultas relacionadas
- Índices estão configurados para consultas comuns

## 🎉 Conclusão

Esta implementação oferece uma **solução robusta e escalável** para a relação User ↔ Driver, mantendo a **flexibilidade** e **consistência** dos dados. A arquitetura permite crescimento futuro e facilita a manutenção do código. 