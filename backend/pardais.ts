import { router, json, error } from '@appdeploy/sdk';
import { db } from '@appdeploy/sdk';

const now = () => new Date().toISOString();

async function add(table: string, record: Record<string, unknown>) {
  const [id] = await db.add(table, [record]);
  if (!id) throw new Error('database write failed');
  return id;
}

export const pardaisRoutes = {
  'GET /api/health': [
    async () =>
      json({ ok: true, app: 'Pardais Lite', version: '0.1.0', time: now() }),
  ],
  'GET /api/config': [
    async () =>
      json({
        appName: 'Pardais Lite',
        apiVersion: 'v1',
        realtime: { provider: 'agora', status: 'pending-credentials' },
        features: [
          'auth',
          'profile',
          'follow',
          'feed',
          'reels',
          'live',
          'pk',
          'gifts',
          'wallet',
          'withdrawal',
          'agency',
          'chat',
          'comments',
          'notifications',
        ],
      }),
  ],
  'POST /api/auth/register': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.phone && !b.email) return error('phone or email is required', 400);
      const u = {
        phone: b.phone ?? null,
        email: b.email ?? null,
        name: b.name ?? 'New User',
        avatar: b.avatar ?? null,
        level: 1,
        coins: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      const id = await add('users', u);
      return json({ success: true, user: { id, ...u } }, 201);
    },
  ],
  'GET /api/users/:id': [
    async ctx => {
      const [u] = await db.get('users', [ctx.params.id]);
      if (u) return json({ success: true, user: { id: ctx.params.id, ...u } });
      const p = await db.list('profiles', { limit: 20, filter: { userId: ctx.params.id } });
      if (!p.items[0]) return error('user not found', 404);
      return json({ success: true, user: { id: ctx.params.id, ...p.items[0] } });
    },
  ],
  'GET /api/profile/:userId': [
    async ctx => {
      const r = await db.list('profiles', { limit: 20, filter: { userId: ctx.params.userId } });
      const profile = r.items[0] ?? { userId: ctx.params.userId, name: 'Pardais User', bio: '', gender: '', dateOfBirth: '', whatsapp: '', facebook: '', instagram: '', youtube: '' };
      return json({ success: true, profile });
    },
  ],
  'PUT /api/profile/:userId': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const r = await db.list('profiles', { limit: 20, filter: { userId: ctx.params.userId } });
      const record = { ...(r.items[0] ?? {}), ...b, userId: ctx.params.userId, updatedAt: now() };
      if (r.items[0]) {
        const [ok] = await db.update('profiles', [{ id: r.items[0].id, record }]);
        if (!ok) return error('profile update failed', 500);
        return json({ success: true, profile: record });
      }
      const id = await add('profiles', record);
      return json({ success: true, profile: { id, ...record } }, 201);
    },
  ],
  'GET /api/settings/:userId': [
    async ctx => {
      const r = await db.list('user_settings', { limit: 20, filter: { userId: ctx.params.userId } });
      return json({ success: true, settings: r.items[0] ?? { userId: ctx.params.userId, privateAccount: false, language: 'English', notifications: true, privateLiveEntry: false, privateGiftMvp: false } });
    },
  ],
  'PUT /api/settings/:userId': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const r = await db.list('user_settings', { limit: 20, filter: { userId: ctx.params.userId } });
      const record = { ...(r.items[0] ?? {}), ...b, userId: ctx.params.userId, updatedAt: now() };
      if (r.items[0]) {
        const [ok] = await db.update('user_settings', [{ id: r.items[0].id, record }]);
        if (!ok) return error('settings update failed', 500);
        return json({ success: true, settings: record });
      }
      const id = await add('user_settings', record);
      return json({ success: true, settings: { id, ...record } }, 201);
    },
  ],
  'POST /api/account/delete-request': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.userId) return error('userId is required', 400);
      const email = String(b.email ?? '').trim().toLowerCase();
      if (!email) return error('email is required', 400);
      const existing = await db.list('account_delete_requests', { limit: 20, filter: { userId: b.userId } });
      const active = existing.items.find((item: any) => item.status === 'scheduled' || item.status === 'pending');
      if (active) return json({ success: true, requestId: active.id, status: active.status, recoveryUntil: active.recoveryUntil });
      const createdAt = new Date();
      const recoveryUntil = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const id = await add('account_delete_requests', { userId: b.userId, email, status: 'scheduled', createdAt: createdAt.toISOString(), recoveryUntil, scheduledDeleteAt: recoveryUntil });
      return json({ success: true, requestId: id, status: 'scheduled', recoveryUntil }, 201);
    },
  ],
  'POST /api/account/recover': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const email = String(b.email ?? '').trim().toLowerCase();
      if (!email) return error('email is required', 400);
      const r = await db.list('account_delete_requests', { limit: 100, filter: { email } });
      const request = r.items.find((item: any) => item.status === 'scheduled' || item.status === 'pending');
      if (!request) return error('No recoverable deletion request was found for this email.', 404);
      const recoveryUntil = new Date(String(request.recoveryUntil ?? request.scheduledDeleteAt ?? 0));
      if (Number.isNaN(recoveryUntil.getTime()) || recoveryUntil.getTime() <= Date.now()) return error('The 30-day recovery period has expired.', 410);
      const record = { ...request, status: 'recovered', recoveredAt: now() };
      const [ok] = await db.update('account_delete_requests', [{ id: request.id, record }]);
      if (!ok) return error('Account recovery failed', 500);
      return json({ success: true, userId: request.userId, status: 'recovered', message: 'Account recovery completed.' });
    },
  ],
  'POST /api/follow': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const followerId = String(b.followerId ?? '').trim();
      const followingId = String(b.followingId ?? '').trim();
      const action = String(b.action ?? 'follow').trim().toLowerCase();
      if (!followerId || !followingId) return error('followerId and followingId are required', 400);
      if (followerId === followingId) return error('you cannot follow yourself', 400);
      const existing = await db.list('follows', { limit: 100, filter: { followerId, followingId } });
      if (action === 'unfollow') {
        const ids = existing.items.map(item => item.id).filter(Boolean);
        if (ids.length) await db.delete('follows', ids);
        return json({ success: true, following: false, removed: ids.length });
      }
      if (existing.items[0]) return json({ success: true, following: true, id: existing.items[0].id });
      const id = await add('follows', { followerId, followingId, createdAt: now() });
      await add('notifications', { userId: followingId, type: 'follow', actorId: followerId, message: 'started following you', createdAt: now(), read: false });
      return json({ success: true, following: true, id }, 201);
    },
  ],
  'GET /api/followers/:userId': [
    async ctx => {
      const r = await db.list('follows', { limit: 100, filter: { followingId: ctx.params.userId } });
      const items = await Promise.all(r.items.map(async item => {
        const userId = String(item.followerId);
        const [u] = await db.get('users', [userId]);
        const p = await db.list('profiles', { limit: 1, filter: { userId } });
        const profile = (p.items[0] ?? {}) as Record<string, unknown>;
        return { id: userId, name: profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : String(u?.name ?? userId), username: String(profile.username ?? u?.username ?? `@${userId.replace(/^user-/, '')}`), avatar: profile.avatar ?? u?.avatar ?? '', followedAt: item.createdAt ?? null };
      }));
      return json({ success: true, items, count: items.length, nextToken: r.nextToken ?? null });
    },
  ],
  'GET /api/following/:userId': [
    async ctx => {
      const r = await db.list('follows', { limit: 100, filter: { followerId: ctx.params.userId } });
      const items = await Promise.all(r.items.map(async item => {
        const userId = String(item.followingId);
        const [u] = await db.get('users', [userId]);
        const p = await db.list('profiles', { limit: 1, filter: { userId } });
        const profile = (p.items[0] ?? {}) as Record<string, unknown>;
        return { id: userId, name: profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : String(u?.name ?? userId), username: String(profile.username ?? u?.username ?? `@${userId.replace(/^user-/, '')}`), avatar: profile.avatar ?? u?.avatar ?? '', followedAt: item.createdAt ?? null };
      }));
      return json({ success: true, items, count: items.length, nextToken: r.nextToken ?? null });
    },
  ],
  'GET /api/friends/:userId': [
    async ctx => {
      const outgoing = await db.list('follows', { limit: 100, filter: { followerId: ctx.params.userId } });
      const incoming = await db.list('follows', { limit: 100, filter: { followingId: ctx.params.userId } });
      const incomingIds = new Set(incoming.items.map(item => String(item.followerId)));
      const ids = outgoing.items.map(item => String(item.followingId)).filter(id => incomingIds.has(id));
      const uniqueIds = [...new Set(ids)];
      const items = await Promise.all(uniqueIds.map(async userId => {
        const [u] = await db.get('users', [userId]);
        const p = await db.list('profiles', { limit: 1, filter: { userId } });
        const profile = (p.items[0] ?? {}) as Record<string, unknown>;
        return { id: userId, name: profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : String(u?.name ?? userId), username: String(profile.username ?? u?.username ?? `@${userId.replace(/^user-/, '')}`), avatar: profile.avatar ?? u?.avatar ?? '' };
      }));
      return json({ success: true, items, count: items.length });
    },
  ],
  'GET /api/feed': [
    async () => {
      const r = await db.list('feed', { limit: 30 });
      return json({
        success: true,
        items: r.items,
        nextToken: r.nextToken ?? null,
      });
    },
  ],
  'GET /api/reels': [
    async () => {
      const r = await db.list('reels', { limit: 30 });
      return json({
        success: true,
        items: r.items,
        nextToken: r.nextToken ?? null,
      });
    },
  ],
  'POST /api/live/create': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.hostId) return error('hostId is required', 400);
      const room = {
        hostId: b.hostId,
        title: b.title ?? '',
        mode: b.mode ?? 'audio',
        status: 'live',
        provider: 'agora',
        createdAt: now(),
        updatedAt: now(),
      };
      const id = await add('live_rooms', room);
      return json(
        {
          success: true,
          room: { id, ...room },
          agora: { token: null, channel: id, uid: b.hostId },
        },
        201
      );
    },
  ],
  'POST /api/live/join': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.roomId || !b.userId)        return error('roomId and userId are required', 400);
      const settings = await db.list('user_settings', { limit: 20, filter: { userId: b.userId } });
      const privateAccount = Boolean(settings.items[0]?.privateAccount);
      const id = await add('live_members', {
        roomId: b.roomId,
        userId: b.userId,
        displayName: privateAccount ? null : (b.displayName ?? null),
        anonymous: privateAccount,
        joinedAt: now(),
      });
      return json({
        success: true,
        membershipId: id,
        anonymous: privateAccount,
        agora: { token: null, channel: b.roomId, uid: b.userId },
      });
    },
  ],
  'POST /api/gifts/send': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.senderId || !b.receiverId || !b.giftId)
        return error('senderId, receiverId and giftId are required', 400);
      const id = await add('gift_transactions', { ...b, createdAt: now() });
      return json({ success: true, transactionId: id });
    },
  ],
  'GET /api/wallet/:userId': [
    async ctx => {
      const r = await db.list('wallets', { limit: 20, filter: { userId: ctx.params.userId } });
      let wallet = r.items[0];
      if (!wallet) {
        const initial = { userId: ctx.params.userId, coins: 7289, balance: 7289, updatedAt: now() };
        const [id] = await db.add('wallets', [initial]);
        wallet = { id: id ?? '', ...initial };
      }
      return json({ success: true, wallet });
    },
  ],
  'GET /api/wallet/:userId/transactions': [
    async ctx => {
      const r = await db.list('wallet_transactions', { limit: 100, filter: { userId: ctx.params.userId } });
      return json({ success: true, items: r.items, nextToken: r.nextToken ?? null });
    },
  ],
  'POST /api/wallet/transfer': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const userId = String(b.userId ?? '').trim();
      const receiverId = String(b.receiverId ?? '').trim();
      const receiverUsername = String(b.receiverUsername ?? '').trim();
      const coins = Number(b.coins);
      const pin = String(b.pin ?? '').trim();
      if (!userId || !receiverId || !receiverUsername) return error('sender and receiver are required', 400);
      if (userId === receiverId) return error('you cannot transfer coins to yourself', 400);
      if (!Number.isInteger(coins) || coins <= 0) return error('coins must be a positive integer', 400);
      if (!/^\d{4}$/.test(pin)) return error('a 4-digit transfer PIN is required', 400);
      const senderResult = await db.list('wallets', { limit: 20, filter: { userId } });
      const receiverResult = await db.list('wallets', { limit: 20, filter: { userId: receiverId } });
      let sender = senderResult.items[0];
      if (!sender) {
        const initial = { userId, coins: 7289, balance: 7289, updatedAt: now() };
        const [id] = await db.add('wallets', [initial]);
        sender = { id: id ?? '', ...initial };
      }
      if (!receiverResult.items[0]) return error('recipient wallet was not found', 404);
      const receiver = receiverResult.items[0];
      const senderCoins = Number(sender.coins ?? sender.balance ?? 0);
      const receiverCoins = Number(receiver.coins ?? receiver.balance ?? 0);
      if (senderCoins < coins) return error(`insufficient coins: ${senderCoins}`, 400);
      const updatedAt = now();
      const senderOk = await db.update('wallets', [{ id: sender.id, record: { ...sender, coins: senderCoins - coins, balance: senderCoins - coins, updatedAt } }]);
      if (!senderOk[0]) return error('sender wallet update failed', 500);
      const receiverOk = await db.update('wallets', [{ id: receiver.id, record: { ...receiver, coins: receiverCoins + coins, balance: receiverCoins + coins, updatedAt } }]);
      if (!receiverOk[0]) return error('recipient wallet update failed', 500);
      const [transactionId] = await db.add('wallet_transactions', [
        { userId, counterpartyId: receiverId, counterpartyUsername: receiverUsername, type: 'Sent', coins: -coins, balanceAfter: senderCoins - coins, createdAt: updatedAt },
        { userId: receiverId, counterpartyId: userId, counterpartyUsername: userId, type: 'Received', coins, balanceAfter: receiverCoins + coins, createdAt: updatedAt },
      ]);
      return json({ success: true, transactionId, coins, balance: senderCoins - coins }, 201);
    },
  ],
  'POST /api/creator/withdraw-account': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.userId || !b.method || !b.account) return error('userId, method and account are required', 400);
      const id = await add('withdraw_accounts', { ...b, createdAt: now(), updatedAt: now() });
      return json({ success: true, accountId: id }, 201);
    },
  ],
  'GET /api/creator/:userId': [
    async ctx => {
      const gifts = await db.list('gift_transactions', { limit: 100, filter: { receiverId: ctx.params.userId } });
      const exchanges = await db.list('creator_exchanges', { limit: 100, filter: { userId: ctx.params.userId } });
      const withdrawals = await db.list('withdrawals', { limit: 100, filter: { userId: ctx.params.userId } });
      const giftCoins = gifts.items.reduce((sum, item) => sum + Number(item.coins ?? item.amount ?? 1), 0);
      const exchanged = exchanges.items.reduce((sum, item) => sum + Number(item.coins ?? 0), 0);
      const pendingWithdraw = withdrawals.items.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
      return json({ success: true, earnings: Math.max(0, giftCoins - exchanged), giftCoins, exchanged, pendingWithdraw, transactions: [...gifts.items, ...exchanges.items, ...withdrawals.items].slice(0, 100) });
    },
  ],
  'POST /api/creator/exchange': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const userId = String(b.userId ?? '').trim();
      const coins = Number(b.coins);
      if (!userId || !Number.isInteger(coins) || coins <= 0) return error('userId and positive coins are required', 400);
      const gifts = await db.list('gift_transactions', { limit: 100, filter: { receiverId: userId } });
      const exchanges = await db.list('creator_exchanges', { limit: 100, filter: { userId } });
      const available = gifts.items.reduce((sum, item) => sum + Number(item.coins ?? item.amount ?? 1), 0) - exchanges.items.reduce((sum, item) => sum + Number(item.coins ?? 0), 0);
      if (coins > available) return error(`insufficient creator earnings: ${available}`, 400);
      const [id] = await db.add('creator_exchanges', [{ userId, coins, walletCoins: coins, status: 'completed', createdAt: now() }]);
      const walletResult = await db.list('wallets', { limit: 20, filter: { userId } });
      let wallet = walletResult.items[0];
      if (!wallet) {
        const initial = { userId, coins: 0, balance: 0, updatedAt: now() };
        const [walletId] = await db.add('wallets', [initial]);
        wallet = { id: walletId ?? '', ...initial };
      }
      const current = Number(wallet.coins ?? wallet.balance ?? 0);
      const updatedAt = now();
      await db.update('wallets', [{ id: wallet.id, record: { ...wallet, coins: current + coins, balance: current + coins, updatedAt } }]);
      await db.add('wallet_transactions', [{ userId, counterpartyId: 'creator-center', counterpartyUsername: 'Creator Center', type: 'Received', coins, balanceAfter: current + coins, createdAt: updatedAt }]);
      return json({ success: true, exchangeId: id, coins, walletBalance: current + coins }, 201);
    },
  ],
  'POST /api/withdrawals': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.userId || !b.amount || !b.method) return error('userId, amount and method are required', 400);
      const id = await add('withdrawals', { ...b, status: 'pending', createdAt: now() });
      return json({ success: true, withdrawalId: id, status: 'pending' }, 201);
    },
  ],
  'POST /api/pk/create': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const id = await add('pk_matches', {
        ...b,
        status: 'pending',
        createdAt: now(),
      });
      return json({ success: true, matchId: id, status: 'pending' }, 201);
    },
  ],
  'POST /api/comments': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.userId || !b.targetId || !String(b.text ?? '').trim()) return error('userId, targetId and text are required', 400);
      const id = await add('comments', { ...b, text: String(b.text).trim(), createdAt: now() });
      return json({ success: true, id }, 201);
    },
  ],
  'GET /api/comments/:targetId': [
    async ctx => {
      const r = await db.list('comments', { limit: 100, filter: { targetId: ctx.params.targetId } });
      return json({ success: true, items: r.items, nextToken: r.nextToken ?? null });
    },
  ],
  'POST /api/moderation': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const action = String(b.action ?? '').trim();
      if (!b.actorId || !b.targetUserId || !action) return error('actorId, targetUserId and action are required', 400);
      if (!['moderator', 'warn', 'report', 'kick', 'block'].includes(action)) return error('unsupported moderation action', 400);
      const id = await add('moderation_actions', { ...b, action, status: action === 'report' ? 'pending' : 'completed', createdAt: now() });
      if (action === 'block') await add('blocks', { blockerId: b.actorId, blockedUserId: b.targetUserId, createdAt: now() });
      return json({ success: true, actionId: id, action, status: action === 'report' ? 'pending' : 'completed' }, 201);
    },
  ],
  'POST /api/invites': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.fromUserId || !b.toUserId || !b.type) return error('fromUserId, toUserId and type are required', 400);
      const id = await add('invites', { ...b, status: 'pending', createdAt: now(), updatedAt: now() });
      return json({ success: true, inviteId: id, status: 'pending' }, 201);
    },
  ],
  'POST /api/invites/:id/respond': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const [invite] = await db.get('invites', [ctx.params.id]);
      if (!invite) return error('invite not found', 404);
      const status = String(b.status ?? '').trim();
      if (!['accepted', 'rejected', 'cancelled'].includes(status)) return error('invalid invite response', 400);
      const ok = await db.update('invites', [{ id: ctx.params.id, record: { ...invite, status, updatedAt: now() } }]);
      return ok[0] ? json({ success: true, inviteId: ctx.params.id, status }) : error('invite update failed', 500);
    },
  ],
  'POST /api/pk/invites': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.fromUserId || !b.toUserId) return error('fromUserId and toUserId are required', 400);
      const id = await add('pk_invites', { ...b, type: 'pk', status: 'pending', createdAt: now(), updatedAt: now() });
      return json({ success: true, inviteId: id, status: 'pending' }, 201);
    },
  ],
  'POST /api/notifications': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const id = await add('notifications', {
        ...b,
        createdAt: now(),
        read: false,
      });      return json({ success: true, id }, 201);
    },
  ],
  'POST /api/messages': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.senderId || !b.receiverId || !b.type) return error('senderId, receiverId and type are required', 400);
      const id = await add('messages', { ...b, createdAt: now() });
      return json({ success: true, messageId: id }, 201);
    },
  ],
  'DELETE /api/messages/:userId/:peerId': [
    async ctx => {
      const r = await db.list('messages', { limit: 100, filter: { senderId: ctx.params.userId, receiverId: ctx.params.peerId } });
      const ids = r.items.map(item => item.id);
      if (ids.length) await db.delete('messages', ids);
      return json({ success: true, deleted: ids.length });
    },
  ],
  'POST /api/wallet/recharge-intent': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      if (!b.userId || !b.coins || !b.amount) return error('userId, coins and amount are required', 400);
      const id = await add('wallet_recharge_intents', { ...b, status: 'pending', createdAt: now() });
      return json({ success: true, intentId: id, status: 'pending' }, 201);
    },
  ],
  'POST /api/actions': [
    async ctx => {
      const b = (ctx.body ?? {}) as Record<string, unknown>;
      const action = String(b.action ?? '').trim();
      if (!action) return error('action is required', 400);
      const id = await add('app_actions', {
        action,
        label: b.label ?? action,
        screen: b.screen ?? null,
        userId: b.userId ?? null,
        metadata: b.metadata ?? null,
        createdAt: now(),
      });
      return json({ success: true, actionId: id }, 201);
    },
  ],
  'GET /api/actions': [
    async ctx => {
      const r = await db.list('app_actions', { limit: 100 });
      return json({ success: true, items: r.items, nextToken: r.nextToken ?? null });
    },
  ],
};

export const handler = router(pardaisRoutes);
