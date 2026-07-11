import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Download, 
  Terminal, 
  Cpu, 
  Clock, 
  HardDrive 
} from 'lucide-react';
import { motion } from 'motion/react';

interface AndroidBuildState {
  status: 'idle' | 'building' | 'success' | 'failed';
  logs: string;
  updatedAt: string;
  downloadReady: boolean;
}

interface AndroidBuildTabProps {
  addToast: (title: string, body: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export default function AndroidBuildTab({ addToast }: AndroidBuildTabProps) {
  const [buildState, setBuildState] = useState<AndroidBuildState>({
    status: 'idle',
    logs: 'No build started yet. Click "Start Android compilation & Sync" to compile production web assets and sync native Capacitor code.',
    updatedAt: '',
    downloadReady: false
  });
  const [isPolling, setIsPolling] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch current build status
  const fetchStatus = async (silent = false) => {
    try {
      const res = await fetch('/api/admin/build-android/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          setBuildState(data.state);
          if (data.state.status === 'building') {
            setIsPolling(true);
          } else {
            setIsPolling(false);
          }
        }
      }
    } catch (err) {
      if (!silent) {
        addToast('Connection Error', 'Could not fetch Android build status from the server.', 'error');
      }
    }
  };

  // Trigger a new Android build
  const triggerBuild = async () => {
    if (buildState.status === 'building') {
      addToast('Build Active', 'A compilation is already running in the background.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/admin/build-android', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBuildState(data.state);
        setIsPolling(true);
        addToast('Build Initiated', 'Android compilation and synchronization started successfully in the background.', 'success');
      } else {
        addToast('Build Failed to Start', data.message || 'The server rejected the build request.', 'error');
      }
    } catch (err) {
      addToast('Error', 'Failed to communicate with Android build system.', 'error');
    }
  };

  // Polling hook when status is 'building'
  useEffect(() => {
    fetchStatus(true); // Initial fetch on tab mount
  }, []);

  useEffect(() => {
    let intervalId: any = null;
    if (isPolling) {
      intervalId = setInterval(() => {
        fetchStatus(true);
      }, 3000); // Poll every 3 seconds
    } else {
      if (intervalId) clearInterval(intervalId);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling]);

  // Auto scroll console logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [buildState.logs]);

  // Format date helper
  const formatTime = (isoString: string) => {
    if (!isoString) return 'Never';
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left"
    >
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile App Integration</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Capacitor Android Builder</h2>
          <p className="text-xs text-slate-500 mt-1">
            Build production-ready React web assets, sync them with Capacitor Native APIs, and download the finished Android project source code.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchStatus()}
            className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer border border-slate-200 flex items-center gap-2"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin text-rose-500' : ''}`} />
          </button>
          <button
            onClick={triggerBuild}
            disabled={buildState.status === 'building'}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shrink-0 cursor-pointer ${
              buildState.status === 'building'
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{buildState.status === 'building' ? 'Compiling...' : 'Start Android Build'}</span>
          </button>
        </div>
      </div>

      {/* Grid of details & logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Download */}
        <div className="space-y-6">
          {/* Build Info Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Build Configuration</h3>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-slate-400">Application Package ID</span>
                <span className="text-xs font-bold text-slate-900 font-mono">com.bloodlink.bangladesh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-slate-400">Application Title</span>
                <span className="text-xs font-bold text-slate-900">BloodLink Bangladesh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-slate-400">Compilation Bridge</span>
                <span className="text-xs font-bold text-slate-900 font-mono">Capacitor v8 (Android SDK)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-slate-400">Current Compilation State</span>
                <span className="flex items-center gap-1.5">
                  {buildState.status === 'building' && (
                    <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      Building
                    </span>
                  )}
                  {buildState.status === 'success' && (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Success
                    </span>
                  )}
                  {buildState.status === 'failed' && (
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="w-2.5 h-2.5" />
                      Failed
                    </span>
                  )}
                  {buildState.status === 'idle' && (
                    <span className="px-2.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                      Idle
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-slate-400">Last Compiled Log Time</span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatTime(buildState.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Download Box */}
          {buildState.downloadReady && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-50/50 rounded-3xl border border-emerald-100 p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                  <Download className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Distribution Ready</h3>
                  <p className="text-[10px] text-emerald-600 font-bold">Android Gradle Source Packaged</p>
                </div>
              </div>
              
              <p className="text-xs text-emerald-800/80 leading-relaxed font-sans">
                The compiled native project with your integrated Vite bundle and plugins is fully synchronized, packaged, and cached.
              </p>

              <a
                href="/api/admin/build-android/download"
                className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-700 font-bold"
              >
                <Download className="w-4 h-4" />
                Download Android Source Zip
              </a>
            </motion.div>
          )}

          {/* Interactive Guides Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-rose-500" />
                APK Generation & Deployment Guide
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">Generate a production APK for any Android phone in minutes:</p>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100/60 space-y-1">
                <p className="font-black text-rose-900 text-[10px] uppercase tracking-wide">Step 1: Download & Extract</p>
                <p className="text-rose-800/80 leading-relaxed text-[11px]">
                  Click the <strong>Download Android Source Zip</strong> button above and extract the downloaded zip file on your local computer.
                </p>
              </div>

              <div className="p-3 bg-sky-50/40 rounded-2xl border border-sky-100/60 space-y-1">
                <p className="font-black text-sky-900 text-[10px] uppercase tracking-wide">Step 2: Generate APK via Android Studio</p>
                <p className="text-sky-800/80 leading-relaxed text-[11px]">
                  Open <strong>Android Studio</strong>, choose <strong>Open an Existing Project</strong>, and select the extracted <strong>android</strong> folder. Once indexing is finished, click:
                </p>
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-xl font-mono text-[10px] mt-2 select-all leading-snug border border-slate-850">
                  Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)
                </div>
                <p className="text-[10px] text-sky-700/80 mt-1">
                  Android Studio will instantly generate the installable <span className="font-mono bg-sky-100 px-1 rounded text-sky-800">app-debug.apk</span> file for you.
                </p>
              </div>

              <div className="p-3 bg-amber-50/40 rounded-2xl border border-amber-100/60 space-y-1">
                <p className="font-black text-amber-900 text-[10px] uppercase tracking-wide">Alternative: Direct Command Line Build</p>
                <p className="text-amber-800/80 leading-relaxed text-[11px]">
                  If you have Gradle installed on your computer, navigate into the extracted directory in your terminal and run:
                </p>
                <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-[10px] mt-2 select-all border border-slate-850">
                  cd android && ./gradlew assembleDebug
                </div>
                <p className="text-[10px] text-amber-700/80 mt-1">
                  The generated APK will be available in <span className="font-mono">app/build/outputs/apk/debug/app-debug.apk</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Console Logs */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-[400px]">
          <div className="bg-slate-950 rounded-3xl border border-slate-900 shadow-2xl p-6 flex flex-col flex-1 h-full min-h-[400px]">
            {/* Console Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-[10px] font-black font-mono tracking-widest text-slate-400 uppercase">System Build Output logs</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              </div>
            </div>

            {/* Console Log Area */}
            <div className="flex-1 overflow-y-auto max-h-[450px] min-h-[300px] text-left bg-slate-950 font-mono text-xs text-slate-300 p-4 rounded-2xl select-text leading-relaxed whitespace-pre-wrap selection:bg-slate-800 select-all scrollbar-thin scrollbar-thumb-slate-800">
              {buildState.logs}
              <div ref={consoleEndRef} />
            </div>

            {/* Console Footer */}
            <div className="pt-3 border-t border-slate-900 mt-4 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-mono">Process ID: capacitor-bundler-daemon</span>
              <span className="text-[10px] text-slate-500 font-mono">Lines: {buildState.logs.split('\n').length}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
