import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import cors from 'cors';
import { add, get, list, now, remove, update, upsertUser } from './backend/firestore.js';
import { requireAuth, assertSelf, type AuthenticatedRequest } from './backend/auth.js';
import { buildRtcToken, numericAgoraUid } from './backend/agora.js';
import { createDownloadUrl, createUploadUrl, deleteObject, uploadObject } from './backend/r2.js';
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
app.get('/firebase-config.json', (_req, res) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate').json(config);
});

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
  const requestedUsername = String(req.body?.username || '').trim().toLowerCase();
  if (requestedUsername && !/^@[a-z0-9_]{3,20}$/.test(requestedUsername)) return res.status(400).json({ error: 'Username must start with @ and contain 3-20 letters, numbers or underscores.' });
  if (requestedUsername) {
    const same = await list('profiles', { username: requestedUsername }, 5);
    if (same.some((x: any) => x.userId !== uid)) return res.status(409).json({ error: 'Username is already taken.' });
  }
  const user = await upsertUser(uid, { email: req.user!.email ?? null, name: String(req.body?.name || req.user!.name || 'Pardais User'), avatar: req.body?.avatar ?? req.user!.picture ?? null, username: requestedUsername || undefined });
  if (requestedUsername) await update('users', uid, { username: requestedUsername });
  const wallet = await get('wallets', uid); if (!wallet) await update('wallets', uid, { userId: uid, coins: 0, balance: 0 });
  res.status(201).json({ success: true, user, onboardingComplete: Boolean((await get('profiles', uid))?.username) });
}));

app.get('/api/auth/me', asyncRoute(async (req, res) => {
  const uid = req.user!.uid;
  const user = await upsertUser(uid, { email: req.user!.email ?? null, name: req.user!.name || 'Pardais User', avatar: req.user!.picture ?? null });
  const profile: any = await get('profiles', uid);
  const followers = await list('follows', { followingId: uid }, 5000);
  const following = await list('follows', { followerId: uid }, 5000);
  const likes = await list('reel_likes', { userId: uid }, 5000);
  return res.json({ success: true, user, profile, onboardingComplete: Boolean(profile?.username), stats: { followers: followers.length, following: following.length, likes: likes.length } });
}));

app.get('/api/users/search', asyncRoute(async (req,res)=>{ const q=String(req.query.q||'').trim().toLowerCase(); if(!q) return res.json({success:true,items:[]}); const profiles=await list('profiles',{},500); const matched=profiles.filter((p:any)=>String(p.username||'').toLowerCase().includes(q)||`${p.firstName||''} ${p.lastName||''}`.toLowerCase().includes(q)).slice(0,30); const items=await Promise.all(matched.map(async(p:any)=>{const u:any=await get('users',String(p.userId));return {id:p.userId,name:p.firstName?`${p.firstName} ${p.lastName||''}`.trim():(u?.name||'Pardais User'),username:p.username||'',avatar:p.avatar||u?.avatar||''};})); return res.json({success:true,items}); }));
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
  const uid = String(req.params.userId); assertSelf(req, uid);
  const existing: any = await get('profiles', uid);
  if (req.body?.username && existing?.username && String(req.body.username).trim().toLowerCase() !== String(existing.username).toLowerCase()) return res.status(400).json({ error: 'Username cannot be changed after registration.' });
  const patch = { ...req.body, userId: uid };
  if (existing?.username) patch.username = existing.username;
  const profile = await update('profiles', uid, patch);
  await update('users', uid, { name: `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || 'Pardais User', avatar: req.body.avatar ?? existing?.avatar ?? null, username: existing?.username ?? patch.username ?? null });
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

app.get('/api/feed', asyncRoute(async (req, res) => {
  const rows: any[] = await list('reels', {}, 200);
  const mode = String(req.query?.mode || 'for-you');
  const following = new Set((await list('follows', { followerId: req.user!.uid }, 5000)).map((x:any)=>String(x.followingId)));
  const visible = rows.filter(x => x.status === 'published' && x.visibility !== 'private' && (mode !== 'following' || following.has(String(x.userId)))).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,50);
  const items = await Promise.all(visible.map(async r => {
    const author: any = await get('profiles', String(r.userId));
    const likes = await list('reel_likes', { reelId: r.id }, 5000);
    const views = await list('reel_views', { reelId: r.id }, 50000);
    const saved = await list('saved_reels', { reelId: r.id, userId: req.user!.uid }, 5);
    const comments = await list('comments', { targetId: r.id }, 5000);
    return { ...r, likesCount: likes.length, viewsCount: views.length, likedByMe: likes.some((x:any)=>x.userId===req.user!.uid), savedByMe: saved.length>0, commentsCount: comments.length,
      author: { name: author?.firstName ? `${author.firstName} ${author.lastName||''}`.trim() : 'Pardais User', username: author?.username || '', avatar: author?.avatar || '' } };
  }));
  return res.json({ success: true, items });
}));
app.get('/api/reels', asyncRoute(async (req, res) => {
  const mine = String(req.query?.mine || '') === '1';
  const rows: any[] = await list('reels', mine ? { userId: req.user!.uid } : {}, 200);
  const items = await Promise.all(rows.filter(x => x.status !== 'deleted').sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,100).map(async r => {
    const likes=await list('reel_likes',{reelId:r.id},5000); const views=await list('reel_views',{reelId:r.id},50000); const saved=await list('saved_reels',{reelId:r.id,userId:req.user!.uid},5);
    return { ...r, likesCount: likes.length, viewsCount: views.length, likedByMe: likes.some((x:any)=>x.userId===req.user!.uid), savedByMe:saved.length>0 };
  }));
  return res.json({ success: true, items });
}));
app.post('/api/reels', asyncRoute(async (req,res) => {
  const mediaUrl=String(req.body?.mediaUrl||'').trim(), key=String(req.body?.key||'').trim(), caption=String(req.body?.caption||'').trim();
  if (!mediaUrl || !key || !key.startsWith(`users/${req.user!.uid}/`)) return res.status(400).json({ error:'Valid uploaded media is required.' });
  const status=String(req.body?.status||'published')==='draft'?'draft':'published';
  const visibility=String(req.body?.visibility||'public')==='private'?'private':'public';
  const hashtags=Array.isArray(req.body?.hashtags)?req.body.hashtags.map((x:any)=>String(x).replace(/^#/,'')).filter(Boolean).slice(0,5):[];
  const id=await add('reels',{userId:req.user!.uid,mediaUrl,key,caption,location:String(req.body?.location||''),hashtags,status,visibility,allowComments:req.body?.allowComments!==false,likesCount:0});
  return res.status(201).json({success:true,reel:{id,userId:req.user!.uid,mediaUrl,key,caption,status,visibility,hashtags}});
}));
app.patch('/api/reels/:id', asyncRoute(async(req,res)=>{
  const id=String(req.params.id), reel:any=await get('reels',id); if(!reel)return res.status(404).json({error:'reel not found'}); assertSelf(req,String(reel.userId));
  const patch:any={}; if(req.body?.status)patch.status=String(req.body.status); if(req.body?.visibility)patch.visibility=String(req.body.visibility); if(req.body?.caption!==undefined)patch.caption=String(req.body.caption); if(req.body?.location!==undefined)patch.location=String(req.body.location); if(Array.isArray(req.body?.hashtags))patch.hashtags=req.body.hashtags.map((x:any)=>String(x).replace(/^#/,'')).slice(0,5); await update('reels',id,patch); return res.json({success:true});
}));
app.delete('/api/reels/:id', asyncRoute(async(req,res)=>{const id=String(req.params.id),reel:any=await get('reels',id);if(!reel)return res.status(404).json({error:'reel not found'});assertSelf(req,String(reel.userId));await update('reels',id,{status:'deleted',deletedAt:now()});try{if(reel.key)await deleteObject(reel.key)}catch{}return res.json({success:true});}));
app.post('/api/reels/:id/save', asyncRoute(async(req,res)=>{const reelId=String(req.params.id),userId=req.user!.uid;const existing=await list('saved_reels',{reelId,userId},5);if(existing.length){for(const x of existing)await remove('saved_reels',x.id)}else await add('saved_reels',{reelId,userId});return res.json({success:true,saved:!existing.length});}));
app.post('/api/reels/:id/view', asyncRoute(async(req,res)=>{ const reelId=String(req.params.id), userId=req.user!.uid; const reel=await get('reels',reelId); if(!reel||reel.status!=='published') return res.status(404).json({error:'reel not found'}); const existing=await list('reel_views',{reelId,userId},2); if(!existing.length) await add('reel_views',{reelId,userId}); const viewsCount=(await list('reel_views',{reelId},50000)).length; return res.json({success:true,viewsCount}); }));
app.post('/api/reels/:id/like', asyncRoute(async(req,res)=>{
  const reelId=String(req.params.id), userId=req.user!.uid, existing=await list('reel_likes',{reelId,userId},5);
  if(existing.length){ for(const x of existing) await remove('reel_likes',x.id); } else await add('reel_likes',{reelId,userId});
  const count=(await list('reel_likes',{reelId},5000)).length;
  return res.json({success:true,liked:!existing.length,likesCount:count});
}));
app.get('/api/profile/:userId/stats', asyncRoute(async(req,res)=>{ const uid=String(req.params.userId); const followers=await list('follows',{followingId:uid},5000), following=await list('follows',{followerId:uid},5000), reels=await list('reels',{userId:uid},5000); let likes=0; for(const r of reels) likes += (await list('reel_likes',{reelId:r.id},5000)).length; return res.json({success:true,stats:{followers:followers.length,following:following.length,likes}}); }));

async function buildLiveHost(hostId: string, roomId?: string) {
  const [u, p] = await Promise.all([get('users', hostId), get('profiles', hostId)]);
  const gifts = roomId ? await list('gift_transactions', { roomId }, 5000) : [];
  const totals = new Map<string, number>();
  for (const g of gifts as any[]) totals.set(String(g.senderId), (totals.get(String(g.senderId)) || 0) + Number(g.coins || 0) * Math.max(1, Number(g.quantity || 1)));
  const supporterIds = [...totals.entries()].sort((a,b) => b[1] - a[1]).slice(0,3).map(([id]) => id);
  const supporters = await Promise.all(supporterIds.map(async id => {
    const su: any = await get('users', id);
    const sp: any = await get('profiles', id);
    return { id, name: sp?.firstName ? `${sp.firstName} ${sp.lastName || ''}`.trim() : (su?.name || 'Pardais User'), username: sp?.username || su?.username || '', avatar: sp?.avatar || su?.avatar || '', coins: totals.get(id) || 0 };
  }));
  return {
    id: hostId,
    name: u?.name || (p?.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Pardais User'),
    username: p?.username || u?.username || hostId,
    avatar: p?.avatar || u?.avatar || '',
    avatarUrl: p?.avatar || u?.avatar || '',
    level: Number(u?.level || 1),
    topSupporters: supporters
  };
}

app.get('/api/live/rooms', asyncRoute(async (_req, res) => {
  const rooms = await list('live_rooms', { status: 'live' }, 50);
  const enriched = await Promise.all(rooms.map(async (room: any) => ({ ...room, host: await buildLiveHost(String(room.hostId), String(room.id)) })));
  return res.json({ success: true, rooms: enriched });
}));
app.post('/api/live/create', asyncRoute(async (req, res) => {
  const hostId = req.user!.uid;
  const channel = `pardais_${hostId}_${Date.now().toString(36)}`;
  const room = { hostId, title: String(req.body?.title || 'Pardais Live'), mode: req.body?.mode || 'audio', status: 'live', provider: 'agora', channel, hearts: 0, viewerCount: 0, createdAt: now(), updatedAt: now() };
  const id = await add('live_rooms', room);
  const token = buildRtcToken(channel, hostId, 'host');
  await add('live_members', { roomId: id, userId: hostId, role: 'host', agoraUid: token.uid });
  const host = await buildLiveHost(hostId, id);
  return res.status(201).json({ success: true, room: { id, ...room, host, topSupporters: host.topSupporters }, agora: { ...token, channel } });
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
  const host = await buildLiveHost(String(room.hostId), roomId);
  return res.json({ success: true, membership, room: { ...room, host, topSupporters: host.topSupporters }, agora: { ...token, channel: room.channel } });
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
app.get('/api/notifications/:userId', asyncRoute(async(req,res)=>{ assertSelf(req,String(req.params.userId)); return res.json({success:true,items:await list('notifications',{userId:String(req.params.userId)},100)}); }));
app.post('/api/notifications', asyncRoute(async(req,res)=>{const id=await add('notifications',{...req.body,createdAt:now(),read:false});return res.status(201).json({success:true,id});}));
app.get('/api/messages/:peerId', asyncRoute(async(req,res)=>{ const me=req.user!.uid, peer=String(req.params.peerId); const sent=await list('messages',{senderId:me,receiverId:peer},500), received=await list('messages',{senderId:peer,receiverId:me},500); const items=[...sent,...received].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))); return res.json({success:true,items}); }));
app.get('/api/chats', asyncRoute(async(req,res)=>{ const rows=await list('messages',{},5000); const mine=rows.filter((x:any)=>x.senderId===req.user!.uid||x.receiverId===req.user!.uid); const peerIds=[...new Set(mine.map((x:any)=>x.senderId===req.user!.uid?x.receiverId:x.senderId).filter(Boolean))]; const items=await Promise.all(peerIds.map(async peerId=>{const last=mine.filter((x:any)=>x.senderId===peerId||x.receiverId===peerId).sort((a:any,b:any)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]; const u:any=await get('users',String(peerId)); const p:any=await get('profiles',String(peerId)); return {userId:peerId,name:p?.firstName?`${p.firstName} ${p.lastName||''}`.trim():(u?.name||'Pardais User'),username:p?.username||'',avatar:p?.avatar||u?.avatar||'',lastMessage:last?.text||'',createdAt:last?.createdAt||''};})); return res.json({success:true,items}); }));
app.post('/api/messages', asyncRoute(async(req,res)=>{const receiverId=String(req.body?.receiverId||''); const text=String(req.body?.text||'').trim(); if(!receiverId||!text)return res.status(400).json({error:'receiverId and text are required'}); const id=await add('messages',{senderId:req.user!.uid,receiverId,text}); return res.status(201).json({success:true,messageId:id});}));
app.delete('/api/messages/:userId/:peerId', asyncRoute(async(req,res)=>{assertSelf(req,String(req.params.userId));const rows=await list('messages',{senderId:String(req.params.userId),receiverId:String(req.params.peerId)},1000);for(const x of rows)await remove('messages',x.id);return res.json({success:true,deleted:rows.length});}));
app.post('/api/wallet/recharge-intent', asyncRoute(async(req,res)=>{const id=await add('wallet_recharge_intents',{...req.body,userId:req.user!.uid,status:'pending'});return res.status(201).json({success:true,intentId:id,status:'pending'});}));
app.post('/api/actions', asyncRoute(async(req,res)=>{const id=await add('app_actions',{...req.body,userId:req.user!.uid});return res.status(201).json({success:true,actionId:id});}));
app.get('/api/actions', asyncRoute(async(_req,res)=>res.json({success:true,items:await list('app_actions',{},100)})));

app.post('/api/media/download', asyncRoute(async(req,res)=>{ const key=String(req.body?.key||''); if(!key.startsWith(`users/${req.user!.uid}/`)) return res.status(403).json({error:'media access denied'}); return res.json({success:true,url:await createDownloadUrl(key)}); }));
app.post('/api/media/presign', asyncRoute(async(req,res)=>{const contentType=String(req.body?.contentType||'application/octet-stream');if(!contentType.startsWith('image/')&&!contentType.startsWith('video/'))return res.status(400).json({error:'Only image and video uploads are allowed'});const safeName=String(req.body?.fileName||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_');const key=`users/${req.user!.uid}/${Date.now()}-${safeName}`;return res.json({success:true,...await createUploadUrl(key,contentType)});}));
app.post('/api/media/upload', express.raw({ type: ['video/*','image/*','application/octet-stream'], limit: '200mb' }), asyncRoute(async(req,res)=>{ const contentType=String(req.headers['content-type']||'application/octet-stream'); if(!contentType.startsWith('video/')&&!contentType.startsWith('image/')) return res.status(400).json({error:'Only image and video uploads are allowed'}); const name=String(req.headers['x-file-name']||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_'); const key=`users/${req.user!.uid}/${Date.now()}-${name}`; const body=Buffer.isBuffer(req.body)?req.body:Buffer.from(req.body||''); if(!body.length)return res.status(400).json({error:'Empty upload'}); return res.json({success:true,...await uploadObject(key,body,contentType)}); }));

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
