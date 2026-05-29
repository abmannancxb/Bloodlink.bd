import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
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
  Plus
} from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(true);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Clean-up and mount tracker
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'bn-BD'; // Default Bengali
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
        console.error("Speech Recognition Error:", err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Helper to Speak Text in Bangla
  const speakText = (text: string) => {
    if (!synthRef.current || isMuted) return;

    stopSpeaking();
    stopListening(); // Don't listen to our own spoken response

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    
    // Attempt to set a high-quality Bengali voice
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
      // Automatically resume listening if assistant is still open and autopilot is true
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
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  const startListening = () => {
    if (recognitionRef.current && !isThinking && !isSpeaking) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Recognition might already be running
      }
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

  // Main talk trigger when clicked open
  const handleOpenAssistant = () => {
    setIsOpen(true);
    stopSpeaking();
    stopListening();

    const initialGreet = "বলুন আপনার কি সহযোগিতা লাগবে?";
    setMessages([
      {
        id: '1',
        role: 'assistant',
        text: initialGreet,
        timestamp: new Date()
      }
    ]);
    
    // Small delay to ensure synthesis is ready
    setTimeout(() => {
      speakText(initialGreet);
    }, 200);
  };

  const handleCloseAssistant = () => {
    setIsOpen(false);
    stopSpeaking();
    stopListening();
    onRequestClose?.();
  };

  // Sync external open state
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
    const resetText = "আমি আমাদের আলোচনা পুনরায় প্রথম থেকে শুরু করছি। বলুন, আপনার কি সহযোগিতা লাগবে?";
    setMessages([
      {
        id: 'reset',
        role: 'assistant',
        text: resetText,
        timestamp: new Date()
      }
    ]);
    setTimeout(() => {
      speakText(resetText);
    }, 200);
  };

  // Communication with Backend API
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Append User Message to list
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

    try {
      const response = await fetch('/api/gemini/blood-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          slots: slots,
          currentUserPhone: currentUser?.phone || currentUser?.phoneNumber || '',
          donors: (allUsers || []).map((u: any) => ({
            displayName: u.displayName || u.name || '',
            bloodGroup: u.bloodGroup || '',
            lastDonationDate: u.lastDonationDate || '',
            nextDonationEligibility: u.nextDonationEligibility || '',
            district: u.district || '',
            thana: u.thana || ''
          })),
          settings: settings ? {
            aiEnginePreference: settings.aiEnginePreference,
            geminiApiKeyOverride: settings.geminiApiKeyOverride,
            groqApiKeyOverride: settings.groqApiKeyOverride,
            aiDailyLimit: settings.aiDailyLimit,
            aiTodayUsageCount: settings.aiTodayUsageCount
          } : null
        })
      });

      if (!response.ok) {
        let errText = `Server responded with status ${response.status}`;
        try {
          const errObj = await response.json();
          errText = errObj.error || errText;
        } catch (_) {
          // Fallback if not JSON
        }
        throw new Error(errText);
      }

      const resData = await response.json();
      
      if (resData.success) {
        // Client-side auto-update/persist settings count in Firestore if server returned fresh usage (permissions resolved in client scope)
        if (typeof resData.updatedUsageCount === 'number') {
          try {
            const globalDocRef = doc(db, 'settings', 'global');
            await setDoc(globalDocRef, {
              aiTodayUsageCount: resData.updatedUsageCount,
              aiTodayResetDate: new Date().toISOString().split('T')[0]
            }, { merge: true });
          } catch (writeErr) {
            console.warn("Client side settings update failed (expected if non-admin guest):", writeErr);
          }
        }

        const assistantText = resData.replyText || "আমি দুঃখিত, আমি বুঝতে পারিনি।";
        
        // Clean and normalize slot values to prevent "null" strings from resetting memory
        const cleanSlot = (val: any) => {
          if (!val) return null;
          const s = String(val).trim().toLowerCase();
          if (s === 'null' || s === 'undefined' || s === '') return null;
          return val;
        };
        
        // Update Slots matching rules
        const updatedSlots: Slots = {
          bloodGroup: cleanSlot(resData.bloodGroup) || slots.bloodGroup,
          district: cleanSlot(resData.district) || slots.district,
          thana: cleanSlot(resData.thana) || slots.thana,
          hospital: cleanSlot(resData.hospital) || slots.hospital,
          medicalReason: cleanSlot(resData.medicalReason) || slots.medicalReason,
          contactPhone: cleanSlot(resData.contactPhone) || slots.contactPhone,
          taskMode: resData.taskMode || slots.taskMode || 'idle'
        };

        if (resData.limitReached) {
          // If limit is reached, set defaults according to the user's profile/address details
          updatedSlots.bloodGroup = currentUserProfile?.bloodGroup || slots.bloodGroup;
          updatedSlots.district = currentUserProfile?.district || slots.district;
          updatedSlots.thana = currentUserProfile?.thana || slots.thana;
          updatedSlots.contactPhone = currentUserProfile?.phone || slots.contactPhone;
          if (!updatedSlots.hospital) updatedSlots.hospital = "সদরের যেকোনো হাসপাতাল";
          if (!updatedSlots.medicalReason) updatedSlots.medicalReason = "জরুরি রক্তের প্রয়োজন";
          updatedSlots.taskMode = 'create_request'; // to trigger the default filling
        }

        setSlots(updatedSlots);

        // Append Assistant Message
        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          text: assistantText,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setIsThinking(false);

        // Speak back
        speakText(assistantText);

        // Check if full search action is triggered
        if (resData.actionTriggered && updatedSlots.bloodGroup && updatedSlots.taskMode === 'search_donors') {
          setTimeout(() => {
            onSearchDonors(
              updatedSlots.bloodGroup!, 
              updatedSlots.district || '', 
              updatedSlots.thana || ''
            );
            handleCloseAssistant();
          }, 3500); // Give user enough time to listen to the speak speech
        }

        // Check if request form is triggered
        if (resData.requestFormTriggered || (updatedSlots.taskMode === 'create_request' && updatedSlots.bloodGroup && updatedSlots.district && updatedSlots.thana && updatedSlots.hospital && updatedSlots.medicalReason)) {
          setTimeout(() => {
            onOpenRequestForm({
              bloodGroup: updatedSlots.bloodGroup || '',
              district: updatedSlots.district || '',
              thana: updatedSlots.thana || '',
              hospital: updatedSlots.hospital || '',
              medicalReason: updatedSlots.medicalReason || '',
              contactPhone: updatedSlots.contactPhone || ''
            });
            handleCloseAssistant();
          }, 4000);
        }

      } else {
        throw new Error(resData.error || "Failed backend NLP parse");
      }
    } catch (e: any) {
      console.error("AI Assistant connection failure:", e);
      setIsThinking(false);
      const errMsg = "দুঃখিত, সংযোগে কিছু ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা টাইপ করে জানান।";
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        text: errMsg,
        timestamp: new Date()
      }]);
      speakText(errMsg);
    }
  };

  return (
    <>
      {/* Floating Sparkle/Mic Action Button */}
      <AnimatePresence>
        {!isOpen && isExternalOpen === undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed z-[110] bottom-24 right-4 sm:right-6 select-none"
          >
            <div className="relative group">
              <button
                type="button"
                onClick={handleOpenAssistant}
                className="h-14 px-5 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white rounded-full flex items-center gap-3 shadow-[0_12px_45px_rgba(220,38,38,0.45)] border-2 border-white/40 cursor-pointer select-none relative z-10 hover:scale-[1.06] hover:border-white active:scale-95 transition-all text-center"
                style={{ touchAction: 'manipulation' }}
                title="রক্তবন্ধু AI সহকারী — আপনার এআই রক্তদাতা সাহায্যকারী"
                id="ai-blood-assistant-floating-btn"
              >
                {/* Micro Animated Pulse Avatar Dot/Icon */}
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center relative shadow-inner shrink-0">
                  <span className="absolute -inset-1 bg-white/30 rounded-full animate-ping opacity-60" />
                  <Droplet className="w-4 h-4 text-white fill-white stroke-[2]" />
                </div>
                
                <div className="flex flex-col text-left pr-1.5">
                  <span className="text-[12.5px] font-black uppercase tracking-wide text-white leading-tight flex items-center gap-1">
                    রক্তবন্ধু AI সহকারী <span className="text-[8px] bg-white text-red-600 font-extrabold px-1.5 py-0.5 rounded-full uppercase scale-90 tracking-normal translate-y-[-0.5px]">LIVE</span>
                  </span>
                  <span className="text-[8.5px] font-bold text-red-100/90 tracking-widest uppercase leading-none mt-0.5">
                    কথা বলুন (Voice Helper)
                  </span>
                </div>
                
                {/* Tiny blinking green radar if speech synthesis is available */}
                {window.speechSynthesis && (
                  <span className="relative flex h-2 w-2 ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main voice overlay/modal system */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAssistant}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Chat Dialog Window */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden h-[80vh] md:h-[600px]"
            >
              {/* Top Accent Bar: Gradient */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 p-2 rounded-xl">
                    <Droplet className="w-5 h-5 text-white fill-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">রক্তবন্ধু AI সহকারী</h3>
                    <p className="text-[10px] text-red-100 font-medium">রক্তদাতা খুঁজুন এবং রক্তের রিকোয়েস্ট তৈরি করুন</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                    title={isMuted ? "Unmute Voice output" : "Mute Voice output"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={handleReset} 
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                    title="Reset Dialogue flow"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleCloseAssistant} 
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Collapsible Info/Slot Tracker — Hidden by default ("উপরের প্রশ্ন গুলো হাইড থাকবে") */}
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  রক্তবন্ধু AI সহকারী ফর্ম তথ্য ট্র্যাকার
                </span>
                <button
                  type="button"
                  onClick={() => setShowSlotBoard(!showSlotBoard)}
                  className="bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] text-red-600 font-black cursor-pointer transition select-none flex items-center gap-1 shrink-0"
                >
                  {showSlotBoard ? "প্রশ্নসমূহ হাইড করুন" : "প্রশ্নসমূহ দেখুন"}
                </button>
              </div>

              {showSlotBoard && (
                <div className="bg-slate-50 border-b border-slate-100 p-3 flex gap-2 text-[10px] font-bold text-slate-600 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
                  {slots.taskMode === 'create_request' ? (
                    <>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${slots.bloodGroup ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <Droplet className={`w-3.5 h-3.5 ${slots.bloodGroup ? 'fill-red-600 stroke-red-600' : ''}`} />
                        <span>গ্রুপ: {slots.bloodGroup || 'প্রয়োজন'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${slots.district ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>জেলা: {slots.district || 'প্রয়োজন'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${slots.thana ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>থানা: {slots.thana || 'প্রয়োজন'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${slots.hospital ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <HelpCircle className="w-3.5 h-3.5 text-teal-500" />
                        <span>হাসপাতাল: {slots.hospital || 'প্রয়োজন'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${slots.medicalReason ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                        <span>সমস্যা: {slots.medicalReason || 'প্রয়োজন'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0 ${slots.contactPhone ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>নম্বর: {slots.contactPhone || 'প্রয়োজন'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 ${slots.bloodGroup ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <Droplet className={`w-3.5 h-3.5 ${slots.bloodGroup ? 'fill-red-600 stroke-red-600' : ''}`} />
                        <span>রক্তের গ্রুপ: {slots.bloodGroup || 'জিজ্ঞেস করা হবে'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 ${slots.district ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>জেলা: {slots.district || 'জিজ্ঞেস করা হবে'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 ${slots.thana ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>থানা: {slots.thana || 'জিজ্ঞেস করা হবে'}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Voice Pulse Status Bar with Autopilot microphone toggle */}
              <div className="bg-slate-50/50 px-4 py-2.5 flex items-center justify-between text-[11px] border-b border-slate-100 gap-2 shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  {isSpeaking && (
                    <span className="flex gap-1.5 items-center">
                      <span className="h-2 w-2 rounded-full bg-red-600 animate-ping shrink-0" />
                      <span className="text-red-700 font-extrabold animate-pulse truncate">আমি বলছি...</span>
                    </span>
                  )}
                  {isListening && (
                    <span className="flex gap-1.5 items-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      <span className="text-emerald-700 font-extrabold animate-pulse truncate">মাইক্রোফোন অন...</span>
                    </span>
                  )}
                  {isThinking && (
                    <span className="flex gap-1.5 items-center">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping shrink-0" />
                      <span className="text-blue-700 font-extrabold animate-pulse truncate">বিশ্লেষণ করছি...</span>
                    </span>
                  )}
                  {!isSpeaking && !isListening && !isThinking && (
                    <span className="text-slate-400 font-bold truncate">নিশ্চুপ (মাইক অফ)</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Autopilot Mic Mode Toggle switch */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !autoPilotMic;
                      setAutoPilotMic(nextVal);
                      localStorage.setItem('auto_pilot_mic', String(nextVal));
                    }}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all ${
                      autoPilotMic 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                    title="অটো পাইলট মাইক অন থাকলে উত্তর দেওয়ার পরই মাইক নিজে থেকেই চালু হয়ে যাবে।"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${autoPilotMic ? 'bg-rose-600 animate-pulse' : 'bg-slate-300'}`} />
                    <span>অটো পাইলট: {autoPilotMic ? "অন" : "অফ"}</span>
                  </button>

                  {/* Microphone Manual Toggle Control */}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isSpeaking || isThinking}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all ${
                      isListening 
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50 cursor-pointer'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-2.5 h-2.5 text-white" />
                        <span>বন্ধ করুন</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-2.5 h-2.5 text-slate-500 animate-pulse" />
                        <span>কথা বলুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scrollbar-thin">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      m.role === 'user'
                        ? 'bg-red-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                    }`}>
                      <p className="font-medium leading-relaxed leading-7">{m.text}</p>
                      
                      {/* One-click prefilled actions if limit warning has shown */}
                      {m.role === 'assistant' && m.text.includes("আমার সিস্টেমের কাজ চলমান") && (
                        <div className="mt-3 p-3 bg-red-50/90 rounded-2xl border border-red-100 space-y-2 text-slate-900 font-sans">
                          <p className="text-[11px] font-bold text-slate-800">
                            সরাসরি ১-ক্লিকে আপনার প্রোফাইল ঠিকানা ও রক্তের গ্রুপ ব্যবহার করে কাজ সম্পন্ন করুন:
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenRequestForm({
                                  bloodGroup: currentUserProfile?.bloodGroup || '',
                                  district: currentUserProfile?.district || '',
                                  thana: currentUserProfile?.thana || '',
                                  hospital: 'জরুরি যেকোনো হাসপাতাল',
                                  medicalReason: 'জরুরি রক্তের প্রয়োজন',
                                  contactPhone: currentUserProfile?.phone || ''
                                });
                                handleCloseAssistant();
                              }}
                              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold text-[10px] transition cursor-pointer select-none border-none outline-none"
                            >
                              <Plus className="w-3.5 h-3.5" /> রিকোয়েস্ট ফর্ম
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSearchDonors(
                                  currentUserProfile?.bloodGroup || '', 
                                  currentUserProfile?.district || '', 
                                  currentUserProfile?.thana || ''
                                );
                                handleCloseAssistant();
                              }}
                              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-[10px] transition cursor-pointer select-none border-none outline-none"
                            >
                              <Search className="w-3.5 h-3.5" /> ডোনার খুঁজুন
                            </button>
                          </div>
                        </div>
                      )}

                      <span className="text-[9px] block text-right mt-1 opacity-60">
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3.5 shadow-sm text-slate-400 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" />
                      </div>
                      <span className="text-xs font-semibold">এআই উত্তর লিখছে...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Slot completeness visual notification */}
              {slots.taskMode === 'create_request' && slots.bloodGroup && slots.district && slots.thana && slots.hospital && slots.medicalReason && (
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    <span>প্রয়োজনীয় সব বিবরণ পেয়েছি! রক্তের রিকোয়েস্ট ফর্মটি সম্পূর্ণ করুন।</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      onOpenRequestForm({
                        bloodGroup: slots.bloodGroup || '',
                        district: slots.district || '',
                        thana: slots.thana || '',
                        hospital: slots.hospital || '',
                        medicalReason: slots.medicalReason || '',
                        contactPhone: slots.contactPhone || ''
                      });
                      handleCloseAssistant();
                    }}
                    className="bg-emerald-600 text-white rounded-lg px-2.5 py-1 text-[10px] hover:bg-emerald-700 transition cursor-pointer shrink-0"
                  >
                    ফর্ম খুলুন
                  </button>
                </div>
              )}

              {slots.taskMode !== 'create_request' && slots.bloodGroup && (
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    <span>প্রয়োজনীয় বিবরণ পেয়েছি! আমাদের ডাটাবেস থেকে অটো ও সরাসরি চেক করা হচ্ছে।</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      onSearchDonors(slots.bloodGroup!, slots.district || '', slots.thana || '');
                      handleCloseAssistant();
                    }}
                    className="bg-emerald-600 text-white rounded-lg px-2.5 py-1 text-[10px] hover:bg-emerald-700 transition cursor-pointer shrink-0"
                  >
                    সার্চ দিন
                  </button>
                </div>
              )}

              {/* Bot Input Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="এখানে আপনার রক্তের গ্রুপ বা বার্তা লিখুন..."
                  className="flex-1 bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isThinking}
                  className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
