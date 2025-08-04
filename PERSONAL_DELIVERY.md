# Sistema de Entrega Pessoal 📦

## 📋 Visão Geral

O sistema de **Entrega Pessoal** permite que usuários solicitem entrega de itens que já possuem (TV, documentos, móveis, etc.) sem precisar comprar de um vendor. É ideal para enviar encomendas pessoais, documentos importantes, eletrônicos, móveis e outros itens.

## 🚀 Funcionalidades Principais

### **1. Criação de Entrega Pessoal**
- ✅ **Itens personalizados** (TV, documentos, móveis, etc.)
- ✅ **Endereços de coleta e entrega**
- ✅ **Cálculo automático de taxas** baseado em distância e peso
- ✅ **Seguro opcional** para itens valiosos
- ✅ **Instruções especiais** para cada item

### **2. Categorias de Itens**
- 📺 **Electronics** - TVs, computadores, celulares
- 📄 **Documents** - Contratos, certidões, documentos
- 🪑 **Furniture** - Móveis, sofás, mesas
- 👕 **Clothing** - Roupas, calçados, acessórios
- 🏠 **Appliances** - Eletrodomésticos
- 📦 **Other** - Outros itens

### **3. Sistema de Taxas**
- 💰 **Taxa base**: 50 MT
- 📏 **Taxa por distância**: 10 MT/km
- ⚖️ **Taxa por peso**: 5 MT/kg
- 🎯 **Taxa para itens frágeis**: 20 MT/item
- 🛡️ **Seguro**: 2% do valor estimado (para itens > 1000 MT)

### **4. Rastreamento Completo**
- 📍 **Status em tempo real**
- 🚗 **Driver atribuído**
- ⏰ **Tempos estimados**
- 📱 **Notificações automáticas**

## 🔧 Implementação Técnica

### **Modelo PersonalDelivery**

```typescript
export interface IPersonalDelivery {
  customer: Schema.Types.ObjectId;
  pickupAddress: {
    street: string;
    district: string;
    city: string;
    coordinates?: { lat: number; lng: number; };
  };
  deliveryAddress: {
    street: string;
    district: string;
    city: string;
    coordinates?: { lat: number; lng: number; };
  };
  items: IPersonalDeliveryItem[];
  category: 'electronics' | 'documents' | 'furniture' | 'clothing' | 'appliances' | 'other';
  totalWeight?: number;
  estimatedValue: number;
  deliveryFee: number;
  insuranceFee?: number;
  total: number;
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  driver?: Schema.Types.ObjectId;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  insuranceRequired: boolean;
  signatureRequired: boolean;
}
```

### **PersonalDeliveryService**

```typescript
export class PersonalDeliveryService {
  // Criar entrega pessoal
  async createPersonalDelivery(deliveryData: CreatePersonalDeliveryDTO): Promise<IPersonalDelivery> {
    // Validar cliente
    // Calcular taxas
    // Criar entrega
    // Notificar cliente
  }

  // Atribuir driver
  async assignDriver(deliveryId: string, driverId?: string): Promise<IPersonalDelivery | null> {
    // Encontrar driver disponível
    // Atribuir à entrega
    // Notificar cliente
  }

  // Atualizar status
  async updatePersonalDelivery(id: string, updateData: UpdatePersonalDeliveryDTO): Promise<IPersonalDelivery | null> {
    // Atualizar status
    // Notificar mudanças
  }

  // Cancelar entrega
  async cancelPersonalDelivery(deliveryId: string, reason?: string): Promise<IPersonalDelivery | null> {
    // Cancelar entrega
    // Reembolsar se necessário
    // Notificar cancelamento
  }
}
```

## 📱 API Endpoints

### **Rotas Públicas**
```http
POST /api/personal-delivery/calculate-fee
```

### **Rotas Protegidas**
```http
POST   /api/personal-delivery                    # Criar entrega
GET    /api/personal-delivery                    # Listar entregas do usuário
GET    /api/personal-delivery/:id                # Buscar entrega específica
PUT    /api/personal-delivery/:id                # Atualizar entrega
POST   /api/personal-delivery/:id/assign-driver  # Atribuir driver
DELETE /api/personal-delivery/:id                # Cancelar entrega
GET    /api/personal-delivery/:id/track          # Rastrear entrega
```

## 📊 Exemplos de Uso

### **1. Entrega de TV (Eletrônicos)**

```typescript
const tvDelivery = {
  customerId: "user_id",
  pickupAddress: {
    street: "Rua das Flores, 123",
    district: "Baixa",
    city: "Maputo",
    coordinates: { lat: -25.9692, lng: 32.5732 }
  },
  deliveryAddress: {
    street: "Avenida 25 de Setembro, 456",
    district: "Sommerschield",
    city: "Maputo",
    coordinates: { lat: -25.9695, lng: 32.5735 }
  },
  items: [{
    name: "Smart TV Samsung 55\"",
    description: "TV Smart 4K com Netflix",
    quantity: 1,
    weight: 15, // kg
    dimensions: { length: 120, width: 70, height: 10 },
    isFragile: true,
    specialInstructions: "Manusear com cuidado, item frágil"
  }],
  category: "electronics",
  estimatedValue: 2500, // MT
  paymentMethod: "m-pesa",
  insuranceRequired: true,
  signatureRequired: true
};
```

### **2. Entrega de Documentos**

```typescript
const documentDelivery = {
  customerId: "user_id",
  pickupAddress: { /* ... */ },
  deliveryAddress: { /* ... */ },
  items: [{
    name: "Contrato de Venda",
    description: "Documento importante para assinatura",
    quantity: 1,
    weight: 0.1,
    isFragile: false,
    specialInstructions: "Entregar apenas para pessoa autorizada"
  }],
  category: "documents",
  estimatedValue: 500,
  paymentMethod: "cash",
  insuranceRequired: false,
  signatureRequired: true
};
```

## 💰 Sistema de Taxas

### **Cálculo Automático**
```typescript
// Taxa base
let fee = 50; // 50 MT

// Taxa por distância (10 MT por km)
fee += distance * 10;

// Taxa por peso (5 MT por kg)
fee += totalWeight * 5;

// Taxa para itens frágeis (20 MT por item)
fee += fragileItems.length * 20;

// Seguro (2% do valor estimado)
if (estimatedValue > 1000) {
  insuranceFee = estimatedValue * 0.02;
}
```

### **Exemplo de Cálculo**
```
TV Samsung 55" (15kg, frágil, 10km de distância):
- Taxa base: 50 MT
- Distância (10km): 100 MT
- Peso (15kg): 75 MT
- Item frágil: 20 MT
- Seguro (2% de 2500): 50 MT
- Total: 295 MT
```

## 🔄 Fluxo de Entrega

### **1. Criação**
```
1. Cliente cria entrega pessoal
2. Sistema calcula taxas automaticamente
3. Cliente confirma e paga
4. Sistema notifica cliente
```

### **2. Atribuição de Driver**
```
1. Sistema encontra driver disponível
2. Driver é atribuído à entrega
3. Cliente é notificado
4. Driver recebe notificação
```

### **3. Coleta e Entrega**
```
1. Driver coleta itens
2. Status atualizado para 'picked_up'
3. Driver transporta itens
4. Status atualizado para 'in_transit'
5. Driver entrega itens
6. Status atualizado para 'delivered'
```

## 🛡️ Recursos de Segurança

### **Seguro Automático**
- ✅ **Ativado automaticamente** para itens > 1000 MT
- ✅ **Cobertura de 2%** do valor estimado
- ✅ **Proteção contra danos** durante transporte

### **Assinatura Obrigatória**
- ✅ **Confirmação de entrega** com assinatura
- ✅ **Prova de recebimento** para itens valiosos
- ✅ **Rastreabilidade completa**

### **Instruções Especiais**
- ✅ **Instruções por item** para cuidados especiais
- ✅ **Restrições de entrega** (horário, pessoa autorizada)
- ✅ **Marcação de itens frágeis**

## 📱 Notificações Automáticas

### **Para Cliente**
- 📱 **Criação da entrega** com detalhes e taxas
- 🚗 **Driver atribuído** com informações de contato
- 📦 **Status de coleta** com confirmação
- 🚚 **Status de trânsito** com tempo estimado
- ✅ **Confirmação de entrega** com assinatura

### **Para Driver**
- 📋 **Nova entrega atribuída** com detalhes
- 📍 **Endereços de coleta e entrega**
- 📦 **Informações dos itens** e instruções
- ⚠️ **Alertas de itens frágeis**

## 🧪 Testando o Sistema

### **Executar Exemplo**
```bash
npm run example:personal-delivery
```

### **Exemplo de Saída**
```
🚀 Demonstrando sistema de entrega pessoal

📝 Criando usuário de exemplo...
✅ Cliente criado: cliente_002

🚗 Criando driver de exemplo...
✅ Driver criado: LIC789012

📺 Criando entrega de TV...
✅ Entrega de TV criada: 507f1f77bcf86cd799439011
💰 Taxa de entrega: 245 MT
🛡️ Taxa de seguro: 50 MT
💵 Total: 295 MT

📄 Criando entrega de documentos...
✅ Entrega de documentos criada: 507f1f77bcf86cd799439012
💰 Taxa de entrega: 80 MT
💵 Total: 80 MT

🚗 Atribuindo driver à entrega de TV...
✅ Driver atribuído: 507f1f77bcf86cd799439013

🔄 Atualizando status das entregas...
✅ TV coletada
✅ TV em trânsito
✅ TV entregue

❌ Cancelando entrega de documentos...
✅ Entrega de documentos cancelada

📋 Listando entregas do cliente...
📊 Total de entregas: 2
📦 Entregas: [
  { id: "507f1f77bcf86cd799439011", status: "delivered", category: "electronics", total: 295 },
  { id: "507f1f77bcf86cd799439012", status: "cancelled", category: "documents", total: 80 }
]

🎉 Demonstração concluída!
```

## 📊 Benefícios

### **Para Clientes**
- ✅ **Flexibilidade total** para enviar qualquer item
- ✅ **Taxas transparentes** calculadas automaticamente
- ✅ **Rastreamento completo** em tempo real
- ✅ **Seguro automático** para itens valiosos
- ✅ **Notificações em tempo real**

### **Para Drivers**
- ✅ **Novas oportunidades** de ganho
- ✅ **Informações detalhadas** sobre cada entrega
- ✅ **Instruções claras** para cuidados especiais
- ✅ **Flexibilidade** de horários

### **Para o Sistema**
- ✅ **Diversificação** de serviços
- ✅ **Maior volume** de entregas
- ✅ **Receita adicional** com taxas e seguros
- ✅ **Escalabilidade** para diferentes tipos de itens

## 🔮 Próximos Passos

### **Funcionalidades Futuras**
- 🔄 **Agendamento** de entregas
- 🔄 **Múltiplos pontos** de coleta/entrega
- 🔄 **Embalagem** profissional
- 🔄 **Fotografia** de prova de entrega
- 🔄 **Avaliação** do driver pelo cliente

### **Integrações**
- 🔄 **APIs de geocoding** para cálculo preciso de distância
- 🔄 **Sistemas de pagamento** online
- 🔄 **APIs de seguro** para cobertura adicional
- 🔄 **Sistemas de embalagem** para itens frágeis

---

**🎯 Resultado**: Sistema completo de entrega pessoal que permite aos usuários enviar qualquer item pessoal com segurança, rastreamento e notificações automáticas! 🚀 