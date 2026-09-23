/* ================= LIVE STAGE / GUEST / PK EXTENSION =================
   Add these helpers/routes BEFORE the existing generic /api/invites/:id/respond
   route. Keep the existing auth middleware above them.
*/

async function buildStageUser(userId: string) {
  const u: any = await get('users', userId);
  const p: any = await get('profiles', userId);
  const name = p?.name || (p?.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (u?.name || 'Pardais User'));
  return {
    id: userId,
    name,
    username: p?.username || u?.username || '',
    avatar: p?.avatar || u?.avatar || '',
    level: Math.max(1, Number(p?.level ?? u?.level ?? 1)),
  };
}

app.get('/api/live/stage/:roomId', asyncRoute(async (req, res) => {
  const roomId = String(req.params.roomId);
  const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(404).json({ error: 'live room not found' });

  const members: any[] = await list('live_members', { roomId }, 100);
  const stage = members.filter((m:any) => ['host','cohost','guest'].includes(String(m.role || '').toLowerCase()));
  const users = await Promise.all(stage.map(async (m:any) => ({
    id: String(m.id),
    userId: String(m.userId),
    role: String(m.role || 'guest').toLowerCase(),
    agoraUid: Number(m.agoraUid || numericAgoraUid(String(m.userId))),
    user: await buildStageUser(String(m.userId)),
  })));

  const pkRows: any[] = await list('pk_matches', { roomId }, 10);
  const activePk = pkRows.find((x:any) => ['active','live','started','running','in_progress'].includes(String(x.status || '').toLowerCase()));

  return res.json({
    success: true,
    roomId,
    hostId: String(room.hostId),
    stage: users,
    guestCount: users.filter((x:any) => x.role === 'guest').length,
    cohost: users.find((x:any) => x.role === 'cohost') || null,
    pk: activePk || null,
  });
}));

app.get('/api/live/incoming-guest-invites', asyncRoute(async (req, res) => {
  const rows: any[] = await list('invites', { toUserId: req.user!.uid, status: 'pending', type: 'guest' }, 20);
  const items = await Promise.all(rows.map(async (invite:any) => ({
    ...invite,
    fromUser: await buildStageUser(String(invite.fromUserId || '')),
  })));
  return res.json({ success: true, items });
}));

app.post('/api/live/guest-invite/respond', asyncRoute(async (req, res) => {
  const inviteId = String(req.body?.inviteId || '');
  const status = String(req.body?.status || '');
  if (!inviteId || !['accepted','rejected'].includes(status)) return res.status(400).json({ error: 'valid inviteId and status are required' });

  const invite: any = await get('invites', inviteId);
  if (!invite || invite.type !== 'guest') return res.status(404).json({ error: 'guest invite not found' });
  if (String(invite.toUserId) !== String(req.user!.uid)) return res.status(403).json({ error: 'not your invite' });
  if (invite.status !== 'pending') return res.status(409).json({ error: 'invite is no longer pending' });

  if (status === 'rejected') {
    await update('invites', inviteId, { status: 'rejected', respondedAt: now() });
    return res.json({ success: true, status: 'rejected' });
  }

  const roomId = String(invite.roomId);
  const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(409).json({ error: 'host broadcast has ended' });

  const members: any[] = await list('live_members', { roomId }, 100);
  const guestCount = members.filter((m:any) => String(m.role || '').toLowerCase() === 'guest').length;
  if (guestCount >= 8) return res.status(409).json({ error: 'all guest seats are full' });

  const existing = members.find((m:any) => String(m.userId) === String(req.user!.uid));
  if (existing) await update('live_members', String(existing.id), { role: 'guest', agoraUid: numericAgoraUid(req.user!.uid) });
  else await add('live_members', { roomId, userId: req.user!.uid, role: 'guest', agoraUid: numericAgoraUid(req.user!.uid) });

  const profileUser: any = await buildStageUser(req.user!.uid);
  await add('live_entries', { roomId, userId: req.user!.uid, role: 'guest', name: profileUser.name, username: profileUser.username, avatar: profileUser.avatar, level: profileUser.level });
  await update('invites', inviteId, { status: 'accepted', respondedAt: now(), acceptedAt: now() });

  const token = buildRtcToken(String(room.channel), req.user!.uid, 'host');
  return res.json({
    success: true,
    status: 'accepted',
    room: { ...room, displayMode: 'GUEST' },
    memberRole: 'guest',
    agora: { ...token, channel: room.channel },
  });
}));

app.post('/api/live/stage/leave', asyncRoute(async (req, res) => {
  const roomId = String(req.body?.roomId || '');
  const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(404).json({ error: 'live room not found' });
  const userId = req.user!.uid;
  if (String(room.hostId) === String(userId)) return res.status(400).json({ error: 'host cannot leave the stage; end the broadcast instead' });

  const rows: any[] = await list('live_members', { roomId, userId }, 10);
  for (const row of rows) {
    if (['guest','cohost'].includes(String(row.role || '').toLowerCase())) await remove('live_members', String(row.id));
  }
  return res.json({ success: true });
}));

app.post('/api/live/stage/token', asyncRoute(async (req, res) => {
  const roomId = String(req.body?.roomId || '');
  const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(404).json({ error: 'live room not found' });

  const member: any = (await list('live_members', { roomId, userId: req.user!.uid }, 10))[0];
  const role = String(member?.role || '');
  if (!['host','cohost','guest'].includes(role)) return res.status(403).json({ error: 'user is not a stage participant' });

  const token = buildRtcToken(String(room.channel), req.user!.uid, 'host');
  return res.json({ success: true, role, channel: room.channel, ...token });
}));

app.post('/api/live/pk-invite', asyncRoute(async (req, res) => {
  const roomId = String(req.body?.roomId || '');
  const room: any = await get('live_rooms', roomId);
  if (!room || room.status !== 'live') return res.status(404).json({ error: 'live room not found' });
  const fromUserId = req.user!.uid;
  const members: any[] = await list('live_members', { roomId }, 100);
  const cohost = members.find((m:any) => String(m.role || '').toLowerCase() === 'cohost');
  if (!cohost) return res.status(400).json({ error: 'no co-host is connected' });
  if (String(cohost.userId) === String(fromUserId)) return res.status(400).json({ error: 'invalid PK target' });

  const duplicate = (await list('pk_invites', { roomId, toUserId: String(cohost.userId), status: 'pending' }, 5))[0];
  if (duplicate) return res.json({ success: true, inviteId: duplicate.id, status: 'pending' });

  const id = await add('pk_invites', {
    roomId, fromUserId, toUserId: String(cohost.userId), status: 'pending', type: 'pk'
  });
  return res.status(201).json({ success: true, inviteId: id, status: 'pending' });
}));

app.get('/api/live/pk-invites/incoming', asyncRoute(async (req, res) => {
  const rows: any[] = await list('pk_invites', { toUserId: req.user!.uid, status: 'pending' }, 10);
  const items = await Promise.all(rows.map(async (invite:any) => ({
    ...invite,
    fromUser: await buildStageUser(String(invite.fromUserId || '')),
  })));
  return res.json({ success: true, items });
}));

app.post('/api/live/pk-invite/respond', asyncRoute(async (req, res) => {
  const inviteId = String(req.body?.inviteId || '');
  const status = String(req.body?.status || '');
  if (!inviteId || !['accepted','rejected'].includes(status)) return res.status(400).json({ error: 'valid inviteId and status are required' });

  const invite: any = await get('pk_invites', inviteId);
  if (!invite || String(invite.toUserId) !== String(req.user!.uid) || invite.status !== 'pending') return res.status(404).json({ error: 'PK invite not found' });

  if (status === 'rejected') {
    await update('pk_invites', inviteId, { status: 'rejected', respondedAt: now() });
    return res.json({ success: true, status: 'rejected' });
  }

  const id = await add('pk_matches', {
    roomId: String(invite.roomId),
    hostId: String(invite.fromUserId),
    opponentId: String(invite.toUserId),
    status: 'active',
    startedAt: now(),
  });
  await update('pk_invites', inviteId, { status: 'accepted', respondedAt: now(), matchId: id });
  return res.json({ success: true, status: 'accepted', matchId: id });
}));
