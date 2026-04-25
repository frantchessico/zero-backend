import { ClerkWebhookService } from '../../core/clerk-webhook/clerk-webhook.service';
import { User } from '../../models';

jest.mock('../../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const mockedUser = User as jest.Mocked<typeof User>;

describe('ClerkWebhookService', () => {
  const service = new ClerkWebhookService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a customer user when receiving a new Clerk user', async () => {
    mockedUser.findOne
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) } as any)
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) } as any);
    mockedUser.create.mockResolvedValue({
      userId: 'user_clerk_123',
      clerkId: 'user_clerk_123',
      role: 'customer',
    } as any);

    const user = await service.upsertUserFromClerk({
      id: 'user_clerk_123',
      primary_email_address_id: 'email_1',
      primary_phone_number_id: 'phone_1',
      email_addresses: [{ id: 'email_1', email_address: 'ana@example.com' }],
      phone_numbers: [{ id: 'phone_1', phone_number: '+258841234567' }],
    } as any);

    expect(mockedUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_clerk_123',
        clerkId: 'user_clerk_123',
        email: 'ana@example.com',
        phoneNumber: '+258841234567',
        role: 'customer',
        isActive: true,
      }),
    );
    expect(user.userId).toBe('user_clerk_123');
  });

  it('updates an existing user matched by clerk identity', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn();

    mockedUser.findOne.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue({ set, save }),
    } as any);

    await service.upsertUserFromClerk({
      id: 'user_clerk_456',
      primary_email_address_id: 'email_1',
      primary_phone_number_id: null,
      email_addresses: [{ id: 'email_1', email_address: 'maria@example.com' }],
      phone_numbers: [],
    } as any);

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_clerk_456',
        clerkId: 'user_clerk_456',
        email: 'maria@example.com',
        isActive: true,
      }),
    );
    expect(save).toHaveBeenCalled();
    expect(mockedUser.create).not.toHaveBeenCalled();
  });

  it('deactivates a user when receiving a Clerk delete event', async () => {
    mockedUser.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ userId: 'user_clerk_789', isActive: false }),
    } as any);

    await service.deactivateUser('user_clerk_789');

    expect(mockedUser.findOneAndUpdate).toHaveBeenCalledWith(
      {
        $or: [{ clerkId: 'user_clerk_789' }, { userId: 'user_clerk_789' }],
      },
      {
        $set: {
          clerkId: 'user_clerk_789',
          isActive: false,
        },
      },
      { new: true },
    );
  });
});
