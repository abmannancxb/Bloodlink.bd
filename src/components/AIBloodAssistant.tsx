import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  HelpCircle
} from 'lucide-react';

interface AIBloodAssistantProps {
  onSearchDonors: (bloodGroup: string, district: string, thana: string) => void;
  onOpenRequestForm: () => void;
  currentUser: any;
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
}

export default function AIBloodAssistant({ 
  onSearchDonors, 
  onOpenRequestForm, 
  currentUser 
}: AIBloodAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [slots, setSlots] = useState<Slots>({
    bloodGroup: null,
    district: null,
    thana: null
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
      // Automatically resume listening if assistant is still open
      if (isOpen) {
        startListening();
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isOpen) {
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
  };

  const handleReset = () => {
    stopSpeaking();
    stopListening();
    setSlots({
      bloodGroup: null,
      district: null,
      thana: null
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
          slots: slots
        })
      });

      const resData = await response.json();
      
      if (resData.success) {
        const assistantText = resData.replyText || "আমি দুঃখিত, আমি বুঝতে পারিনি।";
        
        // Clean and normalize slot values to prevent "null" strings from resetting memory
        const cleanSlot = (val: any) => {
          if (!val) return null;
          const s = String(val).trim().toLowerCase();
          if (s === 'null' || s === 'undefined' || s === '') return null;
          return val;
        };
        
        // Update Slots matching rules
        const updatedSlots = {
          bloodGroup: cleanSlot(resData.bloodGroup) || slots.bloodGroup,
          district: cleanSlot(resData.district) || slots.district,
          thana: cleanSlot(resData.thana) || slots.thana
        };
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
        if (resData.actionTriggered && updatedSlots.bloodGroup) {
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
        if (resData.requestFormTriggered) {
          setTimeout(() => {
            onOpenRequestForm();
            handleCloseAssistant();
          }, 3500);
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
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed z-[110] bottom-24 right-6 select-none"
          >
            <div className="relative group">
              {/* Soft purple/red pulsate bubble effect */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse" />
              
              <button
                type="button"
                onClick={handleOpenAssistant}
                className="w-16 h-16 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full flex flex-col items-center justify-center shadow-2xl border-2 border-white cursor-pointer select-none relative z-10 hover:scale-[1.08] active:scale-95 transition-all text-center"
                style={{ touchAction: 'manipulation' }}
                title="AI Blood Finder"
                id="ai-blood-assistant-floating-btn"
              >
                <Sparkles className="w-5 h-5 text-white stroke-[2.5] mb-0.5 animate-bounce" />
                <span className="text-[7.5px] font-black uppercase tracking-widest text-red-100 leading-tight block">
                  AI Voice<br />Assistant
                </span>
                
                {/* Small indicator if speech recognizer exists */}
                {window.speechSynthesis && (
                  <span className="absolute bottom-1 right-1 flex h-2 w-2">
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
                    <Sparkles className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">AI ব্লাড অ্যাসিস্ট্যান্ট</h3>
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

              {/* Real-time parameters Slot Board */}
              <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-around text-xs font-bold text-slate-600 gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${slots.bloodGroup ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                  <Droplet className={`w-3.5 h-3.5 ${slots.bloodGroup ? 'fill-red-600 stroke-red-600' : ''}`} />
                  <span>রক্তের গ্রুপ: {slots.bloodGroup || 'জিজ্ঞেস করা হবে'}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${slots.district ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>জেলা: {slots.district || 'জিজ্ঞেস করা হবে'}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${slots.thana ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>থানা: {slots.thana || 'জিজ্ঞেস করা হবে'}</span>
                </div>
              </div>

              {/* Voice Pulse Status Bar */}
              <div className="bg-slate-50/50 px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {isSpeaking && (
                    <span className="flex gap-1 items-center">
                      <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                      <span className="text-red-700 font-extrabold animate-pulse">আমি বলছি...</span>
                    </span>
                  )}
                  {isListening && (
                    <span className="flex gap-1 items-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-emerald-700 font-extrabold animate-pulse">মাইক্রোফোন অন (বলুন)...</span>
                    </span>
                  )}
                  {isThinking && (
                    <span className="flex gap-1 items-center">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-blue-700 font-extrabold animate-pulse">তথ্য বিশ্লেষণ করছি...</span>
                    </span>
                  )}
                  {!isSpeaking && !isListening && !isThinking && (
                    <span className="text-slate-400 font-semibold">নিশ্চুপ (মাইক্রোফোন অফ)</span>
                  )}
                </div>

                {/* Microphone Toggle Control */}
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isSpeaking || isThinking}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3 h-3 text-white" />
                      <span>বন্ধ করুন</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-slate-500 animate-pulse" />
                      <span>কথা বলুন</span>
                    </>
                  )}
                </button>
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
              {slots.bloodGroup && (
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    <span>প্রয়োজনীয় বিবরণ পেয়েছি! আমাদের ডাটাবেস থেকে অটো ও সরাসরি চেক করা হচ্ছে।</span>
                  </div>
                  <button 
                    onClick={() => {
                      onSearchDonors(slots.bloodGroup!, slots.district || '', slots.thana || '');
                      handleCloseAssistant();
                    }}
                    className="bg-emerald-600 text-white rounded-lg px-2.5 py-1 text-[10px] hover:bg-emerald-700 transition"
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
