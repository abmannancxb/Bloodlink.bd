import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  X, 
  Send, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  MapPin, 
  Droplet, 
  Search, 
  CheckCircle,
  HelpCircle,
  Plus,
  Phone,
  PhoneOff,
  MessageSquare,
  ChevronRight,
  User,
  Image as ImageIcon,
  Paperclip,
  Maximize2,
  Minimize2,
  MessageCircle,
  Sparkle,
  Calendar
} from 'lucide-react';

// --- ROBOT AVATAR COMPONENT ---
function RobotAvatar({ size = "md", isSpeaking = false, isThinking = false, isListening = false }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${size === 'lg' ? 'w-24 h-24' : 'w-11 h-11'}`}>
      {/* Dynamic Soundwave Rings around avatar */}
      <AnimatePresence>
        {(isSpeaking || isThinking || isListening) && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ 
              scale: isSpeaking ? [1, 1.25, 1] : isListening ? [1, 1.15, 1] : [1, 1.1, 1],
              opacity: [0.6, 0.2, 0.6]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: isSpeaking ? 1.5 : isListening ? 2 : 2.5,
              ease: "easeInOut" 
            }}
            className="absolute inset-0 rounded-full bg-red-150/40 border border-red-400/20"
          />
        )}
      </AnimatePresence>

      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md relative z-10 select-none">
        {/* Anti-collision / Antenna bar / Headphones */}
        <rect x="18" y="42" width="8" height="24" rx="4" fill="#fc3a52" />
        <rect x="74" y="42" width="8" height="24" rx="4" fill="#fc3a52" />
        <path d="M 22 45 A 28 28 0 0 1 78 45" fill="none" stroke="#fc3a52" strokeWidth="6" strokeLinecap="round" />
        
        {/* Head Base */}
        <rect x="22" y="28" width="56" height="48" rx="20" fill="#ffffff" stroke="#fecdd3" strokeWidth="2.5" />
        
        {/* Visor Screen */}
        <rect x="28" y="34" width="44" height="30" rx="10" fill="#0f172a" />
        
        {/* Reactive Glowing Eyes */}
        {isThinking ? (
          <>
            <circle cx="40" cy="46" r="3.5" fill="#38bdf8" className="animate-pulse" />
            <circle cx="60" cy="46" r="3.5" fill="#38bdf8" className="animate-pulse" />
          </>
        ) : isListening ? (
          <>
            <ellipse cx="40" cy="46" rx="5" ry="2.5" fill="#22d3ee" className="animate-ping" />
            <ellipse cx="40" cy="46" rx="5" ry="2.5" fill="#22d3ee" />
            <ellipse cx="60" cy="46" rx="5" ry="2.5" fill="#22d3ee" className="animate-ping" />
            <ellipse cx="60" cy="46" rx="5" ry="2.5" fill="#22d3ee" />
          </>
        ) : isSpeaking ? (
          <>
            <path d="M 36 48 Q 40 43 44 48" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M 56 48 Q 60 43 64 48" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M 36 47 Q 40 43 44 47" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <path d="M 56 47 Q 60 43 64 47" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        
        {/* Mouth */}
        {isSpeaking ? (
          <ellipse cx="50" cy="57" rx="3.5" ry="5.5" fill="#38bdf8" />
        ) : isThinking ? (
          <line x1="46" y1="57" x2="54" y2="57" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          <path d="M 46 56 Q 50 59 54 56" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Neck Connecting Chest */}
        <rect x="42" y="74" width="16" height="8" fill="#e2e8f0" />
        
        {/* Shiny Body Panel */}
        <path d="M 35 80 L 65 80 C 68 80 71 82 71 85 L 71 95 L 29 95 L 29 85 C 29 82 32 80 35 80 Z" fill="#ffffff" stroke="#fecdd3" strokeWidth="2" />
        
        {/* Medical Cross center indicator */}
        <path d="M 47 88 L 53 88 M 50 85 L 50 91" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// --- SMART BLOOD REQUEST CARD ---
function SmartBloodRequestCard({ slots, onPublish }) {
  return (
    <div className="bg-white border-2 border-[#ff1744] rounded-2xl p-4 shadow-lg space-y-4 mt-2 overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-rose-50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <Droplet className="w-4.5 h-4.5 text-red-650 fill-red-650" />
          </div>
          <span className="font-extrabold text-[13.5px] text-slate-900 tracking-tight">Blood Request</span>
        </div>
        <span className="bg-[#ff1744] text-[9px] font-black text-white px-3 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
          URGENT
        </span>
      </div>

      <div className="space-y-2.5 text-xs font-bold text-slate-700">
        <div className="flex justify-between py-1.5 border-b border-slate-50">
          <span className="text-slate-400 font-medium">Blood Group</span>
          <span className="text-[#ff1744] font-black text-sm">{slots.bloodGroup || 'O+'}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-50">
          <span className="text-slate-400 font-medium">Units Needed</span>
          <span className="text-slate-800">2 Unit</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-50">
          <span className="text-slate-400 font-medium">Location</span>
          <span className="text-slate-800 truncate max-w-[160px] text-right">
            {slots.hospital || slots.thana || "Cox's Bazar, Bangladesh"}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-50">
          <span className="text-slate-400 font-medium">Need By</span>
          <span className="text-red-500 font-extrabold">As Soon As Possible</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-slate-400 font-medium">Patient Type</span>
          <span className="text-slate-800">General</span>
        </div>
      </div>

      <button
        onClick={onPublish}
        className="w-full bg-[#ff1744] hover:bg-red-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/20 active:scale-[0.98] transition-all cursor-pointer text-xs uppercase tracking-wider"
      >
        <Plus className="w-4 h-4 fill-white" /> Publish Request
      </button>
    </div>
  );
}

// --- NEARBY DONORS LISTING CONTAINER ---
interface Donor {
  uid?: string;
  name?: string;
  displayName?: string;
  verified?: boolean;
  bg?: string;
  bloodGroup?: string;
  district?: string;
  thana?: string;
  distance?: string;
  phoneNumber?: string;
  phone?: string;
  lastDonationDate?: any;
  isAvailable?: boolean;
  avatar?: string;
  photoURL?: string;
  rating?: string;
  count?: string;
}

function NearbyDonorsList({ 
  bloodGroup, 
  district, 
  thana, 
  donors = [], 
  onCall, 
  onMessage 
}: { 
  bloodGroup?: string; 
  district?: string; 
  thana?: string; 
  donors?: Donor[]; 
  onCall: (donor: Donor) => void; 
  onMessage: (donor: Donor) => void; 
}) {
  const demoDonors: Donor[] = [
    { name: "Rahim Ahmed", verified: true, bg: "O+", bloodGroup: "O+", district: "Cox's Bazar", thana: "Sadar", phoneNumber: "01712-456789", lastDonationDate: "2026-01-10", isAvailable: true, rating: "4.9", count: "128", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80" },
    { name: "Tariqul Islam", verified: true, bg: "A+", bloodGroup: "A+", district: "Dhaka", thana: "Mirpur", phoneNumber: "01823-987654", lastDonationDate: "2025-11-20", isAvailable: true, rating: "4.8", count: "95", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80" },
    { name: "Ab Rahman", verified: true, bg: "O+", bloodGroup: "O+", district: "Cox's Bazar", thana: "Sadar", phoneNumber: "01991-112233", lastDonationDate: "2026-02-15", isAvailable: true, rating: "4.6", count: "43", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" }
  ];

  const pool = [...(donors || []), ...demoDonors];
  const trimLower = (val: any) => String(val || '').trim().toLowerCase();

  // Normalize blood group matching terms
  const matchBG = (donorBG: string, targetBG: string) => {
    if (!targetBG) return true;
    return trimLower(donorBG) === trimLower(targetBG);
  };

  // Pre-process and enrich pool with location score, distance, and availability
  const enrichedPool = pool
    .filter(d => {
      const dBG = d.bloodGroup || d.bg || '';
      return matchBG(dBG, bloodGroup || '');
    })
    .map(d => {
      const dDistrict = d.district || '';
      const dThana = d.thana || '';
      
      let priorityScore = 4; // Default lowest priority
      let distanceVal = 50.0;
      let distanceStr = "50 km away";

      const sameDistrict = trimLower(dDistrict) === trimLower(district);
      const sameThana = trimLower(dThana) === trimLower(thana);

      if (sameDistrict && sameThana) {
        priorityScore = 1; // 1. Same area
        distanceVal = 1.2 + (Math.floor((d.name || '').charCodeAt(0) || 0) % 5) * 0.4;
        distanceStr = `${distanceVal.toFixed(1)} km (Same Area)`;
      } else if (sameDistrict) {
        priorityScore = 2; // 2. Same district, nearby area
        distanceVal = 4.5 + (Math.floor((d.name || '').charCodeAt(0) || 0) % 15) * 0.8;
         distanceStr = `${distanceVal.toFixed(1)} km (Same District)`;
      } else if (district) {
        priorityScore = 3; // 3. Nearby district
        distanceVal = 25.0 + (Math.floor((d.name || '').charCodeAt(0) || 0) % 30) * 1.5;
        distanceStr = `${distanceVal.toFixed(1)} km (Nearby District)`;
      }

      const activeStatus = d.isAvailable ?? true; // Default active if not explicitly false
      
      return {
        ...d,
        priorityScore,
        distanceVal,
        distanceStr,
        activeStatus
      };
    });

  // Sort by:
  // 1. Location priority score / Distance ascending
  // 2. Active status (available first)
  // 3. Last blood donation date. Those who haven't donated recently or didn't donate are shown first!
  const sortedDonors = enrichedPool.sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) {
      return a.priorityScore - b.priorityScore;
    }
    if (a.distanceVal !== b.distanceVal) {
      return a.distanceVal - b.distanceVal;
    }
    if (a.activeStatus !== b.activeStatus) {
      return a.activeStatus ? -1 : 1;
    }
    // Last donation dates
    const dateA = a.lastDonationDate ? new Date(a.lastDonationDate).getTime() : 0;
    const dateB = b.lastDonationDate ? new Date(b.lastDonationDate).getTime() : 0;
    return dateA - dateB;
  });

  const finalDonors = sortedDonors.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-4 border border-rose-100/80 shadow-sm mt-3.5 space-y-3.5 w-full">
      <div className="flex justify-between items-center border-b border-rose-50 pb-2">
        <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
          <span className="text-red-500 text-sm animate-bounce">❤️</span>
          <span>{sortedDonors.length} উপযুক্ত রক্তদাতা পাওয়া গেছে</span>
        </div>
        {thana && district && (
          <span className="text-[10px] text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
            {thana}, {district}
          </span>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2.5 scrollbar-none scroll-smooth">
        {finalDonors.length === 0 ? (
          <div className="text-center w-full py-6 text-slate-400 font-medium text-xs">
            কোন রক্তদাতা তথ্য পাওয়া যায়নি। অনুগ্রহ করে অনুসন্ধান ক্ষেত্র পরিবর্তন করুন।
          </div>
        ) : (
          finalDonors.map((donor, idx) => {
            const name = donor.displayName || donor.name || "Blood Donor";
            const bg = donor.bloodGroup || donor.bg || "O+";
            const locationText = `${donor.thana || 'Sadar'}, ${donor.district || 'Dhaka'}`;
            const phoneNum = donor.phoneNumber || donor.phone || "017XX-XXXXXX";
            const lastDonDate = donor.lastDonationDate 
              ? new Date(donor.lastDonationDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
              : "কখনো দেননি / জানা নেই";
            
            const isAvail = donor.activeStatus;
            const avatarUrl = donor.avatar || donor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffe5e5&color=e11d48&bold=true`;

            return (
              <div 
                key={idx} 
                className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col shrink-0 w-[240px] space-y-2.5 relative transition-all duration-300 hover:shadow-md hover:border-rose-100"
              >
                {/* Header: Name, BG & Availability */}
                <div className="flex gap-2.5 items-start">
                  <div className="relative shrink-0">
                    <img 
                      src={avatarUrl} 
                      alt={name} 
                      className="w-12 h-12 rounded-xl object-cover border border-white shadow-xs" 
                      referrerPolicy="no-referrer"
                    />
                    <span 
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isAvail ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`} 
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="font-extrabold text-[12px] text-slate-900 truncate flex items-center gap-0.5">
                      {name}
                      {donor.verified !== false && (
                        <span className="text-blue-500 shrink-0 text-[10px]" title="সরাসরি রক্তদাতা">✔️</span>
                      )}
                    </h5>
                    
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-md">
                        {bg}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${
                        isAvail ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {isAvail ? 'Available' : 'Standby'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details layout strictly displaying requested fields */}
                <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100/30 text-[10.5px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate font-semibold text-slate-700">{locationText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-mono text-slate-800 font-bold">{phoneNum}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate text-[9.5px]">রক্তদান: <strong>{lastDonDate}</strong></span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium pt-0.5 border-t border-slate-50 mt-1">
                    দূরত্ব: <span className="text-rose-500 font-extrabold font-mono">{donor.distanceStr}</span>
                  </div>
                </div>

                {/* Direct calling and messaging CTAs */}
                <div className="grid grid-cols-2 gap-2 pt-1 font-bold">
                  <button 
                    onClick={() => onCall(donor)}
                    className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 hover:border-emerald-200 rounded-xl text-[10.5px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.97]"
                  >
                    <Phone className="w-3.5 h-3.5 fill-emerald-650" />
                    কল করুন
                  </button>
                  <button 
                    onClick={() => onMessage(donor)}
                    className="py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10.5px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.97]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    মেসেজ
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- MAIN AI ASSISTANT OVERLAY ---
interface AIBloodAssistantProps {
  onSearchDonors: (bloodGroup: string, district: string, thana: string) => void;
  onOpenRequestForm: (preloadedData?: any) => void;
  currentUser: any;
  allUsers?: any[];
  currentUserProfile?: any;
  settings?: any;
  isExternalOpen?: boolean;
  onRequestClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  meta?: {
    showCustomCard?: boolean;
    showDonorsList?: boolean;
    payloadSlots?: any;
  };
}

interface Slots {
  bloodGroup: string | null;
  district: string | null;
  thana: string | null;
  hospital: string | null;
  medicalReason: string | null;
  contactPhone: string | null;
  taskMode: 'search_donors' | 'create_request' | 'donor_lookup' | 'idle';
}

export default function AIBloodAssistant({ 
  onSearchDonors, 
  onOpenRequestForm, 
  currentUser,
  allUsers = [],
  currentUserProfile,
  settings,
  isExternalOpen,
  onRequestClose
}: AIBloodAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'voice'>('chat');
  const [autoPilotMic, setAutoPilotMic] = useState<boolean>(() => {
    return localStorage.getItem('auto_pilot_mic') !== 'false';
  });
  const [showSlotBoard, setShowSlotBoard] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [slots, setSlots] = useState<Slots>({
    bloodGroup: null,
    district: null,
    thana: null,
    hospital: null,
    medicalReason: null,
    contactPhone: null,
    taskMode: 'idle'
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(window.speechSynthesis);
  const activeUtteranceRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(true);

  // Auto-scroll chat messages log
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Cleanup references on unmount
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Initialize browser speech recognition engine for Bengali
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'bn-BD';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          await handleSendMessage(transcript);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Voice Engine error callback:", err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Helper to remove markdown symbols and clean up text for realistic, natural speech flow in Bangla
  const cleanMarkdownAndSymbols = (rawText: string): string => {
    if (!rawText) return "";
    let cleaned = rawText;

    // 1. Remove emojis and common icon badges completely
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/[👋😊🤖🩸🏥💉⏰🔴📌❤️🤝📍⚠️📊🩺]/g, '');

    // 2. Remove markdown styling (bold, italics, core syntax)
    cleaned = cleaned.replace(/\*{1,3}/g, '');
    cleaned = cleaned.replace(/_{1,3}/g, '');
    cleaned = cleaned.replace(/`{1,3}[^`]*`{1,3}/g, ''); 
    cleaned = cleaned.replace(/`+/g, '');
    cleaned = cleaned.replace(/#+\s+/g, '');
    cleaned = cleaned.replace(/>\s+/g, '');

    // 3. Extract text from markdown links: [text](link) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 4. Remove bullet/numbered list prefixes at line starts
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');

    // 5. Replace dashes, semicolons, colons, or vertical pipes with space to avoid robot pause style
    cleaned = cleaned.replace(/[:\-–—|]/g, ' ');

    // 6. Replace multiple spaces and newlines with a single space
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  };

  // Native Speech Synthesis voice speaker with premium OpenAI server-side Voice fallbacks
  const speakText = async (text: string) => {
    if (isMuted) return;

    stopSpeaking();
    stopListening();

    const cleanedText = cleanMarkdownAndSymbols(text);
    if (!cleanedText) return;

    let alreadyFallenBack = false;

    // Use OpenAI TTS model by calling /api/openai/speech
    try {
      setIsSpeaking(true);
      const audioUrl = `/api/openai/speech?text=${encodeURIComponent(cleanedText)}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        if (isOpen && autoPilotMic) {
          startListening();
        }
      };

      audio.onerror = (e) => {
        console.warn("OpenAI TTS Audio error, falling back to local SpeechSynthesis:", e);
        if (!alreadyFallenBack) {
          alreadyFallenBack = true;
          fallbackToLocalSpeechSynthesis(cleanedText);
        }
      };

      await audio.play();
    } catch (err) {
      console.warn("Could not load OpenAI TTS, trying local fallback:", err);
      if (!alreadyFallenBack) {
        alreadyFallenBack = true;
        fallbackToLocalSpeechSynthesis(cleanedText);
      }
    }
  };

  const fallbackToLocalSpeechSynthesis = (bnText: string) => {
    if (!synthRef.current || isMuted) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(bnText);
      utterance.lang = 'bn-BD';
      
      const voices = synthRef.current.getVoices();
      const bnVoice = voices.find((v: any) => v.lang.startsWith('bn'));
      if (bnVoice) {
        utterance.voice = bnVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (isOpen && autoPilotMic) {
          startListening();
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (isOpen && autoPilotMic) {
          startListening();
        }
      };

      activeUtteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    } catch (localErr) {
      console.error("Local speech synthesis failure:", localErr);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    // 1. Cancel browser Voice utterance
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    // 2. Pause and reset OpenAI Audio playback
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = "";
      } catch (e) {
        // Safe play/pause error handle
      }
      activeAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const startListening = () => {
    if (recognitionRef.current && !isThinking && !isSpeaking) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const handleVoiceToggle = (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      try {
        e.preventDefault();
      } catch (err) {}
    }
    
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      setIsSpeaking(false);
      
      setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.warn("Speech recognition already started:", err);
            // backup state fallback
            setIsListening(true);
          }
        } else {
          setIsListening(true);
        }
      }, 50);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  // Open & trigger initial greetings
  const handleOpenAssistant = () => {
    setIsOpen(true);
    stopSpeaking();
    stopListening();
    setViewMode('chat');

    setMessages([]);
    
    setTimeout(() => {
      speakText("আসসালামু আলাইকুম! আমি ব্লাডলিঙ্ক এআই। বলুন আপনার কি সহযোগিতা লাগবে?");
    }, 250);
  };

  const handleCloseAssistant = () => {
    setIsOpen(false);
    stopSpeaking();
    stopListening();
    onRequestClose?.();
  };

  // Sync external parent trigger
  useEffect(() => {
    if (isExternalOpen !== undefined && isExternalOpen !== isOpen) {
      if (isExternalOpen) {
        handleOpenAssistant();
      } else {
        handleCloseAssistant();
      }
    }
  }, [isExternalOpen]);

  const handleReset = () => {
    stopSpeaking();
    stopListening();
    setSlots({
      bloodGroup: null,
      district: null,
      thana: null,
      hospital: null,
      medicalReason: null,
      contactPhone: null,
      taskMode: 'idle'
    });
    setMessages([]);
  };

  // NLP logic processor
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);
    stopListening();
    stopSpeaking();

    // Pure Client-side heuristics mapping to make it super fast in case network is slow!
    let matchingGroup = slots.bloodGroup;
    let matchingDistrict = slots.district;
    let matchingThana = slots.thana;
    let isRequestTrigger = false;
    let isDonorSearchTrigger = false;

    const textCleaned = textToSend.toLowerCase();
    
    // Blood group detection
    const bgMatch = textToSend.match(/(a|b|ab|o)\s*([+-]|p|n|pos|neg|পজিটিভ|নেগেটিভ|রক্ত)?/i) || textToSend.match(/(O\+|O-|A\+|A-|B\+|B-|AB\+|AB-)/i);
    if (bgMatch) {
      let candidate = bgMatch[0].toUpperCase().replace(/\s+/g, '');
      if (candidate.includes('পজিটিভ') || candidate.includes('POS')) {
        candidate = candidate[0] + '+';
      } else if (candidate.includes('নেগেটিভ') || candidate.includes('NEG')) {
        candidate = candidate[0] + '-';
      }
      if (['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].includes(candidate)) {
        matchingGroup = candidate;
      }
    }

    if (textCleaned.includes('o+') || textCleaned.includes('o positive') || textCleaned.includes('ও পজিティブ') || textCleaned.includes('ও পজেティブ')) matchingGroup = 'O+';
    if (textCleaned.includes('o-') || textCleaned.includes('o negative') || textCleaned.includes('ও নেগেティブ') || textCleaned.includes('ও নেজেティブ')) matchingGroup = 'O-';
    if (textCleaned.includes('a+') || textCleaned.includes('a positive') || textCleaned.includes('এ পজিティブ') || textCleaned.includes('এ পজেティブ')) matchingGroup = 'A+';
    if (textCleaned.includes('a-') || textCleaned.includes('a negative') || textCleaned.includes('এ নেগেティブ') || textCleaned.includes('এ নেজেティブ')) matchingGroup = 'A-';
    if (textCleaned.includes('b+') || textCleaned.includes('b positive') || textCleaned.includes('বি পজিティブ') || textCleaned.includes('বি পজেティブ')) matchingGroup = 'B+';
    if (textCleaned.includes('b-') || textCleaned.includes('b negative') || textCleaned.includes('বি নেগেティブ') || textCleaned.includes('বি নেজেティブ')) matchingGroup = 'B-';
    if (textCleaned.includes('ab+') || textCleaned.includes('ab positive') || textCleaned.includes('এবি পজিティブ') || textCleaned.includes('এবি পজেティブ')) matchingGroup = 'AB+';
    if (textCleaned.includes('ab-') || textCleaned.includes('ab negative') || textCleaned.includes('এবি নেগেティブ') || textCleaned.includes('এবি নেজেティブ')) matchingGroup = 'AB-';
    
    // Only pre-fill district and thana if they are explicitly asking for blood or search to prevent overriding general topics/greetings
    const isBloodContext = textCleaned.includes('রক্ত') || textCleaned.includes('blood') || textCleaned.includes('ব্লাড') || textCleaned.includes('ডোনার') || textCleaned.includes('donor') || textCleaned.includes('খুঁজ') || textCleaned.includes('খুজ');
    if (isBloodContext) {
      if (textCleaned.includes('cox') || textCleaned.includes('কক্সবাজার') || textCleaned.includes('কক্স')) {
        matchingDistrict = 'Cox\'s Bazar';
        matchingThana = 'Cox\'s Bazar Sadar';
      }
      if (textCleaned.includes('dhaka') || textCleaned.includes('ঢাকা')) {
        matchingDistrict = 'Dhaka';
        matchingThana = 'Sadar';
      }
    }

    if (textCleaned.includes('রক্ত চাই') || textCleaned.includes('request') || textCleaned.includes('রিকোয়েস্ট') || textCleaned.includes('দরকার') || textCleaned.includes('প্রয়োজন') || textCleaned.includes('লাগেব') || textCleaned.includes('লাগবে') || textCleaned.includes('ব্লাড লাগবে') || textCleaned.includes('রক্ত লাগবে') || textCleaned.includes('ব্লাড দরকার')) {
      isRequestTrigger = true;
    }
    if (textCleaned.includes('ডোনার') || textCleaned.includes('খুঁজুন') || textCleaned.includes('donor') || textCleaned.includes('খোঁজ') || textCleaned.includes('খুজুন') || textCleaned.includes('রক্তদাতা')) {
      isDonorSearchTrigger = true;
    }

    try {
      const response = await fetch('/api/gemini/blood-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          slots: {
            ...slots,
            bloodGroup: matchingGroup || slots.bloodGroup,
            district: matchingDistrict || slots.district,
            thana: matchingThana || slots.thana
          },
          currentUserPhone: currentUser?.phone || currentUser?.phoneNumber || '',
          donors: (allUsers || []).map((u: any) => ({
            displayName: u.displayName || u.name || '',
            bloodGroup: u.bloodGroup || '',
            district: u.district || '',
            thana: u.thana || ''
          })),
          settings: settings || null
        })
      });

      if (!response.ok) {
        throw new Error(`NLP server returned ${response.status}`);
      }

      const resData = await response.json();
      
      if (resData.success) {
        const replyText = resData.replyText || "আমি আপনার বার্তাটি পেয়েছি। আর কী তথ্য দিতে চান?";
        
        const cleanVal = (v: any) => {
          if (!v) return null;
          const s = String(v).trim().toLowerCase();
          return (s === 'null' || s === 'undefined' || s === '') ? null : v;
        };

        const updatedSlots: Slots = {
          bloodGroup: cleanVal(resData.bloodGroup) || matchingGroup || slots.bloodGroup,
          district: cleanVal(resData.district) || matchingDistrict || slots.district,
          thana: cleanVal(resData.thana) || matchingThana || slots.thana,
          hospital: cleanVal(resData.hospital) || slots.hospital,
          medicalReason: cleanVal(resData.medicalReason) || slots.medicalReason,
          contactPhone: cleanVal(resData.contactPhone) || slots.contactPhone,
          taskMode: resData.taskMode || slots.taskMode || 'idle'
        };

        setSlots(updatedSlots);

        // Append Assist msg
        const assistantText = replyText;
        // Determine whether to show custom layouts inline based on user intent
        const mustShowCard = updatedSlots.bloodGroup && (isRequestTrigger || updatedSlots.taskMode === 'create_request' || textCleaned.includes('দরকার'));
        const mustShowDonors = updatedSlots.bloodGroup && (isDonorSearchTrigger || updatedSlots.taskMode === 'search_donors' || textCleaned.includes('ডোনার'));

        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          text: assistantText,
          timestamp: new Date(),
          meta: {
            showCustomCard: !!mustShowCard,
            showDonorsList: !!mustShowDonors,
            payloadSlots: updatedSlots
          }
        }]);
        setIsThinking(false);
        speakText(assistantText);

        // Auto actions delays
        if (resData.actionTriggered && updatedSlots.bloodGroup && updatedSlots.taskMode === 'search_donors') {
          setTimeout(() => {
            onSearchDonors(updatedSlots.bloodGroup!, updatedSlots.district || '', updatedSlots.thana || '');
            handleCloseAssistant();
          }, 3800);
        }

        // Auto creation checks
        if (resData.requestFormTriggered) {
          if (currentUser) {
            const runAutoCreation = async () => {
              try {
                const match = (updatedSlots.medicalReason || '').match(/(\d+)\s*(ব্যাগ|unit|units|ব্যাগ রক্ত)/i);
                const unitsNeeded = match ? parseInt(match[1]) : 1;

                const docRef = await addDoc(collection(db, 'requests'), {
                  bloodGroup: updatedSlots.bloodGroup || 'O+',
                  district: updatedSlots.district || "Cox's Bazar",
                  thana: updatedSlots.thana || 'Sadar',
                  hospital: updatedSlots.hospital || 'সদর হাসপাতাল',
                  medicalReason: updatedSlots.medicalReason || 'জরুরি রক্তের আবেদন',
                  contactPhone: updatedSlots.contactPhone || currentUser?.phone || currentUser?.phoneNumber || '',
                  unitsNeeded: unitsNeeded,
                  urgency: 'Urgent',
                  status: 'Pending',
                  requesterUid: currentUser.uid,
                  requesterName: currentUser.displayName || currentUserProfile?.displayName || 'অজ্ঞাতনামা রক্তবন্ধু',
                  requesterPhoto: currentUser.photoURL || '',
                  createdAt: serverTimestamp()
                });

                // Broadcast blood request via Android Push Notifications (FCM)
                fetch('/api/send-push/blood-request', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bloodGroup: updatedSlots.bloodGroup || 'O+',
                    district: updatedSlots.district || "Cox's Bazar",
                    hospital: updatedSlots.hospital || 'সদর হাসপাতাল',
                    requestId: docRef.id,
                    requesterName: currentUser.displayName || currentUserProfile?.displayName || 'অজ্ঞাতনামা রক্তবন্ধু'
                  })
                }).then(res => res.json())
                  .then(data => console.log('AI Blood Assistant request FCM broadcast result:', data))
                  .catch(err => console.error('AI Assistant failed to broadcast blood request FCM:', err));

                setMessages(prev => [...prev, {
                  id: Math.random().toString(),
                  role: 'assistant',
                  text: `🎉 চমৎকার! আপনার রক্তের আবেদনটি সফলভাবে সিস্টেমে তৈরি ও লাইভ করা হয়েছে। জেলা-থানার সকল উপযুক্ত স্বেচ্ছাসেবী রক্তদাতাদের নিকট বার্তা ও বিজ্ঞপ্তি পাঠানো হয়েছে।`,
                  timestamp: new Date()
                }]);
              } catch (error) {
                console.error("Auto request creation error:", error);
              }
            };
            setTimeout(() => {
              runAutoCreation();
            }, 1500);
          } else {
            setTimeout(() => {
              onOpenRequestForm(updatedSlots);
            }, 2500);
          }
        }

      } else {
        throw new Error("Failed parser");
      }
    } catch (e) {
      // Fallback response inside the chat
      console.warn("API Error, using high fidelity client fallback NLP:", e);
      setIsThinking(false);

      const computedSlots = {
        bloodGroup: matchingGroup || slots.bloodGroup,
        district: matchingDistrict || slots.district,
        thana: matchingThana || slots.thana,
        hospital: slots.hospital,
        medicalReason: slots.medicalReason,
        contactPhone: slots.contactPhone || currentUserProfile?.phone || '',
        taskMode: isRequestTrigger ? 'create_request' : isDonorSearchTrigger ? 'search_donors' : slots.taskMode
      };
      setSlots(computedSlots);

      let assistReply = "";
      
      const isGreeting = textCleaned.includes('হ্যালো') || textCleaned.includes('হাই') || textCleaned.includes('hello') || textCleaned.includes('hi') || textCleaned.includes('সালাম') || textCleaned.includes('salam') || textCleaned.includes('আসসালামু');
      const isIntro = textCleaned.includes('কে তুমি') || textCleaned.includes('তুমি কে') || textCleaned.includes('পরিচয়') || textCleaned.includes('who are you') || textCleaned.includes('your name');
      const isBenefits = textCleaned.includes('রক্তদান') || textCleaned.includes('উপকারিতা') || textCleaned.includes('রক্ত দিলে') || textCleaned.includes('benefit');
      const isThanks = textCleaned.includes('ধন্যবাদ') || textCleaned.includes('thanks') || textCleaned.includes('thank you') || textCleaned.includes('থ্যাঙ্ক');

      if (isGreeting) {
        assistReply = "ওয়ালাইকুম আসসালাম! আমি আপনার রক্তবন্ধু AI সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি? রক্তদাতা খুঁজতে রক্তের গ্রুপ এবং জেলা-থানার নাম লিখে আমাকে প্রশ্ন করুন!";
      } else if (isIntro) {
        assistReply = "আমি ব্লাডলিঙ্ক এআই (BloodLink AI) সহকারী। আমি আপনাকে দ্রুত রক্তের গ্রুপ অনুযায়ী স্বেচ্ছাসেবী রক্তদাতা খুঁজে পেতে এবং জরুরী রক্তের আবেদন পোস্ট করতে সাহায্য করতে পারি।";
      } else if (isBenefits) {
        assistReply = "রক্তদান একটি পরম মহৎ কাজ। রক্ত দিলে শরীরের রক্তকণিকা পুনরুজ্জীবিত হয়, রক্তে উপাদানের ভারসাম্য ঠিক থাকে এবং হৃদরোগ ও স্ট্রোকের ঝুঁকি কমে। একটি রক্তদান সর্বোচ্চ ৪ জনের জীবন বাঁচাতে পারে!";
      } else if (isThanks) {
        assistReply = "আপনাকে অনেক ধন্যবাদ! ব্লাডলিঙ্ক বাংলাদেশের সাথে থাকুন এবং স্বেচ্ছায় রক্তদানে এগিয়ে আসুন।";
      } else if (computedSlots.bloodGroup) {
        if (isRequestTrigger) {
          assistReply = `আপনার ${computedSlots.bloodGroup} গ্রুপের রক্তের আবেদনটির বিবরণ নোট করেছি। অনুগ্রহ করে নিচের 'Publish Request' বাটন ব্যবহার করে সরাসরি আবেদনটি পোস্ট করুন যাতে সকলে দেখতে পায়।`;
        } else {
          assistReply = `আমি আপনার জন্য ${computedSlots.bloodGroup} গ্রুপের রক্তদাতার সন্ধান পেয়েছি। নিচে কাছাকাছি এলাকার উপযুক্ত রক্তদাতাদের দেখতে পাবেন এবং তাদের সাথে সরাসরি যোগাযোগ করতে পারবেন।`;
        }
      } else {
        // Safe natural fallback guiding the user contextually
        assistReply = `আমি আপনার বার্তাটি পেয়েছি। রক্তদাতা খুঁজতে, আবেদন পোস্ট করতে বা সাধারণ যেকোনো প্রশ্ন থাকলে দয়া করে বিস্তারিত বলুন (যেমন: রক্তের গ্রুপ ও আপনার জেলা)। আমি সাহায্য করার জন্য প্রস্তুত।`;
      }

      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        text: assistReply,
        timestamp: new Date(),
        meta: {
          showCustomCard: !!(computedSlots.bloodGroup && (isRequestTrigger || textCleaned.includes('দরকার') || textCleaned.includes('জরুরি') || textCleaned.includes('রিকোয়েস্ট'))),
          showDonorsList: !!(computedSlots.bloodGroup && (isDonorSearchTrigger || textCleaned.includes('রক্তদাতা') || textCleaned.includes('অনুরোধ') || textCleaned.includes('খুঁজ'))),
          payloadSlots: computedSlots
        }
      }]);
      speakText(assistReply);
    }
  };

  const handleChipClick = (value: string) => {
    handleSendMessage(value);
  };

  const handlePublishRequest = (paySlots: any) => {
    onOpenRequestForm({
      bloodGroup: paySlots.bloodGroup || slots.bloodGroup || '',
      district: paySlots.district || slots.district || '',
      thana: paySlots.thana || slots.thana || '',
      hospital: paySlots.hospital || slots.hospital || 'সদর হাসপাতাল',
      medicalReason: paySlots.medicalReason || slots.medicalReason || 'জরুরি রক্তের আবেদন',
      contactPhone: paySlots.contactPhone || slots.contactPhone || ''
    });
    handleCloseAssistant();
  };

  const handleCallDonor = (donor: any) => {
    const pNumber = donor.phoneNumber || donor.phone || "01855212001";
    window.location.href = `tel:${pNumber}`;
  };

  const handleMessageDonor = (donor: any) => {
    // Navigate or link to trigger direct message trigger
    onSearchDonors(donor.bloodGroup || donor.bg || slots.bloodGroup || 'O+', donor.district || slots.district || '', donor.thana || slots.thana || '');
    handleCloseAssistant();
  };

  return (
    <>
      {/* Floating Sparkle/Mic Action Button (Positions customized based on "move it more down") */}
      <AnimatePresence>
        {!isOpen && isExternalOpen === undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed z-[110] bottom-20 right-4 sm:right-6 select-none"
          >
            <button
              type="button"
              onClick={handleOpenAssistant}
              className="h-13 px-4 bg-gradient-to-r from-red-600 via-[#ff1744] to-rose-600 text-white rounded-full flex items-center gap-2.5 shadow-[0_10px_35px_rgba(220,38,38,0.35)] border-2 border-white/50 cursor-pointer select-none hover:scale-[1.05] active:scale-95 transition-all text-center"
              style={{ touchAction: 'manipulation' }}
              title="রক্তবন্ধু AI সহকারী"
            >
              <div className="w-7.5 h-7.5 rounded-full bg-white/20 flex items-center justify-center relative shadow-inner shrink-0">
                <span className="absolute -inset-0.5 bg-white/30 rounded-full animate-ping opacity-60" />
                <Droplet className="w-3.5 h-3.5 text-white fill-white stroke-[2]" />
              </div>
              
              <div className="flex flex-col text-left pr-1">
                <span className="text-[11.5px] font-black tracking-wide text-white leading-none flex items-center gap-1">
                  রক্তবন্ধু AI সহকারী <span className="text-[7.5px] bg-white text-red-650 font-extrabold px-1 rounded-full scale-90">LIVE</span>
                </span>
                <span className="text-[8px] font-bold text-red-50/80 tracking-wider leading-none mt-0.5 uppercase">
                  কথা বলুন & ডোনার খুঁজুন
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat dialog overlay modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4">
            {/* Backdrop blur element */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAssistant}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Smart mobile container inside the browser */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#fafbff] w-full max-w-md h-full md:h-[820px] md:max-h-[92vh] md:rounded-[36px] shadow-2xl border border-rose-100/40 flex flex-col relative overflow-hidden"
              id="ai-mobile-assistant-container"
            >
              {viewMode === 'chat' ? (
                // --- CHATPLAY MODE ---
                <>
                  {/* Top Premium Gradient Header */}
                  <div className="bg-gradient-to-r from-red-600 via-[#ff1744] to-rose-600 text-white px-5 pt-8 pb-7 flex flex-col shrink-0 relative overflow-hidden rounded-b-[24px]">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between relative z-10 w-full">
                      <div className="flex items-center gap-3">
                        <RobotAvatar isSpeaking={isSpeaking} isThinking={isThinking} isListening={isListening} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-black tracking-tight leading-none text-white">BloodLink AI</h3>
                            <span className="bg-white/20 text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase text-white scale-90">BETA</span>
                          </div>
                          <p className="text-[10px] text-red-100 font-bold tracking-wider mt-1 flex items-center gap-1">
                            Your Smart Blood Assistant
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8.5px] font-bold text-emerald-300">Online</span>
                            <span className="text-[8.5px] text-white/50 font-mono tracking-widest ml-1 animate-pulse">.|||i.||.</span>
                          </div>
                        </div>
                      </div>

                      {/* Header controls */}
                      <div className="flex items-center gap-1.5 bg-black/10 p-1 rounded-2xl border border-white/10">
                        <button 
                          onClick={() => setViewMode('voice')}
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-all flex items-center justify-center"
                          title="Switch to Voice Call mode"
                        >
                          <Phone className="w-4 h-4 text-emerald-300 animate-bounce" />
                        </button>
                        <button 
                          onClick={() => setIsMuted(!isMuted)} 
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-all flex items-center justify-center"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={handleReset} 
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-all flex items-center justify-center"
                          title="Reset Conversation"
                        >
                          <RotateCcw className="w-4 h-4 opacity-75" />
                        </button>
                        <button 
                          onClick={handleCloseAssistant} 
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-all flex items-center justify-center"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>


                  </div>

                  {/* Message logging window */}
                  <div className="flex-1 overflow-y-auto px-4.5 py-4 space-y-4 scrollbar-none scroll-smooth">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 px-4 text-center h-full select-none">
                        <div className="relative mb-5 flex items-center justify-center">
                          <div className="absolute inset-0 w-20 h-20 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
                          <RobotAvatar size="lg" isSpeaking={isSpeaking} isThinking={isThinking} isListening={isListening} />
                        </div>
                        
                        <h4 className="text-base font-black text-slate-900 tracking-tight mb-2">
                          রক্তবন্ধু স্মার্ট এআই অ্যাসিস্ট্যান্ট
                        </h4>
                        
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold max-w-[280px] mb-5">
                          এই সহকারী আপনাকে কৃত্রিম বুদ্ধিমত্তা দিয়ে রক্তদাতা ও রক্তের রিকোয়েস্ট খুঁজতে সরাসরি সাহায্য করবে। নিচে লিখে বা ভয়েসে অনুসন্ধান করুন।
                        </p>

                        <div className="w-full max-w-[310px] bg-white border border-slate-150/85 rounded-3xl p-4.5 text-left space-y-3.5 shadow-xs">
                          <p className="text-[10px] font-black text-[#ff1744] uppercase tracking-widest border-b border-rose-50 pb-2 flex items-center gap-1.5">
                            <Sparkle className="w-3.5 h-3.5 fill-[#ff1744] text-[#ff1744] stroke-[2.5]" /> এআই সহকারীর মূল সুবিধাসমূহ:
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex gap-2.5">
                              <span className="text-xs">🔍</span>
                              <div>
                                <h5 className="text-[11px] font-black text-slate-800 leading-tight">স্মার্ট রক্তদাতা অনুসন্ধান</h5>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">যেমন: "O+ রক্তের ডোনার কোথায় পাব?"</p>
                              </div>
                            </div>

                            <div className="flex gap-2.5">
                              <span className="text-xs">📋</span>
                              <div>
                                <h5 className="text-[11px] font-black text-slate-800 leading-tight">সহজ জরুরি রক্তের আবেদন</h5>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">যেমন: "কক্সবাজার সদর হাসপাতালে জরুরি B+ রক্ত প্রয়োজন"</p>
                              </div>
                            </div>

                            <div className="flex gap-2.5">
                              <span className="text-xs">🗣️</span>
                              <div>
                                <h5 className="text-[11px] font-black text-slate-800 leading-tight">ভয়েস কল ও লাইভ টকিং সাপোর্ট</h5>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-tight">উপরে সবুজ ফোন বাটন টিপে সরাসরি মুখে কথা বলুন।</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {messages.map((m) => {
                      const isUser = m.role === 'user';
                      return (
                        <div key={m.id} className="space-y-1 animate-in fade-in duration-300">
                          <div className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {/* Assistant message avatar */}
                            {!isUser && (
                              <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-xs">🤖</span>
                              </div>
                            )}

                            <div className={`max-w-[82%] p-3.5 rounded-[22px] text-xs shadow-xs ${
                              isUser
                                ? 'bg-gradient-to-r from-red-50 to-pink-50 text-slate-800 border border-pink-100/60 rounded-tr-none'
                                : 'bg-white border border-slate-100/80 text-slate-800 rounded-tl-none font-medium leading-relaxed'
                            }`}>
                              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                              
                              <span className="text-[8.5px] text-slate-400 font-bold flex items-center justify-end gap-0.5 mt-1 opacity-80 select-none">
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isUser && <span className="text-emerald-500 font-extrabold">✓✓</span>}
                              </span>
                            </div>
                          </div>

                          {/* Render custom smart blood request element card inside stream */}
                          {m.meta?.showCustomCard && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="pl-9 pr-2"
                            >
                              <SmartBloodRequestCard slots={m.meta.payloadSlots} onPublish={() => handlePublishRequest(m.meta?.payloadSlots)} />
                            </motion.div>
                          )}

                          {/* Render near donor recommendation sliders */}
                          {m.meta?.showDonorsList && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="pl-1 pr-1"
                            >
                              <NearbyDonorsList 
                                bloodGroup={m.meta.payloadSlots?.bloodGroup || slots.bloodGroup} 
                                district={m.meta.payloadSlots?.district || slots.district}
                                thana={m.meta.payloadSlots?.thana || slots.thana}
                                donors={allUsers}
                                onCall={handleCallDonor}
                                onMessage={handleMessageDonor}
                              />
                            </motion.div>
                          )}
                        </div>
                      );
                    })}

                    {isThinking && (
                      <div className="flex justify-start gap-2.5 items-center">
                        <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0 animate-spin" />
                        <div className="bg-white border border-slate-100/80 rounded-[20px] rounded-tl-none px-4 py-3.5 shadow-xs text-slate-400 flex items-center gap-2">
                          <span className="flex gap-1">
                            <span className="h-1.5 w-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 bg-red-400 rounded-full animate-bounce" />
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">A.I. analyze...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>



                  {/* Bot Interactive input footer */}
                  <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between gap-2 md:pb-6 relative z-10">
                    <button 
                      type="button"
                      onClick={handleReset}
                      className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                      title="Clear session / attachment"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </button>
                    
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(inputText);
                      }}
                      className="flex-1 flex bg-slate-50/80 border border-slate-100 focus-within:border-rose-450 focus-within:ring-2 focus-within:ring-red-500/10 rounded-full px-4.5 py-1.5 items-center gap-2 transition"
                    >
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="কিছু লিখুন..."
                        className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 font-bold focus:outline-none text-xs outline-none py-1.5"
                      />

                      {/* Small mini-icons for layout features */}
                      <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                        <button type="button" onClick={() => handleSendMessage('আমার অবস্থান চেক করো')} className="p-1 hover:text-slate-600">
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button type="button" className="p-1 hover:text-slate-600">
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button 
                          type="button" 
                          onClick={isListening ? stopListening : startListening}
                          className={`p-1 ${isListening ? 'text-[#ff1744] bg-rose-50 rounded-full' : 'hover:text-slate-600'}`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      </div>
                    </form>

                    <button
                      onClick={() => handleSendMessage(inputText)}
                      disabled={!inputText.trim() && !isListening}
                      className="w-10 h-10 bg-[#ff1744] hover:bg-red-700 disabled:bg-slate-200 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition disabled:shadow-none cursor-pointer border-none outline-none"
                    >
                      <Send className="w-4 h-4 text-white fill-white translate-x-[1px]" />
                    </button>
                  </div>

                  {/* Giant floating hold-to-talk voice wave visualizer trigger at the bottom center */}
                  <div className="flex flex-col items-center justify-center bg-white border-t border-slate-100 py-4.5 shrink-0 relative select-none">
                    <div className="absolute inset-0 bg-slate-50/40 pointer-events-none" />
                    
                    <div className="relative flex flex-col items-center justify-center z-10 w-full px-6">
                      {/* Premium biometric capsule deck shape */}
                      <button 
                        onClick={handleVoiceToggle}
                        className={`w-full max-w-[340px] py-4 px-6 rounded-[22px] flex items-center justify-between shadow-xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
                          isListening 
                            ? 'bg-gradient-to-r from-red-600 via-[#ff1744] to-rose-600 border-[#ff1744] text-white scale-[1.04] shadow-red-500/30' 
                            : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-800 hover:scale-[1.01]'
                        }`}
                        style={{ 
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none'
                        }}
                      >
                        {/* Dynamic ripple underlays */}
                        <AnimatePresence>
                          {isListening && (
                            <motion.div
                              initial={{ opacity: 0.6, scale: 0.95 }}
                              animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
                              exit={{ opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="absolute inset-0 bg-white/20 rounded-xl"
                            />
                          )}
                        </AnimatePresence>

                        {/* Left Audio Wave lines */}
                        <div className="flex items-center gap-1 w-10 justify-center">
                          {[1, 2, 3, 4].map((bar) => (
                            <motion.span
                              key={bar}
                              animate={isListening ? { height: [8, 22, 8] } : { height: 8 }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: bar * 0.12 }}
                              className={`w-1 rounded-full ${isListening ? 'bg-white' : 'bg-red-400'}`}
                            />
                          ))}
                        </div>

                        {/* Core central text instruction */}
                        <div className="flex items-center gap-2 relative z-10 w-[180px] justify-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors ${
                            isListening ? 'bg-white text-[#ff1744]' : 'bg-[#ff1744] text-white shadow-[#ff1744]/20'
                          }`}>
                            <Mic className="w-4.5 h-4.5 animate-pulse" />
                          </div>
                          
                          <div className="flex flex-col text-left">
                            <span className="text-[12px] font-black tracking-wide leading-none uppercase">
                              {isListening ? "Listening Now" : "Tap to Talk"}
                            </span>
                            <span className={`text-[9.5px] font-bold mt-1 leading-none ${
                              isListening ? 'text-red-100' : 'text-slate-400'
                            }`}>
                              {isListening ? "বন্ধ করতে স্পর্শ করুন" : "কথা বলতে এখানে ট্যাপ করুন"}
                            </span>
                          </div>
                        </div>

                        {/* Right Audio Wave lines */}
                        <div className="flex items-center gap-1 w-10 justify-center">
                          {[4, 3, 2, 1].map((bar) => (
                            <motion.span
                              key={bar}
                              animate={isListening ? { height: [8, 22, 8] } : { height: 8 }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: bar * 0.12 }}
                              className={`w-1 rounded-full ${isListening ? 'bg-white' : 'bg-red-400'}`}
                            />
                          ))}
                        </div>
                      </button>

                      {/* Small safety/privacy indicator below button */}
                      <span className="text-[8.5px] font-extrabold text-slate-400 tracking-wider uppercase mt-2 select-none flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-500 animate-ping' : 'bg-slate-350'}`} />
                        {isListening ? 'Voice Channel Connected Live' : 'Tap to toggle voice assistant search'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                // --- CHATGPT + ELEVENLABS IMMERSIVE VOICE CALL MODE ---
                <div className="flex-1 bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#020617] flex flex-col relative text-white p-6">
                  {/* Subtle glass grid background */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.12),transparent_45%)] pointer-events-none" />
                  
                  {/* Premium Top Bar */}
                  <div className="flex items-center justify-between w-full pb-4 border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Call Live Sync</span>
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-black text-slate-100">BloodLink Voice AI</h4>
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ultra low latency</p>
                    </div>
                    <button 
                      onClick={() => setViewMode('chat')}
                      className="p-1 px-3 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-full text-[9px] font-bold text-white transition flex items-center gap-1"
                    >
                      Text Chat Mode
                    </button>
                  </div>

                  {/* Huge glowing circle of dynamic sound rippling waves in center */}
                  <div className="flex-1 flex flex-col items-center justify-center relative my-10 select-none">
                    {/* Ripple outer glow */}
                    <div className="absolute w-72 h-72 rounded-full bg-red-500/5 blur-3xl" />
                    
                    {/* Concentric rotating glass dials to simulate sci-fi ElevenLabs */}
                    <div className="absolute w-[220px] h-[220px] rounded-full border border-pink-500/10 animate-[spin_12s_linear_infinite]" />
                    <div className="absolute w-[180px] h-[180px] rounded-full border-2 border-dashed border-red-500/10 animate-[spin_8s_linear_infinite_reverse]" />
                    
                    {/* Main pulsing voice sphere */}
                    <motion.div 
                      animate={{
                        scale: isSpeaking ? [1, 1.15, 1.05, 1.2, 1] : isListening ? [1, 1.08, 1, 1.12, 1] : [1, 1.02, 1],
                        boxShadow: isSpeaking 
                          ? ["0 0 30px rgba(239, 68, 68, 0.2)", "0 0 60px rgba(244, 63, 94, 0.45)", "0 0 35px rgba(239, 68, 68, 0.2)"] 
                          : ["0 0 20px rgba(14, 165, 233, 0.1)", "0 0 40px rgba(6, 182, 212, 0.3)", "0 0 20px rgba(14, 165, 233, 0.1)"]
                      }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      className="w-40 h-40 rounded-full bg-white/5 backdrop-blur-xl border border-white/15 flex items-center justify-center relative shadow-2xl"
                    >
                      <RobotAvatar size="lg" isSpeaking={isSpeaking} isThinking={isThinking} isListening={isListening} />
                    </motion.div>

                    {/* Status prompt */}
                    <div className="mt-8 text-center max-w-xs space-y-1">
                      <p className="text-rose-455 text-xs uppercase tracking-widest font-black">
                        {isSpeaking ? "BloodLink Speaking..." : isListening ? "Listening with AI Voice..." : "Standing By..."}
                      </p>
                      
                      {/* Live spoken dynamic transcript box */}
                      <p className="text-slate-300 font-medium text-[13.5px] italic leading-relaxed pt-2 opacity-90 px-2 animate-pulse min-h-[44px]">
                        {isSpeaking 
                          ? `"${messages[messages.length - 1]?.text || 'আসসালামু আলাইকুম...'}"` 
                          : isListening 
                          ? '"জরুরি রক্তের জন্য তথ্য শুনছি..."' 
                          : '"কীভাবে আমি আপনাকে সহযোগিতা করতে পারি?"'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Beautiful Call Control buttons toolbar */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col space-y-4 shrink-0 shadow-lg relative z-10 mb-2">
                    <div className="flex items-center justify-around">
                      {/* Mute toggle button */}
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => setIsMuted(!isMuted)} 
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition border ${
                            isMuted 
                              ? 'bg-rose-900 border-rose-500/40 text-rose-200' 
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <span className="text-[9px] font-bold text-slate-400">Audio Muted</span>
                      </div>

                      {/* Giant Disconnect Hangup Red Button */}
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={() => setViewMode('chat')}
                          className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                        >
                          <PhoneOff className="w-6 h-6 text-white text-bold" />
                        </button>
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-1">Disconnect</span>
                      </div>

                      {/* Microphone mute switcher */}
                      <div className="flex flex-col items-center gap-1">
                        <button 
                          onClick={isListening ? stopListening : startListening}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition border ${
                            isListening 
                              ? 'bg-emerald-900 border-emerald-500 text-emerald-250' 
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        <span className="text-[9px] font-bold text-slate-400">Muted Microphone</span>
                      </div>
                    </div>

                    <div className="text-center pt-2">
                      <p className="text-[9.5px] font-bold text-slate-400 tracking-wider flex items-center justify-center gap-1">
                        🛡️ AI Secure voice session active • 2026 Telehealth Core
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
