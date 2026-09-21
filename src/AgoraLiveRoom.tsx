import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser, type ICameraVideoTrack, type IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Share2, X } from 'lucide-react';
import { api } from './api';

type Room = { id: string; channel: string; hostId: string; title?: string; agora?: { token: string; appId: string; uid: number; channel: string }; isHost?: boolean };

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

  return <div className="solo-live" style={{ background: '#080812', position: 'fixed', inset: 0, zIndex: 1000 }}>
    <div ref={room.isHost ? localVideoRef : remoteVideoRef} style={{ position: 'absolute', inset: 0, background: '#080812' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.65),transparent 30%,rgba(0,0,0,.7))', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
      <div><b>{room.isHost ? 'You are LIVE' : room.title || 'Pardais Live'}</b><div style={{ fontSize: 12, opacity: .8 }}>◉ {viewerCount + (room.isHost ? 1 : 0)} · {connected ? 'Connected' : 'Connecting…'}</div></div>
      <button onClick={onClose} style={{ color: '#fff', background: 'rgba(0,0,0,.45)', border: 0, borderRadius: 22, padding: 9 }}><X /></button>
    </div>
    {!cameraOn && room.isHost && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', textAlign: 'center' }}><div><div style={{ fontSize: 42 }}>P</div><b>Camera is off</b><div style={{ opacity: .7, fontSize: 12 }}>Your audio is live</div></div></div>}
    {!room.isHost && !connected && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>Joining live…</div>}
    {error && <div style={{ position: 'absolute', left: 16, right: 16, bottom: 100, padding: 12, background: 'rgba(170,20,40,.9)', color: '#fff', borderRadius: 12 }}>{error}</div>}
    <div style={{ position: 'absolute', bottom: 18, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {room.isHost && <button onClick={() => void toggleMic()} style={{ color: '#fff', background: micOn ? 'rgba(255,255,255,.18)' : '#e53935', border: 0, borderRadius: 28, padding: 13 }}>{micOn ? <Mic /> : <MicOff />}</button>}
        {room.isHost && <button onClick={() => void toggleCamera()} style={{ color: '#fff', background: cameraOn ? 'rgba(255,255,255,.18)' : '#e53935', border: 0, borderRadius: 28, padding: 13 }}>{cameraOn ? <Camera /> : <CameraOff />}</button>}
        <button onClick={() => void share()} style={{ color: '#fff', background: 'rgba(255,255,255,.18)', border: 0, borderRadius: 28, padding: 13 }}><Share2 /></button>
      </div>
      <button onClick={onClose} style={{ color: '#fff', background: '#e53935', border: 0, borderRadius: 28, padding: 13 }}><PhoneOff /></button>
    </div>
  </div>;
}
