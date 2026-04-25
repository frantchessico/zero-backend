import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { ChatConversation } from '../../models/ChatConversation';
import { ChatMessage } from '../../models/ChatMessage';
import { Delivery } from '../../models/Delivery';
import { Order } from '../../models/Order';
import Product from '../../models/Product';
import { User } from '../../models/User';
import { Vendor } from '../../models/Vendor';

describe('Chat Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let customer: any;
  let vendorOwner: any;
  let driver: any;
  let outsider: any;
  let vendor: any;
  let product: any;
  let order: any;
  let delivery: any;

  const orderAddress = {
    streetType: 'Av.',
    streetName: 'Julius Nyerere',
    number: '1450',
    neighborhood: 'Polana',
    city: 'Maputo',
    province: 'Maputo',
    country: 'Mozambique',
    coordinates: {
      lat: -25.9653,
      lng: 32.5892
    }
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      ChatMessage.deleteMany({}),
      ChatConversation.deleteMany({}),
      Delivery.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
      Vendor.deleteMany({}),
      User.deleteMany({})
    ]);

    customer = await User.create({
      userId: 'customer-user',
      role: 'customer',
      email: 'customer@zero.test',
      phoneNumber: '+258840000001',
      deliveryAddresses: [orderAddress],
      orderHistory: []
    });

    vendorOwner = await User.create({
      userId: 'vendor-user',
      role: 'vendor',
      email: 'vendor@zero.test',
      phoneNumber: '+258840000002',
      deliveryAddresses: [],
      orderHistory: []
    });

    driver = await User.create({
      userId: 'driver-user',
      role: 'driver',
      email: 'driver@zero.test',
      phoneNumber: '+258840000003',
      deliveryAddresses: [],
      orderHistory: []
    });

    outsider = await User.create({
      userId: 'outsider-user',
      role: 'customer',
      email: 'outsider@zero.test',
      phoneNumber: '+258840000004',
      deliveryAddresses: [],
      orderHistory: []
    });

    vendor = await Vendor.create({
      name: 'Frango Mania',
      type: 'restaurant',
      owner: vendorOwner._id,
      address: {
        street: 'Av. Julius Nyerere',
        district: 'Polana',
        city: 'Maputo',
        coordinates: {
          lat: -25.965,
          lng: 32.589
        }
      },
      status: 'active',
      workingHours: [{ day: 1, open: '08:00', close: '22:00', active: true }]
    });

    product = await Product.create({
      name: 'Frango Grelhado',
      price: 890,
      vendor: vendor._id,
      type: 'food',
      isAvailable: true
    });

    order = await Order.create({
      customer: customer._id,
      vendor: vendor._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          unitPrice: 890,
          totalPrice: 890
        }
      ],
      deliveryAddress: orderAddress,
      deliveryType: 'delivery',
      orderType: 'food',
      subtotal: 890,
      deliveryFee: 90,
      tax: 0,
      total: 980,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'mpesa'
    });

    delivery = await Delivery.create({
      order: order._id,
      driver: driver._id,
      status: 'picked_up',
      currentLocation: {
        lat: -25.965,
        lng: 32.589
      }
    });
  });

  it('deve criar conversa contextual e permitir troca de mensagens', async () => {
    const createConversationResponse = await request(app)
      .post('/api/chats/context')
      .set('x-test-user-id', customer.userId)
      .send({
        orderId: order._id.toString(),
        scope: 'customer_vendor'
      })
      .expect(200);

    expect(createConversationResponse.body.success).toBe(true);
    expect(createConversationResponse.body.data.scope).toBe('customer_vendor');
    expect(createConversationResponse.body.data.title).toBe('Frango Mania');

    const conversationId = createConversationResponse.body.data.id;

    const sendMessageResponse = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('x-test-user-id', customer.userId)
      .send({
        body: 'Oi, podem confirmar se o pedido ja saiu da cozinha?'
      })
      .expect(201);

    expect(sendMessageResponse.body.success).toBe(true);
    expect(sendMessageResponse.body.data.message.body).toContain('pedido ja saiu');

    const listMessagesResponse = await request(app)
      .get(`/api/chats/${conversationId}/messages`)
      .set('x-test-user-id', vendorOwner.userId)
      .expect(200);

    expect(listMessagesResponse.body.success).toBe(true);
    expect(listMessagesResponse.body.data.length).toBeGreaterThanOrEqual(2);
    expect(listMessagesResponse.body.data.at(-1).body).toContain('pedido ja saiu');

    const markReadResponse = await request(app)
      .post(`/api/chats/${conversationId}/read`)
      .set('x-test-user-id', vendorOwner.userId)
      .expect(200);

    expect(markReadResponse.body.success).toBe(true);
    expect(markReadResponse.body.data.unreadCount).toBe(0);

    const vendorConversations = await request(app)
      .get('/api/chats')
      .set('x-test-user-id', vendorOwner.userId)
      .expect(200);

    expect(vendorConversations.body.success).toBe(true);
    expect(vendorConversations.body.data[0].id).toBe(conversationId);
  });

  it('deve criar conversa cliente-driver e bloquear usuarios fora do contexto', async () => {
    const response = await request(app)
      .post('/api/chats/context')
      .set('x-test-user-id', customer.userId)
      .send({
        orderId: order._id.toString(),
        scope: 'customer_driver'
      })
      .expect(200);

    const conversationId = response.body.data.id;

    expect(response.body.data.scope).toBe('customer_driver');
    expect(response.body.data.deliveryId).toBe(delivery._id.toString());

    const forbiddenResponse = await request(app)
      .get(`/api/chats/${conversationId}`)
      .set('x-test-user-id', outsider.userId)
      .expect(403);

    expect(forbiddenResponse.body.success).toBe(false);
    expect(forbiddenResponse.body.message).toContain('não tem acesso');
  });
});
