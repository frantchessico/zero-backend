import type { WebhookEvent } from '@clerk/express/webhooks';
import { User } from '../../models';
import { logger } from '../../utils/logger';

type ClerkUserData = Extract<WebhookEvent, { type: 'user.created' | 'user.updated' }>['data'];

type WebhookResult =
  | { action: 'upserted'; eventType: WebhookEvent['type']; userId: string }
  | { action: 'deactivated'; eventType: WebhookEvent['type']; userId: string }
  | { action: 'ignored'; eventType: WebhookEvent['type'] };

export class ClerkWebhookService {
  async handleEvent(event: WebhookEvent): Promise<WebhookResult> {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        const user = await this.upsertUserFromClerk(event.data);
        return {
          action: 'upserted',
          eventType: event.type,
          userId: user.userId,
        };
      }
      case 'user.deleted': {
        const clerkUserId = event.data.id;
        if (!clerkUserId) {
          return {
            action: 'ignored',
            eventType: event.type,
          };
        }

        await this.deactivateUser(clerkUserId);
        return {
          action: 'deactivated',
          eventType: event.type,
          userId: clerkUserId,
        };
      }
      default:
        return {
          action: 'ignored',
          eventType: event.type,
        };
    }
  }

  async upsertUserFromClerk(payload: ClerkUserData) {
    const clerkUserId = payload.id;
    const email = this.extractPrimaryEmail(payload);
    const phoneNumber = this.extractPrimaryPhone(payload);

    const identityMatch = await User.findOne({
      $or: [{ clerkId: clerkUserId }, { userId: clerkUserId }],
    }).exec();

    if (identityMatch) {
      identityMatch.set({
        userId: clerkUserId,
        clerkId: clerkUserId,
        email,
        phoneNumber,
        isActive: true,
      });

      await identityMatch.save();
      return identityMatch;
    }

    if (email) {
      const existingByEmail = await User.findOne({ email }).exec();
      if (existingByEmail) {
        existingByEmail.set({
          clerkId: clerkUserId,
          email,
          phoneNumber,
          isActive: true,
        });

        await existingByEmail.save();
        return existingByEmail;
      }
    }

    const createdUser = await User.create({
      userId: clerkUserId,
      clerkId: clerkUserId,
      email,
      phoneNumber,
      role: 'customer',
      deliveryAddresses: [],
      orderHistory: [],
      paymentMethods: [],
      loyaltyPoints: 0,
      isActive: true,
    });

    return createdUser;
  }

  async deactivateUser(clerkUserId: string) {
    const updatedUser = await User.findOneAndUpdate(
      {
        $or: [{ clerkId: clerkUserId }, { userId: clerkUserId }],
      },
      {
        $set: {
          clerkId: clerkUserId,
          isActive: false,
        },
      },
      { new: true },
    ).exec();

    if (!updatedUser) {
      logger.warn('Clerk user delete webhook received for unknown user', {
        clerkUserId,
      });
    }

    return updatedUser;
  }

  private extractPrimaryEmail(payload: ClerkUserData) {
    const primaryEmailId = payload.primary_email_address_id;
    return (
      payload.email_addresses?.find((entry) => entry.id === primaryEmailId)?.email_address ||
      payload.email_addresses?.[0]?.email_address ||
      undefined
    );
  }

  private extractPrimaryPhone(payload: ClerkUserData) {
    const primaryPhoneId = payload.primary_phone_number_id;
    return (
      payload.phone_numbers?.find((entry) => entry.id === primaryPhoneId)?.phone_number ||
      payload.phone_numbers?.[0]?.phone_number ||
      undefined
    );
  }
}
