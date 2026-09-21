import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import cors from 'cors';
import { add, get, list, now, remove, update, upsertUser } from './backend/firestore.js';
import { requireAuth, assertSelf, type AuthenticatedRequest } from './backend/auth.js';
import { buildRtcToken, numericAgoraUid } from './backend/agora.js';
import { createDownloadUrl, createUploadUrl } from './backend/r2.js';
import { db, firebaseCredentialsConfigured } from './backend/firebase-admin.js';
import type { Transaction } from 'firebase-admin/firestore';

const app = express();
const port = Number(process.env.PORT || 8080);
const origins = (process.env.CORS_ORIGINS || 'https://pardaislite.soulverseapps.com').split(',').map(x => x.trim()).filter(Boolean);

app.use(cors({ origin: origins, credentials: false }));
app.use(express.json({ limit: '2mb' }));

// Always serve the React SPA for browser routes. Keep API routes JSON-only.
const sendSpa = (_req: express.Request, res: express.Response) => {
  const dist = path.join(process.cwd(), 'dist');
  return res.sendFile(path.join(dist, 'index.html'));
};
if (process.env.NODE_ENV === 'production') {
  app.get('/', sendSpa);
  app.get('/login', sendSpa);
  app.get('/signup', sendSpa);
  app.get('/register', sendSpa);
}

// Public Firebase Web configuration for the browser. These values are not
// service-account secrets; Firebase Web config is designed to be client-visible.
// Serving it at request time avoids the Vite/Railway build-time environment
// variable problem that previously caused the splash-screen Firebase error.
app.get('/firebase-config.js', (_req, res) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
  res
    .type('application/javascript')
    .set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    .send(`window.__PARDAIS_FIREBASE_CONFIG__=${JSON.stringify(config)};`);
});

app.get('/api/_healthcheck', (_req, res) => res.json({ message: 'Success' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Pardais Lite', version: '1.0.0', time: now() }));
app.get('/api/config', (_req, res) => res.json({
  appName: 'Pardais Lite', apiVersion: 'v1',
  realtime: { provider: 'agora', status: process.env.AGORA_APP_ID ? 'ready' : 'missing-credentials' },
  media: { provider: 'cloudflare-r2', status: process.env.R2_BUCKET_NAME ? 'ready' : 'missing-credentials' },
  database: { provider: 'firebase-firestore', status: firebaseCredentialsConfigured ? 'ready' : 'missing-service-account' },
  features: ['auth','profile','follow','feed','reels','live','pk','gifts','wallet','withdrawal','agency','chat','comments','notifications'],
}));

app.use('/api', requireAuth);

const asyncRoute = (fn: (req: AuthenticatedRequest, res: express.Response) => Promise<unknown>) =>
  (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => Promise.resolve(fn(req, res)).catch(next);

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const uid = req.user!.uid;
  const user = await upsertUser(uid, { email: req.user!.email ?? null, name: String(req.body?.name || req.user!.name || 'Pardais User'), avatar: req.body?.avatar ?? req.user!.picture ?? null });
  res.status(201).json({ success: true, user });
}));

app.get('/api/users/:id', asyncRoute(async (req, res) => {
  const user = await get('users', String(req.params.id));
  if (!user) return res.status(404).json({ error: 'user not found' });
  return res.json({ success: true, user });
}));

app.get('/api/profile/:userId', asyncRoute(async (req, res) => {
  const profile = await get('profiles', String(req.params.userId));
  return res.json({ success: true, profile: profile ?? { userId: String(req.params.userId), name: 'Pardais User', bio: '' } });
}));
app.put('/api/profile/:userId', asyncRoute(async (req, res) => {
  assertSelf(req, String(req.params.userId));
  const profile = await update('profiles', String(req.params.userId), { ...req.body, userId: String(req.params.userId) });
  await update('users', String(req.params.userId), { name: `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || 'Pardais User', avatar: req.body.avatar ?? null });
  return res.json({ success: true, profile });
}));

app.get('/api/settings/:userId', asyncRoute(async (req, res) => {
  const settings = await get('user_settings', String(req.params.userId));
  return res.json({ success: true, settings: settings ?? { userId: String(req.params.userId), privateAccount: false, language: 'English', notifications: true, privateLiveEntry: false, privateGiftMvp: false } });
}));
app.put('/api/settings/:userId', asyncRoute(async (req, res) => {
  assertSelf(req, String(req.params.userId));
  const settings = await update('user_settings', String(req.params.userId), { ...req.body, userId: String(req.params.userId) });
  return res.json({ success: true, settings });
}));

app.post('/api/account/delete-request', asyncRoute(async (req, res) => {
  const uid = req.user!.uid; assertSelf(req, String(req.body?.userId || uid));
  const existing = (await list('account_delete_requests', { userId: uid }, 20)).find((x: any) => x.status === 'scheduled' || x.status === 'pending');
  if (existing) return res.json({ success: true, requestId: existing.id, status: existing.status, recoveryUntil: existing.recoveryUntil });
  const recoveryUntil = new Date(Date.now() + 30 * 86400000).toISOString();
  const id = await add('account_delete_requests', { userId: uid, email: req.user!.email ?? req.body?.email ?? null, status: 'scheduled', recoveryUntil, scheduledDeleteAt: recoveryUntil });
  return res.status(201).json({ success: true, requestId: id, status: 'scheduled', recoveryUntil });
}));
app.post('/api/account/recover', asyncRoute(async (req, res) => {
  const email = String(req.body?.email || req.user!.email || '').trim().toLowerCase();
  const items = await list('account_delete_requests', { email }, 100);
  const request: any = items.find((x: any) => x.status === 'scheduled' || x.status === 'pending');
  if (!request) return res.status(404).json({ error: 'No recoverable deletion request was found for this email.' });
  if (new Date(String(request.recoveryUntil)).getTime() <= Date.now()) return res.status(410).json({ error: 'The 30-day recovery period has expired.' });
  await update('account_delete_requests', request.id, { status: 'recovered', recoveredAt: now() });
  return res.json({ success: true, userId: request.userId, status: 'recovered' });
}));

app.post('/api/follow', asyncRoute(async (req, res) => {
  const followerId = req.user!.uid;
  const followingId = String(req.body?.followingId || '');
  const action = String(req.body?.action || 'follow');
  if (!followingId || followerId === followingId) return res.status(400).json({ error: 'invalid follow target' });
  const existing = await list('follows', { followerId, followingId }, 20);
  if (action === 'unfollow') { for (const x of existing) await remove('follows', x.id); return res.json({ success: true, following: false }); }
  if (existing[0]) return res.json({ success: true, following: true, id: existing[0].id });
  const id = await add('follows', { followerId, followingId });
  await add('notifications', { userId: followingId, type: 'follow', actorId: followerId, message: 'started following you', read: false });
  return res.status(201).json({ success: true, following: true, id });
}));

async function directory(ids: string[]) {
  return Promise.all([...new Set(ids)].map(async userId => {
    const u: any = await get('users', userId);
    const p: any = await get('profiles', userId);
    return { id: userId, name: p?.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (u?.name || 'Pardais User'), username: p?.username || u?.username || `@${userId.slice(0, 10)}`, avatar: p?.avatar || u?.avatar || '' };
  }));
}
app.get('/api/followers/:userId', asyncRoute(async (req, res) => { const rows: any[] = await list('follows', { followingId: String(req.params.userId) }); const items = await directory(rows.map(x => String(x.followerId))); return res.json({ success: true, items, count: items.length }); }));
app.get('/api/following/:userId', asyncRoute(async (req, res) => { const rows: any[] = await list('follows', { followerId: String(req.params.userId) }); const items = await directory(rows.map(x => String(x.followingId))); return res.json({ success: true, items, count: items.length }); }));
app.get('/api/friends/:userId', asyncRoute(async (req, res) => { const out: any[] = await list('follows', { followerId: String(req.params.userId) }); const incoming: any[] = await list('follows', { followingId: String(req.params.userId) }); const incomingIds = new Set(incoming.map(x => String(x.followerId))); const items = await directory(out.map(x => String(x.followingId)).filter(x => incomingIds.has(x))); return res.json({ success: true, items, count: items.length }); }));

app.get('/api/feed', asyncRoute(async (_req, res) => res.json({ success: true, items: await list('feed', {}, 30) })));
app.get('/api/reels', asyncRoute(async (_req, res) => res.json({ success: true, items: await list('reels', {}, 30) })));

app.get('/api/live/rooms', asyncRoute(async (_req, res) => {
  const rooms = await list('live_rooms', { status: 'live' }, 50);
  const enriched = await Promise.all(rooms.map(async (room: any) => ({ ...room, host: await get('users', String(room.hostId)) })));
  return res.json({ success: true, rooms: enriched });
}));
app.post('/api/live/create', asyncRoute(async (req, res) => {
  const hostId = req.user!.uid;
  const channel = `pardais_${hostId}_${Date.now().toString(36)}`;
  const room = { hostId, title: String(req.body?.title || 'Pardais Live'), mode: req.body?.mode || 'audio', status: 'live', provider: 'agora', channel, hearts: 0, viewerCount: 0, createdAt: now(), updatedAt: now() };
  const id = await add('live_rooms', room);
  const token = buildRtcToken(channel, hostId, 'host');
  await add('live_members', { roomId: id, userId: hostId, role: 'host', agoraUid: token.uid });
  return res.status(201).json({ success: true, room: { id, ...room }, agora: { ...token, channel } });
}));
app.post('/api/live/join', asyncRoute(async (req, res) => {
  const roomId = String(req.body?.roomId || '');
  const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(404).json({ error: 'live room not found' });
  const userId = req.user!.uid;
  const settings: any = await get('user_settings', userId);
  const privateAccount = Boolean(settings?.privateAccount);
  const existing = (await list('live_members', { roomId, userId }, 10))[0];
  const membership = existing || { id: await add('live_members', { roomId, userId, role: 'audience', anonymous: privateAccount, displayName: privateAccount ? null : (req.body?.displayName || req.user!.name || null), agoraUid: numericAgoraUid(userId) }) };
  if (!existing) {
    const roomRef = db.collection('live_rooms').doc(roomId);
    await db.runTransaction(async (tx: Transaction) => { const snap = await tx.get(roomRef); if (snap.exists) tx.update(roomRef, { viewerCount: Number(snap.data()?.viewerCount || 0) + 1, updatedAt: now() }); });
  }
  const token = buildRtcToken(room.channel, userId, room.hostId === userId ? 'host' : 'audience');
  return res.json({ success: true, membership, room, agora: { ...token, channel: room.channel } });
}));
app.post('/api/live/token', asyncRoute(async (req, res) => {
  const roomId = String(req.body?.roomId || ''); const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(404).json({ error: 'live room not found' });
  const userId = req.user!.uid; const role = room.hostId === userId ? 'host' : 'audience';
  const member = (await list('live_members', { roomId, userId }, 10))[0];
  if (!member && role !== 'host') return res.status(403).json({ error: 'join the live room first' });
  const token = buildRtcToken(room.channel, userId, role); return res.json({ success: true, channel: room.channel, role, ...token });
}));
app.post('/api/live/end', asyncRoute(async (req, res) => { const roomId = String(req.body?.roomId || ''); const room: any = await get('live_rooms', roomId); if (!room) return res.status(404).json({ error: 'room not found' }); assertSelf(req, String(room.hostId)); await update('live_rooms', roomId, { status: 'ended', endedAt: now() }); return res.json({ success: true }); }));
app.post('/api/live/leave', asyncRoute(async (req, res) => { const roomId = String(req.body?.roomId || ''); const rows = await list('live_members', { roomId, userId: req.user!.uid }, 10); for (const row of rows) await remove('live_members', row.id); if (rows.length) { const roomRef = db.collection('live_rooms').doc(roomId); await db.runTransaction(async (tx: Transaction) => { const snap = await tx.get(roomRef); if (snap.exists) tx.update(roomRef, { viewerCount: Math.max(0, Number(snap.data()?.viewerCount || 0) - 1), updatedAt: now() }); }); } return res.json({ success: true }); }));
app.post('/api/live/heart', asyncRoute(async (req, res) => { const roomId = String(req.body?.roomId || ''); const ref = db.collection('live_rooms').doc(roomId); await db.runTransaction(async (tx: Transaction) => { const snap = await tx.get(ref); if (!snap.exists || snap.data()?.status !== 'live') throw new Error('room not live'); const current = Number(snap.data()?.hearts || 0); tx.update(ref, { hearts: current + 1, updatedAt: now() }); }); return res.json({ success: true }); }));

app.post('/api/gifts/send', asyncRoute(async (req, res) => { const senderId = req.user!.uid; const receiverId = String(req.body?.receiverId || ''); const giftId = String(req.body?.giftId || ''); const quantity = Math.max(1, Number(req.body?.quantity || 1)); const coins = Math.max(0, Number(req.body?.coins || 0)); if (!receiverId || !giftId) return res.status(400).json({ error: 'receiverId and giftId are required' }); const id = await add('gift_transactions', { senderId, receiverId, giftId, quantity, coins, roomId: req.body?.roomId || null }); return res.status(201).json({ success: true, transactionId: id }); }));

app.get('/api/wallet/:userId', asyncRoute(async (req, res) => { assertSelf(req, String(req.params.userId)); let wallet: any = await get('wallets', String(req.params.userId)); if (!wallet) wallet = await update('wallets', String(req.params.userId), { userId: String(req.params.userId), coins: 0, balance: 0 }); return res.json({ success: true, wallet }); }));
app.get('/api/wallet/:userId/transactions', asyncRoute(async (req, res) => { assertSelf(req, String(req.params.userId)); return res.json({ success: true, items: await list('wallet_transactions', { userId: String(req.params.userId) }, 100) }); }));
app.post('/api/wallet/transfer', asyncRoute(async (req, res) => {
  const userId = req.user!.uid, receiverId = String(req.body?.receiverId || ''), receiverUsername = String(req.body?.receiverUsername || ''), coins = Number(req.body?.coins), pin = String(req.body?.pin || '');
  if (!receiverId || !receiverUsername || !Number.isInteger(coins) || coins <= 0 || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'valid receiver, positive coins and 4-digit PIN are required' });
  const senderRef = db.collection('wallets').doc(userId), receiverRef = db.collection('wallets').doc(receiverId);
  let balanceAfter = 0;
  await db.runTransaction(async (tx: Transaction) => { const [sSnap, rSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef)]); if (!rSnap.exists) throw new Error('recipient wallet was not found'); const senderCoins = Number(sSnap.data()?.coins || 0), receiverCoins = Number(rSnap.data()?.coins || 0); if (senderCoins < coins) throw new Error(`insufficient coins: ${senderCoins}`); balanceAfter = senderCoins - coins; tx.set(senderRef, { userId, coins: balanceAfter, balance: balanceAfter, updatedAt: now() }, { merge: true }); tx.set(receiverRef, { userId: receiverId, coins: receiverCoins + coins, balance: receiverCoins + coins, updatedAt: now() }, { merge: true }); });
  const transactionId = await add('wallet_transactions', { userId, counterpartyId: receiverId, counterpartyUsername: receiverUsername, type: 'Sent', coins: -coins, balanceAfter }); await add('wallet_transactions', { userId: receiverId, counterpartyId: userId, counterpartyUsername: req.user!.email || userId, type: 'Received', coins, balanceAfter: 0 }); return res.status(201).json({ success: true, transactionId, coins, balance: balanceAfter });
}));

app.post('/api/creator/withdraw-account', asyncRoute(async (req, res) => { const userId = req.user!.uid; const id = await add('withdraw_accounts', { ...req.body, userId, account: String(req.body?.account || ''), method: String(req.body?.method || 'bank') }); return res.status(201).json({ success: true, accountId: id }); }));
app.get('/api/creator/:userId', asyncRoute(async (req, res) => { assertSelf(req, String(req.params.userId)); const gifts: any[] = await list('gift_transactions', { receiverId: String(req.params.userId) }, 100); const exchanges: any[] = await list('creator_exchanges', { userId: String(req.params.userId) }, 100); const withdrawals: any[] = await list('withdrawals', { userId: String(req.params.userId) }, 100); const giftCoins = gifts.reduce((s,x) => s + Number(x.coins || 0), 0), exchanged = exchanges.reduce((s,x) => s + Number(x.coins || 0), 0), pendingWithdraw = withdrawals.filter(x => x.status === 'pending').reduce((s,x) => s + Number(x.amount || 0), 0); return res.json({ success: true, earnings: Math.max(0, giftCoins - exchanged), giftCoins, exchanged, pendingWithdraw, transactions: [...gifts, ...exchanges, ...withdrawals].slice(0,100) }); }));
app.post('/api/creator/exchange', asyncRoute(async (req, res) => { const userId=req.user!.uid, coins=Number(req.body?.coins); if(!Number.isInteger(coins)||coins<=0)return res.status(400).json({error:'positive coins required'}); const gifts:any[]=await list('gift_transactions',{receiverId:userId},1000), exchanges:any[]=await list('creator_exchanges',{userId},1000); const available=gifts.reduce((s,x)=>s+Number(x.coins||0),0)-exchanges.reduce((s,x)=>s+Number(x.coins||0),0); if(coins>available)return res.status(400).json({error:`insufficient creator earnings: ${available}`}); const id=await add('creator_exchanges',{userId,coins,walletCoins:coins,status:'completed'}); const wallet:any=await get('wallets',userId)||await update('wallets',userId,{userId,coins:0,balance:0}); const balance=Number(wallet.coins||0)+coins; await update('wallets',userId,{coins:balance,balance}); await add('wallet_transactions',{userId,counterpartyId:'creator-center',counterpartyUsername:'Creator Center',type:'Received',coins,balanceAfter:balance}); return res.status(201).json({success:true,exchangeId:id,coins,walletBalance:balance}); }));
app.post('/api/withdrawals', asyncRoute(async (req,res)=>{const userId=req.user!.uid; const id=await add('withdrawals',{...req.body,userId,status:'pending'}); return res.status(201).json({success:true,withdrawalId:id,status:'pending'});}));

app.post('/api/pk/create', asyncRoute(async (req,res)=>{const id=await add('pk_matches',{...req.body,hostId:req.user!.uid,status:'pending'});return res.status(201).json({success:true,matchId:id,status:'pending'});}));
app.post('/api/comments', asyncRoute(async(req,res)=>{const text=String(req.body?.text||'').trim(),targetId=String(req.body?.targetId||'');if(!targetId||!text)return res.status(400).json({error:'targetId and text are required'});const id=await add('comments',{userId:req.user!.uid,targetId,text});return res.status(201).json({success:true,id});}));
app.get('/api/comments/:targetId', asyncRoute(async(req,res)=>res.json({success:true,items:await list('comments',{targetId:String(req.params.targetId)},100)})));
app.post('/api/moderation', asyncRoute(async(req,res)=>{const action=String(req.body?.action||'');if(!['moderator','warn','report','kick','block'].includes(action))return res.status(400).json({error:'unsupported moderation action'});const targetUserId=String(req.body?.targetUserId||'');const id=await add('moderation_actions',{...req.body,actorId:req.user!.uid,targetUserId,action,status:action==='report'?'pending':'completed'});if(action==='block')await add('blocks',{blockerId:req.user!.uid,blockedUserId:targetUserId});return res.status(201).json({success:true,actionId:id,action});}));
app.post('/api/invites', asyncRoute(async(req,res)=>{const id=await add('invites',{...req.body,fromUserId:req.user!.uid,status:'pending'});return res.status(201).json({success:true,inviteId:id,status:'pending'});}));
app.post('/api/invites/:id/respond', asyncRoute(async(req,res)=>{const invite:any=await get('invites',String(req.params.id));if(!invite)return res.status(404).json({error:'invite not found'});if(invite.toUserId!==req.user!.uid)return res.status(403).json({error:'not your invite'});const status=String(req.body?.status||'');if(!['accepted','rejected','cancelled'].includes(status))return res.status(400).json({error:'invalid invite response'});await update('invites',String(req.params.id),{status});return res.json({success:true,inviteId:String(req.params.id),status});}));
app.post('/api/pk/invites', asyncRoute(async(req,res)=>{const id=await add('pk_invites',{...req.body,fromUserId:req.user!.uid,type:'pk',status:'pending'});return res.status(201).json({success:true,inviteId:id,status:'pending'});}));
app.post('/api/notifications', asyncRoute(async(req,res)=>{const id=await add('notifications',{...req.body,createdAt:now(),read:false});return res.status(201).json({success:true,id});}));
app.post('/api/messages', asyncRoute(async(req,res)=>{const id=await add('messages',{...req.body,senderId:req.user!.uid});return res.status(201).json({success:true,messageId:id});}));
app.delete('/api/messages/:userId/:peerId', asyncRoute(async(req,res)=>{assertSelf(req,String(req.params.userId));const rows=await list('messages',{senderId:String(req.params.userId),receiverId:String(req.params.peerId)},1000);for(const x of rows)await remove('messages',x.id);return res.json({success:true,deleted:rows.length});}));
app.post('/api/wallet/recharge-intent', asyncRoute(async(req,res)=>{const id=await add('wallet_recharge_intents',{...req.body,userId:req.user!.uid,status:'pending'});return res.status(201).json({success:true,intentId:id,status:'pending'});}));
app.post('/api/actions', asyncRoute(async(req,res)=>{const id=await add('app_actions',{...req.body,userId:req.user!.uid});return res.status(201).json({success:true,actionId:id});}));
app.get('/api/actions', asyncRoute(async(_req,res)=>res.json({success:true,items:await list('app_actions',{},100)})));

app.post('/api/media/download', asyncRoute(async(req,res)=>{ const key=String(req.body?.key||''); if(!key.startsWith(`users/${req.user!.uid}/`)) return res.status(403).json({error:'media access denied'}); return res.json({success:true,url:await createDownloadUrl(key)}); }));
app.post('/api/media/presign', asyncRoute(async(req,res)=>{const contentType=String(req.body?.contentType||'application/octet-stream');if(!contentType.startsWith('image/')&&!contentType.startsWith('video/'))return res.status(400).json({error:'Only image and video uploads are allowed'});const safeName=String(req.body?.fileName||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_');const key=`users/${req.user!.uid}/${Date.now()}-${safeName}`;return res.json({success:true,...await createUploadUrl(key,contentType)});}));

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(process.cwd(), 'dist');
  app.use(express.static(dist, { index: false }));
  // SPA fallback for all non-API browser routes. Never turn API errors into HTML.
  app.get(/^(?!\/api(?:\/|$)).*/, sendSpa);
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = Number(err?.status || 500);
  console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : String(err?.message || 'Request failed') });
});

app.listen(port, '0.0.0.0', () => console.log(`Pardais Lite API listening on ${port}`));
