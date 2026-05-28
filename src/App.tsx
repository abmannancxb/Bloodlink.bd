/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, Component, ReactNode, ErrorInfo } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  addDoc,
  serverTimestamp,
  where,
  Timestamp,
  getDocFromServer,
  increment,
  writeBatch,
  deleteField,
  limit,
  arrayUnion,
  arrayRemove,
  getDocs
} from 'firebase/firestore';
import { 
  getToken,
  onMessage
} from 'firebase/messaging';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { auth, db, messaging } from './firebase';
export { auth, db, messaging };
import { BANGLADESH_LOCATIONS, BLOOD_GROUPS } from './constants';

import { 
  OperationType,
  UserProfile,
  BloodRequest,
  CommunityPost,
  Chat,
  ChatMessage,
  VoiceCall,
  Organization,
  OrganizationApplication,
  Report,
  PostComment,
  AdminNotification,
  Toast,
  ConfirmConfig,
  DonationRecord,
  SystemSettings,
  OrganizationMember
} from './types';
export type { 
  UserProfile, 
  BloodRequest, 
  CommunityPost, 
  Chat, 
  ChatMessage, 
  VoiceCall, 
  Organization, 
  OrganizationApplication, 
  Report, 
  PostComment, 
  AdminNotification, 
  Toast, 
  ConfirmConfig, 
  DonationRecord, 
  SystemSettings,
  OrganizationMember 
};
export { OperationType };

declare const __APP_VERSION__: string;

import { 
  Droplets, 
  MapPin, 
  Phone, 
  Plus, 
  Search, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  BellOff,
  AlertCircle,
  Calendar,
  CheckCircle,
  BadgeCheck,
  Filter,
  Zap,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Layout,
  Globe,
  MessageSquare,
  MessageCircle,
  Users,
  Send,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowLeft,
  CornerDownRight,
  Check,
  CheckCheck,
  Building,
  Trash2,
  Edit2,
  ShieldAlert,
  LayoutDashboard,
  FileText,
  Clock,
  HeartOff,
  Store,
  ShieldCheck,
  Trash,
  Menu,
  X,
  Smile,
  Navigation,
  Camera,
  Image,
  FileUp,
  FileSpreadsheet,
  Home,
  LogIn,
  Mail,
  Lock,
  Eye,
  UserPlus,
  RefreshCw,
  Sparkles,
  HardDrive,
  Megaphone,
  Info,
  Minus,
  Settings,
  Share2,
  Copy,
  Award,
  TrendingUp,
  Tag,
  Flame,
  Shield,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { defaultSeoContent } from './seoPageContent';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  Pin, 
  useAdvancedMarkerRef,
  useMapsLibrary,
  useMap
} from '@vis.gl/react-google-maps';

const API_KEY: string = 'AIzaSyD7UzE8BosYKDMUeL16AlrJIJWVEOr73pQ';
const hasValidKey = API_KEY.length > 0;

// --- Types & Helpers deleted and moved to types.ts ---

const playNotificationSound = () => {
  // 1. Try playing an external professional ping sound
  const soundUrl = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
  const audio = new Audio(soundUrl);
  audio.volume = 0.5;
  
  audio.play().catch(() => {
    // 2. Fallback to synthesized beep if external audio fails or is blocked
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      // Double ping
      playBeep(880, audioContext.currentTime, 0.1);
      playBeep(1320, audioContext.currentTime + 0.15, 0.2);
    } catch (e) {
      console.warn("Audio synthesis failed:", e);
    }
  });
};

const displayedDonors = (allUsers: UserProfile[], activeDonors: UserProfile[], filterDistrict: string, filterThana: string, filterBloodGroup: string, filterOrgId: string | null) => {
  const list = (allUsers.length > 0 ? allUsers : activeDonors);
  return list.filter(d => 
    (!filterDistrict || d.district === filterDistrict) && 
    (!filterThana || d.thana === filterThana) &&
    (!filterBloodGroup || d.bloodGroup === filterBloodGroup) &&
    (!filterOrgId || d.organizationId === filterOrgId) &&
    !d.isBlocked
  ).sort((a, b) => {
      // Sort available donors first
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return 0;
  });
};



interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const isOffline = message.includes('offline');

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (isOffline) {
    console.warn("Firestore is operating in offline mode. This is often expected during initial connection or poor network.");
    return;
  }

  // Note: Since this is outside the React context, we log it. 
  // We should prefer catching this in the components using addToast.
  console.error("Critical Firestore Error:", message);
}
export { handleFirestoreError, playNotificationSound };

// Interfaces removed, moved to types.ts

// --- Components ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(() => {
    try {
      const cached = localStorage.getItem('bloodlink_persisted_user');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });
  const [isGuest, setIsGuest] = useState(() => {
    try {
      const cached = localStorage.getItem('bloodlink_persisted_user');
      return !cached;
    } catch (_) {
      return true;
    }
  });
  const [guestBlockerActive, setGuestBlockerActive] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('bloodlink_persisted_profile');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });
  const [showMicPrompt, setShowMicPrompt] = useState<{ show: boolean, onGranted: (() => void) | null }>({ show: false, onGranted: null });
  const [micRequesting, setMicRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [globalAlerts, setGlobalAlerts] = useState<any[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeDonors, setActiveDonors] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgApplications, setOrgApplications] = useState<OrganizationApplication[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const activeChatRef = useRef<Chat | null>(null);
  const profileScrollRef = useRef<HTMLDivElement | null>(null);
  const profileTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [matchingDonorsRequest, setMatchingDonorsRequest] = useState<BloodRequest | null>(null);
  const [matchScope, setMatchScope] = useState<'area' | 'all'>('area');
  const [matchGroupFilter, setMatchGroupFilter] = useState<'exact' | 'compatible'>('exact');
  
  const handleSetActiveChat = (c: Chat | null) => {
    setActiveChat(c);
    activeChatRef.current = c;
  };
  const [unreadCount, setUnreadCount] = useState(0);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const lastSeenPostId = useRef<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('profile')) return searchParams.get('profile');
      if (searchParams.has('uid')) return searchParams.get('uid');
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (hashParams.has('uid')) return hashParams.get('uid');
      }
    } catch (e) {}
    return null;
  });
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('org')) return searchParams.get('org');
      if (searchParams.has('id')) return searchParams.get('id');
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (hashParams.has('id')) return hashParams.get('id');
      }
    } catch (e) {}
    return null;
  });
  const [filterOrgId, setFilterOrgId] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCompletingRegistration, setIsCompletingRegistration] = useState(false);
  const [isCompletingLogin, setIsCompletingLogin] = useState(false);
  const [authScreen, setAuthScreen] = useState<'login-email' | 'register'>('login-email');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // 6-digit PIN states
  const [regPin, setRegPin] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const checkUpdate = async (manual = false) => {
    if (typeof __APP_VERSION__ === 'undefined') return;
    
    if (manual) setIsCheckingUpdate(true);
    try {
      const versionUrl = new URL('/version.json', window.location.origin);
      versionUrl.searchParams.set('t', Date.now().toString());
      
      const res = await fetch(versionUrl.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.version && data.version !== __APP_VERSION__) {
        console.log("New version detected:", data.version);
        setHasUpdate(true);
        if (manual) addToast("Update Available", "A new version of the app is ready to install.", "success");
      } else if (manual) {
        addToast("Up to Date", "You are running the latest version of BloodLink.", "success");
      }
    } catch (e) {
      console.warn("Update check failed (expected if offline):", e);
      if (manual) addToast("Check Failed", "Could not reach update server. Please check your connection.", "error");
    } finally {
      if (manual) setIsCheckingUpdate(false);
    }
  };

  // Auto-Update Check (Netlify/Production)
  // This helps detect new deployments and triggers a persistent UI for update
  useEffect(() => {
    if (typeof __APP_VERSION__ !== 'undefined') {
      const interval = setInterval(() => checkUpdate(false), 5 * 60 * 1000); 
      return () => clearInterval(interval);
    }
  }, []);

  // Handle Chunk Load Errors (White Screen Prevention)
  // This happens when a new build is deployed and files listed in index.html disappear
  useEffect(() => {
    const handleError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg = 'message' in e ? e.message : (e as any).reason?.message;
      if (errorMsg && (errorMsg.includes('Failed to fetch dynamically imported module') || errorMsg.includes('Importing a module script failed'))) {
        console.warn("Chunk load failure detected. Forcing reload...");
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError as any);
    window.addEventListener('unhandledrejection', handleError as any);
    return () => {
      window.removeEventListener('error', handleError as any);
      window.removeEventListener('unhandledrejection', handleError as any);
    };
  }, []);

  const [view, setView] = useState<'requests' | 'find' | 'feed' | 'profile' | 'public-profile' | 'notifications' | 'admin' | 'post-opinion' | 'request-form' | 'admin-login' | 'chats' | 'chat-room' | 'organizations' | 'org-dashboard' | 'org-apply' | 'about' | 'contact' | 'privacy' | 'terms' | 'faq'>(() => {
    try {
      const pathParam = window.location.pathname.replace(/^\//, '');
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace('#', '');
      
      let viewKey = '';
      if (pathParam) {
        viewKey = pathParam.split('/')[0];
      }
      if (searchParams.has('view')) {
        viewKey = searchParams.get('view') || '';
      }
      if (searchParams.has('profile') || searchParams.has('uid')) {
        viewKey = 'public-profile';
      }
      if (searchParams.has('org') || searchParams.has('id')) {
        viewKey = 'org-dashboard';
      }
      if (!viewKey && hash) {
        viewKey = hash.split('?')[0];
      }

      const validViews = [
        'requests', 'find', 'feed', 'notifications', 'admin', 'chats', 
        'organizations', 'stats', 'profile', 'public-profile', 'org-dashboard', 
        'community', 'explore', 'nearby', 'home', 'about', 'contact', 'privacy',
        'terms', 'faq'
      ];

      if (viewKey) {
        let mappedView = viewKey;
        if (viewKey === 'community') {
          mappedView = 'feed';
        } else if (viewKey === 'home' || viewKey === 'explore' || viewKey === 'nearby') {
          mappedView = 'requests';
        }

        if (validViews.includes(mappedView)) {
          return mappedView as any;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 'requests';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      // Support clean paths (e.g. /community, /find, /profile)
      const pathParam = window.location.pathname.replace(/^\//, '');
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace('#', '');
      
      let viewKey = '';
      let uidParam = '';
      let orgIdParam = '';

      if (pathParam) {
        // e.g. "public-profile" or "community"
        const segments = pathParam.split('/');
        viewKey = segments[0];
      }
      
      // Look at search parameters (supports query backups)
      if (searchParams.has('view')) {
        viewKey = searchParams.get('view') || '';
      }
      if (searchParams.has('profile')) {
        viewKey = 'public-profile';
        uidParam = searchParams.get('profile') || '';
      }
      if (searchParams.has('uid')) {
        uidParam = searchParams.get('uid') || '';
      }
      if (searchParams.has('org')) {
        viewKey = 'org-dashboard';
        orgIdParam = searchParams.get('org') || '';
      }
      if (searchParams.has('id')) {
        orgIdParam = searchParams.get('id') || '';
      }

      // If nothing in path/search, fallback to hash if exists for backward compatibility
      if (!viewKey && hash) {
        const hashClean = hash.split('?')[0];
        const hashParams = new URLSearchParams(hash.split('?')[1] || '');
        viewKey = hashClean;
        if (hashParams.has('uid')) uidParam = hashParams.get('uid') || '';
        if (hashParams.has('id')) orgIdParam = hashParams.get('id') || '';
      }

      const validViews = [
        'requests', 'find', 'feed', 'notifications', 'admin', 'chats', 
        'organizations', 'stats', 'profile', 'public-profile', 'org-dashboard', 
        'community', 'explore', 'nearby', 'home', 'about', 'contact', 'privacy',
        'terms', 'faq'
      ];
      
      if (viewKey) {
        let mappedView = viewKey;
        if (viewKey === 'community') {
          mappedView = 'feed';
        } else if (viewKey === 'home' || viewKey === 'explore' || viewKey === 'nearby') {
          mappedView = 'requests';
        }

        if (validViews.includes(mappedView) || validViews.includes(viewKey)) {
          setView(mappedView as any);
          if (mappedView === 'public-profile' && uidParam) {
            setSelectedUserId(uidParam);
          }
          if (mappedView === 'org-dashboard' && orgIdParam) {
            setSelectedOrgId(orgIdParam);
          }
        }
      }
    };

    handleUrlChange();
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    if (view) {
      let urlKey = view === 'feed' ? 'community' : view === 'requests' ? 'home' : view;
      let pathName = `/${urlKey}`;
      let searchStr = '';
      
      if (view === 'public-profile' && selectedUserId) {
        searchStr = `?uid=${selectedUserId}`;
      } else if (view === 'org-dashboard' && selectedOrgId) {
        searchStr = `?id=${selectedOrgId}`;
      }

      const cleanUrl = `${pathName}${searchStr}`;
      
      // Update the address bar to ensure path segments are used without hash symbols!
      if (window.location.pathname !== pathName || window.location.search !== searchStr || window.location.hash) {
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, [view, selectedUserId, selectedOrgId]);

  useEffect(() => {
    const ephemeral = ['admin-login', 'chat-room', 'post-opinion', 'request-form', 'org-apply', 'public-profile', 'org-dashboard'];
    if (!ephemeral.includes(view)) {
      localStorage.setItem('last_view', view);
    }
  }, [view]);
  const [showNotificationConsent, setShowNotificationConsent] = useState(false);
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [showRequestsOverlay, setShowRequestsOverlay] = useState(false);
  const [mapOverviewOpen, setMapOverviewOpen] = useState(false);
  const [isFloatingWidgetClosed, setIsFloatingWidgetClosed] = useState(false);
  const [showMiddleMenu, setShowMiddleMenu] = useState(false);
  const viewRef = useRef(view);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  const mainTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const SWIPEABLE_VIEWS = ['requests', 'find', 'feed', 'profile'];
  const TABS_ORDER = [
    { view: 'requests', showRequestsOverlay: false },
    { view: 'requests', showRequestsOverlay: true },
    { view: 'find', showRequestsOverlay: false },
    { view: 'feed', showRequestsOverlay: false },
    { view: 'profile', showRequestsOverlay: false }
  ];

  const getCurrentTabIndex = () => {
    return TABS_ORDER.findIndex(tab => tab.view === view && tab.showRequestsOverlay === showRequestsOverlay);
  };

  const shouldIgnoreSwipe = (element: HTMLElement | null) => {
    let curr: HTMLElement | null = element;
    while (curr) {
      if (
        curr.id === 'map-view' || 
        curr.id === 'map' || 
        curr.getAttribute('role') === 'region' || 
        curr.classList.contains('gm-style') || 
        curr.classList.contains('map-container') ||
        curr.closest('.leaflet-container') ||
        curr.closest('.leaflet-control-container')
      ) {
        return true;
      }
      const tagName = curr.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button' || curr.getAttribute('role') === 'dialog') {
        return true;
      }
      if (curr.classList.contains('overflow-x-auto') || curr.classList.contains('overflow-x-scroll')) {
        return true;
      }
      curr = curr.parentElement;
    }
    return false;
  };
  
  const suggestedUsers = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    return allUsers
      .filter(u => u.uid !== user?.uid && !u.followers?.includes(user?.uid || ''))
      .sort((a, b) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        const aCount = a.followers?.length || 0;
        const bCount = b.followers?.length || 0;
        return bCount - aCount;
      })
      .slice(0, 10);
  }, [allUsers, user]);
  
  // Presence Tracking
  useEffect(() => {
    if (!user || !profile || isGuest) return;

    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp()
        });
      } catch (e) {
        console.error("Presence update failed", e);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // Every minute
    
    // Update on focus
    const handleFocus = () => updatePresence();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, profile, isGuest]);

  const addToast = useCallback((title: string, body: string, type: Toast['type'] = 'info', requestId?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev.slice(-4), { id, title, body, type, requestId, timestamp: Date.now() }]);
    // Auto remove after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const askConfirm = useCallback((title: string, message: string, confirmText?: string, type: ConfirmConfig['type'] = 'danger', cancelText?: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmConfig({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onResolve: (val) => {
          setConfirmConfig(null);
          resolve(val);
        }
      });
    });
  }, []);

  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<VoiceCall | null>(null);
  const [feedLimit, setFeedLimit] = useState(10);
  const [communityTab, setCommunityTab] = useState<'discover' | 'following' | 'verified'>('discover');
  const [communitySearch, setCommunitySearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [visibleDonorsCount, setVisibleDonorsCount] = useState(50);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const findEndRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for Feed and Find
  useEffect(() => {
    const feedObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && view === 'feed') {
        setFeedLimit(prev => prev + 10);
      }
    }, { threshold: 0.1 });

    const findObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && view === 'find') {
        setVisibleDonorsCount(prev => prev + 50);
      }
    }, { threshold: 0.1 });

    if (feedEndRef.current) feedObserver.observe(feedEndRef.current);
    if (findEndRef.current) findObserver.observe(findEndRef.current);

    return () => {
      feedObserver.disconnect();
      findObserver.disconnect();
    };
  }, [view]);

  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (navigator.permissions && (navigator.permissions as any).query) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as any });
          if (result.state === 'granted') return true;
          if (result.state === 'denied') {
            addToast("Mic Blocked", "Please enable microphone access in your browser settings.", 'error');
            return false;
          }
        } catch (e) {
          console.warn("Permissions API query failed", e);
        }
      }
      
      return new Promise((resolve) => {
        setShowMicPrompt({
          show: true,
          onGranted: () => {
            resolve(true);
          }
        });
      });
    } catch (e) {
      console.warn("Permission check overall error", e);
      return true;
    }
  }, [addToast]);

  const startVoiceCall = useCallback(async (targetUid: string) => {
    if (!user || !profile) {
      addToast("Action Required", "Please sign in to make calls.", 'warning');
      return;
    }

    const hasPermission = await ensureMicPermission();
    if (!hasPermission) return;

    const targetUser = allUsers.find(u => u.uid === targetUid);
    if (!targetUser) return;

    try {
      const callData = {
        callerUid: user.uid,
        callerName: profile.displayName,
        callerPhoto: profile.photoURL || "",
        receiverUid: targetUser.uid,
        receiverName: targetUser.displayName,
        receiverPhoto: targetUser.photoURL || "",
        status: 'ringing',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'calls'), callData);
      setActiveCall({ id: docRef.id, ...callData, createdAt: Timestamp.now() } as VoiceCall);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'calls');
      addToast("Call Failed", "Unable to start call.", 'error');
    }
  }, [user, profile, allUsers, addToast]);

  const logCallToChat = useCallback(async (call: VoiceCall) => {
    // Only log if it's the caller OR if it's a missed call for the receiver
    // This helps avoid doubled logs, but we need a consistent rule.
    // Let's say the caller always logs the summary when it ends,
    // and if it was "ringing" -> "ended" without connect, it's missed.
    
    // BUT since both users see the "ended" status change via the listener,
    // we should only have ONE user perform the write to Firestore.
    // Rule: The caller handles the logging.
    if (user?.uid !== call.callerUid) return;

    const chatId = [call.callerUid, call.receiverUid].sort().join('_');
    const duration = call.connectedAt && call.endedAt ? 
      Math.floor((call.endedAt.toMillis() - call.connectedAt.toMillis()) / 1000) : 0;

    let text = "";
    if (call.status === 'rejected') text = "Call Rejected";
    else if (call.status === 'busy') text = "Line Busy";
    else if (!call.connectedAt) text = "Missed Call";
    else text = `Voice Call (${Math.floor(duration/60)}:${(duration%60).toString().padStart(2, '0')})`;

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId: call.callerUid,
        text: text,
        createdAt: serverTimestamp(),
        read: false,
        type: 'call',
        callId: call.id || "unknown",
        callDuration: duration,
        callStatus: call.status || "ended"
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${call.receiverUid}`]: increment(1)
      });
    } catch (e) {
      console.error("Failed to log call to chat", e);
    }
  }, [user]);

  const endCall = useCallback(async (callId: string) => {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('NOT_FOUND'))) {
        console.error("End call failed", e);
      }
    } finally {
      setActiveCall(null);
      setIncomingCall(null);
    }
  }, []);

  const acceptCall = useCallback(async (call: VoiceCall) => {
    const hasPermission = await ensureMicPermission();
    if (!hasPermission) return;

    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'connected',
        connectedAt: serverTimestamp()
      });
      setIncomingCall(null);
      setActiveCall({ ...call, status: 'connected', connectedAt: Timestamp.now() });
    } catch (e) {
      console.error("Accept call failed", e);
      addToast("Call Error", "Unable to answer call.", 'error');
    }
  }, [addToast]);

  // Active Call Listener
  useEffect(() => {
    if (!activeCall) return;
    
    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as VoiceCall;
        const callWithId = { id: snapshot.id, ...data } as VoiceCall;
        if (data.status === 'ended' || data.status === 'rejected' || data.status === 'busy') {
          logCallToChat(callWithId);
          setActiveCall(null);
          setIncomingCall(null);
        } else if (data.status !== activeCall.status) {
          setActiveCall(callWithId);
        }
      } else {
        setActiveCall(null);
        setIncomingCall(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `calls/${activeCall.id}`));
    
    return () => unsubscribe();
  }, [activeCall]);


  const onRemoveToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  
  const onActionToast = (id: string) => {
    if (id.startsWith('chat:')) {
      const chatId = id.replace('chat:', '');
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setActiveChat(chat);
        setView('chat-room');
      } else {
        setView('chats');
      }
      return;
    }
    
    setView('requests');
    setShowRequestsOverlay(true);
    setFilterDistrict('');
    setFilterBloodGroup('');
    setFilterThana('');
  };
  
  const relevantRequests = requests.filter(r => 
    r.status === 'Pending' && 
    r.bloodGroup === profile?.bloodGroup && 
    (r.district === profile?.district || r.district === 'All') &&
    r.requesterUid !== user?.uid
  );

  const lastMatchCount = useRef(relevantRequests.length);
  
  const notifyAdmins = useCallback(async (title: string, body: string, linkView?: string) => {
    try {
      await addDoc(collection(db, 'admin_notifications'), {
        title,
        body,
        linkView,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (e) {
      console.error("Admin notification failed:", e);
    }
  }, []);

  // Voice Call Listener
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'calls'),
      where('receiverUid', '==', user.uid),
      where('status', '==', 'ringing')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Find the most recent ringing call for this user
      const incoming = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as VoiceCall))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];

      if (incoming && !activeCall && !incomingCall) {
        // Only accept if within last 60 seconds
        const callTime = incoming.createdAt?.toMillis?.() || Date.now();
        if (Date.now() - callTime < 60000) {
          setIncomingCall(incoming);
          playNotificationSound();
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'calls'));
    
    return () => unsubscribe();
  }, [user, activeCall, incomingCall]);

  // Notifications Setup
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowNotificationConsent(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Location Permission Setup
  useEffect(() => {
    // Automatic location request turned off as requested
  }, [user]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setShowNotificationConsent(false);
      if (permission === 'granted') {
        addToast("Alerts Active", "You will now receive matching blood request alerts.", 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const requestLocationPermission = () => {
    setShowLocationConsent(false);
    localStorage.setItem('location_asked', 'true');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          addToast("Location Enabled", "We've synced your location for a better map experience.", 'success');
        },
        (error) => {
          console.error("Location error:", error);
          if (error.code === 1) { // PERMISSION_DENIED
            addToast("Permission Denied", "You can still use districts to find donors manually.", 'info');
          }
        }
      );
    }
  };

  useEffect(() => {
    if (user && view === 'requests') {
      // Logic for auto-redirecting Org Admins removed as per user request
      // Org Admins should see the Home map like normal users.
    }
  }, [user, organizations, view]);

  // Load Progress Simulation
  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setLoadProgress(prev => {
          if (prev >= 98) return prev;
          const increment = Math.random() * 25; // Speed up
          return Math.min(prev + increment, 98);
        });
      }, 100); // Faster interval
      return () => clearInterval(timer);
    } else {
      setLoadProgress(100);
    }
  }, [loading]);

  // Sound Notification
  useEffect(() => {
    if (relevantRequests.length > lastMatchCount.current) {
      // Play sound
      const playBeep = () => {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {}
      };
      playBeep();
    }
    lastMatchCount.current = relevantRequests.length;
  }, [relevantRequests.length]);

  const onViewProfile = (uid: string) => {
    setSelectedUserId(uid);
    setView('public-profile');
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (await askConfirm('Delete Request?', 'This will permanently remove this blood request from the platform.', 'Delete permanently')) {
      try {
        await deleteDoc(doc(db, 'requests', requestId));
        addToast("Request Deleted", "The request has been successfully removed.", 'success');
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `requests/${requestId}`);
      }
    }
  };

  const handleDonationDone = async (request: BloodRequest) => {
    if (!user || !profile) {
      addToast("Error", "User profile not loaded. Please try again.", 'error');
      return;
    }

    const emotionalMessage = `Every single drop of blood you donate is a breath of life to someone, a heartbeat renewed, and a second chance to return safely to their family. By stepping forward, you represent the highest beacon of human compassion and selflessness. We deeply salute your contribution to saving lives. ❤️\n\nDid you actually donate blood for this request?`;
    
    const confirmed = await askConfirm(
      "Confirm Your Noble Act ❤️",
      emotionalMessage,
      "Yes, I Donated",
      "info",
      "Cancel"
    );
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      
      // 1. Add donation record to subcollection
      const donationRef = doc(collection(db, 'users', user.uid, 'donations'));
      batch.set(donationRef, {
        requestId: request.id,
        hospitalName: request.hospital,
        bloodGroup: request.bloodGroup,
        requesterName: request.requesterName,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      // 2. Update user profile statistics and last donation date
      const today = new Date().toISOString().split('T')[0];
      batch.update(doc(db, 'users', user.uid), {
        donationCount: increment(1),
        lastDonationDate: today,
        isAvailable: false 
      });
      
      // 3. Mark request as fulfilled
      batch.update(doc(db, 'requests', request.id), {
         status: 'Fulfilled' 
      });

      await batch.commit();
      notifyAdmins("Request Fulfilled", `Blood request for ${request.bloodGroup} at ${request.hospital} (${request.district}) has been fulfilled by ${user.displayName} (${profile.district}).`, 'requests');
      addToast("Donation Recorded!", "Thank you for your life-saving contribution!", 'success');
      
      // Update local profile state to reflect changes immediately
      setProfile(prev => prev ? { 
        ...prev, 
        donationCount: (prev.donationCount || 0) + 1, 
        lastDonationDate: today, 
        isAvailable: false 
      } : null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/donations`);
    }
  };

  const joinOrganization = async (org: Organization) => {
    if (!user || !profile) return;
    
    if (profile.district !== org.district) {
      addToast("District Mismatch", `You can only join organizations in your district (${profile.district}). This organization is in ${org.district}.`, 'warning');
      return;
    }

    if (profile.organizationId) {
      addToast("Active Membership", "You are already a member of an organization.", 'info');
      return;
    }

    try {
      const batch = writeBatch(db);
      const member: OrganizationMember = {
        userId: user.uid,
        displayName: profile.displayName,
        bloodGroup: profile.bloodGroup,
        status: 'active',
        joinedAt: serverTimestamp()
      };

      batch.set(doc(db, 'organizations', org.id, 'members', user.uid), member);
      batch.update(doc(db, 'users', user.uid), { 
        organizationId: org.id,
        organizationName: org.name
      });
      batch.update(doc(db, 'organizations', org.id), { 
        memberCount: increment(1) 
      });
      
      await batch.commit();
      
      setProfile(prev => prev ? { ...prev, organizationId: org.id, organizationName: org.name } : null);
      addToast("Organization Joined", `Successfully joined ${org.name}!`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `organizations/${org.id}/members/${user.uid}`);
    }
  };

  const leaveOrganization = async () => {
    console.log("leaveOrganization function called");
    if (!user || !profile || !profile.organizationId) {
      console.warn("leaveOrganization: missing prerequisites", { user: !!user, profile: !!profile, orgId: profile?.organizationId });
      addToast("Error", "Organization details missing. Please refresh your profile.", 'error');
      return;
    }
    
    const orgId = profile.organizationId;
    const orgName = profile.organizationName;
    
    if (await askConfirm('Leave Organization?', `Are you sure you want to leave ${orgName || 'this organization'}?`, 'Leave Now')) {
      try {
        console.log("Starting leave batch for org:", orgId);
        const batch = writeBatch(db);
        
        // 1. Remove member record
        batch.delete(doc(db, 'organizations', orgId, 'members', user.uid));
        
        // 2. Clear user profile fields
        batch.update(doc(db, 'users', user.uid), { 
          organizationId: deleteField(),
          organizationName: deleteField()
        });
        
        // 3. Decrement member count
        batch.update(doc(db, 'organizations', orgId), { 
          memberCount: increment(-1) 
        });
        
        await batch.commit();
        console.log("Leave batch committed successfully");
        
        setProfile(prev => {
          if (!prev) return null;
          const newProfile = { ...prev };
          delete (newProfile as any).organizationId;
          delete (newProfile as any).organizationName;
          return newProfile;
        });
        
        addToast("Membership Revoked", `You have successfully left ${orgName || 'the organization'}.`, 'info');
        setView('requests');
      } catch (e: any) {
        console.error("Leave organization error:", e);
        handleFirestoreError(e, OperationType.WRITE, `organizations/${orgId}/members/${user.uid}`);
      }
    }
  };

  const lastUnreadCounts = useRef<{ [chatId: string]: number }>({});

  // Chat Logic
  useEffect(() => {
    if (!user) {
      setChats([]);
      setUnreadCount(0);
      lastUnreadCounts.current = {};
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      // Calculate total unread
      let totalUnread = 0;
      let initialization = Object.keys(lastUnreadCounts.current).length === 0;

      chatsData.forEach(c => {
        const myUnread = c.unreadCount?.[user.uid] || 0;
        totalUnread += myUnread;

        if (!initialization) {
          const lastCount = lastUnreadCounts.current[c.id] || 0;
          const isCurrentChat = activeChatRef.current?.id === c.id && viewRef.current === 'chat-room';
          
          if (myUnread > lastCount && !isCurrentChat) {
            // New message!
            const otherUid = c.participants.find(uid => uid !== user.uid);
            const otherUser = allUsers.find(u => u.uid === otherUid);
            const senderName = otherUser?.displayName || 'Someone';
            
            playNotificationSound();
            
            // Toast
            addToast(
              `New Chat from ${senderName}`,
              c.lastMessage || "You have a new message.",
              'info',
              `chat:${c.id}`
            );

            // Browser Notification
            if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
              new Notification(`New Message from ${senderName}`, {
                body: c.lastMessage || "You have a new message on Blood Link.",
                icon: '/logo.png',
                tag: c.id
              });
            }
          }
        }
        
        // Update ref
        lastUnreadCounts.current[c.id] = myUnread;
      });

      setUnreadCount(totalUnread);
      setChats(chatsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));

    return () => unsubscribe();
  }, [user, allUsers, addToast]);

  const openChat = async (otherUserId: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    
    const chatId = [user.uid, otherUserId].sort().join('_');
    const existingChat = chats.find(c => c.id === chatId);
    
    if (existingChat) {
      handleSetActiveChat(existingChat);
      setView('chat-room');
    } else {
      const chatDoc = doc(db, 'chats', chatId);
      try {
        const chatSnap = await getDoc(chatDoc);
        if (!chatSnap.exists()) {
          await setDoc(chatDoc, {
            participants: [user.uid, otherUserId],
            lastMessageAt: serverTimestamp(),
            unreadCount: { [user.uid]: 0, [otherUserId]: 0 }
          });
        }
        
        handleSetActiveChat({
          id: chatId,
          participants: [user.uid, otherUserId],
          lastMessageAt: new Date(),
          unreadCount: { [user.uid]: 0, [otherUserId]: 0 }
        });
        setView('chat-room');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
      }
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    if (profile?.district) {
      setFilterDistrict(profile.district);
      setFilterThana(profile.thana || '');
    } else {
      setFilterDistrict('');
      setFilterThana('');
    }
    setFilterBloodGroup('');
    setShowRequestsOverlay(false);
    setMapResetKey(prev => prev + 1);
  };

  // Filters
  const [mapResetKey, setMapResetKey] = useState<number>(0);
  const [filterDistrict, setFilterDistrict] = useState<string>('');
  const [filterThana, setFilterThana] = useState<string>('');
  const [filterBloodGroup, setFilterBloodGroup] = useState<string>('');
  const [hideFulfilled, setHideFulfilled] = useState(true);
  const districtInitialized = useRef(false);

  // Set default filters from profile once on startup
  useEffect(() => {
    if (profile?.district && !districtInitialized.current) {
      setFilterDistrict(profile.district);
      if (profile.thana) setFilterThana(profile.thana);
      districtInitialized.current = true;
    }
  }, [profile]);

  // Browser Notification Permission Setup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const requestPermission = async () => {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.error("Notification permission request failed", e);
        }
      };
      
      // Request after a small delay to not overwhelm the user immediately
      const timer = setTimeout(requestPermission, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const lastNotifiedRequestId = useRef<string | null>(null);
  const notifiedIds = useRef<Set<string>>(new Set());

  // FCM Logic
  useEffect(() => {
    if (user && profile && !profile.fcmToken) {
      const setupFCM = async () => {
        try {
          if (!('Notification' in window)) {
            console.log("This browser does not support notifications.");
            return;
          }

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Register service worker explicitly for FCM
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            
            const token = await getToken(messaging, { 
              serviceWorkerRegistration: registration,
              // Note: vapidKey is usually required for web. 
              // If the user hasn't provided one, it might fail, 
              // but we are implementing the structure.
            });
            
            if (token) {
              await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
              setProfile(prev => prev ? { ...prev, fcmToken: token } : null);
            }
          }
        } catch (e) {
          console.error("FCM Setup failed:", e);
        }
      };
      setupFCM();
    }
  }, [user, profile]);

  // Foreground Message Handler
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      if (payload.notification) {
        playNotificationSound();
        new Notification(payload.notification.title || "Match Found!", {
          body: payload.notification.body,
          icon: '/logo.png'
        });
      }
    });
    return unsubscribe;
  }, []);

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Validate Connection to Firestore
  useEffect(() => {
    let isMounted = true;
    let timeoutIdValue: any;

    async function verifyConnection() {
      if (!isMounted) return;
      try {
        console.log("Checking Firestore connection...");
        // Use a 10 second timeout for the connection test
        const testPromise = getDocFromServer(doc(db, '_connection_test', 'status'));
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000));
        
        await Promise.race([testPromise, timeoutPromise]);
        if (isMounted) setIsOffline(false);
        console.log("Firestore connection verified.");
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : String(error);
        const trulyUnavailable = message.includes('offline') || message.includes('unavailable') || message.includes('timeout');
        
        if (trulyUnavailable) {
          setIsOffline(true);
          console.warn("Firestore connection check failed:", message);
          // Retry later
          timeoutIdValue = setTimeout(verifyConnection, 30000);
        } else {
          setIsOffline(false);
          console.log("Firestore reachable (permissions or other error):", message);
        }
      }
    }
    
    verifyConnection();
    
    const handleOnline = () => { setIsOffline(false); verifyConnection(); };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutIdValue) clearTimeout(timeoutIdValue);
    };
  }, []); // Run only on mount

  // System Settings Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as SystemSettings);
      }
    }, (error) => console.error("Settings listener error:", error));
    return unsub;
  }, []);

  const effectiveApiKey = (settings?.googleMapsApiKey && settings.googleMapsApiKey.trim() !== '') ? settings.googleMapsApiKey : API_KEY;
  const effectiveMapId = settings?.googleMapsMapId || 'DEMO_MAP_ID';
  const isMapEnabled = Boolean(effectiveApiKey) && effectiveApiKey !== '';

  // Auth Listener
  useEffect(() => {
    // Defensive timeout to ensure loading screen disappears even if auth firebase hangs
    const loadingTimeout = setTimeout(() => {
      setLoading(prevState => {
        if (prevState) {
          console.warn("Auth check timed out, forcing loading to false.");
          return false;
        }
        return prevState;
      });
    }, 15000); // 15 seconds max loading

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setIsCompletingLogin(true);
          const docRef = doc(db, 'users', u.uid);
          let docSnap;
          try {
            docSnap = await getDoc(docRef);
          } catch (error: any) {
            if (error.message?.includes('offline') || error.code === 'unavailable') {
               console.warn("Auth listener: Firestore is offline, attempting to use cached data.");
            } else {
               handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
            }
          }
          
          if (docSnap && docSnap.exists()) {
            let profileData = docSnap.data() as UserProfile;
            
            // Bootstrapped Admin Promotion
            if (u.email === 'abmannancxb@gmail.com' && profileData.role !== 'admin') {
              profileData.role = 'admin';
              await updateDoc(doc(db, 'users', u.uid), { role: 'admin' });
            }

            setProfile(profileData);
            setUser(u);
            localStorage.setItem('bloodlink_persisted_user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName }));
            localStorage.setItem('bloodlink_persisted_profile', JSON.stringify(profileData));

            const isPasswordLogin = u.providerData.some(p => p.providerId === 'password');
            if (isPasswordLogin && profileData.role === 'admin') {
              setView('admin');
            }
          } else {
            // New user or bootstrapped admin without profile yet
            if (u.email === 'abmannancxb@gmail.com') {
              const adminProfile: UserProfile = {
                uid: u.uid,
                displayName: u.displayName || 'Head Admin',
                email: u.email,
                bloodGroup: 'B+', // Default or can be changed
                district: 'Dhaka',
                thana: 'Gulshan',
                phone: '01000000000', // Placeholder for admin
                isAvailable: false,
                role: 'admin'
              };
              await setDoc(doc(db, 'users', u.uid), adminProfile);
              setProfile(adminProfile);
              setUser(u);
              localStorage.setItem('bloodlink_persisted_user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName }));
              localStorage.setItem('bloodlink_persisted_profile', JSON.stringify(adminProfile));
              if (viewRef.current !== 'org-apply') setView('admin');
              return;
            }
            setUser(u);
            setProfile(null);
            if (viewRef.current !== 'org-apply') setView('profile'); // Force profile setup for new users
          }
        } else {
          // Check for auto-login persistence
          const savedId = localStorage.getItem('bloodlink_saved_login_id');
          const savedPin = localStorage.getItem('bloodlink_saved_login_pin');
          if (savedId && savedPin) {
            console.log("Background persistent auto-login in progress...");
            setIsCompletingLogin(true);
            try {
              let targetEmail = savedId;
              if (!savedId.includes('@')) {
                // Number-based login: find registered email first
                const qPhone = query(collection(db, 'users'), where('phone', '==', savedId));
                const phoneSnap = await getDocs(qPhone);
                if (!phoneSnap.empty) {
                  targetEmail = phoneSnap.docs[0].data().email;
                }
              }
              await signInWithEmailAndPassword(auth, targetEmail, savedPin + "_bloodlink_secure_salt");
              return; // Successful login will trigger this listener again with signed-in user u
            } catch (err) {
              console.error("Background auto-login persistence failed:", err);
              // Clear stored credentials to prevent infinite auth failure loops
              localStorage.removeItem('bloodlink_saved_login_id');
              localStorage.removeItem('bloodlink_saved_login_pin');
              setUser(null);
              setProfile(null);
              localStorage.removeItem('bloodlink_persisted_user');
              localStorage.removeItem('bloodlink_persisted_profile');
              if (viewRef.current !== 'admin-login' && viewRef.current !== 'org-apply') setView('requests');
            }
          } else {
            setUser(null);
            setProfile(null);
            localStorage.removeItem('bloodlink_persisted_user');
            localStorage.removeItem('bloodlink_persisted_profile');
            if (viewRef.current !== 'admin-login' && viewRef.current !== 'org-apply') setView('requests');
          }
        }
      } catch (err) {
        console.error("Auth listener error:", err);
      } finally {
        setLoading(false);
        setIsCompletingRegistration(false);
        setIsCompletingLogin(false);
        clearTimeout(loadingTimeout);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Sync profile role for bootstrap admin
  useEffect(() => {
    if (user?.email === 'abmannancxb@gmail.com' && profile && profile.role !== 'admin') {
      const updateRole = async () => {
        try {
          await setDoc(doc(db, 'users', user.uid), { ...profile, role: 'admin' }, { merge: true });
          setProfile(prev => prev ? { ...prev, role: 'admin' } : null);
        } catch (e) {
          console.error("Failed to auto-upgrade admin role", e);
        }
      };
      updateRole();
    }
  }, [user, profile]);

  // Requests Listener
  useEffect(() => {
    let q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BloodRequest[];
      
      // Check for new matching requests to notify user
      if (profile && profile.bloodGroup) {
        // Find matching requests that haven't been notified yet in this session
        const matchingRequests = reqs.filter(r => 
          r.status === 'Pending' && 
          r.bloodGroup === profile.bloodGroup && 
          (r.district === profile.district || r.district === 'All') &&
          r.requesterUid !== user?.uid && // Don't notify own requests
          !notifiedIds.current.has(r.id)
        );

        // If we have matches and we've already initialized (it's a NEW snapshot or profile change)
        if (matchingRequests.length > 0 && lastNotifiedRequestId.current !== null) {
          const latestMatch = matchingRequests[0];
          const body = `${latestMatch.requesterName} needs ${latestMatch.bloodGroup} blood at ${latestMatch.hospital}.`;
          
          playNotificationSound();

          if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
            new Notification("Urgent Blood Request!", {
              body,
              icon: '/logo.png',
              tag: latestMatch.id
            });
          }

          addToast(
            `Match Found: ${latestMatch.bloodGroup}`,
            `${latestMatch.requesterName} is looking for blood in ${latestMatch.district}.`,
            'info',
            latestMatch.id
          );
          
          // Mark all current matches as notified
          matchingRequests.forEach(r => notifiedIds.current.add(r.id));
          lastNotifiedRequestId.current = latestMatch.id;
        }
        
        // Initialize the tracking on first load to prevent notifying for all historical requests
        if (lastNotifiedRequestId.current === null) {
          reqs.forEach(r => notifiedIds.current.add(r.id));
          lastNotifiedRequestId.current = reqs.length > 0 ? reqs[0].id : 'initialized';
        }
      }

      setRequests(reqs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    return unsubscribe;
  }, [profile, user?.uid, addToast]);

  // Donors Listener
  useEffect(() => {
    const q = query(collection(db, 'users'), where('isAvailable', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donors = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setActiveDonors(donors.filter(d => !d.isBlocked));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users (available)');
    });

    // Donations Listener for current user
    let unsubDonations = () => {};
    if (user) {
      const dq = query(collection(db, 'users', user.uid, 'donations'), orderBy('date', 'desc'));
      unsubDonations = onSnapshot(dq, (snapshot) => {
        setDonations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DonationRecord)));
      });
    }

    return () => {
      unsubscribe();
      unsubDonations();
    };
  }, [user]);

  // Posts Listener
  useEffect(() => {
    // Use a simple query to avoid composite index requirements and handle legacy data missing 'isHidden'
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(feedLimit));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommunityPost[];
      
      // Check for new posts to show notification
      if (p.length > 0) {
        const currentTopId = p[0].id;
        if (lastSeenPostId.current === null) {
          lastSeenPostId.current = currentTopId;
        } else if (viewRef.current !== 'feed') {
          // Count how many posts are newer than the one we last saw at the top
          let count = 0;
          for (const post of p) {
            if (post.id === lastSeenPostId.current) break;
            count++;
          }
          setNewPostsCount(count);
        }
        
        if (viewRef.current === 'feed') {
          lastSeenPostId.current = currentTopId;
          setNewPostsCount(0);
        }
      }

      // Filter client-side for non-admins to ensure visibility of legacy posts
      if (profile?.role === 'admin') {
        setPosts(p);
      } else {
        setPosts(p.filter(post => post.isHidden !== true));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return unsubscribe;
  }, [user, isGuest, profile]);

  useEffect(() => {
    if (view === 'feed') {
      setNewPostsCount(0);
      if (posts.length > 0) {
        lastSeenPostId.current = posts[0].id;
      }
    }
  }, [view, posts]);

  // Reports Listener
  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const r = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      
      // Notify admin of new pending reports
      if (r.length > reports.length && r[0].status === 'pending' && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        playNotificationSound();
        new Notification("New Report", {
          body: "A new community post or comment has been reported.",
          icon: '/logo.png'
        });
      }
      
      setReports(r);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return unsubscribe;
  }, [profile, isGuest]);

  // Admin Notifications Listener
  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminNotification));
      
      // If we have a new notification and it's unread, show a toast and play sound
      // We use a ref to avoid double-triggering on first load
      if (adminNotifications.length > 0 && newDocs.length > adminNotifications.length) {
        const newest = newDocs[0];
        if (!newest.isRead) {
          addToast(newest.title, newest.body, 'info');
          playNotificationSound();
          
          // Browser Notification as well if hidden
          if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
            new Notification(newest.title, {
              body: newest.body,
              icon: '/logo.png'
            });
          }
        }
      }
      
      setAdminNotifications(newDocs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'admin_notifications'));
    return unsubscribe;
  }, [profile, isGuest, adminNotifications.length]);

  // Global Broadcast Alerts Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'global_alerts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGlobalAlerts(alertsList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'global_alerts'));

    return unsubscribe;
  }, [user]);

  // Admin/Chat: Users Listener
  useEffect(() => {
    if (!user) return;
    // We need users for the Chat system as well, not just AdminPanel
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setAllUsers(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return unsubscribe;
  }, [user, isGuest]);

  // Organizations Listener
  useEffect(() => {
    const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrganizations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'organizations'));
    return unsubscribe;
  }, []);

  // Org Applications Listener
  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const q = query(collection(db, 'organization_applications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrgApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrganizationApplication)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'organization_applications'));
    return unsubscribe;
  }, [profile]);

  const handleDirectGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    
    try {
      console.log("handleDirectGoogleLogin started...");
      // Ensure persistence is set before login
      await setPersistence(auth, browserLocalPersistence);
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      console.log("Initiating login popup...");
      const result = await signInWithPopup(auth, provider);
      setIsCompletingLogin(true);
      console.log("Login successful for user:", result.user.email);
      addToast("Welcome!", `Signed in as ${result.user.displayName}`, 'success');
    } catch (error: any) {
      setIsCompletingLogin(false);
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login popup was closed by the user.");
        addToast("Sign-in Cancelled", "You closed the login window. Please try again when you are ready.", 'info');
        return;
      }

      console.error("Login Error Full:", error);
      console.error("Login Error Code:", error.code);
      console.error("Login Error Message:", error.message);

      if (error.code === 'auth/unauthorized-domain') {
        addToast("Domain Not Authorized", "This domain is not allowed for authentication. Check Firebase console.", 'error');
      } else if (error.code === 'auth/popup-blocked') {
        addToast("Popup Blocked", "Please allow popups for this site to sign in.", 'error');
      } else if (error.code === 'auth/network-request-failed') {
        addToast("Network Error", "Authentication failed. Check your internet connection.", 'error');
      } else {
        addToast("Login Failed", `Error: ${error.message || 'Unknown error'}`, 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async () => {
    if (isGuest) {
      setIsGuest(false);
      setAuthScreen('login-email');
      addToast("Authentication Required", "Please sign in to access full features.", "info");
      return;
    }
    await handleDirectGoogleLogin();
  };

  const handleLogout = () => {
    setIsGuest(false);
    setActiveCall(null);
    setIncomingCall(null);
    localStorage.removeItem('bloodlink_saved_login_id');
    localStorage.removeItem('bloodlink_saved_login_pin');
    localStorage.removeItem('bloodlink_persisted_user');
    localStorage.removeItem('bloodlink_persisted_profile');
    signOut(auth);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regLoading) return;
    setRegError('');

    if (!regName.trim()) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Please enter your email address.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Please enter your mobile phone number.');
      return;
    }

    const pinStr = regPin;

    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setRegError('Password must be exactly 6 digits.');
      return;
    }

    setRegLoading(true);

    try {
      // 1. Check if email or phone is already used in Firestore users
      const phoneQuery = query(collection(db, 'users'), where('phone', '==', regPhone.trim()));
      const emailQuery = query(collection(db, 'users'), where('email', '==', regEmail.trim()));
      
      const [phoneSnap, emailSnap] = await Promise.all([
        getDocs(phoneQuery),
        getDocs(emailQuery)
      ]);

      if (!phoneSnap.empty || !emailSnap.empty) {
        setRegError('This email or phn already used by different user.');
        setRegLoading(false);
        return;
      }

      // Set persistence
      await setPersistence(auth, browserLocalPersistence);

      setIsCompletingRegistration(true);

      // 2. Create standard auth user using PIN as password
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail.trim(), pinStr + "_bloodlink_secure_salt");
      const registeredUser = userCredential.user;

      // 3. Update display name
      await updateProfile(registeredUser, {
        displayName: regName.trim()
      });

      // 4. Save saved credentials to localStorage for auto-login/persistence!
      localStorage.setItem('bloodlink_saved_login_id', regEmail.trim());
      localStorage.setItem('bloodlink_saved_login_pin', pinStr);

      // 5. Keep in localStorage so ProfileForm can pick up name/phone
      localStorage.setItem('reg_phone_number', regPhone.trim());
      localStorage.setItem('reg_display_name', regName.trim());

      addToast("Success!", "Account registered! Let's complete your profile.", "success");
      
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPin('');
      setAuthScreen('login-email');
    } catch (err: any) {
      setIsCompletingRegistration(false);
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setRegError('This email or phn already used by different user.');
      } else if (err.code === 'auth/invalid-email') {
        setRegError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setRegError('Password must be at least 6 characters (digits) long.');
      } else {
        setRegError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginError('');

    const identifier = loginEmail.trim();
    const pinStr = loginPin;

    if (!identifier) {
      setLoginError('Please enter your email or phone number.');
      return;
    }
    if (pinStr.length !== 6 || !/^\d{6}$/.test(pinStr)) {
      setLoginError('Password must be exactly 6 digits.');
      return;
    }

    setLoginLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      
      let targetEmail = identifier;
      
      // If the identifier doesn't contain '@', treat it as a potential phone number
      if (!identifier.includes('@')) {
        const qPhone = query(collection(db, 'users'), where('phone', '==', identifier));
        const phoneSnap = await getDocs(qPhone);
        if (phoneSnap.empty) {
          throw new Error('No account found with this email or phone number.');
        } else {
          targetEmail = phoneSnap.docs[0].data().email;
        }
      }

      setIsCompletingLogin(true);

      await signInWithEmailAndPassword(auth, targetEmail, pinStr + "_bloodlink_secure_salt");
      
      // Save credentials for auto-login persistence
      localStorage.setItem('bloodlink_saved_login_id', identifier);
      localStorage.setItem('bloodlink_saved_login_pin', pinStr);

      addToast("Success!", "Welcome back!", "success");
      setLoginEmail('');
      setLoginPin('');
    } catch (err: any) {
      setIsCompletingLogin(false);
      console.error("Email login error:", err);
      if (
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' ||
        err.message === 'No account found with this email or phone number.'
      ) {
        setLoginError('Invalid email/phone or Password.');
      } else if (err.code === 'auth/invalid-email') {
        setLoginError('Please enter a valid email address.');
      } else {
        setLoginError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Sound Notification
  // (Moved higher up)

  if (loading || loadProgress < 100) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/30 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-200/30 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-8 relative z-10"
        >
          <div className="relative">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="relative z-10"
            >
              <Droplets className="w-20 h-20 text-red-600 drop-shadow-xl" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-red-100 rounded-full filter blur-xl -z-10"
            />
          </div>

          <div className="flex flex-col items-center gap-4 w-64 text-center">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter">
                <span className="text-red-600">Blood</span>
                <span className="text-slate-900">Link</span>
              </h1>
              <p className="text-red-600 text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-2">Bangladesh</p>
              <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest">Saving Lives Together</p>
            </div>

            <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden mt-4 relative">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-black text-2xl tabular-nums">
                {Math.round(loadProgress)}%
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            </div>
            
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">
              {loadProgress < 30 ? 'Initializing connection...' : 
               loadProgress < 60 ? 'Syncing donation network...' :
               loadProgress < 90 ? 'Securing data pipelines...' : 'Welcome to BloodLink'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'admin-login') {
    return <AdminLoginForm onBack={() => setView('requests')} />;
  }

  if (profile?.isBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mb-6" />
        <h1 className="text-3xl font-black text-slate-900 mb-4">Account Blocked</h1>
        <p className="text-slate-600 mb-8 max-w-xs">Your account has been restricted by administrators due to community guidelines violations.</p>
        <button 
          onClick={handleLogout}
          className="bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (isCompletingRegistration) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-white to-slate-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-red-400/20 opacity-25 blur-2xl rounded-full" />
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 8, -8, 0]
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="relative z-10 w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl"
            >
              <Droplets className="w-12 h-12 text-white" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Completing Registration...</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
              Please wait... we are setting up your secure account and opening the profile registration form. This will only take a moment.
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.4)]"
              animate={{ left: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              style={{ width: "50%" }}
            />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">Initializing direct sign-in...</p>
        </div>
      </div>
    );
  }

  if (isCompletingLogin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-white to-slate-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-red-400/20 opacity-25 blur-2xl rounded-full" />
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 8, -8, 0]
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="relative z-10 w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl"
            >
              <Droplets className="w-12 h-12 text-white" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Signing in securely...</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
              Connecting to BloodLink Dhaka server and loading your dashboard...
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.4)]"
              animate={{ left: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              style={{ width: "50%" }}
            />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">Establishing secure session...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest && view !== 'admin-login' && view !== 'org-apply' && view !== 'about' && view !== 'contact' && view !== 'privacy' && view !== 'terms' && view !== 'faq') {
    const showGoogle = settings?.showLoginGoogle !== false;
    const showOrg = settings?.showLoginOrg !== false;
    const showGuest = settings?.showLoginGuest !== false;

    if (authScreen === 'register') {
      return (
        <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 md:p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-100/40 via-white to-slate-100/30 animate-in fade-in duration-300 overflow-y-auto w-full">
          <div className="max-w-md w-full relative space-y-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Elegant Brand Logo & Banner of Signup */}
            <div className="text-center space-y-3 mb-1">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-red-500 opacity-15 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-16 h-16 bg-gradient-to-tr from-rose-600 to-red-500 rounded-[1.50rem] flex items-center justify-center shadow-md rotate-3">
                  <Droplets className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  Join <span className="text-rose-600">Blood</span>Link
                </h1>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1.5">Bangladesh Volunteer Registry</p>
              </div>
            </div>

            {/* Registration Card */}
            <form onSubmit={handleRegister} className="w-full bg-white p-6 md:p-8 rounded-[2.25rem] border border-slate-200/60 shadow-xl shadow-slate-100/50 text-left space-y-5">
              
              {/* Google Sign-up Trigger */}
              {showGoogle && (
                <div className="space-y-3">
                  <button 
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-extrabold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all active:scale-98 flex items-center justify-center gap-3 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4 shrink-0" alt="G" />
                    <span>{isLoggingIn ? 'Connecting...' : 'Signup with Google account'}</span>
                  </button>
                  <div className="flex items-center gap-3 my-4">
                    <div className="h-px bg-slate-200/80 flex-1" />
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">or register with credentials</span>
                    <div className="h-px bg-slate-200/80 flex-1" />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Name Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-400 ml-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Full name" 
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200/85 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 placeholder-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-400 ml-1">Email</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input 
                      type="email" 
                      placeholder="Email" 
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200/85 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 placeholder-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* Phone Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Phone number" 
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200/85 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 placeholder-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* PIN selection block */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input 
                      type="password" 
                      placeholder="**********" 
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      className="w-full bg-slate-50 border border-slate-200/85 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-black tracking-[0.25em] focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 placeholder-slate-400 font-mono placeholder:tracking-normal"
                      required
                    />
                  </div>
                </div>

              </div>

              {regError && (
                <p className="text-xs font-extrabold text-red-500 bg-red-50 p-3.5 rounded-xl border border-red-100">{regError}</p>
              )}

              <button 
                type="submit" 
                disabled={regLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2.5xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 select-none cursor-pointer disabled:opacity-50"
              >
                {regLoading ? 'Registering...' : 'Continue'}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Already registered?{' '}
                  <button 
                    type="button"
                    onClick={() => { setAuthScreen('login-email'); setRegError(''); }}
                    className="text-red-650 font-extrabold hover:underline underline-offset-2 hover:text-red-700 font-sans"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>

            {/* Optional Guest Link */}
            {showGuest && (
              <div className="text-center pt-2">
                <button 
                  onClick={() => {
                    setIsGuest(true);
                    addToast("Guest Onboarding", "Exploring under secure preview guest mode.", "info");
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-650 transition-colors"
                  type="button"
                >
                  Explore first without registration →
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Single unified Sign In screen (replaces main landing / unlock pages)
    return (
      <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 md:p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-100/40 via-white to-slate-100/30 animate-in fade-in duration-300 overflow-y-auto w-full">
        <div className="max-w-md w-full relative space-y-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Pulsing professional launcher logo header */}
          <div className="text-center space-y-3 mb-1">
            <div className="relative inline-block">
              <div className="absolute -inset-6 bg-red-500 opacity-10 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-16 h-16 bg-gradient-to-tr from-rose-650 to-red-550 rounded-[1.50rem] flex items-center justify-center shadow-lg rotate-6 hover:rotate-0 transition-transform duration-500">
                <Droplets className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight leading-none text-slate-900">
                <span className="text-rose-600">Blood</span>Link
              </h1>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-1.5">Bangladesh Volunteer Hub</p>
              <p className="text-slate-500 text-xs font-semibold max-w-sm mx-auto pt-1">
                Instantly connect emergency requirements with nearby blood donors
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="w-full bg-white p-6 md:p-8 rounded-[2.25rem] border border-slate-200/60 shadow-xl shadow-slate-100/50 text-left space-y-5">
            
            {/* Google Sign-in Trigger */}
            {showGoogle && (
              <div className="space-y-3">
                <button 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-extrabold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all active:scale-98 flex items-center justify-center gap-3 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 shrink-0" alt="G" />
                  <span>{isLoggingIn ? 'Connecting...' : 'Login with Google Account'}</span>
                </button>
                <div className="flex items-center gap-3 my-4">
                  <div className="h-px bg-slate-200/80 flex-1" />
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">or log in with credentials</span>
                  <div className="h-px bg-slate-200/80 flex-1" />
                </div>
              </div>
            )}

            {/* Email/Phone + Pin Form */}
            <form onSubmit={handleEmailLogin} className="space-y-5">
              
              {/* email/phone selection */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-400 ml-1">Email or phone</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Email or phone" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/85 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 placeholder-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Secure 6 digit pin layout */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-extrabold tracking-widest text-slate-400 ml-1">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type="password" 
                    placeholder="**********" 
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="w-full bg-slate-50 border border-slate-200/85 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-black tracking-[0.25em] focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 placeholder-slate-400 font-mono placeholder:tracking-normal"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-xs font-extrabold text-red-500 bg-red-50 p-3.5 rounded-xl border border-red-100">{loginError}</p>
              )}

              <button 
                type="submit" 
                disabled={loginLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2.5xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 select-none cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? 'Logging In...' : 'Login'}
              </button>
            </form>

            {/* Account Creation Prompt */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                If you are new join as a donor or request for blood please create
              </p>
              <button 
                type="button"
                onClick={() => { setAuthScreen('register'); setLoginError(''); }}
                className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-extrabold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] border border-slate-200/45 cursor-pointer"
              >
                Create new account
              </button>
            </div>

          </div>

          {/* Optional Guest Link */}
          {showGuest && (
            <div className="text-center pt-2">
              <button 
                onClick={() => {
                  setIsGuest(true);
                  addToast("Guest Onboarding", "Exploring under secure preview guest mode.", "info");
                }}
                className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
                type="button"
              >
                Explore first without registration →
              </button>
            </div>
          )}

          {/* Statistics Bar Ticker */}
          <div className="pt-4 flex justify-center gap-8 max-w-xs mx-auto border-t border-slate-200">
            <div className="text-center">
              <p className="text-base font-black text-slate-900 tracking-tight">1,250+</p>
              <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Lives Saved</p>
            </div>
            <div className="w-px h-6 bg-slate-200/80" />
            <div className="text-center">
              <p className="text-base font-black text-slate-900 tracking-tight">24 / 7</p>
              <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">Emergency Ready</p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <APIProvider key={effectiveApiKey} apiKey={effectiveApiKey} version="weekly">
      <div className="h-dvh flex flex-col bg-slate-50 overflow-hidden relative">
        <ToastContainer toasts={toasts} onRemove={onRemoveToast} onAction={onActionToast} />
        <ConfirmModal config={confirmConfig} />

        {!user && isGuest && (
          <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-500 text-white px-4 py-2.5 shrink-0 flex items-center justify-between text-xs z-[99] gap-4 relative shadow-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              <span className="font-extrabold text-[10px] md:text-xs tracking-tight truncate">
                Guest Preview Mode — Sign in or register to request blood, message donors, and share stories.
              </span>
            </div>
            <button 
              onClick={() => {
                setIsGuest(false);
                setAuthScreen('login-email');
              }}
              className="bg-white hover:bg-slate-50 text-red-600 font-extrabold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer shrink-5 shrink-0"
            >
              Sign In
            </button>
          </div>
        )}

        {!user && isGuest && guestBlockerActive && (
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto"
            onClick={() => setGuestBlockerActive(false)}
          >
            <div 
              className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(220,38,38,0.18)] p-8 text-center animate-in zoom-in-95 duration-500 relative flex flex-col items-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Absolute close button */}
              <button 
                onClick={() => setGuestBlockerActive(false)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-90 cursor-pointer border border-slate-100/50"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Pulsing visual indicator */}
              <div className="relative mb-5 animate-bounce-slow">
                <div className="absolute -inset-4 bg-red-550 opacity-15 blur-2xl rounded-full" />
                <div className="relative w-16 h-16 bg-gradient-to-tr from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 rotate-6 hover:rotate-0 transition-transform duration-350">
                  <Droplets className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>

              {/* Copywriting */}
              <div className="space-y-2 mb-6 max-w-sm">
                <h2 className="text-xl font-black text-slate-905 tracking-tight leading-snug">
                  Unlock Full Access to <span className="text-red-600">BloodLink</span>
                </h2>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Connect with lifesavers across Bangladesh. Verified donors can search eligible members, log saving records, initiate secure chats, and coordinate emergency call requests instantly.
                </p>
              </div>

              {/* Feature showcase list */}
              <div className="grid grid-cols-2 gap-2.5 w-full text-left mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-650 shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[10px] leading-tight">Match Donors</h4>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-650 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[10px] leading-tight">Log History</h4>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-650 shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[10px] leading-tight">Voice & Chats</h4>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-650 shrink-0">
                    <Heart className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[10px] leading-tight">Save Lives</h4>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2.5">
                <button 
                  onClick={() => {
                    console.log("Interactive Blocker: google sign in clicked");
                    handleDirectGoogleLogin();
                    setGuestBlockerActive(false);
                  }}
                  disabled={isLoggingIn}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-6 rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 select-none cursor-pointer border border-slate-905 disabled:opacity-50 text-xs font-black uppercase tracking-wider"
                >
                  <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 border border-slate-50">
                    <img src="https://www.google.com/favicon.ico" className="w-3 h-3" alt="Google" />
                  </span>
                  <span>{isLoggingIn ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <button 
                  onClick={() => {
                    setGuestBlockerActive(false);
                    setIsGuest(false);
                    setAuthScreen('login-email');
                  }}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-150 py-3.5 px-6 rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-extrabold text-slate-705 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign In with Password / Register</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Match Donor Overlay */}
        <AnimatePresence>
          {matchingDonorsRequest && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMatchingDonorsRequest(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] pointer-events-auto"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[32px] shadow-2xl z-[201] pointer-events-auto flex flex-col max-h-[85%]"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
                
                <div className="px-6 pb-4 flex items-center justify-between shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="px-2 py-0.5 bg-red-100 rounded text-red-600 text-[10px] font-black uppercase tracking-widest">{matchingDonorsRequest.bloodGroup}</div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Matching Donors</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      In {matchingDonorsRequest.thana}, {matchingDonorsRequest.district}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setMatchingDonorsRequest(null)}
                    className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Match Filters Segment Controls */}
                <div className="px-6 pb-4 flex gap-3 shrink-0 flex-wrap">
                  {/* Location Filter Control */}
                  <div className="flex-1 min-w-[140px] flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => setMatchScope('area')}
                      type="button"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center ${matchScope === 'area' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Local Zone
                    </button>
                    <button 
                      onClick={() => setMatchScope('all')}
                      type="button"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center ${matchScope === 'all' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      All Areas
                    </button>
                  </div>

                  {/* Blood Compatibility Control */}
                  <div className="flex-1 min-w-[180px] flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => setMatchGroupFilter('exact')}
                      type="button"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center ${matchGroupFilter === 'exact' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Exact Match
                    </button>
                    <button 
                      onClick={() => setMatchGroupFilter('compatible')}
                      type="button"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center ${matchGroupFilter === 'compatible' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      All Compatible
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-4">
                  {(() => {
                    const matches = allUsers.filter(u => {
                      if (!u.isAvailable || u.uid === user?.uid) return false;
                      
                      const bloodMatch = matchGroupFilter === 'exact' 
                        ? u.bloodGroup === matchingDonorsRequest.bloodGroup
                        : isBloodCompatible(u.bloodGroup, matchingDonorsRequest.bloodGroup);
                        
                      const locationMatch = matchScope === 'area'
                        ? (u.district === matchingDonorsRequest.district && u.thana === matchingDonorsRequest.thana)
                        : true; 
                        
                      return bloodMatch && locationMatch;
                    });

                    if (matches.length === 0) {
                      return (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                          <Users className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching donors found</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 mb-2">
                          <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
                            Found {matches.length} matches under selected scope filter. You can message them directly to coordinate.
                          </p>
                        </div>
                        {matches.map(donor => (
                          <DonorCard 
                            key={donor.uid} 
                            donor={donor} 
                            currentUserProfile={profile}
                            onMessage={() => {
                              if (!user) {
                                handleLogin();
                              } else {
                                openChat(donor.uid);
                                setMatchingDonorsRequest(null);
                              }
                            }} 
                            onViewProfile={() => onViewProfile(donor.uid)}
                          />
                        ))}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {showNotificationConsent && (
          <NotificationConsentModal 
            onAccept={requestNotificationPermission} 
            onClose={() => setShowNotificationConsent(false)} 
          />
        )}
        {showLocationConsent && (
          <LocationPermissionModal 
            onAccept={requestLocationPermission} 
            onClose={() => {
              setShowLocationConsent(false);
              localStorage.setItem('location_asked', 'true');
            }} 
          />
        )}

        <header className="fixed top-0 left-0 right-0 h-16 bg-white/75 backdrop-blur-md border-b border-slate-200/50 z-[100] px-4 py-2.5 flex items-center justify-between shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02),0_4px_6px_-2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5 cursor-pointer group select-none" onClick={() => { setView('requests'); resetFilters(); }}>
            <div className="p-1.5 bg-red-50 rounded-xl group-hover:bg-red-100/80 transition-colors">
              <Droplets className="w-6 h-6 text-red-600 transition-transform group-hover:scale-110 active:rotate-12 duration-300" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight leading-none text-slate-900 group-hover:text-red-600 transition-colors">
                <span className="text-red-600 font-extrabold">Blood</span>Link
              </h1>
              <p className="text-[7.5px] font-black uppercase tracking-[0.35em] text-red-500 mt-0.5">Bangladesh</p>
            </div>
          </div>

          {isOffline && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-150/70 animate-pulse">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span className="text-[9px] font-black text-amber-705 uppercase tracking-widest">Connection Issues</span>
            </div>
          )}
          
          

        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')}
              className={`relative p-2 rounded-xl transition-all duration-300 ${view === 'admin' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-red-550'}`}
            >
              <AlertCircle className="w-5.5 h-5.5" />
              {(reports.some(r => r.status === 'pending') || orgApplications.some(a => a.status === 'pending')) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
          )}
          <button 
            onClick={() => setView('chats')}
            title={unreadCount > 0 ? `${unreadCount} unread messages` : 'No new messages'}
            className={`relative p-2 rounded-xl transition-all duration-300 group ${view === 'chats' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-red-500'}`}
          >
            <div className="relative">
              <MessageSquare className={`w-5.5 h-5.5 transition-transform duration-300 ${view === 'chats' ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-3'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-4.5 px-1 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-md shadow-red-200/50 animate-in fade-in zoom-in duration-300">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </button>

          <button 
            onClick={() => setView('notifications')}
            className={`relative p-2 rounded-xl transition-all duration-300 group ${view === 'notifications' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-550 hover:bg-slate-50 hover:text-red-500'}`}
          >
            <Bell className={`w-5.5 h-5.5 transition-transform duration-300 ${view === 'notifications' ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-6'}`} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white ring-1 ring-red-100"></span>
          </button>
          <button 
            onClick={() => user ? setView('profile') : handleLogin()}
            className="flex items-center justify-center p-0.5 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-red-300 rounded-xl overflow-hidden transition-all shadow-sm active:scale-95 duration-200 shrink-0"
          >
            {user ? (
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=fecdd3&color=9f1239`} alt="Profile" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </header>


      {/* Main Content */}
      <main 
        className="flex-1 w-full relative overflow-hidden"
        onTouchStart={(e) => {
          if (!SWIPEABLE_VIEWS.includes(view)) return;
          if (shouldIgnoreSwipe(e.target as HTMLElement)) return;
          const touch = e.touches[0];
          if (touch) {
            mainTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }
        }}
        onTouchMove={(e) => {
          if (!mainTouchStartRef.current) return;
          const touch = e.touches[0];
          if (touch) {
            const deltaX = touch.clientX - mainTouchStartRef.current.x;
            const deltaY = touch.clientY - mainTouchStartRef.current.y;
            
            if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
              const currentIndex = getCurrentTabIndex();
              if (currentIndex !== -1) {
                if (deltaX < 0) {
                  // Swiped left -> load next tab
                  if (currentIndex < TABS_ORDER.length - 1) {
                    const nextTab = TABS_ORDER[currentIndex + 1];
                    setView(nextTab.view as any);
                    setShowRequestsOverlay(nextTab.showRequestsOverlay);
                    handleSetActiveChat(null);
                  }
                } else {
                  // Swiped right -> load prev tab
                  if (currentIndex > 0) {
                    const prevTab = TABS_ORDER[currentIndex - 1];
                    setView(prevTab.view as any);
                    setShowRequestsOverlay(prevTab.showRequestsOverlay);
                    handleSetActiveChat(null);
                  }
                }
              }
              mainTouchStartRef.current = null;
            }
          }
        }}
        onTouchEnd={() => {
          mainTouchStartRef.current = null;
        }}
      >
        <AnimatePresence mode="wait">
          {view === 'org-apply' && (
            <motion.div key="org-apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
              <div className="max-w-4xl mx-auto">
                <OrgApplicationForm onCancel={() => setView('requests')} addToast={addToast} />
              </div>
            </motion.div>
          )}

          {view === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full relative overflow-hidden bg-slate-50"
            >
              {!showRequestsOverlay ? (
                <>
                  {/* Full Page Map - Truly full page now */}
                  <div className="absolute inset-0 z-0 bg-slate-200">
                    <MapView 
                      requests={requests} 
                      donors={activeDonors} 
                      allUsers={allUsers}
                      apiKey={effectiveApiKey} 
                      mapId={effectiveMapId}
                      onMessage={(uid) => openChat(uid)}
                      onViewProfile={(uid) => onViewProfile(uid)}
                      user={user}
                      profile={profile}
                      onDeleteRequest={handleDeleteRequest}
                      onDonationDone={handleDonationDone}
                      settings={settings}
                      activeDistrict={filterDistrict}
                      handleLogin={handleLogin}
                      setMatchingDonorsRequest={setMatchingDonorsRequest}
                      mapResetKey={mapResetKey}
                      onOverviewChange={setMapOverviewOpen}
                    />
                  </div>

                  {/* Overlay Content */}
                  <div className="absolute inset-0 z-10 pointer-events-none flex flex-col pt-20 pb-20 overflow-y-auto scrollbar-hide">
                    {/* Top Controls */}
                    <div className="px-4 py-3 flex flex-col gap-3 pointer-events-auto max-w-2xl mx-auto w-full">
                      <div className="flex flex-col items-center gap-2">
                      </div>
                    </div>

                    {/* Bottom Toggle Branding */}
                    <div className="mt-auto pb-8 sm:pb-4 flex justify-center pointer-events-auto">
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute top-[59px] bottom-0 left-0 right-0 bg-slate-50 z-30 overflow-y-auto pb-24">
                  {/* Elegant Primary Header Row (Small Heading, Clean, Full Page, Not Closable) */}
                  <div className="sticky top-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between border-b border-slate-200/40 bg-white/95 backdrop-blur-md shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-sm shadow-red-500" />
                      <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                        {hideFulfilled ? 'Emergency Blood Board' : 'All Requests History'}
                      </h3>
                      <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {requests.filter(r => r.status === 'Pending').length} Active
                      </span>
                    </div>
                    
                    <div>
                      {/* Prominent Direct Request Blood Call-to-action button */}
                      <button
                        onClick={() => {
                          if (user) {
                            setView('request-form');
                          } else {
                            handleLogin();
                          }
                        }}
                        type="button"
                        className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 text-white px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all cursor-pointer border border-transparent hover:shadow-md"
                      >
                        <Plus className="w-3 h-3 text-white stroke-[3px]" />
                        <span>Request Blood</span>
                      </button>
                    </div>
                  </div>

                  {/* Secondary Controls & Fine-tuned Filters Bar - Scrolls out of view */}
                  <div className="px-4 md:px-6 py-3 bg-white border-b border-slate-200/40 flex flex-col sm:flex-row gap-3">
                    {/* Feed Switcher Button Group */}
                    <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 self-start sm:self-auto shrink-0">
                      <button 
                        onClick={() => setHideFulfilled(true)}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer ${hideFulfilled ? 'bg-white text-red-600 shadow-sm border border-slate-250/20' : 'text-slate-500 hover:text-slate-750'}`}
                      >
                        Active Feed
                      </button>
                      <button 
                        onClick={() => setHideFulfilled(false)}
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer ${!hideFulfilled ? 'bg-white text-red-600 shadow-sm border border-slate-250/20' : 'text-slate-500 hover:text-slate-750'}`}
                      >
                        Show History
                      </button>
                    </div>

                    {/* Interactive Dropdown Selectors */}
                    <div className="flex flex-1 flex-wrap gap-2 items-center w-full">
                      {/* Filter: District */}
                      <div className="flex-1 min-w-[110px] relative">
                        <select 
                          value={filterDistrict}
                          onChange={(e) => { setFilterDistrict(e.target.value); setFilterThana(''); }}
                          className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-red-400 rounded-xl pl-3 pr-7 py-2 text-[8.5px] font-black uppercase tracking-wider focus:ring-4 focus:ring-red-500/10 shadow-sm transition-all text-slate-700 outline-none appearance-none cursor-pointer"
                        >
                          <option value="">ALL DISTRICTS</option>
                          {Object.keys(BANGLADESH_LOCATIONS).sort().map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-3 h-3 rotate-90 stroke-[2.5]" />
                        </div>
                      </div>

                      {/* Filter: Thana */}
                      <div className="flex-1 min-w-[110px] relative">
                        <select 
                          value={filterThana}
                          onChange={(e) => setFilterThana(e.target.value)}
                          disabled={!filterDistrict}
                          className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-red-400 rounded-xl pl-3 pr-7 py-2 text-[8.5px] font-black uppercase tracking-wider focus:ring-4 focus:ring-red-500/10 shadow-sm transition-all disabled:opacity-45 text-slate-700 outline-none appearance-none cursor-pointer"
                        >
                          <option value="">ALL THANAS</option>
                          {filterDistrict && BANGLADESH_LOCATIONS[filterDistrict].sort().map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-3 h-3 rotate-90 stroke-[2.5]" />
                        </div>
                      </div>

                      {/* Filter: Blood Group */}
                      <div className="flex-1 min-w-[110px] relative">
                        <select 
                          value={filterBloodGroup}
                          onChange={(e) => setFilterBloodGroup(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-red-400 rounded-xl pl-3 pr-7 py-2 text-[8.5px] font-black uppercase tracking-wider focus:ring-4 focus:ring-red-500/10 shadow-sm transition-all text-slate-705 outline-none appearance-none cursor-pointer"
                        >
                          <option value="">ANY BLOOD GROUP</option>
                          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-3 h-3 rotate-90 stroke-[2.5]" />
                        </div>
                      </div>

                      {/* Clear Button */}
                      {(filterDistrict || filterThana || filterBloodGroup) && (
                        <button
                          onClick={resetFilters}
                          type="button"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-xl text-[8.5px] font-black uppercase tracking-widest border border-rose-100 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Request stream grid */}
                  <div className="px-4 md:px-6 py-4 bg-slate-50/30 space-y-4 min-h-screen">
                    {(() => {
                      const filtered = requests.filter(r => (!filterDistrict || r.district === filterDistrict) && 
                                  (!filterThana || r.thana === filterThana) &&
                                  (!filterBloodGroup || r.bloodGroup === filterBloodGroup) &&
                                  (!hideFulfilled || r.status === 'Pending'));
                      
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-8 max-w-sm mx-auto my-8">
                            <div className="w-12 h-12 bg-red-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500 border border-red-500/10 shadow-sm">
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">No Feed Entries Matches</h4>
                            <p className="text-[10.5px] text-slate-400 mt-2 font-medium leading-relaxed max-w-xs mx-auto">
                              Try adjusting the region or blood factor filters above to explore other matching donations running nearby.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                          {filtered.map(req => (
                            <div key={req.id} className="h-full">
                              <RequestCard 
                                request={req} 
                                user={user}
                                allUsers={allUsers}
                                onMessage={() => user ? openChat(req.requesterUid) : handleLogin()} 
                                onViewProfile={() => onViewProfile(req.requesterUid)}
                                onDelete={(profile?.role === 'admin' || user?.uid === req.requesterUid) ? () => handleDeleteRequest(req.id) : undefined}
                                onDonationDone={handleDonationDone}
                                onMatchDonors={() => setMatchingDonorsRequest(req)}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <SeoFooter setView={setView} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'find' && (
            <motion.div
              key="find"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full overflow-y-auto pt-24 pb-24 p-4 md:p-6 bg-slate-50/40"
            >
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Stunning Modern Banner */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-12 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-3.5 bg-red-600/20 border border-red-500/20 rounded-2xl shrink-0">
                        <Search className="w-6 h-6 text-red-500 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/10 inline-block">
                          Instant Volunteer Matcher
                        </span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1 flex items-center gap-2 flex-wrap">
                          <span>{(filterDistrict === profile?.district && filterThana === profile?.thana) ? 'Nearby Volunteer Donors' : 'Volunteer Donor Registry'}</span>
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      <button 
                        onClick={() => {
                          console.log("Donor Page: Appeal Blood CTA triggered");
                          if (user) setView('request-form');
                          else handleLogin();
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-950/20 hover:shadow-red-900/40 border border-red-500/30 transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" /> Request Blood
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-4 max-w-2xl font-medium leading-relaxed">
                    Instantly search, coordinate and contact matching active volunteer donors within specific districts & thanas. Filter by blood group factor to discover nearby guardian angels.
                  </p>
                </div>

                {/* Search Filter Control Center */}
                <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-xl shadow-slate-200/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 ">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Filters Control Panel</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {displayedDonors(allUsers, activeDonors, filterDistrict, filterThana, filterBloodGroup, filterOrgId).length} Matchable Volunteers
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* District selector block */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">District Zone</span>
                      <div className="relative">
                        <select 
                          value={filterDistrict}
                          onChange={(e) => { setFilterDistrict(e.target.value); setFilterThana(''); }}
                          className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-3.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-800 transition-all outline-none appearance-none pr-9 select-none cursor-pointer"
                        >
                          <option value="">ALL DISTRICTS</option>
                          {Object.keys(BANGLADESH_LOCATIONS).sort().map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Thana selector block */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">Thana / Sub-District Area</span>
                      <div className="relative">
                        <select 
                          value={filterThana}
                          onChange={(e) => setFilterThana(e.target.value)}
                          disabled={!filterDistrict}
                          className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-3.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-800 transition-all outline-none disabled:opacity-40 disabled:bg-slate-50/50 appearance-none pr-9 select-none cursor-pointer"
                        >
                          <option value="">ALL THANAS</option>
                          {filterDistrict && BANGLADESH_LOCATIONS[filterDistrict].sort().map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Blood group selector block */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">Blood Group Factor</span>
                      <div className="relative">
                        <select 
                          value={filterBloodGroup}
                          onChange={(e) => setFilterBloodGroup(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3.5 py-3.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-800 transition-all outline-none appearance-none pr-9 select-none cursor-pointer"
                        >
                          <option value="">ANY BLOOD GROUP</option>
                          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter actions helper links */}
                  {(filterDistrict || filterThana || filterBloodGroup) && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={resetFilters}
                        className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 border border-rose-200/50 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Donor Showcase Grid (Premium dual list layout) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedDonors(allUsers, activeDonors, filterDistrict, filterThana, filterBloodGroup, filterOrgId)
                    .slice(0, visibleDonorsCount)
                    .map(donor => (
                      <div key={donor.uid} className="h-full">
                        <DonorCard 
                          donor={donor} 
                          currentUserProfile={profile}
                          onMessage={() => openChat(donor.uid)} 
                          onViewProfile={() => onViewProfile(donor.uid)}
                        />
                      </div>
                  ))}
                </div>

                {/* Empty State visualizer */}
                {displayedDonors(allUsers, activeDonors, filterDistrict, filterThana, filterBloodGroup, filterOrgId).length === 0 && (
                  <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-150 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-sm shadow-slate-100">
                      <UserIcon className="w-6 h-6 shrink-0 opacity-50" />
                    </div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">No Registered Donors matching</h3>
                    <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed font-medium">
                      Try resetting your filter parameters or selecting a broader sub-district region to expand search boundaries.
                    </p>
                  </div>
                )}

                {/* Load More Button */}
                {displayedDonors(allUsers, activeDonors, filterDistrict, filterThana, filterBloodGroup, filterOrgId).length > visibleDonorsCount && (
                  <div ref={findEndRef} className="py-8 text-center">
                    <button 
                      onClick={() => setVisibleDonorsCount(prev => prev + 50)}
                      className="bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer shadow-md"
                    >
                      Load More Volunteers
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {view === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto pt-20 pb-20 p-4"
            >
              <div className="max-w-4xl mx-auto pb-8">
                {/* Community Header Card */}
                <div className="mb-6 bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-white/5">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)', backgroundSize: '24px 24px' }} />
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl animate-pulse" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                        <Flame className="w-3.5 h-3.5 animate-bounce text-rose-400" />
                        <span>Connected Lifesavers</span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Community Hub</h1>
                      <p className="text-xs text-slate-350 max-w-sm leading-relaxed">
                        Read emergency outcomes, share volunteer motivation, and see direct outcomes of blood donor drives inside Bangladesh.
                      </p>
                    </div>

                    <button 
                      onClick={() => user ? setView('post-opinion') : handleLogin()}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-950/40 cursor-pointer text-xs uppercase tracking-wider shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Share Your Story
                    </button>
                  </div>
                </div>

                {/* Who to Follow Discovery Section */}
                {suggestedUsers.length > 0 && (
                  <div className="mb-8 bg-slate-50 border border-slate-100 rounded-[2rem] p-5">
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-slate-800 text-sm tracking-tight">Active Bangladesh Lifesavers</h3>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 snap-x">
                      {suggestedUsers.map(suggestedUser => {
                        const isFollowing = suggestedUser.followers?.includes(user?.uid || '');
                        return (
                          <div 
                            key={suggestedUser.uid}
                            className="flex-shrink-0 w-48 bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all snap-start flex flex-col items-center text-center relative overflow-hidden group"
                          >
                            <button 
                              onClick={() => onViewProfile(suggestedUser.uid)}
                              className="relative mb-3 group"
                            >
                              <img 
                                src={suggestedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestedUser.displayName)}&background=random`} 
                                alt={suggestedUser.displayName}
                                className="w-16 h-16 rounded-[1.25rem] object-cover ring-4 ring-slate-100 group-hover:ring-rose-100 transition-all border border-slate-100"
                              />
                              {suggestedUser.isVerified && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                                  <BadgeCheck className="w-4.5 h-4.5 text-blue-500 fill-white" />
                                </div>
                              )}
                            </button>
                            <h4 className="font-extrabold text-slate-800 text-xs line-clamp-1 mb-1 hover:text-rose-600 transition-colors cursor-pointer" onClick={() => onViewProfile(suggestedUser.uid)}>{suggestedUser.displayName}</h4>
                            <p className="text-[9px] font-bold text-slate-550 mb-3 block">
                              📍 {suggestedUser.thana || 'Dhaka'}
                            </p>
                            
                            {user && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await updateDoc(doc(db, 'users', suggestedUser.uid), {
                                      followers: isFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid)
                                    });
                                    addToast(isFollowing ? "Unfollowed" : "Following", isFollowing ? `You are no longer following ${suggestedUser.displayName}.` : `You are now following ${suggestedUser.displayName}.`, 'success');
                                  } catch (err) {
                                    console.error("Follow failed:", err);
                                    addToast("Error", "Action failed.", "error");
                                  }
                                }}
                                className={`w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${isFollowing ? 'bg-slate-100 text-slate-650 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'}`}
                              >
                                {isFollowing ? (
                                  <Check className="w-3 h-3 text-slate-500" />
                                ) : (
                                  <UserPlus className="w-3 h-3" />
                                )}
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ultimate Search + Filter Bar Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 mb-6 space-y-4">
                  {/* Search input group */}
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search stories by content, volunteer name or location..."
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all text-slate-800"
                    />
                    {communitySearch && (
                      <button 
                        onClick={() => setCommunitySearch('')}
                        className="absolute right-4 top-3 text-[10px] bg-slate-200/80 hover:bg-slate-250 text-slate-600 px-2 py-1 rounded-md transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Hash Tags Quick Selector Row */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Filter by Popular Tags</p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {['#Emergency', '#LifeSaver', '#ThankYou', '#BloodDrive', '#Tips', '#CampAlert', '#FirstTimeDonation'].map(tag => {
                        const isTagActive = activeTag === tag;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setActiveTag(isTagActive ? '' : tag)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wider transition-all ${isTagActive ? 'bg-rose-50 border-rose-200 text-rose-700 font-extrabold ring-2 ring-rose-500/10' : 'bg-slate-50 border-slate-100 text-slate-550 hover:bg-slate-100 hover:border-slate-200'}`}
                          >
                            <span className="opacity-75">#</span> {tag.replace('#', '')}
                          </button>
                        );
                      })}
                      {activeTag && (
                        <button 
                          onClick={() => setActiveTag('')}
                          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 filter hover:bg-slate-800 active:scale-95"
                        >
                          Clear Tag <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Tabs switcher */}
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button
                      onClick={() => setCommunityTab('discover')}
                      className={`flex-1 py-2.5 text-center text-slate-650 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${communityTab === 'discover' ? 'bg-white text-rose-700 shadow-sm font-extrabold' : 'hover:text-slate-900 border-transparent bg-transparent'}`}
                    >
                      All Stories
                    </button>
                    <button
                      onClick={() => setCommunityTab('following')}
                      className={`flex-1 py-2.5 text-center text-slate-650 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${communityTab === 'following' ? 'bg-white text-rose-700 shadow-sm font-extrabold' : 'hover:text-slate-900 border-transparent bg-transparent'}`}
                    >
                      Following Feed
                    </button>
                    <button
                      onClick={() => setCommunityTab('verified')}
                      className={`flex-1 py-1 px-1 py-2.5 text-center text-slate-650 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${communityTab === 'verified' ? 'bg-white text-rose-700 shadow-sm font-extrabold' : 'hover:text-slate-900 border-transparent bg-transparent'}`}
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-white" /> Verified Authors
                    </button>
                  </div>
                </div>

                {/* Stream feeds container */}
                <div className="space-y-4">
                  {/* Dynamic Filtering Code */}
                  {(() => {
                    const filtered = posts.filter(post => {
                      // Tab Check
                      if (communityTab === 'following') {
                        if (!user) return false;
                        const author = allUsers.find(u => u.uid === post.authorUid);
                        const isFollowing = author?.followers?.includes(user.uid) || post.authorUid === user.uid;
                        if (!isFollowing) return false;
                      } else if (communityTab === 'verified') {
                        const author = allUsers.find(u => u.uid === post.authorUid);
                        if (!author?.isVerified) return false;
                      }

                      // Active Hash Tag Check
                      if (activeTag) {
                        const t = activeTag.toLowerCase();
                        if (!post.content?.toLowerCase().includes(t)) return false;
                      }

                      // Search Term Check
                      if (communitySearch.trim()) {
                        const searchLower = communitySearch.toLowerCase();
                        const author = allUsers.find(u => u.uid === post.authorUid);
                        const contentMatch = post.content?.toLowerCase().includes(searchLower);
                        const authorMatch = author?.displayName?.toLowerCase().includes(searchLower) || author?.thana?.toLowerCase().includes(searchLower) || author?.district?.toLowerCase().includes(searchLower);
                        if (!contentMatch && !authorMatch) return false;
                      }

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white rounded-[2.5rem] p-12 text-center border border-dashed border-slate-200 shadow-sm">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Tag className="w-7 h-7 text-slate-350" />
                          </div>
                          <h3 className="font-bold text-slate-800 text-base mb-1">No matching story outcomes</h3>
                          <p className="text-slate-400 text-xs max-w-[280px] mx-auto mb-4 leading-relaxed">
                            No posts fit your current search filter terms. Try resetting filters or tags to preview everything.
                          </p>
                          {(communitySearch || activeTag || communityTab !== 'discover') && (
                            <button 
                              onClick={() => {
                                setCommunitySearch('');
                                setActiveTag('');
                                setCommunityTab('discover');
                              }}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      );
                    }

                    return filtered.slice(0, feedLimit).map(post => (
                      <div key={post.id} className="transition-all hover:translate-y-[-1px]">
                        <PostCard 
                          post={post} 
                          user={user} 
                          profile={profile} 
                          allUsers={allUsers}
                          onViewProfile={(uid) => onViewProfile(uid)}
                          askConfirm={askConfirm}
                          addToast={addToast}
                          notifyAdmins={notifyAdmins}
                        />
                      </div>
                    ));
                  })()}

                  {posts.length >= feedLimit && (
                    <div ref={feedEndRef} className="py-12 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading more stories...</p>
                    </div>
                  )}

                  {posts.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Droplets className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No opinions shared yet. Be the first!</p>
                    </div>
                  )}
                  <SeoFooter setView={setView} />
                </div>
              </div>
            </motion.div>
          )}

        {view === 'request-form' && user && (
          <motion.div key="request-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <RequestForm 
                onCancel={() => setView('requests')} 
                onSuccess={() => setView('requests')}
                user={user}
                notifyAdmins={notifyAdmins}
                settings={settings}
              />
            </div>
          </motion.div>
        )}

        {view === 'post-opinion' && user && (
          <motion.div key="post-opinion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <PostForm 
                onCancel={() => setView('feed')} 
                onSuccess={() => setView('feed')}
                user={user}
                profile={profile}
                notifyAdmins={notifyAdmins}
              />
            </div>
          </motion.div>
        )}

        {view === 'profile' && user && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <ProfileForm 
                user={user} 
                initialProfile={profile} 
                requests={requests.filter(r => r.requesterUid === user.uid)}
                donations={donations}
                posts={posts}
                allUsers={allUsers}
                onLeave={leaveOrganization}
                onNavigateOrganizations={() => setView('organizations')}
                onSuccess={(p) => { setProfile(p); setView('requests'); handleSetActiveChat(null); }}
                onViewProfile={(uid) => onViewProfile(uid)}
                askConfirm={askConfirm}
                addToast={addToast}
                requestNotificationPermission={requestNotificationPermission}
                notifyAdmins={notifyAdmins}
                onLogout={handleLogout}
              />

              <div className="mt-12 pt-12 border-t border-slate-100 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-1">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-black text-red-600 uppercase tracking-tighter">Blood</span>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Link</span>
                </div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Systems</p>
              </div>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">Build ID: {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Local_Dev'}</p>
                </div>
                <button 
                  onClick={async () => {
                    addToast("Checking...", "Checking for app updates...", "info");
                    try {
                      const versionUrl = new URL('/version.json', window.location.origin);
                      versionUrl.searchParams.set('t', Date.now().toString());
                      const res = await fetch(versionUrl.toString());
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      const data = await res.json();
                      if (data.version && data.version !== __APP_VERSION__) {
                        setHasUpdate(true);
                        addToast("Update Available", "A new version of BloodLink is ready!", "success");
                      } else {
                        addToast("Up to Date", "You are using the latest version of BloodLink.", "success");
                      }
                    } catch (e) {
                      console.error("Force update check failed:", e);
                      addToast("Check Failed", "Could not reach update server. Check your connection.", "error");
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 border border-slate-100 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Force Version Check
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'notifications' && (
          <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <NotificationsView requests={requests} globalAlerts={globalAlerts} profile={profile} addToast={addToast} onDonationDone={handleDonationDone} />
            </div>
          </motion.div>
        )}

        {view === 'admin' && profile?.role === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <AdminPanel 
                users={allUsers} 
                requests={requests} 
                posts={posts} 
                reports={reports} 
                organizations={organizations} 
                orgApplications={orgApplications}
                adminUser={user}
                notifications={adminNotifications}
                settings={settings}
                onDeleteRequest={handleDeleteRequest}
                askConfirm={askConfirm}
                addToast={addToast}
                setView={setView}
                hasUpdate={hasUpdate}
                setHasUpdate={setHasUpdate}
              />
            </div>
          </motion.div>
        )}

        {view === 'public-profile' && selectedUserId && (
          <motion.div 
            key="public-profile" 
            ref={profileScrollRef}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="h-full overflow-y-auto pt-20 pb-20 p-4"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (touch) {
                const isAtTop = !profileScrollRef.current || profileScrollRef.current.scrollTop <= 0;
                if (isAtTop) {
                  profileTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
                } else {
                  profileTouchStartRef.current = null;
                }
              }
            }}
            onTouchMove={(e) => {
              if (!profileTouchStartRef.current) return;
              const touch = e.touches[0];
              if (touch) {
                const deltaY = touch.clientY - profileTouchStartRef.current.y;
                const deltaX = Math.abs(touch.clientX - profileTouchStartRef.current.x);
                // If swiped down past 80 pixels and swipe down is primary
                if (deltaY > 80 && deltaY > deltaX * 1.5) {
                  profileTouchStartRef.current = null; // reset
                  setView('requests');
                  addToast("Profile Closed", "Swiped down to close", "info");
                }
              }
            }}
            onTouchEnd={() => {
              profileTouchStartRef.current = null;
            }}
          >
            <div className="max-w-4xl mx-auto pb-4">
              <PublicProfileView 
                uid={selectedUserId} 
                onBack={() => setView('requests')} 
                onMessage={(uid) => openChat(uid)}
                currentUser={user}
                currentProfile={profile}
                onDeleteRequest={handleDeleteRequest}
                onDonationDone={handleDonationDone}
                addToast={addToast}
                allUsers={allUsers}
                askConfirm={askConfirm}
                notifyAdmins={notifyAdmins}
                onViewProfile={(uid) => onViewProfile(uid)}
              />
            </div>
          </motion.div>
        )}

        {view === 'organizations' && (
          <motion.div key="organizations" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-28 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <OrganizationsView 
                organizations={organizations} 
                currentUser={user}
                profile={profile}
                onJoin={joinOrganization}
                onViewDashboard={(org) => { setSelectedOrgId(org.id); setView('org-dashboard'); }}
                onCreateOrg={() => setView('org-apply')}
              />
            </div>
          </motion.div>
        )}

        {view === 'org-dashboard' && selectedOrgId && (
          <motion.div key={`org-dash-${selectedOrgId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto pt-20 pb-20 p-4">
            <div className="max-w-4xl mx-auto pb-4">
              <OrgDashboard 
                org={organizations.find(o => o.id === selectedOrgId)!} 
                users={allUsers}
                allRequests={requests}
                allPosts={posts}
                user={user}
                profile={profile}
                setView={setView}
                handleLogin={handleLogin}
                onDeleteRequest={handleDeleteRequest}
                onDonationDone={handleDonationDone}
                askConfirm={askConfirm}
                addToast={addToast}
                notifyAdmins={notifyAdmins}
                onMatchDonors={(req) => setMatchingDonorsRequest(req)}
              />
            </div>
          </motion.div>
        )}

        {view === 'chats' && user && (
          <motion.div
            key="chats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full overflow-y-auto pt-20 pb-20 p-4"
          >
            <div className="max-w-4xl mx-auto pb-4">
              <ChatList 
                chats={chats} 
                currentUser={user} 
                users={allUsers} 
                onChatSelect={(c) => { handleSetActiveChat(c); setView('chat-room'); }} 
              />
            </div>
          </motion.div>
        )}

        {view === 'chat-room' && user && activeChat && (
          <motion.div
            key="chat-room"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-[#f8fafc] z-[200] flex flex-col"
          >
            <ChatRoom 
              chat={activeChat} 
              currentUser={user} 
              users={allUsers} 
              onBack={() => { setView('chats'); handleSetActiveChat(null); }} 
              onStartVoiceCall={startVoiceCall}
            />
          </motion.div>
        )}

        {view === 'about' && (
          <motion.div 
            key="about" 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            className="h-full overflow-y-auto pt-20 pb-20 p-4 md:p-6 bg-slate-50/40"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                  <Heart className="w-48 h-48 text-red-655" />
                </div>
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                  <button 
                    onClick={() => setView('requests')} 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Section: About Us</span>
                </div>
                <div className="prose max-w-none text-slate-700">
                  {renderMarkdown(settings?.seoAbout || defaultSeoContent.about)}
                </div>
                <SeoFooter setView={setView} />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'contact' && (
          <motion.div 
            key="contact" 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            className="h-full overflow-y-auto pt-20 pb-20 p-4 md:p-6 bg-slate-50/40"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                  <Phone className="w-48 h-48 text-red-655" />
                </div>
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                  <button 
                    onClick={() => setView('requests')} 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Section: Contact Info</span>
                </div>
                <div className="prose max-w-none text-slate-700">
                  {renderMarkdown(settings?.seoContact || defaultSeoContent.contact)}
                </div>
                <SeoFooter setView={setView} />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'privacy' && (
          <motion.div 
            key="privacy" 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            className="h-full overflow-y-auto pt-20 pb-20 p-4 md:p-6 bg-slate-50/40"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                  <Shield className="w-48 h-48 text-red-655" />
                </div>
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                  <button 
                    onClick={() => setView('requests')} 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Section: Privacy Policy</span>
                </div>
                <div className="prose max-w-none text-slate-700">
                  {renderMarkdown(settings?.seoPrivacy || defaultSeoContent.privacy)}
                </div>
                <SeoFooter setView={setView} />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'terms' && (
          <motion.div 
            key="terms" 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            className="h-full overflow-y-auto pt-20 pb-20 p-4 md:p-6 bg-slate-50/40"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                  <BookOpen className="w-48 h-48 text-red-655" />
                </div>
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                  <button 
                    onClick={() => setView('requests')} 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Section: Terms & Conditions</span>
                </div>
                <div className="prose max-w-none text-slate-700">
                  {renderMarkdown(settings?.seoTerms || defaultSeoContent.terms)}
                </div>
                <SeoFooter setView={setView} />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'faq' && (
          <motion.div 
            key="faq" 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            className="h-full overflow-y-auto pt-20 pb-20 p-4 md:p-6 bg-slate-50/40"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[2.5rem] p-6 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                  <HelpCircle className="w-48 h-48 text-red-655" />
                </div>
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                  <button 
                    onClick={() => setView('requests')} 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Section: General FAQ</span>
                </div>
                <div className="prose max-w-none text-slate-700">
                  {renderMarkdown(settings?.seoFaq || defaultSeoContent.faq)}
                </div>
                <SeoFooter setView={setView} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>

      <AnimatePresence>
        {(activeCall || incomingCall) && (
          <CallOverlay 
            key={(activeCall || incomingCall)?.id}
            call={(activeCall || incomingCall)!}
            isIncoming={(activeCall || incomingCall)?.receiverUid === user?.uid}
            onAccept={() => incomingCall && acceptCall(incomingCall)}
            onEnd={() => endCall((activeCall || incomingCall)!.id)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMicPrompt.show && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMicPrompt({ show: false, onGranted: null })}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 pt-12 flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20 scale-150" />
                  <div className="relative w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
                    <Mic className="w-10 h-10 text-red-600" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Microphone Access</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 px-4 text-center">
                  To start a voice call, we need access to your microphone. This allows you to talk with others securely.
                </p>
                
                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      setMicRequesting(true);
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(track => track.stop());
                        const callback = showMicPrompt.onGranted;
                        setShowMicPrompt({ show: false, onGranted: null });
                        if (callback) callback();
                      } catch (e) {
                        addToast("Permission Denied", "Unable to access microphone.", "error");
                      } finally {
                        setMicRequesting(false);
                      }
                    }}
                    disabled={micRequesting}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-200 disabled:opacity-50"
                  >
                    {micRequesting ? 'Granting...' : 'Allow Microphone'}
                  </button>
                  <button 
                    onClick={() => setShowMicPrompt({ show: false, onGranted: null })}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Not Now
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">End-to-end encrypted Audio</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Update Notification Popup */}
        {hasUpdate && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-8 pt-10 text-center">
                <div className="relative inline-flex mb-6">
                  <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-30 scale-125" />
                  <div className="relative w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-red-600 animate-spin-slow" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">New Update Ready!</h2>
                <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8 px-2">
                  A new version of BloodLink is available with improvements and fixes. Update now to ensure everything works perfectly.
                </p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      // Force a hard reload to clear cache
                      window.location.reload();
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Update & Refresh
                  </button>
                  <button 
                    onClick={() => setHasUpdate(false)}
                    className="w-full py-3 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all active:scale-95 border border-slate-100 rounded-2xl"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMiddleMenu && (
          <>
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMiddleMenu(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
            />
            {/* Action Popup Sheet */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-[80px] left-4 right-4 bg-white rounded-3xl p-6 shadow-2xl z-[120] border border-slate-100 max-w-sm mx-auto pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Quick Actions</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Bangladesh BloodLink</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMiddleMenu(false)}
                  className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Option 1: Add New Blood Request (Red Button) */}
                <button
                  onClick={() => {
                    setShowMiddleMenu(false);
                    handleSetActiveChat(null);
                    if (user) {
                      setView('request-form');
                    } else {
                      handleLogin();
                    }
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 hover:from-white hover:to-white hover:text-red-600 transition-all text-left border border-red-600 hover:border-red-600 shadow-md shadow-red-500/20 active:scale-[0.98] group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-red-700 group-hover:bg-red-800 transition-colors" />
                  <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-red-50 flex items-center justify-center text-white group-hover:text-red-600 transition-colors shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-white group-hover:text-red-600 tracking-wider uppercase transition-colors">Add New Blood Request</h4>
                    <p className="text-[10px] text-red-100 group-hover:text-red-500 font-bold uppercase tracking-wider mt-0.5 transition-colors">Post emergency request</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 group-hover:text-red-500 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Option 2: Show Recent Requests (Black Button) */}
                <button
                  onClick={() => {
                    setShowMiddleMenu(false);
                    setView('requests');
                    resetFilters();
                    handleSetActiveChat(null);
                    setTimeout(() => {
                      setShowRequestsOverlay(true);
                    }, 150);
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 hover:from-white hover:to-white hover:text-slate-900 transition-all text-left border border-slate-950 hover:border-slate-950 shadow-md shadow-slate-900/20 active:scale-[0.98] group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75"
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-950 group-hover:bg-slate-900 transition-colors" />
                  <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-slate-100 flex items-center justify-center text-white group-hover:text-slate-900 transition-colors shrink-0">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-white group-hover:text-slate-900 tracking-wider uppercase transition-colors">Show Recent Requests</h4>
                    <p className="text-[10px] text-slate-300 group-hover:text-slate-500 font-bold uppercase tracking-wider mt-0.5 transition-colors">View active request feeds</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 group-hover:text-slate-900 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>


              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Button for Requesting Blood (Home View only, Left Corner above nav - hidden if map overview is open) */}
      <AnimatePresence>
        {view === 'requests' && !showRequestsOverlay && !mapOverviewOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -30 }}
            className="fixed z-[110] bottom-24 left-6 select-none"
          >
            <div className="relative group">
              {/* Pulsing glow influence matching the blood drop shape */}
              <div className="absolute -inset-1.5 bg-red-600/20 rounded-tl-none rounded-tr-full rounded-br-full rounded-bl-full rotate-45 blur-md opacity-75 group-hover:opacity-100 transition-opacity animate-pulse duration-1000 pointer-events-none" />
              
              <button
                type="button"
                onClick={() => {
                  if (user) setView('request-form');
                  else handleLogin();
                }}
                className="w-16 h-16 bg-red-600 active:bg-red-850 text-white rounded-tl-none rounded-tr-full rounded-br-full rounded-bl-full rotate-45 flex items-center justify-center shadow-[0_8px_24px_rgba(220,38,38,0.35)] hover:shadow-[0_12px_28px_rgba(220,38,38,0.55)] border-2 border-white transition-all transform active:scale-90 hover:scale-[1.03] cursor-pointer select-none"
                style={{ touchAction: 'manipulation' }}
                title="Request Blood Now"
                id="floating-blood-request-btn"
              >
                <div className="-rotate-45 flex flex-col items-center justify-center text-center mt-0.5 px-1.5">
                  <Plus className="w-4 h-4 text-white stroke-[4] mb-0.5" />
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-white leading-tight">
                    Request<br />Blood
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 sm:bottom-4 left-0 sm:left-4 right-0 sm:right-4 max-w-lg sm:mx-auto h-16 bg-white/95 backdrop-blur-md sm:rounded-2xl border-t sm:border border-slate-200/50 px-3 flex justify-around items-center z-[100] shadow-[0_-10px_35px_rgba(15,23,42,0.03)] sm:shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
        <NavButton 
          active={view === 'requests' && !showRequestsOverlay} 
          icon={<Droplets className="text-red-500" />} 
          label="Home" 
          onClick={() => { 
            setView('requests'); 
            setShowRequestsOverlay(false); 
            handleSetActiveChat(null); 
          }} 
        />
        
        <NavButton 
          active={view === 'requests' && showRequestsOverlay} 
          badge={requests.filter(r => r.status === 'Pending').length || undefined}
          icon={<Heart className="text-red-500" />} 
          label="Requests" 
          onClick={() => { 
            setView('requests'); 
            setShowRequestsOverlay(true); 
            handleSetActiveChat(null); 
          }} 
        />

        <NavButton 
          active={view === 'find'} 
          icon={<Search />} 
          label="Find Donor" 
          onClick={() => { 
            setView('find'); 
            setShowRequestsOverlay(false); 
            handleSetActiveChat(null); 
          }} 
        />

        <NavButton 
          active={view === 'feed'} 
          badge={newPostsCount > 0 ? newPostsCount : undefined} 
          icon={<Users className={view === 'feed' ? "animate-pulse" : ""} />} 
          label="Community" 
          onClick={() => { 
            setView('feed'); 
            setShowRequestsOverlay(false); 
            handleSetActiveChat(null); 
          }} 
        />

        <NavButton 
          active={view === 'profile'} 
          icon={user ? <UserIcon /> : <UserIcon />} 
          label={user ? "Profile" : "Sign In"} 
          onClick={() => { 
            if (user) setView('profile'); 
            else handleLogin(); 
            setShowRequestsOverlay(false); 
            handleSetActiveChat(null); 
          }} 
        />
      </nav>
    </div>
    </APIProvider>
  );
}

// --- SEO markdown clean parser and footer helpers ---

function renderMarkdown(text: string) {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-xl md:text-2xl font-black text-slate-950 mt-8 mb-4 tracking-tight pb-3 border-b border-rose-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-650 rounded-full shrink-0 animate-pulse" />
          {trimmed.replace('## ', '')}
        </h2>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-base font-extrabold text-slate-800 mt-6 mb-3 tracking-tight">
          {trimmed.replace('### ', '')}
        </h3>
      );
    }
    if (trimmed.startsWith('* **')) {
      const match = trimmed.match(/^\*\s+\*\*(.*?)\*\*:\s*(.*)/);
      if (match) {
        return (
          <div key={idx} className="mb-3 text-xs md:text-sm text-slate-705 pl-4 border-l-2 border-red-500">
            <strong className="text-slate-900 font-extrabold">{match[1]}:</strong> {match[2]}
          </div>
        );
      }
    }
    if (trimmed.startsWith('* ')) {
      return (
        <li key={idx} className="list-disc ml-5 mb-2 text-xs md:text-sm text-slate-600 leading-relaxed">
          {trimmed.replace('* ', '')}
        </li>
      );
    }
    if (trimmed.startsWith('1. **')) {
      const match = trimmed.match(/^1\.\s+\*\*(.*?)\*\*:\s*(.*)/);
      if (match) {
        return (
          <div key={idx} className="mb-4 text-xs md:text-sm text-slate-655 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <strong className="text-slate-900 block mb-1.5 font-extrabold">{match[1]}</strong>
            <span className="leading-relaxed">{match[2]}</span>
          </div>
        );
      }
    }
    if (trimmed === '') {
      return <div key={idx} className="h-2" />;
    }
    return <p key={idx} className="text-xs md:text-sm text-slate-600 mb-3.5 leading-relaxed">{trimmed}</p>;
  });
}

function SeoFooter({ setView }: { setView: (v: any) => void }) {
  return (
    <div className="w-full mt-12 mb-4 border-t border-slate-100 pt-8 px-4 text-center">
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mb-4 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
        <button onClick={() => setView('about')} className="hover:text-red-655 transition-colors cursor-pointer text-slate-500 font-bold">About Us</button>
        <span className="opacity-30">•</span>
        <button onClick={() => setView('contact')} className="hover:text-red-655 transition-colors cursor-pointer text-slate-500 font-bold">Contact</button>
        <span className="opacity-30">•</span>
        <button onClick={() => setView('privacy')} className="hover:text-red-700 transition-colors cursor-pointer text-slate-500 font-bold">Privacy Policy</button>
        <span className="opacity-30">•</span>
        <button onClick={() => setView('terms')} className="hover:text-red-700 transition-colors cursor-pointer text-slate-500 font-bold">Terms & Conditions</button>
        <span className="opacity-30">•</span>
        <button onClick={() => setView('faq')} className="hover:text-red-655 transition-colors cursor-pointer text-slate-500 font-bold">FAQ</button>
      </div>
      <p className="text-[9px] text-slate-400 font-bold tracking-wide">
        © {new Date().getFullYear()} <strong className="text-slate-500">BloodLink BD</strong>. National Voluntary Blood Matching Network.
      </p>
    </div>
  );
}

// --- Admin Panel Component ---

function UserAssignOrgForm({ 
  user, 
  organizations, 
  onCancel, 
  onSuccess,
  addToast
}: { 
  user: UserProfile, 
  organizations: Organization[], 
  onCancel: () => void, 
  onSuccess: () => void,
  addToast: (title: string, body: string, type?: Toast['type']) => void
}) {
  const [selectedOrgId, setSelectedOrgId] = useState(user.organizationId || '');
  const [isNewAdmin, setIsNewAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    const org = organizations.find(o => o.id === selectedOrgId);
    if (!org) return;

    try {
      const batch = writeBatch(db);
      
      // Update User Profile
      batch.update(doc(db, 'users', user.uid), {
        organizationId: selectedOrgId,
        organizationName: org.name
      });

      // Update Metadata: add to members if not already there
      const memberRef = doc(db, 'organizations', selectedOrgId, 'members', user.uid);
      batch.set(memberRef, {
        userId: user.uid,
        displayName: user.displayName,
        bloodGroup: user.bloodGroup,
        joinedAt: serverTimestamp(),
        status: 'active'
      }, { merge: true });

      // If promoting to Admin
      if (isNewAdmin) {
        batch.update(doc(db, 'organizations', selectedOrgId), {
          adminUid: user.uid
        });
      }

      await batch.commit();
      addToast("User Assigned", `User ${user.displayName} has been successfully assigned to ${org.name}`, 'success');
      onSuccess();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl mt-2 border border-slate-100 relative">
      <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Assign to Organization</p>
      <div className="space-y-3">
        <select 
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          className="w-full bg-white border-slate-200 rounded-xl text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Select Organization</option>
          {organizations.map(o => <option key={o.id} value={o.id}>{o.name} ({o.district})</option>)}
        </select>
        
        <label className="flex items-center gap-2 px-1 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isNewAdmin} 
            onChange={(e) => setIsNewAdmin(e.target.checked)}
            className="rounded border-slate-300 text-red-600 focus:ring-red-500" 
          />
          <span className="text-xs font-bold text-slate-600">Promote to Organization Admin</span>
        </label>

        <div className="flex gap-2 pt-1">
          <button 
            disabled={loading || !selectedOrgId}
            onClick={handleAssign}
            className="flex-1 bg-red-600 text-white text-[10px] font-black uppercase py-2.5 rounded-lg disabled:opacity-50 transition-all hover:bg-red-700 active:scale-95 shadow-md shadow-red-100"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
          <button 
            onClick={onCancel}
            className="flex-1 bg-white text-slate-400 text-[10px] font-black uppercase py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateOrganizationForm({ users, onCancel, onSuccess, addToast }: { users: UserProfile[], onCancel: () => void, onSuccess: () => void, addToast: (title: string, body: string, type?: Toast['type']) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    district: '',
    thana: '',
    adminEmail: '',
    contact: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const adminUser = users.find(u => u.email === formData.adminEmail);
    if (!adminUser) {
      addToast("Admin Not Found", "The specified admin user email does not match any existing profile.", 'error');
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'organizations'), {
        name: formData.name,
        description: formData.description,
        district: formData.district,
        thana: formData.thana,
        contact: formData.contact,
        adminUid: adminUser.uid,
        memberCount: 0,
        createdAt: serverTimestamp()
      });
      addToast("Org Created", "The organization has been created successfully!", 'success');
      onSuccess();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'organizations');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building className="w-6 h-6 text-red-600" />
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Create Organization</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest px-1">Organization Name</label>
          <input
            required
            type="text"
            placeholder="Official community name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest px-1">Description</label>
          <textarea
            required
            placeholder="What does this community do?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest px-1">District</label>
            <select
              required
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value, thana: '' })}
              className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select District</option>
              {Object.keys(BANGLADESH_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest px-1">Thana</label>
            <select
              required
              value={formData.thana}
              onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
              className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              disabled={!formData.district}
            >
              <option value="">Select Thana</option>
              {formData.district && BANGLADESH_LOCATIONS[formData.district].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest px-1">Admin Email</label>
            <input
              required
              type="email"
              placeholder="Admin's email address"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest px-1">Contact No.</label>
            <input
              required
              type="tel"
              placeholder="Official phone number"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 bg-red-600 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Org'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function EditOrganizationForm({ org, users, onCancel, onSuccess, addToast }: { org: Organization, users: UserProfile[], onCancel: () => void, onSuccess: () => void, addToast: (title: string, body: string, type?: Toast['type']) => void }) {
  const [formData, setFormData] = useState({
    name: org.name,
    description: org.description || '',
    district: org.district,
    thana: org.thana,
    adminEmail: users.find(u => u.uid === org.adminUid)?.email || '',
    contact: org.contact || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const adminUser = users.find(u => u.email === formData.adminEmail);
    if (!adminUser) {
      addToast("Admin Not Found", "The specified admin email does not match any existing user.", 'error');
      setSubmitting(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      const orgRef = doc(db, 'organizations', org.id);
      
      // Update Organization
      batch.update(orgRef, {
        name: formData.name,
        description: formData.description,
        district: formData.district,
        thana: formData.thana,
        contact: formData.contact,
        adminUid: adminUser.uid,
        updatedAt: serverTimestamp()
      });

      if (adminUser.uid !== org.adminUid) {
        // Update new admin profile
        const newUserRef = doc(db, 'users', adminUser.uid);
        batch.set(newUserRef, {
          organizationId: org.id,
          organizationName: formData.name
        }, { merge: true });
        
        // Note: We no longer clear the old admin profile automatically.
        // They stay as a member of the organization unless explicitly removed.
      } else if (formData.name !== org.name) {
        // Update current admin's cached org name
        const userRef = doc(db, 'users', adminUser.uid);
        batch.update(userRef, {
          organizationName: formData.name
        });
      }

      await batch.commit();
      addToast("Organization Updated", "The organization details have been successfully saved.", 'success');
      onSuccess();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `organizations/${org.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <Edit2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Organization</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Organization Details</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Organization Name</label>
          <input
            required
            type="text"
            placeholder="Official community name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Description</label>
          <textarea
            required
            placeholder="What does this community do?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">District</label>
            <select
              required
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value, thana: '' })}
              className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            >
              <option value="">Select District</option>
              {Object.keys(BANGLADESH_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Thana</label>
            <select
              required
              value={formData.thana}
              onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
              className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all disabled:opacity-50"
              disabled={!formData.district}
            >
              <option value="">Select Thana</option>
              {formData.district && BANGLADESH_LOCATIONS[formData.district].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Organization Admin</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                className="w-full bg-slate-50 border-transparent rounded-2xl pl-10 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                onChange={(e) => setUserSearch(e.target.value)}
                value={userSearch}
              />
            </div>
            {userSearch && (
              <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                {users
                  .filter(u => 
                    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
                    u.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .slice(0, 5)
                  .map(u => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, adminEmail: u.email });
                        setUserSearch('');
                      }}
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-all text-left"
                    >
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-xs text-slate-400">
                        {u.displayName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{u.displayName}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{u.email}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
            {formData.adminEmail && (
              <div className="mt-2 p-3 bg-red-50 rounded-xl flex items-center justify-between border border-red-100">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-800">{formData.adminEmail}</span>
                </div>
                <button type="button" onClick={() => setFormData({...formData, adminEmail: ''})} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Contact No.</label>
            <input
              required
              type="tel"
              placeholder="Official phone number"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner h-[52px]"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ImportDonorsModal({ org, organizations, onCancel, onSuccess, addToast }: { 
  org?: Organization, 
  organizations?: Organization[],
  onCancel: () => void, 
  onSuccess: () => void, 
  addToast: (title: string, body: string, type?: Toast['type']) => void 
}) {
  const [district, setDistrict] = useState(org?.district || '');
  const [thana, setThana] = useState(org?.thana || '');
  const [selectedOrgId, setSelectedOrgId] = useState(org?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setPreview(data.slice(0, 5));
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file || !district || !thana) return;
    setImporting(true);
    try {
      const bstr = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target?.result as string);
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const batch = writeBatch(db);
      let count = 0;
      
      const targetOrg = selectedOrgId ? (organizations?.find(o => o.id === selectedOrgId) || org) : null;

      for (const row of data) {
        if (!row.DisplayName || !row.BloodGroup || !row.Phone) continue;
        
        const uid = `imported_${Math.random().toString(36).substring(2, 11)}`;
        const userRef = doc(db, 'users', uid);
        
        let lastDonationDate: Timestamp | null = null;
        if (row.LastDonationDate) {
          const date = new Date(row.LastDonationDate);
          if (!isNaN(date.getTime())) {
            lastDonationDate = Timestamp.fromDate(date);
          }
        }

        const profileData: any = {
          uid,
          displayName: row.DisplayName,
          email: row.Email || null,
          bloodGroup: row.BloodGroup,
          district,
          thana,
          phone: row.Phone.toString(),
          gender: row.Gender || 'Other',
          isAvailable: true,
          lastDonationDate,
          role: 'user',
          createdAt: serverTimestamp()
        };

        if (targetOrg) {
          profileData.organizationId = targetOrg.id;
          profileData.organizationName = targetOrg.name;
          
          const memberRef = doc(db, 'organizations', targetOrg.id, 'members', uid);
          const memberData: OrganizationMember = {
            userId: uid,
            displayName: row.DisplayName,
            bloodGroup: row.BloodGroup,
            status: 'active',
            joinedAt: serverTimestamp() as Timestamp
          };
          batch.set(memberRef, memberData);
        }

        batch.set(userRef, profileData);
        count++;

        if (count >= 480) break;
      }

      if (count > 0) {
        if (targetOrg) {
          batch.update(doc(db, 'organizations', targetOrg.id), {
            memberCount: increment(count)
          });
        }
        await batch.commit();
        addToast("Import Successful", `${count} donors have been imported.`, 'success');
        onSuccess();
      } else {
        addToast("Import Failed", "No valid donor data found in the file.", 'error');
      }
    } catch (e) {
      console.error("Import error:", e);
      addToast("Import Error", "Failed to process the Excel file.", 'error');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { DisplayName: "John Doe", BloodGroup: "A+", Phone: "01712345678", Email: "john@example.com", Gender: "Male", LastDonationDate: "2024-01-15" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Donors");
    XLSX.writeFile(wb, "BloodLink_Donor_Template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Import Donor List</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Bulk add donors to the platform
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-4">
            <div className="bg-blue-100 p-2 rounded-xl h-fit"><FileSpreadsheet className="w-5 h-5 text-blue-600" /></div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-900 mb-1">Excel Format Required</p>
              <p className="text-[10px] text-blue-700 leading-relaxed mb-3">Include columns: <span className="font-black">DisplayName, BloodGroup, Phone</span>. (e.g. A+, B-, etc.)</p>
              <button onClick={downloadTemplate} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">Download Template</button>
            </div>
          </div>
          
          <div className="space-y-4">
            {organizations && organizations.length > 0 && !org && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Assign to Organization (Optional)</label>
                <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500">
                  <option value="">No Organization (General Donors)</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Target District</label>
                <select value={district} onChange={(e) => { setDistrict(e.target.value); setThana(''); }} className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500">
                  <option value="">Select District</option>
                  {Object.keys(BANGLADESH_LOCATIONS).sort().map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Target Thana</label>
                <select value={thana} onChange={(e) => setThana(e.target.value)} className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500 disabled:opacity-50" disabled={!district}>
                  <option value="">Select Thana</option>
                  {district && BANGLADESH_LOCATIONS[district].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Upload File (Excel/CSV)</label>
            <div className="relative group">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`p-8 border-2 border-dashed rounded-3xl text-center transition-all ${file ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 group-hover:bg-slate-100'}`}>
                <FileUp className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-green-500' : 'text-slate-300'}`} />
                <p className="text-sm font-bold text-slate-900 mb-1">{file ? file.name : 'Choose a file or drag it here'}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Supports .xlsx, .xls and .csv</p>
              </div>
            </div>
          </div>
          {preview.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preview (First 5 records)</h4>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead><tr className="border-b border-slate-200"><th className="px-3 py-2 font-black uppercase text-slate-400">Name</th><th className="px-3 py-2 font-black uppercase text-slate-400">Group</th><th className="px-3 py-2 font-black uppercase text-slate-400">Phone</th></tr></thead>
                  <tbody>{preview.map((row, i) => (<tr key={i} className="border-b border-slate-100 last:border-0 font-bold text-slate-700"><td className="px-3 py-2">{row.DisplayName || '---'}</td><td className="px-3 py-2">{row.BloodGroup || '---'}</td><td className="px-3 py-2">{row.Phone || '---'}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button onClick={onCancel} className="flex-1 bg-white text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest text-xs border border-slate-200">Cancel</button>
          <button disabled={!file || !district || !thana || importing} onClick={handleImport} className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {importing ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>) : (<><FileUp className="w-4 h-4" />Start Importing</>)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AdminPanel({ users, requests, posts, reports, organizations, orgApplications, adminUser, notifications, settings, onDeleteRequest, askConfirm, addToast, setView, hasUpdate, setHasUpdate }: { 
  users: UserProfile[], 
  requests: BloodRequest[], 
  posts: CommunityPost[], 
  reports: Report[], 
  organizations: Organization[], 
  orgApplications: OrganizationApplication[], 
  adminUser: FirebaseUser | null, 
  notifications: AdminNotification[],
  settings: SystemSettings | null, 
  onDeleteRequest: (id: string) => void,
  askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>,
  addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void,
  setView: (view: any) => void,
  hasUpdate: boolean,
  setHasUpdate: (v: boolean) => void
}) {
  const [tab, setTab] = useState<'stats' | 'users' | 'requests' | 'feed' | 'reports' | 'organizations' | 'applications' | 'settings' | 'alerts' | 'system' | 'gallery'>('stats');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [assigningToUserId, setAssigningToUserId] = useState<string | null>(null);
  const [showImportDonors, setShowImportDonors] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterBloodGroup, setUserFilterBloodGroup] = useState('');
  const [userFilterAvailability, setUserFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'blocked' | 'active'>('all');
  const [seoEditTab, setSeoEditTab] = useState<'about' | 'contact' | 'privacy' | 'terms' | 'faq'>('about');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'post' | 'profile'>('all');
  const [lightboxImage, setLightboxImage] = useState<any | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const displayName = u.displayName || '';
      const email = u.email || '';
      const phone = u.phone || '';
      const bloodGroup = u.bloodGroup || '';
      const district = u.district || '';
      const thana = u.thana || '';

      const matchesSearch = 
        displayName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        phone.includes(userSearchTerm) ||
        bloodGroup.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        district.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        thana.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      const matchesBlood = userFilterBloodGroup === '' || bloodGroup === userFilterBloodGroup;
      const matchesAvail = userFilterAvailability === 'all' || (userFilterAvailability === 'available' ? u.isAvailable : !u.isAvailable);
      const matchesStatus = userFilterStatus === 'all' || (userFilterStatus === 'blocked' ? u.isBlocked : !u.isBlocked);

      return matchesSearch && matchesBlood && matchesAvail && matchesStatus;
    });
  }, [users, userSearchTerm, userFilterBloodGroup, userFilterAvailability, userFilterStatus]);

  const bloodDistributionData = useMemo(() => {
    return BLOOD_GROUPS.map(bg => ({
      name: bg,
      value: users.filter(u => u.bloodGroup === bg).length
    })).filter(d => d.value > 0);
  }, [users]);

  const galleryItems = useMemo(() => {
    const items: Array<{
      id: string;
      url: string;
      source: 'post' | 'profile';
      title: string;
      author: string;
      authorUid: string;
      createdAt?: any;
    }> = [];

    // 1. Gather post images
    posts.forEach(p => {
      if (p.imageUrl) {
        const authorProfile = users.find(u => u.uid === p.authorUid);
        const authorName = authorProfile?.displayName || 'Unknown member';
        items.push({
          id: p.id,
          url: p.imageUrl,
          source: 'post',
          title: p.content ? (p.content.length > 80 ? p.content.slice(0, 80) + '...' : p.content) : 'Post attachment',
          author: authorName,
          authorUid: p.authorUid,
          createdAt: p.createdAt
        });
      }
    });

    // 2. Gather profile images
    users.forEach(u => {
      if (u.photoURL && u.photoURL.trim() !== '') {
        items.push({
          id: u.uid,
          url: u.photoURL,
          source: 'profile',
          title: 'Profile avatar photo',
          author: u.displayName || 'Unnamed member',
          authorUid: u.uid,
          createdAt: u.lastSeen || null
        });
      }
    });

    // Sort by createdAt desc
    items.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return timeB - timeA;
    });

    return items;
  }, [posts, users]);

  const COLORS = ['#ef4444', '#f87171', '#fb7185', '#fda4af', '#fecdd3', '#fee2e2', '#3b82f6', '#60a5fa'];
  const stats = {
    totalUsers: users.length,
    activeDonors: users.filter(u => u.isAvailable).length,
    blockedUsers: users.filter(u => u.isBlocked).length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'Pending').length,
    fulfilledRequests: requests.filter(r => r.status === 'Fulfilled').length,
    totalPosts: posts.length,
    hiddenPosts: posts.filter(p => p.isHidden).length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    totalOrgs: organizations.length,
    pendingApps: orgApplications.filter(a => a.status === 'pending').length,
    bloodGroupStats: BLOOD_GROUPS.reduce((acc, bg) => {
      acc[bg] = users.filter(u => u.bloodGroup === bg).length;
      return acc;
    }, {} as Record<string, number>)
  };

  const chartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });

    return last14Days.map(date => {
      const dailyRequests = requests.filter(r => {
        if (!r.createdAt?.toDate) return false;
        return r.createdAt.toDate().toISOString().split('T')[0] === date;
      }).length;
      
      const dailyFulfilled = requests.filter(r => {
        if (r.status !== 'Fulfilled' || !r.createdAt?.toDate) return false;
        return r.createdAt.toDate().toISOString().split('T')[0] === date;
      }).length;

      return {
        name: date.split('-').slice(2).join('/'),
        fullDate: date,
        requests: dailyRequests,
        fulfilled: dailyFulfilled
      };
    });
  }, [requests]);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApproveApp = async (app: OrganizationApplication) => {
    console.log("APPROVE ACTION INITIATED", { id: app.id, org: app.orgName });
    
    if (!app.applicantUid || app.applicantUid === 'anonymous') {
      addToast("Cannot Approve", "This application was submitted without a valid user account. The applicant must be logged in to be assigned as admin.", 'error');
      return;
    }
    
    setActionLoading(app.id);
    try {
      console.log("Preparing Firestore Batch for UID:", app.applicantUid);
      const batch = writeBatch(db);
      
      // 1. Create Organization
      const orgRef = doc(collection(db, 'organizations'));
      const orgData = {
        name: app.orgName || 'Unnamed Organization',
        description: app.description || '',
        district: app.district || '',
        thana: app.thana || '',
        contact: app.contact || '',
        adminUid: app.applicantUid,
        memberCount: 1,
        createdAt: serverTimestamp()
      };
      
      console.log("Step 1: Setting organization data", orgRef.id);
      batch.set(orgRef, orgData);

      // 2. Add applicant as Member
      const memberData = {
        userId: app.applicantUid,
        displayName: app.applicantName || 'Anonymous',
        bloodGroup: '?', 
        status: 'active',
        joinedAt: serverTimestamp()
      };
      const memberRef = doc(db, 'organizations', orgRef.id, 'members', app.applicantUid);
      console.log("Step 2: Adding member", memberRef.path);
      batch.set(memberRef, memberData);

      // 3. Update User Profile
      const userRef = doc(db, 'users', app.applicantUid);
      const profileData: any = {
        organizationId: orgRef.id,
        organizationName: app.orgName || 'Unnamed Org',
        updatedAt: serverTimestamp()
      };

      if (app.applicantName) profileData.displayName = app.applicantName;
      if (app.applicantEmail) profileData.email = app.applicantEmail;
      if (app.district) profileData.district = app.district;
      if (app.thana) profileData.thana = app.thana;

      console.log("Step 3: Updating user profile", userRef.id);
      batch.set(userRef, profileData, { merge: true });

      // 4. Update Application Status
      const appRef = doc(db, 'organization_applications', app.id);
      console.log("Step 4: Marking application as approved", appRef.id);
      batch.update(appRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: adminUser?.uid || 'system'
      });

      console.log("Attempting batch commit...");
      await batch.commit();
      console.log("BATCH COMMITTED SUCCESSFULLY");
      addToast("Organization Created", `Success: "${app.orgName}" is now active and the administrator has been assigned.`, 'success');
    } catch (e: any) {
      console.error("FATAL APPROVAL ERROR:", e);
      addToast("Approval Failed", `Operation Failed: ${e.message || "Unknown error during transaction"}`, 'error');
      handleFirestoreError(e, OperationType.WRITE, `admin/approve/${app.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectApp = async (appId: string) => {
    console.log("REJECT ACTION INITIATED", { id: appId });
    
    setActionLoading(appId);
    try {
      const appRef = doc(db, 'organization_applications', appId);
      console.log("Updating document status to rejected:", appRef.id);
      await updateDoc(appRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: adminUser?.uid || 'admin'
      });
      console.log("REJECTION SUCCESSFUL");
      addToast("Application Rejected", "The application has been declined.", 'info');
    } catch (e: any) {
      console.error("REJECTION FAILED:", e);
      addToast("Rejection Failed", `Error: ${e.message}`, 'error');
      handleFirestoreError(e, OperationType.UPDATE, `organization_applications/${appId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    if (await askConfirm('Delete Application?', "Permanently remove this organization application?", 'Delete Permanently')) {
      try {
        await deleteDoc(doc(db, 'organization_applications', appId));
        addToast("Application Deleted", "The application has been successfully removed.", 'info');
      } catch (e: any) {
        console.error("Deletion failed:", e);
        addToast("Deletion Failed", `Error: ${e.message}`, 'error');
        handleFirestoreError(e, OperationType.DELETE, `organization_applications/${appId}`);
      }
    }
  };

  const handleRemoveOrgAdmin = async (orgId: string, adminUid: string) => {
    if (await askConfirm('Remove Admin?', "Are you sure you want to remove this user as the administrator of this organization?", 'Remove Admin')) {
      try {
        await updateDoc(doc(db, 'organizations', orgId), {
          adminUid: ''
        });
        addToast("Admin Removed", "The user is no longer the administrator of this organization.", 'info');
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `organizations/${orgId}`);
      }
    }
  };

  const toggleUserRole = async (uid: string, currentRole: string | undefined) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const isSuperAdmin = users.find(u => u.uid === uid)?.email === 'abmannancxb@gmail.com' || users.find(u => u.uid === uid)?.email === 'connect.abmannan@gmail.com';
    
    if (isSuperAdmin && newRole === 'user') {
      addToast("Restricted Action", "Super Administrators cannot be demoted for security reasons.", 'error');
      return;
    }

    const confirmMsg = newRole === 'admin' 
        ? "Promote this user to Administrator? They will have full access to the Admin Panel." 
        : "Demote this user to Standard User? They will lose access to the Admin Panel.";
    
    if (await askConfirm(newRole === 'admin' ? 'Promote User?' : 'Demote User?', confirmMsg, newRole === 'admin' ? 'Promote' : 'Demote')) {
      try {
        await updateDoc(doc(db, 'users', uid), { role: newRole });
        addToast("Role Updated", `User has been ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'}.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const toggleBlockUser = async (uid: string, currentlyBlocked: boolean) => {
    if (await askConfirm(currentlyBlocked ? 'Unblock User?' : 'Block User?', `Are you sure you want to ${currentlyBlocked ? 'unblock' : 'block'} this user from using the platform?`, currentlyBlocked ? 'Unblock Now' : 'Block Now')) {
      try {
        await updateDoc(doc(db, 'users', uid), { isBlocked: !currentlyBlocked });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const toggleUserVerification = async (uid: string, currentlyVerified: boolean) => {
    if (await askConfirm(currentlyVerified ? 'Remove Verification?' : 'Verify User?', `Are you sure you want to ${currentlyVerified ? 'remove verification from' : 'verify'} this user? verified users show a badge.`, currentlyVerified ? 'Remove' : 'Verify Now')) {
      try {
        await updateDoc(doc(db, 'users', uid), { isVerified: !currentlyVerified });
        addToast("Success", `User ${currentlyVerified ? 'verification removed' : 'verified successfully'}.`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const toggleHidePost = async (id: string, currentlyHidden: boolean) => {
    try {
      await updateDoc(doc(db, 'posts', id), { isHidden: !currentlyHidden });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const deletePost = async (id: string, reportId?: string) => {
    if (await askConfirm('Delete Post?', 'Permanently delete this post and all its comments?', 'Delete Post')) {
      try {
        await deleteDoc(doc(db, 'posts', id));
        if (reportId) {
          await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
        }
        addToast("Post Deleted", "The post has been successfully removed.", 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
      }
    }
  };

  const resolveReport = async (reportId: string, status: 'resolved') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) {
      addToast("Error", "Please enter a message to broadcast.", 'error');
      return;
    }
    
    setSendingBroadcast(true);
    try {
      await addDoc(collection(db, 'global_alerts'), {
        message: broadcastText.trim(),
        createdAt: serverTimestamp(),
        createdBy: adminUser?.uid || 'admin'
      });
      addToast("Success", "Broadcast alert sent to all users successfully!", 'success');
      setBroadcastText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'global_alerts');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const menuItems = [
    { id: 'stats', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'User Base', icon: <Users className="w-4 h-4" /> },
    { id: 'requests', label: 'Blood Requests', icon: <Droplets className="w-4 h-4" /> },
    { id: 'feed', label: 'Community Feed', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <ShieldAlert className="w-4 h-4" />, badge: stats.pendingReports > 0 ? stats.pendingReports : null },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" />, badge: notifications.filter(n => !n.isRead).length > 0 ? notifications.filter(n => !n.isRead).length : null },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'system', label: 'System', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'gallery', label: 'Server Gallery', icon: <Image className="w-4 h-4" /> },
  ];

  return (
    <div className="relative min-h-[600px] flex flex-col lg:flex-row gap-0 lg:gap-8">
      {/* Mobile Header with Toggle */}
      <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 active:scale-95 transition-all"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
            <ShieldAlert className="text-white w-4 h-4" />
          </div>
          <span className="text-xs font-bold font-sans tracking-wide text-slate-900">Admin Panel</span>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[998] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Menu */}
      <aside className={`
        fixed inset-y-0 left-0 z-[999] w-[270px] bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:z-0 lg:static lg:w-64 lg:p-0 lg:bg-transparent lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="sticky top-6 lg:static lg:top-auto space-y-6">
          <div className="bg-white lg:rounded-3xl lg:p-5 lg:border lg:border-slate-100 lg:shadow-sm">
            <div className="hidden lg:flex items-center gap-3 mb-6 px-1.5">
              <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                <ShieldAlert className="text-white w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Admin Portal</h2>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Control Center</p>
              </div>
            </div>

            <nav className="space-y-1 h-full lg:h-auto">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all border group text-left ${
                    tab === item.id 
                      ? 'bg-slate-900 text-white border-slate-950 font-semibold shadow-sm' 
                      : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-colors ${tab === item.id ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-600 border border-slate-100/50'}`}>
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-bold tracking-wider">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide ${tab === item.id ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Status Summary in Sidebar */}
          <div className="bg-slate-950 rounded-[1.75rem] p-5 text-white hidden lg:block overflow-hidden relative border border-slate-900">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Heart className="w-24 h-24 text-red-500 fill-red-500/25" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3.5">System Status</p>
            <div className="space-y-2.5 relative z-10">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-400">Gateway Status</span>
                <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400">Active Reports</span>
                <span className={`text-[10px] font-bold uppercase ${stats.pendingReports > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {stats.pendingReports} Pending
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
                {menuItems.find(m => m.id === tab)?.label}
              </h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                Live Oversight • {stats.totalUsers} Total Population
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm self-start md:self-auto">
               <Clock className="w-3.5 h-3.5 text-slate-400" />
               <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
        {tab === 'stats' && (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="space-y-6"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:translate-y-[-2px] duration-300 relative overflow-hidden">
                <div className="absolute right-3 top-3 w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100/50">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Users</p>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-3xl font-extrabold text-slate-900">{stats.totalUsers}</p>
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-2 border-t border-slate-50 pt-2">
                  <span className="text-red-500 font-bold">{stats.blockedUsers} restricted</span> profiles
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:translate-y-[-2px] duration-300 relative overflow-hidden">
                <div className="absolute right-3 top-3 w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100/50">
                  <Heart className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Donors</p>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-3xl font-extrabold text-emerald-600">{stats.activeDonors}</p>
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-2 border-t border-slate-50 pt-2">
                  <span className="text-emerald-500 font-bold">{Math.round((stats.activeDonors / (stats.totalUsers || 1)) * 100)}%</span> of total population
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:translate-y-[-2px] duration-300 relative overflow-hidden">
                <div className="absolute right-3 top-3 w-7 h-7 bg-rose-50 rounded-lg flex items-center justify-center border border-rose-100/50">
                  <Droplets className="w-3.5 h-3.5 text-red-500" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Requests</p>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-3xl font-extrabold text-slate-900">{stats.totalRequests}</p>
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-2 border-t border-slate-50 pt-2">
                  <span className="text-emerald-500 font-bold">{stats.fulfilledRequests} fulfilled</span> requests
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-transform hover:translate-y-[-2px] duration-300 relative overflow-hidden">
                <div className="absolute right-3 top-3 w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center border border-red-100/50">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Reports</p>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-3xl font-extrabold text-red-600">{stats.pendingReports}</p>
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-2 border-t border-slate-50 pt-2">
                  Requires immediate action
                </p>
              </div>
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Request Activity Chart */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">Request Activity Stream</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last 14 Days • Request Volume vs Fulfillment</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fulfilled</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.05)', padding: '12px' }}
                          itemStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="requests" 
                          stroke="#f87171" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorReq)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="fulfilled" 
                          stroke="#34d399" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorFull)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Group Distribution Pie & Level Bars */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-0.5">Inventory Reserves</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">Registered Blood Group Distribution</p>
                  
                  <div className="h-[180px] w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bloodDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {bloodDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           itemStyle={{ fontSize: '10px', fontWeight: 700 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center bg-white/80 p-2 rounded-full">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Grouped</p>
                      <p className="text-xl font-black text-slate-900">{users.filter(u => u.bloodGroup).length}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mt-4 pt-4 border-t border-slate-50">
                  {bloodDistributionData.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic col-span-2">No grouped blood data available</p>
                  ) : (
                    bloodDistributionData.slice(0, 6).map((d, i) => {
                      const totalCount = d.value;
                      const percentage = stats.totalUsers > 0 ? Math.round((totalCount / stats.totalUsers) * 100) : 0;
                      return (
                        <div key={d.name} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              {d.name}
                            </span>
                            <span className="text-slate-500">{totalCount} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-50 rounded-full h-1 overflow-hidden">
                            <div className="h-1 rounded-full transition-all duration-500" style={{ backgroundColor: COLORS[i % COLORS.length], width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Blood Group Distribution Grid */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-6">Inventory Matrix Balance</h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                {BLOOD_GROUPS.map(bg => {
                  const count = stats.bloodGroupStats[bg] || 0;
                  return (
                    <div key={bg} className="flex flex-col items-center p-3 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-150 flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
                        <span className="text-slate-900 font-extrabold text-xs">{bg}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">{count}</span>
                      <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Donors</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div 
            key="users"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300"
          >
            <div className="p-6 border-b border-slate-150/40 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Directory</p>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Administration</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search entries..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200/80 rounded-xl text-xs focus:ring-1 focus:ring-slate-950 focus:border-slate-950 outline-none w-full md:w-52 transition-all placeholder:text-slate-400"
                  />
                </div>

                <select 
                  value={userFilterBloodGroup}
                  onChange={(e) => setUserFilterBloodGroup(e.target.value)}
                  className="px-2.5 py-2 bg-white border border-slate-200/85 rounded-xl text-[10px] font-bold uppercase tracking-wider focus:border-slate-900 outline-none transition-all cursor-pointer text-slate-600"
                >
                  <option value="">Blood Group</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>

                <select 
                  value={userFilterAvailability}
                  onChange={(e) => setUserFilterAvailability(e.target.value as any)}
                  className="px-2.5 py-2 bg-white border border-slate-200/85 rounded-xl text-[10px] font-bold uppercase tracking-wider focus:border-slate-900 outline-none transition-all cursor-pointer text-slate-600"
                >
                  <option value="all">Availability</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>

                <select 
                  value={userFilterStatus}
                  onChange={(e) => setUserFilterStatus(e.target.value as any)}
                  className="px-2.5 py-2 bg-white border border-slate-200/85 rounded-xl text-[10px] font-bold uppercase tracking-wider focus:border-slate-900 outline-none transition-all cursor-pointer text-slate-600"
                >
                  <option value="all">Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Restricted</option>
                </select>

                <button 
                  onClick={() => setShowImportDonors(true)}
                  className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-850 active:scale-95 transition-all shadow-sm shrink-0"
                >
                  <FileUp className="w-3.5 h-3.5" /> Import Data
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {filteredUsers.length === 0 ? (
                <div className="p-20 text-center">
                  <UserIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No matching users declared</p>
                </div>
              ) : filteredUsers.map(u => (
                <div key={u.uid} className={`p-5 flex flex-col hover:bg-slate-50/25 transition-colors ${u.isBlocked ? 'bg-rose-50/10' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm relative border ${u.isBlocked ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        {u.displayName.charAt(0).toUpperCase()}
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${u.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <p className="font-bold text-slate-900 text-sm leading-none">{u.displayName}</p>
                          {u.isVerified && (
                             <BadgeCheck className="w-4 h-4 text-blue-500 fill-white" />
                          )}
                          {u.isBlocked && (
                            <span className="bg-rose-500 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider">
                              Restricted
                            </span>
                          )}
                          {u.role === 'admin' && (
                            <span className="bg-slate-905 bg-slate-100 text-slate-700 text-[8px] font-semibold border border-slate-200 uppercase px-2 py-0.5 rounded-md tracking-wider">
                              Admin Portal
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-400">
                          <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                          <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                          <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">{u.bloodGroup ? `Group ${u.bloodGroup}` : 'No Blood Group'}</p>
                          {u.lastSeen && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                              <div className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline(u.lastSeen) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <p className="text-[9px] text-slate-400 font-medium">Active {formatLastSeen(u.lastSeen)}</p>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                      <div className="hidden sm:flex flex-col items-end mr-3">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">District Focus</span>
                        <span className="text-xs font-bold text-slate-800 leading-none">{u.district || 'Not Declared'}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleUserVerification(u.uid, !!u.isVerified)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${u.isVerified ? 'bg-blue-50 text-blue-600 border-blue-100/50' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100/60'}`}
                          title={u.isVerified ? 'Remove Verification' : 'Verify User'}
                        >
                          <BadgeCheck className={`w-3.5 h-3.5 ${u.isVerified ? 'text-blue-500 fill-white' : ''}`} />
                          <span className="hidden md:inline">{u.isVerified ? 'Verified' : 'Verify'}</span>
                        </button>

                        <button 
                          onClick={() => toggleUserRole(u.uid, u.role)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${u.role === 'admin' ? 'bg-slate-50 text-slate-700 border-slate-200/50 hover:bg-slate-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100/60'}`}
                          title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                          <span className="hidden md:inline">{u.role === 'admin' ? 'User-role' : 'Make Admin'}</span>
                        </button>
                        
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => toggleBlockUser(u.uid, !!u.isBlocked)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm ${
                              u.isBlocked 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50 hover:bg-emerald-100/30' 
                                : 'bg-rose-50 text-rose-600 border-rose-100/50 hover:bg-rose-100/30'
                            }`}
                          >
                            {u.isBlocked ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Unrestricted</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                <span>Restrict</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {assigningToUserId === u.uid && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-slate-100">
                          <UserAssignOrgForm 
                            user={u} 
                            organizations={organizations} 
                            onCancel={() => setAssigningToUserId(null)}
                            onSuccess={() => setAssigningToUserId(null)}
                            addToast={addToast}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {showImportDonors && (
          <ImportDonorsModal 
            organizations={organizations}
            onCancel={() => setShowImportDonors(false)}
            onSuccess={() => {
              setShowImportDonors(false);
            }}
            addToast={addToast}
          />
        )}

        {tab === 'requests' && (
          <motion.div 
            key="requests"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2 pb-4"
          >
            {requests.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-3xl border border-slate-50">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No requests found</p>
              </div>
            ) : requests.map(r => (
              <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                    r.status === 'Fulfilled' ? 'bg-green-50 text-green-600' : 
                    r.status === 'Cancelled' ? 'bg-slate-50 text-slate-400' : 'bg-red-50 text-red-600'
                  }`}>
                    {r.bloodGroup}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[14px] leading-tight">{r.hospital}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">{r.thana}, {r.district}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-[10px] text-slate-400 font-medium">By {r.requesterName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest mb-0.5">Status</p>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${
                      r.status === 'Fulfilled' ? 'text-green-600' : 
                      r.status === 'Cancelled' ? 'text-slate-400' : 'text-blue-600'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <button 
                    onClick={() => onDeleteRequest(r.id)}
                    className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 border border-slate-100 opacity-0 group-hover:opacity-100"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'feed' && (
          <motion.div 
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 max-h-[60vh] overflow-y-auto"
          >
            {posts.map(p => (
              <div key={p.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm ${p.isHidden ? 'border-red-100 bg-red-50/20' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <img src={p.authorPhoto || `https://ui-avatars.com/api/?name=${p.authorName}`} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{p.authorName}</p>
                        {p.reportCount ? p.reportCount > 0 && <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">{p.reportCount} Reports</span> : null}
                      </div>
                      <p className="text-[10px] text-slate-400">{(p.createdAt as Timestamp)?.toDate().toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleHidePost(p.id, !!p.isHidden)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${p.isHidden ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-orange-500'}`}
                    >
                      {p.isHidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button 
                      onClick={() => deletePost(p.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 hover:text-red-600 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{p.content}</p>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'reports' && (
          <motion.div 
            key="reports"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 max-h-[60vh] overflow-y-auto"
          >
            {reports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-50">
                <CheckCircle className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pending reports</p>
              </div>
            ) : reports.map(r => (
              <div key={r.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm ${r.status === 'resolved' ? 'opacity-50' : 'border-red-200'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-red-100 text-red-600 px-2 py-0.5 rounded-md self-start">
                      {r.targetType} reported
                    </span>
                    <p className="text-xs font-black text-slate-900">Reason: <span className="font-medium text-slate-600">{r.reason}</span></p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                       {r.targetType === 'post' && (
                         <>
                           <button 
                             onClick={() => toggleHidePost(r.targetId, false)}
                             className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
                           >
                             Hide Post
                           </button>
                           <button 
                             onClick={() => deletePost(r.targetId, r.id)}
                             className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                           >
                             Delete Post
                           </button>
                         </>
                       )}
                       <button 
                        onClick={() => resolveReport(r.id, 'resolved')}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                  <p className="text-[10px] text-slate-400 mb-1 uppercase font-black tracking-tighter">Reported Content</p>
                  <p className="text-xs text-slate-700 italic leading-relaxed">
                    "{r.targetContent || 'Content not available'}"
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[9px] text-slate-400">By: <span className="font-bold">{r.reportedByName || 'Unknown'}</span> ({r.reportedBy})</p>
                    <p className="text-[9px] text-slate-400">{(r.createdAt as Timestamp)?.toDate().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

          {tab === 'alerts' && (
            <motion.div 
              key="alerts"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Alerts</h2>
                  <p className="text-slate-500 text-sm">Real-time alerts and activity history.</p>
                </div>
                <button 
                  onClick={async () => {
                    const unread = notifications.filter(n => !n.isRead);
                    if (unread.length === 0) return;
                    const batch = writeBatch(db);
                    unread.forEach(n => {
                      batch.update(doc(db, 'admin_notifications', n.id), { isRead: true });
                    });
                    await batch.commit();
                    addToast("Notifications Cleared", "All alerts have been marked as read.", 'success');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Mark all as read
                </button>
              </div>

              {/* Broadcast Alert Option for Users */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 p-6 rounded-[32px] shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 text-white p-2.5 rounded-2xl shadow-md shadow-red-100">
                    <Megaphone className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Broadcast Alert to Every User</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Direct user dashboard alerts</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Type urgent system announcement, blood request, or notifications to broadcast..."
                    className="w-full h-24 p-4 text-xs font-medium bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={sendingBroadcast || !broadcastText.trim()}
                      onClick={handleSendBroadcast}
                      className="px-6 py-3 bg-red-600 font-extrabold uppercase tracking-widest text-[10px] text-white rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2"
                    >
                      {sendingBroadcast ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Broadcast Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-100">
                  <BellOff className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">No alerts yet</h3>
                  <p className="text-slate-400 text-sm">When important events happen, they'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(alert => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all ${alert.isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-red-50 border-red-100 shadow-sm'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl shrink-0 ${alert.isRead ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600'}`}>
                          <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">{alert.title}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {alert.createdAt?.toDate ? formatLastSeen(alert.createdAt) : 'Recently'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-3">{alert.body}</p>
                          <div className="flex items-center gap-3">
                            {!alert.isRead && (
                              <button 
                                onClick={() => updateDoc(doc(db, 'admin_notifications', alert.id), { isRead: true })}
                                className="text-[10px] font-bold text-red-600 uppercase tracking-widest hover:underline"
                              >
                                Mark as read
                              </button>
                            )}
                            {alert.linkView && (
                              <button 
                                onClick={() => {
                                  if (alert.linkView === 'feed') setView('feed');
                                  if (alert.linkView === 'requests') setView('requests');
                                  updateDoc(doc(db, 'admin_notifications', alert.id), { isRead: true });
                                }}
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 flex items-center gap-1"
                              >
                                View Section <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        {tab === 'system' && (
          <motion.div 
            key="system"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Management</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">App Control Center</h2>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-red-600" /> Version Control
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Active Build ID</span>
                      <span className="text-xs font-black text-slate-900 font-mono">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'N/A'}</span>
                    </div>
                    <button 
                      onClick={() => setHasUpdate(true)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
                    >
                      Trigger Update Popup (Test Mode)
                    </button>
                    <p className="text-[9px] text-slate-400 text-center font-medium px-4">
                      Clicking this will force the "Update Ready" popup to appear for your session, allowing you to verify the UI and reload functionality.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Trash className="w-4 h-4 text-slate-400" /> Cache Recovery
                  </h3>
                  <div className="space-y-4">
                    <button 
                      onClick={async () => {
                        if (await askConfirm('Hard Refresh?', 'This will clear local state and force a clean reload from the server. Use this if you see a white screen or old data.', 'Refresh Now')) {
                          window.location.reload();
                        }
                      }}
                      className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Perform Hard Refresh
                    </button>
                    <p className="text-[9px] text-slate-400 text-center font-medium px-4">
                      Directly reloads the page without checking for updates first.
                    </p>
                  </div>
                </div>
              </div>

              {/* Server Details & Quota Limits */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-rose-600" /> Firebase & Google Cloud Server Quotas
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                  Monitoring data usage and limits on the Google Cloud / Firebase Spark (Free) plan.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Limit Item 1: Storage */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firestore Space (1GB Free Limit)</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-md">Spark Free Tier</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-2xl font-black text-slate-900">{((posts.length * 0.5 + users.length * 1.0 + (posts.filter(p => p.imageUrl).length + users.filter(u => u.photoURL).length) * 150) / 1024).toFixed(2)} MB</span>
                        <span className="text-xs text-slate-400">/ 1,024 MB</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(1, Math.min(100, (((posts.length * 0.5 + users.length * 1.0 + (posts.filter(p => p.imageUrl).length + users.filter(u => u.photoURL).length) * 150) / 1024) / 1024) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-medium text-slate-400 mt-2">
                        <span>{(1024 - (posts.length * 0.5 + users.length * 1.0 + (posts.filter(p => p.imageUrl).length + users.filter(u => u.photoURL).length) * 150) / 1024).toFixed(2)} MB Free Space</span>
                        <span>{(((posts.length * 0.5 + users.length * 1.0 + (posts.filter(p => p.imageUrl).length + users.filter(u => u.photoURL).length) * 150) / 1024) / 1024 * 100).toFixed(4)}% Used</span>
                      </div>
                    </div>
                  </div>

                  {/* Limit Item 2: Daily Reads */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Document Reads</span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded-md">50,000 / day Limit</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-2xl font-black text-slate-900">~{users.length * 5 + posts.length * 2} reads</span>
                        <span className="text-xs text-slate-400">estimated daily active</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(1, Math.min(100, ((users.length * 5 + posts.length * 2) / 50000) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-medium text-slate-400 mt-2">
                        <span>{50000 - (users.length * 5 + posts.length * 2)} remaining free reads</span>
                        <span>{(((users.length * 5 + posts.length * 2) / 50000) * 100).toFixed(2)}% Used</span>
                      </div>
                    </div>
                  </div>

                  {/* Limit Item 3: Daily Writes */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Document Writes</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md">20,000 / day Limit</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-2xl font-black text-slate-900">~{requests.length * 2 + posts.length} writes</span>
                        <span className="text-xs text-slate-400">average activity scale</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(1, Math.min(100, ((requests.length * 2 + posts.length) / 20000) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-medium text-slate-400 mt-2">
                        <span>{20000 - (requests.length * 2 + posts.length)} remaining free writes</span>
                        <span>{(((requests.length * 2 + posts.length) / 20000) * 100).toFixed(2)}% Used</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 font-medium font-sans">
                    <h4 className="font-bold mb-1 font-sans">Scale Advisory</h4>
                    <p className="leading-relaxed font-sans">
                      Currently running on the <strong className="font-mono">Firebase Spark (Free) plan</strong> hosted in Google Cloud. These resource limits are perpetual and reset daily. If the user base scale exceeds 10,000 registered donors, we recommend upgrading to the <strong className="font-mono">Blaze (Pay-As-You-Go) plan</strong> to lift write/read caps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'gallery' && (
          <motion.div 
            key="gallery"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Gallery Headers and Stats */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media Server</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Image Repository</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Showing all user profiles and community media attachments uploaded to the platform.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shrink-0">
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Media Items</p>
                  <p className="text-xl font-black text-rose-600 font-mono">{galleryItems.length} photos</p>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                <button
                  onClick={() => setGalleryFilter('all')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    galleryFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All Photos ({galleryItems.length})
                </button>
                <button
                  onClick={() => setGalleryFilter('post')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    galleryFilter === 'post' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Posts Media ({galleryItems.filter(i => i.source === 'post').length})
                </button>
                <button
                  onClick={() => setGalleryFilter('profile')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    galleryFilter === 'profile' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Profiles ({galleryItems.filter(i => i.source === 'profile').length})
                </button>
              </div>
            </div>

            {/* Photo Grid */}
            {galleryItems.filter(i => galleryFilter === 'all' || i.source === galleryFilter).length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
                <Image className="w-12 h-12 text-slate-200 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-950">No photos found</h3>
                <p className="text-slate-400 text-sm mt-1">There are currently no uploaded files matching this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {galleryItems
                  .filter(i => galleryFilter === 'all' || i.source === galleryFilter)
                  .map((item) => (
                    <div 
                      key={`${item.source}-${item.id}`}
                      className="group bg-white rounded-3xl overflow-hidden border border-slate-150 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:translate-y-[-2px]"
                    >
                      {/* Image Area */}
                      <div className="relative aspect-square w-full bg-slate-950/5 overflow-hidden flex items-center justify-center">
                        <img 
                          src={item.url} 
                          alt={item.title}
                          onClick={() => setLightboxImage(item)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                        />
                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm ${
                          item.source === 'post' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {item.source === 'post' ? 'Story Post' : 'Profile'}
                        </span>
                      </div>

                      {/* Info Area */}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed mb-3">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Owner</p>
                              <p className="text-[11px] font-bold text-slate-900 truncate">{item.author}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              if (item.source === 'post') {
                                setTab('feed');
                                addToast("Post Location", `Locate post ID: ${item.id} in feed.`, "info");
                              } else {
                                setTab('users');
                                setUserSearchTerm(item.author);
                                addToast("Profile Searching", `Searching user: ${item.author} in base.`, "info");
                              }
                            }}
                            className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-center transition-all"
                          >
                            Trace Origin
                          </button>
                          
                          <button
                            onClick={async () => {
                              const proceed = await askConfirm(
                                "Remove Image?", 
                                `Are you sure you want to permanently delete this ${item.source === 'post' ? 'post media attachment' : 'profile image'} from the server? This action is immediate and cannot be undone.`,
                                "Confirm Delete",
                                "warning"
                              );
                              if (proceed) {
                                try {
                                  if (item.source === 'post') {
                                    await updateDoc(doc(db, 'posts', item.id), { imageUrl: '' });
                                    addToast("Media Removed", "Story attachment removed successfully.", "success");
                                  } else {
                                    await updateDoc(doc(db, 'users', item.id), { photoURL: '' });
                                    addToast("Media Removed", "Profile picture cleared successfully.", "success");
                                  }
                                } catch (error: any) {
                                  console.error(error);
                                  addToast("Action Failed", error.message || "Failed to remove photo.", "error");
                                }
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all"
                            title="Delete Image"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Lightbox Modal */}
            <AnimatePresence>
              {lightboxImage && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[2000] flex flex-col justify-center items-center p-4 sm:p-8"
                  onClick={() => setLightboxImage(null)}
                >
                  <button 
                    onClick={() => setLightboxImage(null)}
                    className="absolute top-6 right-6 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <motion.div 
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col items-center justify-center bg-slate-900 rounded-3xl border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-full flex justify-between items-center p-4 bg-slate-950/50 border-b border-white/5">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                          lightboxImage.source === 'post' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {lightboxImage.source === 'post' ? 'Story Post' : 'Profile Avatar'}
                        </span>
                        <h4 className="text-white font-bold text-xs mt-1">Uploaded by: {lightboxImage.author}</h4>
                      </div>
                      <a 
                        href={lightboxImage.url} 
                        target="_blank"
                        rel="noreferrer"
                        className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Open Original
                      </a>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950 p-2">
                      <img 
                        src={lightboxImage.url} 
                        alt="Lightbox detail" 
                        className="max-w-[95vw] lg:max-w-4xl max-h-[70vh] object-contain rounded-xl"
                      />
                    </div>
                    <p className="w-full p-4 bg-slate-900 text-slate-300 text-xs leading-relaxed text-center border-t border-white/5 select-all">
                      {lightboxImage.title}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {tab === 'organizations' && (
          <motion.div 
            key="orgs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Network</p>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Organization Control</h2>
              </div>
              {!showCreateOrg && !editingOrg && (
                <button 
                  onClick={() => setShowCreateOrg(true)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
                >
                  <Plus className="w-4 h-4" /> New Org
                </button>
              )}
            </div>

            {showCreateOrg && (
              <CreateOrganizationForm 
                users={users} 
                onCancel={() => setShowCreateOrg(false)} 
                onSuccess={() => setShowCreateOrg(false)}
                addToast={addToast}
              />
            )}

            {editingOrg && (
              <EditOrganizationForm 
                org={editingOrg}
                users={users} 
                onCancel={() => setEditingOrg(null)} 
                onSuccess={() => setEditingOrg(null)}
                addToast={addToast}
              />
            )}

            {!showCreateOrg && !editingOrg && (
              <div className="grid gap-4">
                {organizations.map(org => {
                  const admin = users.find(u => u.uid === org.adminUid);
                  return (
                    <div key={org.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                          <Building className="w-7 h-7 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-lg tracking-tight mb-1">{org.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {org.thana}, {org.district}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <UserIcon className="w-3 h-3" /> Admin: <span className="text-slate-900">{admin?.displayName || 'None'}</span>
                            </p>
                          </div>
                          {org.contact && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {org.contact}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="flex flex-col items-end mr-2 px-4 py-2 bg-slate-50 rounded-2xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Members</span>
                          <span className="text-sm font-black text-slate-900">{org.memberCount || 0}</span>
                        </div>
                        
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setEditingOrg(org)}
                            className="p-2.5 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all"
                            title="Edit Organization"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (await askConfirm('Delete Organization?', `Delete "${org.name}" permanently along with all its member records?`, 'Delete NOW')) {
                                try {
                                  await deleteDoc(doc(db, 'organizations', org.id));
                                  addToast("Organization Deleted", `"${org.name}" has been permanently removed.`, 'info');
                                } catch (e) {
                                  handleFirestoreError(e, OperationType.DELETE, `organizations/${org.id}`);
                                }
                              }
                            }}
                            className="p-2.5 bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                            title="Delete Organization"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {organizations.length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <Building className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No organizations registered</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'applications' && (
          <motion.div 
            key="applications"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2 pb-6"
          >
            {orgApplications.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-inner">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                  <Building className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No pending applications</p>
                <p className="text-slate-300 text-[9px] mt-1">Check back later for new registration requests.</p>
              </div>
            ) : orgApplications.map(app => (
              <div key={app.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-black text-xs">
                        {app.orgName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">{app.orgName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                          <MapPin className="w-3 h-3" /> {app.thana}, {app.district}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                      app.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                      app.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Organization Mission</p>
                    <p className="text-sm text-slate-700 leading-relaxed italic px-1">"{app.description}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Applicant</p>
                        <p className="text-xs font-bold text-slate-900">{app.applicantName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <Phone className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact details</p>
                        <p className="text-xs font-bold text-slate-900">{app.contact}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-3 pt-6 border-t border-slate-100">
                    {app.status === 'pending' ? (
                      <>
                        <button 
                          disabled={actionLoading === app.id}
                          onClick={() => handleRejectApp(app.id)}
                          className="px-6 py-2.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-sm shadow-slate-100"
                        >
                          {actionLoading === app.id ? 'Wait...' : 'Decline'}
                        </button>
                        <button 
                          disabled={actionLoading === app.id}
                          onClick={() => handleApproveApp(app)}
                          className="px-6 py-2.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95"
                        >
                          {actionLoading === app.id ? 'Granting Access...' : 'Approve Application'}
                        </button>
                      </>
                    ) : (
                      <button 
                        disabled={actionLoading === app.id}
                        onClick={() => handleDeleteApp(app.id)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'settings' && (
          <motion.div 
            key="settings" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                 <Building className="w-32 h-32" />
               </div>
               
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Home Page Settings</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Map Configuration & Markers</p>
                    </div>
                 </div>
                 </div>
                 
                 <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Default Map Center (Lat, Lng)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    step="any"
                    placeholder="23.8103"
                    defaultValue={settings?.defaultLat || 23.8103}
                    id="mapLatInput"
                    className="flex-1 bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                  />
                  <input 
                    type="number"
                    step="any"
                    placeholder="90.4125"
                    defaultValue={settings?.defaultLng || 90.4125}
                    id="mapLngInput"
                    className="flex-1 bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button 
                    onClick={async () => {
                      const latIn = document.getElementById('mapLatInput') as HTMLInputElement;
                      const lngIn = document.getElementById('mapLngInput') as HTMLInputElement;
                      if (latIn && lngIn) {
                        try {
                          await setDoc(doc(db, 'settings', 'global'), {
                            defaultLat: parseFloat(latIn.value),
                            defaultLng: parseFloat(lngIn.value),
                            updatedAt: serverTimestamp(),
                            updatedBy: adminUser?.uid
                          }, { merge: true });
                          addToast("Config Updated", "Default map center updated successfully!", 'success');
                        } catch (e) {
                          handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
                        }
                      }
                    }}
                    className="bg-slate-900 text-white font-black px-6 rounded-2xl h-[52px] flex items-center justify-center transition-all active:scale-95"
                  >
                    Set Center
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Google Maps Platform API Key</label>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    placeholder="AIza..."
                    defaultValue={settings?.googleMapsApiKey || ''}
                    id="apiKeyInput"
                    className="flex-1 bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button 
                    onClick={async () => {
                      const input = document.getElementById('apiKeyInput') as HTMLInputElement;
                      if (input) {
                        try {
                          await setDoc(doc(db, 'settings', 'global'), {
                            googleMapsApiKey: input.value.trim(),
                            updatedAt: serverTimestamp(),
                            updatedBy: adminUser?.uid
                          }, { merge: true });
                          addToast("Config Updated", "API Key updated successfully! The map should refresh automatically.", 'success');
                        } catch (e) {
                          handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
                        }
                      }
                    }}
                    className="bg-slate-900 text-white font-black px-6 rounded-2xl h-[52px] flex items-center justify-center transition-all active:scale-95"
                  >
                    Update Key
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 px-1 italic">
                  Updating this key will enable Google Maps & Places services instantly for all users.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Google Maps ID (Internal Map ID)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="e.g. 8e0a..."
                    defaultValue={settings?.googleMapsMapId || ''}
                    id="mapIdInput"
                    className="flex-1 bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button 
                    onClick={async () => {
                      const input = document.getElementById('mapIdInput') as HTMLInputElement;
                      if (input) {
                        try {
                          await setDoc(doc(db, 'settings', 'global'), {
                            googleMapsMapId: input.value.trim(),
                            updatedAt: serverTimestamp(),
                            updatedBy: adminUser?.uid
                          }, { merge: true });
                          addToast("Config Updated", "Map ID updated successfully!", 'success');
                        } catch (e) {
                          handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
                        }
                      }
                    }}
                    className="bg-slate-900 text-white font-black px-6 rounded-2xl h-[52px] flex items-center justify-center transition-all active:scale-95"
                  >
                    Update ID
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 px-1 italic">
                  Required for Advanced Markers. Visit the Google Cloud Console to create a Map ID.
                </p>
              </div>

               {/* Map Visibility Controls */}
               <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-900 rounded-xl">
                      <Layout className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Map Display Settings</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Configure global map visualization</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'showDistrictRequests', label: 'Show District Clusters', desc: 'Group requests by district' },
                      { key: 'showDonorsOnMap', label: 'Show Donors on Map', desc: 'Display active donor counts' },
                      { key: 'showGroupRequests', label: 'Show Individual Markers', desc: 'Display precise request locations' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <button 
                          onClick={async () => {
                            try {
                              const currentVal = (settings as any)?.[item.key] !== false;
                              await setDoc(doc(db, 'settings', 'global'), {
                                [item.key]: !currentVal,
                                updatedAt: serverTimestamp()
                              }, { merge: true });
                              addToast("Setting Updated", `${item.label} updated.`, 'success');
                            } catch (e) {
                              handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
                            }
                          }}
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${((settings as any)?.[item.key] !== false) ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-slate-300'}`}
                        >
                          <motion.div 
                            animate={{ x: ((settings as any)?.[item.key] !== false) ? 26 : 4 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{item.label}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               </div>
            </div>



            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden mt-6 mb-6">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                 <Globe className="w-32 h-32" />
               </div>
               
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">SEO Sitemap Settings</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sitemap.xml for google crawler</p>
                    </div>
                 </div>
                 
                 <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                   Regenerate the search engine sitemap.xml statically with the official domain <strong className="text-red-600">https://bloodlink.bd</strong> to update search result indices.
                 </p>
                 
                 <div className="flex flex-col sm:flex-row gap-4">
                   <button 
                     onClick={async () => {
                       try {
                         const response = await fetch('/api/admin/generate-sitemap', {
                           method: 'POST',
                         });
                         const data = await response.json();
                         if (data.success) {
                           addToast("Sitemap Generated", "Successfully updated sitemap.xml with https://bloodlink.bd URLs!", 'success');
                         } else {
                           throw new Error(data.error || "Could not write public/sitemap.xml");
                         }
                       } catch (e: any) {
                         try {
                            const getClientSitemapXml = () => {
                              const host = 'bloodlink.bd';
                              const baseUrl = `https://${host}`;
                              const views = [
                                { path: "", priority: "1.0", changefreq: "daily" },
                                { path: "/home", priority: "0.9", changefreq: "daily" },
                                { path: "/requests", priority: "0.9", changefreq: "daily" },
                                { path: "/find", priority: "0.8", changefreq: "weekly" },
                                { path: "/feed", priority: "0.8", changefreq: "hourly" },
                                { path: "/organizations", priority: "0.7", changefreq: "weekly" },
                                { path: "/stats", priority: "0.6", changefreq: "monthly" },
                                { path: "/profile", priority: "0.6", changefreq: "weekly" },
                                { path: "/nearby", priority: "0.7", changefreq: "weekly" },
                                { path: "/community", priority: "0.8", changefreq: "daily" },
                                { path: "/explore", priority: "0.7", changefreq: "weekly" },
                                { path: "/notifications", priority: "0.5", changefreq: "daily" },
                                { path: "/chats", priority: "0.5", changefreq: "daily" },
                                { path: "/about", priority: "0.8", changefreq: "weekly" },
                                { path: "/contact", priority: "0.8", changefreq: "weekly" },
                                { path: "/privacy", priority: "0.8", changefreq: "weekly" },
                                { path: "/terms", priority: "0.8", changefreq: "weekly" },
                                { path: "/faq", priority: "0.8", changefreq: "weekly" },
                                { path: "/admin", priority: "0.4", changefreq: "monthly" },
                                { path: "/admin-login", priority: "0.4", changefreq: "monthly" },
                                { path: "/org-apply", priority: "0.6", changefreq: "weekly" },
                                { path: "/request-form", priority: "0.7", changefreq: "weekly" },
                                { path: "/post-opinion", priority: "0.7", changefreq: "weekly" },
                                { path: "/public-profile", priority: "0.6", changefreq: "weekly" },
                                { path: "/chat-room", priority: "0.5", changefreq: "daily" },
                                { path: "/org-dashboard", priority: "0.7", changefreq: "weekly" }
                              ];
                              const lastMod = new Date().toISOString().split('T')[0];
                              let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
                              xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
                              views.forEach(v => {
                                xml += `  <url>\n`;
                                xml += `    <loc>${baseUrl}${v.path}</loc>\n`;
                                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                                xml += `    <changefreq>${v.changefreq}</changefreq>\n`;
                                xml += `    <priority>${v.priority}</priority>\n`;
                                xml += `  </url>\n`;
                              });
                              xml += `</urlset>`;
                              return xml;
                            };
                            const xml = getClientSitemapXml();
                            const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.setAttribute("download", "sitemap.xml");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            addToast("Sitemap Downloaded", "Generated locally! Save this sitemap.xml in your public_html root directory on cPanel.", 'success');
                          } catch (err: any) {
                            addToast("Generation Failed", err.message || "Failed to download sitemap.xml", 'error');
                          }
                       }
                     }}
                     className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                   >
                     <Globe className="w-4 h-4 animate-pulse" />
                     <span>Generate Sitemap</span>
                   </button>
                   
                   <a 
                     href="/sitemap.xml" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider cursor-pointer"
                   >
                     <span>View Sitemap.xml</span>
                   </a>
                 </div>
               </div>
            </div>

            {/* SEO Content Management */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden mt-6 mb-6 text-left">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-900">
                <FileText className="w-32 h-32 text-slate-405" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Editorial & SEO Pages</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage public page content (Markdown Supported)</p>
                  </div>
                </div>

                {/* Sub tabs for Page selection */}
                <div className="flex flex-wrap gap-2 mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100/60">
                  {[
                    { key: 'about', label: 'About Us' },
                    { key: 'contact', label: 'Contact Details' },
                    { key: 'privacy', label: 'Privacy Policy' },
                    { key: 'terms', label: 'Terms & Conditions' },
                    { key: 'faq', label: 'FAQ Page' }
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setSeoEditTab(p.key as any)}
                      type="button"
                      className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
                        seoEditTab === p.key 
                          ? 'bg-white text-red-650 shadow-sm border border-slate-200/50' 
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Content editor</label>
                      <span className="text-[9px] font-extrabold text-slate-400">supports raw markdown (##, ###, *)</span>
                    </div>
                    {seoEditTab === 'about' && (
                      <textarea
                        id="seoAboutTextarea"
                        key="about-text"
                        defaultValue={settings?.seoAbout || defaultSeoContent.about}
                        className="w-full h-80 bg-slate-50 border-slate-100 rounded-3xl px-5 py-4 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner outline-none resize-y"
                        placeholder="Write dynamic About Us details here..."
                      />
                    )}
                    {seoEditTab === 'contact' && (
                      <textarea
                        id="seoContactTextarea"
                        key="contact-text"
                        defaultValue={settings?.seoContact || defaultSeoContent.contact}
                        className="w-full h-80 bg-slate-50 border-slate-100 rounded-3xl px-5 py-4 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner outline-none resize-y"
                        placeholder="Write contact address, phone, and links here..."
                      />
                    )}
                    {seoEditTab === 'privacy' && (
                      <textarea
                        id="seoPrivacyTextarea"
                        key="privacy-text"
                        defaultValue={settings?.seoPrivacy || defaultSeoContent.privacy}
                        className="w-full h-80 bg-slate-50 border-slate-100 rounded-3xl px-5 py-4 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner outline-none resize-y"
                        placeholder="Write policy conditions here..."
                      />
                    )}
                    {seoEditTab === 'terms' && (
                      <textarea
                        id="seoTermsTextarea"
                        key="terms-text"
                        defaultValue={settings?.seoTerms || defaultSeoContent.terms}
                        className="w-full h-80 bg-slate-50 border-slate-100 rounded-3xl px-5 py-4 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner outline-none resize-y"
                        placeholder="Terms and service requirements here..."
                      />
                    )}
                    {seoEditTab === 'faq' && (
                      <textarea
                        id="seoFaqTextarea"
                        key="faq-text"
                        defaultValue={settings?.seoFaq || defaultSeoContent.faq}
                        className="w-full h-80 bg-slate-50 border-slate-100 rounded-3xl px-5 py-4 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner outline-none resize-y"
                        placeholder="Frequently asked questions and answers here..."
                      />
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      let fieldKey = '';
                      let val = '';
                      if (seoEditTab === 'about') {
                        fieldKey = 'seoAbout';
                        val = (document.getElementById('seoAboutTextarea') as HTMLTextAreaElement)?.value || '';
                      } else if (seoEditTab === 'contact') {
                        fieldKey = 'seoContact';
                        val = (document.getElementById('seoContactTextarea') as HTMLTextAreaElement)?.value || '';
                      } else if (seoEditTab === 'privacy') {
                        fieldKey = 'seoPrivacy';
                        val = (document.getElementById('seoPrivacyTextarea') as HTMLTextAreaElement)?.value || '';
                      } else if (seoEditTab === 'terms') {
                        fieldKey = 'seoTerms';
                        val = (document.getElementById('seoTermsTextarea') as HTMLTextAreaElement)?.value || '';
                      } else if (seoEditTab === 'faq') {
                        fieldKey = 'seoFaq';
                        val = (document.getElementById('seoFaqTextarea') as HTMLTextAreaElement)?.value || '';
                      }

                      if (fieldKey && val !== undefined) {
                        try {
                          await setDoc(doc(db, 'settings', 'global'), {
                            [fieldKey]: val,
                            updatedAt: serverTimestamp(),
                            updatedBy: adminUser?.uid
                          }, { merge: true });
                          addToast("Page Updated", `Successfully saved updated ${seoEditTab} content to global database!`, 'success');
                        } catch (e) {
                          handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
                        }
                      }
                    }}
                    type="button"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save {seoEditTab.toUpperCase()} Page Content</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full">
               <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                     <ShieldAlert className="w-48 h-48" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Security Protocol</h4>
                  <h3 className="text-xl font-black mb-4 tracking-tight">System Lockdown</h3>
                  <p className="text-xs text-white/50 mb-6 leading-relaxed">Limit system write access to administrators only while performing critical infrastructure upgrades.</p>
                  <button className="w-full bg-red-600/20 text-red-400 border border-red-900/50 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-950/20">
                    Activate Lockdown
                  </button>
               </div>


            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
      </main>
    </div>
  );
}

function OrgApplicationForm({ onCancel, addToast }: { onCancel: () => void, addToast: (title: string, body: string, type?: Toast['type']) => void }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantEmail: '',
    orgName: '',
    description: '',
    district: '',
    thana: '',
    contact: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      if (u) {
        setFormData(prev => ({
          ...prev,
          applicantName: u.displayName || '',
          applicantEmail: u.email || ''
        }));
      }
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'organization_applications'), {
        applicantUid: currentUser?.uid || 'anonymous',
        applicantName: formData.applicantName.trim(),
        applicantEmail: formData.applicantEmail.trim(),
        orgName: formData.orgName.trim(),
        description: formData.description.trim(),
        district: formData.district,
        thana: formData.thana,
        contact: formData.contact.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setApplied(true);
    } catch (e: any) {
      console.error("Submission failed:", e);
      let message = e.message;
      if (message.includes('permission-denied')) {
        message = "Submission failed. Please check form data or try again later.";
      }
      addToast("Application Error", `Could not submit: ${message}`, 'error');
      handleFirestoreError(e, OperationType.CREATE, 'organization_applications');
    } finally {
      setSubmitting(false);
    }
  };

  if (applied) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl text-center max-w-md mx-auto my-12">
        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Application Sent!</h3>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">Our administrators will review your community request. You will receive an email once approved.</p>
        <button onClick={onCancel} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest text-[10px]">Back to Home</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl max-w-xl mx-auto my-4 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Building className="w-32 h-32 text-red-600" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
            <Building className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Register Community</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Apply for a New Organization</p>
          </div>
        </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Your Name</label>
                <input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={formData.applicantName}
                  onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="email@example.com"
                  value={formData.applicantEmail}
                  onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Community / Org Name</label>
                <input
                  required
                  type="text"
                  placeholder="Official name of your organization"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Goals & Description</label>
                <textarea
                  required
                  placeholder="How will this organization improve blood donation in your area?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Base District</label>
                  <select
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value, thana: '' })}
                    className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                  >
                    <option value="">Select</option>
                    {Object.keys(BANGLADESH_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Base Thana</label>
                  <select
                    required
                    value={formData.thana}
                    onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
                    className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 focus:bg-white transition-all disabled:opacity-50"
                    disabled={!formData.district}
                  >
                    <option value="">Select</option>
                    {formData.district && BANGLADESH_LOCATIONS[formData.district].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest px-1">Public Contact Number</label>
                <input
                  required
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Sending Request...' : 'Submit Application'}
              </button>
            </div>
          </form>
      </div>
    </motion.div>
  );
}

// --- Sub-components ---

// --- Sub-components ---

function OrganizationsView({ organizations, currentUser, profile, onJoin, onViewDashboard, onCreateOrg }: { 
  organizations: Organization[], 
  currentUser: FirebaseUser | null, 
  profile: UserProfile | null, 
  onJoin: (org: Organization) => void, 
  onViewDashboard: (org: Organization) => void,
  onCreateOrg: () => void
}) {
  const [filter, setFilter] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterThana, setFilterThana] = useState('');
  
  const filtered = organizations.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(filter.toLowerCase()) || 
                          (o.description && o.description.toLowerCase().includes(filter.toLowerCase())) ||
                          o.district.toLowerCase().includes(filter.toLowerCase()) ||
                          o.thana.toLowerCase().includes(filter.toLowerCase());
    const matchesDistrict = !filterDistrict || o.district === filterDistrict;
    const matchesThana = !filterThana || o.thana === filterThana;
    return matchesSearch && matchesDistrict && matchesThana;
  });

  const userOrg = organizations.find(o => o.id === profile?.organizationId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Search Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 p-8 rounded-[2.5rem] shadow-xl shadow-red-100 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight uppercase">Associations</h2>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 border-l-2 border-white/30 pl-3">Community Hub • District Wide</p>
            </div>
            {!profile?.organizationId && currentUser && (
              <button 
                onClick={onCreateOrg}
                className="bg-white text-red-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg shadow-black/5"
              >
                <Plus className="w-4 h-4" /> Start Org
              </button>
            )}
          </div>
          
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors" />
            <input 
              type="text"
              placeholder="Find organizations..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-5 py-4.5 text-sm font-bold text-white placeholder:text-white/40 focus:ring-4 focus:ring-white/20 focus:bg-white/20 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <select
              value={filterDistrict}
              onChange={(e) => { setFilterDistrict(e.target.value); setFilterThana(''); }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider text-white focus:ring-4 focus:ring-white/20 focus:bg-white/25 transition-all outline-none"
            >
              <option value="" className="text-slate-900">All Districts</option>
              {Object.keys(BANGLADESH_LOCATIONS).sort().map(d => (
                <option key={d} value={d} className="text-slate-900">{d}</option>
              ))}
            </select>

            <select
              value={filterThana}
              onChange={(e) => setFilterThana(e.target.value)}
              disabled={!filterDistrict}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider text-white focus:ring-4 focus:ring-white/20 focus:bg-white/25 transition-all outline-none disabled:opacity-50"
            >
              <option value="" className="text-slate-900">All Thanas</option>
              {filterDistrict && BANGLADESH_LOCATIONS[filterDistrict].sort().map(t => (
                <option key={t} value={t} className="text-slate-900">{t}</option>
              ))}
            </select>
          </div>
        </div>
        <Building className="absolute -top-10 -right-10 w-48 h-48 text-white/5 rotate-12" />
      </div>

      {userOrg && (
         <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">Your Association</h3>
            <div key={userOrg.id}>
              <OrgListItem 
                org={userOrg} 
                isMember={true} 
                isAdmin={userOrg.adminUid === currentUser?.uid} 
                onJoin={onJoin} 
                onViewDashboard={onViewDashboard}
                currentUser={currentUser}
                profile={profile}
              />
            </div>
         </div>
      )}

      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">Discover Communitites</h3>
        <div className="grid gap-4">
          {filtered.filter(o => o.id !== profile?.organizationId).map(org => (
            <div key={org.id}>
              <OrgListItem 
                org={org} 
                isMember={false} 
                isAdmin={org.adminUid === currentUser?.uid} 
                onJoin={onJoin} 
                onViewDashboard={onViewDashboard}
                currentUser={currentUser}
                profile={profile}
              />
            </div>
          ))}
          {filtered.length === (userOrg ? 1 : 0) && (
            <div className="text-center py-20 italic text-slate-400 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-bold text-xs uppercase tracking-widest">No other organizations discovered</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function OrgListItem({ org, isMember, isAdmin, onJoin, onViewDashboard, currentUser, profile }: { 
  org: Organization, 
  isMember: boolean, 
  isAdmin: boolean, 
  onJoin: (org: Organization) => void, 
  onViewDashboard: (org: Organization) => void,
  currentUser: FirebaseUser | null,
  profile: UserProfile | null
}) {
  return (
    <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-red-100/50 group">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${isMember ? 'bg-green-50 text-green-600 font-black' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'}`}>
            <Building className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-slate-900 text-[13px] leading-tight uppercase tracking-tight truncate">{org.name}</h3>
          </div>
        </div>
      </div>
      
      <p className="text-[12px] text-slate-500 leading-relaxed mb-6 italic px-1">
        "{org.description || 'Dedicated to saving lives through voluntary community blood donation.'}"
      </p>

      <div className="flex gap-2">
        {isAdmin || isMember ? (
          <button 
            onClick={() => onViewDashboard(org)}
            className={`flex-1 font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isAdmin ? 'bg-slate-900 text-white hover:bg-black' : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isAdmin ? <LayoutDashboard className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {isAdmin ? 'Manage Hub' : 'Member Dashboard'}
          </button>
        ) : (
          <button 
            disabled={!currentUser || !!profile?.organizationId || (profile?.district !== org.district)}
            onClick={() => onJoin(org)}
            className="flex-1 bg-red-600 text-white font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-30 disabled:bg-slate-200 shadow-lg shadow-red-100"
          >
            {!currentUser ? 'Log in to Join' : 
             profile?.organizationId ? 'Already Joined' : 
             profile?.district !== org.district ? `Different District` : 
             'Join Community'}
          </button>
        )}
      </div>
    </div>
  );
}

function OrgDashboard({ org, users, allRequests, allPosts, setView, handleLogin, user, profile, onDeleteRequest, onDonationDone, askConfirm, addToast, notifyAdmins, onMatchDonors }: { 
  org: Organization, 
  users: UserProfile[], 
  allRequests: BloodRequest[], 
  allPosts: CommunityPost[], 
  setView: (v: any) => void,
  handleLogin: () => void, 
  user: FirebaseUser | null, 
  profile: UserProfile | null, 
  onDeleteRequest: (id: string) => void, 
  onDonationDone: (req: BloodRequest) => void,
  askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>,
  addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void,
  notifyAdmins: (title: string, body: string, link?: string) => Promise<void>,
  onMatchDonors?: (req: BloodRequest) => void
}) {
  const [tab, setTab] = useState<'overview' | 'members' | 'requests' | 'community' | 'settings'>('overview');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState(false);
  const [showingImportModal, setShowingImportModal] = useState(false);
  const [editData, setEditData] = useState({
    name: org.name,
    description: org.description,
    district: org.district,
    thana: org.thana,
    contact: org.contact
  });

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'organizations', org.id), {
        ...editData,
        updatedAt: serverTimestamp()
      });
      addToast("Org Updated", "Organization details updated successfully!", 'success');
      setEditingOrg(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `organizations/${org.id}`);
    }
  };

  const isAdmin = user?.uid === org.adminUid;

  const onCreateRequest = () => {
    console.log("OrgDashboard: Attempting to create request", { hasUser: !!user });
    if (!user) { 
      console.log("OrgDashboard: No user, triggering login");
      handleLogin(); 
      return; 
    }
    console.log("OrgDashboard: Navigating to request-form");
    setView('request-form');
  };

  useEffect(() => {
    const q = query(collection(db, 'organizations', org.id, 'members'), orderBy('joinedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => doc.data() as OrganizationMember));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `organizations/${org.id}/members`));
    return unsubscribe;
  }, [org.id]);

  const orgRequests = allRequests.filter(r => 
    (r.district === org.district && (org.thana === 'All' || r.thana === org.thana))
  );

  const memberUids = members.map(m => m.userId);
  const orgPosts = allPosts.filter(p => memberUids.includes(p.authorUid));

  const toggleBlockMember = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await updateDoc(doc(db, 'organizations', org.id, 'members', userId), { status: newStatus });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `organizations/${org.id}/members/${userId}`);
    }
  };

  const removeMember = async (userId: string) => {
    if (await askConfirm('Remove Member?', "Remove this member from the organization? This will clear their member status.", 'Remove Member')) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'organizations', org.id, 'members', userId));
        batch.update(doc(db, 'users', userId), { 
          organizationId: deleteField(), 
          organizationName: deleteField() 
        });
        batch.update(doc(db, 'organizations', org.id), { 
          memberCount: increment(-1) 
        });
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `organizations/${org.id}/members/${userId}`);
      }
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    if (newRole === 'admin') {
      if (await askConfirm('Promote to Admin?', `Are you sure you want to promote this user to Admin? They will have full control over the organization, and you will no longer be the primary admin.`, 'Promote to Admin')) {
        try {
          const batch = writeBatch(db);
          // Update org adminUid
          batch.update(doc(db, 'organizations', org.id), { adminUid: userId });
          // Update new admin user profile
          batch.update(doc(db, 'users', userId), { organizationId: org.id, organizationName: org.name });
          // Clear old admin role in members subcollection if we want (or just keep them as member)
          // For simplicity, we just change the main org pointer.
          await batch.commit();
          addToast("Admin Reassigned", "The organization admin has been successfully updated.", 'success');
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `organizations/${org.id}`);
        }
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'organizations', org.id, 'members', userId), { role: newRole });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `organizations/${org.id}/members/${userId}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Org Header Display */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 p-8 rounded-[2.5rem] shadow-xl shadow-red-100 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5 min-w-0">
              <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md shrink-0">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight break-words">{org.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Community Hub</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
            </div>
          </div>
          
        </div>
        <Building className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12" />
      </div>

      {/* Member Quick Update (Visible to all members in Org Dashboard) */}
      {profile && (profile.organizationId === org.id) && (
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-xl">
               <span className="text-red-600 font-black text-xs">{profile.bloodGroup}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Status in {org.name}</p>
              <p className="text-xs font-bold text-slate-900">{profile.district}, {profile.thana}</p>
            </div>
          </div>
          <button 
            onClick={() => setView('profile')}
            className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-all uppercase tracking-widest"
          >
            Update Info
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-100">
        {[
          { id: 'overview', icon: <Layout className="w-3.5 h-3.5" />, label: 'Overview' },
          { id: 'requests', icon: <Droplets className="w-3.5 h-3.5" />, label: 'Requests' },
          { id: 'community', icon: <Users className="w-3.5 h-3.5" />, label: 'Community' },
          ...(isAdmin ? [{ id: 'settings', icon: <Building className="w-3.5 h-3.5" />, label: 'Setup' }] : []),
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.id ? 'bg-white text-red-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:border-red-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Local Requests</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{orgRequests.length}</p>
                  <div className="bg-red-50 p-2 rounded-xl">
                    <Droplets className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:border-blue-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Member Activity</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{orgPosts.length}</p>
                  <div className="bg-blue-50 p-2 rounded-xl">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Local Requests Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em]">Recent Coverage</h3>
                  <button onClick={() => setTab('requests')} className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest">See All</button>
                </div>
                {orgRequests.length > 0 ? (
                  <div className="space-y-3">
                    {orgRequests.slice(0, 2).map(req => (
                      <div key={req.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:border-red-100/50 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${req.urgency === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {req.urgency}
                          </span>
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                             <span className="text-[10px] font-black text-slate-900">{req.bloodGroup}</span>
                          </div>
                        </div>
                        <p className="text-xs font-extrabold text-slate-900 mb-1 truncate">{req.hospital}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{req.thana}, {req.district}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50/50 p-12 rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    No recent local requests
                  </div>
                )}
              </div>

              {/* Members Activity Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Members Activity</h3>
                  <button onClick={() => setTab('community')} className="text-[10px] font-bold text-red-600 hover:underline">View All</button>
                </div>
                {orgPosts.length > 0 ? (
                  <div className="space-y-3">
                    {orgPosts.slice(0, 2).map(post => (
                      <div key={post.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-3">
                        <img 
                          src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`} 
                          className="w-8 h-8 rounded-full border border-slate-100" 
                          alt="" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{post.authorName}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{post.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs italic">
                    No recent member posts
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Member Engagement</span>
                  <span className="text-xs font-black text-slate-900">Active</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full w-[70%]" />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                  Your organization covers {org.thana} area within {org.district}. 
                  Showing data for all members registered under {org.name}.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'requests' && (
          <motion.div key="requests" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em]">Active Requests</h3>
            </div>
            {orgRequests.length === 0 ? (
              <div className="p-12 bg-white rounded-[2rem] border border-slate-100 text-center text-slate-400 italic">
                No active requests in {org.thana}.
              </div>
            ) : (
              orgRequests.map(req => (
                <div key={req.id}>
                  <RequestCard 
                    request={req} 
                    user={user}
                    allUsers={users}
                    onDonationDone={onDonationDone}
                    onMatchDonors={onMatchDonors ? () => onMatchDonors(req) : undefined}
                    onDelete={() => onDeleteRequest(req.id)}
                  />
                </div>
              ))
            )}
          </motion.div>
        )}

        {tab === 'community' && (
          <motion.div key="community" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Community Feed</h3>
              <button 
                onClick={() => {
                  if (!user) { handleLogin(); return; }
                  setView('post-opinion');
                }}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all active:scale-95 border border-blue-100 shadow-sm"
              >
                <Plus className="w-3 h-3" /> New Post
              </button>
            </div>
            {orgPosts.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 italic">
                No community activity from members yet.
              </div>
            ) : (
              orgPosts.map(post => (
                <div key={post.id}>
                  <PostCard 
                    post={post} 
                    user={user} 
                    profile={profile} 
                    allUsers={users}
                    askConfirm={askConfirm}
                    addToast={addToast}
                    notifyAdmins={notifyAdmins}
                  />
                </div>
              ))
            )}
          </motion.div>
        )}

        {tab === 'settings' && isAdmin && (
          <motion.div key="settings" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-6">Organization Settings</h3>
            <form onSubmit={handleUpdateOrg} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Organization Name</label>
                <input 
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({...editData, name: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">District</label>
                  <select 
                    value={editData.district}
                    onChange={(e) => setEditData({...editData, district: e.target.value, thana: ''})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500"
                  >
                    {Object.keys(BANGLADESH_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thana</label>
                  <select 
                    value={editData.thana}
                    onChange={(e) => setEditData({...editData, thana: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500"
                  >
                    <option value="All">All Thanas</option>
                    {BANGLADESH_LOCATIONS[editData.district]?.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Info</label>
                <input 
                  type="text"
                  value={editData.contact}
                  onChange={(e) => setEditData({...editData, contact: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500"
                  placeholder="Phone or Address"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <textarea 
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                Save Organization Details
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest mb-4">Data Management</h4>
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Bulk Import Donors</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Import from Excel Document</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowingImportModal(true)}
                  className="bg-white text-slate-900 font-black px-4 py-2 rounded-xl text-[10px] shadow-sm hover:bg-slate-100 transition-all border border-slate-200 uppercase tracking-widest"
                >
                  Import Data
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showingImportModal && (
        <ImportDonorsModal 
          org={org}
          onCancel={() => setShowingImportModal(false)}
          onSuccess={() => {
            setShowingImportModal(false);
          }}
          addToast={addToast}
        />
      )}
    </motion.div>
  );
}


function AdminLoginForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will redirect.
    } catch (err: any) {
      console.error("Admin login error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password login is not enabled. Please enable 'Email/Password' provider in your Firebase Authentication console.");
      } else {
        setError("Login failed. Manual login is restricted to administrator accounts.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
      >
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-2 text-sm font-bold">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900">Admin Login</h2>
          <p className="text-sm text-slate-500">Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Admin Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500"
              placeholder="admin@bloodlink.bd"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50">
          <p className="text-[10px] text-slate-400 leading-relaxed text-center">
            Manual login requires the "Email/Password" provider to be enabled in Firebase Authentication. If you haven't done this, please enable it in the console.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function RequestCard({ request, user, onMessage, onViewProfile, onDelete, onDonationDone, onMatchDonors, allUsers }: { 
  request: BloodRequest, 
  user: FirebaseUser | null,
  onMessage?: () => void, 
  onViewProfile?: () => void, 
  onDelete?: () => void, 
  onDonationDone?: (req: BloodRequest) => void,
  onMatchDonors?: () => void,
  allUsers: UserProfile[],
  key?: any 
}) {
  const isOwner = user?.uid === request.requesterUid;
  const requesterProfile = allUsers.find(u => u.uid === request.requesterUid);
  const isUrgent = request.urgency === 'Urgent';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`bg-white rounded-3xl p-5 border shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full group ${
        isUrgent 
          ? 'border-red-200 ring-2 ring-red-50/70 shadow-red-50/50 bg-gradient-to-b from-red-50/5 via-white to-white' 
          : 'border-slate-150 shadow-slate-100/50'
      }`}
    >
      {/* Absolute Decorative Background Vector */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-red-500/10 transition-colors duration-500" />

      {/* Urgency indicator strip layout */}
      {isUrgent && (
        <div className="absolute top-0 right-0 py-1.5 px-4 bg-gradient-to-r from-red-600 to-red-500 rounded-bl-2xl z-20 shadow-sm border-l border-b border-red-500/20">
          <div className="flex items-center gap-1 leading-none">
            <Zap className="w-3 h-3 text-white animate-pulse" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Urgent Need</span>
          </div>
        </div>
      )}

      {onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          type="button"
          className="absolute top-3 left-3 p-2 bg-white/95 backdrop-blur-sm text-red-600 hover:text-white hover:bg-red-600 rounded-full shadow-sm border border-slate-200/60 transition-all z-20 active:scale-90 scale-95"
          title="Delete Request"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="space-y-4">
        {/* Header combined Blood Group capsule, Hospital details */}
        <div className="flex gap-4 items-start relative z-10 pt-1">
          {/* Blood Drop Capsule */}
          <div className="relative overflow-hidden w-16 h-16 bg-gradient-to-b from-red-600 to-rose-700 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-red-500/15 border border-red-500/20 shrink-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-12 h-12 bg-white/10 rounded-[50%_50%_50%_20%] rotate-45 transform pointer-events-none" />
            <span className="relative text-white font-black text-2xl tracking-tighter leading-none">{request.bloodGroup}</span>
            <span className="relative text-[8px] text-red-100 font-extrabold uppercase tracking-widest mt-1">Factor</span>
          </div>

          {/* Hospital & Info text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="space-y-1">
                <h3 className="font-black text-slate-800 text-[15px] leading-snug group-hover:text-slate-900 transition-colors uppercase tracking-tight line-clamp-1">
                  {request.hospital}
                </h3>
                
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                  <MapPin className="w-3.5 h-3.5 text-red-500/80 shrink-0" />
                  <span className="truncate">{request.thana}, {request.district}</span>
                </div>
              </div>

              {/* Fulfilled Tag indicator */}
              {request.status === 'Fulfilled' ? (
                <div className="bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0 shadow-inner">
                  <span className="text-[7px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> Fulfilled
                  </span>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-100/80 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-[7.5px] font-black text-red-700 font-mono tracking-wider leading-none">
                    {request.unitsNeeded || 1} { (request.unitsNeeded || 1) > 1 ? 'Bags' : 'Bag' } Required
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cause / Address details box */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
          <div className="flex gap-2 items-start text-xs text-slate-700 font-medium leading-relaxed">
            <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-lg text-[8.5px] font-extrabold uppercase tracking-widest leading-none mt-0.5">Purpose</span>
            <span className="flex-1 text-slate-700 font-semibold">{request.medicalReason}</span>
          </div>
          {request.hospitalAddress && (
            <div className="text-[10px] text-slate-450 font-semibold flex gap-1.5 items-center italic pl-2 border-l border-slate-200">
              <span>{request.hospitalAddress}</span>
            </div>
          )}
        </div>

        {/* Requester Account metadata line */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50 flex-wrap gap-2.5">
          <button 
            onClick={onViewProfile}
            type="button"
            className="flex items-center gap-2 hover:opacity-85 transition-all group/req text-prev text-left focus:outline-none"
          >
            <img 
              src={request.requesterPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.requesterName)}&background=ffe2e2&color=dc2626&bold=true`} 
              alt={request.requesterName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-tight flex items-center gap-1 leading-tight mb-0.5 group-hover/req:text-red-600 transition-colors">
                {request.requesterName}
                {requesterProfile?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-white fill-blue-500 shrink-0" />}
              </span>
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Patient Sponsor</span>
            </div>
          </button>

          <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100/80 border border-slate-200/50 px-2.5 py-1 rounded-full font-mono tracking-wider">
            {request.thana} Area
          </span>
        </div>

        {/* Quick status operations for owners / helpers */}
        {request.status === 'Pending' && (
          <div className="pt-1">
            {isOwner ? (
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await updateDoc(doc(db, 'requests', request.id), { status: 'Fulfilled' });
                  } catch (err) {
                    handleFirestoreError(err, OperationType.UPDATE, `requests/${request.id}`);
                  }
                }}
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 w-full cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Mark As Fulfilled
              </button>
            ) : (
              onDonationDone && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDonationDone(request);
                  }}
                  type="button"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 shrink-0 animate-pulse text-rose-100" /> Confirm I Donated
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Primary Actions Trigger Bar */}
      <div className="flex flex-row items-center justify-between pt-4 border-t border-slate-100 mt-4 relative z-10 w-full shrink-0 gap-2">
        {request.status === 'Pending' && onMatchDonors ? (
          <button 
            onClick={onMatchDonors}
            type="button"
            className="h-11 flex-1 bg-red-600 hover:bg-red-700 text-white px-3.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-red-200/50 cursor-pointer min-w-0"
          >
            <Search className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <span className="truncate">Match Volunteers</span>
          </button>
        ) : (
          <div className="hidden" />
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {request.lat && request.lng && (
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 border border-slate-200/50 shadow-sm flex items-center justify-center shrink-0"
              title="Get Route Navigation"
            >
              <Navigation className="w-4 h-4 stroke-[2.2]" />
            </a>
          )}
          
          {onMessage && (
            <button 
              onClick={onMessage}
              type="button"
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 border border-slate-200/50 shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
              title="Chat with coordinate manager"
            >
              <MessageSquare className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}

          <a 
            href={`tel:${request.contactPhone}`}
            className="w-11 h-11 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all active:scale-95 border border-emerald-100/80 shadow-sm flex items-center justify-center shrink-0"
            title="Call coordinate contact"
          >
            <Phone className="w-4 h-4 stroke-[2.2]" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// Helper for blood group medical compatibility rules
const isBloodCompatible = (donor: string, patient: string): boolean => {
  const d = donor.trim().toUpperCase();
  const p = patient.trim().toUpperCase();
  if (d === p) return true;
  
  if (d === 'O-') return true; // Universal Donor can donate to everyone
  
  if (p === 'AB+') return true; // Universal Recipient can receive from everyone
  
  if (p === 'A+') {
    return d === 'A-' || d === 'O+';
  }
  if (p === 'A-') {
    return d === 'A-' || d === 'O-';
  }
  if (p === 'B+') {
    return d === 'B-' || d === 'O+';
  }
  if (p === 'B-') {
    return d === 'B-' || d === 'O-';
  }
  if (p === 'AB-') {
    return d === 'A-' || d === 'B-' || d === 'AB-';
  }
  if (p === 'O+') {
    return d === 'O-';
  }
  return false;
};

// Helper to format date for display
const formatDisplayDate = (date: any) => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (date && typeof date.toDate === 'function') {
    try {
      return date.toDate().toLocaleDateString();
    } catch (e) {
      console.error("formatDisplayDate failed", e);
      return '';
    }
  }
  if (date && typeof date.seconds === 'number') {
    return new Date(date.seconds * 1000).toLocaleDateString();
  }
  return String(date);
};

// Helper for last seen formatting
const formatLastSeen = (lastSeen: any) => {
  if (!lastSeen) return 'Never';
  let d: Date;
  if (lastSeen instanceof Date) d = lastSeen;
  else if (lastSeen && typeof lastSeen.toDate === 'function') d = lastSeen.toDate();
  else if (lastSeen && typeof lastSeen.seconds === 'number') d = new Date(lastSeen.seconds * 1000);
  else d = new Date(lastSeen);

  if (isNaN(d.getTime())) return 'Never';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const isUserOnline = (lastSeen: any) => {
  if (!lastSeen) return false;
  let d: Date;
  if (lastSeen instanceof Date) d = lastSeen;
  else if (lastSeen && typeof lastSeen.toDate === 'function') d = lastSeen.toDate();
  else if (lastSeen && typeof lastSeen.seconds === 'number') d = new Date(lastSeen.seconds * 1000);
  else d = new Date(lastSeen);
  
  if (isNaN(d.getTime())) return false;
  return (new Date().getTime() - d.getTime()) < 5 * 60 * 1000;
};

// Helper for type="date" input (YYYY-MM-DD)
const formatDateForInput = (date: any) => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date && typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (date && typeof date.seconds === 'number') {
    d = new Date(date.seconds * 1000);
  } else {
    return '';
  }
  
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

function DonorCard({ donor, onMessage, onViewProfile, currentUserProfile, showThanaOnly }: { donor: UserProfile, onMessage?: () => void, onViewProfile?: () => void, currentUserProfile?: UserProfile | null, showThanaOnly?: boolean, key?: any }) {
  const isNearby = currentUserProfile && 
                  donor.district === currentUserProfile.district && 
                  donor.thana === currentUserProfile.thana;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`bg-white rounded-3xl p-5 border shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-full ${
        isNearby ? 'border-red-100 ring-2 ring-red-50/70 shadow-red-50/80 bg-gradient-to-b from-red-50/5 via-white to-white' : 'border-slate-150 shadow-slate-100'
      }`}
    >
      {/* Decorative background visual */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-red-500/10 transition-colors" />

      {isNearby && (
        <div className="absolute top-0 right-0 py-1.5 px-3.5 bg-gradient-to-r from-red-600 to-red-500 rounded-bl-2xl z-20 shadow-sm border-l border-b border-red-500/30">
          <span className="text-[7.5px] font-black text-white uppercase tracking-widest leading-none block">Nearby You</span>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex gap-4 relative z-10 items-start">
          {/* Avatar frame */}
          <button 
            onClick={onViewProfile}
            type="button"
            className="shrink-0 relative focus:outline-none focus:ring-4 focus:ring-red-100 rounded-full transition-all duration-300 hover:scale-105"
          >
            <div className="relative">
              <img 
                src={donor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(donor.displayName)}&background=ffe2e2&color=dc2626&bold=true`} 
                alt={donor.displayName} 
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md shadow-slate-100"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md border border-slate-100 overflow-hidden">
                {donor.isVerified ? (
                  <BadgeCheck className="w-4 h-4 text-white fill-blue-500 shrink-0" />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <UserIcon className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Core metadata details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2.5">
              <button 
                onClick={onViewProfile} 
                type="button"
                className="text-left group/name overflow-hidden pr-2 cursor-pointer focus:outline-none"
              >
                <h3 className="font-black text-slate-800 text-[14.5px] leading-snug group-hover/name:text-red-600 transition-colors uppercase tracking-tight line-clamp-1">
                  {donor.displayName}
                </h3>
                
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mt-0.5">Volunteer Donor</span>
              </button>

              {/* Status Indicator */}
              <div className="shrink-0">
                {(() => {
                  const now = new Date();
                  const isEligible = !donor.nextDonationEligibility || new Date(donor.nextDonationEligibility) <= now;
                  
                  if (donor.isAvailable && isEligible) {
                    return (
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-inner">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                        <span className="text-[7.5px] font-black text-emerald-800 uppercase tracking-widest">Active Ready</span>
                      </div>
                    );
                  } else if (donor.isAvailable && !isEligible) {
                    return (
                      <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
                        <span className="text-[7.5px] font-black text-amber-800 uppercase tracking-widest">Cool Down</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        <span className="w-1.5 h-1.5 bg-slate-350 rounded-full" />
                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">Off-Duty</span>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Regional Pin Label */}
            <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold mt-2 leading-none">
              <MapPin className="w-3.5 h-3.5 text-rose-500/80 shrink-0" />
              <span className="truncate">{showThanaOnly ? donor.thana : `${donor.thana}, ${donor.district}`}</span>
            </div>
          </div>
        </div>

        {/* Detailed stats overview panel */}
        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block leading-none">Compatible Group</span>
            <div className="text-sm font-black text-red-600 uppercase font-mono tracking-tight flex items-center gap-1 mt-0.5">
              <Droplets className="w-3.5 h-3.5 text-red-500 shrink-0" />
              {donor.bloodGroup} Factor
            </div>
          </div>

          <div className="text-right border-l border-slate-200 pl-3.5 py-0.5">
            {donor.lastDonationDate ? (
              <div className="space-y-0.5">
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block leading-none">Last Donation run</span>
                <span className="text-[10px] font-black text-slate-600 font-mono block mt-0.5">{formatDisplayDate(donor.lastDonationDate)}</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block leading-none">Last Donation run</span>
                <span className="text-[10.5px] font-black text-emerald-600 block mt-0.5 uppercase tracking-wide">Never Donated</span>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Availability warning bar */}
        {donor.nextDonationEligibility && new Date(donor.nextDonationEligibility) > new Date() && (
          <div className="p-2 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center gap-2 text-[9px] font-black text-red-700 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Next Eligible: {formatDisplayDate(donor.nextDonationEligibility)}</span>
          </div>
        )}
      </div>

      {/* Primary actions buttons container */}
      <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-4 relative z-10 w-full shrink-0">
        {onMessage && (
          <button 
            onClick={onMessage}
            type="button"
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>Message</span>
          </button>
        )}
        <button 
          onClick={onViewProfile}
          type="button"
          className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer border border-slate-200/40"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>Profile</span>
        </button>
      </div>
    </motion.div>
  );
}

function RequestForm({ onCancel, onSuccess, user, notifyAdmins, settings }: { onCancel: () => void, onSuccess: () => void, user: FirebaseUser, notifyAdmins: (title: string, body: string, link?: string) => Promise<void>, settings: SystemSettings | null }) {
  const placesLib = useMapsLibrary('places');
  const [formData, setFormData] = useState({
    bloodGroup: '',
    district: '',
    thana: '',
    hospital: '',
    hospitalAddress: '',
    lat: 0,
    lng: 0,
    unitsNeeded: 1,
    urgency: 'Normal' as 'Urgent' | 'Normal',
    medicalReason: '',
    contactPhone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [hospitals, setHospitals] = useState<{name: string, address: string, lat: number, lng: number}[]>([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);

  useEffect(() => {
    if (placesLib && formData.district && formData.thana) {
      const searchHospitals = () => {
        setSearchingHospitals(true);
        const py = document.createElement('div');
        const service = new placesLib.PlacesService(py);
        const query = `hospital in ${formData.thana}, ${formData.district}, Bangladesh`;
        
        service.textSearch({
          query: query,
          location: { lat: 23.685, lng: 90.3563 }, // Center of BD
          radius: 50000
        }, (results, status) => {
          if (status === placesLib.PlacesServiceStatus.OK && results) {
            const fetched = results.map(r => ({
              name: r.name || '',
              address: r.formatted_address || '',
              lat: r.geometry?.location?.lat() || 0,
              lng: r.geometry?.location?.lng() || 0
            }));
            setHospitals(fetched);
          } else {
            setHospitals([]);
          }
          setSearchingHospitals(false);
        });
      };
      
      const timer = setTimeout(searchHospitals, 500);
      return () => clearTimeout(timer);
    }
  }, [placesLib, formData.district, formData.thana]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bloodGroup) {
      alert("Please select a valid blood group.");
      return;
    }
    setSubmitting(true);
    
    let finalLat = formData.lat;
    let finalLng = formData.lng;

    // If no coordinates (e.g. typed manually), try to geocode the location
    if (placesLib && (finalLat === 0 || finalLng === 0)) {
      try {
        const py = document.createElement('div');
        const service = new placesLib.PlacesService(py);
        const query = `${formData.hospital || formData.thana}, ${formData.district}, Bangladesh`;
        
        const results = await new Promise<any[]>((resolve) => {
          service.textSearch({ query }, (results, status) => {
            if (status === placesLib.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          });
        });

        if (results.length > 0 && results[0].geometry?.location) {
          finalLat = results[0].geometry.location.lat();
          finalLng = results[0].geometry.location.lng();
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }

    try {
      await addDoc(collection(db, 'requests'), {
        ...formData,
        lat: finalLat,
        lng: finalLng,
        requesterUid: user.uid,
        requesterName: user.displayName || 'Anonymous',
        requesterPhoto: user.photoURL || '',
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      notifyAdmins("New Blood Request", `${user.displayName} needs ${formData.bloodGroup} at ${formData.hospital} (${formData.district})`, 'requests');
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests');
    } finally {
      setSubmitting(false);
    }
  };

  const REASON_SUGGESTIONS = [
    'Surgery Requirement',
    'Emergency C-Section',
    'Road Accident Trauma',
    'Thalassemia Infusion',
    'Severe Anemia Care',
    'Cancer Chemotherapy',
    'Dengue Platelet Need',
    'Cardiac Surgery Appeal'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Main Interactive Form Column */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-8 bg-white rounded-3xl border border-slate-150 shadow-2xl overflow-hidden"
      >
        {/* Elegant Form Header Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 text-white relative">
          <div className="absolute right-6 top-6 opacity-13">
            <Droplets className="w-24 h-24 stroke-[1.5]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Droplets className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-white/80 text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-md">
                Live broadcast broadcast
              </span>
              <h2 className="text-xl font-black tracking-tight mt-0.5">Place Blood Appeal</h2>
            </div>
          </div>
          <p className="text-xs text-rose-50/85 mt-3 max-w-xl font-medium leading-relaxed">
            Specify patient vitals and Hospital below. Once posted, compatible nearby local donors and systems within your regional boundaries will instantly receive emergency notification alarms.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Card Section 1: Blood Group Vitals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-black text-red-600">1</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Select Blood Group Needed</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {BLOOD_GROUPS.map(g => {
                const isSelected = formData.bloodGroup === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, bloodGroup: g })}
                    className={`relative py-3.5 px-2 rounded-2xl font-black text-base border-2 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer transform active:scale-95 ${
                      isSelected 
                        ? 'bg-red-50 border-red-600 text-red-600 shadow-[0_8px_16px_rgba(220,38,38,0.1)]' 
                        : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="text-base font-black">{g}</span>
                    <span className="text-[7.5px] uppercase font-bold tracking-widest text-slate-400">Factor</span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Section 2: Patient Context & Volume */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-black text-red-600">2</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Case Volume & Urgency Status</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bags counter */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner flex flex-col justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Total Bags / Units Needed</span>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5 tracking-wide">Enter units required on emergency bed</p>
                </div>
                <div className="flex items-center gap-4 mt-3 self-end md:self-auto">
                  <button
                    type="button"
                    disabled={formData.unitsNeeded <= 1}
                    onClick={() => setFormData(prev => ({ ...prev, unitsNeeded: Math.max(1, prev.unitsNeeded - 1) }))}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="text-xl font-black text-slate-800 w-8 text-center select-none leading-none">
                    {formData.unitsNeeded}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, unitsNeeded: prev.unitsNeeded + 1 }))}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all active:scale-95 select-none cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Urgency switch */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Urgency Priority</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  {(['Normal', 'Urgent'] as const).map(u => {
                    const active = formData.urgency === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormData({ ...formData, urgency: u })}
                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          active 
                            ? u === 'Urgent'
                              ? 'bg-red-600 text-white shadow-md shadow-red-200' 
                              : 'bg-slate-800 text-white shadow-md'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {u === 'Urgent' ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Purpose details text and suggestions */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Medical Reason / Complications Details</label>
              <div className="relative">
                <input 
                  required
                  type="text"
                  placeholder="Type surgery type or medical complications reason..."
                  value={formData.medicalReason}
                  onChange={(e) => setFormData({ ...formData, medicalReason: e.target.value })}
                  className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-red-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quick Select Helpers:</span>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_SUGGESTIONS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, medicalReason: chip }))}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                        formData.medicalReason === chip
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card Section 3: Hospital Address & Search */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-black text-red-600">3</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Hospital Venue & Regional Coordinates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1.5">District</label>
                <div className="relative">
                  <select 
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value, thana: '' })}
                    className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-red-500 font-semibold appearance-none pr-10"
                  >
                    <option value="">Choose District</option>
                    {Object.keys(BANGLADESH_LOCATIONS).sort().map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1.5">Thana / Sub-District Area</label>
                <div className="relative">
                  <select 
                    required
                    disabled={!formData.district}
                    value={formData.thana}
                    onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
                    className="w-full bg-slate-50 border-slate-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-red-500 disabled:opacity-40 font-semibold appearance-none pr-10"
                  >
                    <option value="">Choose Thana</option>
                    {formData.district && BANGLADESH_LOCATIONS[formData.district].sort().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Hospital Address</label>
                {searchingHospitals && (
                  <span className="text-[10px] font-black uppercase text-rose-600 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping inline-block" /> Searching Area Registry...
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {hospitals.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <select
                        required
                        className="w-full bg-blue-50/70 border border-blue-100 text-blue-900 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                        value={formData.hospital}
                        onChange={(e) => {
                          const h = hospitals.find(x => x.name === e.target.value);
                          if (h) {
                            setFormData({ ...formData, hospital: h.name, hospitalAddress: h.address, lat: h.lat, lng: h.lng });
                          }
                        }}
                      >
                        <option value="">-- Choose From Live Verified Hospital Lists --</option>
                        {hospitals.map((h, idx) => (
                          <option key={`${h.name}-${idx}`} value={h.name}>
                            🏥 {h.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-blue-500">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[10px] font-bold text-slate-400">Not listed?</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hospital: '', hospitalAddress: '', lat: 0, lng: 0 }))}
                        className="text-[10.5px] font-black text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        Type manually
                      </button>
                    </div>
                  </div>
                ) : formData.district && formData.thana ? (
                  <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                    <MapPin className="w-6 h-6 text-slate-300 mx-auto" />
                    <div>
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest leading-none">
                        {searchingHospitals ? 'Locating hospitals...' : 'Enter Hospital Manually'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Please write down the clinic / medical hospital address carefully.
                      </p>
                    </div>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Dhaka Medical College Hospital, Ward index..."
                      className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 shadow-sm font-semibold"
                      value={formData.hospital}
                      onChange={(e) => setFormData({ ...formData, hospital: e.target.value, hospitalAddress: `${e.target.value}, ${formData.thana}, ${formData.district}` })}
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50/75 border border-slate-100 rounded-2xl text-center">
                    <MapPin className="w-5 h-5 text-slate-300 mx-auto mb-1.5 animate-bounce" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Select district & thana first</p>
                    <p className="text-[9.5px] text-slate-400 mt-1 max-w-xs mx-auto">We look up regional listings to search matches near your patient area.</p>
                  </div>
                )}
              </div>

              {formData.hospitalAddress && (
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100/60 flex gap-3 transition-all duration-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-200">
                    <BadgeCheck className="w-5 h-5 text-white stroke-[2.5]" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block leading-none">Verified Venue details</span>
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                      {formData.hospital === formData.hospitalAddress ? `${formData.hospitalAddress}` : `${formData.hospital} — ${formData.hospitalAddress}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Section 4: Security Coordinator Contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-black text-red-600">4</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Incident Coordinator Phone</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Direct Phone Contact</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 select-none">
                  <Phone className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <span className="text-sm font-black border-r border-slate-200 pr-3 mr-3 text-slate-600 leading-none font-mono">
                    +880
                  </span>
                </div>
                <input 
                  required
                  type="tel"
                  placeholder="17XXXXXXXX"
                  maxLength={10}
                  value={formData.contactPhone ? formData.contactPhone.replace(/^01/, '1').replace(/^\+880/, '') : ''}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9]/g, '');
                    // Standardizes prefix representation to 01XXXXXXXXX for firestore
                    setFormData({ ...formData, contactPhone: cleaned ? `01${cleaned.replace(/^1/, '')}` : '' });
                  }}
                  className="w-full bg-slate-50 border-slate-150 rounded-2xl pl-[106px] pr-4 py-3.5 focus:ring-2 focus:ring-red-500 text-sm font-bold tracking-wider font-mono"
                  style={{ touchAction: 'manipulation' }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-none px-1">Donors will call you directly on this contact number</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer select-none active:scale-95"
            >
              Go Back
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-[2] bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl shadow-red-100 hover:shadow-red-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer select-none"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Broadcasting Appeal...
                </>
              ) : (
                'Publish Broadcast'
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Live Preview Display Column (Sticky Preview matching the list design) */}
      <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden select-none">
          {/* Glowing subtle background spots */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Live Broadcast Preview</span>
          </div>

          <div className="space-y-4">
            {/* Live broadcast card prototype resembling feed requests */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4 relative overflow-hidden shadow-2xl">
              {/* Urgency tag visualizer */}
              <div className="flex items-center justify-between">
                <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1 leading-none ${
                    formData.urgency === 'Urgent' 
                      ? 'bg-red-600/40 text-red-400 border border-red-500/25 animate-pulse' 
                      : 'bg-slate-800 text-slate-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${formData.urgency === 'Urgent' ? 'bg-red-500' : 'bg-slate-400'}`} />
                  {formData.urgency === 'Urgent' ? '🔴 Emergency Urgent' : '⚪ Normal Alert'}
                </span>
                
                <span className="text-[9px] font-black font-mono text-white/50 bg-white/5 px-2 py-1 rounded-md">
                  {formData.unitsNeeded} BAG{formData.unitsNeeded > 1 ? 'S' : ''} NEEDED
                </span>
              </div>

              {/* Patient Core Info Display */}
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 shrink-0 relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 shadow-md shadow-red-900/30">
                  <div className="absolute inset-0.5 rounded-[14px] bg-slate-950/20 backdrop-blur-sm" />
                  <div className="relative text-center flex flex-col items-center">
                    <span className="text-xl font-black text-white leading-none">
                      {formData.bloodGroup || '?'}
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-red-200 mt-1 leading-none">
                      Group
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="font-extrabold text-white text-sm leading-snug truncate">
                    {formData.hospital || 'Chosen Venue Hospital'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-white/60 text-[10px] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">
                      {formData.thana ? `${formData.thana}, ` : ''}{formData.district || 'Selected Bangladesh Jurisdiction'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Case Reason Callout */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Patient Case Details</span>
                <p className="text-xs text-white/90 font-medium italic leading-relaxed">
                  "{formData.medicalReason || 'Describe the patient situation e.g. Surgery schedule requirements...'}"
                </p>
              </div>

              {/* Requester Profile Section */}
              <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-850 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[7.5px] font-black text-white/40 uppercase tracking-widest block leading-none">Patient Sponsor</span>
                    <span className="text-xs font-bold text-white max-w-[100px] truncate block mt-0.5">{user.displayName || 'Authorized Member'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-950">
                  <Phone className="w-3.5 h-3.5 text-emerald-100 stroke-[2.5]" />
                  Call Contact
                </div>
              </div>
            </div>

            {/* Verification Note */}
            <div className="p-3 bg-white/5 text-white/60 text-[10.5px] rounded-xl flex gap-2 items-start leading-relaxed border border-white/[0.02]">
              <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>This is a real-time reactive card layout preview. Make sure district boundary metrics are accurate so notification routing alerts compatible donors instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ user, initialProfile, requests, donations, posts, allUsers, onLeave, onNavigateOrganizations, onSuccess, onViewProfile, askConfirm, addToast, requestNotificationPermission, notifyAdmins, onLogout }: { 
  user: FirebaseUser, 
  initialProfile: UserProfile | null, 
  requests: BloodRequest[], 
  donations: DonationRecord[],
  posts: CommunityPost[],
  allUsers: UserProfile[],
  onLeave: () => void, 
  onNavigateOrganizations: () => void, 
  onSuccess: (p: UserProfile) => void,
  onViewProfile: (uid: string) => void,
  askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>,
  addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void,
  requestNotificationPermission: () => Promise<void>,
  notifyAdmins: (title: string, body: string, link?: string) => Promise<void>,
  onLogout: () => void
}) {
  const [historyTab, setHistoryTab] = useState<'donations' | 'requests'>('donations');
  const [formData, setFormData] = useState<UserProfile>({
    uid: user.uid,
    displayName: user.displayName || localStorage.getItem('reg_display_name') || '',
    email: user.email || '',
    bloodGroup: initialProfile?.bloodGroup || '',
    district: initialProfile?.district || '',
    thana: initialProfile?.thana || '',
    phone: initialProfile?.phone || user.phoneNumber || localStorage.getItem('reg_phone_number') || '',
    photoURL: initialProfile?.photoURL || user.photoURL || '',
    lastDonationDate: formatDateForInput(initialProfile?.lastDonationDate) || '',
    gender: initialProfile?.gender || 'male',
    nextDonationEligibility: initialProfile?.nextDonationEligibility || '',
    fcmToken: initialProfile?.fcmToken || '',
    isAvailable: initialProfile?.isAvailable ?? true,
    role: initialProfile?.role || 'user',
    isBlocked: initialProfile?.isBlocked || false,
    organizationId: initialProfile?.organizationId,
    organizationName: initialProfile?.organizationName,
    coverURL: initialProfile?.coverURL || ''
  });

  useEffect(() => {
    if (initialProfile) {
      setFormData(prev => ({
        ...prev,
        coverURL: initialProfile.coverURL || prev.coverURL,
        bloodGroup: initialProfile.bloodGroup || prev.bloodGroup,
        district: initialProfile.district || prev.district,
        thana: initialProfile.thana || prev.thana,
        phone: initialProfile.phone || prev.phone,
        photoURL: initialProfile.photoURL || prev.photoURL,
        lastDonationDate: formatDateForInput(initialProfile.lastDonationDate) || prev.lastDonationDate,
        gender: initialProfile.gender || prev.gender,
        nextDonationEligibility: initialProfile.nextDonationEligibility || prev.nextDonationEligibility,
        isAvailable: initialProfile.isAvailable ?? prev.isAvailable,
        organizationId: initialProfile.organizationId,
        organizationName: initialProfile.organizationName
      }));
    }
  }, [initialProfile]);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const targetWidth = 1280;
              const targetHeight = 720;
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject('Canvas context not available');

              // Downscale/scale to fit 1280x720 using center-cover math
              const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
              const x = (targetWidth - img.width * scale) / 2;
              const y = (targetHeight - img.height * scale) / 2;
              
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
              // Use JPEG for performance and storage
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => reject('Image load failed');
          };
          reader.onerror = () => reject('File read failed');
        });
        setFormData(prev => ({ ...prev, photoURL: resizedImage }));
        addToast("Photo Loaded", "Your profile photo has been updated. Please click 'Save changes' at the bottom to apply changes.", "success");
      } catch (err) {
        console.error(err);
        addToast("Upload Failed", "Could not process image file.", "error");
      }
    }
  };

  const handleImageClick = async () => {
    const choice = await askConfirm(
      'Change Profile Picture', 
      'Would you like to upload an image from your device or use a web image URL?', 
      'Upload Image', 
      'warning', 
      'Enter Image URL'
    );

    if (choice) {
      photoInputRef.current?.click();
    } else {
      const url = prompt('Enter Profile Image URL:');
      if (url !== null) {
        setFormData(prev => ({ ...prev, photoURL: url }));
        addToast("Photo URL Loaded", "Profile photo URL has been set. Remember to click Save changes at the bottom of the form to apply changes.", "success");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("ProfileForm handleSubmit triggered", formData);
    if (saving) return;

    if (!formData.bloodGroup || !formData.district || !formData.thana) {
      console.warn("Profile validation failed", { bloodGroup: formData.bloodGroup, district: formData.district, thana: formData.thana });
      addToast("Missing Information", "Please select your Blood Group, District, and Thana.", 'warning');
      return;
    }

    setSaving(true);
    try {
      // Calculate next donation eligibility
      let nextEligibility = '';
      if (formData.lastDonationDate) {
        const lastDate = new Date(formData.lastDonationDate);
        const months = formData.gender === 'female' ? 4 : 3;
        lastDate.setMonth(lastDate.getMonth() + months);
        nextEligibility = lastDate.toISOString().split('T')[0];
      }

      const batch = writeBatch(db);
      
      const dataToSave: any = { 
        ...formData,
        nextDonationEligibility: nextEligibility,
        updatedAt: serverTimestamp()
      };

      // Firestore does not allow undefined values
      if (dataToSave.organizationId === undefined) delete dataToSave.organizationId;
      if (dataToSave.organizationName === undefined) delete dataToSave.organizationName;
      
      // Handle district change -> auto-leave organization
      const districtChanged = initialProfile?.district && formData.district !== initialProfile.district;
      const wasInOrg = initialProfile?.organizationId;

      if (wasInOrg && districtChanged) {
        if (await askConfirm('Location Change Notice', `Changing district from ${initialProfile.district} to ${formData.district} will automatically remove you from your current organization (${initialProfile.organizationName}). Continue?`, 'Change & Leave Org', 'warning')) {
          const orgId = initialProfile.organizationId;
          batch.delete(doc(db, 'organizations', orgId, 'members', user.uid));
          batch.update(doc(db, 'organizations', orgId), { 
            memberCount: increment(-1) 
          });
          
          (dataToSave as any).organizationId = deleteField();
          (dataToSave as any).organizationName = deleteField();
        } else {
          setSaving(false);
          return;
        }
      } else if (wasInOrg && !districtChanged) {
        // Sync basic info with organization members list
        batch.update(doc(db, 'organizations', wasInOrg, 'members', user.uid), {
          displayName: formData.displayName,
          bloodGroup: formData.bloodGroup
        });
      }

      console.log("Saving profile changes via batch...");
      batch.set(doc(db, 'users', user.uid), dataToSave, { merge: true });
      
      await batch.commit();
      
      if (!initialProfile) {
        notifyAdmins("New Member Joined", `${formData.displayName} has just signed up!`, 'users');
      }
      
      console.log("Profile and membership synced successfully");
      localStorage.removeItem('reg_phone_number');
      localStorage.removeItem('reg_display_name');
      onSuccess(formData);
      addToast("Profile Updated", "Your information has been successfully saved.", 'success');
    } catch (error: any) {
      console.error("Profile save error:", error);
      addToast("Update Failed", "Could not save your profile. Please check your connection and try again.", "error");
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="bg-slate-50/50 rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden"
    >
      {/* Cover Photo Area with Backdrop Mask and Dot Overlay */}
      <div className="h-44 md:h-60 bg-slate-900 relative group/cover overflow-hidden">
        {formData.coverURL ? (
          <img 
            src={formData.coverURL} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover/cover:scale-105" 
            alt="Cover Banner" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-600 via-red-500 to-rose-600" />
        )}
        
        {/* Soft Linear Gradient Mask for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/20 to-transparent" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.2px, transparent 0)', backgroundSize: '16px 16px' }} />
        </div>

        {/* Cover Photo Upload Button */}
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter Cover Image URL (Facebook-style web link):');
            if (url !== null) setFormData({ ...formData, coverURL: url });
          }}
          className="absolute bottom-5 right-5 bg-white/95 backdrop-blur-md text-slate-800 hover:bg-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-slate-200/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-slate-600" />
          Change Art Cover
        </button>
      </div>

      <div className="px-4 pb-8 -mt-16 md:-mt-24 relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: PROFILE STATUS & QUICK WIDGETS (4 cols) */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            
            {/* Quick Profile Overview Box */}
            <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xl shadow-slate-100/50 flex flex-col items-center text-center">
              {/* Profile Avatar Wrapper */}
              <div 
                onClick={handleImageClick}
                className="relative group/photo cursor-pointer hover:scale-[1.03] active:scale-95 transition-all mb-4"
                title="Click to select or upload profile avatar"
              >
                <img 
                  src={formData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=fecdd3&color=e11d48&bold=true`} 
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-[5px] border-white shadow-2xl transition-all group-hover/photo:brightness-95" 
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-1 right-1 bg-red-605 text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg ring-4 ring-red-500/10 group-hover/photo:scale-110 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>
              <input 
                type="file" 
                ref={photoInputRef} 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="hidden" 
              />

              {/* Patient/User Name Display */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none leading-none">
                    {formData.displayName || "Anonymous User"}
                  </h2>
                  <div className="text-[10px] font-black uppercase text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-md shadow-sm">
                    {formData.bloodGroup || "—"}
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-400 font-mono flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {formData.email}
                </p>
              </div>

              {/* Address indicator banner */}
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-4 bg-slate-50 border border-slate-100 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-wider mb-6">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>{formData.thana || 'Thana'}, {formData.district || 'District'}</span>
              </div>

              {/* Utility shortcuts */}
              <div className="w-full space-y-2">
                <button 
                  type="button"
                  onClick={() => onViewProfile(user.uid)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-black py-3 rounded-2xl border border-slate-200/50 transition-all text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  View Public Profile
                </button>
              </div>
            </div>

            {/* Quick Status: Available to Donate Toggle Widget */}
            <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xl shadow-slate-100/50 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Donor Discovery</h3>
                  <p className="text-xs font-bold text-slate-700">Public Availability</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${formData.isAvailable ? 'bg-emerald-500/10 text-emerald-707 border border-emerald-555/20' : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${formData.isAvailable ? 'bg-emerald-505 animate-pulse' : 'bg-rose-500'}`} />
                  {formData.isAvailable ? 'Discovered' : 'Hidden'}
                </span>
              </div>

              <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                When active, your profile is listed in live searches. People experiencing urgency in your district will be able to summon your coordination help.
              </p>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                className={`w-full py-3.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formData.isAvailable 
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {formData.isAvailable ? '✓ Mode: Available to Donate' : '✗ Mode: Currently Invisible'}
              </button>
            </div>

            {/* Organization Community Widget */}
            <div className="bg-gradient-to-br from-red-500/5 to-rose-500/5 rounded-3xl border border-red-500/10 p-6 shadow-xl shadow-red-500/5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none">Association</h3>
                    <p className="text-xs font-bold text-slate-800">Your Organization</p>
                  </div>
                </div>
              </div>

              {initialProfile?.organizationId ? (
                <div className="space-y-3">
                  <div className="bg-white border border-red-100 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Affiliated Club</p>
                    <p className="font-black text-slate-900 text-sm leading-snug">{initialProfile.organizationName}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={onNavigateOrganizations}
                      className="py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Browse Clubs
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        console.log("ProfileForm: Leave button clicked");
                        onLeave();
                      }}
                      className="py-2.5 border border-red-200 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all cursor-pointer active:scale-95"
                    >
                      Leave Team
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Associate with a local volunteering club or union in your district to manage corporate campaigns and group donations.
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateOrganizations}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-red-600 font-black border border-red-100 text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-red-100/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-red-500" />
                    Join an Organization
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT PANEL: CORE EDITABLE PROFILE DETAILS Form (8 cols) */}
          <div className="col-span-1 lg:col-span-8 bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-xl shadow-slate-100/50">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SECTION A: IDENTITY & CONTACT INFO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                    <UserIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Clinical Identity Details</h3>
                    <p className="text-[10px] font-bold text-slate-400 font-semibold leading-none">Manage names, gender and accessibility phone channels</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Full Display Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Adnan Mannan"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder:text-slate-350"
                    />
                  </div>

                  {/* Phone Number Field */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Mobile Contact Phone</label>
                    <input 
                      required
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Gender Switch */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Your Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['male', 'female', 'other'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`py-3 rounded-2xl font-black text-[10px] border-2 transition-all uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1 ${
                          formData.gender === g 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                            : 'bg-white border-slate-150 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {g === 'male' && <span className="text-[12px]">♂</span>}
                        {g === 'female' && <span className="text-[12px]">♀</span>}
                        {g === 'other' && <span className="text-[12px]">⚦</span>}
                        <span>{g}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION B: CLINICAL/BLOOD PROFILE DETAILS */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-red-500">
                    <Droplets className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Medical Parameters</h3>
                    <p className="text-[10px] font-bold text-slate-400 font-semibold">Important medical status for routing matching requests</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Your Official Blood Group</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, bloodGroup: g })}
                        className={`py-3 rounded-2xl font-black text-xs border-2 transition-all cursor-pointer ${
                          formData.bloodGroup === g 
                            ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-100 scale-[1.02]' 
                            : 'bg-white border-slate-150 text-slate-600 hover:border-red-200 hover:bg-rose-50/5'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blood Group Compatibility Guidance Tooltip Card */}
                {formData.bloodGroup && (
                  <div className="bg-red-500/[0.02]/ animate-in p-4 rounded-2xl border border-red-500/10 fade-in duration-300">
                    <div className="flex gap-2.5 items-start">
                      <Heart className="w-5 h-5 text-red-500 shrink-0 fill-red-500 animate-pulse mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Bio-Compatibility Match Info</p>
                        <p className="text-slate-600 text-[11px] font-semibold leading-relaxed mt-1">
                          As an <strong className="text-slate-800 font-extrabold">{formData.bloodGroup}</strong> donor, you can save patients needing blood groups:{' '}
                          <span className="font-extrabold text-red-600">
                            {formData.bloodGroup === 'O-' && 'Everyone (Universal Donor!)'}
                            {formData.bloodGroup === 'O+' && 'O+, A+, B+, AB+'}
                            {formData.bloodGroup === 'A-' && 'A-, A+, AB-, AB+'}
                            {formData.bloodGroup === 'A+' && 'A+, AB+'}
                            {formData.bloodGroup === 'B-' && 'B-, B+, AB-, AB+'}
                            {formData.bloodGroup === 'B+' && 'B+, AB+'}
                            {formData.bloodGroup === 'AB-' && 'AB-, AB+'}
                            {formData.bloodGroup === 'AB+' && 'AB+ Only (Universal Recipient!)'}
                          </span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Donation date picker */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Last Clinically Donated Date</span>
                    <span className="text-[8px] font-extrabold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest leading-none">Optional</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                      type="date"
                      value={formData.lastDonationDate}
                      onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                      className="w-full bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-red-500/10 outline-none transition-all cursor-pointer"
                    />
                  </div>

                  {formData.lastDonationDate && (
                    <div className="bg-emerald-500/[0.03]/ border border-emerald-500/10 p-3.5 rounded-2xl flex items-center gap-3 mt-2 animate-in fade-in duration-200">
                      <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Next Safely Eligible Donation Date</p>
                        <p className="text-[12.5px] font-black text-slate-800">
                          {(() => {
                            const lastDate = new Date(formData.lastDonationDate);
                            const months = formData.gender === 'female' ? 4 : 3;
                            lastDate.setMonth(lastDate.getMonth() + months);
                            return formatDisplayDate(lastDate.toISOString().split('T')[0]);
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold px-1">Allows automatic eligibility computation according to clinical protocol (3 months for males, 4 months for females).</p>
                </div>
              </div>

              {/* SECTION C: REGIONAL / LOCATION SETTINGS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Regional Location</h3>
                    <p className="text-[10px] font-bold text-slate-400 font-semibold animate-none">Discovery of local matching blood donors is based on these parameters</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* District select */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">District Residence</label>
                    <select 
                      required
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value, thana: '' })}
                      className="w-full bg-slate-50 hover:bg-slate-50/50 text-slate-700 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-red-500/10 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select District</option>
                      {Object.keys(BANGLADESH_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Thana Select */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-extrabold text-slate-550 uppercase tracking-wider">Thana / Upazila</label>
                    <select 
                      required
                      disabled={!formData.district}
                      value={formData.thana}
                      onChange={(e) => setFormData({ ...formData, thana: e.target.value })}
                      className="w-full bg-slate-50 hover:bg-slate-50/50 text-slate-705 border border-slate-200 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-red-500/10 outline-none transition-all disabled:opacity-40 cursor-pointer"
                    >
                      <option value="">Select Thana</option>
                      {formData.district && BANGLADESH_LOCATIONS[formData.district].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION D: AVAILABILITY & UNION ASSOCIATION */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                      <Heart className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Availability Status</h3>
                      <p className="text-[10px] font-bold text-slate-400 font-semibold animate-none">Display status in public matchmaking and recipient searches</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-150">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wide">Ready & Available to Donate</p>
                    <p className="text-[10px] text-slate-505 text-slate-500 font-semibold animate-none">Toggle to instantly appear in regional critical patient searches</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                    className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer ${formData.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <motion.div 
                      animate={{ x: formData.isAvailable ? 26 : 4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md animate-none"
                    />
                  </button>
                </div>


              </div>

              {/* SAVE / SUBMIT ACTIONS AND LOGOUT FOOTER */}
              <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center gap-3">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full md:flex-1 bg-slate-900 hover:bg-slate-850 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {saving ? 'Synchronizing Profile...' : 'Save Profile Changes'}
                </button>
                <button 
                  type="button"
                  onClick={onLogout}
                  className="w-full md:w-auto px-6 py-4 font-black text-[10px] uppercase text-red-500 hover:bg-rose-500/5 rounded-2xl border border-red-500/15 cursor-pointer transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogOut className="w-4 h-4 text-red-500 shrink-0" /> Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NotificationsView({ requests, globalAlerts, profile, addToast, onDonationDone }: { requests: BloodRequest[], globalAlerts?: any[], profile: UserProfile | null, addToast: (title: string, message: string, type: Toast['type']) => void, onDonationDone: (req: BloodRequest) => void }) {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [isSupported] = useState('Notification' in window);

  const [readAlerts, setReadAlerts] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('bloodlink_read_broadcasts');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleMarkBroadcastRead = (alertId: string) => {
    const updated = { ...readAlerts, [alertId]: Date.now() };
    setReadAlerts(updated);
    try {
      localStorage.setItem('bloodlink_read_broadcasts', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    addToast("Marked as Read", "Alert marked as read and hidden.", "success");
  };

  const activeGlobalAlerts = (globalAlerts || []).filter(alert => {
    const readTime = readAlerts[alert.id];
    return !readTime; // If read, hide immediately!
  });

  const requestPermission = async () => {
    if (!isSupported) {
      addToast("Not Supported", "Browser notifications are not supported on this device/browser.", 'warning');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'denied') {
        addToast("Permission Denied", "Notification permission was denied. Please enable it in your browser settings to receive alerts.", 'error');
      } else if (result === 'granted') {
        new Notification("Notifications Enabled!", {
          body: "You will now receive alerts for matching blood requests.",
          icon: '/logo.png'
        });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      addToast("Error", "Could not request notification permission. It might be blocked by browser settings.", 'error');
    }
  };

  // Filter requests that match user's blood group and location, PLUS the user's own pending requests
  const relevantRequests = requests.filter(r => 
    r.status === 'Pending' && 
    (
      (r.bloodGroup === profile?.bloodGroup && (r.district === profile?.district || r.district === 'All')) ||
      r.requesterUid === auth.currentUser?.uid
    )
  );

  const verifyAlert = () => {
    playNotificationSound();
    addToast(
      "Notification Active",
      "This is a preview of how you will receive blood request alerts.",
      'success'
    );
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("System Alert Active", {
        body: "You will receive matches for matching blood requests.",
        icon: '/logo.png'
      });
    } else {
      addToast("Browser Alert Disabled", "Direct browser alerts are not active. Check settings.", 'warning');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Alerts for You</h2>
        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase">
          {relevantRequests.length} New
        </span>
      </div>

      {!isSupported ? (
        <div className="bg-slate-100 border border-slate-200 p-4 rounded-3xl flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm">
            <BellOff className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-700 tracking-tight">Direct Alerts Unavailable</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Browser not supported</p>
          </div>
        </div>
      ) : permission === 'denied' ? (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 tracking-tight">Alerts Blocked</p>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Enable in browser settings</p>
            </div>
          </div>
          <button 
            onClick={requestPermission}
            className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all"
          >
            Retry
          </button>
        </div>
      ) : permission === 'default' && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-black text-blue-900 tracking-tight">Enable Browser Alerts</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Never miss a match</p>
            </div>
          </div>
          <button 
            onClick={requestPermission}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
          >
            Enable Now
          </button>
        </div>
      )}

      {permission === 'granted' && (
        <button 
          onClick={verifyAlert}
          className="w-full bg-white border border-slate-200 p-4 rounded-3xl flex items-center justify-between hover:bg-slate-50 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-900 tracking-tight">System Status: Active</p>
              <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Notification alerts verified</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Verify Now</span>
        </button>
      )}

      {/* Dynamic Global Admin Broadcasts */}
      {activeGlobalAlerts.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-red-500 mb-1 px-1 flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5 animate-bounce" /> Urgent Platform Announcements
          </p>
          {activeGlobalAlerts.map(alert => {
            const isRead = !!readAlerts[alert.id];
            let remainingText = "";
            if (isRead) {
              const readTime = readAlerts[alert.id];
              const remainingMs = (24 * 60 * 60 * 1000) - (Date.now() - readTime);
              const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
              remainingText = `Hiding in ${remainingHours}h`;
            }

            return (
              <div 
                key={alert.id} 
                className={`border rounded-3xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm ${
                  isRead 
                    ? 'bg-slate-50 border-slate-200/60 opacity-75' 
                    : 'bg-gradient-to-r from-red-500 to-rose-600 border-red-200 text-white shadow-md shadow-red-100'
                }`}
              >
                {!isRead && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
                )}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${isRead ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-white'}`}>
                    <Megaphone className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={`text-xs uppercase font-bold tracking-wider ${isRead ? 'text-slate-400' : 'text-red-100'}`}>
                        {isRead ? 'Announcement (Read)' : 'Official Broadcast Alert'}
                      </p>
                      <p className={`text-[10px] font-semibold ${isRead ? 'text-slate-400' : 'text-red-100'}`}>
                        {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <p className={`text-sm leading-relaxed font-semibold ${isRead ? 'text-slate-600' : 'text-white'}`}>
                      {alert.message}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      {isRead ? (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                          {remainingText}
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-white inline-block animate-ping" />
                      )}
                      
                      {!isRead && (
                        <button
                          onClick={() => handleMarkBroadcastRead(alert.id)}
                          className="px-4 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-md"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {relevantRequests.length > 0 ? (
        <div className="space-y-4">
          {relevantRequests.map(req => (
            <div key={req.id} className="bg-red-50 border border-red-100 rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900 mb-1">Urgent Blood Needed!</p>
                  <p className="text-xs text-red-700 mb-3">
                    Someone needs <span className="font-black">{req.bloodGroup}</span> blood at {req.hospital}, {req.thana}.
                  </p>
                    <div className="flex gap-2">
                      <a 
                        href={`tel:${req.contactPhone}`}
                        className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
                      >
                        Contact Now
                      </a>
                      {req.requesterUid === auth.currentUser?.uid ? (
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              await updateDoc(doc(db, 'requests', req.id), { status: 'Fulfilled' });
                              addToast("Request Fulfilled", "Your blood request has been successfully fulfilled.", 'success');
                            } catch (e) {
                              handleFirestoreError(e, OperationType.UPDATE, `requests/${req.id}`);
                            }
                          }}
                          className="bg-green-600 text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-green-200 hover:bg-green-700"
                        >
                          Mark Fulfilled
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDonationDone(req);
                          }}
                          className="bg-green-600 text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-green-200 hover:bg-green-700"
                        >
                          I Donated
                        </button>
                      )}
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <CheckCircle className="w-16 h-16 text-green-100 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No urgent requests matching your profile right now.</p>
        </div>
      )}

      <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-2">Donor Status</h3>
          <p className="text-slate-400 text-sm mb-4">You are currently listed as an active donor in <span className="text-white font-bold">{profile?.district}</span>.</p>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Active & Visible
          </div>
        </div>
        <Droplets className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-5 rotate-12" />
      </div>
    </motion.div>
  );
}

function NavButton({ active, icon, label, onClick, badge }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 outline-none select-none transition-all duration-300 py-1 px-3 group flex-1"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative">
        <motion.div
          animate={active ? { scale: [0.95, 1.12, 1], y: -2 } : { scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`p-1.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
            active 
              ? 'bg-red-50 text-red-600 shadow-inner' 
              : 'text-slate-400 group-hover:text-red-500 group-hover:bg-red-50/30'
          }`}
        >
          {React.cloneElement(icon as React.ReactElement, { 
            className: `w-5.5 h-5.5 stroke-[2.2] transition-colors ${active ? 'text-red-600' : 'text-slate-500 group-hover:text-red-500'}` 
          })}
        </motion.div>
        
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-gradient-to-r from-red-600 to-rose-600 text-[8px] font-black text-white rounded-full flex items-center justify-center border border-white shadow-sm ring-2 ring-red-105 animate-pulse">
            {badge}
          </span>
        )}
      </div>

      <span className={`text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 ${
        active ? 'text-red-600 font-extrabold translate-y-0.5 scale-100' : 'text-slate-400 scale-95 hover:text-slate-705'
      }`}>
        {label}
      </span>

      {active && (
        <motion.div 
          layoutId="activeBottomTabDot"
          className="absolute -bottom-1 w-1.5 h-1.5 bg-red-600 rounded-full shadow-sm shadow-red-500"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        />
      )}
    </button>
  );
}

function ChatList({ chats, currentUser, users, onChatSelect }: { chats: Chat[], currentUser: FirebaseUser, users: UserProfile[], onChatSelect: (c: Chat) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const otherUserId = chat.participants.find(p => p !== currentUser.uid);
      const otherUser = users.find(u => u.uid === otherUserId);
      const displayName = otherUser?.displayName || 'System User';
      return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [chats, searchTerm, users, currentUser.uid]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h2>
        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase">
          {chats.reduce((acc, c) => acc + (c.unreadCount ? c.unreadCount[currentUser.uid] || 0 : 0), 0)} New
        </div>
      </div>

      <div className="relative px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input 
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all shadow-sm"
        />
      </div>

      {filteredChats.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 italic text-slate-400 shadow-sm mx-2">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p>{searchTerm ? 'No results for your search.' : 'No conversations yet. Chat with donors to coordinate blood donation!'}</p>
        </div>
      ) : (
        <div className="space-y-3 px-2">
          {filteredChats.map(chat => {
            const otherUserId = chat.participants.find(p => p !== currentUser.uid);
            const otherUser = users.find(u => u.uid === otherUserId);
            const unread = chat.unreadCount ? chat.unreadCount[currentUser.uid] || 0 : 0;

            return (
              <motion.div
                layout
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.8)' }}
                className={`bg-white rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all relative border-b border-slate-50 last:border-0`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'User')}&background=random&bold=true`} 
                    className={`w-14 h-14 rounded-full object-cover border-2 transition-all ${unread > 0 ? 'border-red-500 scale-105' : 'border-transparent'}`}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                  />
                  {isOnline(otherUser) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`font-bold text-slate-900 truncate text-[15px] flex items-center gap-1 ${unread > 0 ? 'text-red-700' : ''}`}>
                      {otherUser?.displayName || 'System User'}
                      {otherUser?.isVerified && <BadgeCheck className="w-4 h-4 text-white fill-blue-500" />}
                    </h3>
                    <span className={`text-[10px] font-bold ${unread > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {otherUserId && chat.typing?.[otherUserId] ? (
                      <p className="text-[13px] text-red-500 font-bold animate-pulse truncate flex-1">
                        typing...
                      </p>
                    ) : (
                      <p className={`text-[13px] truncate flex-1 ${unread > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                        {chat.lastMessage || 'Start a conversation now!'}
                      </p>
                    )}
                    {unread === 0 && chat.lastMessageAt && (
                      <CheckCheck className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const isOnline = (user?: UserProfile) => {
  if (!user || !user.lastSeen) return false;
  const lastSeen = user.lastSeen.toMillis();
  return Date.now() - lastSeen < 180000; // 3 minutes
};

function CallOverlay({ 
  call, 
  onEnd, 
  onAccept, 
  isIncoming,
  addToast
}: { 
  call: VoiceCall, 
  onEnd: () => void, 
  onAccept: () => void,
  isIncoming: boolean,
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void,
  key?: any
}) {
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isLoudspeaker, setIsLoudspeaker] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [iceState, setIceState] = useState<RTCIceConnectionState>('new');
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const connected = call.status === 'connected';

  const peerPhoto = isIncoming ? call.callerPhoto : call.receiverPhoto;
  const peerName = isIncoming ? call.callerName : call.receiverName;
  const avatarUrl = peerPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName)}&background=f1f5f9&color=64748b&bold=true`;

  const servers = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.l.google.com:19305'] },
      { urls: ['stun:global.stun.twilio.com:3478'] },
      { urls: ['stun:stun.relay.metered.ca:443'] }
    ],
    iceCandidatePoolSize: 5,
  };

  const [shouldConnect, setShouldConnect] = useState(!isIncoming || connected);
  const hasSetupRef = useRef(false);

  useEffect(() => {
    if (connected && !shouldConnect) {
      setShouldConnect(true);
    }
  }, [connected, shouldConnect]);

  useEffect(() => {
    if (!shouldConnect || hasSetupRef.current) return;
    
    let activeCleanup: (() => void) | null = null;
    let isCancelled = false;

    hasSetupRef.current = true;
    setupWebRTC().then(cleanup => {
      if (isCancelled) {
        cleanup();
      } else {
        activeCleanup = cleanup;
      }
    });

    return () => {
      isCancelled = true;
      if (activeCleanup) activeCleanup();
      cleanupWebRTC();
    };
  }, [shouldConnect]);

  useEffect(() => {
    let interval: any;
    if (connected) {
      const startTime = call.connectedAt ? (call.connectedAt instanceof Timestamp ? call.connectedAt.toMillis() : Date.now()) : Date.now();
      const updateDuration = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        setDuration(Math.max(0, diff));
      };
      
      updateDuration();
      interval = setInterval(updateDuration, 1000);
      
      if (pcRef.current && (pcRef.current.iceConnectionState === 'connected' || pcRef.current.iceConnectionState === 'completed' || pcRef.current.connectionState === 'connected')) {
        setIsConnecting(false);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connected, iceState, call.connectedAt]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      console.log("Attaching remote stream to audio element. Tracks:", remoteStream.getAudioTracks().length);
      const audio = remoteAudioRef.current;
      audio.srcObject = remoteStream;
      
      const playAudio = async () => {
        try {
          audio.muted = false;
          audio.volume = 1.0;
          await audio.play();
          console.log("Remote audio playing successfully");
        } catch (e) {
          console.error("Auto-play failed, will try on next interaction", e);
          const handleInteraction = () => {
            audio.play().then(() => {
              console.log("Remote audio started via interaction");
              window.removeEventListener('click', handleInteraction);
              window.removeEventListener('touchstart', handleInteraction);
            }).catch(pErr => console.error("Interaction play failed", pErr));
          };
          window.addEventListener('click', handleInteraction);
          window.addEventListener('touchstart', handleInteraction);
        }
      };

      // Listen for loadedmetadata to ensure play() is called when ready
      const onLoadedMetadata = () => {
        playAudio();
      };
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      playAudio(); // Also try immediately
      
      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
    }
  }, [remoteStream]);

  const updateAudioOutput = async () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = 1.0;
      // Note: switching between earpiece and speaker on mobile web is highly browser-dependent.
      // We ensure the volume is maxed for 'Speaker' mode.
    }
  };

  useEffect(() => {
    updateAudioOutput();
  }, [isLoudspeaker]);

  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    candidateQueue.current = [];
  };

  const setupWebRTC = async () => {
    console.log("Setting up WebRTC connection... isIncoming:", isIncoming);
    const pc = new RTCPeerConnection(servers);
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state change:", pc.iceConnectionState);
      setIceState(pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.warn("ICE connection failed, attempting restart...");
        try { pc.restartIce(); } catch (e) { console.error("ICE restart failed", e); }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state change:", pc.connectionState);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed') {
        addToast("Connection Error", "Voice connection failed. Retrying...", "error");
        pc.restartIce();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", pc.iceGatheringState);
    };

    pc.onsignalingstatechange = () => {
      console.log("Signaling state:", pc.signalingState);
    };

    // Removed early setRemoteStream(new MediaStream()) to prevent premature attachment
    
    try {
      // Use standard getUserMedia first
      console.log("Requesting microphone access...");
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } 
      });
      
      if (pcRef.current !== pc) {
        localStream.getTracks().forEach(t => t.stop());
        return () => {};
      }
      localStreamRef.current = localStream;
      
      // Add transceiver and/or tracks
      const localTrack = localStream.getAudioTracks()[0];
      if (localTrack) {
        console.log("Adding local track to PC:", localTrack.id);
        pc.addTrack(localTrack, localStream);
      } else {
        // Fallback transceiver if no track found yet (unlikely)
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }
    } catch (e) {
      console.error("Microphone access failed:", e);
      addToast("Mic Error", "Permission denied or mic busy. Voice transfer may not work.", "error");
      // Still allow receiving audio if possible
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (pcRef.current === pc && event.track.kind === 'audio') {
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        console.log("Setting remote stream - Tracks:", stream.getAudioTracks().length);
        setRemoteStream(stream);
        
        // Explicitly enable remote tracks
        stream.getAudioTracks().forEach(t => {
          t.enabled = true;
          console.log("Remote track enabled:", t.id);
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && pcRef.current === pc) {
        const candidatesPath = isIncoming ? 'receiverCandidates' : 'callerCandidates';
        addDoc(collection(db, 'calls', call.id, candidatesPath), event.candidate.toJSON()).catch(e => {
          console.error("Error adding candidate", e);
        });
      }
    };

    const peerCandidatesPath = isIncoming ? 'callerCandidates' : 'receiverCandidates';
    const unsubCandidates = onSnapshot(collection(db, 'calls', call.id, peerCandidatesPath), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' && pcRef.current === pc) {
          const candidateData = change.doc.data();
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.error("addIceCandidate error", e);
            }
          } else {
            candidateQueue.current.push(candidateData);
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, `calls/${call.id}/${peerCandidatesPath}`));

    const processQueue = async () => {
      if (!pc.remoteDescription || !pc.remoteDescription.type) return;
      console.log("Processing ICE candidate queue, size:", candidateQueue.current.length);
      while (candidateQueue.current.length > 0) {
        const cand = candidateQueue.current.shift();
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error("Delayed addIceCandidate error", e);
          }
        }
      }
    };

    let unsubCall: () => void = () => {};
    let signalingInProgress = false;

    try {
      if (!isIncoming) {
        if (pcRef.current !== pc) {
          unsubCandidates();
          return () => {};
        }
        const offerDescription = await pc.createOffer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offerDescription);
        await updateDoc(doc(db, 'calls', call.id), { 
          offer: { sdp: offerDescription.sdp, type: offerDescription.type } 
        });

        unsubCall = onSnapshot(doc(db, 'calls', call.id), async (snapshot) => {
          const data = snapshot.data();
        if (data?.answer && pcRef.current === pc && pc.signalingState === 'have-local-offer' && !signalingInProgress) {
          try {
            signalingInProgress = true;
            console.log("Caller: Setting remote description (answer)...");
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await processQueue();
          } catch (e) {
            console.error("setRemoteDescription answer error", e);
          } finally {
            signalingInProgress = false;
          }
        }
        }, (error) => handleFirestoreError(error, OperationType.GET, `calls/${call.id}`));
      } else {
        // Receiver waits for offer
        unsubCall = onSnapshot(doc(db, 'calls', call.id), async (snapshot) => {
          const data = snapshot.data();
        if (data?.offer && pcRef.current === pc && pc.signalingState === 'stable' && !signalingInProgress) {
          try {
            signalingInProgress = true;
            console.log("Receiver: Setting remote description (offer)...");
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await processQueue();
            if (pcRef.current !== pc) return;
            
            console.log("Receiver: Creating answer...");
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            
            await updateDoc(doc(db, 'calls', call.id), { 
              answer: { sdp: answerDescription.sdp, type: answerDescription.type } 
            });
            console.log("Receiver: Answer sent.");
          } catch (e) {
            console.error("Receiver signaling error:", e);
          } finally {
            signalingInProgress = false;
          }
        }
        }, (error) => handleFirestoreError(error, OperationType.GET, `calls/${call.id}`));
      }

      return () => {
        unsubCandidates();
        unsubCall();
      };
    } catch (e) {
      console.error("Signaling error:", e);
      unsubCandidates();
      unsubCall();
      return () => {};
    }
  };

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950 overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay playsInline className="absolute opacity-0 pointer-events-none" />
      
      <div className="absolute inset-0 z-0 select-none">
        <img 
          src={avatarUrl}
          className="w-full h-full object-cover blur-3xl opacity-30 scale-110"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center px-8"
      >
        <div className="relative mb-12">
          {!connected && (
            <>
              <motion.div 
                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white/20 rounded-full"
              />
              <motion.div 
                animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute inset-0 bg-white/10 rounded-full"
              />
            </>
          )}

          <div className="relative w-40 h-40 rounded-[60px] overflow-hidden shadow-2xl border-4 border-white/10 p-1 bg-slate-900">
            <img 
              src={avatarUrl}
              className="w-full h-full object-cover rounded-[54px]"
              alt="Avatar"
            />
          </div>
          
          {connected && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(34,197,94,0.5)] border-2 border-slate-950"
            >
              Live
            </motion.div>
          )}
        </div>

        <h2 className="text-3xl font-black text-white mb-2 text-center tracking-tight">
          {peerName}
        </h2>
        
        <div className="mb-20 flex flex-col items-center">
            {iceState === 'failed' && (
              <button 
                onClick={() => {
                  pcRef.current?.restartIce();
                  addToast("ICE Restart", "Attempting to reconnect...", "info");
                }}
                className="mb-6 px-6 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              >
                Reconnect Voice
              </button>
            )}
            {connected ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <p className="text-white text-5xl font-black mb-3 tracking-tighter tabular-nums">
                  {formatDuration(duration)}
                </p>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                  <div className={`w-1.5 h-1.5 rounded-full ${iceState === 'connected' || iceState === 'completed' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-bounce'}`} />
                  <span className={`${iceState === 'connected' || iceState === 'completed' ? 'text-green-500' : 'text-yellow-500'} font-black text-[9px] uppercase tracking-widest`}>
                    {iceState === 'connected' || iceState === 'completed' ? 'Secure Connection' : 'Optimizing...'}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.3em] h-4">
                  {connected ? (
                    iceState === 'failed' || connectionState === 'failed' ? 'Connection Failed' :
                    iceState === 'disconnected' || connectionState === 'disconnected' ? 'Lost Connection' :
                    connectionState === 'connecting' ? 'Connecting Audio...' :
                    'Establishing...'
                  ) : (
                    isIncoming ? 'Incoming Call' : 'Ringing...'
                  )}
                </p>
                {isConnecting && connected && (
                  <motion.div 
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-0.5 bg-blue-500 mt-2 rounded-full overflow-hidden w-24 mx-auto"
                  />
                )}
              </div>
            )}
        </div>

        <div className="grid grid-cols-3 gap-8 w-full max-w-[280px]">
          {!connected && isIncoming ? (
            <div className="col-span-3 flex justify-around items-center">
              <button 
                onClick={onEnd}
                className="w-20 h-20 bg-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition-all hover:bg-red-500/20 hover:text-red-500"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <button 
                onClick={() => {
                  onAccept();
                  setTimeout(() => {
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.play().catch(() => {});
                    }
                  }, 500);
                }}
                className="w-24 h-24 bg-green-500 text-white rounded-[40px] flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)] active:scale-95 transition-all outline-none hover:bg-green-600"
              >
                <PhoneCall className="w-10 h-10 fill-current" />
              </button>
            </div>
          ) : (
             <>
               <div className="flex flex-col items-center gap-3">
                 <button 
                   onClick={() => setMuted(!muted)}
                   className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${muted ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,44,44,0.3)]' : 'bg-white/10 text-white border border-white/5'}`}
                 >
                   {muted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                 </button>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Mute</span>
               </div>
               
               <div className="flex flex-col items-center gap-3">
                 <button 
                   onClick={onEnd}
                   className="w-20 h-20 bg-red-600 text-white rounded-[32px] flex items-center justify-center shadow-2xl active:scale-95 transition-all hover:bg-red-700 hover:rotate-12"
                 >
                   <PhoneOff className="w-9 h-9 fill-current" />
                 </button>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">End</span>
               </div>

               <div className="flex flex-col items-center gap-3">
                 <button 
                   onClick={() => setIsLoudspeaker(!isLoudspeaker)}
                   className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${isLoudspeaker ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-white/10 text-white border border-white/5'}`}
                 >
                   {isLoudspeaker ? <Volume2 className="w-7 h-7" /> : <VolumeX className="w-7 h-7" />}
                 </button>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Speaker</span>
               </div>
             </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ChatRoom({ chat, currentUser, users, onBack, onStartVoiceCall }: { chat: Chat, currentUser: FirebaseUser, users: UserProfile[], onBack: () => void, onStartVoiceCall: (uid: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [roomChat, setRoomChat] = useState<Chat>(chat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const otherUserId = chat.participants.find(p => p !== currentUser.uid);
  const otherUser = users.find(u => u.uid === otherUserId);
  const typingTimeoutRef = useRef<any>(null);

  // Listen to chat document updates (for typing indicators)
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'chats', chat.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setRoomChat({ id: docSnapshot.id, ...docSnapshot.data() } as Chat);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `chats/${chat.id}`));
    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    const q = query(
      collection(db, `chats/${chat.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(newMessages);
      
      // Mark incoming messages as read
      const unreadIncoming = newMessages.filter(m => m.senderId === otherUserId && !m.read);
      if (unreadIncoming.length > 0) {
        unreadIncoming.forEach((m) => {
          updateDoc(doc(db, `chats/${chat.id}/messages`, m.id), { read: true })
            .catch(err => console.error("Failed to mark message as read", err));
        });
      }

      if (chat.unreadCount && chat.unreadCount[currentUser.uid] > 0) {
        updateDoc(doc(db, 'chats', chat.id), {
          [`unreadCount.${currentUser.uid}`]: 0
        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.id}`));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `chats/${chat.id}/messages`));

    return () => unsubscribe();
  }, [chat.id, currentUser.uid, otherUserId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    // Set typing to true in Firestore
    if (text.length === 0) return;
    
    updateDoc(doc(db, 'chats', chat.id), {
      [`typing.${currentUser.uid}`]: true
    }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'chats', chat.id), {
        [`typing.${currentUser.uid}`]: false
      }).catch(() => {});
    }, 3000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, 'chats', chat.id), {
      [`typing.${currentUser.uid}`]: false
    }).catch(() => {});

    setSending(true);
    const messageText = text;
    setText('');

    try {
      await addDoc(collection(db, `chats/${chat.id}/messages`), {
        senderId: currentUser.uid,
        text: messageText,
        createdAt: serverTimestamp(),
        read: false
      });

      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chat.id}`);
    } finally {
      setSending(false);
    }
  };

  const isOtherTyping = otherUserId ? roomChat.typing?.[otherUserId] : false;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] antialiased overflow-hidden">
      {/* Room Header */}
      <div className="bg-white/90 backdrop-blur-xl p-4 border-b border-slate-100 flex items-center gap-3 shadow-sm z-30 shrink-0">
        <button 
          onClick={onBack} 
          className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-95"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <img 
                src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'U')}&background=random&bold=true`} 
                className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-md"
                alt="Avatar"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${isOtherTyping ? 'bg-red-500 animate-pulse' : (isOnline(otherUser) ? 'bg-green-500' : 'bg-slate-300')}`}></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-900 leading-tight text-[16px] truncate flex items-center gap-2">
                {otherUser?.displayName || 'Chat User'}
                {otherUser?.bloodGroup && (
                  <span className="text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded-md shadow-sm">
                    {otherUser.bloodGroup}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isOtherTyping ? (
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-widest animate-pulse">Typing...</p>
                ) : (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline(otherUser) ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                      {isOnline(otherUser) ? 'Online' : 'Offline'} • {otherUser?.thana || otherUser?.district || 'Unavailable'}
                    </p>
                  </>
                )}
              </div>
            </div>
          <div className="flex items-center gap-1">
             <button 
               onClick={() => onStartVoiceCall(otherUserId!)}
               className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
               title="Voice Call"
             >
               <PhoneCall className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative custom-scrollbar bg-[#f8fafc]">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden"></div>
        
        <div className="max-w-4xl mx-auto space-y-4 relative z-10 pb-4">
          {messages.length === 0 && !isOtherTyping && (
            <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-300 opacity-60">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 transform rotate-12">
                <MessageSquare className="w-10 h-10 text-red-100" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Security Encrypted</p>
              <p className="text-[10px] text-slate-300 mt-2 font-medium">Start the conversation with {otherUser?.displayName}</p>
            </div>
          )}

          {messages.map((m, idx) => {
            const isMe = m.senderId === currentUser.uid;
            const showTime = idx === 0 || (m.createdAt?.seconds - messages[idx-1]?.createdAt?.seconds > 600);
            const isGrouped = !showTime && messages[idx-1]?.senderId === m.senderId;
            
            if (m.type === 'call') {
              return (
                <React.Fragment key={m.id}>
                  {showTime && (
                    <div className="flex justify-center my-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-200/50 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-300/20">
                        {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Connecting...'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-center my-4">
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      m.text.includes("Missed") || m.text.includes("Rejected") || m.text.includes("Busy")
                        ? 'bg-red-50 text-red-500' 
                        : 'bg-green-50 text-green-500'
                      }`}>
                        {m.text.includes("Missed") || m.text.includes("Rejected") || m.text.includes("Busy") ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-600">{m.text}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {!isMe && (m.text.includes("Missed") || m.text.includes("Rejected")) && (
                            <button 
                              onClick={() => otherUserId && onStartVoiceCall(otherUserId)}
                              className="text-[9px] text-red-600 font-black uppercase tracking-widest hover:underline"
                            >
                              Call Back
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={m.id}>
                {showTime && (
                  <div className="flex justify-center my-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-200/50 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-300/20">
                      {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Connecting...'}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-1 duration-300 ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                  <div className={`max-w-[80%] relative ${isMe ? 'items-end' : 'items-start flex flex-col'}`}>
                    <div className={`relative px-3.5 py-2 text-[14.5px] shadow-sm transition-all ${
                      isMe 
                        ? 'bg-red-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm'
                    } ${isGrouped ? (isMe ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''}`}>
                      <p className="leading-snug break-words whitespace-pre-wrap">{m.text}</p>
                      
                      <div className={`flex items-center gap-1 justify-end mt-1 opacity-60 leading-none`}>
                        <span className="text-[9px] font-medium">
                          {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                        </span>
                        {isMe && (
                          m.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          
          {isOtherTyping && (
            <div className="flex justify-start mt-2">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 pb-safe z-30 shrink-0">
        <form onSubmit={sendMessage} className="flex gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1 relative flex items-center group">
            <textarea 
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleTyping();
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Start typing..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 rounded-2xl md:rounded-[2rem] px-5 py-3.5 transition-all outline-none text-[15px] resize-none max-h-32 shadow-sm"
            />
            <div className="absolute right-4 flex items-center gap-2 pointer-events-none opacity-40">
               <Smile className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <button 
            type="submit"
            disabled={!text.trim() || sending}
            className="group relative bg-slate-900 text-white w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-[1.5rem] shadow-xl shadow-slate-200 hover:bg-red-600 hover:shadow-red-200 transition-all active:scale-95 disabled:grayscale disabled:opacity-20 flex items-center justify-center shrink-0 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Send className={`w-5 h-5 md:w-6 md:h-6 transition-transform duration-300 ${text.trim() ? 'translate-x-0.5 -translate-y-0.5 scale-110' : ''}`} />
          </button>
        </form>
      </div>
    </div>
  );
}

interface PostCardProps {
  post: CommunityPost;
  user: FirebaseUser | null;
  profile: UserProfile | null;
  allUsers: UserProfile[];
  onViewProfile?: (uid: string) => void;
  askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>;
  addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void;
  notifyAdmins: (title: string, body: string, link?: string) => Promise<void>;
}

function PostCard({ post, user, profile, allUsers, onViewProfile, askConfirm, addToast, notifyAdmins }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const authorProfile = allUsers.find(u => u.uid === post.authorUid);
  const handleReaction = async (type: 'likes' | 'dislikes') => {
    if (!user) {
      addToast("Auth Required", "Please login to react to posts.", 'info');
      return;
    }
    const currentList = post[type] || [];
    const otherType = type === 'likes' ? 'dislikes' : 'likes';
    const otherList = post[otherType] || [];
    
    let newList = [...currentList];
    let newOtherList = [...otherList];

    if (newList.includes(user.uid)) {
      newList = newList.filter(id => id !== user.uid);
    } else {
      newList.push(user.uid);
      newOtherList = newOtherList.filter(id => id !== user.uid);
    }

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        [type]: newList,
        [otherType]: newOtherList
      });
    } catch (e) {
      console.error("Reaction failed", e);
      addToast("Reaction Failed", "Could not process your reaction. Please try again.", 'error');
    }
  };

  const formattedDate = post.createdAt?.toDate ? 
    post.createdAt.toDate().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Just now';

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const reportPost = async () => {
    if (!reportReason.trim()) return;
    setIsSubmittingReport(true);

    try {
      // 1. Create the report
      await addDoc(collection(db, 'reports'), {
        targetId: post.id,
        targetType: 'post',
        targetContent: post.content,
        reportedBy: user?.uid || 'guest',
        reportedByName: user?.displayName || 'Guest User',
        reason: reportReason,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      notifyAdmins("Content Reported", `A post by ${post.authorName} has been reported for: ${reportReason}`, 'admin');
      
      // 2. Increment reportCount on the post
      await updateDoc(doc(db, 'posts', post.id), {
        reportCount: increment(1)
      });
      
      addToast("Report Sent", "Your report has been received and will be reviewed by admins.", 'success');
      setShowReportForm(false);
      setReportReason('');
    } catch (e) {
      console.error("Report failed", e);
      addToast("Report Failed", "Something went wrong. Please try again.", 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const deletePost = async () => {
    if (await askConfirm('Delete Post?', "Permanently delete this post? This cannot be undone.", 'Delete Post')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
        addToast("Post Deleted", "Your post has been successfully removed.", 'success');
      } catch (e) {
        console.error("Delete failed", e);
        addToast("Delete Failed", "Failed to delete the post. Please try again.", 'error');
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = `https://bloodlink.bd/story/${post.id}`;

    const shareData = {
      title: 'BloodLink Story',
      text: post.content ? (post.content.length > 100 ? `${post.content.substring(0, 100)}...` : post.content) : '',
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        addToast("Story Shared", "Story shared successfully!", "success");
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboardAndNotify(shareUrl);
        }
      }
    } else {
      copyToClipboardAndNotify(shareUrl);
    }
  };

  const copyToClipboardAndNotify = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      addToast("Link Copied!", "Share link has been copied to clipboard.", "success");
    }).catch(() => {
      addToast("Failed to Copy", "Please copy the URL manually: " + url, "error");
    });
  };

  const isAdmin = profile?.role === 'admin';
  const isAuthor = user?.uid === post.authorUid;
  const isNew = post.createdAt && (Date.now() - post.createdAt.toMillis()) < 600000;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow mb-4 relative overflow-hidden"
    >
      {isNew && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-2xl uppercase tracking-widest animate-pulse shadow-sm shadow-red-200">
            New
          </div>
        </div>
      )}
      <div className="flex gap-3 items-start mb-3">
        <button onClick={() => onViewProfile?.(post.authorUid)} className="hover:opacity-80 transition-opacity">
          <img 
            src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`} 
            alt={post.authorName} 
            className="w-10 h-10 rounded-full border border-slate-100"
          />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button onClick={() => onViewProfile?.(post.authorUid)} className="hover:text-red-600 transition-colors min-w-0">
              <h4 className="font-bold text-slate-900 leading-none flex items-center gap-1 truncate">
                {post.authorName}
                {authorProfile?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-white fill-blue-500 shrink-0" />}
              </h4>
            </button>
            {post.authorBloodGroup && (
              <span className="bg-red-50 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-red-100 shrink-0">
                {post.authorBloodGroup}
              </span>
            )}
            {!isAuthor && user && (
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!user) return;
                  const isFollowing = authorProfile?.followers?.includes(user.uid);
                  
                  try {
                    await updateDoc(doc(db, 'users', post.authorUid), {
                      followers: isFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid)
                    });
                    addToast(isFollowing ? "Unfollowed" : "Following", `You are ${isFollowing ? 'no longer' : 'now'} following ${post.authorName}.`, isFollowing ? 'info' : 'success');
                  } catch (err) {
                    console.error("Follow failed:", err);
                    addToast("Action Failed", "Could not process following action.", 'error');
                  }
                }}
                className={`ml-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${authorProfile?.followers?.includes(user.uid) ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 hover:scale-105 active:scale-95'}`}
              >
                {authorProfile?.followers?.includes(user.uid) ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {formattedDate}
          </p>
        </div>
      </div>
      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">
        {(() => {
          const words = (post.content || '').trim().split(/\s+/).filter(Boolean);
          const isLongStory = words.length > 60;
          if (isLongStory && !expanded) {
            return (
              <>
                {words.slice(0, 60).join(' ')}...
                <button 
                  onClick={() => setExpanded(true)} 
                  className="text-red-600 hover:text-red-700 font-bold ml-1.5 focus:outline-none hover:underline cursor-pointer"
                >
                  Read More
                </button>
              </>
            );
          }
          return (
            <>
              {post.content}
              {isLongStory && (
                <button 
                  onClick={() => setExpanded(false)} 
                  className="text-red-600 hover:text-red-700 font-bold ml-1.5 focus:outline-none hover:underline cursor-pointer"
                >
                  Read Less
                </button>
              )}
            </>
          );
        })()}
      </p>

      {post.imageUrl && (
        <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
          <img 
            src={post.imageUrl} 
            alt="Post attachment" 
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
        <button 
          onClick={() => handleReaction('likes')}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${user && post.likes?.includes(user.uid) ? 'text-red-500' : 'text-slate-400'}`}
        >
          <Heart className={`w-4 h-4 ${user && post.likes?.includes(user.uid) ? 'fill-current' : ''}`} />
          <span>{post.likes?.length || 0}</span>
        </button>
        <button 
          onClick={() => handleReaction('dislikes')}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${user && post.dislikes?.includes(user.uid) ? 'text-blue-500' : 'text-slate-400'}`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span>{post.dislikes?.length || 0}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${showComments ? 'text-slate-900' : 'text-slate-400'}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount || 0}</span>
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
          title="Share Story"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
        <button 
          onClick={() => setShowReportForm(!showReportForm)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ml-auto ${showReportForm ? 'text-red-600' : 'text-slate-400 hover:text-red-500'}`}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Report</span>
        </button>
        {(isAuthor || isAdmin) && (
          <button 
            onClick={deletePost}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors ml-2 ${isAdmin && !isAuthor ? 'text-orange-400 hover:text-orange-600' : 'text-slate-400 hover:text-red-600'}`}
          >
            <Trash className="w-4 h-4" />
            <span className="hidden sm:inline">{isAdmin && !isAuthor ? 'Admin Delete' : 'Delete'}</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showReportForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-red-50 overflow-hidden"
          >
            <div className="bg-red-50 p-4 rounded-2xl">
              <h5 className="text-xs font-black text-red-700 uppercase tracking-widest mb-2">Report Post</h5>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Why are you reporting this content?"
                className="w-full bg-white border-transparent rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-red-500 mb-3"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  disabled={isSubmittingReport || !reportReason.trim()}
                  onClick={reportPost}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Sending...' : 'Submit Report'}
                </button>
                <button
                  onClick={() => setShowReportForm(false)}
                  className="flex-1 bg-white text-slate-500 font-bold py-2 rounded-xl text-xs border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && (
          <CommentSection post={post} user={user} profile={profile} allUsers={allUsers} onViewProfile={onViewProfile} askConfirm={askConfirm} addToast={addToast} notifyAdmins={notifyAdmins} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CommentSection({ post, user, profile, allUsers, onViewProfile, askConfirm, addToast, notifyAdmins }: { 
  post: CommunityPost, 
  user: FirebaseUser | null, 
  profile: UserProfile | null, 
  allUsers: UserProfile[],
  onViewProfile?: (uid: string) => void,
  askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>,
  addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void,
  notifyAdmins: (title: string, body: string, link?: string) => Promise<void>
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PostComment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${post.id}/comments`);
    });
    return unsubscribe;
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        postId: post.id,
        authorUid: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL,
        content: newComment.trim(),
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: (post.commentCount || 0) + 1
      });
      setNewComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}/comments`);
      addToast("Comment Failed", "Could not post your comment. Please try again.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-4 pt-4 border-t border-slate-50 overflow-hidden"
    >
      <div className="space-y-4 mb-4">
        {comments.map(c => (
          <CommentItem key={c.id} comment={c} currentUser={user} postId={post.id} profile={profile} allUsers={allUsers} onViewProfile={onViewProfile} askConfirm={askConfirm} addToast={addToast} notifyAdmins={notifyAdmins} />
        ))}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-1 focus:ring-red-500"
          />
          <button 
            disabled={!newComment.trim() || submitting}
            className="p-2 text-red-600 disabled:opacity-30 disabled:grayscale transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      )}
    </motion.div>
  );
}

interface CommentItemProps {
  comment: PostComment;
  currentUser: FirebaseUser | null;
  postId: string;
  profile: UserProfile | null;
  allUsers: UserProfile[];
  onViewProfile?: (uid: string) => void;
  askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>;
  addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void;
  notifyAdmins: (title: string, body: string, link?: string) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUser, postId, profile, allUsers, onViewProfile, askConfirm, addToast, notifyAdmins }) => {
  const [replies, setReplies] = useState<PostComment[]>([]);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authorProfile = allUsers.find(u => u.uid === comment.authorUid);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments', comment.id, 'replies'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReplies(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PostComment)));
    });
    return unsubscribe;
  }, [postId, comment.id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments', comment.id, 'replies'), {
        postId,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorPhoto: currentUser.photoURL,
        content: replyText.trim(),
        createdAt: serverTimestamp()
      });
      setReplyText('');
      setShowReplyForm(false);
    } catch (err) {
      console.error(err);
      addToast("Reply Failed", "Could not send your reply. Please try again.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const reportComment = async () => {
    if (!reportReason.trim() || reporting) return;
    setReporting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        targetId: comment.id,
        targetType: 'comment',
        targetContent: comment.content,
        reportedBy: currentUser?.uid || 'guest',
        reportedByName: currentUser?.displayName || 'Guest User',
        reason: reportReason,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      notifyAdmins("Comment Reported", `A comment by ${comment.authorName} has been reported for: ${reportReason}`, 'admin');

      addToast("Report Sent", "Comment report sent to admins. Thank you.", 'success');
      setShowReportForm(false);
      setReportReason('');
    } catch (e) {
      console.error("Comment report failed:", e);
      addToast("Report Failed", "Failed to send report. Please try again.", 'error');
    } finally {
      setReporting(false);
    }
  };
  const deleteComment = async () => {
    if (await askConfirm('Delete Comment?', "Permanently delete this comment?", 'Delete Comment')) {
      try {
        await deleteDoc(doc(db, 'posts', postId, 'comments', comment.id));
        addToast("Comment Deleted", "Your comment has been removed.", 'success');
      } catch (e) {
        console.error("Delete comment failed", e);
        addToast("Delete Failed", "Failed to delete the comment. Please try again.", 'error');
      }
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isAuthor = currentUser?.uid === comment.authorUid;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <button onClick={() => onViewProfile?.(comment.authorUid)} className="hover:opacity-80 transition-opacity">
          <img 
            src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}&background=random`} 
            alt={comment.authorName} 
            className="w-7 h-7 rounded-full"
          />
        </button>
        <div className="flex-1 bg-slate-50 rounded-2xl p-3 relative">
          <button onClick={() => onViewProfile?.(comment.authorUid)} className="hover:text-red-600 transition-colors">
            <h5 className="text-[11px] font-black text-slate-900 leading-none mb-1 text-left flex items-center gap-1">
              {comment.authorName}
              {authorProfile?.isVerified && <BadgeCheck className="w-3 h-3 text-white fill-blue-500" />}
            </h5>
          </button>
          <p className="text-xs text-slate-700 leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              Reply
            </button>
            <button 
              onClick={() => setShowReportForm(!showReportForm)}
              className={`text-[10px] font-bold transition-colors flex items-center gap-1 ${showReportForm ? 'text-red-500' : 'text-slate-300 hover:text-red-500'}`}
            >
              Report
            </button>
            {(isAuthor || isAdmin) && (
              <button 
                onClick={deleteComment}
                className="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReportForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-9 p-3 bg-red-50 rounded-2xl mt-1 overflow-hidden"
          >
            <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">Report Comment</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Report reason..."
              className="w-full bg-white border-transparent rounded-lg px-3 py-1.5 text-[11px] mb-2 focus:ring-1 focus:ring-red-500"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                disabled={reporting || !reportReason.trim()}
                onClick={reportComment}
                className="flex-1 bg-red-600 text-white font-bold py-1.5 rounded-lg text-[9px] uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {reporting ? 'Sending...' : 'Report'}
              </button>
              <button
                onClick={() => setShowReportForm(false)}
                className="flex-1 bg-white text-slate-500 font-bold py-1.5 rounded-lg text-[9px] uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {replies.length > 0 && (
        <div className="ml-9 space-y-2 border-l-2 border-slate-100 pl-3">
          {replies.map(r => (
            <div key={r.id} className="flex gap-2 items-start">
              <CornerDownRight className="w-3 h-3 text-slate-200 mt-1 shrink-0" />
              <div className="flex-1 bg-slate-50 rounded-xl p-2">
                <button onClick={() => onViewProfile?.(r.authorUid)} className="hover:text-red-600 transition-colors">
                  <h5 className="text-[10px] font-black text-slate-900 leading-none mb-1 text-left flex items-center gap-1">
                    {r.authorName}
                    {allUsers.find(u => u.uid === r.authorUid)?.isVerified && <BadgeCheck className="w-3 h-3 text-white fill-blue-500" />}
                  </h5>
                </button>
                <p className="text-[11px] text-slate-700 leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showReplyForm && currentUser && (
        <form onSubmit={handleReply} className="ml-9 flex gap-1 animate-in slide-in-from-left-2 duration-300">
          <input 
            autoFocus
            type="text"
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 bg-slate-100 border-none rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500"
          />
          <button 
            type="submit"
            disabled={!replyText.trim() || submitting}
            className="text-red-600 p-1 disabled:opacity-30"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};


function PostForm({ onCancel, onSuccess, user, profile, notifyAdmins }: { onCancel: () => void, onSuccess: () => void, user: FirebaseUser, profile: UserProfile | null, notifyAdmins: (title: string, body: string, link?: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const targetWidth = 1280;
              const targetHeight = 720;
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject('Canvas context not available');

              // Draw image to fit 1280x720 (center crop/cover)
              const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
              const x = (targetWidth - img.width * scale) / 2;
              const y = (targetHeight - img.height * scale) / 2;
              
              // Enable smoothing for better quality at lower size
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
              
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
          };
          reader.onerror = reject;
        });
        setImageUrl(compressedImage);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorUid: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        authorBloodGroup: profile?.bloodGroup || null,
        content: content.trim(),
        imageUrl: imageUrl,
        likes: [],
        dislikes: [],
        commentCount: 0,
        reportCount: 0,
        isHidden: false,
        createdAt: serverTimestamp()
      });

      const locationInfo = profile?.district ? ` from ${profile.district}` : '';
      notifyAdmins("New Community Post", `${user.displayName || 'A user'}${locationInfo} shared a new post: "${content.trim().substring(0, 50)}..."`, 'feed');

      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Share Post</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="file"
          hidden
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
        />

        <div>
          <textarea 
            required={!imageUrl}
            rows={4}
            placeholder="Share your experience, tips, or words of encouragement..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 resize-none"
          />
          
          {imageUrl && (
            <div className="mt-4 relative group rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 border-slate-100">
              <img 
                src={imageUrl} 
                alt="Upload preview" 
                className="w-full aspect-video object-cover rounded-2xl"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-4">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-[0.98] border border-slate-100"
            >
              <Camera className="w-4 h-4" />
              {imageUrl ? 'Change Photo' : 'Add a Photo to Post'}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-3 flex justify-between">
            <span>Keep it helpful for the community.</span>
            <span>{content.length}/2000</span>
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button 
            disabled={submitting || (!content.trim() && !imageUrl)}
            className="flex-[2] bg-red-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Share Now'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}


function UserProfileHistory({ donations, requests, currentUser, currentProfile, activeTab, posts, allUsers, onViewProfile, askConfirm, addToast, notifyAdmins, onDeleteRequest }: { donations: DonationRecord[], requests: BloodRequest[], currentUser: FirebaseUser | null, currentProfile: UserProfile | null, activeTab: 'posts' | 'donations' | 'requests', posts: CommunityPost[], allUsers: UserProfile[], onViewProfile?: (uid: string) => void, askConfirm: (title: string, message: string, confirmText?: string, type?: ConfirmConfig['type'], cancelText?: string) => Promise<boolean>, addToast: (title: string, body: string, type?: Toast['type'], requestId?: string) => void, notifyAdmins: (title: string, body: string, link?: string) => Promise<void>, onDeleteRequest: (id: string) => void }) {
  const [showAllDonations, setShowAllDonations] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      {/* Render selected active tab's history */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'posts' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Community Posts</span>
              </div>
              <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-orange-100 shrink-0">
                {posts.length} {posts.length === 1 ? 'Post' : 'Posts'} Shared
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
                <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic font-medium">No community posts yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {posts.map(post => (
                  <div key={post.id}>
                    <PostCard 
                      post={post} 
                      user={currentUser} 
                      profile={currentProfile} 
                      allUsers={allUsers}
                      onViewProfile={onViewProfile}
                      askConfirm={askConfirm}
                      addToast={addToast}
                      notifyAdmins={notifyAdmins}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'donations' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Donation Log</span>
              </div>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-red-100 shrink-0">
                {donations.length} {donations.length === 1 ? 'Life' : 'Lives'} Saved
              </span>
            </div>

            {donations.length === 0 ? (
              <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
                <Droplets className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic font-medium">No donation records yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {donations.slice(0, showAllDonations ? donations.length : 5).map(donation => (
                  <div key={donation.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-xl flex flex-col items-center justify-center border border-red-100 shrink-0">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Group</span>
                        <span className="text-sm font-black text-red-600">{donation.bloodGroup}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-tight">{donation.hospitalName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {donation.date?.toDate ? donation.date.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
                {donations.length > 5 && (
                  <button 
                    onClick={() => setShowAllDonations(!showAllDonations)}
                    className="w-full py-3 text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all"
                  >
                    {showAllDonations ? 'Show Less' : `Show All ${donations.length} Donations`}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Request Log</span>
              </div>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-100 shrink-0">
                {requests.length} {requests.length === 1 ? 'Request' : 'Requests'}
              </span>
            </div>

            {requests.length === 0 ? (
              <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
                <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 italic">No activity history found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.slice(0, showAllRequests ? requests.length : 5).map(req => (
                  <div 
                    key={req.id}
                    className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between group hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center bg-blue-50 px-3 py-2 rounded-2xl min-w-[60px]">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Needs</span>
                        <span className="text-sm font-black text-blue-600">{req.bloodGroup}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-tight">{req.hospital}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter ${
                        req.status === 'Fulfilled' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {req.status}
                      </span>
                      {(currentProfile?.role === 'admin' || currentUser?.uid === req.requesterUid) && (
                        <button 
                          onClick={() => onDeleteRequest(req.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {requests.length > 5 && (
                  <button 
                    onClick={() => setShowAllRequests(!showAllRequests)}
                    className="w-full py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-all"
                  >
                    {showAllRequests ? 'Show Less' : `Show All ${requests.length} Requests`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PublicProfileView({ uid, onBack, onMessage, currentUser, currentProfile, onDeleteRequest, onDonationDone, addToast, allUsers, askConfirm, notifyAdmins, onViewProfile }: { uid: string, onBack: () => void, onMessage: (uid: string) => void, currentUser: FirebaseUser | null, currentProfile: UserProfile | null, onDeleteRequest: (id: string) => void, onDonationDone: (req: BloodRequest) => void, addToast: (title: string, body: string, type: 'success' | 'error' | 'info') => void, allUsers: UserProfile[], askConfirm: any, notifyAdmins: any, onViewProfile: (uid: string) => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRequests, setUserRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<'posts' | 'donations' | 'requests'>('posts');
  const [showAllDonations, setShowAllDonations] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    let unsubscribeRequests: () => void;
    let unsubscribeDonations: () => void;
    let unsubscribePosts: () => void;

    const loadData = async () => {
      setLoading(true);
      
      // Load Profile
      const profileRef = doc(db, 'users', uid);
      unsubscribeProfile = onSnapshot(profileRef, (doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        }
      });

      // Load Requests (Need History)
      const requestsRef = collection(db, 'requests');
      const q = query(requestsRef, where('requesterUid', '==', uid), orderBy('createdAt', 'desc'));
      unsubscribeRequests = onSnapshot(q, (snapshot) => {
        setUserRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BloodRequest)));
      }, (err) => {
        console.error("Requests fetch failed:", err);
      });

      // Load Donations History
      const donationsRef = collection(db, 'users', uid, 'donations');
      const dq = query(donationsRef, orderBy('date', 'desc'));
      unsubscribeDonations = onSnapshot(dq, (snapshot) => {
        setDonations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DonationRecord)));
      }, (err) => {
        console.error("Donations fetch failed:", err);
      });

      // Load Posts
      const postsRef = collection(db, 'posts');
      const pq = query(postsRef, where('authorUid', '==', uid));
      unsubscribePosts = onSnapshot(pq, (snapshot) => {
        const postsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)) as CommunityPost[];
        postsList.sort((a, b) => {
          const tA = (a.createdAt as any)?.seconds || 0;
          const tB = (b.createdAt as any)?.seconds || 0;
          return tB - tA;
        });
        setUserPosts(postsList);
        setLoading(false);
      }, (err) => {
        console.error("Posts fetch failed:", err);
        setLoading(false);
      });
    };

    loadData();
    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeDonations) unsubscribeDonations();
      if (unsubscribePosts) unsubscribePosts();
    };
  }, [uid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Droplets className="w-12 h-12 text-red-500 animate-bounce" />
        <p className="text-slate-400 font-bold animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Profile not found.</p>
        <button onClick={onBack} className="mt-4 text-red-600 font-bold">Go Back</button>
      </div>
    );
  }

  const donationCount = profile.donationCount || 0;
  let rankLabel = "Committed Supporter";
  let rankColor = "bg-slate-50 text-slate-700 border-slate-100";

  if (donationCount >= 6) {
    rankLabel = "Legendary Guardian";
    rankColor = "bg-rose-50 border-rose-100 text-rose-700 ring-2 ring-rose-500/10";
  } else if (donationCount >= 3) {
    rankLabel = "Saving Champion";
    rankColor = "bg-amber-50 border-amber-100 text-amber-800 ring-2 ring-amber-500/10";
  } else if (donationCount >= 1) {
    rankLabel = "Active Savior";
    rankColor = "bg-emerald-50 border-emerald-100 text-emerald-700";
  }

  const impactScore = donationCount * 120 + (profile.followers?.length || 0) * 15 + userRequests.length * 10;

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}?profile=${profile.uid}`;
    const shareData = {
      title: `${profile.displayName} | Blood Volunteer Profile`,
      text: `Let's support ${profile.displayName} (${profile.bloodGroup}), a voluntary lifesaving blood donor of ${profile.thana}, ${profile.district}.`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        addToast("Profile Shared", "Shared successfully!", "success");
      } catch (err) {
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      addToast("Link Copied!", "Share link has been copied to clipboard.", "success");
    }).catch(() => {
      addToast("Failed to Copy", "Please copy the URL manually.", "error");
    });
  };

  const handleCopyPhone = () => {
    if (!profile.phone) return;
    navigator.clipboard.writeText(profile.phone).then(() => {
      setCopiedPhone(true);
      addToast("Phone Copied!", "Volunteer phone number copied to clipboard.", "success");
      setTimeout(() => setCopiedPhone(false), 2000);
    });
  };

  // Eligibility details
  const isEligibleNow = !profile.nextDonationEligibility || new Date(profile.nextDonationEligibility) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto pb-20"
    >
      {/* Profile Container */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm mb-8 overflow-hidden relative">
        
        {/* Modern Parallax Banner */}
        <div className="h-44 md:h-56 bg-slate-900 relative overflow-hidden">
          {/* Swipe-down cue on mobile */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/35 rounded-full z-25 md:hidden" />
          {profile.coverURL ? (
            <img src={profile.coverURL} className="w-full h-full object-cover opacity-85" alt="Cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-950 via-slate-900 to-rose-900">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute -left-1/4 -bottom-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -right-1/4 -top-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse duration-5000" />
            </div>
          )}
          
          {/* Header Action Overlay */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
            <button 
              onClick={onBack}
              className="p-2 bg-slate-950/40 hover:bg-slate-950/60 text-white rounded-full transition-all backdrop-blur-md border border-white/10 active:scale-95 cursor-pointer"
              title="Return"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <button 
                onClick={handleShareProfile}
                className="px-4 py-2 bg-slate-950/40 hover:bg-slate-950/60 text-white rounded-xl transition-all backdrop-blur-md border border-white/10 active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Share Profile"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Header Block */}
        <div className="px-5 sm:px-8 pb-8 -mt-12 sm:-mt-16 md:-mt-20 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end">
              <div className="relative shrink-0">
                <div className={`w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-white rounded-[2rem] overflow-hidden p-1 shadow-xl transition-all duration-300 relative border ${isEligibleNow ? 'border-emerald-300' : 'border-rose-100'}`}>
                  <img 
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=300&background=random&bold=true`} 
                    alt={profile.displayName}
                    className="w-full h-full object-cover rounded-[1.75rem]"
                  />
                </div>
                {profile.isAvailable && (
                  <span className="absolute bottom-2 right-2 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-4 border-white shadow-md"></span>
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5 mb-1 pt-12 md:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                    {profile.displayName}
                  </h1>
                  {profile.isVerified && <BadgeCheck className="w-6 h-6 text-blue-500 fill-white shrink-0" />}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {profile.thana}, {profile.district}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-405 font-semibold uppercase tracking-wider text-[10px]">
                    {profile.gender || 'Volunteer'}
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Glowing Blood Identifier */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto bg-slate-50 border border-slate-100 p-2.5 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 w-10 h-10 bg-rose-500/5 rounded-full blur-sm" />
              <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Blood Group</p>
                <p className="text-sm font-black text-rose-600 tracking-tight leading-none uppercase">Type {profile.bloodGroup}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Bio Description */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 mb-6">
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              🛡️ <span className="font-semibold text-slate-800">Lifesaver Statement:</span> Registered ready blood provider. Standing by for emergency calls in the {profile.district} area. Certified active volunteer committed to saving lives. Use the support controls below to make contact.
            </p>
          </div>

          {/* Bento Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-100/70 shadow-sm hover:translate-y-[-2px] transition-transform duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-2.5 top-2.5 opacity-10">
                <TrendingUp className="w-10 h-10 text-slate-900" />
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Lifesaving Rating</p>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">{impactScore}</p>
              <p className="text-[8px] font-bold text-slate-500 mt-2 border-t border-slate-50 pt-1">Rank Impact Index</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100/70 shadow-sm hover:translate-y-[-2px] transition-transform duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-2.5 top-2.5 opacity-10">
                <Heart className="w-10 h-10 text-rose-500" />
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Saved Lives</p>
              <p className="text-2xl font-extrabold text-rose-600 leading-none">{donationCount}</p>
              <p className="text-[8px] font-bold text-slate-500 mt-2 border-t border-slate-50 pt-1">Donation Records</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100/70 shadow-sm hover:translate-y-[-2px] transition-transform duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-2.5 top-2.5 opacity-10">
                <Users className="w-10 h-10 text-blue-500" />
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Follower Base</p>
              <p className="text-2xl font-extrabold text-blue-600 leading-none">{profile.followers?.length || 0}</p>
              <p className="text-[8px] font-bold text-slate-500 mt-2 border-t border-slate-50 pt-1 font-mono">Involved Circle</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100/70 shadow-sm hover:translate-y-[-2px] transition-transform duration-300 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-2.5 top-2.5 opacity-10">
                <AlertCircle className="w-10 h-10 text-slate-500" />
              </div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Active Requests</p>
              <p className="text-2xl font-extrabold text-slate-950 leading-none">{userRequests.length}</p>
              <p className="text-[8px] font-bold text-slate-500 mt-2 border-t border-slate-50 pt-1">Direct Outreaches</p>
            </div>
          </div>

          {/* Double Column Bento Grid Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
            {/* Left: General & Organization Credentials */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Volunteer Badges</h3>
              
              {/* Lifesaving Rank Tag */}
              <div className="space-y-1">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Assigned Title rank</p>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold tracking-wider ${rankColor}`}>
                  <Award className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{rankLabel}</span>
                </div>
              </div>



              {/* Verified Verification Badge */}
              <div className="space-y-1 pt-1">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Status verification</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${profile.isVerified ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-xs font-semibold text-slate-700">
                    {profile.isVerified ? 'Officially Verified Volunteer' : 'Standard Member'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Donation Eligibility Checklist Card */}
            <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Safety & Eligibility</h3>
                
                <div className="space-y-3 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium font-sans">Age Limit Checklist (18-60)</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1">✔ Pass</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium font-sans">Weight Checklist (50kg+)</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1">✔ Pass</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-slate-600 font-medium font-sans">120-Day Elapsed Term</span>
                    {isEligibleNow ? (
                      <span className="text-emerald-500 font-bold flex items-center gap-1">✔ Ready</span>
                    ) : (
                      <span className="text-amber-500 font-bold flex items-center gap-1 flex-wrap justify-end">Active rest period</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Eligibility Meter Alert */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                {isEligibleNow ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest leading-none mb-1">Safety Clearance</p>
                      <p className="text-[11px] font-bold text-emerald-600 leading-none">Fully Eligible to Donate Now</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-rose-800 uppercase tracking-widest leading-none">Status Rest Required</p>
                    <p className="text-[11px] font-bold text-rose-600">Next Eligible: {formatDisplayDate(profile.nextDonationEligibility)}</p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Core Support Actions Bar */}
          <div className="space-y-3 pt-4 border-t border-slate-150">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-center">Direct contact channel</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {currentUser?.uid !== profile.uid ? (
                <>
                  <button 
                    onClick={async () => {
                      if (!currentUser) return;
                      const isFollowing = profile.followers?.includes(currentUser.uid);
                      
                      try {
                        await updateDoc(doc(db, 'users', profile.uid), {
                          followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
                        });
                        addToast(isFollowing ? "Unfollowed" : "Following", `You are ${isFollowing ? 'no longer' : 'now'} following ${profile.displayName}.`, 'success');
                      } catch (err) {
                        console.error("Follow failed:", err);
                        addToast("Action Failed", "Could not process following action.", 'error');
                      }
                    }}
                    className={`flex-1 font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2 text-xs border uppercase tracking-widest ${profile.followers?.includes(currentUser?.uid || '') ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-900 border-slate-950 text-white hover:bg-slate-850'}`}
                  >
                    {profile.followers?.includes(currentUser?.uid || '') ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Following Volunteer</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow Volunteer</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => onMessage(profile.uid)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open Live Chat</span>
                  </button>

                  <button 
                    onClick={handleCopyPhone}
                    className={`flex-1 font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer border ${copiedPhone ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'}`}
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Number Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Phone</span>
                      </>
                    )}
                  </button>

                  {profile.phone && (
                    <a 
                      href={`tel:${profile.phone}`}
                      className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Direct Phone Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </>
              ) : (
                <div className="w-full text-center py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs font-semibold">
                  This card outlines how your profile values appear to other public users.
                </div>
              )}
            </div>
          </div>

          {/* Polished Activity Stream Tabs Selector */}
          <div className="mt-10 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest mb-4">Volunteer Activity Stream</h3>
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryTab('posts')}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-200 ${historyTab === 'posts' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Stories ({userPosts.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('requests')}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-200 ${historyTab === 'requests' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Requests ({userRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('donations')}
                className={`flex-1 py-3 text-center border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-200 ${historyTab === 'donations' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Donation History ({donationCount})
              </button>
            </div>
          </div>

        </div>
      </div>

      <UserProfileHistory 
        donations={donations} 
        requests={userRequests} 
        currentUser={currentUser} 
        currentProfile={currentProfile} 
        activeTab={historyTab}
        posts={userPosts}
        allUsers={allUsers}
        onViewProfile={onViewProfile}
        askConfirm={askConfirm}
        addToast={addToast}
        notifyAdmins={notifyAdmins}
        onDeleteRequest={async (id) => {
          try { 
            await deleteDoc(doc(db, 'requests', id)); 
            addToast('Deleted', 'Request removed.', 'success'); 
          } catch(e) {}
        }}
      />
    </motion.div>
  );
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  'Dhaka': { lat: 23.8103, lng: 90.4125 },
  'Faridpur': { lat: 23.6071, lng: 89.8429 },
  'Gazipur': { lat: 24.0023, lng: 90.4264 },
  'Gopalganj': { lat: 23.0050, lng: 89.8267 },
  'Kishoreganj': { lat: 24.4331, lng: 90.7818 },
  'Madaripur': { lat: 23.1641, lng: 90.1896 },
  'Manikganj': { lat: 23.8644, lng: 89.9967 },
  'Munshiganj': { lat: 23.5422, lng: 90.5305 },
  'Narayanganj': { lat: 23.6238, lng: 90.5000 },
  'Narsingdi': { lat: 23.9230, lng: 90.7176 },
  'Rajbari': { lat: 23.7574, lng: 89.6444 },
  'Shariatpur': { lat: 23.2423, lng: 90.3444 },
  'Tangail': { lat: 24.2513, lng: 89.9144 },
  'Banderban': { lat: 22.1953, lng: 92.2184 },
  'Brahmanbaria': { lat: 23.9575, lng: 91.1119 },
  'Chandpur': { lat: 23.2321, lng: 90.6631 },
  'Chittagong': { lat: 22.3569, lng: 91.7832 },
  'Comilla': { lat: 23.4607, lng: 91.1809 },
  'Cox\'s Bazar': { lat: 21.4272, lng: 92.0058 },
  'Feni': { lat: 23.0159, lng: 91.3976 },
  'Khagrachari': { lat: 23.1192, lng: 91.9841 },
  'Lakshmipur': { lat: 22.9429, lng: 90.8411 },
  'Noakhali': { lat: 22.8696, lng: 91.0991 },
  'Rangamati': { lat: 22.6533, lng: 92.1753 },
  'Bagerhat': { lat: 22.6516, lng: 89.7859 },
  'Chuadanga': { lat: 23.6401, lng: 88.8504 },
  'Jessore': { lat: 23.1664, lng: 89.2081 },
  'Jhenaidah': { lat: 23.5450, lng: 89.1726 },
  'Khulna': { lat: 22.8456, lng: 89.5403 },
  'Kushtia': { lat: 23.9013, lng: 88.8836 },
  'Magura': { lat: 23.4873, lng: 89.4199 },
  'Meherpur': { lat: 23.7622, lng: 88.6318 },
  'Narail': { lat: 23.1725, lng: 89.5126 },
  'Satkhira': { lat: 22.7185, lng: 89.0705 },
  'Barisal': { lat: 22.7010, lng: 90.3535 },
  'Barguna': { lat: 22.1553, lng: 90.1261 },
  'Bhola': { lat: 22.6859, lng: 90.6481 },
  'Jhalokati': { lat: 22.6406, lng: 90.1987 },
  'Patuakhali': { lat: 22.3595, lng: 90.3340 },
  'Pirojpur': { lat: 22.5791, lng: 89.9751 },
  'Bogra': { lat: 24.8481, lng: 89.3730 },
  'Joypurhat': { lat: 25.0947, lng: 89.0209 },
  'Naogaon': { lat: 24.7936, lng: 88.9318 },
  'Natore': { lat: 24.4102, lng: 88.9595 },
  'Nawabganj': { lat: 24.5965, lng: 88.2741 },
  'Pabna': { lat: 24.0084, lng: 89.2336 },
  'Rajshahi': { lat: 24.3745, lng: 88.6042 },
  'Sirajganj': { lat: 24.4577, lng: 89.7080 },
  'Dinajpur': { lat: 25.6217, lng: 88.6354 },
  'Gaibandha': { lat: 25.3287, lng: 89.5280 },
  'Kurigram': { lat: 25.8054, lng: 89.6361 },
  'Lalmonirhat': { lat: 25.9165, lng: 89.4532 },
  'Nilphamari': { lat: 25.9317, lng: 88.8560 },
  'Panchagarh': { lat: 26.3411, lng: 88.5541 },
  'Rangpur': { lat: 25.7439, lng: 89.2752 },
  'Thakurgaon': { lat: 26.0336, lng: 88.4616 },
  'Habiganj': { lat: 24.3749, lng: 91.4155 },
  'Maulvibazar': { lat: 24.4829, lng: 91.7476 },
  'Sunamganj': { lat: 25.0658, lng: 91.3956 },
  'Sylhet': { lat: 24.8949, lng: 91.8687 },
  'Jamalpur': { lat: 24.9375, lng: 89.9310 },
  'Mymensingh': { lat: 24.7471, lng: 90.4203 },
  'Netrokona': { lat: 24.8700, lng: 90.7275 },
  'Sherpur': { lat: 25.0205, lng: 90.0152 }
};

const THANA_COORDS: Record<string, { lat: number; lng: number }> = {
  // Dhaka
  'Adabor': { lat: 23.7719, lng: 90.3533 },
  'Badda': { lat: 23.7801, lng: 90.4264 },
  'Bangsal': { lat: 23.7194, lng: 90.4046 },
  'Bimanbandar': { lat: 23.8617, lng: 90.4022 },
  'Cantonment': { lat: 23.8122, lng: 90.3956 },
  'Dhanmondi': { lat: 23.7461, lng: 90.3742 },
  'Gulshan': { lat: 23.7925, lng: 90.4078 },
  'Hazaribagh': { lat: 23.7317, lng: 90.3644 },
  'Jatrabari': { lat: 23.7192, lng: 90.4322 },
  'Kadamtali': { lat: 23.6939, lng: 90.4439 },
  'Kafrul': { lat: 23.7994, lng: 90.3833 },
  'Kamrangirchar': { lat: 23.7156, lng: 90.3644 },
  'Khilgaon': { lat: 23.7542, lng: 90.4256 },
  'Khilkhet': { lat: 23.8247, lng: 90.4239 },
  'Lalbagh': { lat: 23.7189, lng: 90.3855 },
  'Mirpur': { lat: 23.8056, lng: 90.3681 },
  'Mohammadpur': { lat: 23.7658, lng: 90.3583 },
  'Motijheel': { lat: 23.7331, lng: 90.4172 },
  'New Market': { lat: 23.7344, lng: 90.3839 },
  'Pallabi': { lat: 23.8256, lng: 90.3644 },
  'Paltan': { lat: 23.7378, lng: 90.4094 },
  'Ramna': { lat: 23.7431, lng: 90.4022 },
  'Rampura': { lat: 23.7611, lng: 90.4194 },
  'Sabujbagh': { lat: 23.7375, lng: 90.4294 },
  'Shahbagh': { lat: 23.7375, lng: 90.3956 },
  'Shyampur': { lat: 23.6894, lng: 90.4319 },
  'Sutrapur': { lat: 23.7061, lng: 90.4164 },
  'Tejgaon': { lat: 23.7592, lng: 90.3917 },
  'Turag': { lat: 23.8833, lng: 90.3639 },
  'Uttara': { lat: 23.8759, lng: 90.3795 },
  'Vatara': { lat: 23.7956, lng: 90.4278 },
  'Dhamrai': { lat: 23.9181, lng: 90.2119 },
  'Dohar': { lat: 23.5936, lng: 90.1347 },
  'Keraniganj': { lat: 23.6844, lng: 90.3256 },
  'Nawabganj': { lat: 23.6678, lng: 90.1656 },
  'Savar': { lat: 23.8617, lng: 90.2631 },

  // Chittagong
  'Chittagong Sadar': { lat: 22.3375, lng: 91.8317 },
  'Patiya': { lat: 22.2981, lng: 91.9739 },
  'Sitakunda': { lat: 22.6181, lng: 91.6547 },
  'Hathazari': { lat: 22.5061, lng: 91.8047 },
  'Mirsharai': { lat: 22.7719, lng: 91.5736 },
  'Rangunia': { lat: 22.4636, lng: 92.0306 },
  'Raozan': { lat: 22.5408, lng: 91.9214 },
  'Sandwip': { lat: 22.4844, lng: 91.4367 },
  'Satkania': { lat: 22.0833, lng: 91.9567 },
  'Anwara': { lat: 22.2136, lng: 91.8953 },
  'Banshkhali': { lat: 22.0461, lng: 91.9256 },
  'Boalkhali': { lat: 22.3783, lng: 91.9239 },
  'Chandanaish': { lat: 22.2214, lng: 92.0411 },
  'Fatikchhari': { lat: 22.6869, lng: 91.7997 },
  'Lohagara': { lat: 22.0256, lng: 92.0125 },

  // Sylhet
  'Sylhet Sadar': { lat: 24.8949, lng: 91.8687 },
  'Beanibazar': { lat: 24.8256, lng: 92.1625 },
  'Bishwanath': { lat: 24.8514, lng: 91.7317 },
  'Fenchuganj': { lat: 24.7061, lng: 91.9367 },
  'Golapganj': { lat: 24.8464, lng: 91.9817 },
  'Gowainghat': { lat: 25.1833, lng: 91.9833 },
  'Jaintiapur': { lat: 25.1311, lng: 92.1156 },
  'Kanaighat': { lat: 25.0114, lng: 92.2472 },
  'South Surma': { lat: 24.8694, lng: 91.8794 },
  'Zakiganj': { lat: 24.8717, lng: 92.3833 },

  // Comilla
  'Comilla Sadar': { lat: 23.4607, lng: 91.1809 },
  'Barura': { lat: 23.3761, lng: 91.0189 },
  'Brahmanpara': { lat: 23.6169, lng: 91.1111 },
  'Burichang': { lat: 23.5517, lng: 91.1275 },
  'Chandina': { lat: 23.4833, lng: 90.9833 },
  'Chauddagram': { lat: 23.2181, lng: 91.2981 },
  'Daudkandi': { lat: 23.5350, lng: 90.7319 },
  'Debidwar': { lat: 23.6067, lng: 90.9856 },
  'Homna': { lat: 23.6833, lng: 90.7917 },
  'Laksam': { lat: 23.2389, lng: 91.1194 },
  'Muradnagar': { lat: 23.6339, lng: 90.9322 },
  'Nangalkot': { lat: 23.1611, lng: 91.2250 },
  'Titas': { lat: 23.5833, lng: 90.8667 },

  // Bogra
  'Bogra Sadar': { lat: 24.8481, lng: 89.3730 },
  'Sherpur': { lat: 24.6781, lng: 89.4125 },
  'Gabtali': { lat: 24.8833, lng: 89.4667 },
  'Shajahanpur': { lat: 24.8000, lng: 89.3700 },
  'Adamdighi': { lat: 24.8167, lng: 89.0333 },
  'Dhunat': { lat: 24.6333, lng: 89.6083 },
  'Dhupchanchia': { lat: 24.8750, lng: 89.1833 },
  'Kahaloo': { lat: 24.8250, lng: 89.2667 },
  'Nandigram': { lat: 24.6833, lng: 89.2500 },
  'Sariakandi': { lat: 24.9000, lng: 89.5667 },
  'Shibganj': { lat: 25.0250, lng: 89.3167 },
  'Sonatola': { lat: 24.9833, lng: 89.4917 },

  // Barisal
  'Barisal Sadar': { lat: 22.7010, lng: 90.3535 },
  'Bakerganj': { lat: 22.5281, lng: 90.3397 },
  'Babuganj': { lat: 22.8256, lng: 90.3167 },
  'Wazirpur': { lat: 22.8083, lng: 90.2417 },
  'Banaripara': { lat: 22.7833, lng: 90.1667 },
  'Gauranadi': { lat: 22.9736, lng: 90.2306 },
  'Agailjhara': { lat: 22.9583, lng: 90.1500 },
  'Mehendiganj': { lat: 22.8250, lng: 90.5333 },
  'Muladi': { lat: 22.8958, lng: 90.4167 },
  'Hizla': { lat: 22.8944, lng: 90.5111 },

  // Feni
  'Feni Sadar': { lat: 23.0159, lng: 91.3976 },
  'Chhagalnaiya': { lat: 23.0361, lng: 91.5194 },
  'Daganbhuiyan': { lat: 22.9150, lng: 91.2461 },
  'Parshuram': { lat: 23.1167, lng: 91.3500 },
  'Sonagazi': { lat: 22.8333, lng: 91.3833 },
  'Fulgazi': { lat: 23.0833, lng: 91.4167 },

  // Lakshmipur
  'Lakshmipur Sadar': { lat: 22.9429, lng: 90.8411 },
  'Raipur': { lat: 23.0389, lng: 90.7681 },
  'Ramganj': { lat: 23.1064, lng: 90.8411 },
  'Ramgati': { lat: 22.6167, lng: 90.9958 },
  'Kamalnagar': { lat: 22.7561, lng: 90.8756 },

  // Noakhali
  'Noakhali Sadar': { lat: 22.8696, lng: 91.0991 },
  'Begumganj': { lat: 22.9306, lng: 91.1042 },
  'Chatkhil': { lat: 23.0500, lng: 90.9583 },
  'Companyganj': { lat: 22.8333, lng: 91.2500 },
  'Hatiya': { lat: 22.3167, lng: 91.1250 },
  'Senbagh': { lat: 22.9917, lng: 91.2292 },
  'Sonaimuri': { lat: 23.0333, lng: 91.1000 },
  'Subarnachar': { lat: 22.6250, lng: 91.1167 },
  'Kabirhat': { lat: 22.8333, lng: 91.1833 },

  // Bagerhat
  'Bagerhat Sadar': { lat: 22.6516, lng: 89.7859 },
  'Chitalmari': { lat: 22.7844, lng: 89.8631 },
  'Fakirhat': { lat: 22.7801, lng: 89.7122 },
  'Kachua (Bagerhat)': { lat: 22.6525, lng: 89.8883 },
  'Mollahat': { lat: 22.9442, lng: 89.7917 },
  'Mongla': { lat: 22.4789, lng: 89.6108 },
  'Morrelganj': { lat: 22.4533, lng: 89.8550 },
  'Rampal': { lat: 22.5694, lng: 89.7214 },
  'Sarankhola': { lat: 22.3119, lng: 89.7917 },

  // Bandarban
  'Bandarban Sadar': { lat: 22.1953, lng: 92.2184 },
  'Thanchi': { lat: 21.7864, lng: 92.4278 },
  'Lama': { lat: 21.7816, lng: 92.1931 },
  'Naikhongchhari': { lat: 21.4206, lng: 92.1814 },
  'Ali Kadam': { lat: 21.6425, lng: 92.3083 },
  'Rowangchhari': { lat: 22.1672, lng: 92.3386 },
  'Ruma': { lat: 22.0039, lng: 92.4172 },

  // Cox's Bazar
  'Cox\'s Bazar Sadar': { lat: 21.4272, lng: 92.0058 },
  'Teknaf': { lat: 20.8583, lng: 92.3028 },
  'Ukhia': { lat: 21.2833, lng: 92.1000 },
  'Chakaria': { lat: 21.7583, lng: 92.0750 },
  'Ramu': { lat: 21.4333, lng: 92.1000 },
  'Kutubdia': { lat: 21.8167, lng: 91.8500 },
  'Maheshkhali': { lat: 21.5500, lng: 91.9500 },
  'Pekua': { lat: 21.8600, lng: 92.0000 },

  // Narayanganj
  'Narayanganj Sadar': { lat: 23.6238, lng: 90.5000 },
  'Rupganj': { lat: 23.7917, lng: 90.5167 },
  'Sonargaon': { lat: 23.6389, lng: 90.6000 },
  'Araihazar': { lat: 23.7847, lng: 90.6500 },
  'Bandar': { lat: 23.6083, lng: 90.5167 },

  // Gazipur
  'Gazipur Sadar': { lat: 24.0023, lng: 90.4264 },
  'Sreepur': { lat: 24.2000, lng: 90.4667 },
  'Kaliakair': { lat: 24.0667, lng: 90.2167 },
  'Kaliganj': { lat: 23.9917, lng: 90.6139 },
  'Kapasia': { lat: 24.1000, lng: 90.5708 },

  // Mymensingh
  'Mymensingh Sadar': { lat: 24.7471, lng: 90.4203 },
  'Bhaluka': { lat: 24.3833, lng: 90.3750 },
  'Trishal': { lat: 24.5833, lng: 90.3958 }
};

const BANGLADESH_BOUNDS = {
  north: 26.8,
  south: 20.5,
  east: 92.8,
  west: 87.8
};

const MAP_STYLES = [
  {
    "featureType": "all",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      { "visibility": "on" },
      { "color": "#cbd5e1" },
      { "weight": 1.5 }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [{ "visibility": "on" }, { "color": "#e2e8f0" }, { "weight": 0.5 }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "stylers": [{ "visibility": "off" }]
  }
];

function NotificationConsentModal({ onAccept, onClose }: { onAccept: () => void, onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 40, opacity: 0 }}
          className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
        >
          <div className="relative h-56 bg-red-600 flex items-center justify-center">
             <div className="absolute inset-0 opacity-20">
               <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="0.5" fill="none" />
                 <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="0.3" fill="none" />
                 <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="0.1" fill="none" />
               </svg>
             </div>
             <motion.div
               animate={{ 
                 y: [0, -10, 0],
                 rotate: [0, -5, 5, -5, 5, 0]
               }}
               transition={{ repeat: Infinity, duration: 4 }}
               className="bg-white/10 p-8 rounded-full backdrop-blur-xl border border-white/30"
             >
               <Bell className="w-16 h-16 text-white" />
             </motion.div>
             <div className="absolute -bottom-1 w-full h-12 bg-gradient-to-t from-white to-transparent" />
          </div>
          
          <div className="p-8 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Life-Saving Alerts</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
              Join thousands of donors receiving instant alerts for blood needs in their area. Your timely response could save a life today.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={onAccept}
                className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
              >
                Allow Notifications
              </button>
              <button
                onClick={onClose}
                className="w-full text-slate-400 font-black py-2 text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LocationPermissionModal({ onAccept, onClose }: { onAccept: () => void, onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 40, opacity: 0 }}
          className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
        >
          <div className="relative h-56 bg-blue-600 flex items-center justify-center">
             <div className="absolute inset-0 opacity-20">
               <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,50 Q25,0 50,50 T100,50" stroke="white" fill="none" strokeWidth="0.5" />
                 <path d="M0,60 Q25,10 50,60 T100,60" stroke="white" fill="none" strokeWidth="0.3" />
                 <path d="M0,40 Q25,-10 50,40 T100,40" stroke="white" fill="none" strokeWidth="0.1" />
               </svg>
             </div>
             <motion.div
               animate={{ 
                 scale: [1, 1.1, 1],
                 y: [0, -5, 0]
               }}
               transition={{ repeat: Infinity, duration: 3 }}
               className="bg-white/10 p-8 rounded-full backdrop-blur-xl border border-white/30"
             >
               <MapPin className="w-16 h-16 text-white" />
             </motion.div>
             <div className="absolute -bottom-1 w-full h-12 bg-gradient-to-t from-white to-transparent" />
          </div>
          
          <div className="p-8 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Nearby Life Savers</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
              We use your location to show blood requests and donors in your immediate vicinity, making it faster to respond to emergencies.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={onAccept}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
              >
                Use My Location
              </button>
              <button
                onClick={onClose}
                className="w-full text-slate-400 font-black py-2 text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Enter manually
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ConfirmModal({ config }: { config: ConfirmConfig | null }) {
  if (!config || !config.isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
      >
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => config.onResolve(false)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl border border-slate-100"
        >
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-[32px] mx-auto mb-6 flex items-center justify-center ${
              config.type === 'danger' ? 'bg-red-50 text-red-600' : 
              config.type === 'warning' ? 'bg-amber-50 text-amber-600' :
              'bg-blue-50 text-blue-600'
            }`}>
              {config.type === 'danger' ? <Trash2 className="w-10 h-10" /> : 
               config.type === 'warning' ? <AlertCircle className="w-10 h-10" /> :
               <ShieldCheck className="w-10 h-10" />}
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-3 leading-tight tracking-tight">{config.title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">{config.message}</p>
          </div>
          
          <div className="flex p-6 gap-3 bg-slate-50/50 border-t border-slate-100">
            <button
              onClick={() => config.onResolve(false)}
              className="flex-1 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-white transition-all active:scale-95 border border-transparent hover:border-slate-200"
            >
              {config.cancelText || 'Cancel'}
            </button>
            <button
              onClick={() => config.onResolve(true)}
              className={`flex-1 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-xl ${
                config.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 
                config.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' :
                'bg-slate-900 hover:bg-black shadow-slate-200'
              }`}
            >
              {config.confirmText || (config.type === 'danger' ? 'Confirm' : 'Okay')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ToastContainer({ toasts, onRemove, onAction }: { toasts: Toast[], onRemove: (id: string) => void, onAction: (requestId: string) => void }) {
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[400px] z-[9999] pointer-events-none flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'info' ? 'bg-blue-50 text-blue-600' :
                toast.type === 'success' ? 'bg-green-50 text-green-600' :
                toast.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'
              }`}>
                {toast.type === 'info' && <Bell className="w-5 h-5" />}
                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'error' && <ShieldAlert className="w-5 h-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{toast.title}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{toast.body}</p>
                
                {toast.requestId && (
                  <button 
                    onClick={() => {
                      onAction(toast.requestId!);
                      onRemove(toast.id);
                    }}
                    className="mt-3 text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    View Request <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => onRemove(toast.id)}
                className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="h-1 bg-slate-100 w-full">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6, ease: 'linear' }}
                className={`h-full ${
                  toast.type === 'info' ? 'bg-blue-500' :
                  toast.type === 'success' ? 'bg-green-500' :
                  toast.type === 'warning' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
function MapView({ 
  requests, 
  donors, 
  allUsers,
  apiKey, 
  mapId, 
  onMessage, 
  onViewProfile, 
  user, 
  profile, 
  onDeleteRequest, 
  onDonationDone, 
  settings, 
  activeDistrict,
  handleLogin,
  setMatchingDonorsRequest,
  mapResetKey,
  onOverviewChange
}: { 
  requests: BloodRequest[], 
  donors: UserProfile[], 
  allUsers: UserProfile[],
  apiKey: string, 
  mapId?: string, 
  onMessage: (uid: string) => void, 
  onViewProfile: (uid: string) => void, 
  user: FirebaseUser | null, 
  profile: UserProfile | null, 
  onDeleteRequest: (id: string) => void, 
  onDonationDone: (req: BloodRequest) => void, 
  settings: SystemSettings | null, 
  activeDistrict?: string,
  handleLogin: () => void,
  setMatchingDonorsRequest: (req: BloodRequest | null) => void,
  mapResetKey?: number,
  onOverviewChange?: (isOpen: boolean) => void
}) {
  const [selectedThanaKey, setSelectedThanaKey] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'donors' | 'requests'>('all');
  const isEnabled = Boolean(apiKey) && apiKey !== '';
  const effectiveMapId = mapId;
  const map = useMap();

  useEffect(() => {
    if (onOverviewChange) {
      onOverviewChange(!!selectedThanaKey || !!selectedRequest);
    }
  }, [selectedThanaKey, selectedRequest, onOverviewChange]);

  useEffect(() => {
    if (map && activeDistrict) {
      const coords = getDistrictCoords(activeDistrict);
      map.panTo(coords);
      map.setZoom(10);
    } else if (map && !activeDistrict) {
      map.panTo({ lat: settings?.defaultLat || 23.6850, lng: settings?.defaultLng || 90.3563 });
      map.setZoom(7);
    }
  }, [map, activeDistrict, settings?.defaultLat, settings?.defaultLng, mapResetKey]);

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-3xl p-8 text-center border border-slate-100">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <MapPin className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Google Maps Key Required</h2>
        <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
          To visualize blood requests on a map, you need to provide a Google Maps API Key.
        </p>
        <div className="bg-slate-50 p-4 rounded-2xl w-full text-left">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Setup Instructions</p>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
            <li>Administrators can update this key in the <b>Admin Panel &rarr; Settings</b> tab.</li>
            <li>Alternatively, add <code>GOOGLE_MAPS_PLATFORM_KEY</code> to your environment secrets.</li>
          </ol>
        </div>
      </div>
    );
  }

  // Helper to resolve district spelling mismatch
  const getNormalizedDistrictKey = (d: string) => {
    const normalized = d.toLowerCase().replace(/['\s-]/g, '');
    for (const key of Object.keys(BANGLADESH_LOCATIONS)) {
      if (key.toLowerCase().replace(/['\s-]/g, '') === normalized) {
        return key;
      }
    }
    return d;
  };

  // Helper to fetch normalized district coordinates
  const getDistrictCoords = (d: string) => {
    const normalized = d.toLowerCase().replace(/['\s-]/g, '');
    for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
      if (key.toLowerCase().replace(/['\s-]/g, '') === normalized) {
        return coords;
      }
    }
    return { lat: 23.6850, lng: 90.3563 };
  };

  // Aggregate by thana
  const thanaData = useMemo(() => {
    const data: Record<string, { 
      district: string; 
      thana: string; 
      count: number; 
      urgencyCount: number; 
      donorsCount: number;
    }> = {};
    
    // Group requests
    requests.forEach(r => {
      if (r.status === 'Pending' && r.district && r.thana) {
        const key = `${r.district}_${r.thana}`;
        if (!data[key]) {
          data[key] = { district: r.district, thana: r.thana, count: 0, urgencyCount: 0, donorsCount: 0 };
        }
        data[key].count++;
        if (r.urgency === 'Urgent') data[key].urgencyCount++;
      }
    });

    // Group donors
    donors.forEach(d => {
      if (d.district && d.thana) {
        const key = `${d.district}_${d.thana}`;
        if (!data[key]) {
          data[key] = { district: d.district, thana: d.thana, count: 0, urgencyCount: 0, donorsCount: 0 };
        }
        data[key].donorsCount++;
      }
    });

    return Object.entries(data).map(([key, stats]) => {
      const getThanaCoords = (district: string, thanaName: string) => {
        const dKey = thanaName.trim();
        if (THANA_COORDS[dKey]) {
          return THANA_COORDS[dKey];
        }
        
        // Normalized check
        const normalizedQuery = dKey.toLowerCase().replace(/['\s-]/g, '');
        for (const [keyCoords, coords] of Object.entries(THANA_COORDS)) {
          if (keyCoords.toLowerCase().replace(/['\s-]/g, '') === normalizedQuery) {
            return coords;
          }
        }

        // Fall back to District center but with a realistic, wide dispersion offset across the district
        const baseCoords = getDistrictCoords(district);
        const normalizedDistrict = getNormalizedDistrictKey(district);
        const thanas = BANGLADESH_LOCATIONS[normalizedDistrict] || [];
        const idx = thanas.indexOf(thanaName);
        
        if (idx !== -1) {
          const total = thanas.length;
          const angle = (idx / total) * 2 * Math.PI;
          // Spread realistically across 10 - 25 km from district center so thanas look like genuine towns
          const r = 0.08 + (idx % 4) * 0.03; 
          return {
            lat: baseCoords.lat + r * Math.sin(angle),
            lng: baseCoords.lng + r * Math.cos(angle)
          };
        } else {
          // Deterministic hash based on thana name
          let hash = 0;
          for (let i = 0; i < thanaName.length; i++) {
            hash = thanaName.charCodeAt(i) + ((hash << 5) - hash);
          }
          const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
          // Spread realistically across 8 - 20 km from district center
          const r = 0.06 + (Math.abs(hash % 5) * 0.025);
          return {
            lat: baseCoords.lat + r * Math.sin(angle),
            lng: baseCoords.lng + r * Math.cos(angle)
          };
        }
      };

      const coords = getThanaCoords(stats.district, stats.thana);

      return {
        key,
        ...stats,
        lat: coords.lat,
        lng: coords.lng
      };
    });
  }, [requests, donors]);

  const selectedData = useMemo(() => {
    if (!selectedThanaKey) return null;
    const item = thanaData.find(t => t.key === selectedThanaKey);
    if (!item) return null;
    return {
      district: item.district,
      thana: item.thana,
      requests: requests.filter(r => r.district === item.district && r.thana === item.thana && r.status === 'Pending'),
      donors: donors.filter(d => d.district === item.district && d.thana === item.thana)
    };
  }, [selectedThanaKey, thanaData, requests, donors]);

  const getInitialCenter = () => {
    if (activeDistrict) {
      return getDistrictCoords(activeDistrict);
    }
    if (profile?.district) {
      return getDistrictCoords(profile.district);
    }
    return { lat: settings?.defaultLat || 23.6850, lng: settings?.defaultLng || 90.3563 };
  };

  const getInitialZoom = () => {
    if (activeDistrict || profile?.district) {
      return 10;
    }
    return 7;
  };

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-sm relative">
      <Map
        defaultCenter={getInitialCenter()}
        defaultZoom={getInitialZoom()}
        mapId={effectiveMapId}
        styles={MAP_STYLES}
        restriction={{
          latLngBounds: BANGLADESH_BOUNDS,
          strictBounds: false
        }}
        disableDefaultUI={true}
        gestureHandling={'greedy'}
        minZoom={6.5}
        maxZoom={12}
        internalUsageAttributionIds= {['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {thanaData.map((t) => {
          const showRequests = t.count > 0 && settings?.showDistrictRequests !== false && (mapFilter === 'all' || mapFilter === 'requests');
          const showDonors = t.donorsCount > 0 && settings?.showDonorsOnMap !== false && (mapFilter === 'all' || mapFilter === 'donors');
          
          if (!showRequests && !showDonors) return null;

          return (
            <AdvancedMarker
              key={t.key}
              position={{ lat: t.lat, lng: t.lng }}
              onClick={() => {
                setSelectedThanaKey(t.key);
                if (map) {
                  map.panTo({ lat: t.lat, lng: t.lng });
                  map.setZoom(11.5);
                }
              }}
            >
              <div className="flex flex-col items-center cursor-pointer transform hover:scale-110 transition-transform">
                {/* Visual indicator of thana name */}
                <span className="text-[8px] font-black text-slate-700 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-slate-200 shadow-sm mb-1 uppercase tracking-wider">{t.thana}</span>
                <div className="flex gap-1 items-center">
                  {showRequests && (
                    <div className={`flex items-center gap-1 px-1.5 h-[24px] rounded-full border border-white shadow-md text-white font-black text-[9px] transition-all shrink-0 ${t.urgencyCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-slate-900'}`}>
                      <Droplets className="w-2.5 h-2.5" />
                      {t.count}
                    </div>
                  )}
                  {showDonors && (
                    <div className="flex items-center gap-1 px-1.5 h-[24px] rounded-full border border-white shadow-md text-white font-black text-[9px] bg-blue-600 shrink-0">
                      <Users className="w-2.5 h-2.5" />
                      {t.donorsCount}
                    </div>
                  )}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Individual Request Markers */}
        {settings?.showGroupRequests !== false && (mapFilter === 'all' || mapFilter === 'requests') && requests.filter(r => r.lat && r.lng && r.status === 'Pending').map(r => (
          <MarkerWithInfoWindow 
            key={r.id} 
            request={r} 
            donors={donors}
            onMessage={() => onMessage(r.requesterUid)} 
            onViewProfile={() => onViewProfile(r.requesterUid)} 
            user={user}
            profile={profile}
            onDeleteRequest={onDeleteRequest}
            onDonationDone={onDonationDone}
            onClick={() => setSelectedRequest(r)}
          />
        ))}
      </Map>
      
      {/* Map Content Toast */}
      {(settings?.showDistrictRequests !== false || settings?.showDonorsOnMap !== false) && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3">
            {settings?.showDistrictRequests !== false && (
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-red-600 rounded-lg">
                  <Droplets className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Requests</span>
              </div>
            )}
            {settings?.showDistrictRequests !== false && settings?.showDonorsOnMap !== false && (
              <div className="w-px h-3 bg-slate-200"></div>
            )}
            {settings?.showDonorsOnMap !== false && (
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-blue-600 rounded-lg">
                  <Users className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Donors</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thana Detail Overlay */}
      <AnimatePresence>
        {selectedThanaKey && selectedData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedThanaKey(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 pointer-events-auto"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.85 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  setSelectedThanaKey(null);
                }
              }}
              className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[32px] shadow-2xl z-30 flex flex-col max-h-[85%] pointer-events-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0 cursor-grab active:cursor-grabbing" />
              
              <div className="px-6 pb-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedData.thana}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedData.district} District Overview</p>
                </div>
                <button 
                  onClick={() => setSelectedThanaKey(null)}
                  className="p-2 bg-white text-slate-400 rounded-full shadow-sm hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-6">
                {/* Requests Section */}
                {selectedData.requests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center">
                        <Droplets className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Blood Requests ({selectedData.requests.length})</h4>
                    </div>
                    <div className="space-y-4">
                      {selectedData.requests.map(req => (
                          <RequestCard 
                            key={req.id} 
                            request={req} 
                            user={user}
                            allUsers={allUsers}
                            onDonationDone={onDonationDone}
                            onMessage={() => user ? onMessage(req.requesterUid) : handleLogin()} 
                            onViewProfile={() => onViewProfile(req.requesterUid)}
                            onMatchDonors={() => setMatchingDonorsRequest(req)}
                            onDelete={(profile?.role === 'admin' || user?.uid === req.requesterUid) ? () => onDeleteRequest(req.id) : undefined}
                          />
                      ))}
                    </div>
                  </div>
                )}

                {/* Donors Section */}
                {selectedData.donors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Available Donors ({selectedData.donors.length})</h4>
                    </div>
                    <div className="space-y-4">
                      {selectedData.donors.map(donor => (
                        <DonorCard 
                          key={donor.uid} 
                          donor={donor} 
                          onMessage={() => onMessage(donor.uid)} 
                          onViewProfile={() => onViewProfile(donor.uid)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedData.requests.length === 0 && selectedData.donors.length === 0 && (
                  <div className="py-20 text-center text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-black uppercase tracking-widest">No data available for this thana</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {selectedRequest && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 pointer-events-auto"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.85 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  setSelectedRequest(null);
                }
              }}
              className="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[32px] shadow-2xl z-30 flex flex-col max-h-[85%] pointer-events-auto overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0 cursor-grab active:cursor-grabbing" />
              
              <div className="px-6 pb-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedRequest.bloodGroup} Blood Request</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedRequest.thana}, {selectedRequest.district}</p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 bg-white text-slate-400 rounded-full shadow-sm hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-6">
                <RequestCard 
                  request={selectedRequest}
                  user={user}
                  allUsers={allUsers}
                  onDonationDone={() => {
                    onDonationDone(selectedRequest);
                    setSelectedRequest(null);
                  }}
                  onMessage={() => {
                    if (!user) {
                      handleLogin();
                    } else {
                      onMessage(selectedRequest.requesterUid);
                      setSelectedRequest(null);
                    }
                  }}
                  onViewProfile={() => {
                    onViewProfile(selectedRequest.requesterUid);
                    setSelectedRequest(null);
                  }}
                  onMatchDonors={() => setMatchingDonorsRequest(selectedRequest)}
                  onDelete={(profile?.role === 'admin' || user?.uid === selectedRequest.requesterUid) ? () => {
                    onDeleteRequest(selectedRequest.id);
                    setSelectedRequest(null);
                  } : undefined}
                />

                {/* Nearby Donors for this specific request */}
                {(() => {
                  const nearbyDonors = donors.filter(d => 
                    d.bloodGroup === selectedRequest.bloodGroup && 
                    d.district === selectedRequest.district && 
                    d.thana === selectedRequest.thana &&
                    d.isAvailable
                  );
                  
                  if (nearbyDonors.length === 0) return null;

                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Available matching Donors ({nearbyDonors.length})</h4>
                      </div>
                      <div className="space-y-4">
                        {nearbyDonors.map(donor => (
                          <DonorCard 
                            key={donor.uid} 
                            donor={donor} 
                            onMessage={() => {
                              onMessage(donor.uid);
                              setSelectedRequest(null);
                            }} 
                            onViewProfile={() => {
                              onViewProfile(donor.uid);
                              setSelectedRequest(null);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarkerWithInfoWindow({ request, donors, onMessage, onViewProfile, profile, user, onDeleteRequest, onDonationDone, onClick }: { 
  request: BloodRequest, 
  donors: UserProfile[],
  onMessage: () => void, 
  onViewProfile: () => void, 
  profile: UserProfile | null, 
  user: FirebaseUser | null, 
  onDeleteRequest: (id: string) => void,
  onDonationDone: (req: BloodRequest) => void,
  onClick?: () => void,
  key?: any 
}) {
  return (
    <AdvancedMarker
      position={{ lat: request.lat!, lng: request.lng! }}
      onClick={onClick}
    >
      <div className={`relative px-2 py-1 rounded-full shadow-lg border-2 border-white flex items-center justify-center min-w-[45px] hover:scale-110 transition-transform cursor-pointer ${request.urgency === 'Urgent' ? 'bg-red-600 animate-pulse' : 'bg-red-500'}`}>
        <span className="text-[10px] font-black text-white">{request.bloodGroup}</span>
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r-2 border-b-2 border-white ${request.urgency === 'Urgent' ? 'bg-red-600' : 'bg-red-500'}`}></div>
      </div>
    </AdvancedMarker>
  );
}
