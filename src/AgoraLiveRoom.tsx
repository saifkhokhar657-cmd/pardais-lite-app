import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser, type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Share2, X, UserPlus, Sparkles, MessageCircle, Send, Eye, Clock3, Heart, Verified, UsersRound } from 'lucide-react';
import { api } from './api';

type Room = { id: string; channel: string; hostId: string; title?: string; agora?: { token: string; appId: string; uid: number; channel: string }; isHost?: boolean; host?: any };

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
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const [followed, setFollowed] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const hostName = room.host?.name || room.title || 'Pardais Live Official Pakistan';
  const hostId = room.host?.username || room.host?.id || room.hostId || '1000259813';
  const hostLevel = room.host?.level || 29;
  const hostAvatar = room.host?.avatarUrl || room.host?.avatar || '';

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
          if (mediaType === 'video' && remoteVideoRef.current && user.videoTrack) user.videoTrack.play(remoteVideoRef.current);
          if (mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
        });
        client.on('user-unpublished', () => setViewerCount(client.remoteUsers.length));
        client.on('user-left', () => setViewerCount(client.remoteUsers.length));
        for (const user of client.remoteUsers) {
          if (user.hasVideo || user.hasAudio) {
            if (user.hasVideo) { await client.subscribe(user, 'video'); if (remoteVideoRef.current && user.videoTrack) user.videoTrack.play(remoteVideoRef.current); }
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
    await camRef.current.setEnabled(next);
    setCameraOn(next);
    if (next && localVideoRef.current) camRef.current.play(localVideoRef.current);
  };
  const share = async () => {
    try { await navigator.share?.({ title: 'Pardais Lite Live', text: room.title || 'Join my live stream', url: window.location.href }); } catch {}
  };
  const submitComment = () => {
    const value = comment.trim();
    if (!value) return;
    setComments(v => [...v.slice(-2), value]);
    setComment('');
  };
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return <div className="solo-live reference-solo-live">
    <div ref={room.isHost ? localVideoRef : remoteVideoRef} className="solo-live-video" />
    <div className="solo-live-shade" />

    <header className="solo-live-top">
      <div className="solo-host-info">
        <div className="solo-avatar-wrap">
          {hostAvatar ? <img src={hostAvatar} alt="" /> : <span>{hostName.slice(0,1).toUpperCase()}</span>}
        </div>
        <div className="solo-host-text">
          <div className="solo-name-row"><b>{hostName}</b><Verified className="solo-verified" fill="currentColor" /><button onClick={() => setFollowed(v => !v)}>{followed ? 'Following' : 'Follow'}</button></div>
          <div className="solo-sub-row"><span>@{String(hostId).replace(/^@/, '')}</span><span className="solo-level">👑 {hostLevel}</span></div>
        </div>
      </div>
      <div className="solo-top-actions">
        <button onClick={() => void share()} aria-label="Share"><Share2 /></button>
        <button onClick={onClose} aria-label="Close"><X /></button>
      </div>
    </header>

    <div className="solo-stats">
      <span><Eye /> {viewerCount + (room.isHost ? 1 : 0)}</span>
      <span><Clock3 /> {formatTime(elapsed)}</span>
      <span><Heart className={liked ? 'liked' : ''} fill={liked ? 'currentColor' : 'none'} /> {likes}</span>
    </div>

    {!cameraOn && room.isHost && <div className="solo-camera-off"><div className="solo-initial">{hostName.slice(0,1).toUpperCase()}</div><b>Camera is off</b><span>Your audio is live</span></div>}
    {!room.isHost && !connected && <div className="solo-joining">Joining live…</div>}

    <div className="solo-comments">
      {comments.map((c, i) => <div key={`${c}-${i}`}><b>Viewer</b> {c}</div>)}
    </div>

    <div className="solo-comment-bar">
      <MessageCircle />
      <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(); }} placeholder="Comment..." />
      <button onClick={submitComment} aria-label="Send"><Send /></button>
    </div>

    <div className="solo-bottom-actions">
      <button className="solo-invite" onClick={() => setInviteOpen(v => !v)}><UserPlus /><b>Invite</b></button>
      <button className={micOn ? 'solo-round' : 'solo-round danger'} onClick={() => void toggleMic()}><span>{micOn ? <Mic /> : <MicOff />}</span></button>
      {room.isHost && <button className={cameraOn ? 'solo-round' : 'solo-round danger'} onClick={() => void toggleCamera()}>{cameraOn ? <Camera /> : <CameraOff />}</button>}
      {!room.isHost && <button className="solo-round" onClick={() => setLiked(v => { const n = !v; setLikes(x => Math.max(0, x + (n ? 1 : -1))); return n; })}><Heart fill={liked ? 'currentColor' : 'none'} /></button>}
      <button className="solo-round" onClick={() => setInviteOpen(v => !v)}><Sparkles /></button>
      <button className="solo-round danger" onClick={onClose} aria-label="Leave"><PhoneOff /></button>
    </div>

    {inviteOpen && <div className="solo-invite-pop"><b><UsersRound /> Invite hosts</b><span>Available hosts will appear here.</span><button onClick={() => setInviteOpen(false)}>Close</button></div>}
    {error && <div className="solo-error">{error}</div>}
  </div>;
}
