import { useEffect, useRef, useState, type TouchEvent, type MouseEvent } from 'react';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser, type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Share2, X, UserPlus, Sparkles, MessageCircle, Send, Eye, Clock3, Heart, Verified, UsersRound, Gift, Crown } from 'lucide-react';
import { api } from './api';
import { auth } from './firebase';

type Room = { id: string; channel: string; hostId: string; title?: string; topSupporters?: any[]; agora?: { token: string; appId: string; uid: number; channel: string }; isHost?: boolean; host?: any };

export function AgoraLiveRoom({ room, onClose }: { room: Room; onClose: () => void }) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const [micOn, setMicOn] = useState(Boolean(room.isHost));
  const [cameraOn, setCameraOn] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [remoteCameraOn, setRemoteCameraOn] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftBusy, setGiftBusy] = useState(false);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);
  const [comment, setComment] = useState('');
  type LiveComment = { id: string; userId: string; name: string; username?: string; avatar?: string; level: number; text: string; isHost?: boolean };
  const [comments, setComments] = useState<LiveComment[]>([]);
  const commentsScrollRef = useRef<HTMLDivElement | null>(null);
  const commentUserCache = useRef(new Map<string, LiveComment>());
  const [followed, setFollowed] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(Number((room as any).hearts || 0));
  const [elapsed, setElapsed] = useState(0);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [filterOn, setFilterOn] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front'|'back'>('front');
  const [broadcastEnded, setBroadcastEnded] = useState(false);
  const [endCountdown, setEndCountdown] = useState(5);
  const [entryVisible, setEntryVisible] = useState(false);
  const [entryLevel, setEntryLevel] = useState(0);
  const [entryLabel, setEntryLabel] = useState('');

  const hostName = room.host?.name || room.title || 'Pardais Live Official Pakistan';
  const hostId = room.host?.username || room.host?.id || room.hostId || 'unknown';
  const hostLevel = Number(room.host?.level ?? 0);
  const hostAvatar = room.host?.avatarUrl || room.host?.avatar || '';
  const hasRealHostData = Boolean(room.host?.id || room.host?.username || room.host?.name);
  const displayHostName = hasRealHostData ? hostName : 'Loading host…';

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await api.get(`/api/live/state/${room.id}`);
        if (Number.isFinite(Number(r.data?.hearts))) setLikes(Number(r.data.hearts));
        if (Number.isFinite(Number(r.data?.viewerCount))) setViewerCount(Number(r.data.viewerCount));
      } catch (e: any) {
        if (!room.isHost && (e?.response?.status === 404 || String(e?.message || '').includes('404'))) setBroadcastEnded(true);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => window.clearInterval(timer);
  }, [room.id, room.isHost]);

  useEffect(() => {
    if (!broadcastEnded || room.isHost) return;
    setEndCountdown(5);
    let remaining = 5;
    const timer = window.setInterval(() => {
      remaining -= 1;
      setEndCountdown(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        onClose();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [broadcastEnded, room.isHost]);

  useEffect(() => {
    if (!connected || room.isHost) return;
    let cancelled = false;
    const loadEntry = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const r = await api.get(`/api/profile/${encodeURIComponent(uid)}`);
        const level = Math.max(1, Math.min(50, Number(r.data?.profile?.level ?? 1)));
        const milestone = Math.floor(level / 10) * 10;
        if (milestone < 10 || cancelled) return;
        const labels: Record<number,string> = {10:'Silver Entry',20:'Gold Entry',30:'Diamond Entry',40:'Royal Entry',50:'Ultimate Entry'};
        setEntryLevel(milestone);
        setEntryLabel(labels[milestone] || 'Entry');
        setEntryVisible(true);
        window.setTimeout(() => { if (!cancelled) setEntryVisible(false); }, 3200);
      } catch {}
    };
    void loadEntry();
    return () => { cancelled = true; };
  }, [connected, room.isHost]);

  useEffect(() => {
    let disposed = false;
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    clientRef.current = client;
    const connect = async () => {
      try {
        const join = room.agora ? { data: { agora: room.agora, room } } : await api.post('/api/live/join', { roomId: room.id });
        const agora = join.data.agora;
        await client.setClientRole(room.isHost ? 'host' : 'audience');
        await client.join(agora.appId, agora.channel, agora.token, agora.uid);
        if (disposed) return;
        setConnected(true);
        setViewerCount(client.remoteUsers.length);
        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType) => {
          await client.subscribe(user, mediaType);
          setViewerCount(client.remoteUsers.length);
          if (mediaType === 'video') {
            setRemoteCameraOn(true);
            if (remoteVideoRef.current && user.videoTrack) user.videoTrack.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
        });
        client.on('user-unpublished', (_user: IAgoraRTCRemoteUser, mediaType: 'audio'|'video') => {
          setViewerCount(client.remoteUsers.length);
          if (mediaType === 'video') setRemoteCameraOn(false);
        });
        client.on('user-left', () => setViewerCount(client.remoteUsers.length));
        for (const user of client.remoteUsers) {
          if (user.hasVideo || user.hasAudio) {
            if (user.hasVideo) { await client.subscribe(user, 'video'); setRemoteCameraOn(true); if (remoteVideoRef.current && user.videoTrack) user.videoTrack.play(remoteVideoRef.current); }
            if (user.hasAudio) { await client.subscribe(user, 'audio'); user.audioTrack?.play(); }
          }
        }
        if (room.isHost) {
          micRef.current = await AgoraRTC.createMicrophoneAudioTrack();
          await client.publish([micRef.current]);
          setMicOn(true);
        }
      } catch (e: any) {
        if (!disposed) setError(e?.message || 'Could not connect to the live stream.');
      }
    };
    void connect();
    return () => {
      disposed = true;
      void (async () => {
        try { await client.leave(); } catch {}
        micRef.current?.close(); camRef.current?.close();
        if (room.isHost) await api.post('/api/live/end', { roomId: room.id }).catch(() => {});
        else await api.post('/api/live/leave', { roomId: room.id }).catch(() => {});
      })();
    };
  }, [room.id]);

  const toggleMic = async () => {
    const track = micRef.current; if (!track || !clientRef.current) return;
    const next = !micOn; await track.setEnabled(next); setMicOn(next);
  };

  const toggleCamera = async () => {
    if (!clientRef.current || !room.isHost) return;
    if (!camRef.current) {
      const track = await AgoraRTC.createCameraVideoTrack();
      camRef.current = track;
      await clientRef.current.publish([track]);
      setCameraOn(true);
      if (localVideoRef.current) track.play(localVideoRef.current);
      return;
    }
    const next = !cameraOn;
    if (next) {
      await camRef.current.setEnabled(true);
      await clientRef.current.publish([camRef.current]);
      setCameraOn(true);
      if (localVideoRef.current) camRef.current.play(localVideoRef.current);
    } else {
      await clientRef.current.unpublish([camRef.current]);
      await camRef.current.setEnabled(false);
      setCameraOn(false);
    }
  };

  const rotateCamera = async () => {
    if (!room.isHost || !camRef.current) return;
    try {
      const cameras = await AgoraRTC.getCameras();
      if (!cameras.length) return;
      const target = cameraFacing === 'front'
        ? cameras.find((d: any) => /back|rear|environment/i.test(d.label)) || cameras[cameras.length - 1]
        : cameras.find((d: any) => /front|user|facetime/i.test(d.label)) || cameras[0];
      if (target) {
        await camRef.current.setDevice(target.deviceId);
        setCameraFacing(v => v === 'front' ? 'back' : 'front');
      }
    } catch {}
  };

  const sendGift = async (gift:any) => {
    if (!room.isHost && giftBusy) return;
    setGiftBusy(true);
    try {
      await api.post('/api/gifts/send', {
        receiverId: String(room.host?.id || room.hostId),
        giftId: gift.id,
        quantity: 1,
        coins: gift.coins,
      });
      setGiftOpen(false);
      setSelectedGift(null);
    } catch (e:any) {
      window.alert(String(e?.message || 'Gift could not be sent.'));
    } finally {
      setGiftBusy(false);
    }
  };

  const share = async () => {
    try { await navigator.share?.({ title: 'Pardais Lite Live', text: room.title || 'Join my live stream', url: window.location.href }); } catch {}
  };

  const loadLiveComments = async () => {
    try {
      const r = await api.get(`/api/comments/${encodeURIComponent(room.id)}`);
      const raw = Array.isArray(r.data?.items) ? r.data.items : [];
      const mapped: LiveComment[] = [];
      for (const item of raw.slice(-30)) {
        const uid = String(item.userId || '');
        let cached = commentUserCache.current.get(uid);
        if (!cached) {
          try {
            const [uRes, pRes] = await Promise.all([
              api.get(`/api/users/${encodeURIComponent(uid)}`),
              api.get(`/api/profile/${encodeURIComponent(uid)}`),
            ]);
            const u = uRes.data?.user || {};
            const pr = pRes.data?.profile || {};
            cached = {
              id: uid,
              userId: uid,
              name: pr.name || u.name || u.displayName || 'Pardais User',
              username: pr.username || u.username || '',
              avatar: pr.avatar || u.avatar || '',
              level: Math.max(1, Number(pr.level ?? u.level ?? 1)),
              text: '',
            };
            commentUserCache.current.set(uid, cached);
          } catch {
            cached = { id: uid, userId: uid, name: 'Pardais User', username: '', avatar: '', level: 1, text: '' };
            commentUserCache.current.set(uid, cached);
          }
        }
        mapped.push({ ...cached, id: String(item.id || `${uid}-${item.createdAt || item.text}`), text: String(item.text || ''), isHost: uid === String(room.hostId || room.host?.id || '') });
      }
      const el = commentsScrollRef.current;
      const wasNearBottom = !el || (el.scrollHeight - el.scrollTop - el.clientHeight) < 70;
      setComments(mapped);
      if (wasNearBottom) {
        window.requestAnimationFrame(() => {
          const node = commentsScrollRef.current;
          if (node) node.scrollTop = node.scrollHeight;
        });
      }
    } catch {}
  };

  useEffect(() => {
    void loadLiveComments();
    const timer = window.setInterval(() => void loadLiveComments(), 2500);
    return () => window.clearInterval(timer);
  }, [room.id]);

  const submitComment = async () => {
    const value = comment.trim();
    if (!value) return;
    const uid = auth.currentUser?.uid || String(room.hostId || '');
    const cached = commentUserCache.current.get(uid);
    const optimistic: LiveComment = cached
      ? { ...cached, id: `local-${Date.now()}`, text: value, isHost: room.isHost || uid === String(room.hostId) }
      : { id: `local-${Date.now()}`, userId: uid, name: room.isHost ? hostName : (auth.currentUser?.displayName || 'Pardais User'), username: '', avatar: room.isHost ? hostAvatar : '', level: room.isHost ? Math.max(1, hostLevel) : 1, text: value, isHost: room.isHost };
    setComments(v => [...v, optimistic].slice(-30));
    setComment('');
    try {
      await api.post('/api/comments', { targetId: room.id, text: value });
      void loadLiveComments();
    } catch {}
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const endBroadcast = () => { setEndConfirmOpen(false); onClose(); };
  const addHeart = async () => {
    try {
      const r = await api.post('/api/live/heart', { roomId: room.id });
      const next = Number(r.data?.hearts);
      setLikes(Number.isFinite(next) ? next : v => v + 1);
    } catch { setLikes(v => v + 1); }
    const id = Date.now();
    setFloatingHearts(v => [...v.slice(-5), id]);
    window.setTimeout(() => setFloatingHearts(v => v.filter(x => x !== id)), 900);
  };

  const lastTapRef = useRef(0);
  const handleTouchLike = (e: TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button,input,textarea')) return;
    const now = Date.now();
    if (now - lastTapRef.current < 360) { void addHeart(); lastTapRef.current = 0; }
    else lastTapRef.current = now;
  };

  const handleDoubleClickLike = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button,input,textarea')) return;
    void addHeart();
  };


  return <div className={`solo-live reference-solo-live ${room.isHost ? 'host-live' : 'viewer-live'}`} onTouchEnd={handleTouchLike} onDoubleClick={handleDoubleClickLike}>
    <div ref={room.isHost ? localVideoRef : remoteVideoRef} className={`solo-live-video ${filterOn ? 'filter-on' : ''} ${((room.isHost && cameraOn) || (!room.isHost && remoteCameraOn)) ? 'has-video' : ''}`} />
    <div className={`solo-camera-off-stage ${((room.isHost && !cameraOn) || (!room.isHost && !remoteCameraOn)) ? 'is-visible' : ''}`} aria-hidden="true">
      <div className="solo-camera-off-backdrop">
        {hostAvatar ? <img src={hostAvatar} alt="" /> : <span>{displayHostName.slice(0,1).toUpperCase()}</span>}
      </div>
      <div className="solo-camera-off-center">
        {(!cameraOn || (!room.isHost && !remoteCameraOn)) && <div className="solo-camera-off-avatar">{hostAvatar ? <img src={hostAvatar} alt="" /> : <span>{displayHostName.slice(0,1).toUpperCase()}</span>}</div>}
        {((room.isHost && !cameraOn) || (!room.isHost && !remoteCameraOn)) && <div className="solo-status-icon solo-status-camera"><CameraOff /></div>}
        {room.isHost && cameraOn && !micOn && <div className="solo-status-icon solo-status-mic"><MicOff /></div>}
        {((room.isHost && !cameraOn) || (!room.isHost && !remoteCameraOn)) && <b>Camera is off</b>}
        {room.isHost && cameraOn && !micOn && <b>Microphone is off</b>}
        <span>{room.isHost ? (cameraOn ? (micOn ? 'Your audio is live' : 'Your microphone is off') : (micOn ? 'Your audio is live' : 'Your microphone is off')) : 'Camera is off'}</span>
      </div>
    </div>
    <div className="solo-live-shade" />

    <header className="solo-live-top">
      <div className="solo-host-info">
        <div className="solo-avatar-wrap">
          {hostAvatar ? <img src={hostAvatar} alt="" /> : <span>{displayHostName.slice(0,1).toUpperCase()}</span>}
        </div>
        <div className="solo-host-text">
          <div className="solo-name-row"><b>{displayHostName}</b><Verified className="solo-verified" fill="currentColor" />{!room.isHost && <button onClick={() => setFollowed(v => !v)}>{followed ? 'Following' : 'Follow'}</button>}</div>
          <div className="solo-sub-row"><span>@{String(hostId).replace(/^@/, '')}</span><span className="solo-level">👑 Level {hostLevel}</span></div>
        </div>
      </div>
      <div className="solo-supporters">{((room.host?.topSupporters || room.topSupporters || []) as any[]).slice(0,3).map((s:any,i:number)=><div className="solo-supporter" key={s?.id || i}>{s?.avatarUrl || s?.avatar ? <img src={s.avatarUrl || s.avatar} alt="" /> : <span>{String(s?.name || '').slice(0,1).toUpperCase()}</span>}</div>)}</div>
      <div className="solo-top-actions">
        <button onClick={() => void share()} aria-label="Share"><Share2 /></button>
        <button onClick={() => room.isHost ? setEndConfirmOpen(true) : onClose()} aria-label={room.isHost ? 'End broadcast' : 'Close'}><X /></button>
      </div>
    </header>

    <div className="solo-stats">
      <span><Eye /> <b>{viewerCount + (room.isHost ? 1 : 0)}</b><small>Viewers</small></span>
      <span><Clock3 /> <b>{formatTime(elapsed)}</b><small>Live Time</small></span>
      <span><Heart className={liked ? 'liked' : ''} fill={liked ? 'currentColor' : 'none'} /> <b>{likes}</b><small>Likes</small></span>
    </div>

    {!room.isHost && !connected && <div className="solo-joining">Joining live…</div>}

    {entryVisible && !room.isHost && <div className={`solo-entry-overlay entry-level-${entryLevel}`} aria-hidden="true">
      <div className="solo-entry-glow" />
      <div className="solo-entry-ring">
        <div className="solo-entry-avatar">{auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} alt="" /> : <span>{String(auth.currentUser?.displayName || 'P').slice(0,1).toUpperCase()}</span>}</div>
        <Crown className="solo-entry-crown" fill="currentColor" />
      </div>
      <div className="solo-entry-title">{entryLabel}</div>
      <div className="solo-entry-level">Level {entryLevel}</div>
    </div>}

    {broadcastEnded && !room.isHost && <div className="solo-broadcast-ended" role="status">
      <div className="solo-ended-icon"><PhoneOff /></div>
      <h2>This broadcast has ended</h2>
      <p>You will be redirected to Live in <b>{endCountdown}</b> seconds...</p>
      <div className="solo-ended-progress"><i style={{width: `${Math.max(0, Math.min(100, (5 - endCountdown) * 20))}%`}} /></div>
      <button onClick={onClose}>Go to Live Now</button>
    </div>}

    <div className="solo-comments" ref={commentsScrollRef} aria-label="Live comments">
      {comments.map((c) => (
        <div className="solo-comment-item" key={c.id}>
          <div className="solo-comment-avatar">{c.avatar ? <img src={c.avatar} alt="" /> : <span>{c.name.slice(0,1).toUpperCase()}</span>}</div>
          <div className="solo-comment-copy">
            <div className="solo-comment-meta">
              <b>{c.name}</b>
              {c.isHost ? <span className="solo-comment-host">Host</span> : <span className="solo-comment-level">👑 Lv.{Math.max(1, c.level)}</span>}
            </div>
            <p>{c.text}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="solo-comment-bar">
      <MessageCircle />
      <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(); }} placeholder="Comment..." />
      <button onClick={submitComment} aria-label="Send"><Send /></button>
    </div>

    <div className="solo-bottom-actions">
      {room.isHost ? <button className="solo-invite" onClick={() => setInviteOpen(v => !v)}><UserPlus /><b>Invite</b></button> : null}
      {room.isHost ? <>
        <button className={micOn ? 'solo-round' : 'solo-round danger'} onClick={() => void toggleMic()} aria-label="Microphone">{micOn ? <Mic /> : <MicOff />}</button>
        <button className={cameraOn ? 'solo-round' : 'solo-round danger'} onClick={() => void toggleCamera()} aria-label="Camera">{cameraOn ? <Camera /> : <CameraOff />}</button>
        <button className="solo-round" onClick={() => void rotateCamera()} aria-label="Rotate camera">↻</button>
        <button className={filterOn ? 'solo-round active' : 'solo-round'} onClick={() => setFilterOn(v => !v)} aria-label="Filter"><Sparkles /></button>
        <button className="solo-round" onClick={() => setMoreOpen(v => !v)} aria-label="More">⋯</button>
      </> : <>
        <button className="solo-viewer-gift" onClick={() => setGiftOpen(v => !v)} aria-label="Send gift"><Gift /></button>
      </>}
    </div>
    <div className="solo-floating-hearts" aria-hidden="true">{floatingHearts.map(id => <Heart key={id} fill="currentColor" className="solo-floating-heart" />)}</div>
    {giftOpen && !room.isHost && <div className="solo-gift-drawer-backdrop" onClick={e => { if (e.target === e.currentTarget) { setGiftOpen(false); setSelectedGift(null); } }}>
      <div className="solo-gift-drawer">
        <div className="solo-gift-head"><button onClick={() => { setGiftOpen(false); setSelectedGift(null); }}><X /></button><b>Send Gift</b><span>🪙 0</span></div>
        <div className="solo-gift-tabs"><button className="active">Popular</button><button>Luxury</button><button>Special</button></div>
        <div className="solo-gift-grid">
          {[{id:'rose',name:'Rose',icon:'🌹',coins:10},{id:'heart',name:'Heart',icon:'💖',coins:50},{id:'crown',name:'Crown',icon:'👑',coins:100},{id:'diamond',name:'Diamond',icon:'💎',coins:500},{id:'star',name:'Star',icon:'⭐',coins:1000},{id:'love',name:'Love',icon:'💝',coins:2000},{id:'car',name:'Super Car',icon:'🏎️',coins:5000},{id:'rocket',name:'Rocket',icon:'🚀',coins:10000}].map(g => <button key={g.id} className={selectedGift?.id===g.id?'selected':''} disabled={giftBusy} onClick={() => setSelectedGift(g)}><span>{g.icon}</span><b>{g.name}</b><small>🪙 {g.coins}</small></button>)}
        </div>
        <div className="solo-gift-sendbar"><span>{selectedGift ? `${selectedGift.name} selected` : 'Select a gift'}</span><button disabled={!selectedGift || giftBusy} onClick={() => selectedGift && void sendGift(selectedGift)}>{giftBusy ? 'Sending…' : 'Send'}</button></div>
      </div>
    </div>}
    {moreOpen && room.isHost && <div className="solo-more-pop"><b>More Controls</b><button onClick={() => setMoreOpen(false)}>Beauty / Effects</button><button onClick={() => setMoreOpen(false)}>Live Settings</button><button onClick={() => setMoreOpen(false)}>Close</button></div>}

    {inviteOpen && <div className="solo-invite-pop"><b><UsersRound /> Invite hosts</b><span>Available hosts will appear here.</span><button onClick={() => setInviteOpen(false)}>Close</button></div>}
    {error && <div className="solo-error">{error}</div>}

    {room.isHost && endConfirmOpen && <div className="solo-end-modal" role="dialog" aria-modal="true" aria-labelledby="solo-end-title">
      <div className="solo-end-card"><h3 id="solo-end-title">End Broadcast?</h3><p>Hey, do you want to end the broadcast?</p><div><button className="solo-end-no" onClick={() => setEndConfirmOpen(false)}>No</button><button className="solo-end-yes" onClick={endBroadcast}>Yes</button></div></div>
    </div>}
  </div>;
}
