import { useEffect, useRef, useState } from 'react';
const API_BASE = 'https://api.pardaislite.soulverseapps.com';

const api = {
  get: async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`GET ${path} failed (${r.status})`);
    return { data: await r.json() };
  },
  post: async (path: string, body?: unknown) => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`POST ${path} failed (${r.status})`);
    return { data: await r.json() };
  },
  put: async (path: string, body?: unknown) => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`PUT ${path} failed (${r.status})`);
    return { data: await r.json() };
  },
  delete: async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`DELETE ${path} failed (${r.status})`);
    return { data: await r.json() };
  },
};
import {
  Bell, Ban, Bookmark, CalendarDays, Camera, ChevronLeft, ChevronRight, CircleHelp,
  Copy, Edit3, Gift, Globe2, Heart, Home, Image as ImageIcon, Languages, Link2,
  LockKeyhole, LogOut, MessageCircle, MessageSquare, Moon, MoreHorizontal, Palette,
  Mic, Paperclip, Phone, Plus, Search, Send, Settings, Share2, ShieldCheck, Sparkles, Trash2,
  TriangleAlert, UserPlus, UserRound, Users, Video, VideoOff, WalletCards, X, Zap
} from 'lucide-react';

type Tab = 'home' | 'live' | 'create' | 'inbox' | 'profile';
type SubPage = 'settings' | 'notifications' | 'editProfile' | 'followers' | 'creator' | 'agency' | 'coinSellerAgency' | 'hostAgency' | 'wallet' | 'blockedViewers' | null;
type FollowTab = 'Followers' | 'Following' | 'Friends';

const followers = [
  ['BAJWA SAB', '@haiderbajwa', '🦅'],
  ['Waqas Awan', '@Boss_1', '👤'],
  ['pardais recorder', '@pardaisrecorder', 'P'],
  ['Mr Arbab', '@NwabArbab', '🚘'],
  ['Alex Alex', '@Alex_Alex', '🦁'],
  ['Zafar Iqbal', '@ZafarIqbal', ''],
  ['Raja Kashif', '@Kashif302', ''],
  ['Naina Nawab', '@nainanawab27', '🌙'],
  ['Lalay Da Yar', '@Lalay_da_yar', '🧑'],
] as const;

const friendDirectory = [
  ['Dill Chor', '@DILLCHOR', 'D'], ['Fakhar Hayat', '@fakharhayat123', 'F'],
  ['Doctor Team', '@Yarr1122', '👨‍⚕️'], ['Sajid Hussain', '@iamsajid', 'S'],
  ['Dark Horse', '@DarkHorse44', '🐎'], ['Ayat Afzal', '@Ayatafzal', 'A'],
  ['Lolita gaylan', '@Lola1978', 'L'], ['Nova Bhatti', '@novabhatti', 'N'],
  ['NOOR HARAM', '@Nooreharam', '🌸'], ['Malik Shabir', '@malikshabir12', 'M'],
  ['Jannat 40', '@Jannat40', '🦋'], ['QURESHI Sahab', '@QURESHI', '🟠'],
  ['IshQ Live', '@IshQLive', '🐱'], ['Dua Fazal', '@DuaFazal', '🟠'],
  ['Alex Alex', '@Alex_Alex', '🐆'], ['Tooba Awan', '@ToobaAwan', '🌹'],
] as const;

function PardaisLiteLogo({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'pardais-logo compact' : 'pardais-logo'}>
    <svg viewBox='0 0 180 180' aria-hidden='true'>
      <defs><linearGradient id='plg' x1='15%' y1='90%' x2='90%' y2='10%'><stop offset='0' stopColor='#3677ff'/><stop offset='48%' stopColor='#8b4dff'/><stop offset='100%' stopColor='#ff43c8'/></linearGradient><filter id='plglow'><feGaussianBlur stdDeviation='6' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs>
      <path d='M43 142V35h58c29 0 47 16 47 40 0 25-18 41-47 41H67v26H43Zm24-48h32c15 0 24-7 24-19 0-12-9-19-24-19H67v38Z' fill='none' stroke='url(#plg)' strokeWidth='13' strokeLinejoin='round' filter='url(#plglow)'/>
      <path d='M104 88l49-27-18 31 17 6-25 4-16 18 6-18-19-7 18-2 8-20Z' fill='#fff' filter='url(#plglow)'/>
    </svg>
    {!compact && <div className='pardais-logo-wordmark'><b>PARDAIS</b><span>LITE</span></div>}
  </div>;
}

function PardaisSplash() {
  return <main className='pardais-splash' aria-label='Pardais Lite splash screen'><PardaisLiteLogo /><div className='splash-loading'><i/><i/><i/><i/><i/></div></main>;
}

function App() {
  const [splash, setSplash] = useState(() => {
    try { return localStorage.getItem('pardaisLiteSplashSeen') !== '1'; } catch { return true; }
  });
  const [tab, setTab] = useState<Tab>('home');
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [homeMode, setHomeMode] = useState<'Following' | 'For You'>('For You');
  const [liveMode, setLiveMode] = useState<'For You' | 'PK' | 'Following'>('For You');
  const [camera, setCamera] = useState<'normal' | 'effects'>('normal');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [room, setRoom] = useState(false);
  const [profileOverlay, setProfileOverlay] = useState<'share' | null>(null);
  const [fullPage, setFullPage] = useState<'findFriends' | 'level' | null>(null);
  const [followTab, setFollowTab] = useState<FollowTab>('Followers');
  const [profileTab, setProfileTab] = useState<'Public' | 'Private' | 'Saved'>('Public');
  const [liveView, setLiveView] = useState<'discover' | 'solo' | 'inviteGuest' | 'guestRoom' | 'pkInvite' | 'pkWaiting' | 'pkIncoming' | 'pkPreMatch' | 'pkRoom'>('discover');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'success'>(() => {
    try { return localStorage.getItem('pardaisLiteAuth') === '1' ? 'login' : 'login'; } catch { return 'login'; }
  });
  const [authenticated, setAuthenticated] = useState(() => {
    try { return localStorage.getItem('pardaisLiteAuth') === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (!splash) return;
    const timer = window.setTimeout(() => {
      setSplash(false);
      try { localStorage.setItem('pardaisLiteSplashSeen', '1'); } catch {}
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [splash]);

  useEffect(() => {
    const onButtonClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;
      const label = (button.getAttribute('aria-label') || button.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
      if (!label) return;
      const screen = tab + (subPage ? ':' + subPage : '');
      let userId = '';
      try { userId = localStorage.getItem('pardaisLiteUserId') || ''; } catch {}
      void api.post('/api/actions', { action: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), label, screen, userId, metadata: { href: window.location.href } }).catch(() => {});
    };
    document.addEventListener('click', onButtonClick, true);
    return () => document.removeEventListener('click', onButtonClick, true);
  }, [tab, subPage]);

  const nav = (next: Tab) => {
    setTab(next);
    setSubPage(null);
    setRoom(false);
    setProfileOverlay(null);
    setFullPage(null);
    if (next !== 'live') setLiveView('discover');
  };
  const back = () => {
    if (subPage) setSubPage(null);
    else if (room) setRoom(false);
    else nav('profile');
  };

  if (splash) return <PardaisSplash />;
  if (!authenticated) return <AuthScreen mode={authMode} setMode={setAuthMode} onAuthenticated={() => { setAuthenticated(true); try { const email = localStorage.getItem('pardaisLiteEmail') || 'demo'; const userId = localStorage.getItem('pardaisLiteUserId') || `demo-${btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`; localStorage.setItem('pardaisLiteUserId', userId); localStorage.setItem('pardaisLiteAuth', '1'); } catch {} }} />;
  if (fullPage === 'findFriends') return <FindFriendsPage onClose={() => setFullPage(null)} />;
  if (fullPage === 'level') return <LevelSystemPage onBack={() => setFullPage(null)} />;
  if (subPage === 'settings') return <SettingsPage onBack={back} onNotifications={() => setSubPage('notifications')} onEditProfile={() => setSubPage('editProfile')} onLevel={() => setFullPage('level')} onWallet={() => setSubPage('wallet')} onBlocked={() => setSubPage('blockedViewers')} />;
  if (subPage === 'notifications') return <NotificationsPage onBack={back} />;
  if (subPage === 'editProfile') return <EditProfilePage onBack={back} />;
  if (subPage === 'followers') return <FollowersPage active={followTab} setActive={setFollowTab} onBack={back} />;
  if (subPage === 'creator') return <CreatorCenterPage onBack={back} />;
  if (subPage === 'agency') return <AgencyCenterPage onBack={back} onCoinSeller={() => setSubPage('coinSellerAgency')} onHostAgency={() => setSubPage('hostAgency')} />;
  if (subPage === 'coinSellerAgency') return <CoinSellerAgencyPage onBack={() => setSubPage('agency')} />;
  if (subPage === 'hostAgency') return <HostAgencyPage onBack={() => setSubPage('agency')} />;
  if (subPage === 'wallet') return <WalletPage onBack={back} />;
  if (subPage === 'blockedViewers') return <BlockedViewersPage onBack={back} />;

  return <div className="app-shell"><div className="phone">
    {tab === 'home' && <HomeScreen homeMode={homeMode} setHomeMode={setHomeMode} liked={liked} setLiked={setLiked} saved={saved} setSaved={setSaved} followed={followed} setFollowed={setFollowed} onSearch={() => setFullPage('findFriends')} />}
    {tab === 'live' && <LiveScreen room={room} setRoom={setRoom} liveMode={liveMode} setLiveMode={setLiveMode} nav={nav} liveView={liveView} setLiveView={setLiveView} />}
    {tab === 'create' && <CreateScreen camera={camera} setCamera={setCamera} onClose={() => nav('home')} onGoLive={async () => { let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {} await api.post('/api/live/create', { hostId: userId, title: 'Pardais Live', mode: 'audio' }); setLiveView('solo'); setTab('live'); }} />}
    {tab === 'inbox' && <InboxScreen />}
    {tab === 'profile' && <ProfileScreen onSettings={() => setSubPage('settings')} onEdit={() => setSubPage('editProfile')} onFollowers={() => setSubPage('followers')} onShare={() => setProfileOverlay('share')} onLevel={() => setFullPage('level')} profileTab={profileTab} setProfileTab={setProfileTab} onCreator={() => setSubPage('creator')} onAgency={() => setSubPage('agency')} onWallet={() => setSubPage('wallet')} />}
    {tab !== 'create' && <BottomNav tab={tab} nav={nav} />}
    {profileOverlay === 'share' && <ShareSheet onClose={() => setProfileOverlay(null)} title="Share Profile" url={`${window.location.origin}/profile/khokhar_1`} text="Check out ☠ Saif Khokhar ☠ on Pardais Lite" />}
  </div></div>;
}

function AuthScreen({ mode, setMode, onAuthenticated }: { mode: 'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'success'; setMode: (mode: 'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'success') => void; onAuthenticated: () => void }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('pardaisLiteEmail') || ''; } catch { return ''; } });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const resetState = () => { setError(''); setCode(''); setPassword(''); setConfirmPassword(''); };
  const createAccount = () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) { setError('Please enter the required details.'); return; }
    localStorage.setItem('pardaisLiteName', name.trim()); localStorage.setItem('pardaisLiteEmail', email.trim()); localStorage.setItem('pardaisLitePassword', password); onAuthenticated();
  };
  const login = () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please enter email and password.'); return; }
    localStorage.setItem('pardaisLiteEmail', email.trim());
    localStorage.setItem('pardaisLitePassword', password);
    onAuthenticated();
  };
  const requestReset = () => { setError(''); if (!email.trim()) { setError('Please enter an email.'); return; } setMode('verify'); };
  const recoverDeletedAccount = async () => { const value = window.prompt('Enter the email used for your Pardais account'); if (!value?.trim()) return; try { const r = await api.post('/api/account/recover', { email: value.trim() }); try { localStorage.setItem('pardaisLiteEmail', value.trim()); if (r.data?.userId) localStorage.setItem('pardaisLiteUserId', String(r.data.userId)); } catch {} setError('Account recovered successfully. You can log in again.'); } catch { setError('No recoverable account was found for this email, or the 30-day recovery period has expired.'); } };
  const verifyCode = () => { setError(''); if (code.trim().length !== 6) { setError('Enter any 6-digit code.'); return; } setMode('reset'); };
  const resetPassword = () => { setError(''); if (!password.trim() || password !== confirmPassword) { setError('Enter and confirm your new password.'); return; } localStorage.setItem('pardaisLitePassword', password); setMode('success'); };
  const title = mode === 'login' || mode === 'reset' || mode === 'success' ? 'PARDAIS' : 'PARDAIS';
  if (mode === 'success') return <main className='auth-screen'><div className='auth-success'><div className='auth-success-icon'>✓</div><h1>Password Reset!</h1><p>Your password has been changed successfully.</p><button onClick={() => { resetState(); setMode('login'); }}>Go to Login</button></div></main>;
  if (mode === 'verify') return <main className='auth-screen'><AuthHeader title='PARDAIS' subtitle='VERIFY CODE' onBack={() => { resetState(); setMode('forgot'); }} /><div className='auth-card auth-card-compact'><p>We have sent a 6-digit code to <b>{email || 'your email'}</b></p><div className='otp-row'>{[0,1,2,3,4,5].map(i => <input key={i} maxLength={1} inputMode='numeric' value={code[i] || ''} onChange={e => { const value = e.target.value.replace(/\\D/g,''); const next = code.split(''); next[i] = value; setCode(next.join('').slice(0,6)); }} />)}</div><div className='auth-helper'>Didn't receive the code? <button onClick={() => setError('A new demo code is 123456.')}>Resend Code</button></div><AuthError message={error}/><button className='auth-primary' onClick={verifyCode}>Verify</button></div></main>;
  if (mode === 'reset') return <main className='auth-screen'><AuthHeader title={title} subtitle='NEW PASSWORD' onBack={() => setMode('verify')} /><div className='auth-card'><p>Set a new password for your account.</p><AuthField label='NEW PASSWORD' value={password} type={showPassword ? 'text' : 'password'} placeholder='Enter new password' icon={<LockKeyhole />} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} /><AuthField label='CONFIRM PASSWORD' value={confirmPassword} type='password' placeholder='Confirm new password' icon={<LockKeyhole />} onChange={setConfirmPassword} /><div className='auth-rules'><span>✓ At least 8 characters</span><span>✓ Include a number</span><span>✓ Include a letter</span><span>✓ Include a special character</span></div><AuthError message={error}/><button className='auth-primary' onClick={resetPassword}>Reset Password</button></div></main>;
  if (mode === 'forgot') return <main className='auth-screen'><AuthHeader title='PARDAIS' subtitle='RESET PASSWORD' onBack={() => { resetState(); setMode('login'); }} /><div className='auth-card auth-card-compact'><p>Enter your email to receive a password reset code.</p><AuthField label='EMAIL' value={email} type='email' placeholder='example@gmail.com' icon={<MessageSquare />} onChange={setEmail} /><AuthError message={error}/><button className='auth-primary' onClick={requestReset}>Send Reset Code</button><div className='auth-footer'>Remember your password? <button onClick={() => { resetState(); setMode('login'); }}>Login</button></div></div></main>;
  if (mode === 'signup') return <main className='auth-screen'><AuthHeader title='PARDAIS' subtitle='SIGN UP' onBack={() => { resetState(); setMode('login'); }} /><div className='auth-card'><p>Create your Pardais Lite account.</p><AuthField label='FULL NAME' value={name} type='text' placeholder='Your full name' icon={<UserRound />} onChange={setName} /><AuthField label='EMAIL' value={email} type='email' placeholder='example@gmail.com' icon={<MessageSquare />} onChange={setEmail} /><AuthField label='PASSWORD' value={password} type={showPassword ? 'text' : 'password'} placeholder='Create a password' icon={<LockKeyhole />} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} /><AuthField label='CONFIRM PASSWORD' value={confirmPassword} type='password' placeholder='Confirm your password' icon={<LockKeyhole />} onChange={setConfirmPassword} /><label className='auth-check'><input type='checkbox' checked={remember} onChange={e => setRemember(e.target.checked)} /><span>I agree to the Terms & Privacy Policy</span></label><AuthError message={error}/><button className='auth-primary' onClick={createAccount}>Create Account</button><div className='auth-footer'>Already have an account? <button onClick={() => { resetState(); setMode('login'); }}>Login</button></div></div></main>;
  return <main className='auth-screen'><div className='auth-brand'><PardaisLiteLogo compact={false}/><h1>PARDAIS</h1><span>WELCOME BACK</span></div><div className='auth-card'><AuthField label='EMAIL' value={email} type='email' placeholder='example@gmail.com' icon={<MessageSquare />} onChange={setEmail} /><AuthField label='PASSWORD' value={password} type={showPassword ? 'text' : 'password'} placeholder='********' icon={<LockKeyhole />} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} /><div className='auth-row'><label className='auth-check'><input type='checkbox' checked={remember} onChange={e => setRemember(e.target.checked)} /><span>Remember Me</span></label><button className='auth-link' onClick={() => { resetState(); setMode('forgot'); }}>Forgot Password?</button></div><AuthError message={error}/><button className='auth-primary' onClick={login}>Login</button><button className='auth-link' style={{ width: '100%', marginTop: 10 }} onClick={() => void recoverDeletedAccount()}>Recover Deleted Account (30 days)</button><div className='auth-footer'>Don't have an account? <button onClick={() => { resetState(); setMode('signup'); }}>Sign Up</button></div></div></main>;
}

function AuthHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) { return <div className='auth-header'><button onClick={onBack}><ChevronLeft /></button><div><h1>{title}</h1><span>{subtitle}</span></div></div>; }
function AuthField({ label, value, type, placeholder, icon, onChange, show, onToggle }: any) { return <label className='auth-field'><span>{label}</span><div><span className='auth-field-icon'>{icon}</span><input value={value} type={type} placeholder={placeholder} onChange={e => onChange(e.target.value)} /><span>{onToggle ? <button type='button' className='auth-eye' onClick={onToggle}>{show ? '◉' : '◌'}</button> : null}</span></div></label>; }
function AuthError({ message }: { message: string }) { return message ? <div className='auth-error'>{message}</div> : null; }

function HomeScreen({ homeMode, setHomeMode, liked, setLiked, saved, setSaved, followed, setFollowed, onSearch }: any) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ userId: string; text: string }>>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const reels = [
    {name:'Murshad 804',handle:'@Murshad804',avatar:'M',title:'Fresh BBQ tonight 🔥',tags:'#fyp #trending #pardais #viral #live'},
    {name:'Jannat 40',handle:'@Jannat40',avatar:'🦋',title:'Live vibes ✨',tags:'#pardais #live #friends'},
    {name:'Dark Horse',handle:'@DarkHorse44',avatar:'🐎',title:'Tonight stream 🖤',tags:'#fyp #viral #pardais'}
  ];
  const visibleReels = homeMode === 'Following' ? reels.filter(item => followingUsers.includes(item.name)) : reels;
  const reel = visibleReels.length ? visibleReels[reelIndex % visibleReels.length] : null;
  const loadComments = async () => { if (!reel) return; try { const r = await api.get(`/api/comments/${encodeURIComponent(reel.handle)}`); setComments((r.data?.items ?? []).map((x: any) => ({ userId: String(x.userId ?? 'User'), text: String(x.text ?? '') }))); } catch {} };
  const sendComment = async () => { if (!reel) return; const text = commentText.trim(); if (!text) return; let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {} try { await api.post('/api/comments', { userId, targetId: reel.handle, text }); setComments(v => [...v, { userId: 'You', text }]); setCommentText(''); } catch {} };
  const toggleFollow = (name: string) => {
    const nextFollowing = !followingUsers.includes(name);
    setFollowingUsers(current => nextFollowing ? [...current, name] : current.filter(item => item !== name));
    setFollowed(nextFollowing);    let userId = '';
    try { userId = localStorage.getItem('pardaisLiteUserId') || ''; } catch {}
    void api.post('/api/follow', { followerId: userId || 'demo-user', followingId: reel?.handle || name, action: nextFollowing ? 'follow' : 'unfollow' }).catch(() => {});
  };
  return <main className="reel-screen home-feed-screen">
    <div className="reel-top home-feed-top">
      <button className={homeMode === 'Following' ? 'tab active' : 'tab muted'} onClick={() => { setHomeMode('Following'); setReelIndex(0); }}>Following</button>
      <button className={homeMode === 'For You' ? 'tab active' : 'tab muted'} onClick={() => { setHomeMode('For You'); setReelIndex(0); }}>For You</button>
      <button className="search-icon" onClick={onSearch} aria-label="Search"><Search /></button>
    </div>
    {!reel ? <div className="following-empty"><UserRound /><b>Following</b><span>Follow creators and their videos will appear here.</span></div> : <div className="reel-stage home-reel-stage" onDoubleClick={() => setLiked(true)}>
      <div className={`home-reel-scene scene-${reelIndex % 3}`}>
        <div className="home-reel-top-glow" />
        <div className="bbq-grill"><div className="grill-bars" />{Array.from({length:12},(_,i)=><span key={i} className="bbq-piece" style={{transform:`rotate(${(i%4)*7-10}deg) translate(${(i%3)*8}px,${(i%4)*3}px)`}}>🍢</span>)}</div>
        <div className="reel-live-watermark">LIVE</div>
      </div>
      <div className="reel-author-avatar home-dp">{reel.avatar}</div>
      <div className="reel-actions home-feed-actions">
        <button onClick={() => setLiked(!liked)}><Heart fill={liked ? '#fff' : 'none'} /><b>{liked ? 8 : 8}</b></button>
        <button onClick={() => { setCommentOpen(true); void loadComments(); }}><MessageCircle /><b>{comments.length}</b></button>
        <button onClick={() => setSaved(!saved)}><Bookmark fill={saved ? '#fff' : 'none'} /><b>{saved ? 'Saved' : 'Save'}</b></button>
        <button><Gift /><b>Gift</b></button>
        <button onClick={() => setShareOpen(true)}><Share2 /><b>Share</b></button>
      </div>
      <div className="reel-caption home-reel-caption">
        <div className="creator-line"><strong>✧•{reel.name}•✧</strong><button onClick={() => toggleFollow(reel.name)}>{followingUsers.includes(reel.name) ? 'Following' : 'Follow'}</button></div>
        <div className="reel-handle">{reel.handle}</div>
        <div>{reel.title}</div>
        <strong>{reel.tags}</strong>
      </div>
      <button className="reel-next-tap" aria-label="Next reel" onClick={() => setReelIndex(v => v + 1)} />
    </div>}
    {commentOpen && <div className="home-comments-sheet" onClick={e => {if(e.target === e.currentTarget) setCommentOpen(false)}}><div className="home-comments-card"><div className="sheet-handle" /><div className="home-comments-title">Comments <button onClick={() => setCommentOpen(false)}><X /></button></div>{comments.length ? comments.map((x, i) => <div className="home-comment-row" key={`${x.userId}-${i}`}><b>{x.userId}</b><span>{x.text}</span></div>) : <div className="home-comment-row"><b>No comments yet</b><span>Be the first to comment.</span></div>}<div className="home-comment-input"><input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." /><button onClick={() => void sendComment()}><Send /></button></div></div></div>}
    {shareOpen && <ShareSheet onClose={() => setShareOpen(false)} />}
  </main>;
}
function LiveScreen({ room, setRoom, liveMode, setLiveMode, nav, liveView, setLiveView }: any) {
  const hosts = [['THE THUNDER','@thethunder','⚡','SOLO','38','3m'],['Ai Mout','@mrunknown','🧔','PK','10','4m'],['Malang Sb','@shahshab','😎','SOLO','16','22m'],['Zara Zara','@Zarasikan','👩','PK','16','56m'],['Jannat 40','@Jannat40','🦋','GUEST','40','1m'],['RANA Rehanali','@RanaRehanali','🧑','SOLO','29','6m']];
  if (room) return <ViewerSoloLive onClose={() => setRoom(false)} />;
  if (liveView === 'solo') return <SoloHostLive onClose={() => setLiveView('discover')} onGuestInvite={() => setLiveView('guestRoom')} onPk={() => setLiveView('pkInvite')} />;
  if (liveView === 'inviteGuest') return <InviteGuestPage onBack={() => setLiveView('solo')} onInvited={() => setLiveView('guestRoom')} />;
  if (liveView === 'guestRoom') return <GuestSeatRoom onClose={() => setLiveView('solo')} />;
  if (liveView === 'pkInvite') return <PkInvitePage onBack={() => setLiveView('solo')} onSent={() => setLiveView('pkWaiting')} />;
  if (liveView === 'pkWaiting') return <PkWaitingPage onCancel={() => setLiveView('solo')} onAccept={() => setLiveView('pkPreMatch')} onIncoming={() => setLiveView('pkIncoming')} />;
  if (liveView === 'pkIncoming') return <PkIncomingPage onReject={() => setLiveView('solo')} onAccept={() => setLiveView('pkPreMatch')} />;
  if (liveView === 'pkPreMatch') return <PkPreMatchPage onCancel={() => setLiveView('solo')} onStart={() => setLiveView('pkRoom')} />;
  if (liveView === 'pkRoom') return <PkRoomPage onClose={() => setLiveView('discover')} />;
  return <main className="live-page">
    <div className="live-header"><h1>Discover</h1><div className="header-actions"><button className="go-live" onClick={() => nav('create')}><Zap /> Go Live</button><button className="round-search"><Search /></button></div></div>
    <div className="live-tabs">{(['For You','PK','Following'] as const).map(x => <button key={x} className={liveMode === x ? 'live-tab selected' : 'live-tab'} onClick={() => setLiveMode(x)}>{x === 'PK' ? '⚔ PK' : x}</button>)}</div>
    {liveMode === 'PK' ? <div className="pk-discover-card" onClick={() => setRoom(true)}><div className="pk-live-pill">● LIVE</div><div className="pk-timer">PK 01:04</div><div className="pk-discover-side left"><div className="pk-discover-avatar">🧔</div><b>Ai Mout</b><span>🪙 10</span></div><div className="pk-discover-mark">PK</div><div className="pk-discover-side right"><div className="pk-discover-avatar">👩</div><b>Zara Zara</b><span>🪙 16</span></div><div className="pk-discover-foot">🔥 Battle in progress — tap to watch</div></div> :
      <div className="live-grid">{hosts.filter(h => liveMode === 'Following' ? ['Jannat 40','Malang Sb'].includes(h[0]) : true).map(h => <button className="live-card" key={h[0]} onClick={() => setRoom(true)}><div className="card-top"><span className="mode-logo">{h[3]}</span><small>{h[5]}</small></div><div className="host-ring"><span>{h[2]}</span></div><div className="card-name">{h[0]}</div><div className="card-bottom"><span>{h[1]}</span><b>{h[4]}</b></div></button>)}</div>}
  </main>;
}

function CreateScreen({ camera, setCamera, onClose, onGoLive }: any) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(true);
  return <main className="go-live-screen"><div className="go-live-preview">
    <button className="camera-close go-live-close" onClick={onClose}><X /></button>
    <div className="ready-pill"><i /> Ready</div>
    <div className="camera-off-preview"><Video /><span>Camera is off</span></div>
    <div className="go-live-controls">
      <button><Camera /><span>Flip</span></button>
      <button onClick={() => setCamera(camera === 'normal' ? 'effects' : 'normal')}><Sparkles /><span>Beauty</span></button>
      <button className={muted ? 'control-active' : ''} onClick={() => setMuted(!muted)}><Phone /><span>{muted ? 'Unmute' : 'Mute'}</span></button>
      <button className={camOff ? 'cam-off-active' : ''} onClick={() => setCamOff(!camOff)}><Video /><span>{camOff ? 'Cam Off' : 'Cam On'}</span></button>
    </div>
    <button className="go-live-main" onClick={onGoLive}>• Go Live</button>
  </div></main>;
}

function InboxScreen() {
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(false);
  const chats = [['Jannat 40 🦋','Hiiii','6h','🦋'],['QURESHI Sahab','🟠 QURESHI Sahab is in a lvsl ! ...','16h','🧑'],['IshQ Live','Thank u','1d','🐱'],['Dua Fazal','🟠 Dua Fazal is in a lvsl ! ...','1d','👩'],['Alex Alex','Koi or nmbr send KR dn official wal...','May 12','🐆'],['Tooba Awan','G thank you','May 9','🌹'],['Shaikh Zara','You: Ok','Apr 27','🟥']];
  if (chatOpen) return <ChatDetailPage name={chatOpen} onBack={() => setChatOpen(null)} />;
  const visible = chats.filter(x => !query.trim() || x[0].toLowerCase().includes(query.toLowerCase()));
  let pressTimer: number | undefined;
  const start = () => { pressTimer = window.setTimeout(() => { if (confirm('Delete this complete chat?')) setChatOpen(null); }, 750); };
  const end = () => { if (pressTimer) window.clearTimeout(pressTimer); };
  return <main className="page dark-page chats-page"><h1>Chats</h1><div className="chat-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." /></div><div className="chat-tabs"><button className={!unread ? 'selected' : ''} onClick={() => setUnread(false)}>All</button><button className={unread ? 'selected' : ''} onClick={() => setUnread(true)}>Unread</button></div><div className="chat-list">{visible.map(([name, preview, time, avatar]) => <button className="chat-row" key={name} onClick={() => setChatOpen(name)} onPointerDown={start} onPointerUp={end} onPointerLeave={end} onContextMenu={e => {e.preventDefault(); if (confirm('Delete this complete chat?')) setChatOpen(null);}}><span className="chat-avatar">{avatar}</span><span className="chat-copy"><b>{name}</b><small>{preview}</small></span><time>{time}</time></button>)}</div></main>;
}

function ProfileScreen({ onSettings, onEdit, onFollowers, onShare, onLevel, profileTab, setProfileTab, onCreator, onAgency, onWallet }: any) {
  return <main className="page profile-page"><div className="profile-header"><h1>Profile</h1><div><button onClick={onEdit}><Edit3 /></button><button onClick={onShare}><Share2 /></button><button><Bell /></button><button onClick={onSettings}><Settings /></button></div></div>
    <div className="profile-identity"><div className="profile-avatar">🪽</div><div className="verified">✓</div><h2>☠ Saif Khokhar ☠</h2><div className="handle">@khokhar_1 <Copy size={15} /></div><p>No bio yet</p><button className="profile-level-chip" onClick={onLevel}><span>Lv</span><b>29</b><small>Golden Cobra</small><ChevronRight /></button></div>
    <div className="stats"><button onClick={onFollowers}><b>1</b><span>FOLLOWING</span></button><button onClick={onFollowers}><b>69</b><span>FOLLOWERS</span></button><div><b>12</b><span>LIKES</span></div></div>
    <div className="profile-cards"><button onClick={onCreator}><span className="card-icon"><Zap /></span><div><b>Creator Center</b><small>Withdraw · Earnings · Analytics</small></div><ChevronRight /></button><button onClick={onAgency}><span className="card-icon"><Users /></span><div><b>Agency Center</b><small>Join Agency & Grow Faster</small></div><ChevronRight /></button><button onClick={onWallet}><span className="card-icon"><WalletCards /></span><div><b>My Wallet</b><small>Top up coins & manage earnings</small></div><ChevronRight /></button></div>
    <div className="profile-tabs"><button className={profileTab === 'Public' ? 'selected' : ''} onClick={() => setProfileTab('Public')}><Globe2 /> Public</button><button className={profileTab === 'Private' ? 'selected' : ''} onClick={() => setProfileTab('Private')}>♧ Private</button><button className={profileTab === 'Saved' ? 'selected' : ''} onClick={() => setProfileTab('Saved')}><Bookmark /> Saved</button></div><ProfileVideoArea mode={profileTab} /></main>;
}

function ProfileVideoArea({ mode }: { mode: 'Public' | 'Private' | 'Saved' }) {
  const publicVideos = [
    ['My uploaded video', 'Visible to everyone on your profile', '▶'],
    ['Pardais Live moments', 'Public reel · 1.2K views', '▶']
  ];
  const privateVideos = [
    ['Private draft', 'Only you can view this video', '🔒']
  ];
  const savedVideos = [
    ['Saved reel from another creator', 'Saved for you to watch later', '🔖'],
    ['Funny live clip', 'Saved from another user', '🔖']
  ];
  const videos = mode === 'Public' ? publicVideos : mode === 'Private' ? privateVideos : savedVideos;
  return <div className="profile-video-area">
    <div className="video-area-title">{mode === 'Public' ? 'Public Videos' : mode === 'Private' ? 'Private Videos' : 'Saved Reels'}</div>
    <div className="video-grid">{videos.map(([title, meta, icon]) => <button className="video-tile" key={title}><div className="video-thumb"><span>{icon}</span></div><b>{title}</b><small>{meta}</small></button>)}</div>
  </div>;
}


function FindFriendsPage({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<(typeof friendDirectory)[number] | null>(null);
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null);
  const results = friendDirectory.filter(([name, user]) => !query.trim() || `${name} ${user}`.toLowerCase().includes(query.toLowerCase()));
  const toggleDirectoryFollow = async (targetUsername: string) => {
    let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {}
    const targetId = `user-${targetUsername.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-')}`;
    const next = !following[targetUsername];
    setLoadingFollow(targetUsername);
    try { await api.post('/api/follow', { followerId: userId, followingId: targetId, action: next ? 'follow' : 'unfollow' }); setFollowing(v => ({ ...v, [targetUsername]: next })); } catch {}
    setLoadingFollow(null);
  };
  if (selected) return <UserProfilePage user={selected} following={!!following[selected[1]]} onFollow={() => void toggleDirectoryFollow(selected[1])} onBack={() => setSelected(null)} />;
  return <main className="full-dark-page find-friends-page">
    <header className="simple-page-head"><button onClick={onClose}><ChevronLeft /></button><h1>Find Friends</h1><button className="head-search"><Search /></button></header>
    <div className="friend-search"><Search /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search username..." /></div>
      <div className="friend-list">{results.map(user => <div className="friend-row" key={user[1]} onClick={() => setSelected(user)}>
      <span className="friend-avatar">{user[2]}</span><div className="friend-info"><b>{user[0]}</b><small>{user[1]}</small></div>
      <button disabled={loadingFollow === user[1]} className={following[user[1]] ? 'following-btn' : 'follow-btn'} onClick={e => {e.stopPropagation(); void toggleDirectoryFollow(user[1]);}}>{loadingFollow === user[1] ? '...' : following[user[1]] ? 'Following' : 'Follow'}</button>
    </div>)}</div>
  </main>;
}

function UserProfilePage({ user, following, onFollow, onBack }: any) {
  const [privateAccount, setPrivateAccount] = useState(false);
  const targetId = `user-${String(user[1]).replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-')}`;
  useEffect(() => { void api.get(`/api/settings/${encodeURIComponent(targetId)}`).then(r => setPrivateAccount(Boolean(r.data?.settings?.privateAccount))).catch(() => {}); }, [targetId]);
  return <main className="full-dark-page user-profile-page">
    <header className="simple-page-head"><button onClick={onBack}><ChevronLeft /></button><h1>ID Profile</h1><button><MoreHorizontal /></button></header>
    <section className="user-hero"><div className="user-big-avatar">{user[2]}</div><h2>{user[0]}</h2><p>{user[1]}</p>{privateAccount ? <div className="private-profile-note">🔒 Private Account</div> : <div className="user-actions"><button className={following ? 'following-btn' : 'follow-btn'} onClick={onFollow}>{following ? 'Following' : 'Follow'}</button><button><MessageCircle /> Message</button></div>}</section>
    {!privateAccount && <div className="user-stats"><span><b>29</b>Level</span><span><b>486K</b>Coins Spent</span><span><b>69</b>Followers</span></div>}
    <button className="user-level-card"><div><b>Level 29</b><small>Golden Cobra</small></div><ChevronRight /></button>
    {!privateAccount && <><h3 className="section-title">Videos</h3><div className="user-video-grid"><button>▶<small>Public reel</small></button><button>▶<small>Live moment</small></button><button>▶<small>Saved clip</small></button></div></>}
  </main>;
}

function LevelSystemPage({ onBack }: { onBack: () => void }) {
  const levels = Array.from({length: 51}, (_, i) => i);
  return <main className="full-dark-page level-page">
    <header className="simple-page-head level-head"><button onClick={onBack}><ChevronLeft /></button><h1>Level System</h1><span /></header>
    <section className="current-level-card"><div className="level-card-title">Level <b>29</b><span>Total Spent<br/><strong>🪙 485,892</strong></span></div><div className="level-progress"><i style={{width:'3%'}} /></div><div className="level-range"><span>480,000</span><span>649,999</span></div><div className="level-bottom"><div className="cobra-badge">🐍<strong>29</strong></div><div className="next-level-box">🪙 <span>To reach next Level<br/><b>164,107</b> more coins</span></div></div></section>
    <div className="journey-head"><h2>Level Journey</h2><span>Scroll to view</span></div>
    <div className="level-journey">{levels.map(n => <button key={n} className={n === 29 ? 'level-badge current' : n < 29 ? 'level-badge unlocked' : 'level-badge'}><span>{n}</span><small>LV.{n}</small></button>)}</div>
    <section className="feature-section"><div className="feature-head"><h2>Level 29 <b>Features</b></h2><span>✓ Unlocked</span></div><div className="feature-grid"><article><span>☆</span><b>16 seats with Guest</b><small>16 seats allocation with guest access</small></article><article><span>☆</span><b>Live Open</b><small>Live streaming open feature</small></article><article><span>☆</span><b>VIP Access</b><small>Unlock additional profile privileges</small></article><article><span>☆</span><b>PK Access</b><small>Join advanced PK matches</small></article></div></section>
  </main>;
}

function ChatDetailPage({ name, onBack }: { name: string; onBack: () => void }) {
  const [messages, setMessages] = useState([{text:'Hiiii', time:'10:57 AM', mine:false}]);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const send = () => { if (!text.trim()) return; const messageText = text.trim(); let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {} void api.post('/api/messages', { senderId: userId, receiverId: name, type: 'text', text: messageText }); setMessages(v => [...v, {text:messageText, time:'Now', mine:true}]); setText(''); };
  const sendPhoto = () => { let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {} void api.post('/api/messages', { senderId: userId, receiverId: name, type: 'photo', text: 'Photo attachment' }); setMessages(v => [...v, {text:'📷 Photo attachment sent', time:'Now', mine:true}]); };
  const toggleVoice = () => { if (recording) { let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {} void api.post('/api/messages', { senderId: userId, receiverId: name, type: 'voice', text: 'Voice message · 0:08' }); setMessages(v => [...v, {text:'🎙 Voice message · 0:08', time:'Now', mine:true}]); setRecording(false); } else setRecording(true); };
  const clearChat = () => { if (confirm('Delete this complete chat?')) { let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {} void api.delete(`/api/messages/${userId}/${encodeURIComponent(name)}`).catch(() => {}); setMessages([]); } };
  return <main className="chat-detail-page">
    <header className="chat-detail-head"><button onClick={onBack}><ChevronLeft /></button><span className="chat-avatar">🦋</span><div><b>{name}</b><small>May 15</small></div><button onClick={clearChat}><Trash2 /></button></header>
    <div className="chat-message-area">{messages.length === 0 ? <div className="empty-chat">Chat deleted</div> : <>{messages.map((m,i) => <div key={i} className={m.mine ? 'message-bubble mine' : 'message-bubble'}><span>{m.text}</span><small>{m.time}</small></div>)}</>}</div>
    {menu && <div className="attachment-menu"><button onClick={() => {setMenu(false); fileRef.current?.click()}}><ImageIcon /> Photo / Camera</button><button onClick={() => {setMenu(false); setText(v => v + ' https://pardais.app/')}}><Link2 /> Link</button><button onClick={() => {setMenu(false); setText(v => v + ' 📎 Attachment')}}><PaperclipIcon /> Attachment</button></div>}
    <input ref={fileRef} className="hidden-file" type="file" accept="image/*" capture="environment" onChange={sendPhoto} />
    <div className="chat-compose"><button onClick={() => setMenu(v => !v)}><PaperclipIcon /></button><input value={text} onChange={e => setText(e.target.value)} placeholder={recording ? 'Recording voice… tap mic to send' : 'Message...'} /><button className={recording ? 'recording' : ''} onClick={toggleVoice}><MicIcon /></button><button onClick={send}><Send /></button></div>
  </main>;
}

const PaperclipIcon = Paperclip;
const MicIcon = Mic;

function CreatorCenterPage({ onBack }: any) {
  const [earnings, setEarnings] = useState(0);
  const [message, setMessage] = useState('');
  const [historyTab, setHistoryTab] = useState<'All' | 'Received' | 'Exchange'>('All');
  const [transactions, setTransactions] = useState<any[]>([]);
  const userId = (() => { try { return localStorage.getItem('pardaisLiteUserId') || 'demo-user'; } catch { return 'demo-user'; } })();
  const refresh = async () => { const r = await api.get(`/api/creator/${userId}`); setEarnings(Number(r.data?.earnings ?? 0)); setTransactions(r.data?.transactions ?? []); };
  useEffect(() => { void refresh().catch(() => setMessage('Unable to load creator earnings.')); }, []);
  const exchange = async () => { const raw = window.prompt('Enter coins to exchange into your wallet'); const coins = Number(raw); if (!Number.isInteger(coins) || coins <= 0) return setMessage('Enter a valid whole coin amount.'); try { const r = await api.post('/api/creator/exchange', { userId, coins }); setMessage(`${r.data.coins} coins exchanged to Wallet.`); await refresh(); } catch { setMessage('Exchange failed. Check your available creator earnings.'); } };
  const withdraw = async () => { const raw = window.prompt('Enter coins to withdraw to your bank/wallet'); const amount = Number(raw); if (!Number.isFinite(amount) || amount <= 0) return setMessage('Enter a valid withdrawal amount.'); try { await api.post('/api/withdrawals', { userId, amount, method: 'bank', status: 'pending' }); setMessage('Withdrawal request submitted for bank payment.'); await refresh(); } catch { setMessage('Withdrawal request failed.'); } };
  const addAccount = async () => { const account = window.prompt('Enter bank account / wallet number'); if (!account?.trim()) return; try { await api.post('/api/creator/withdraw-account', { userId, method: 'bank', account: account.trim() }); setMessage('Withdraw account saved.'); } catch { setMessage('Could not save withdraw account.'); } };
  const visible = historyTab === 'All' ? transactions : transactions.filter(x => historyTab === 'Received' ? x.receiverId === userId : x.userId === userId && x.coins);
  return <SubLayout title="Creator Center" onBack={onBack}>
    <div className="creator-earnings"><div><span>CURRENT EARNINGS</span><strong>🪙 {earnings.toLocaleString()}</strong></div><button onClick={() => void refresh()}><span>↻</span></button><div className="creator-actions"><button onClick={() => void withdraw()}>Withdraw</button><button onClick={() => void exchange()}>Exchange</button></div></div>
    {message && <div className="transfer-success"><div>✓</div><p>{message}</p></div>}
    <button className="withdraw-account" onClick={() => void addAccount()}><span className="plus-box">＋</span><div><b>Add Withdraw Account</b><small>Add bank or wallet to receive payments</small></div><ChevronRight /></button>
    <div className="analytics-head"><h2>Analytics</h2><button onClick={() => setMessage('Analytics filter set to Last 30 Days.')}>Last 30 Days⌄</button></div>
    <div className="analytics-grid"><Metric icon="◉" value="36" label="Total Viewers" change="+12%" /><Metric icon="♧" value="72" label="Total Followers" change="+8%" /><Metric icon="◷" value="0.5h" label="Stream Hours" change="+5%" /><Metric icon="◇" value={earnings.toLocaleString()} label="Gifts Received" change="Live" /></div>
    <h2 className="transaction-title">Transaction History</h2>
    <div className="transaction-tabs">{(['All','Received','Exchange'] as const).map(x => <button key={x} className={historyTab === x ? 'active' : ''} onClick={() => setHistoryTab(x)}>{x}</button>)}</div>
    <div className="transaction-list">{visible.length ? visible.map((x, i) => <Transaction key={i} day={String(x.createdAt ?? '').slice(0, 10) || 'Today'} count={String(x.type ?? 'Transaction')} amount={String(x.coins ?? x.amount ?? 0)} />) : <div className="empty-history">No {historyTab.toLowerCase()} transactions yet.</div>}</div>
  </SubLayout>;
}

function Metric({ icon, value, label, change }: any) {
  return <div className="metric"><div className="metric-top"><span>{icon}</span><b>{change}</b></div><strong>{value}</strong><small>{label}</small></div>;
}
function Transaction({ day, count, amount }: any) {
  return <div className="transaction"><div><b>{day}</b><small>{count}</small></div><div><strong>{amount}</strong><small>Coins</small></div><ChevronRight /></div>;
}

function AgencyCenterPage({ onBack, onCoinSeller, onHostAgency }: any) {
  return <SubLayout title="Agency Center" onBack={onBack}>
    <div className="agency-center-intro"><div className="agency-icon">♛</div><h2>Agency Center</h2><p>Choose the agency program you want to manage.</p></div>
    <div className="agency-choice-list">
      <button className="agency-choice coin-choice" onClick={onCoinSeller}><span className="agency-choice-icon">🪙</span><div><b>Coin Seller Agency</b><small>Manage agency coins, transfer to users and view transaction history.</small></div><ChevronRight /></button>
      <button className="agency-choice host-choice" onClick={onHostAgency}><span className="agency-choice-icon">👥</span><div><b>Host Agency</b><small>Recruit hosts, manage your team and track host performance.</small></div><ChevronRight /></button>
    </div>
    <div className="agency-center-note"><ShieldCheck /><div><b>Agency tools</b><small>Coin transfers are PIN protected. Host management stays inside your agency.</small></div></div>
  </SubLayout>;
}

const coinAgencyUsers = [
  ['Waqas Awan', '@Boss_1', '👤'],
  ['Murshad Queen', '@Manobilli', '🐱'],
  ['Jannat 40', '@Jannat40', '👩'],
  ['Rana Rehanali', '@RanaRehanali', '🧑'],
] as const;

function CoinSellerAgencyPage({ onBack }: any) {
  const [balance, setBalance] = useState(0);
  const [historyTab, setHistoryTab] = useState<'All' | 'Received' | 'Sent'>('All');
  const [transferOpen, setTransferOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<(typeof coinAgencyUsers)[number] | null>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferDone, setTransferDone] = useState(false);
  const [history, setHistory] = useState([
    { name: 'Waqas Awan', user: '@Boss_1', amount: -199, coins: 0, type: 'Sent' },
    { name: 'Waqas Awan', user: '@Boss_1', amount: -150, coins: 199, type: 'Sent' },
    { name: 'Waqas Awan', user: '@Boss_1', amount: -50, coins: 349, type: 'Sent' },
    { name: 'Waqas Awan', user: '@Boss_1', amount: -100, coins: 399, type: 'Sent' },
  ] as Array<{ name: string; user: string; amount: number; coins: number; type: 'Sent' | 'Received' }>);

  const results = query.trim() ? coinAgencyUsers.filter(([name, user]) => `${name} ${user}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const visibleHistory = historyTab === 'All' ? history : history.filter(x => x.type === historyTab);

  const resetTransfer = () => {
    setTransferOpen(false); setQuery(''); setSelectedUser(null); setAmount(''); setPin(''); setTransferError(''); setTransferDone(false);
  };

  const confirmTransfer = () => {
    const coins = Number(amount);
    if (!selectedUser) return setTransferError('Please search and select a user first.');
    if (!Number.isInteger(coins) || coins <= 0) return setTransferError('Enter a valid coin amount.');
    if (coins > balance) return setTransferError(`Insufficient coins. Available: ${balance}`);
    if (!/^\d{4}$/.test(pin)) return setTransferError('Enter a 4-digit transfer PIN.');
    setBalance(prev => prev - coins);
    setHistory(prev => [{ name: selectedUser[0], user: selectedUser[1], amount: -coins, coins: Math.max(0, balance - coins), type: 'Sent' }, ...prev]);
    setTransferDone(true);
  };

  return <SubLayout title="Agency Portal" onBack={onBack} right={<ShieldCheck />}>
    <div className="agency-profile-card"><div className="agency-profile-avatar">👤</div><div><b>Director desk agency</b><span>@Boss_1</span></div></div>
    <div className="coin-agency-balance"><span>Available Coins</span><strong>🪙 {balance.toLocaleString()}</strong><button onClick={() => { setTransferOpen(true); setTransferError(''); }}><Send /> Transfer</button><div className="authenticated"><ShieldCheck /> AUTHENTICATED</div></div>
    <div className="agency-history-head"><h2>Transaction History</h2><span>Agency ledger</span></div>
    <div className="agency-history-tabs">{(['All','Received','Sent'] as const).map(x => <button key={x} className={historyTab === x ? 'active' : ''} onClick={() => setHistoryTab(x)}>{x}</button>)}</div>
    <div className="agency-history-list">{visibleHistory.length ? visibleHistory.map((x, i) => <div className="agency-history-row" key={`${x.user}-${i}`}><span className="history-arrow">↑</span><div><b>{x.name}</b><small>{x.user}</small><em>WALLET TRANSFER</em></div><div><strong className={x.amount < 0 ? 'sent-amount' : 'received-amount'}>{x.amount > 0 ? '+' : ''}{x.amount}</strong><small>Coins: {x.coins}</small></div></div>) : <div className="empty-history">No {historyTab.toLowerCase()} transactions yet.</div>}</div>

    {transferOpen && <div className="agency-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) resetTransfer(); }}><div className="agency-transfer-sheet">
      <div className="sheet-handle" /><div className="transfer-sheet-head"><div><h2>Transfer Coins</h2><small>Send coins to a Pardais user</small></div><button onClick={resetTransfer}><X /></button></div>
      {!transferDone ? <>
        <label className="transfer-label">USERNAME</label><div className="transfer-search"><Search /><input value={query} onChange={e => { setQuery(e.target.value); setSelectedUser(null); setTransferError(''); }} placeholder="Enter username" /><span>Search</span></div>
        {results.length > 0 && <div className="user-search-results">{results.map(user => <button key={user[1]} className={selectedUser?.[1] === user[1] ? 'selected' : ''} onClick={() => { setSelectedUser(user); setQuery(user[1]); setTransferError(''); }}><span>{user[2]}</span><div><b>{user[0]}</b><small>{user[1]}</small></div><ChevronRight /></button>)}</div>}
        {selectedUser && <div className="selected-transfer-user"><span>{selectedUser[2]}</span><div><b>{selectedUser[0]}</b><small>{selectedUser[1]}</small></div><span className="selected-badge">SELECTED</span></div>}
        <label className="transfer-label">COINS</label><div className="coin-amount-input"><span>🪙</span><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Enter coins" /></div>
        <label className="transfer-label">4-DIGIT PIN</label><input className="pin-input" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
        {transferError && <div className="transfer-error">{transferError}</div>}
        <button className="confirm-transfer" onClick={confirmTransfer}>Transfer Coins</button>
      </> : <div className="transfer-success"><div>✓</div><h2>Transfer Complete</h2><p>{amount} coins sent to {selectedUser?.[1]}.</p><button onClick={resetTransfer}>Done</button></div>}
    </div></div>}
  </SubLayout>;
}

function HostAgencyPage({ onBack }: any) {
  const [hostTab, setHostTab] = useState<'Hosts' | 'Requests'>('Hosts');
  const hosts = [
    ['Murshad Queen', '@Manobilli', '4.2h', '8.6K', 'Active', '🐱'],
    ['Rana Rehanali', '@RanaRehanali', '3.6h', '6.1K', 'Active', '🧑'],
    ['Jannat 40', '@Jannat40', '2.9h', '4.8K', 'Active', '👩'],
    ['AbidH888', '@AbidH888', '1.4h', '1.9K', 'Pending', 'P'],
  ];
  const requests = hosts.filter(x => x[4] === 'Pending');
  const shown = hostTab === 'Hosts' ? hosts : requests;
  return <SubLayout title="Host Agency" onBack={onBack}>
    <div className="host-agency-hero"><div className="host-agency-logo">👥</div><div><b>Director desk agency</b><span>@Boss_1</span></div><button className="invite-host"><UserPlus /> Invite Host</button></div>
    <div className="host-stats"><Metric icon="👥" value="12" label="Active Hosts" change="+2" /><Metric icon="◷" value="3" label="Pending" change="New" /><Metric icon="◇" value="18.4K" label="Monthly Gifts" change="+24%" /><Metric icon="🪙" value="2.8K" label="Agency Earnings" change="+12%" /></div>
    <div className="host-agency-tabs">{(['Hosts','Requests'] as const).map(x => <button key={x} className={hostTab === x ? 'active' : ''} onClick={() => setHostTab(x)}>{x}{x === 'Requests' ? ` (${requests.length})` : ''}</button>)}</div>
    <div className="host-list-title"><h2>{hostTab === 'Hosts' ? 'Your Hosts' : 'Host Requests'}</h2><button><Search /></button></div>
    <div className="host-list">{shown.map(x => <div className="host-row" key={x[1]}><span className="host-avatar">{x[5]}</span><div className="host-copy"><b>{x[0]}</b><small>{x[1]}</small><span>{x[2]} live · {x[3]} gifts</span></div><div className={x[4] === 'Active' ? 'host-status active' : 'host-status pending'}>{x[4]}</div></div>)}</div>
    <div className="host-agency-tools"><button><UserPlus /><span>Add Host</span><small>Invite by username</small></button><button><CalendarDays /><span>Host Targets</span><small>Set hours & goals</small></button><button><WalletCards /><span>Earnings</span><small>Agency commission</small></button></div>
  </SubLayout>;
}

function WalletPage({ onBack }: any) {
  const packs = [['STARTER','100','PKR 225'],['STARTER1','200','PKR 450'],['SMART','300','PKR 675'],['SMART 2','500','PKR 1,125'],['SMARTER','750','PKR 1,688'],['STANDARD 2','1,000','PKR 2,250']];
  const [tab, setTab] = useState<'RECHARGE' | 'HISTORY'>('RECHARGE');
  const [coins, setCoins] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [transferError, setTransferError] = useState('');
  const userId = (() => { try { return localStorage.getItem('pardaisLiteUserId') || 'demo-user'; } catch { return 'demo-user'; } })();
  const loadWallet = async () => { const r = await api.get(`/api/wallet/${userId}`); setCoins(Number(r.data?.wallet?.coins ?? 0)); const h = await api.get(`/api/wallet/${userId}/transactions`); setHistory(h.data?.items ?? []); };
  useEffect(() => { void loadWallet().catch(() => setMessage('Unable to load wallet.')); }, []);
  const choosePack = async (packCoins: string, price: string) => { try { await api.post('/api/wallet/recharge-intent', { userId, coins: packCoins, amount: price }); setMessage(`${packCoins} coins recharge intent created. Payment can be completed when the payment gateway is connected.`); } catch { setMessage('Recharge request failed.'); } };
  const transferCoins = async () => {
    const target = recipient.trim();
    const value = Number(amount);
    if (!target) return setTransferError('Enter the recipient username.');
    if (!Number.isInteger(value) || value <= 0) return setTransferError('Enter a valid whole coin amount.');
    if (!/^\d{4}$/.test(pin)) return setTransferError('Enter a 4-digit transfer PIN.');
    try {
      const receiverId = `user-${target.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-')}`;
      const r = await api.post('/api/wallet/transfer', { userId, receiverId, receiverUsername: target.startsWith('@') ? target : `@${target}`, coins: value, pin });
      setCoins(Number(r.data?.balance ?? Math.max(0, coins - value))); setMessage(`${value.toLocaleString()} coins transferred to ${target}.`); setRecipient(''); setAmount(''); setPin(''); setTransferError(''); setTransferOpen(false); await loadWallet();
    } catch { setTransferError('Transfer failed. Check the username, balance and PIN.'); }
  };
  return <SubLayout title="Wallet" onBack={onBack}>
    <div className="wallet-balance"><span>Available Balance</span><strong>🪙 {coins.toLocaleString()}</strong><WalletCards /></div>
    <button className="wallet-transfer-button" onClick={() => { setTransferOpen(true); setTransferError(''); }}><Send /> Transfer Coins <ChevronRight /></button>
    <div className="wallet-tabs"><button className={tab === 'RECHARGE' ? 'active' : ''} onClick={() => setTab('RECHARGE')}>RECHARGE</button><button className={tab === 'HISTORY' ? 'active' : ''} onClick={() => setTab('HISTORY')}>HISTORY</button></div>
    {message && <div className="transfer-success"><div>✓</div><p>{message}</p></div>}
    {tab === 'RECHARGE' ? <div className="coin-grid">{packs.map(([name, packCoins, price]) => <button className="coin-pack" key={name} onClick={() => void choosePack(packCoins, price)}><b>{name}</b><strong>🪙 {packCoins}</strong><span>{price}</span></button>)}</div> : <div className="agency-history-list">{history.length ? history.map((x, i) => <div className="agency-history-row" key={i}><span className="history-arrow">{Number(x.coins) < 0 ? '↑' : '↓'}</span><div><b>{x.counterpartyUsername || 'Creator Center'}</b><small>{x.type}</small><em>WALLET TRANSFER</em></div><div><strong className={Number(x.coins) < 0 ? 'sent-amount' : 'received-amount'}>{Number(x.coins) > 0 ? '+' : ''}{x.coins}</strong><small>Balance: {x.balanceAfter}</small></div></div>) : <div className="empty-history">No wallet transactions yet.</div>}</div>}
    {transferOpen && <div className="agency-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setTransferOpen(false); }}><div className="agency-transfer-sheet"><div className="sheet-handle" /><div className="transfer-sheet-head"><div><h2>Transfer Coins</h2><small>Send coins to another Pardais user</small></div><button onClick={() => setTransferOpen(false)}><X /></button></div><label className="transfer-label">USERNAME</label><div className="transfer-search"><Search /><input value={recipient} onChange={e => { setRecipient(e.target.value); setTransferError(''); }} placeholder="@username" /><span>Search</span></div><label className="transfer-label">COINS</label><div className="coin-amount-input"><span>🪙</span><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="Enter coins" /></div><label className="transfer-label">4-DIGIT PIN</label><input className="pin-input" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />{transferError && <div className="transfer-error">{transferError}</div>}<button className="confirm-transfer" onClick={() => void transferCoins()}>Transfer Coins</button></div></div>}
  </SubLayout>;
}

function SettingsPage({ onBack, onNotifications, onLevel, onWallet, onBlocked }: any) {
  const [privateAccount, setPrivateAccount] = useState(false);
  const [language, setLanguage] = useState('English');
  const [message, setMessage] = useState('');
  const userId = (() => { try { return localStorage.getItem('pardaisLiteUserId') || 'demo-user'; } catch { return 'demo-user'; } })();
  useEffect(() => { void api.get(`/api/settings/${userId}`).then(r => { setPrivateAccount(Boolean(r.data?.settings?.privateAccount)); setLanguage(String(r.data?.settings?.language ?? 'English')); }).catch(() => {}); }, []);
  const save = async (patch: Record<string, unknown>) => { try { await api.put(`/api/settings/${userId}`, patch); setMessage('Settings saved.'); } catch { setMessage('Could not save setting.'); } };
  const logout = () => { try { localStorage.removeItem('pardaisLiteAuth'); } catch {} window.location.reload(); };
  const deleteAccount = async () => { if (!window.confirm('Delete your account? Your account will be scheduled for permanent deletion after 30 days. You can recover it yourself during this 30-day period using your account email.')) return; let email = ''; try { email = localStorage.getItem('pardaisLiteEmail') || ''; } catch {} try { const r = await api.post('/api/account/delete-request', { userId, email }); const until = r.data?.recoveryUntil ? new Date(r.data.recoveryUntil).toLocaleDateString() : '30 days'; setMessage(`Account deletion scheduled. You can recover your account by email within 30 days (until ${until}).`); } catch { setMessage('Could not submit deletion request.'); } };
  return <SubLayout title="Settings" onBack={onBack}>
    <section><h3>ACCOUNT</h3><div className="settings-card">
      <SettingRow icon={<LockKeyhole />} label="Private Account" toggle value={privateAccount} onClick={() => { const next = !privateAccount; setPrivateAccount(next); void save({ privateAccount: next }); }} />
      {privateAccount && <div className="setting-private-info">Private mode hides your videos, level, followers/following and messaging from visitors. Your live entry and gift MVP identity are also hidden.</div>}
      <SettingRow icon={<Ban />} label="Blocked Viewers" onClick={onBlocked} />
      <SettingRow icon={<LockKeyhole />} label="Level System" onClick={onLevel} />
      <SettingRow icon={<ShieldCheck />} label="Terms & Privacy Policy" onClick={() => window.open('https://pardaislive.com/', '_blank', 'noopener,noreferrer')} />
      <SettingRow icon={<WalletCards />} label="Wallet" onClick={onWallet} />
      <SettingRow icon={<Trash2 />} label="Delete Account" onClick={() => void deleteAccount()} />
    </div></section>
    {message && <div className="transfer-success"><div>✓</div><p>{message}</p></div>}
    <section><h3>CONTENT & ACTIVITY</h3><div className="settings-card"><SettingRow icon={<Bell />} label="Notifications" onClick={onNotifications} /><SettingRow icon={<Languages />} label="Language" value={language} onClick={() => { const next = window.prompt('Language', language); if (next?.trim()) { setLanguage(next.trim()); void save({ language: next.trim() }); } }} /></div></section>
    <section><h3>SUPPORT</h3><div className="settings-card"><SettingRow icon={<CircleHelp />} label="Help Center" onClick={() => { setMessage('Support: pardaisliveofficial@gmail.com'); window.location.href = 'mailto:pardaisliveofficial@gmail.com?subject=Pardais%20Lite%20Support'; }} /><SettingRow icon={<TriangleAlert />} label="Report a Problem" onClick={() => { const text = window.prompt('Describe the problem'); if (text?.trim()) void api.post('/api/actions', { action: 'report_problem', label: 'Report a Problem', screen: 'settings', userId, metadata: { description: text.trim() } }).then(() => setMessage('Problem report submitted.')); }} /></div></section>
    <button className="logout" onClick={logout}><LogOut /> Log Out</button><div className="version">Version 1.3.4 Build: 16.09.2026</div>
  </SubLayout>;
}

function BlockedViewersPage({ onBack }: any) { return <SubLayout title="Blocked Viewers" onBack={onBack}><div className="empty-state"><Ban /><b>No blocked viewers</b><span>Users you block from your live streams will appear here.</span></div></SubLayout>; }

function SettingRow({ icon, label, value, toggle, onClick }: any) {
  return <button className="setting-row" onClick={onClick}><span className="setting-icon">{icon}</span><span className="setting-label">{label}</span>{toggle ? <span className={value ? 'toggle on' : 'toggle'}><i /></span> : value ? <><span className="setting-value">{value}</span><ChevronRight /></> : <ChevronRight />}</button>;
}

function NotificationsPage({ onBack }: any) {
  const items = [
    ['New Follower','Jannat40 started following you.','2h ago','P'],
    ['New Follower','Ahmadofficial started following you.','3h ago','P'],
    ['New Follower','AbidH888 started following you.','3h ago','P'],
    ['🎁 Live Gift Received','☠ Saif Khokhar ☠ sent you heart (0.18 coins) on your live ...','3h ago','🪽'],
    ['🎁 Live Gift Received','☠ Saif Khokhar ☠ sent you Fireworks (24.3 coins) on your ...','3h ago','🪽'],
    ['New Follower','RANAHOOR started following you.','3h ago','P']
  ];
  return <SubLayout title="Notifications" onBack={onBack} right="Mark all read"><div className="notifications-list">{items.map((x, i) => <div className="notification-item" key={i}><div className="notification-avatar">{x[3]}</div><div className="notification-copy"><b>{x[0]}</b><p>{x[1]}</p><small>{x[2]}</small></div><i className="unread-dot" /></div>)}</div></SubLayout>;
}

function EditProfilePage({ onBack }: any) {
  const userId = (() => { try { return localStorage.getItem('pardaisLiteUserId') || 'demo-user'; } catch { return 'demo-user'; } })();
  const [form, setForm] = useState({ firstName: 'Saif', lastName: 'Khokhar', gender: 'Male', dateOfBirth: 'February 23, 1998', bio: '', whatsapp: '+92 300 1234567', facebook: 'https://facebook.com/usern', instagram: 'https://instagram.com/usern', youtube: 'https://youtube.com/@usern' });
  const [message, setMessage] = useState('');
  useEffect(() => { void api.get(`/api/profile/${userId}`).then(r => setForm(v => ({ ...v, ...r.data?.profile }))).catch(() => {}); }, []);
  const set = (key: string, value: string) => setForm(v => ({ ...v, [key]: value }));
  const save = async () => { try { await api.put(`/api/profile/${userId}`, form); setMessage('Profile saved successfully.'); } catch { setMessage('Could not save profile.'); } };
  const editableField = (label: string, key: string, value: string) => <label className='field'><span className='field-label'>{label}</span><div className='input-box'><input value={value} onChange={e => set(key, e.target.value)} /></div></label>;
  return <SubLayout title="Edit Profile" onBack={onBack} right={<span onClick={() => void save()}>Save</span>}><div className="edit-profile">
    {message && <div className='transfer-success'><div>✓</div><p>{message}</p></div>}
    <div className="edit-avatar-wrap"><div className="edit-avatar">🪽</div><button><Camera /></button></div><p className="change-picture">Tap to change profile picture</p>
    <div className="name-grid">{editableField('FIRST NAME','firstName',form.firstName)}{editableField('LAST NAME','lastName',form.lastName)}</div>
    {editableField('GENDER','gender',form.gender)}{editableField('DATE OF BIRTH','dateOfBirth',form.dateOfBirth)}
    <label className='field'><span className='field-label'>BIO <span>{form.bio.length}/30</span></span><div className='input-box'><input maxLength={30} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder='Tell us about yourself...' /></div></label>
    {editableField('WHATSAPP NUMBER','whatsapp',form.whatsapp)}
    <h2 className="edit-section">Social Media Links</h2>
    {editableField('FACEBOOK URL','facebook',form.facebook)}{editableField('INSTAGRAM URL','instagram',form.instagram)}{editableField('YOUTUBE URL','youtube',form.youtube)}
    <h2 className="edit-section">Account Settings</h2>
    <SimpleRow label="Change Password" icon={<LockKeyhole />} /><SimpleRow label="Privacy Settings" icon={<ShieldCheck />} /><SimpleRow label="Notification Preferences" icon={<Bell />} />
  </div></SubLayout>;
}

function Field({ label, value, icon }: any) {  return <label className="field"><span className="field-label">{label}</span><div className="input-box">{icon || <UserRound />}{value}<ChevronRight className="field-chevron" /></div></label>;
}

function SimpleRow({ label, icon }: any) { return <button className="simple-row"><span>{icon}</span>{label}<ChevronRight /></button>; }

function FollowersPage({ active, setActive, onBack }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const userId = (() => { try { return localStorage.getItem('pardaisLiteUserId') || 'demo-user'; } catch { return 'demo-user'; } })();
  const load = async () => {
    setLoading(true);
    try {
      const path = active === 'Followers' ? `/api/followers/${encodeURIComponent(userId)}` : active === 'Following' ? `/api/following/${encodeURIComponent(userId)}` : `/api/friends/${encodeURIComponent(userId)}`;
      const r = await api.get(path);
      setItems(r.data?.items ?? []);
      setMessage('');
    } catch {
      setItems([]);
      setMessage('Unable to load this list.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [active]);
  const toggleFollow = async (targetId: string, following: boolean) => {
    try {
      await api.post('/api/follow', { followerId: userId, followingId: targetId, action: following ? 'unfollow' : 'follow' });
      await load();
    } catch { setMessage('Could not update the follow relationship.'); }
  };
  return <SubLayout title="@khokhar_1" onBack={onBack} right={<Search />}>
    <div className="follow-tabs">{(['Followers','Following','Friends'] as FollowTab[]).map(x => <button key={x} className={active === x ? 'selected' : ''} onClick={() => setActive(x)}>{x === 'Friends' ? '♧ Friends' : x}</button>)}</div>
    {message && <div className="transfer-error" style={{ margin: '12px 16px' }}>{message}</div>}
    {loading ? <div className="empty-history">Loading...</div> : items.length ? <div className="follow-list">{items.map(item => <FollowRow key={item.id} item={item} tab={active} onToggle={toggleFollow} />)}</div> : <div className="empty-state"><Users /><b>No {active.toLowerCase()} yet</b><span>Real {active.toLowerCase()} will appear here when users connect with your account.</span></div>}
  </SubLayout>;
}

function FollowRow({ item, tab, onToggle }: any) {
  const [busy, setBusy] = useState(false);
  const isFollowingTab = tab === 'Following';
  const isFriendTab = tab === 'Friends';
  const action = isFollowingTab ? 'Unfollow' : isFriendTab ? 'Message' : 'Follow back';
  const run = async () => { if (!onToggle || isFriendTab) return; setBusy(true); await onToggle(item.id, isFollowingTab); setBusy(false); };
  return <div className="follow-row"><div className="follow-avatar">{item.avatar || String(item.name || 'P').slice(0, 1).toUpperCase()}</div><div className="follow-person"><b>{item.name || 'Pardais User'}</b><span>{item.username || `@${String(item.id).replace(/^user-/, '')}`}</span></div><button disabled={busy} className={isFriendTab ? 'outline-action' : isFollowingTab ? 'outline-action' : 'pink-action'} onClick={() => void run()}>{busy ? '...' : action}</button></div>;
}

function SubLayout({ title, onBack, right, children }: any) {
  return <main className="sub-page"><header className="sub-header"><button onClick={onBack}><ChevronLeft /></button><h1>{title}</h1>{right ? <button className="header-right">{typeof right === 'string' ? right : right}</button> : <span />}</header>{children}</main>;
}

function ShareSheet({ onClose, title = 'Share', url = window.location.href, text = 'Check this out on Pardais Lite' }: { onClose: () => void; title?: string; url?: string; text?: string }) {
  const [message, setMessage] = useState('');
  const copy = async () => { try { await navigator.clipboard.writeText(url); setMessage('Link copied.'); } catch { setMessage('Could not copy link.'); } };
  const share = async () => { try { if (navigator.share) { await navigator.share({ title, text, url }); setMessage('Share opened.'); } else await copy(); } catch { setMessage('Sharing cancelled.'); } };
  const external = (kind: 'whatsapp' | 'sms') => { const value = encodeURIComponent(`${text} ${url}`); window.location.href = kind === 'whatsapp' ? `https://wa.me/?text=${value}` : `sms:?body=${value}`; };
  return <div className="share-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="share-sheet"><div className="sheet-handle" /><div className="share-title"><Share2 /><b>{title}</b><button onClick={onClose}><X /></button></div>{message && <div className="transfer-success"><div>✓</div><p>{message}</p></div>}<div className="share-users">{['Jannat 40','IshQ Live','QURESHI Sahab','Dua Fazal'].map((x,i)=><button key={x} className="share-user-button" onClick={() => setMessage(`Ready to share with ${x}. Use Messenger/Inbox to send the link.`)}><div className="share-avatar">{['👩','🐱','🧑','👩'][i]}</div><span>{x}</span></button>)}</div><div className="share-actions"><button onClick={() => external('whatsapp')}><span className="wa">◉</span><b>WhatsApp</b></button><button onClick={() => external('sms')}><span className="sms">•••</span><b>SMS</b></button><button onClick={() => void copy()}><span className="link"><Link2 /></span><b>Copy link</b></button><button onClick={() => void share()}><span className="more"><Share2 /></span><b>More / Share</b></button></div></div></div>;
}

function BottomNav({ tab, nav }: { tab: Tab; nav: (x: Tab) => void }) {
  return <nav className="bottom"><button className={tab === 'home' ? 'active' : ''} onClick={() => nav('home')}><Home /><span>Home</span></button><button className={tab === 'live' ? 'active' : ''} onClick={() => nav('live')}><Video /><span>Live</span></button><button className="create-btn" onClick={() => nav('create')}><Plus /></button><button className={tab === 'inbox' ? 'active' : ''} onClick={() => nav('inbox')}><MessageCircle /><span>Inbox</span></button><button className={tab === 'profile' ? 'active' : ''} onClick={() => nav('profile')}><UserRound /><span>Profile</span></button></nav>;
}

function SoloHostLive({ onClose, onGuestInvite, onPk }: any) {
  const [menu, setMenu] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState('Mr Adeeb');
  const [camOff, setCamOff] = useState(true);
  const [muted, setMuted] = useState(false);
  const openViewer = (name: string) => { setSelectedViewer(name); setMenu(true); };
  return <div className="solo-live"><div className="solo-bg">
    <div className="solo-top"><div className="solo-profile"><div className="solo-avatar">🪽</div><div><b>☠ Saif Khokhar ☠ <span className="verified-mini">✓</span></b><small>@khokhar_1 · 🦁 29</small></div></div><div className="solo-top-actions"><button aria-label="Share live broadcast" onClick={() => setShareOpen(true)}>↗</button><button onClick={onClose}><X /></button></div></div>
    <div className="solo-stats"><span>◉ 2</span><span>◷ 06:25</span><span>❤️ 152</span></div>
    {camOff && <div className="solo-camera-off"><VideoOff /><b>Camera is off</b><small>Your profile photo is shown to viewers</small></div>}
    <div className="solo-notice"><b>📌 <span>🛡 Admin</span></b><p>Welcome to Pardais Live! Enjoy live streaming and interacting with others in real time. Hosts and viewers must be 18+ to stream, send gifts, or make purchases. Please follow our Community Guidelines and keep Pardais Live safe and respectful for everyone. 😊</p></div>
    <div className="solo-comments">
      <button onClick={() => openViewer('Mr Adeeb')}><b>Mr Adeeb <small>🦁 25</small></b><span>السلام علیکم</span></button>
      <button onClick={() => openViewer('Mano Rani')}><b>Mano Rani <small>🦁 14</small></b><span>Massallah</span></button>
      <button onClick={() => openViewer('Shanzey Khokhar')}><b>Shanzey Khokhar <small>🦁 28</small></b><span>Me dubble tap ni kro gie 😂</span></button>
    </div>
    {menu && <ViewerActionSheet viewer={selectedViewer} onClose={() => setMenu(false)} onInvite={() => { setMenu(false); onGuestInvite(); }} />}
    <div className="solo-input"><span>💬 Comment</span><Send /></div>
    <div className="solo-bottom"><button className="invite-btn" onClick={onPk} aria-label="Invite to 1v1 PK"><UserPlus /> Invite</button><button onClick={() => setMuted(!muted)}><Phone /><small>{muted ? 'Unmute' : 'Mute'}</small></button><button className={camOff ? 'red-control' : ''} onClick={() => setCamOff(!camOff)}>{camOff ? <VideoOff /> : <Video />}<small>{camOff ? 'Cam Off' : 'Cam On'}</small></button><button><Camera /><small>Flip</small></button><button><Sparkles /><small>Beauty</small></button><button className="pk-control" onClick={onPk}>⚔</button></div>
    <button className="viewer-touch-target" onClick={() => openViewer('Mr Adeeb')} aria-label="Open viewer options"><span /></button>
    {shareOpen && <ShareSheet onClose={() => setShareOpen(false)} title="Share Live Broadcast" url={`${window.location.origin}/live/khokhar_1`} text="☠ Saif Khokhar ☠ is live now on Pardais Lite" />}
  </div></div>;
}

function ViewerActionSheet({ viewer = 'Mr Adeeb', onClose, onInvite }: any) {
  const [message, setMessage] = useState('');
  const level = viewer === 'Mano Rani' ? 14 : viewer === 'Shanzey Khokhar' ? 28 : 25;
  const act = async (action: 'moderator' | 'warn' | 'report' | 'kick' | 'block') => { let actorId = 'demo-user'; try { actorId = localStorage.getItem('pardaisLiteUserId') || actorId; } catch {} const targetUserId = `user-${viewer.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; const reason = action === 'report' || action === 'warn' ? (window.prompt('Reason') || 'Community guideline review') : undefined; try { await api.post('/api/moderation', { actorId, targetUserId, targetUsername: viewer, action, reason }); setMessage(action === 'report' ? 'Report submitted to admins.' : `${viewer} action completed: ${action}.`); } catch { setMessage('Action could not be completed.'); } };
  return <div className="viewer-sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="viewer-sheet"><div className="sheet-handle" /><div className="viewer-head"><div className="viewer-avatar">{viewer === 'Mano Rani' ? '🌹' : viewer === 'Shanzey Khokhar' ? '🧑' : '😎'}</div><div><b>{viewer}</b><small>🦁 Lv {level}</small></div><button><UserPlus /></button><button><MessageCircle /></button></div>
    <button><UserRound /><div><b>Visit Profile</b><small>View full profile</small></div><ChevronRight /></button>
    <button className="green-option" onClick={onInvite}><Video /><div><b>Invite as Guest</b><small>Bring them on as a live guest</small></div><ChevronRight /></button>
    {message && <div className="transfer-success"><div>✓</div><p>{message}</p></div>}
    <button className="blue-option" onClick={() => void act('moderator')}><ShieldCheck /><div><b>Assign Moderator</b><small>Let them manage comments & users</small></div><ChevronRight /></button>
    <button className="yellow-option" onClick={() => void act('warn')}><TriangleAlert /><div><b>Warn User</b><small>Send a guideline violation warning</small></div><ChevronRight /></button>
    <button className="red-option" onClick={() => void act('report')}><span>⚑</span><div><b>Report User</b><small>Report to admins for review</small></div><ChevronRight /></button>
    <button className="orange-option" onClick={() => void act('kick')}><LogOut /><div><b>Kick User</b><small>Remove from this stream</small></div><ChevronRight /></button>
    <button className="danger-option" onClick={() => void act('block')}><Ban /><div><b>Block User</b><small>Block from all your streams</small></div><ChevronRight /></button>
    <button className="cancel-sheet" onClick={onClose}>Cancel</button>
  </div></div>;
}



const liveUsers = [
  ['Nawaz Chacha','@nawaz7471','13','👑'],['Rahat Lala','@Rahatsinger','15','🧑'],['Zaheer Abbas','@ZaheerAbbas','28',''],['≋Adnan Ajnabi≋','@adnanjanjabi201','28','👑']
] as const;

function ViewerSoloLive({ onClose }: any) {
  const [camOff, setCamOff] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewerMenu, setViewerMenu] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftSent, setGiftSent] = useState(false);
  const [pkFlow, setPkFlow] = useState<'none'|'invite'|'waiting'|'incoming'|'prematch'|'room'>('none');
  if (pkFlow === 'invite') return <PkInvitePage onBack={() => setPkFlow('none')} onSent={() => setPkFlow('waiting')} />;
  if (pkFlow === 'waiting') return <PkWaitingPage onCancel={() => setPkFlow('none')} onAccept={() => setPkFlow('prematch')} onIncoming={() => setPkFlow('incoming')} />;
  if (pkFlow === 'incoming') return <PkIncomingPage onReject={() => setPkFlow('none')} onAccept={() => setPkFlow('prematch')} />;
  if (pkFlow === 'prematch') return <PkPreMatchPage onCancel={() => setPkFlow('none')} onStart={() => setPkFlow('room')} />;
  if (pkFlow === 'room') return <PkRoomPage onClose={() => setPkFlow('none')} />;
  return <div className="viewer-solo-live">
    <header className="viewer-solo-head"><div className="solo-profile"><div className="solo-avatar">🌟</div><div><b>Syed Honey</b><small>@syedhoney · 🦁 15</small></div></div><button className="viewer-follow">＋</button><button className="viewer-close" onClick={onClose}><X /></button></header>
    <div className="viewer-solo-stats"><span>◉ 2</span><span>◷ 03:27</span><span>❤️ 0</span></div>
    <div className={camOff ? 'viewer-host-stage cam-off' : 'viewer-host-stage'} onClick={() => setViewerMenu(true)}>
      {camOff ? <div className="viewer-camera-off"><VideoOff /><b>Camera is off</b></div> : <div className="viewer-host-avatar">🌟</div>}
    </div>
    <div className="viewer-chat">
      <button onClick={() => setViewerMenu(true)}><span className="viewer-chat-avatar">🌹</span><div><b>Im Love <small>🦁 8</small></b><p>Kon hu m</p></div></button>
      <button onClick={() => setViewerMenu(true)}><span className="viewer-chat-avatar">🌹</span><div><b>Im Love <small>🦁 8</small></b><p>Pait full ho gya</p></div></button>
      <button onClick={() => setViewerMenu(true)}><span className="viewer-chat-avatar">🐱</span><div><b>IshQ Live <small>10</small></b><p>Hi</p></div></button>
    </div>
    <div className="viewer-toolbar"><div className="viewer-comment-box">Say something...</div><button className="viewer-gift" onClick={() => setGiftOpen(true)}><Gift /></button><button aria-label="Share live broadcast" onClick={() => setShareOpen(true)}><Share2 /></button></div>
    {viewerMenu && <ViewerUserActionSheet onClose={() => setViewerMenu(false)} />}
    {giftOpen && <GiftDrawer onClose={() => setGiftOpen(false)} onSent={() => { setGiftOpen(false); setGiftSent(true); }} />}
    {giftSent && <GiftAnimation onDone={() => setGiftSent(false)} />}
    <div className="viewer-extra-actions"><button onClick={() => setPkFlow('invite')}>⚔ PK</button><button onClick={() => setCamOff(!camOff)}>{camOff ? 'Show Host Camera' : 'Hide Host Camera'}</button></div>
    {shareOpen && <ShareSheet onClose={() => setShareOpen(false)} title="Share Live Broadcast" url={`${window.location.origin}/live/khokhar_1`} text="☠ Saif Khokhar ☠ is live now on Pardais Lite" />}
  </div>;
}

function ViewerUserActionSheet({ onClose }: any) {
  return <div className="viewer-sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="viewer-sheet viewer-user-sheet"><div className="sheet-handle" /><div className="viewer-head"><div className="viewer-avatar">🌹</div><div><b>Im Love</b><small>🦁 Lv 8 · Viewer</small></div><button><UserPlus /></button><button><MessageCircle /></button></div>
    <button><UserRound /><div><b>Visit Profile</b><small>View full profile</small></div><ChevronRight /></button>
    <button className="pink-option"><UserPlus /><div><b>Follow</b><small>Follow this user</small></div><ChevronRight /></button>
    <button className="blue-option"><MessageCircle /><div><b>Send Message</b><small>Start a conversation</small></div><ChevronRight /></button>
    <button className="red-option"><TriangleAlert /><div><b>Report User</b><small>Report to admins for review</small></div><ChevronRight /></button>
    <button className="danger-option"><Ban /><div><b>Block</b><small>Block this user</small></div><ChevronRight /></button>
    <button className="cancel-sheet" onClick={onClose}>Cancel</button>
  </div></div>;
}

function GiftDrawer({ onClose, onSent }: any) {
  const gifts = [['King Ring','1,800','👑'],['fight up','1,500','⚔️'],['Crown','1,200','👑'],['Train','1,000','🚆'],['kitty bike','750','🏍️'],['Rose','100','🌹'],['Butterfly','150','🦋'],['Fireworks','270','🎆']];
  const [selected, setSelected] = useState(5);
  return <div className="gift-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="gift-drawer"><div className="sheet-handle" /><div className="gift-head"><button onClick={onClose}><X /></button><h2>Send Gift</h2><b>🪙 6,690 <span>＋</span></b></div><div className="gift-tabs"><button className="active">New</button><button>PREMIUM</button><button>special</button></div><div className="gift-grid">{gifts.map(([name,cost,icon],i)=><button className={selected===i ? 'gift-item selected' : 'gift-item'} key={name} onClick={()=>setSelected(i)}><div className="gift-icon">{icon}</div><b>{name}</b><span>🪙 {cost}</span></button>)}</div><div className="gift-sendbar"><span>Select a gift</span><button>−</button><b>1</b><button>＋</button><strong>1x⌃</strong><button onClick={() => { let userId = ''; try { userId = localStorage.getItem('pardaisLiteUserId') || ''; } catch {} void api.post('/api/gifts/send', { senderId: userId || 'demo-user', receiverId: 'demo-host', giftId: gifts[selected][0], quantity: 1 }).catch(() => {}); onSent(); }}>Send</button></div></div></div>;
}

function GiftAnimation({ onDone }: any) {
  const [privateAccount, setPrivateAccount] = useState(false);
  let userId = 'demo-user'; try { userId = localStorage.getItem('pardaisLiteUserId') || userId; } catch {}
  useEffect(() => { void api.get(`/api/settings/${encodeURIComponent(userId)}`).then(r => setPrivateAccount(Boolean(r.data?.settings?.privateAccount))).catch(() => {}); const t=setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone, userId]);
  return <div className="gift-animation"><div className="gift-toast">🌟 {privateAccount ? 'Private User' : 'Saif Khokhar'} <span>sent 🌹 Rose</span><b>x 1</b></div><div className="gift-rose">🌹</div></div>;
}

function InviteGuestPage({ onBack, onInvited }: any) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState<(typeof liveUsers)[number] | null>(null);
  const results = liveUsers.filter(x => `${x[0]} ${x[1]}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="full-dark-page"><header className="flow-header"><button onClick={onBack}><ChevronLeft /></button><div><h1>Invite to Live</h1><small>Invite a live user as your guest</small></div><b>Guest</b></header><div className="flow-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or handle..." /></div><p className="available-count">{results.length} live users available</p><div className="live-user-list">{results.map(u => <div className="live-user-row" key={u[1]}><span className="live-user-avatar">{u[3] || '👤'}</span><div><b>{u[0]}</b><small>{u[1]} · Lv {u[2]}</small></div><button onClick={() => setSelected(u)}>Invite</button></div>)}</div>{selected && <ConfirmGuest user={selected} onClose={() => setSelected(null)} onInvited={onInvited} />}</div>;
}

function ConfirmGuest({ user, onClose, onInvited }: any) { const sendInvite = async () => { let fromUserId = 'demo-user'; try { fromUserId = localStorage.getItem('pardaisLiteUserId') || fromUserId; } catch {} const toUserId = `user-${String(user[1]).replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-')}`; try { await api.post('/api/invites', { fromUserId, toUserId, toUsername: user[1], type: 'guest' }); onInvited(); } catch {} }; return <div className="center-modal-backdrop"><div className="confirm-guest-modal"><div className="modal-avatar">{user[3] || '👤'}</div><h2>{user[0]}</h2><p>{user[1]} · 🦁 {user[2]}</p><div className="confirm-text">Send a live guest invite to <b>{user[0]}</b>?</div><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="gradient-action" onClick={() => void sendInvite()}>Invite</button></div></div></div>; }

function PkInvitePage({ onBack, onSent }: any) { const [query,setQuery]=useState(''); const [selected,setSelected]=useState<any>(null); const results=liveUsers.filter(x=>`${x[0]} ${x[1]}`.toLowerCase().includes(query.toLowerCase())); const sendPkInvite = async () => { if (!selected) return; let fromUserId = 'demo-user'; try { fromUserId = localStorage.getItem('pardaisLiteUserId') || fromUserId; } catch {} const toUserId = `user-${String(selected[1]).replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '-')}`; try { await api.post('/api/pk/invites', { fromUserId, toUserId, toUsername: selected[1] }); onSent(); } catch {} }; return <div className="full-dark-page"><header className="flow-header"><button onClick={onBack}><ChevronLeft /></button><div><h1>Invite to 1v1</h1><small>Challenge a live user</small></div><b>1v1</b></header><div className="flow-search"><Search /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name or handle..." /></div><p className="available-count">{results.length} live users available</p><div className="live-user-list">{results.map(u=><div className="live-user-row" key={u[1]}><span className="live-user-avatar">{u[3] || '👤'}</span><div><b>{u[0]}</b><small>{u[1]}</small></div><button onClick={()=>setSelected(u)}>⚡ Invite</button></div>)}</div>{selected&&<div className="center-modal-backdrop"><div className="pk-confirm-modal"><div className="modal-avatar">{selected[3] || '👤'}</div><h2>{selected[0]}</h2><p>{selected[1]} · 🦁 {selected[2]}</p><div className="confirm-text">Send a 1v1 live invite to <b>{selected[0]}</b></div><div className="modal-actions"><button onClick={()=>setSelected(null)}>Cancel</button><button className="gradient-action" onClick={() => void sendPkInvite()}>Invite</button></div></div></div>}</div>; }

function PkWaitingPage({ onCancel, onAccept, onIncoming }: any) { return <div className="full-dark-page waiting-page"><div className="pk-wait-card"><div className="pk-avatars"><div>🪽</div><span>•••</span><div>😎</div></div><div className="pk-names"><b>khokhar_1</b><b>AdeebArain</b></div><div className="wait-icon">◷</div><h1>Waiting for Response</h1><p>Invite sent to <b>AdeebArain</b></p><button onClick={onCancel}>Cancel Invite</button><button className="demo-accept" onClick={onAccept}>Accept Response</button><button className="demo-incoming" onClick={onIncoming}>Preview Incoming Request</button></div></div>; }

function PkIncomingPage({ onReject, onAccept }: any) { return <div className="center-modal-backdrop"><div className="pk-incoming-modal"><div className="modal-avatar">😎</div><h2>@AdeebArain</h2><p className="live-now">● Live now · 🦁 25</p><div className="confirm-text">Challenging you to a <b>1v1 Live</b></div><div className="modal-actions"><button onClick={onReject}>Reject</button><button className="gradient-action" onClick={onAccept}>⚡ Accept</button></div></div></div>; }

function PkPreMatchPage({ onCancel, onStart }: any) { return <div className="center-modal-backdrop"><div className="pk-prematch-modal"><button className="modal-x" onClick={onCancel}><X /></button><div className="swords">⚔️</div><h2>Start PK Match?</h2><p>◷ 5 minutes</p><div className="pk-versus"><div><span>🪽</span><b>khokhar_1</b></div><strong>VS</strong><div><span>😎</span><b>AdeebArain</b></div></div><div className="modal-actions"><button onClick={onCancel}>Cancel</button><button className="gradient-action" onClick={onStart}>Start Match</button></div></div></div>; }

function PkRoomPage({ onClose }: any) {
  const [selected, setSelected] = useState<'host' | 'viewer' | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  return <div className="pk-room-page"><header className="pk-room-head"><div className="solo-profile"><div className="solo-avatar">🪽</div><div><b>☠ Saif Khokhar ☠ <span className="verified-mini">✓</span></b><small>@khokhar_1 · 🦁 29</small></div></div><button className="pk-badge">⚔ PK</button><button onClick={onClose}><X /></button></header><div className="pk-score"><span>0</span><b>🔥</b><span>0</span></div><div className="pk-split"><button className="pk-side left" onClick={() => setSelected('host')}><div className="pk-live-stats">◉ 2　◷ 00:05　❤️ 63</div><div className="pk-big-avatar">🪽</div><div className="pk-name">☠ Saif Khokhar ☠ · 🦁 29</div></button><button className="pk-side right" onClick={() => setSelected('viewer')}><div className="pk-live-stats">◉ 2　◷ 00:05　❤️ 27</div><div className="pk-big-avatar">😎</div><div className="pk-name">Mr Adeeb · 🦁 25</div><span className="pk-plus">＋</span></button></div><div className="pk-seat-row"><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span></div><div className="pk-chatbar"><span>Say . . .</span><button><Camera /></button><button className="red-control"><Video /></button><button><Phone /></button><button aria-label="Share PK broadcast" onClick={() => setShareOpen(true)}><Share2 /></button></div>{shareOpen && <ShareSheet onClose={() => setShareOpen(false)} title="Share PK Battle" url={`${window.location.origin}/live/pk-khokhar-adeeb`} text="⚔️ PK Battle is live now on Pardais Lite" />}{selected && <PkUserActionSheet kind={selected} onClose={() => setSelected(null)} />}</div>;
}

function GuestSeatRoom({ onClose }: { onClose: () => void }) {
  const [guestMenu, setGuestMenu] = useState(false);
  return <div className="guest-room"><header className="guest-room-head"><div className="solo-profile"><div className="solo-avatar">🪽</div><div><b>☠ Saif Khokhar ☠ <span className="verified-mini">✓</span></b><small>@khokhar_1 · 🦁 29</small></div></div><button onClick={onClose}><X /></button></header><div className="guest-stage"><div className="guest-host-video"><div className="solo-stats"><span>◉ 3</span><span>◷ 06:43</span><span>❤️ 153</span></div><div className="guest-host-avatar">🪽</div><b>☠ Saif Khokhar ☠</b></div><div className="guest-seat-grid"><button className="guest-seat filled" onClick={() => setGuestMenu(true)}><span>😎</span><b>Mr Adeeb</b><small>🦁 25</small></button>{Array.from({ length: 7 }, (_, i) => <button className="guest-seat" key={i}><span>🛋️</span></button>)}</div></div><div className="guest-comments"><div><b>Shanzey Khokhar</b><small>🦁 28</small><p>Kesy ha ap</p></div><div><b>Mano Rani</b><small>🦁 14</small><p>Massallah</p></div><div><b>Mr Adeeb</b><small>🦁 25</small><p>❤️</p></div></div><div className="guest-input"><span>Say something</span><button><Gift /></button></div>{guestMenu && <GuestActionSheet onClose={() => setGuestMenu(false)} />}</div>;
}

function GuestActionSheet({ onClose }: any) {
  return <div className="viewer-sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="viewer-sheet guest-action-sheet"><div className="sheet-handle" /><div className="viewer-head"><div className="viewer-avatar">😎</div><div><b>Dua Fazal</b><small>🦁 Lv 21</small></div><span className="guest-label">🎙 GUEST</span></div><button><UserRound /><div><b>Visit Profile</b><small>View full profile</small></div><ChevronRight /></button><button className="pink-option"><Video /><div><b>Give Main Screen</b><small>Show their camera to everyone</small></div><ChevronRight /></button><button className="red-option"><Phone /><div><b>Mute Mic</b><small>They won't be able to unmute themselves</small></div><ChevronRight /></button><button className="red-option"><LogOut /><div><b>Remove from Seat</b><small>Send them back to viewer</small></div><ChevronRight /></button><button className="cancel-sheet" onClick={onClose}>Cancel</button></div></div>;
}

function PkUserActionSheet({ kind, onClose }: any) {
  const isHost = kind === 'host';
  return <div className="viewer-sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="viewer-sheet pk-user-sheet"><div className="sheet-handle" /><div className="viewer-head"><div className="viewer-avatar">{isHost ? '🪽' : '😎'}</div><div><b>{isHost ? 'Saif Khokhar' : 'Mr Adeeb'}</b><small>🦁 Lv {isHost ? '29' : '25'} · {isHost ? 'HOST' : 'VIEWER'}</small></div></div><button><UserRound /><div><b>Visit Profile</b><small>View full profile</small></div><ChevronRight /></button><button className="pink-option"><UserPlus /><div><b>{isHost ? 'Follow Host' : 'Follow User'}</b><small>Add them to your following list</small></div><ChevronRight /></button><button className="blue-option"><MessageCircle /><div><b>Message</b><small>Open private chat</small></div><ChevronRight /></button><button className="red-option"><TriangleAlert /><div><b>Report User</b><small>Report to admins for review</small></div><ChevronRight /></button><button className="danger-option"><Ban /><div><b>Block User</b><small>Block from your streams</small></div><ChevronRight /></button><button className="cancel-sheet" onClick={onClose}>Cancel</button></div></div>;
}

function LiveRoom({ onClose }: { onClose: () => void }) {
  return <div className="room"><div className="room-video"><button onClick={onClose}><X /></button><div className="room-top-title">🎙 Pardais Live</div><div className="room-host-ring">P</div><span className="room-status">LIVE · 1,248</span><div className="room-title">Pardais Host</div></div><div className="seat-grid">{Array.from({ length: 12 }, (_, i) => <div key={i} className={i === 0 ? 'seat filled' : 'seat'}>{i === 0 ? 'P' : '+'}</div>)}</div><div className="room-comments"><div><b>Host:</b> Welcome to Pardais Live 👋</div><div><b>User786:</b> Great live 🔥</div><div><b>Ali:</b> Join PK!</div></div><div className="room-tools"><button><Zap /><span>PK</span></button><button><Gift /><span>Gift</span></button><button><Share2 /><span>Share</span></button><button><Phone /><span>Audio</span></button></div><div className="comment-input"><span>Say something...</span><Send /></div></div>;
}

export default App;
