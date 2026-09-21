import { useEffect, useRef, useState } from 'react';
import { browserLocalPersistence, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, updatePassword } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';
import { AgoraLiveRoom } from './AgoraLiveRoom';
import {
  Bell, Ban, Bookmark, CalendarDays, Camera, ChevronLeft, ChevronRight, CircleHelp,
  Copy, Edit3, Gift, Globe2, Heart, Home, Image as ImageIcon, Languages, Link2,
  LockKeyhole, LogOut, MessageCircle, MessageSquare, Moon, MoreHorizontal, Palette,
  Mic, MicOff, Paperclip, Phone, Plus, Search, Send, Settings, Share2, ShieldCheck, Sparkles, Trash2,
  TriangleAlert, UserPlus, UserRound, Users, Video, VideoOff, WalletCards, X, Zap
} from 'lucide-react';

type Tab = 'home' | 'live' | 'create' | 'inbox' | 'profile';
type SubPage = 'settings' | 'notifications' | 'editProfile' | 'followers' | 'creator' | 'agency' | 'coinSellerAgency' | 'hostAgency' | 'wallet' | 'blockedViewers' | null;
type FollowTab = 'Followers' | 'Following' | 'Friends';


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
  const [createMode, setCreateMode] = useState<'upload' | 'live'>('upload');
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
  const [profileTab, setProfileTab] = useState<'Public' | 'Private' | 'Saved' | 'Drafts'>('Public');
  const [liveView, setLiveView] = useState<'discover' | 'solo' | 'inviteGuest' | 'guestRoom' | 'pkInvite' | 'pkWaiting' | 'pkIncoming' | 'pkPreMatch' | 'pkRoom'>('discover');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'success'>(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      if (path === '/signup' || path === '/register') return 'signup';
      return 'login';
    } catch { return 'login'; }
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const appNavStateRef = useRef({ tab, subPage, fullPage, profileOverlay, room });
  appNavStateRef.current = { tab, subPage, fullPage, profileOverlay, room };

  useEffect(() => {
    let mounted = true;
    let fallbackTimer: number | undefined;
    let unsubscribe = () => {};
    const startAuth = async () => {
      try { await setPersistence(auth, browserLocalPersistence); } catch {}
      try {
        unsubscribe = onAuthStateChanged(auth, user => {
        if (!mounted) return;
        if (user) {
          try {
            localStorage.setItem('pardaisLiteUserId', user.uid);
            localStorage.setItem('pardaisLiteEmail', user.email || '');
            localStorage.setItem('pardaisLiteAuth', '1');
          } catch {}
          void api.get('/api/auth/me').then(r => {
            const complete = Boolean(r.data?.onboardingComplete);
            setOnboarding(!complete);
            setAuthenticated(complete);
          }).catch(() => { setOnboarding(true); setAuthenticated(false); });
        } else {
          try {
            localStorage.removeItem('pardaisLiteAuth');
            localStorage.removeItem('pardaisLiteUserId');
          } catch {}
        }
        });
        setAuthReady(true);
      } catch {
        if (mounted) setAuthReady(true);
      }
    };
    void startAuth();
    fallbackTimer = window.setTimeout(() => { if (mounted) setAuthReady(true); }, 5000);
    return () => {
      mounted = false;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!splash) return;
    const timer = window.setTimeout(() => {
      setSplash(false);
      try { localStorage.setItem('pardaisLiteSplashSeen', '1'); } catch {}
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [splash]);

  useEffect(() => {
    if (!authenticated) return;
    const stateKey = 'pardais-lite-app';
    try { window.history.pushState({ pardais: stateKey }, '', window.location.href); } catch {}
    const onPopState = () => {
      const current = appNavStateRef.current;
      if (current.subPage) setSubPage(null);
      else if (current.fullPage) setFullPage(null);
      else if (current.profileOverlay) setProfileOverlay(null);
      else if (current.tab !== 'home' || current.room) { setRoom(false); nav('home'); }
      else { try { window.history.pushState({ pardais: stateKey }, '', window.location.href); } catch {} }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [authenticated]);

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
    if (next === 'create') setCreateMode('upload');
  };
  const back = () => {
    if (subPage) setSubPage(null);
    else if (room) setRoom(false);
    else nav('profile');
  };

  if (splash) return <PardaisSplash />;
  if (!authenticated && onboarding && auth.currentUser) return <GoogleOnboarding onComplete={() => { setOnboarding(false); setAuthenticated(true); }} />;
  if (!authenticated) return <AuthScreen mode={authMode} setMode={setAuthMode} onAuthenticated={() => setAuthenticated(true)} />;
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
    {tab === 'live' && <LiveScreen room={room} setRoom={setRoom} liveMode={liveMode} setLiveMode={setLiveMode} nav={nav} onGoLiveSetup={() => { setCreateMode('live'); setTab('create'); }} liveView={liveView} setLiveView={setLiveView} activeLiveRoom={activeLiveRoom} onOpenRoom={setActiveLiveRoom} onCloseRoom={() => setActiveLiveRoom(null)} />}
    {tab === 'create' && <CreateScreen mode={createMode} camera={camera} setCamera={setCamera} onClose={() => nav('home')} onGoLive={async (options: any) => { const r = await api.post('/api/live/create', { title: 'Pardais Live', mode: options?.camOff ? 'audio' : 'video' }); setActiveLiveRoom({ ...r.data.room, agora: r.data.agora, isHost: true }); setTab('live'); }} />}
    {tab === 'inbox' && <InboxScreen />}
    {tab === 'profile' && <ProfileScreen onSettings={() => setSubPage('settings')} onEdit={() => setSubPage('editProfile')} onFollowers={() => setSubPage('followers')} onShare={() => setProfileOverlay('share')} onLevel={() => setFullPage('level')} profileTab={profileTab} setProfileTab={setProfileTab} onCreator={() => setSubPage('creator')} onAgency={() => setSubPage('agency')} onWallet={() => setSubPage('wallet')} />}
    {tab !== 'create' && <BottomNav tab={tab} nav={nav} />}
    {profileOverlay === 'share' && <ShareSheet onClose={() => setProfileOverlay(null)} title="Share Profile" url={`${window.location.origin}/profile/${encodeURIComponent(auth.currentUser?.uid || '')}`} text="Check out my Pardais Lite profile" />}
  </div></div>;
}

function AuthScreen({ mode, setMode, onAuthenticated }: { mode: 'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'success'; setMode: (mode: 'login' | 'signup' | 'forgot' | 'verify' | 'reset' | 'success') => void; onAuthenticated: () => void }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('pardaisLiteEmail') || ''; } catch { return ''; } });
  const [name, setName] = useState(''); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [confirmPassword,setConfirmPassword]=useState('');
  const [error,setError]=useState(''); const [remember,setRemember]=useState(false); const [showPassword,setShowPassword]=useState(false);
  const resetState=()=>{setError('');setPassword('');setConfirmPassword('');};
  const createAccount=async()=>{ setError(''); if(!name.trim()||!username.trim()||!email.trim()||!password)return setError('Please enter your name, username, email and password.'); if(!/^@[a-z0-9_]{3,20}$/i.test(username.trim()))return setError('Username must start with @ and use 3-20 letters, numbers or underscores.'); if(password.length<8)return setError('Password must be at least 8 characters.'); if(password!==confirmPassword)return setError('Passwords do not match.'); if(!remember)return setError('Please agree to the Terms & Privacy Policy.'); try{ const cred=await createUserWithEmailAndPassword(auth,email.trim(),password); await updateProfile(cred.user,{displayName:name.trim()}); await api.post('/api/auth/register',{name:name.trim(),username:username.trim().toLowerCase()}); onAuthenticated(); }catch(e:any){ const code=String(e?.code||''); setError(code==='auth/email-already-in-use'?'This email is already registered. Please Login.':String(e?.message||'Could not create account.').replace(/^Firebase:\s*/i,'')); } };
  const login=async()=>{setError('');if(!email.trim()||!password)return setError('Please enter email and password.');try{await signInWithEmailAndPassword(auth,email.trim(),password);onAuthenticated();}catch(e:any){setError(String(e?.message||'Login failed.').replace('Firebase: ',''));}};
  const googleLogin=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e:any){setError(String(e?.message||'Google sign-in failed.').replace('Firebase: ',''));}};
  const requestReset=async()=>{setError('');if(!email.trim())return setError('Please enter an email.');try{await sendPasswordResetEmail(auth,email.trim());setError('Password reset email sent. Check your inbox.');}catch(e:any){setError(String(e?.message||'Could not send reset email.').replace('Firebase: ',''));}};
  if(mode==='success')return <main className='auth-screen'><div className='auth-success'><div className='auth-success-icon'>✓</div><h1>Password Reset!</h1><p>Your password reset link has been sent.</p><button onClick={()=>{resetState();setMode('login')}}>Go to Login</button></div></main>;
  if(mode==='forgot'||mode==='verify'||mode==='reset')return <main className='auth-screen'><AuthHeader title='PARDAIS' subtitle='RESET PASSWORD' onBack={()=>{resetState();setMode('login')}}/><div className='auth-card auth-card-compact'><p>Enter your email to receive a secure Firebase password reset link.</p><AuthField label='EMAIL' value={email} type='email' placeholder='example@gmail.com' icon={<MessageSquare/>} onChange={setEmail}/><AuthError message={error}/><button className='auth-primary' onClick={()=>void requestReset()}>Send Reset Email</button></div></main>;
  return <main className='auth-screen'><div className='auth-brand'><PardaisLiteLogo compact={false}/><h1>PARDAIS</h1><span>{mode==='signup'?'CREATE ACCOUNT':'WELCOME BACK'}</span></div><div className='auth-card'>{mode==='signup'?<><p>Create your Pardais Lite account.</p><AuthField label='FULL NAME' value={name} type='text' placeholder='Your full name' icon={<UserRound/>} onChange={setName}/><AuthField label='USERNAME' value={username} type='text' placeholder='@username' icon={<UserRound/>} onChange={(v:string)=>setUsername(v.replace(/\s/g,''))}/><AuthField label='EMAIL' value={email} type='email' placeholder='example@gmail.com' icon={<MessageSquare/>} onChange={setEmail}/><AuthField label='PASSWORD' value={password} type={showPassword?'text':'password'} placeholder='Create a password' icon={<LockKeyhole/>} onChange={setPassword} show={showPassword} onToggle={()=>setShowPassword(!showPassword)}/><AuthField label='CONFIRM PASSWORD' value={confirmPassword} type='password' placeholder='Confirm your password' icon={<LockKeyhole/>} onChange={setConfirmPassword}/><label className='auth-check'><input type='checkbox' checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>I agree to the Terms & Privacy Policy</span></label><AuthError message={error}/><button className='auth-primary' onClick={()=>void createAccount()}>Create Account</button><div className='auth-footer'>Already have an account? <button type='button' onClick={()=>{resetState();window.history.replaceState({},'', '/login');setMode('login')}}>Login</button></div></>:<><AuthField label='EMAIL' value={email} type='email' placeholder='example@gmail.com' icon={<MessageSquare/>} onChange={setEmail}/><AuthField label='PASSWORD' value={password} type={showPassword?'text':'password'} placeholder='********' icon={<LockKeyhole/>} onChange={setPassword} show={showPassword} onToggle={()=>setShowPassword(!showPassword)}/><div className='auth-row'><label className='auth-check'><input type='checkbox' checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>Remember Me</span></label><button className='auth-link' onClick={()=>{resetState();setMode('forgot')}}>Forgot Password?</button></div><AuthError message={error}/><button className='auth-primary' onClick={()=>void login()}>Login</button><button className='auth-link' style={{width:'100%',marginTop:10}} onClick={()=>void googleLogin()}>Continue with Google</button><div className='auth-footer'>Don't have an account? <button type='button' onClick={()=>{resetState();window.history.replaceState({},'', '/signup');setMode('signup')}}>Sign Up</button></div></>}</div></main>;
}

function GoogleOnboarding({onComplete}:{onComplete:()=>void}){
 const user=auth.currentUser!; const [name,setName]=useState(user.displayName||''); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [error,setError]=useState(''); const [saving,setSaving]=useState(false);
 const submit=async()=>{setError(''); if(!name.trim()||!username.trim()||!password)return setError('Name, username and password are required.'); if(!/^@[a-z0-9_]{3,20}$/i.test(username.trim()))return setError('Username must start with @ and use 3-20 letters, numbers or underscores.'); if(password.length<8)return setError('Password must be at least 8 characters.'); if(password!==confirm)return setError('Passwords do not match.'); setSaving(true); try{await updatePassword(user,password);await updateProfile(user,{displayName:name.trim()});await api.post('/api/auth/register',{name:name.trim(),username:username.trim().toLowerCase(),avatar:user.photoURL||null});onComplete();}catch(e:any){setError(String(e?.message||'Could not complete registration.').replace('Firebase: ',''));}finally{setSaving(false)}};
 return <main className='auth-screen'><div className='auth-brand'><PardaisLiteLogo compact/><h1>COMPLETE REGISTRATION</h1><span>CONTINUE WITH GOOGLE</span></div><div className='auth-card'><p>Your Google account is connected. Create your Pardais Lite password and username once. Your username cannot be changed later.</p><AuthField label='NAME' value={name} type='text' placeholder='Your name' icon={<UserRound/>} onChange={setName}/><AuthField label='USERNAME' value={username} type='text' placeholder='@username' icon={<UserRound/>} onChange={(v:string)=>setUsername(v.replace(/\s/g,''))}/><AuthField label='PASSWORD' value={password} type='password' placeholder='Create password' icon={<LockKeyhole/>} onChange={setPassword}/><AuthField label='CONFIRM PASSWORD' value={confirm} type='password' placeholder='Confirm password' icon={<LockKeyhole/>} onChange={setConfirm}/><AuthError message={error}/><button className='auth-primary' disabled={saving} onClick={()=>void submit()}>{saving?'Saving...':'Continue to Pardais'}</button></div></main>;
}

function AuthHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) { return <div className='auth-header'><button onClick={onBack}><ChevronLeft /></button><div><h1>{title}</h1><span>{subtitle}</span></div></div>; }
function AuthField({ label, value, type, placeholder, icon, onChange, show, onToggle }: any) { return <label className='auth-field'><span>{label}</span><div><span className='auth-field-icon'>{icon}</span><input value={value} type={type} placeholder={placeholder} onChange={e => onChange(e.target.value)} /><span>{onToggle ? <button type='button' className='auth-eye' onClick={onToggle}>{show ? '◉' : '◌'}</button> : null}</span></div></label>; }
function AuthError({ message }: { message: string }) { return message ? <div className='auth-error'>{message}</div> : null; }

function HomeScreen({ homeMode, setHomeMode, onSearch }: any) {
  const [items,setItems]=useState<any[]>([]);
  const [index,setIndex]=useState(0);
  const [comments,setComments]=useState<any[]>([]);
  const [commentText,setCommentText]=useState('');
  const [commentOpen,setCommentOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const feedRef=useRef<HTMLDivElement|null>(null);
  const load=async()=>{try{const r=await api.get(`/api/feed?mode=${homeMode.toLowerCase().replace(' ','-')}`);setItems(r.data?.items||[]);}catch{setItems([])}};
  useEffect(()=>{void load();},[homeMode]);
  useEffect(()=>{const el=feedRef.current;if(!el)return;const onScroll=()=>{const h=el.clientHeight;setIndex(Math.max(0,Math.min(items.length-1,Math.round(el.scrollTop/h))))};el.addEventListener('scroll',onScroll,{passive:true});return()=>el.removeEventListener('scroll',onScroll)},[items.length]);
  const reel=items[index];
  const like=async()=>{if(!reel)return;try{const r=await api.post(`/api/reels/${reel.id}/like`);setItems(v=>v.map(x=>x.id===reel.id?{...x,likesCount:r.data.likesCount,likedByMe:r.data.liked}:x))}catch{}};
  const save=async()=>{if(!reel)return;try{const r=await api.post(`/api/reels/${reel.id}/save`);setItems(v=>v.map(x=>x.id===reel.id?{...x,savedByMe:r.data.saved}:x));setMenuOpen(false)}catch{}};
  const loadComments=async()=>{if(!reel)return;try{const r=await api.get(`/api/comments/${encodeURIComponent(reel.id)}`);setComments(r.data?.items||[])}catch{setComments([])}};
  const sendComment=async()=>{if(!reel||!commentText.trim())return;try{await api.post('/api/comments',{targetId:reel.id,text:commentText.trim()});setCommentText('');await loadComments()}catch{}};
  const download=async()=>{if(!reel)return;try{const a=document.createElement('a');a.href=reel.mediaUrl;a.download=`pardais-${reel.id}.mp4`;a.target='_blank';document.body.appendChild(a);a.click();a.remove();setMenuOpen(false)}catch{window.open(reel.mediaUrl,'_blank')}};
  const deleteReel=async()=>{if(!reel||reel.userId!==auth.currentUser?.uid)return;try{await api.delete(`/api/reels/${reel.id}`);setItems(v=>v.filter(x=>x.id!==reel.id));setMenuOpen(false)}catch{}}
  const makePrivate=async()=>{if(!reel||reel.userId!==auth.currentUser?.uid)return;try{await api.patch(`/api/reels/${reel.id}`,{status:'private'});setItems(v=>v.filter(x=>x.id!==reel.id));setMenuOpen(false)}catch{}}
  return <main className='reel-screen home-feed-screen'>
    <div className='reel-top home-feed-top'><button className={homeMode==='Following'?'tab active':'tab muted'} onClick={()=>setHomeMode('Following')}>Following</button><button className={homeMode==='For You'?'tab active':'tab muted'} onClick={()=>setHomeMode('For You')}>For You</button><button className='search-icon' onClick={onSearch}><Search/></button></div>
    {!items.length?<div className='following-empty'><Video/><b>No videos yet</b><span>Real published reels will appear here.</span></div>:<div ref={feedRef} className='reel-feed-scroll'>{items.map((r,i)=><section className='reel-stage home-reel-stage' key={r.id} onDoubleClick={()=>void like()}>
      <video src={r.mediaUrl} controls={false} autoPlay={i===index} muted loop playsInline className='home-reel-video'/><div className='reel-overlay'/>
      <div className='reel-author-block'><div className='home-dp'>{r.author?.avatar?<img src={r.author.avatar} alt=''/>:<span>{String(r.author?.name||'P').slice(0,1).toUpperCase()}</span>}</div></div>
      <div className='reel-actions reference-reel-actions'><button onClick={()=>void like()}><Heart fill={r.likedByMe?'currentColor':'none'}/><span>{r.likesCount||0}</span></button><button onClick={()=>{setCommentOpen(true);void loadComments()}}><MessageCircle/><span>{r.commentsCount||0}</span></button><button onClick={()=>void save()}><Bookmark fill={r.savedByMe?'currentColor':'none'}/><span>Save</span></button><button onClick={()=>{setMenuOpen(true)}}><MoreHorizontal/><span>More</span></button></div>
      <div className='reel-meta reference-reel-meta'><div className='reel-user-line'><b>{r.author?.name||'Pardais User'}</b><button onClick={()=>void api.post('/api/follow',{followingId:r.userId,action:'follow'})}>Follow</button></div><p>{r.caption||''}</p>{Array.isArray(r.hashtags)&&r.hashtags.length>0&&<div className='reel-hashtags'>{r.hashtags.map((h:string)=><span key={h}>#{h.replace(/^#/,'')}</span>)}</div>}</div>
      {menuOpen&&i===index&&<div className='reel-more-menu'><button onClick={download}>Download</button><button onClick={save}>{r.savedByMe?'Remove from Saved':'Save'}</button>{r.userId===auth.currentUser?.uid&&<><button onClick={makePrivate}>Make Private</button><button className='danger' onClick={deleteReel}>Delete Video</button></>}</div>}
    </section>)}</div>}
    {commentOpen&&<div className='center-modal-backdrop' onClick={e=>{if(e.target===e.currentTarget)setCommentOpen(false)}}><div className='auth-card reel-comments'><div className='modal-head'><h2>Comments</h2><button onClick={()=>setCommentOpen(false)}><X/></button></div><div className='comments-list'>{comments.map(c=><div className='comment-row' key={c.id}><div className='comment-avatar'>{String(c.userId||'P').slice(0,1).toUpperCase()}</div><div><b>{c.name||'User'}</b><p>{c.text}</p></div></div>)}</div><div className='home-comment-input'><input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder='Add a comment...'/><button onClick={()=>void sendComment()}><Send/></button></div></div></div>}
  </main>;
}

function LiveScreen({ room, setRoom, liveMode, setLiveMode, nav, onGoLiveSetup, liveView, setLiveView, activeLiveRoom, onOpenRoom, onCloseRoom }: any) {
  const [rooms, setRooms] = useState<any[]>([]);
  useEffect(() => { void api.get('/api/live/rooms').then(r => setRooms(r.data?.rooms ?? [])).catch(() => setRooms([])); }, [activeLiveRoom]);
  if (activeLiveRoom) return <AgoraLiveRoom room={activeLiveRoom} onClose={onCloseRoom} />;

  return <main className='live-page'>
    <div className='live-header'><h1>Discover</h1><div className='header-actions'><button className='go-live' onClick={onGoLiveSetup}><Zap /> Go Live</button><button className='round-search'><Search /></button></div></div>
    <div className='live-tabs'>{(['For You','PK','Following'] as const).map(x => <button key={x} className={liveMode === x ? 'live-tab selected' : 'live-tab'} onClick={() => setLiveMode(x)}>{x === 'PK' ? '⚔ PK' : x}</button>)}</div>
    {liveMode === 'PK' ? <div className='pk-discover-card'><div className='pk-live-pill'>● LIVE</div><div className='pk-timer'>PK</div><div className='pk-discover-side left'><div className='pk-discover-avatar'>⚔</div><b>PK Battles</b><span>Live</span></div><div className='pk-discover-mark'>PK</div><div className='pk-discover-side right'><div className='pk-discover-avatar'>⚡</div><b>Join a battle</b><span>Now</span></div></div> : rooms.length ? <div className='live-grid'>{rooms.map((r:any) => <button className='live-card' key={r.id} onClick={async () => { try { const join = await api.post('/api/live/join', { roomId: r.id }); onOpenRoom({ ...r, agora: join.data.agora, isHost: false }); } catch {} }}><div className='card-top'><span className='mode-logo'>{String(r.mode || 'LIVE').toUpperCase()}</span><small>LIVE</small></div><div className='host-ring'><span>{String(r.host?.name || 'P').slice(0,1)}</span></div><div className='card-name'>{r.host?.name || 'Pardais Host'}</div><div className='card-bottom'><span>{r.title || 'Pardais Live'}</span><b>🟢</b></div></button>)}</div> : <div className='following-empty' style={{position:'relative',inset:'auto',minHeight:320}}><Video/><b>No live rooms</b><span>Live rooms will appear here when real hosts go live.</span></div>}
  </main>;
}

function CreateScreen({ mode='upload', onClose, onGoLive }: any) {
 const videoRef=useRef<HTMLVideoElement|null>(null); const streamRef=useRef<MediaStream|null>(null); const recorderRef=useRef<MediaRecorder|null>(null); const chunksRef=useRef<Blob[]>([]);
 const [step,setStep]=useState<1|2|3>(1); const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(''); const [micOn,setMicOn]=useState(true); const [camOn,setCamOn]=useState(true); const [facing,setFacing]=useState<'user'|'environment'>('user'); const [zoom,setZoom]=useState(1); const [effect,setEffect]=useState(false); const [recording,setRecording]=useState(false); const [uploading,setUploading]=useState(false); const [caption,setCaption]=useState(''); const [location,setLocation]=useState(''); const [hashtags,setHashtags]=useState(''); const [visibility,setVisibility]=useState<'public'|'private'>('public'); const [allowComments,setAllowComments]=useState(true); const [error,setError]=useState(''); const [draftSaved,setDraftSaved]=useState(false); const isLive=mode==='live';
 const stopStream=()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null};
 const startCamera=async(nextFacing=facing)=>{stopStream();try{const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:nextFacing},width:{ideal:1080},height:{ideal:1920}},audio:true});streamRef.current=st;if(videoRef.current){videoRef.current.srcObject=st;await videoRef.current.play()}setCamOn(true);setMicOn(true)}catch{setError('Camera/microphone permission is required.');setCamOn(false);setMicOn(false)}};
 useEffect(()=>{if(step===1&&!preview)void startCamera('user');return()=>{if(step!==1)stopStream()}},[step]);
 useEffect(()=>()=>{stopStream();if(preview)URL.revokeObjectURL(preview)},[]);
 const chooseFile=(f?:File)=>{if(!f||!f.type.startsWith('video/'))return;setFile(f);setPreview(URL.createObjectURL(f));setStep(2)};
 const recordStart=()=>{if(!streamRef.current||recording)return;try{const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';const rec=new MediaRecorder(streamRef.current,mime?{mimeType:mime}:undefined);chunksRef.current=[];rec.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:rec.mimeType||'video/webm'});const f=new File([blob],`pardais-${Date.now()}.webm`,{type:blob.type});setFile(f);setPreview(URL.createObjectURL(blob));setStep(2)};rec.start();recorderRef.current=rec;setRecording(true)}catch{setError('Video recording is not available.')}};
 const recordStop=()=>{recorderRef.current?.stop();recorderRef.current=null;setRecording(false)};
 const uploadFinal=async(status:'published'|'draft')=>{if(!file)return;setUploading(true);try{const p=await api.post('/api/media/presign',{fileName:file.name,contentType:file.type});const put=await fetch(p.data.url,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!put.ok)throw new Error('R2 upload failed');await api.post('/api/reels',{key:p.data.key,mediaUrl:p.data.publicUrl,caption,location,hashtags:hashtags.split(/[ ,]+/).map(x=>x.replace(/^#/,'')).filter(Boolean).slice(0,5),status,visibility,allowComments});setDraftSaved(status==='draft');if(status==='published'){window.alert('Video posted successfully.');onClose()}else{window.alert('Draft saved to your profile.');onClose()}}catch(e:any){window.alert(e?.message||'Video upload failed.')}finally{setUploading(false)}};
 const filterStyle={filter:effect?'contrast(1.08) saturate(1.22) brightness(1.04)':'none',transform:`scaleX(${facing==='user'?-1:1}) scale(${0.84 * zoom})`};
 if(isLive)return <main className='camera-screen go-live-screen'><div className='camera-preview'><button className='camera-close' onClick={onClose}><X/></button><div className='camera-mode'><span className='ready-dot'/> Ready</div><video ref={videoRef} muted playsInline className='capture-preview' style={filterStyle}/>{!camOn&&<div className='camera-off-preview'><VideoOff/><span>Camera is off</span></div>}<div className='live-reference-controls'><button onClick={()=>{const n=facing==='user'?'environment':'user';setFacing(n);void startCamera(n)}}><span className='control-symbol'>↻</span><small>Flip</small></button><button onClick={()=>setEffect(v=>!v)}><Sparkles/><small>Beauty</small></button><button onClick={()=>{const t=streamRef.current?.getAudioTracks()[0];if(t){t.enabled=!micOn;setMicOn(!micOn)}}}><Mic/><small>{micOn?'Mute':'Unmute'}</small></button><button className={!camOn?'live-cam-off':''} onClick={()=>{const t=streamRef.current?.getVideoTracks()[0];if(t){t.enabled=!camOn;setCamOn(!camOn)}}}>{camOn?<Camera/>:<VideoOff/>}<small>{camOn?'Cam':'Cam Off'}</small></button></div><button className='go-live-reference-button' onClick={()=>void onGoLive({camOff:!camOn,muted:!micOn,facing})}>● Go Live</button></div></main>;
 if(step===1)return <main className='camera-screen upload-video-screen'><div className='camera-preview'><button className='camera-close' onClick={onClose}><X/></button><div className='camera-mode'><Palette/> Normal</div><div className='camera-side'><button onClick={()=>{const n=facing==='user'?'environment':'user';setFacing(n);void startCamera(n)}}><span>↻</span><small>Flip</small></button><button onClick={()=>setEffect(v=>!v)}><Sparkles/><small>{effect?'On':'Off'}</small></button><button onClick={()=>{const t=streamRef.current?.getVideoTracks()[0];if(t){t.enabled=!camOn;setCamOn(!camOn)}}}><VideoOff/><small>{camOn?'Cam':'Off'}</small></button><button onClick={()=>setZoom(z=>z>=2?1:z+.5)}><b>{zoom}x</b><small>Zoom</small></button></div><video ref={videoRef} muted playsInline className='capture-preview' style={filterStyle}/>{!camOn&&<div className='camera-off-preview'><VideoOff/><span>Camera is off</span></div>}{error&&<div className='camera-error'>{error}</div>}<div className='camera-bottom'><button onClick={()=>document.getElementById('pardais-video-file')?.click()}><ImageIcon/><small>Gallery</small></button><div className='shutter-wrap'><button className={`shutter ${recording?'recording':''}`} onPointerDown={recordStart} onPointerUp={recordStop} onPointerCancel={recordStop}/><small>{recording?'Recording…':'Tap for Photo · Hold for Video'}</small></div><button onClick={()=>setEffect(v=>!v)}><Palette/><small>Effects</small></button></div><input id='pardais-video-file' type='file' accept='video/*' hidden onChange={e=>chooseFile(e.target.files?.[0])}/></div></main>;
 if(step===2)return <main className='editor-screen'><button className='editor-close' onClick={onClose}><X/></button><button className='editor-next' onClick={()=>setStep(3)}>Next</button><video src={preview} autoPlay loop muted playsInline className='editor-preview' style={{filter:effect?'contrast(1.08) saturate(1.22)':''}}/><div className='editor-tools'><button onClick={()=>setCaption(caption||'My Pardais video')}>T Text</button><button onClick={()=>setEffect(v=>!v)}><Sparkles/> Effects</button><button onClick={()=>setEffect(v=>!v)}>◉ Filters</button></div></main>;
 return <main className='post-compose-screen'><header><button onClick={()=>setStep(2)}><ChevronLeft/></button><h1>New Post</h1><button onClick={()=>void uploadFinal('published')} disabled={uploading}>⇩</button></header><div className='post-body'><div className='post-preview-row'><video src={preview} muted playsInline/><textarea value={caption} onChange={e=>setCaption(e.target.value.slice(0,250))} placeholder='Describe your post...'/></div><div className='post-count'>{caption.length}/250</div><label className='post-card'><span>📍</span><div><b>Add Location</b><small><input value={location} onChange={e=>setLocation(e.target.value)} placeholder='Tap to add location to your post'/></small></div></label><section className='post-card hashtags-card'><div className='section-title'><b>#Hashtags</b><span>{Math.min(5,hashtags.split(/[ ,]+/).filter(Boolean).length)}/5 selected</span></div><input value={hashtags} onChange={e=>setHashtags(e.target.value)} placeholder='Add custom hashtags...'/><div className='trending'><span onClick={()=>setHashtags(v=>v+' viral')}>#viral 🔥</span><span onClick={()=>setHashtags(v=>v+' pardais')}>#pardais 🔥</span><span onClick={()=>setHashtags(v=>v+' fyp')}>#fyp 🔥</span><span onClick={()=>setHashtags(v=>v+' live')}>#live 🔥</span><span onClick={()=>setHashtags(v=>v+' reels')}>#reels</span></div></section><section className='post-card privacy-card'><div className='privacy-row'><b>Who can watch this post?</b><div><button className={visibility==='public'?'selected':''} onClick={()=>setVisibility('public')}>Public</button><button className={visibility==='private'?'selected':''} onClick={()=>setVisibility('private')}>Private</button></div></div><div className='privacy-row'><b>Allow Comments</b><button className={`toggle ${allowComments?'on':''}`} onClick={()=>setAllowComments(v=>!v)}><i/></button></div></section></div><footer><button onClick={()=>void uploadFinal('draft')} disabled={uploading}>⇩ Save Draft</button><button onClick={()=>void uploadFinal('published')} disabled={uploading}>{uploading?'Posting…':'➤ Post'}</button></footer></main>;
}

function InboxScreen() {
 const [chats,setChats]=useState<any[]>([]); const [chatOpen,setChatOpen]=useState<any|null>(null); const [query,setQuery]=useState('');
 useEffect(()=>{void api.get('/api/chats').then(r=>setChats(r.data?.items||[])).catch(()=>setChats([]))},[]);
 if(chatOpen)return <ChatDetailPage name={chatOpen.name} peerId={chatOpen.userId} onBack={()=>setChatOpen(null)}/>;
 const visible=chats.filter(x=>`${x.name} ${x.username}`.toLowerCase().includes(query.toLowerCase()));
 return <main className='page dark-page chats-page'><h1>Chats</h1><div className='chat-search'><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Search...'/></div><div className='chat-tabs'><button className='selected'>All</button><button>Unread</button></div>{visible.length?<div className='chat-list'>{visible.map(x=><button className='chat-row' key={x.userId} onClick={()=>setChatOpen(x)}><span className='chat-avatar'>{x.avatar?<img src={x.avatar} alt=''/>:'P'}</span><span className='chat-copy'><b>{x.name}</b><small>{x.lastMessage}</small></span><time>{x.createdAt?new Date(x.createdAt).toLocaleDateString():''}</time></button>)}</div>:<div className='empty-state'><MessageCircle/><b>No chats yet</b><span>Your real conversations will appear here.</span></div>}</main>;
}

function ProfileScreen({ onSettings, onEdit, onFollowers, onShare, onLevel, profileTab, setProfileTab, onCreator, onAgency, onWallet }: any) {
  const [user, setUser] = useState<any>(null); const [stats,setStats]=useState({followers:0,following:0,likes:0});
  const userId = auth.currentUser?.uid || '';
  useEffect(() => { if (userId) { void api.get(`/api/users/${encodeURIComponent(userId)}`).then(r=>setUser(r.data?.user)).catch(()=>{}); void api.get(`/api/profile/${encodeURIComponent(userId)}/stats`).then(r=>setStats(r.data?.stats||{followers:0,following:0,likes:0})).catch(()=>{}); } }, [userId]);
  const displayName = user?.name || auth.currentUser?.displayName || 'Pardais User';
  return <main className="page profile-page"><div className="profile-header"><h1>Profile</h1><div><button onClick={onEdit}><Edit3 /></button><button onClick={onShare}><Share2 /></button><button><Bell /></button><button onClick={onSettings}><Settings /></button></div></div>
    <div className="profile-identity"><div className="profile-avatar">{user?.avatar ? <img src={user.avatar} alt="" /> : 'P'}</div><div className="verified">✓</div><h2>{displayName}</h2><div className="handle">@{user?.username || userId.slice(0, 10)} <Copy size={15} /></div><p>{user?.bio || 'No bio yet'}</p><button className="profile-level-chip" onClick={onLevel}><span>Lv</span><b>{user?.level || 1}</b><small>Pardais Member</small><ChevronRight /></button></div>
    <div className="stats"><button onClick={onFollowers}><b>{stats.following}</b><span>FOLLOWING</span></button><button onClick={onFollowers}><b>{stats.followers}</b><span>FOLLOWERS</span></button><div><b>{stats.likes}</b><span>LIKES</span></div></div>
    <div className="profile-cards"><button onClick={onCreator}><span className="card-icon"><Zap /></span><div><b>Creator Center</b><small>Withdraw · Earnings · Analytics</small></div><ChevronRight /></button><button onClick={onAgency}><span className="card-icon"><Users /></span><div><b>Agency Center</b><small>Join Agency & Grow Faster</small></div><ChevronRight /></button><button onClick={onWallet}><span className="card-icon"><WalletCards /></span><div><b>My Wallet</b><small>Top up coins & manage earnings</small></div><ChevronRight /></button></div>
    <div className="profile-tabs"><button className={profileTab === 'Public' ? 'selected' : ''} onClick={() => setProfileTab('Public')}><Globe2 /> Public</button><button className={profileTab === 'Private' ? 'selected' : ''} onClick={() => setProfileTab('Private')}>♧ Private</button><button className={profileTab === 'Saved' ? 'selected' : ''} onClick={() => setProfileTab('Saved')}><Bookmark /> Saved</button><button className={profileTab === 'Drafts' ? 'selected' : ''} onClick={() => setProfileTab('Drafts')}>Drafts</button></div><ProfileVideoArea mode={profileTab} /></main>;
}

function ProfileVideoArea({ mode }: { mode: 'Public' | 'Private' | 'Saved' | 'Drafts' }) { const [videos,setVideos]=useState<any[]>([]); const uid=auth.currentUser?.uid||''; useEffect(()=>{const load=async()=>{try{if(mode==='Saved'){const r=await api.get('/api/reels?mine=0');setVideos((r.data?.items||[]).filter((x:any)=>x.savedByMe));return}const r=await api.get('/api/reels?mine=1');setVideos((r.data?.items||[]).filter((x:any)=>mode==='Public'?x.status==='published'&&x.visibility!=='private':mode==='Private'?x.status==='published'&&x.visibility==='private':x.status==='draft'))}catch{setVideos([])}};void load()},[mode,uid]); const publish=async(id:string)=>{try{await api.patch(`/api/reels/${id}`,{status:'published',visibility:'public'});setVideos(v=>v.filter(x=>x.id!==id))}catch{}}; const remove=async(id:string)=>{try{await api.delete(`/api/reels/${id}`);setVideos(v=>v.filter(x=>x.id!==id))}catch{}}; return <div className='profile-video-area'>{videos.length?<div className='video-grid'>{videos.map(v=><div key={v.id} className='video-tile' onContextMenu={e=>{e.preventDefault();if(mode!=='Saved')void remove(v.id)}}><video src={v.mediaUrl} muted playsInline preload='metadata'/><div className='video-play-overlay'><Video/><span>{v.viewsCount||v.views||0}</span></div>{mode==='Drafts'&&<button className='draft-publish' onClick={()=>void publish(v.id)}>Publish</button>}{mode!=='Saved'&&<button className='tile-delete' onClick={()=>void remove(v.id)}><Trash2/></button>}</div>)}</div>:<div className='empty-state'><Video/><b>No {mode.toLowerCase()} videos</b><span>{mode==='Drafts'?'Saved drafts will appear here.':'Uploaded production videos will appear here.'}</span></div>}</div>; }

function FindFriendsPage({ onClose }: { onClose: () => void }) { const [query,setQuery]=useState(''); const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(false); useEffect(()=>{if(!query.trim()){setItems([]);return}setLoading(true);void api.get(`/api/users/search?q=${encodeURIComponent(query.trim())}`).then(r=>setItems(r.data?.items||[])).catch(()=>setItems([])).finally(()=>setLoading(false))},[query]); return <main className='full-dark-page find-friends-page'><header className='simple-page-head'><button onClick={onClose}><ChevronLeft/></button><h1>Find Friends</h1><span/></header><div className='friend-search'><Search/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder='Search username...'/></div>{loading?<div className='empty-state'>Searching…</div>:items.length?<div className='friend-list'>{items.map(u=><div className='friend-row' key={u.id}><span className='friend-avatar'>{u.avatar?'':'P'}</span><div className='friend-info'><b>{u.name}</b><small>{u.username}</small></div></div>)}</div>:<div className='empty-state'><Users/><b>{query?'No users found':'Search real users'}</b><span>Only registered Pardais accounts appear here.</span></div>}</main>; }

function UserProfilePage({ user, following, onFollow, onBack }: any) { const targetId=String(user?.id||''); const [data,setData]=useState<any>(null); useEffect(()=>{if(targetId)void api.get(`/api/users/${encodeURIComponent(targetId)}`).then(r=>setData(r.data?.user)).catch(()=>{})},[targetId]); return <main className='full-dark-page user-profile-page'><header className='simple-page-head'><button onClick={onBack}><ChevronLeft/></button><h1>Profile</h1><span/></header><section className='user-hero'><div className='user-big-avatar'>{data?.avatar?<img src={data.avatar} alt=''/>:'P'}</div><h2>{data?.name||'Pardais User'}</h2><p>{data?.username||''}</p><div className='user-actions'><button className={following?'following-btn':'follow-btn'} onClick={onFollow}>{following?'Following':'Follow'}</button></div></section></main>; }

function LevelSystemPage({ onBack }: { onBack: () => void }) { const [user,setUser]=useState<any>(null); const uid=auth.currentUser?.uid||''; useEffect(()=>{void api.get(`/api/users/${encodeURIComponent(uid)}`).then(r=>setUser(r.data?.user)).catch(()=>{})},[uid]); const level=Math.max(1,Number(user?.level||1)); const levels=Array.from({length:51},(_,i)=>i); return <main className='full-dark-page level-page'><header className='simple-page-head level-head'><button onClick={onBack}><ChevronLeft/></button><h1>Level System</h1><span/></header><section className='current-level-card'><div className='level-card-title'>Level <b>{level}</b><span>Account level<br/><strong>Lv. {level}</strong></span></div><div className='level-progress'><i style={{width:`${Math.min(100,(level/50)*100)}%`}}/></div><div className='level-range'><span>1</span><span>50</span></div><div className='level-bottom'><div className='cobra-badge'>🐍<strong>{level}</strong></div><div className='next-level-box'>⭐ <span>Next Level<br/><b>{Math.min(50,level+1)}</b></span></div></div></section><div className='journey-head'><h2>Level Journey</h2><span>Scroll to view</span></div><div className='level-journey'>{levels.map(n=><button key={n} className={n===level?'level-badge current':n>0&&n<level?'level-badge unlocked':'level-badge'}><span>{n}</span><small>LV.{n}</small></button>)}</div></main>; }

function ChatDetailPage({name,peerId,onBack}:any){ const [items,setItems]=useState<any[]>([]); const [text,setText]=useState(''); const uid=auth.currentUser?.uid||''; const load=async()=>{try{const r=await api.get(`/api/messages/${encodeURIComponent(peerId)}`);setItems(r.data?.items||[])}catch{setItems([])}}; useEffect(()=>{void load()},[peerId]); const send=async()=>{const t=text.trim();if(!t)return;try{await api.post('/api/messages',{receiverId:peerId,text:t});setText('');await load()}catch{}}; return <main className='page dark-page chat-detail'><header className='simple-page-head'><button onClick={onBack}><ChevronLeft/></button><h1>{name}</h1><span/></header><div className='chat-messages'>{items.map((m:any)=><div key={m.id} className={m.senderId===uid?'message mine':'message'}>{m.text}</div>)}</div><div className='comment-input'><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send()}} placeholder='Message...'/><button onClick={()=>void send()}><Send/></button></div></main>;}

function SettingsPage({ onBack, onNotifications, onLevel, onWallet, onBlocked }: any) {
  const [privateAccount, setPrivateAccount] = useState(false);
  const [language, setLanguage] = useState('English');
  const [message, setMessage] = useState('');
  const userId = auth.currentUser?.uid || '';
  useEffect(() => { void api.get(`/api/settings/${userId}`).then(r => { setPrivateAccount(Boolean(r.data?.settings?.privateAccount)); setLanguage(String(r.data?.settings?.language ?? 'English')); }).catch(() => {}); }, []);
  const save = async (patch: Record<string, unknown>) => { try { await api.put(`/api/settings/${userId}`, patch); setMessage('Settings saved.'); } catch { setMessage('Could not save setting.'); } };
  const logout = () => { void signOut(auth); };
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

function NotificationsPage({ onBack }: any) { const [items,setItems]=useState<any[]>([]); const uid=auth.currentUser?.uid||''; useEffect(()=>{void api.get(`/api/notifications/${encodeURIComponent(uid)}`).then(r=>setItems(r.data?.items||[])).catch(()=>setItems([]))},[uid]); return <SubLayout title="Notifications" onBack={onBack} right="Mark all read">{items.length?<div className="notifications-list">{items.map((x:any)=><div className="notification-item" key={x.id}><div className="notification-avatar">{x.type==='gift'?'🎁':'P'}</div><div className="notification-copy"><b>{x.type||'Notification'}</b><p>{x.message||''}</p><small>{x.createdAt?new Date(x.createdAt).toLocaleString():''}</small></div>{!x.read&&<i className="unread-dot"/>}</div>)}</div>:<div className="empty-state"><Bell/><b>No notifications</b><span>New follows, gifts and account activity will appear here.</span></div>}</SubLayout>; }

function EditProfilePage({ onBack }: any) {
  const userId = auth.currentUser?.uid || '';
  const [form, setForm] = useState({ firstName: '', lastName: '', gender: '', dateOfBirth: '', bio: '', whatsapp: '', facebook: '', instagram: '', youtube: '' });
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
  const userId = auth.currentUser?.uid || '';
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
  return <SubLayout title={auth.currentUser?.displayName || 'Profile'} onBack={onBack} right={<Search />}>
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

const PaperclipIcon = Paperclip;
const MicIcon = Mic;

function CreatorCenterPage({ onBack }: any) {
  const [earnings, setEarnings] = useState(0);
  const [message, setMessage] = useState('');
  const [historyTab, setHistoryTab] = useState<'All' | 'Received' | 'Exchange'>('All');
  const [transactions, setTransactions] = useState<any[]>([]);
  const userId = auth.currentUser?.uid || '';
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

function CoinSellerAgencyPage({ onBack }: any) {
  const [balance,setBalance]=useState(0); const [history,setHistory]=useState<any[]>([]); const [users,setUsers]=useState<any[]>([]); const [query,setQuery]=useState(''); const [amount,setAmount]=useState(''); const [pin,setPin]=useState(''); const [message,setMessage]=useState(''); const userId=auth.currentUser?.uid||'';
  const load=async()=>{try{const [w,h]=await Promise.all([api.get(`/api/wallet/${userId}`),api.get(`/api/wallet/${userId}/transactions`)]);setBalance(Number(w.data?.wallet?.coins||0));setHistory(h.data?.items||[]);}catch{setMessage('Unable to load agency wallet.')}};
  useEffect(()=>{void load()},[]);
  useEffect(()=>{if(!query.trim()){setUsers([]);return} void api.get(`/api/users/search?q=${encodeURIComponent(query.trim())}`).then(r=>setUsers(r.data?.items||[])).catch(()=>setUsers([]))},[query]);
  const transfer=async(target:any)=>{const coins=Number(amount);if(!target?.id||!Number.isInteger(coins)||coins<=0||!/^[0-9]{4}$/.test(pin)){setMessage('Enter a valid user, whole coin amount and 4-digit PIN.');return} try{const r=await api.post('/api/wallet/transfer',{userId,receiverId:target.id,receiverUsername:target.username,coins,pin});setMessage(`${coins} coins transferred to ${target.username}.`);setAmount('');setPin('');setQuery('');setUsers([]);setBalance(Number(r.data?.balance??balance-coins));await load()}catch{setMessage('Transfer failed. Check balance, username and PIN.')}};
  return <SubLayout title="Coin Seller Agency" onBack={onBack}>
    <div className="wallet-balance"><span>Available Balance</span><strong>🪙 {balance.toLocaleString()}</strong><WalletCards /></div>
    {message&&<div className="transfer-success"><div>✓</div><p>{message}</p></div>}
    <label className="transfer-label">SEARCH USER</label><div className="transfer-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="@username"/><span>Real users</span></div>
    {users.length>0&&<div className="user-search-results">{users.map((u:any)=><div key={u.id} className="selected-transfer-user"><span>{u.avatar||String(u.name||'P').slice(0,1)}</span><div><b>{u.name}</b><small>{u.username}</small></div><button onClick={()=>void transfer(u)}>Send</button></div>)}</div>}
    <label className="transfer-label">COINS</label><div className="coin-amount-input"><span>🪙</span><input inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,''))} placeholder="Enter coins"/></div>
    <label className="transfer-label">4-DIGIT PIN</label><input className="pin-input" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} placeholder="••••"/>
    <h2 className="transaction-title">Transaction History</h2><div className="transaction-list">{history.length?history.map((x:any,i:number)=><Transaction key={i} day={String(x.createdAt||'').slice(0,10)||'Today'} count={String(x.type||'Wallet')} amount={String(x.coins||0)}/>):<div className="empty-history">No wallet transactions yet.</div>}</div>
  </SubLayout>;
}

function HostAgencyPage({ onBack }: any) {
  const [hosts,setHosts]=useState<any[]>([]); const uid=auth.currentUser?.uid||'';
  useEffect(()=>{void api.get(`/api/following/${uid}`).then(r=>setHosts(r.data?.items||[])).catch(()=>setHosts([]))},[uid]);
  return <SubLayout title="Host Agency" onBack={onBack}>
    <div className="agency-center-intro"><div className="agency-icon">👥</div><h2>Host Agency</h2><p>Only real Pardais users are shown here.</p></div>
    <div className="host-list">{hosts.length?hosts.map((x:any)=><div className="host-row" key={x.id}><span className="host-avatar">{x.avatar||String(x.name||'P').slice(0,1)}</span><div className="host-copy"><b>{x.name}</b><small>{x.username}</small><span>Registered Pardais user</span></div><div className="host-status active">Active</div></div>):<div className="empty-state"><Users/><b>No hosts yet</b><span>Real hosts will appear here after they are registered and connected.</span></div>}</div>
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
  const userId = auth.currentUser?.uid || '';
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



function SubLayout({ title, onBack, right, children }: any) {
  return <main className="sub-page"><header className="sub-header"><button onClick={onBack}><ChevronLeft /></button><h1>{title}</h1>{right ? <button className="header-right">{typeof right === 'string' ? right : right}</button> : <span />}</header>{children}</main>;
}

function ShareSheet({ onClose, title = 'Share', url = window.location.href, text = 'Check this out on Pardais Lite' }: { onClose: () => void; title?: string; url?: string; text?: string }) {
  const [message, setMessage] = useState('');
  const copy = async () => { try { await navigator.clipboard.writeText(url); setMessage('Link copied.'); } catch { setMessage('Could not copy link.'); } };
  const share = async () => { try { if (navigator.share) { await navigator.share({ title, text, url }); setMessage('Share opened.'); } else await copy(); } catch { setMessage('Sharing cancelled.'); } };
  const external = (kind: 'whatsapp' | 'sms') => { const value = encodeURIComponent(`${text} ${url}`); window.location.href = kind === 'whatsapp' ? `https://wa.me/?text=${value}` : `sms:?body=${value}`; };
  return <div className="share-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="share-sheet"><div className="sheet-handle" /><div className="share-title"><Share2 /><b>{title}</b><button onClick={onClose}><X /></button></div>{message && <div className="transfer-success"><div>✓</div><p>{message}</p></div>}<div className='share-users'><div className='empty-state' style={{padding:10}}><span>Share with your real followers from the device share sheet.</span></div></div><div className="share-actions"><button onClick={() => external('whatsapp')}><span className="wa">◉</span><b>WhatsApp</b></button><button onClick={() => external('sms')}><span className="sms">•••</span><b>SMS</b></button><button onClick={() => void copy()}><span className="link"><Link2 /></span><b>Copy link</b></button><button onClick={() => void share()}><span className="more"><Share2 /></span><b>More / Share</b></button></div></div></div>;
}

function BottomNav({ tab, nav }: { tab: Tab; nav: (x: Tab) => void }) {
  return <nav className="bottom"><button className={tab === 'home' ? 'active' : ''} onClick={() => nav('home')}><Home /><span>Home</span></button><button className={tab === 'live' ? 'active' : ''} onClick={() => nav('live')}><Video /><span>Live</span></button><button className="create-btn" onClick={() => nav('create')}><Plus /></button><button className={tab === 'inbox' ? 'active' : ''} onClick={() => nav('inbox')}><MessageCircle /><span>Inbox</span></button><button className={tab === 'profile' ? 'active' : ''} onClick={() => nav('profile')}><UserRound /><span>Profile</span></button></nav>;
}


export default App;
