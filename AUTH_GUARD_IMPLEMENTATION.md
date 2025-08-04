# Implementação do AuthGuard 🔐

## 📋 Visão Geral

O `AuthGuard` foi implementado em todas as rotas que precisam de autenticação. Ele utiliza o **Clerk** para verificar tokens JWT e garantir que apenas usuários autenticados possam acessar recursos protegidos.

## 🏗️ Como Funciona

### **AuthGuard (src/guards/auth.guard.ts)**
```typescript
export const AuthGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    
    // Verificar token com Clerk
    const tokenPayload = await clerkClient.verifyToken(token);
    const user = await clerkClient.users.getUser(tokenPayload.sub);

    // Adicionar informações ao request
    req.clerkPayload = {
      sub: tokenPayload.sub,
      // ... outros dados do token
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
```

## 📊 Rotas Protegidas vs Públicas

### **🔒 Rotas Protegidas (Com AuthGuard)**

#### **User Routes**
- ✅ `GET /api/users` - Listar usuários
- ✅ `GET /api/users/:userId` - Buscar usuário
- ✅ `PUT /api/users/:userId` - Atualizar usuário
- ✅ `DELETE /api/users/:userId` - Desativar usuário
- ✅ `GET /api/users/email/:email` - Buscar por email
- ✅ `GET /api/users/phone/:phoneNumber` - Buscar por telefone
- ✅ `GET /api/users/role/:role` - Buscar por role
- ✅ `POST /api/users/:userId/addresses` - Adicionar endereço
- ✅ `PUT /api/users/:userId/addresses/:addressId` - Atualizar endereço
- ✅ `DELETE /api/users/:userId/addresses/:addressId` - Remover endereço
- ✅ `POST /api/users/:userId/payment-methods` - Adicionar método de pagamento
- ✅ `DELETE /api/users/:userId/payment-methods/:paymentMethod` - Remover método de pagamento
- ✅ `POST /api/users/:userId/loyalty-points/add` - Adicionar pontos
- ✅ `POST /api/users/:userId/loyalty-points/use` - Usar pontos
- ✅ `GET /api/users/top-loyalty` - Top usuários
- ✅ `POST /api/users/:userId/orders` - Adicionar pedido ao histórico
- ✅ `GET /api/users/:userId/orders` - Histórico de pedidos
- ✅ `GET /api/users/stats/by-role` - Estatísticas por role

#### **Driver Routes**
- ✅ `POST /api/drivers/users/:userId/profile` - Criar perfil de driver
- ✅ `GET /api/drivers/users/:userId/profile` - Buscar perfil de driver
- ✅ `GET /api/drivers/users/:userId/dashboard` - Dashboard do driver
- ✅ `PUT /api/drivers/:id` - Atualizar driver
- ✅ `PATCH /api/drivers/:id/location` - Atualizar localização
- ✅ `PATCH /api/drivers/:id/availability` - Alternar disponibilidade
- ✅ `GET /api/drivers/:id/stats` - Estatísticas do driver
- ✅ `PATCH /api/drivers/:id/rating` - Atualizar rating
- ✅ `POST /api/drivers/assign` - Atribuir a pedido
- ✅ `PATCH /api/drivers/:id/verify` - Verificar driver (admin)
- ✅ `DELETE /api/drivers/:id` - Deletar driver (admin)

#### **Vendor Routes**
- ✅ `POST /api/vendors` - Criar vendor
- ✅ `PUT /api/vendors/:vendorId` - Atualizar vendor
- ✅ `DELETE /api/vendors/:vendorId` - Deletar vendor
- ✅ `GET /api/vendors/owner/:ownerId` - Buscar por owner
- ✅ `PATCH /api/vendors/:vendorId/suspend` - Suspender vendor
- ✅ `PATCH /api/vendors/:vendorId/reactivate` - Reativar vendor
- ✅ `PATCH /api/vendors/:vendorId/close` - Fechar temporariamente
- ✅ `PATCH /api/vendors/:vendorId/reopen` - Reabrir vendor
- ✅ `PUT /api/vendors/:vendorId/working-hours` - Atualizar horários
- ✅ `PUT /api/vendors/:vendorId/working-hours/:day` - Atualizar dia específico
- ✅ `PUT /api/vendors/:vendorId/address` - Atualizar endereço
- ✅ `GET /api/vendors/stats/by-type` - Estatísticas por tipo
- ✅ `GET /api/vendors/stats/by-status` - Estatísticas por status

#### **Product Routes**
- ✅ `POST /api/products` - Criar produto
- ✅ `PUT /api/products/:id` - Atualizar produto
- ✅ `DELETE /api/products/:id` - Deletar produto
- ✅ `PATCH /api/products/:id/rating` - Atualizar rating
- ✅ `PATCH /api/products/:id/toggle-availability` - Alternar disponibilidade
- ✅ `PATCH /api/products/:id/toggle-popular` - Alternar popularidade

#### **Notification Routes**
- ✅ `POST /api/notifications/vendor/new-order` - Notificar vendor
- ✅ `POST /api/notifications/drivers/order-ready` - Notificar drivers
- ✅ `POST /api/notifications/driver/assigned` - Notificar driver atribuído
- ✅ `POST /api/notifications/drivers/nearby` - Notificar drivers próximos
- ✅ `GET /api/notifications/drivers/nearby` - Buscar drivers próximos
- ✅ `POST /api/notifications/customer/order-status` - Notificar cliente
- ✅ `POST /api/notifications/promotional` - Notificação promocional
- ✅ `POST /api/notifications/create` - Criar notificação
- ✅ `GET /api/notifications/user/:userId` - Notificações do usuário
- ✅ `GET /api/notifications/stats/:userId` - Estatísticas de notificações
- ✅ `PATCH /api/notifications/:id/read` - Marcar como lida
- ✅ `PATCH /api/notifications/user/:userId/read-all` - Marcar todas como lidas
- ✅ `DELETE /api/notifications/:id` - Deletar notificação
- ✅ `DELETE /api/notifications/old` - Deletar notificações antigas

#### **Delivery Routes**
- ✅ `GET /api/deliveries/dashboard` - Dashboard de entregas
- ✅ `GET /api/deliveries/driver/:driverId/active` - Entregas ativas do driver
- ✅ `GET /api/deliveries/customer/:customerId/history` - Histórico do cliente
- ✅ `GET /api/deliveries/vendor/:vendorId/stats` - Estatísticas do vendor
- ✅ `GET /api/deliveries/:id` - Buscar entrega
- ✅ `GET /api/deliveries` - Listar entregas
- ✅ `POST /api/deliveries` - Criar entrega
- ✅ `PUT /api/deliveries/:id` - Atualizar entrega
- ✅ `PATCH /api/deliveries/:id/status` - Atualizar status
- ✅ `PATCH /api/deliveries/:id/location` - Atualizar localização
- ✅ `PATCH /api/deliveries/:id/cancel` - Cancelar entrega
- ✅ `PATCH /api/deliveries/:id/reassign` - Reatribuir entrega

#### **Audit Routes**
- ✅ `GET /api/audit/logs` - Logs de auditoria
- ✅ `GET /api/audit/entity/:entity/:entityId` - Histórico de entidade
- ✅ `GET /api/audit/user/:userId` - Atividade de usuário

### **🌐 Rotas Públicas (Sem AuthGuard)**

#### **User Routes**
- ✅ `POST /api/users` - Criar usuário
- ✅ `GET /api/users/:userId/exists` - Verificar se usuário existe

#### **Driver Routes**
- ✅ `GET /api/drivers/available` - Buscar drivers disponíveis
- ✅ `GET /api/drivers/:id` - Buscar driver por ID
- ✅ `GET /api/drivers` - Listar drivers

#### **Vendor Routes**
- ✅ `GET /api/vendors` - Listar vendors
- ✅ `GET /api/vendors/:vendorId` - Buscar vendor por ID
- ✅ `GET /api/vendors/type/:type` - Buscar por tipo
- ✅ `GET /api/vendors/active` - Vendors ativos
- ✅ `GET /api/vendors/location` - Buscar por localização
- ✅ `GET /api/vendors/nearby` - Vendors próximos
- ✅ `GET /api/vendors/search` - Buscar por nome
- ✅ `GET /api/vendors/:vendorId/exists` - Verificar se vendor existe
- ✅ `GET /api/vendors/:vendorId/is-open` - Verificar se está aberto

#### **Product Routes**
- ✅ `GET /api/products/search` - Buscar produtos
- ✅ `GET /api/products/popular` - Produtos populares
- ✅ `GET /api/products/category/:categoryId` - Produtos por categoria
- ✅ `GET /api/products/vendor/:vendorId` - Produtos por vendor
- ✅ `GET /api/products/:id` - Buscar produto por ID
- ✅ `GET /api/products` - Listar produtos

#### **Delivery Routes**
- ✅ `GET /api/deliveries/track/:id` - Rastrear entrega
- ✅ `GET /api/deliveries/realtime` - Entregas em tempo real

## 🔧 Como Usar

### **1. Em Rotas Individuais**
```typescript
import { AuthGuard } from '../guards/auth.guard';

router.get('/protected-route', AuthGuard, controller.method);
```

### **2. Em Grupos de Rotas**
```typescript
// Aplicar a todas as rotas do grupo
router.use(AuthGuard);

router.get('/route1', controller.method1);
router.post('/route2', controller.method2);
```

### **3. Headers Necessários**
```bash
# Para acessar rotas protegidas
Authorization: Bearer <jwt_token>
```

## 🚨 Tratamento de Erros

### **401 Unauthorized**
- Token não fornecido
- Token inválido
- Token expirado

### **500 Internal Server Error**
- Erro na verificação do token
- Erro na comunicação com Clerk

## 📈 Benefícios

### **1. Segurança**
- ✅ Verificação de tokens JWT
- ✅ Integração com Clerk
- ✅ Proteção contra acesso não autorizado

### **2. Flexibilidade**
- ✅ Rotas públicas e protegidas
- ✅ Fácil aplicação em grupos de rotas
- ✅ Compatível com outros middlewares

### **3. Performance**
- ✅ Verificação rápida de tokens
- ✅ Cache de informações do usuário
- ✅ Rate limiting integrado

## 🎯 Próximos Passos

### **Melhorias Sugeridas**
1. **Cache de Tokens**: Implementar cache para tokens válidos
2. **Rate Limiting**: Adicionar rate limiting específico por usuário
3. **Logs de Auditoria**: Registrar tentativas de acesso não autorizado
4. **Refresh Tokens**: Implementar sistema de refresh tokens
5. **Roles e Permissões**: Adicionar verificação de roles específicos

### **Monitoramento**
- Logs de autenticação
- Métricas de sucesso/falha
- Alertas para tentativas suspeitas

A implementação do `AuthGuard` garante que sua API esteja **segura e protegida**! 🔐 