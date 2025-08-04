# Sistema de Notificações Automáticas de Pedidos 📱

## 📋 Visão Geral

O sistema implementa **notificações automáticas** para vendors e clientes sempre que houver mudanças nos pedidos. Isso garante que todos os envolvidos sejam informados em tempo real sobre o status dos pedidos.

## 🚀 Funcionalidades Implementadas

### **1. Notificação de Novo Pedido**
- ✅ **Trigger**: Quando um pedido é criado
- ✅ **Destinatário**: Vendor associado ao pedido
- ✅ **Mensagem**: Inclui ID do pedido, nome do cliente e valor total

### **2. Notificações de Mudança de Status**
- ✅ **Trigger**: Quando o status do pedido é atualizado
- ✅ **Destinatários**: Cliente e Vendor
- ✅ **Status Cobertos**:
  - `confirmed` - Pedido confirmado
  - `preparing` - Em preparação
  - `ready` - Pronto para entrega
  - `out_for_delivery` - Saiu para entrega
  - `delivered` - Entregue
  - `cancelled` - Cancelado

### **3. Notificação de Cancelamento**
- ✅ **Trigger**: Quando um pedido é cancelado
- ✅ **Destinatários**: Cliente e Vendor
- ✅ **Inclui**: Motivo do cancelamento (se fornecido)

## 🔧 Implementação Técnica

### **OrderService Modificado**

```typescript
export class OrderService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Criar pedido com notificação automática
  async createOrder(orderData: Partial<IOrder>): Promise<IOrder> {
    const savedOrder = await order.save();
    await this.notifyVendorNewOrder(savedOrder); // ← Notificação automática
    return savedOrder;
  }

  // Atualizar status com notificações
  async updateOrderStatus(orderId: string, status: string): Promise<IOrder | null> {
    const updatedOrder = await Order.findByIdAndUpdate(/* ... */);
    await this.notifyOrderStatusChange(updatedOrder, status); // ← Notificação automática
    return updatedOrder;
  }

  // Cancelar pedido com notificações
  async cancelOrder(orderId: string, reason?: string): Promise<IOrder | null> {
    const cancelledOrder = await Order.findByIdAndUpdate(/* ... */);
    await this.notifyOrderCancellation(cancelledOrder, reason); // ← Notificação automática
    return cancelledOrder;
  }
}
```

### **Métodos de Notificação**

#### **1. notifyVendorNewOrder()**
```typescript
private async notifyVendorNewOrder(order: IOrder): Promise<void> {
  const vendor = await User.findOne({ 
    role: 'vendor',
    vendorId: order.vendor 
  });

  const message = `Novo pedido #${order._id?.toString().slice(-6)} recebido de ${customerName}. Total: ${order.total?.toFixed(2)} MT`;

  await this.notificationService.createNotification(
    vendor._id?.toString() || '',
    'order_status',
    message
  );
}
```

#### **2. notifyOrderStatusChange()**
```typescript
private async notifyOrderStatusChange(order: IOrder, newStatus: string): Promise<void> {
  const statusMessages = {
    'confirmed': 'Seu pedido foi confirmado e está sendo preparado!',
    'preparing': 'Seu pedido está sendo preparado!',
    'ready': 'Seu pedido está pronto para entrega!',
    'out_for_delivery': 'Seu pedido saiu para entrega!',
    'delivered': 'Seu pedido foi entregue! Obrigado por escolher nossos serviços.',
    'cancelled': 'Seu pedido foi cancelado.'
  };

  // Notificar cliente
  await this.notificationService.createNotification(
    order.customer.toString(),
    'order_status',
    statusMessages[newStatus]
  );

  // Notificar vendor (apenas para status importantes)
  if (['confirmed', 'preparing', 'ready', 'delivered'].includes(newStatus)) {
    await this.notificationService.createNotification(
      vendor._id?.toString() || '',
      'order_status',
      `Pedido #${order._id?.toString().slice(-6)} - Status: ${newStatus}`
    );
  }
}
```

#### **3. notifyOrderCancellation()**
```typescript
private async notifyOrderCancellation(order: IOrder, reason?: string): Promise<void> {
  const cancelMessage = reason 
    ? `Seu pedido foi cancelado. Motivo: ${reason}`
    : 'Seu pedido foi cancelado.';

  // Notificar cliente e vendor
  await this.notificationService.createNotification(/* ... */);
}
```

## 📱 Fluxo de Notificações

### **Criação de Pedido**
```
1. Cliente cria pedido
2. OrderService.createOrder() é chamado
3. Pedido é salvo no banco
4. notifyVendorNewOrder() é executado automaticamente
5. Vendor recebe notificação com detalhes do pedido
```

### **Mudança de Status**
```
1. Status do pedido é atualizado
2. OrderService.updateOrderStatus() é chamado
3. Pedido é atualizado no banco
4. notifyOrderStatusChange() é executado automaticamente
5. Cliente e Vendor recebem notificações apropriadas
```

### **Cancelamento**
```
1. Pedido é cancelado
2. OrderService.cancelOrder() é chamado
3. Pedido é marcado como cancelado
4. notifyOrderCancellation() é executado automaticamente
5. Cliente e Vendor recebem notificação de cancelamento
```

## 🛡️ Tratamento de Erros

### **Falha na Notificação**
- ✅ Notificações não interrompem o fluxo principal
- ✅ Erros são logados mas não causam falha na operação
- ✅ Sistema continua funcionando mesmo se notificação falhar

```typescript
try {
  await this.notificationService.createNotification(/* ... */);
  console.log('✅ Notificação enviada com sucesso');
} catch (error: any) {
  console.error('❌ Erro ao notificar:', error.message);
  // Não interromper o fluxo principal
}
```

## 🧪 Testando o Sistema

### **Executar Exemplo**
```bash
npm run example:order
```

### **Exemplo de Saída**
```
🚀 Demonstrando notificações automáticas de pedidos

📝 Criando usuários de exemplo...
✅ Cliente criado: cliente_001
✅ Vendor criado: vendor_001
✅ Perfil de vendor criado
✅ Produto criado: Hambúrguer Especial

🛒 Criando pedido...
✅ Pedido criado: 507f1f77bcf86cd799439011
📱 Notificação automática enviada para o vendor!

🔄 Atualizando status do pedido...
✅ Pedido confirmado - Notificações enviadas!
✅ Pedido em preparação - Notificações enviadas!
✅ Pedido pronto - Notificações enviadas!

❌ Demonstrando cancelamento...
✅ Pedido cancelado - Notificações enviadas!

🎉 Demonstração concluída!

📋 Resumo das notificações enviadas:
   • Notificação de novo pedido para vendor
   • Notificações de mudança de status para cliente e vendor
   • Notificação de cancelamento para cliente e vendor
```

## 📊 Benefícios

### **Para Vendors**
- ✅ **Notificação imediata** de novos pedidos
- ✅ **Acompanhamento em tempo real** do status
- ✅ **Informações detalhadas** sobre cada pedido
- ✅ **Melhor gestão** do fluxo de trabalho

### **Para Clientes**
- ✅ **Transparência total** sobre o status do pedido
- ✅ **Notificações personalizadas** para cada etapa
- ✅ **Informações claras** sobre cancelamentos
- ✅ **Melhor experiência** do usuário

### **Para o Sistema**
- ✅ **Automatização completa** das notificações
- ✅ **Tratamento robusto** de erros
- ✅ **Logs detalhados** para debugging
- ✅ **Escalabilidade** para múltiplos vendors

## 🔮 Próximos Passos

### **Funcionalidades Futuras**
- 🔄 **Notificações push** para dispositivos móveis
- 🔄 **Notificações por email** como backup
- 🔄 **Notificações por SMS** para casos críticos
- 🔄 **Templates personalizáveis** de mensagens
- 🔄 **Configurações de notificação** por vendor

### **Integrações**
- 🔄 **Webhooks** para sistemas externos
- 🔄 **Integração com WhatsApp Business API**
- 🔄 **Dashboard de notificações** em tempo real
- 🔄 **Relatórios de notificações** enviadas

---

**🎯 Resultado**: Sistema de notificações automáticas totalmente funcional que mantém vendors e clientes informados em tempo real sobre o status dos pedidos! 🚀 