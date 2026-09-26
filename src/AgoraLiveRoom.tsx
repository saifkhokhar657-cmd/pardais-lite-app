import { useEffect, useRef, useState, type TouchEvent, type MouseEvent } from 'react';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser, type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Share2, X, UserPlus, Sparkles, MessageCircle, Send, Eye, Clock3, Heart, Verified, UsersRound, Gift, Crown, Check, Ban, Users } from 'lucide-react';
import { api } from './api';
import { auth } from './firebase';

type Room = { id: string; channel: string; hostId: string; title?: string; topSupporters?: any[]; agora?: { token: string; appId: string; uid: number; channel: string }; isHost?: boolean; host?: any };

export function AgoraLiveRoom({ room, onClose, onViewProfile, onSwitchRoom }: { room: Room; onClose: () => void; onViewProfile?: (uid: string) => void; onSwitchRoom?: (room: any) => void }) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioTracksRef = useRef<any[]>([]);
  const initialStageRole = String((room as any).stageRole || '').toLowerCase();
  const canPublishInitial = Boolean(room.isHost || ['cohost','guest'].includes(initialStageRole));
  const [micOn, setMicOn] = useState(canPublishInitial);
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
  const [availableHosts, setAvailableHosts] = useState<any[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [selectedViewer, setSelectedViewer] = useState<LiveComment | null>(null);
  const [viewerActionBusy, setViewerActionBusy] = useState(false);
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
  const [entryAvatar, setEntryAvatar] = useState('');
  const [entryName, setEntryName] = useState('');
  const [incomingInvites, setIncomingInvites] = useState<any[]>([]);
  const [viewerListOpen, setViewerListOpen] = useState(false);
  const [viewerList, setViewerList] = useState<any[]>([]);
  const [viewerListBusy, setViewerListBusy] = useState(false);
  const [inviteNotice, setInviteNotice] = useState('');
  const seenInviteStatus = useRef(new Map<string,string>());
  const [stageMembers, setStageMembers] = useState<any[]>([]);
  const [pkInvites, setPkInvites] = useState<any[]>([]);
  const [pkBusy, setPkBusy] = useState(false);
  const stageRole = String((room as any).stageRole || '').toLowerCase();
  const canPublish = Boolean(room.isHost || ['cohost','guest'].includes(stageRole));

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
    if (!connected) return;
    let cancelled = false;
    let lastEntryId = '';
    const loadEntries = async () => {
      try {
        const r = await api.get(`/api/live/entries/${encodeURIComponent(room.id)}`);
        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        const latest = items[items.length - 1];
        if (!latest || !latest.id || latest.id === lastEntryId) return;
        lastEntryId = String(latest.id);
        if (cancelled) return;
        const level = Math.max(1, Math.min(50, Number(latest.level || 1)));
        const tier = level >= 50 ? 50 : level >= 40 ? 40 : level >= 30 ? 30 : level >= 20 ? 20 : level >= 10 ? 10 : 1;
        const labels: Record<number,string> = {1:'Starter Entry',10:'Silver Entry',20:'Gold Entry',30:'Diamond Entry',40:'Royal Entry',50:'Ultimate Entry'};
        setEntryLevel(tier);
        setEntryLabel(labels[tier]);
        setEntryAvatar(String(latest.avatar || ''));
        setEntryName(String(latest.name || latest.username || 'Pardais User'));
        setEntryVisible(true);
        window.setTimeout(() => { if (!cancelled) setEntryVisible(false); }, 3000);
      } catch {}
    };
    void loadEntries();
    const timer = window.setInterval(() => void loadEntries(), 1500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [connected, room.id]);


  useEffect(() => {
    if (!room.isHost) return;
    const beat = () => { void api.post('/api/live/heartbeat', { roomId: room.id }).catch(() => {}); };
    beat();
    const timer = window.setInterval(beat, 2000);
    return () => window.clearInterval(timer);
  }, [room.id, room.isHost]);

  useEffect(() => {
    if (!room.isHost) return;
    let cancelled = false;
    const loadOutgoing = async () => {
      try {
        const r = await api.get(`/api/live/outgoing-invites/${encodeURIComponent(room.id)}`);
        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        for (const invite of items) {
          const id = String(invite.id || '');
          const status = String(invite.status || '');
          if (!id || !status) continue;
          const previous = seenInviteStatus.current.get(id);
          if (previous && previous !== status && (status === 'accepted' || status === 'rejected')) {
            setInviteNotice(status === 'accepted' ? 'Invite accepted — One VS One is ready.' : 'Request rejected — you remain in Solo Live.');
            window.setTimeout(() => setInviteNotice(''), 3500);
          }
          seenInviteStatus.current.set(id, status);
        }
      } catch {}
    };
    void loadOutgoing();
    const timer = window.setInterval(() => void loadOutgoing(), 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [room.id, room.isHost]);

  useEffect(() => {
    let cancelled = false;
    const loadIncoming = async () => {
      try {
        const r = await api.get('/api/live/incoming-invites');
        if (!cancelled) setIncomingInvites(Array.isArray(r.data?.items) ? r.data.items : []);
      } catch { if (!cancelled) setIncomingInvites([]); }
    };
    void loadIncoming();
    const timer = window.setInterval(() => void loadIncoming(), 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [room.isHost]);

  useEffect(() => {
    if (!inviteOpen || !room.isHost) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await api.get('/api/live/available-hosts');
        if (!cancelled) setAvailableHosts(Array.isArray(r.data?.items) ? r.data.items : []);
      } catch { if (!cancelled) setAvailableHosts([]); }
    };
    void load();
    const timer = window.setInterval(load, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [inviteOpen, room.isHost]);

  useEffect(() => {
    let disposed = false;
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    clientRef.current = client;
    const connect = async () => {
      try {
        const join = room.agora ? { data: { agora: room.agora, room } } : await api.post('/api/live/join', { roomId: room.id });
        const agora = join.data.agora;
        await client.setClientRole(canPublish ? 'host' : 'audience');
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
          if (mediaType === 'audio' && user.audioTrack) {
            if (!remoteAudioTracksRef.current.includes(user.audioTrack)) remoteAudioTracksRef.current.push(user.audioTrack);
            try { user.audioTrack.play(); } catch {}
          }
        });
        client.on('user-unpublished', (_user: IAgoraRTCRemoteUser, mediaType: 'audio'|'video') => {
          setViewerCount(client.remoteUsers.length);
          if (mediaType === 'video') setRemoteCameraOn(false);
        if (mediaType === 'audio') {
          const track = _user.audioTrack;
          if (track) remoteAudioTracksRef.current = remoteAudioTracksRef.current.filter(t => t !== track);
        }
        });
        client.on('user-left', () => setViewerCount(client.remoteUsers.length));
        for (const user of client.remoteUsers) {
          if (user.hasVideo || user.hasAudio) {
            if (user.hasVideo) { await client.subscribe(user, 'video'); setRemoteCameraOn(true); if (remoteVideoRef.current && user.videoTrack) user.videoTrack.play(remoteVideoRef.current); }
            if (user.hasAudio) { await client.subscribe(user, 'audio'); if (user.audioTrack) { if (!remoteAudioTracksRef.current.includes(user.audioTrack)) remoteAudioTracksRef.current.push(user.audioTrack); try { user.audioTrack.play(); } catch {} } }
          }
        }
        if (canPublish) {
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
        if (room.isHost && !stageRole) await api.post('/api/live/end', { roomId: room.id }).catch(() => {});
        else if (stageRole) await api.post('/api/live/stage/leave', { roomId: room.id }).catch(() => {});
        else await api.post('/api/live/leave', { roomId: room.id }).catch(() => {});
      })();
    };
  }, [room.id, canPublish, stageRole]);

  // Mobile browsers can block remote audio until the viewer interacts with the page.
  // Keep the Agora audio track published/playing even when the host camera is OFF.
  useEffect(() => {
    const unlockAudio = () => {
      for (const track of remoteAudioTracksRef.current) {
        try { track.play(); } catch {}
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  const toggleMic = async () => {
    const track = micRef.current; if (!track || !clientRef.current) return;
    const next = !micOn; await track.setEnabled(next); setMicOn(next);
  };

  const toggleCamera = async () => {
    if (!clientRef.current || !canPublish) return;
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
    if (!canPublish || !camRef.current) return;
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

  const loadViewerList = async () => {
    setViewerListBusy(true);
    try {
      const r = await api.get(`/api/live/viewers/${encodeURIComponent(room.id)}`);
      const items = Array.isArray(r.data?.items) ? r.data.items : [];
      setViewerList(items.map((v:any) => ({ ...v, userId: String(v.userId || v.id || '') })));
    } catch { setViewerList([]); }
    finally { setViewerListBusy(false); }
  };
  const toggleViewerList = async () => {
    const next = !viewerListOpen;
    setViewerListOpen(next);
    if (next) await loadViewerList();
  };
  const respondHostInvite = async (invite:any, status:'accepted'|'rejected') => {
    try {
      const r = await api.post('/api/live/host-invite/respond', { inviteId: invite.id, status });
      setIncomingInvites(v => v.filter(x => String(x.id) !== String(invite.id)));
      if (status === 'accepted' && r.data?.room && r.data?.agora && onSwitchRoom) {
        onSwitchRoom({ ...r.data.room, agora: r.data.agora, isHost: false, stageRole: 'cohost', displayMode: 'ONE VS ONE' });
      } else if (status === 'rejected') {
        setInviteNotice('Co-host request rejected. You remain in Solo Live.');
        window.setTimeout(() => setInviteNotice(''), 3000);
      }
    } catch (e:any) {
      window.alert(String(e?.response?.data?.error || e?.message || 'Invite response failed.'));
    }
  };

  const respondGuestInvite = async (invite:any, status:'accepted'|'rejected') => {
    try {
      const r = await api.post('/api/live/guest-invite/respond', { inviteId: invite.id, status });
      setIncomingInvites(v => v.filter(x => String(x.id) !== String(invite.id)));
      if (status === 'accepted' && r.data?.room && r.data?.agora && onSwitchRoom) {
        onSwitchRoom({ ...r.data.room, agora: r.data.agora, isHost: false, stageRole: 'guest', displayMode: 'GUEST' });
      } else if (status === 'rejected') {
        setInviteNotice('Guest request rejected.');
        window.setTimeout(() => setInviteNotice(''), 2500);
      }
    } catch (e:any) {
      window.alert(String(e?.response?.data?.error || e?.message || 'Guest response failed.'));
    }
  };

  const respondPkInvite = async (invite:any, status:'accepted'|'rejected') => {
    try {
      const r = await api.post('/api/live/pk-invite/respond', { inviteId: invite.id, status });
      setPkInvites(v => v.filter(x => String(x.id) !== String(invite.id)));
      setInviteNotice(status === 'accepted' ? `PK started${r.data?.matchId ? ` · Match ${r.data.matchId.slice(0,6)}` : ''}.` : 'PK request rejected.');
      window.setTimeout(() => setInviteNotice(''), 3000);
    } catch (e:any) {
      window.alert(String(e?.response?.data?.error || e?.message || 'PK response failed.'));
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
      setComments(mapped);
      window.requestAnimationFrame(() => {
        const node = commentsScrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      });
    } catch {}
  };

  useEffect(() => {
    if (!canPublish) return;
    let cancelled = false;
    const loadStage = async () => {
      try {
        const r = await api.get(`/api/live/stage/${encodeURIComponent(room.id)}`);
        if (!cancelled) setStageMembers(Array.isArray(r.data?.items) ? r.data.items : []);
      } catch {}
    };
    void loadStage();
    const timer = window.setInterval(loadStage, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [room.id, canPublish]);

  useEffect(() => {
    if (!canPublish) return;
    let cancelled = false;
    const loadPk = async () => {
      try {
        const r = await api.get('/api/live/pk-invites/incoming');
        if (!cancelled) setPkInvites(Array.isArray(r.data?.items) ? r.data.items : []);
      } catch {}
    };
    void loadPk();
    const timer = window.setInterval(loadPk, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [canPublish]);

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
  const endBroadcast = async () => { setEndConfirmOpen(false); try { await api.post('/api/live/end', { roomId: room.id }); } catch {} onClose(); };
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

  const inviteHost = async (candidate: any) => {
    if (!candidate?.host?.id || inviteBusy) return;
    setInviteBusy(String(candidate.host.id));
    try {
      await api.post('/api/live/host-invite', { roomId: room.id, toUserId: String(candidate.host.id), targetRoomId: String(candidate.roomId) });
      setAvailableHosts(v => v.filter(x => String(x.host?.id) !== String(candidate.host.id)));
    } catch (e:any) { window.alert(String(e?.response?.data?.error || e?.message || 'Invite could not be sent.')); }
    finally { setInviteBusy(null); }
  };

  const invitePk = async () => {
    if (pkBusy) return;
    const other = stageMembers.find((m:any) => String(m.userId) !== String(auth.currentUser?.uid || '') && ['host','cohost'].includes(String(m.role || '').toLowerCase()));
    if (!other) { window.alert('No co-host is attached for PK.'); return; }
    setPkBusy(true);
    try {
      await api.post('/api/live/pk-invite', { roomId: room.id, toUserId: String(other.userId) });
      setInviteNotice('PK request sent.');
      window.setTimeout(() => setInviteNotice(''), 2500);
    } catch (e:any) {
      window.alert(String(e?.response?.data?.error || e?.message || 'PK request could not be sent.'));
    } finally { setPkBusy(false); }
  };

  const inviteViewerAsGuest = async () => {
    if (!selectedViewer || viewerActionBusy) return;
    setViewerActionBusy(true);
    try {
      await api.post('/api/live/guest-invite', { roomId: room.id, toUserId: selectedViewer.userId });
      setSelectedViewer(null);
    } catch (e:any) { window.alert(String(e?.response?.data?.error || e?.message || 'Guest invite could not be sent.')); }
    finally { setViewerActionBusy(false); }
  };

  const makeModerator = async () => {
    if (!selectedViewer || viewerActionBusy) return;
    setViewerActionBusy(true);
    try {
      await api.post('/api/moderation', { action: 'moderator', targetUserId: selectedViewer.userId, roomId: room.id });
      setSelectedViewer(null);
    } catch (e:any) { window.alert(String(e?.response?.data?.error || e?.message || 'Moderator action failed.')); }
    finally { setViewerActionBusy(false); }
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
      {inviteNotice && <div className="solo-invite-notice">{inviteNotice}</div>}<div className="solo-top-actions">
        <button onClick={() => void share()} aria-label="Share"><Share2 /></button>
        <button onClick={() => room.isHost ? setEndConfirmOpen(true) : onClose()} aria-label={room.isHost ? 'End broadcast' : 'Close'}><X /></button>
      </div>
    </header>

    <div className="solo-stats">
      <button className="solo-viewer-stat" onClick={() => void toggleViewerList()} aria-label="View viewers"><Eye /> <b>{viewerCount}</b><small>Viewers</small></button>
      <span><Clock3 /> <b>{formatTime(elapsed)}</b><small>Live Time</small></span>
      <span><Heart className={liked ? 'liked' : ''} fill={liked ? 'currentColor' : 'none'} /> <b>{likes}</b><small>Likes</small></span>
    </div>

    {!room.isHost && !connected && <div className="solo-joining">Joining live…</div>}

    {entryVisible && <div className={`solo-entry-overlay entry-level-${entryLevel}`} aria-hidden="true">
      <div className="solo-entry-glow" />
      <div className="solo-entry-ring">
        <div className="solo-entry-avatar">{entryAvatar ? <img src={entryAvatar} alt="" /> : <span>{entryName.slice(0,1).toUpperCase() || 'P'}</span>}</div>
        <Crown className="solo-entry-crown" fill="currentColor" />
      </div>
      <div className="solo-entry-title">{entryName} entered</div><div className="solo-entry-label">{entryLabel}</div>
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
              <button className="solo-comment-user" onClick={() => !c.isHost && setSelectedViewer(c)}>{c.name}</button>
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

    {inviteOpen && <div className="solo-invite-pop">
      <div className="solo-invite-head"><b><UsersRound /> Invite co-host</b><button onClick={() => setInviteOpen(false)}><X /></button></div>
      <span>Only hosts who are live solo and not in a guest seat or PK are shown.</span>
      <div className="solo-invite-list">
        {availableHosts.length ? availableHosts.map((candidate:any) => <div className="solo-invite-row" key={candidate.roomId}>
          <div className="solo-invite-avatar">{candidate.host?.avatar ? <img src={candidate.host.avatar} alt=""/> : <span>{String(candidate.host?.name || 'P').slice(0,1).toUpperCase()}</span>}</div>
          <div className="solo-invite-copy"><b>{candidate.host?.name || 'Pardais Host'}</b><small>👑 Level {Math.max(1, Number(candidate.host?.level || 1))} · Solo Live</small></div>
          <button disabled={inviteBusy === String(candidate.host?.id)} onClick={() => void inviteHost(candidate)}>{inviteBusy === String(candidate.host?.id) ? '...' : 'Invite'}</button>
        </div>) : <div className="solo-invite-empty">No eligible solo hosts are live right now.</div>}
      </div>
    </div>}
    {selectedViewer && <div className="solo-viewer-action-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelectedViewer(null); }}>
      <div className="solo-viewer-action-card">
        <button className="solo-viewer-action-close" onClick={() => setSelectedViewer(null)}><X /></button>
        <div className="solo-viewer-action-avatar">{selectedViewer.avatar ? <img src={selectedViewer.avatar} alt=""/> : <span>{selectedViewer.name.slice(0,1).toUpperCase()}</span>}</div>
        <h3>{selectedViewer.name}</h3><p>{selectedViewer.username || '@viewer'} · 👑 Lv.{Math.max(1, selectedViewer.level)}</p>
        <button onClick={() => onViewProfile?.(selectedViewer.userId)}>Visit Profile</button>
        <button onClick={async () => { if (viewerActionBusy) return; setViewerActionBusy(true); try { await api.post('/api/follow', { followingId: selectedViewer.userId }); setInviteNotice('Followed.'); setSelectedViewer(null); } catch (e:any) { window.alert(String(e?.response?.data?.error || e?.message || 'Follow failed.')); } finally { setViewerActionBusy(false); } }}>Follow</button>
        <button onClick={() => void makeModerator()} disabled={viewerActionBusy}>Assign Moderator</button>
        <button className="pink-action" onClick={() => void inviteViewerAsGuest()} disabled={viewerActionBusy}>Invite as Guest</button>
        <button onClick={async () => { if (viewerActionBusy) return; setViewerActionBusy(true); try { await api.post('/api/moderation', { action:'kick', targetUserId:selectedViewer.userId, roomId:room.id }); setSelectedViewer(null); } catch (e:any) { window.alert(String(e?.response?.data?.error || e?.message || 'Kick failed.')); } finally { setViewerActionBusy(false); } }}>Kick</button>
        <button onClick={async () => { if (viewerActionBusy) return; setViewerActionBusy(true); try { await api.post('/api/moderation', { action:'block', targetUserId:selectedViewer.userId, roomId:room.id }); setSelectedViewer(null); } catch (e:any) { window.alert(String(e?.response?.data?.error || e?.message || 'Block failed.')); } finally { setViewerActionBusy(false); } }}>Block</button>
      </div>
    </div>}
    {viewerListOpen && <div className="solo-viewer-list-backdrop" onClick={e => { if (e.target === e.currentTarget) setViewerListOpen(false); }}>
      <div className="solo-viewer-list-card">
        <div className="solo-viewer-list-head"><b>Current Viewers</b><button onClick={() => setViewerListOpen(false)}><X /></button></div>
        {viewerListBusy ? <div className="solo-viewers-empty">Loading viewers…</div> : viewerList.length ? <div className="solo-viewers-list">{viewerList.map((v:any) => <button key={v.userId || v.id} onClick={() => { setSelectedViewer({ ...v, id:String(v.userId||v.id), userId:String(v.userId||v.id), text:'' }); setViewerListOpen(false); }}><span className="solo-viewer-avatar">{v.avatar ? <img src={v.avatar} alt=""/> : <b>{String(v.name||'P').slice(0,1).toUpperCase()}</b>}</span><span><b>{v.name || 'Pardais User'}</b><small>{v.username || '@viewer'} · 👑 Lv.{Math.max(1, Number(v.level||1))}</small></span></button>)}</div> : <div className="solo-viewers-empty">No current viewers.</div>}
      </div>
    </div>}
    {incomingInvites.length > 0 && <div className="solo-incoming-invite-backdrop">
      <div className="solo-incoming-invite-card">
        {incomingInvites.slice(0,1).map((invite:any) => <div key={invite.id}>
          <div className="solo-incoming-invite-avatar">{invite.fromUser?.avatar ? <img src={invite.fromUser.avatar} alt=""/> : <span>{String(invite.fromUser?.name||'P').slice(0,1).toUpperCase()}</span>}</div>
          <h3>{invite.inviteType === 'guest' ? 'Guest Invitation' : 'Co-host Invitation'}</h3>
          <p><b>{invite.fromUser?.name || 'Pardais Host'}</b> invited you {invite.inviteType === 'guest' ? 'as a guest' : 'to join One VS One'}.</p>
          <div className="solo-incoming-invite-actions"><button onClick={() => invite.inviteType === 'guest' ? void respondGuestInvite(invite,'rejected') : void respondHostInvite(invite,'rejected')}>Reject</button><button className="pink-action" onClick={() => invite.inviteType === 'guest' ? void respondGuestInvite(invite,'accepted') : void respondHostInvite(invite,'accepted')}>Accept</button></div>
        </div>)}
      </div>
    </div>}
    {pkInvites.length > 0 && <div className="solo-incoming-invite-backdrop">
      <div className="solo-incoming-invite-card"><div className="solo-incoming-invite-avatar">{pkInvites[0].fromUser?.avatar ? <img src={pkInvites[0].fromUser.avatar} alt=""/> : <span>PK</span>}</div><h3>PK Request</h3><p><b>{pkInvites[0].fromUser?.name || 'Co-host'}</b> wants to start a PK battle.</p><div className="solo-incoming-invite-actions"><button onClick={() => void respondPkInvite(pkInvites[0],'rejected')}>Reject</button><button className="pink-action" onClick={() => void respondPkInvite(pkInvites[0],'accepted')}>Accept PK</button></div></div>
    </div>}
    {canPublish && stageMembers.filter((m:any) => ['host','cohost'].includes(String(m.role||'').toLowerCase())).length >= 2 && <button className="solo-pk-button" onClick={() => void invitePk()} disabled={pkBusy}>{pkBusy ? 'Sending…' : 'PK'}</button>}
    {error && <div className="solo-error">{error}</div>}

    {room.isHost && endConfirmOpen && <div className="solo-end-modal" role="dialog" aria-modal="true" aria-labelledby="solo-end-title">
      <div className="solo-end-card"><h3 id="solo-end-title">End Broadcast?</h3><p>Hey, do you want to end the broadcast?</p><div><button className="solo-end-no" onClick={() => setEndConfirmOpen(false)}>No</button><button className="solo-end-yes" onClick={endBroadcast}>Yes</button></div></div>
    </div>}
  </div>;
}
