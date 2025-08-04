# Relações entre Dados da API Zero Backend 🗄️

## 📊 Diagrama de Relacionamentos

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      USER       │    │     VENDOR      │    │     PRODUCT     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ _id: ObjectId   │◄───┤ owner: ObjectId │    │ _id: ObjectId   │
│ userId: String  │    │ _id: ObjectId   │◄───┤ vendor: ObjectId│
│ email: String   │    │ name: String    │    │ name: String    │
│ role: Enum      │    │ type: Enum      │    │ price: Number   │
│ phoneNumber     │    │ status: Enum    │    │ type: Enum      │
│ loyaltyPoints   │    │ address: Object │    │ isAvailable     │
│ isActive        │    │ workingHours    │    │ rating          │
│ deliveryAddress │    │ open24h         │    │ categoryId      │
│ paymentMethods  │    │ temporarilyClosed│   │ isPopular       │
│ orderHistory    │    └─────────────────┘    └─────────────────┘
└─────────────────┘                                    │
         │                                              │
         │                                              │
         ▼                                              │
┌─────────────────┐                                    │
│      ORDER      │                                    │
├─────────────────┤                                    │
│ _id: ObjectId   │                                    │
│ customer: ObjectId◄───────────────────────────────────┘
│ vendor: ObjectId │
│ items: Array     │
│ deliveryAddress  │
│ subtotal         │
│ total            │
│ status: Enum     │
│ paymentStatus    │
│ paymentMethod    │
└─────────────────┘
         │
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│     DELIVERY    │    │     DRIVER      │
├─────────────────┤    ├─────────────────┤
│ _id: ObjectId   │    │ _id: ObjectId   │
│ order: ObjectId │◄───┤ name: String    │
│ driver: ObjectId│◄───┤ phoneNumber     │
│ status: Enum    │    │ licenseNumber   │
│ currentLocation │    │ vehicleInfo     │
│ estimatedTime   │    │ isAvailable     │
└─────────────────┘    │ rating          │
                       │ totalDeliveries │
                       └─────────────────┘
```

## 🔗 Relacionamentos Detalhados

### **1. USER (Usuário) - Entidade Central** 👤

**Relacionamentos:**
- **1:N** com `ORDER` (customer)
- **1:N** com `VENDOR` (owner)
- **1:N** com `DELIVERY` (driver)
- **1:N** com `NOTIFICATION` (user)

**Campos de Relacionamento:**
```typescript
// User pode ter múltiplos pedidos
orderHistory: [{ type: Types.ObjectId, ref: 'Order' }]

// User pode ser owner de múltiplos vendors
// (relacionamento via Vendor.owner)

// User pode ser driver de múltiplas entregas
// (relacionamento via Delivery.driver)
```

### **2. VENDOR (Vendedor)** 🏪

**Relacionamentos:**
- **N:1** com `USER` (owner)
- **1:N** com `PRODUCT` (vendor)
- **1:N** com `ORDER` (vendor)

**Campos de Relacionamento:**
```typescript
// Vendor pertence a um User (owner)
owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }

// Vendor pode ter múltiplos produtos
// (relacionamento via Product.vendor)

// Vendor pode ter múltiplos pedidos
// (relacionamento via Order.vendor)
```

### **3. PRODUCT (Produto)** 📦

**Relacionamentos:**
- **N:1** com `VENDOR` (vendor)
- **N:1** com `CATEGORY` (categoryId)
- **1:N** com `ORDER` (via OrderItem)

**Campos de Relacionamento:**
```typescript
// Product pertence a um Vendor
vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true }

// Product pode pertencer a uma Category
categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }

// Product pode estar em múltiplos pedidos
// (relacionamento via Order.items.product)
```

### **4. ORDER (Pedido) - Entidade de Transação** 🛒

**Relacionamentos:**
- **N:1** com `USER` (customer)
- **N:1** com `VENDOR` (vendor)
- **1:N** com `ORDER_ITEM` (items)
- **1:1** com `DELIVERY` (order)
- **1:1** com `PAYMENT` (order)

**Campos de Relacionamento:**
```typescript
// Order pertence a um User (customer)
customer: { type: Schema.Types.ObjectId, ref: 'User', required: true }

// Order pertence a um Vendor
vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true }

// Order contém múltiplos items
items: {
  type: [OrderItemSchema],
  required: true
}

// Order pode ter uma entrega
// (relacionamento via Delivery.order)
```

### **5. ORDER_ITEM (Item do Pedido)** 📋

**Relacionamentos:**
- **N:1** com `ORDER` (embedded)
- **N:1** com `PRODUCT` (product)

**Campos de Relacionamento:**
```typescript
// OrderItem pertence a um Product
product: {
  type: Schema.Types.ObjectId,
  ref: 'Product',
  required: true
}

// OrderItem está embedded no Order
// (não tem _id próprio)
```

### **6. DELIVERY (Entrega)** 🚚

**Relacionamentos:**
- **1:1** com `ORDER` (order)
- **N:1** com `USER` (driver)

**Campos de Relacionamento:**
```typescript
// Delivery pertence a um Order
order: { type: Types.ObjectId, ref: 'Order', required: true }

// Delivery é feita por um User (driver)
driver: { type: Types.ObjectId, ref: 'User', required: true }
```

### **7. DRIVER (Motorista)** 🛵

**Relacionamentos:**
- **1:N** com `DELIVERY` (driver)

**Observação:** O modelo `Driver` parece ser uma extensão do `User` com role 'driver'. Na prática, pode ser melhor usar apenas o `User` com role 'driver'.

### **8. CATEGORY (Categoria)** 📂

**Relacionamentos:**
- **1:N** com `PRODUCT` (categoryId)
- **N:1** com `VENDOR` (vendor - opcional)

**Campos de Relacionamento:**
```typescript
// Category pode ter múltiplos produtos
// (relacionamento via Product.categoryId)

// Category pode pertencer a um Vendor específico
vendor: { type: Types.ObjectId, ref: 'Vendor' }
```

### **9. PAYMENT (Pagamento)** 💳

**Relacionamentos:**
- **1:1** com `ORDER` (order)

**Campos de Relacionamento:**
```typescript
// Payment pertence a um Order
order: { type: String, required: true } // Order ID
```

### **10. NOTIFICATION (Notificação)** 🔔

**Relacionamentos:**
- **N:1** com `USER` (user)

**Campos de Relacionamento:**
```typescript
// Notification pertence a um User
user: { type: String, required: true } // User ID
```

## 🔄 Fluxo de Dados Típico

### **1. Criação de Pedido**
```
User (customer) → Order → OrderItems → Products → Vendor
```

### **2. Processamento de Entrega**
```
Order → Delivery → User (driver)
```

### **3. Sistema de Pagamento**
```
Order → Payment
```

### **4. Notificações**
```
Order/Delivery → Notification → User
```

## 📈 Índices e Performance

### **Índices Principais:**
```typescript
// User
{ userId: 1 } // Único
{ email: 1 } // Único, sparse
{ role: 1 }

// Product
{ vendor: 1, categoryId: 1 }
{ isAvailable: 1, isPopular: 1 }
{ name: 'text', description: 'text' }

// Order
{ customer: 1 }
{ vendor: 1 }
{ status: 1 }
{ createdAt: -1 }

// Delivery
{ driver: 1 }
{ status: 1 }
{ order: 1 }

// Driver
{ currentLocation: '2dsphere' }
{ isAvailable: 1, isActive: 1 }
{ rating: -1 }
```

## 🎯 Pontos de Atenção

### **1. Consistência de Dados**
- **User.role** deve ser validado antes de criar Vendor/Driver
- **Order.status** deve ser sincronizado com Delivery.status
- **Payment.status** deve ser atualizado quando Order.status muda

### **2. Integridade Referencial**
- **Soft Delete:** User.isActive, Product.isAvailable
- **Cascade:** Quando User é desativado, Vendor também deve ser
- **Constraints:** Order deve ter pelo menos um item

### **3. Performance**
- **Populate:** Usar populate() para relacionamentos frequentes
- **Indexes:** Índices compostos para consultas complexas
- **Pagination:** Sempre paginar listas grandes

### **4. Segurança**
- **Authorization:** Verificar role do User antes de operações
- **Validation:** Validar dados de entrada em todos os endpoints
- **Sanitization:** Limpar dados antes de salvar

## 🚀 Melhorias Sugeridas

### **1. Normalização**
```typescript
// Adicionar referências bidirecionais
UserSchema.virtual('vendors', {
  ref: 'Vendor',
  localField: '_id',
  foreignField: 'owner'
});

VendorSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'vendor'
});
```

### **2. Middleware de Validação**
```typescript
// Validar relacionamentos antes de salvar
OrderSchema.pre('save', async function(next) {
  const user = await User.findById(this.customer);
  const vendor = await Vendor.findById(this.vendor);
  
  if (!user || !vendor) {
    throw new Error('Invalid customer or vendor');
  }
  
  next();
});
```

### **3. Triggers Automáticos**
```typescript
// Atualizar contadores automaticamente
OrderSchema.post('save', async function(doc) {
  await User.findByIdAndUpdate(doc.customer, {
    $push: { orderHistory: doc._id }
  });
});
```

Esta estrutura de relacionamentos permite uma API robusta e escalável para delivery! 🎯 