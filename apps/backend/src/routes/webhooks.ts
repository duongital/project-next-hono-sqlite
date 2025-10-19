import { Hono } from 'hono';
import { Webhook } from 'svix';
import { eq } from 'drizzle-orm';
import { createDbClient } from '../db/client';
import { users } from '../db/schema';
import type { Bindings } from '../types/bindings';

const app = new Hono<{ Bindings: Bindings }>();

// Clerk webhook event types
type ClerkWebhookEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string;
  };
};

app.post('/api/webhooks/clerk', async (c) => {
  try {
    // Get the webhook secret from environment
    const webhookSecret = c.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET is not configured');
      return c.json({ error: 'Webhook secret not configured' }, 500);
    }

    // Get the headers
    const svixId = c.req.header('svix-id');
    const svixTimestamp = c.req.header('svix-timestamp');
    const svixSignature = c.req.header('svix-signature');

    // If there are no headers, error out
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing svix headers');
      return c.json({ error: 'Missing svix headers' }, 400);
    }

    // Get the raw body as text
    const rawBody = await c.req.text();

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    let evt: ClerkWebhookEvent;

    // Verify the webhook signature
    try {
      evt = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return c.json({ error: 'Invalid signature' }, 400);
    }

    // Handle the webhook
    const { type, data } = evt;
    console.log(`Received webhook: ${type} for user ${data.id}`);

    const db = createDbClient(c.env.DB);

    // Handle user.created event
    if (type === 'user.created') {
      const primaryEmail = data.email_addresses[0]?.email_address;

      if (!primaryEmail) {
        console.error('No email address found for user:', data.id);
        return c.json({ error: 'No email address found' }, 400);
      }

      try {
        // Insert user into database (use INSERT OR IGNORE for idempotency)
        await db
          .insert(users)
          .values({
            id: data.id,
            email: primaryEmail,
            firstName: data.first_name,
            lastName: data.last_name,
            imageUrl: data.image_url,
          })
          .onConflictDoNothing()
          .run();

        console.log(`User created in D1: ${data.id}`);
      } catch (error) {
        console.error('Error creating user in D1:', error);
        // Return 200 to prevent Clerk from retrying (log for debugging)
        // If you want Clerk to retry, return 500 instead
        return c.json({ error: 'Failed to create user' }, 500);
      }
    }

    // Handle user.updated event (optional - sync profile changes)
    if (type === 'user.updated') {
      const primaryEmail = data.email_addresses[0]?.email_address;

      if (!primaryEmail) {
        console.error('No email address found for user:', data.id);
        return c.json({ error: 'No email address found' }, 400);
      }

      try {
        await db
          .update(users)
          .set({
            email: primaryEmail,
            firstName: data.first_name,
            lastName: data.last_name,
            imageUrl: data.image_url,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, data.id))
          .run();

        console.log(`User updated in D1: ${data.id}`);
      } catch (error) {
        console.error('Error updating user in D1:', error);
        return c.json({ error: 'Failed to update user' }, 500);
      }
    }

    // Handle user.deleted event (optional)
    if (type === 'user.deleted') {
      try {
        // You can either hard delete or soft delete
        // Hard delete:
        await db.delete(users).where(eq(users.id, data.id)).run();

        // Soft delete alternative (requires adding deletedAt field to schema):
        // await db.update(users)
        //   .set({ deletedAt: new Date().toISOString() })
        //   .where((user) => user.id === data.id)
        //   .run();

        console.log(`User deleted from D1: ${data.id}`);
      } catch (error) {
        console.error('Error deleting user from D1:', error);
        return c.json({ error: 'Failed to delete user' }, 500);
      }
    }

    // Return 200 OK to acknowledge receipt
    return c.json({ success: true, type });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;