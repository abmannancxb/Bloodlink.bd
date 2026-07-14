import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Terminal, 
  Cpu, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Send, 
  Copy, 
  RefreshCw, 
  Clock, 
  Search, 
  Filter, 
  Server, 
  Smartphone, 
  PlayCircle, 
  Activity,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PushLog {
  id: string;
  timestamp: any;
  type: string;
  status: string;
  title: string;
  body: string;
  payload?: Record<string, any>;
  action?: string;
  errorMessage?: string;
  device?: {
    manufacturer: string;
    model: string;
    osVersion: string;
    sdkVersion: number;
    brand?: string;
    hardware?: string;
  };
}

interface PushDiagnosticsTabProps {
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const PushDiagnosticsTab: React.FC<PushDiagnosticsTabProps> = ({ addToast }) => {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Testing Fields
  const [testToken, setTestToken] = useState('');
  const [testTitle, setTestTitle] = useState('Diagnostic Test Msg');
  const [testBody, setTestBody] = useState('Hello from BloodLink Diagnostics Panel!');
  const [testBloodGroup, setTestBloodGroup] = useState('O+');
  const [testDistrict, setTestDistrict] = useState('Dhaka');
  const [testHospital, setTestHospital] = useState('Dhaka Medical College');
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    // Attempt to grab an FCM token from users in the user base to auto-fill the testToken field
    const fetchFirstFcmToken = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        for (const docSnap of usersSnap.docs) {
          const u = docSnap.data();
          if (u.fcmToken) {
            setTestToken(u.fcmToken);
            break;
          }
        }
      } catch (err) {
        console.warn('Failed to pre-fetch test FCM token:', err);
      }
    };
    fetchFirstFcmToken();

    // Subscribe to real-time logs
    const logsRef = collection(db, 'push_diagnostics');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: PushLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({
          id: docSnap.id,
          ...data,
          // Handle Firestore timestamp safe conversion
          timestamp: data.timestamp?.toDate() || new Date()
        } as PushLog);
      });
      setLogs(results);
      setLoading(false);
    }, (err) => {
      console.error("Firestore subscription error:", err);
      addToast("Subscription Error", "Could not listen to push logs in real-time.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [addToast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("Copied", "Text copied to clipboard", "success");
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to delete all diagnostic logs? This cannot be undone.")) return;
    
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'push_diagnostics'));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      addToast("Logs Cleared", "Successfully deleted all push diagnostic history.", "success");
    } catch (err: any) {
      addToast("Clear Failed", err.message || "Failed to purge logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestChatPush = async () => {
    if (!testToken.trim()) {
      addToast("Missing Token", "Please supply an FCM token to test individual chat notifications.", "error");
      return;
    }

    setDispatching(true);
    try {
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testToken,
          title: testTitle,
          body: testBody,
          type: 'chat',
          chatId: 'diagnostic-test-chat-id',
          senderId: 'diagnostic-admin-uid',
          senderName: 'System Diagnostic Bot',
          largeIcon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast("FCM Request Dispatched", `Notification queued successfully. Message ID: ${data.messageId}`, "success");
      } else {
        addToast("FCM Error", data.error || "FCM response reported failure.", "error");
      }
    } catch (err: any) {
      addToast("Dispatch Failed", err.message || "Could not make call to send-push API.", "error");
    } finally {
      setDispatching(false);
    }
  };

  const handleSendTestBroadcastPush = async () => {
    setDispatching(true);
    try {
      const res = await fetch('/api/send-push/blood-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: testBloodGroup,
          district: testDistrict,
          hospital: testHospital,
          requestId: 'diagnostic-test-request-id',
          requesterName: 'Emergency System Test'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast("FCM Broadcast Dispatched", `Regional broadcast completed! Checked donors: ${data.donorCount}`, "success");
      } else {
        addToast("FCM Error", data.error || "Broadcast reported failure.", "error");
      }
    } catch (err: any) {
      addToast("Broadcast Failed", err.message || "Could not complete API call.", "error");
    } finally {
      setDispatching(false);
    }
  };

  // Filtering logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.body.toLowerCase().includes(search.toLowerCase()) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(search.toLowerCase())) ||
      (log.device?.model && log.device.model.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || log.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      case 'FAILURE': return 'bg-rose-50 text-rose-700 border-rose-150';
      case 'INFO': return 'bg-sky-50 text-sky-700 border-sky-150';
      default: return 'bg-slate-50 text-slate-700 border-slate-150';
    }
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case 'RECEIVE': return '📥 Received (Heads-up)';
      case 'RECEIVE_FAILED': return '❌ Receive Block Failed';
      case 'ACTION_TRIGGERED': return '⚡ User Action Click';
      case 'ACTION_REPLY': return '💬 Chat Direct Reply';
      case 'ACTION_MARK_READ': return '✓ Mark As Read';
      case 'ACTION_MUTE': return '🔇 Notification Muted';
      case 'ACTION_ACCEPT_REQUEST': return '🤝 Request Accepted';
      case 'ACTION_DECLINE_REQUEST': return '✕ Request Dismissed';
      case 'NOTIFICATION_ERROR': return '⚠️ Security/Permission Err';
      case 'ACTION_FAILED': return '💥 Action execution error';
      default: return `⚙️ ${type}`;
    }
  };

  return (
    <motion.div
      key="push-diagnostics"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left"
    >
      {/* Page Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-200">
              <Activity className="text-white w-4 h-4" />
            </div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Diagnostic & Observability</p>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">FCM Native Push Service</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry and payload diagnostic tracking directly linked to our custom Android foreground and background receiver modules.
          </p>
        </div>
        
        {logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-white transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Purge History ({logs.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Test Dispatches Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-sans font-bold text-base text-slate-900">Sandbox Dispatch Tools</h3>
            <p className="text-xs text-slate-500 mt-1">Force triggers from client to verify device reception logs in real-time.</p>
          </div>

          {/* Test Option 1: Direct FCM Message */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wide">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Direct Chat Push Test</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Target FCM Token</label>
                <input 
                  type="text" 
                  value={testToken} 
                  onChange={(e) => setTestToken(e.target.value)} 
                  placeholder="Enter or paste target Android FCM Token"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono text-[11px] truncate"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Title</label>
                <input 
                  type="text" 
                  value={testTitle} 
                  onChange={(e) => setTestTitle(e.target.value)} 
                  placeholder="Notification title..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Message Body</label>
                <textarea 
                  value={testBody} 
                  onChange={(e) => setTestBody(e.target.value)} 
                  placeholder="Notification description text..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-16 resize-none focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <button
                disabled={dispatching}
                onClick={handleSendTestChatPush}
                className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 disabled:bg-slate-300 transition-all cursor-pointer"
              >
                {dispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Direct Chat Push
              </button>
            </div>
          </div>

          {/* Test Option 2: Regional Broadcast Request */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wide">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Broadcast Blood Appeal</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Blood Group</label>
                  <select 
                    value={testBloodGroup} 
                    onChange={(e) => setTestBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">District</label>
                  <input 
                    type="text" 
                    value={testDistrict} 
                    onChange={(e) => setTestDistrict(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Hospital Venue</label>
                <input 
                  type="text" 
                  value={testHospital} 
                  onChange={(e) => setTestHospital(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                disabled={dispatching}
                onClick={handleSendTestBroadcastPush}
                className="w-full bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-600 disabled:bg-rose-300 transition-all cursor-pointer shadow-md shadow-rose-100"
              >
                {dispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                Broadcast Emergency Push
              </button>
            </div>
          </div>

        </div>

        {/* Real-time Telemetry Live Log Feed */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-base text-slate-900 flex items-center gap-2">
                Telemetry Log stream
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Capturing raw event dumps from background receivers in real-time.</p>
            </div>

            {/* Quick Status Pill Counters */}
            <div className="flex items-center gap-2 text-[10px] font-black">
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full">
                SUCCESS: {logs.filter(l => l.status === 'SUCCESS').length}
              </span>
              <span className="px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-600 rounded-full">
                FAILURE: {logs.filter(l => l.status === 'FAILURE').length}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search logs, errors, devices..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILURE">Failure Only</option>
                <option value="INFO">Info Only</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Cpu className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none cursor-pointer appearance-none"
              >
                <option value="ALL">All Types</option>
                <option value="RECEIVE">Receive Events</option>
                <option value="ACTION_TRIGGERED">Action Click Triggers</option>
                <option value="ACTION_REPLY">Direct Chat Reply</option>
                <option value="ACTION_MARK_READ">Mark As Read Action</option>
                <option value="ACTION_MUTE">Mute Actions</option>
                <option value="ACTION_ACCEPT_REQUEST">Request Accepted Action</option>
                <option value="ACTION_DECLINE_REQUEST">Decline Dismissals</option>
                <option value="NOTIFICATION_ERROR">Permission Errors</option>
                <option value="ACTION_FAILED">Action Failures</option>
                <option value="RECEIVE_FAILED">Receipt Failures</option>
              </select>
            </div>

          </div>

          {/* Logs List Container */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
                <span className="text-xs">Establishing real-time stream channel...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 space-y-2">
                <Terminal className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold">No diagnostic logs match your filter criteria.</p>
                <p className="text-[10px] text-slate-500">Trigger test notifications on the left to see new live stream logs here.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div 
                    key={log.id} 
                    className="border border-slate-100 rounded-2xl hover:border-slate-200 bg-white shadow-2xs overflow-hidden transition-all text-xs"
                  >
                    {/* Header bar of Log Card */}
                    <div 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/20 hover:bg-slate-50/70"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Log Type Label */}
                          <span className="font-bold text-slate-800">
                            {getLogTypeLabel(log.type)}
                          </span>
                          
                          {/* Status Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>

                        {/* Title and Body brief */}
                        <div className="text-slate-600 font-medium">
                          {log.title} <span className="text-slate-400 font-normal">|</span> {log.body}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-[10px] text-slate-400">
                        {/* Time elapsed / time */}
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {log.timestamp instanceof Date 
                            ? log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'Unknown Time'
                          }
                        </span>

                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Expandable Details Tray */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Device & Client Info */}
                            <div className="space-y-2">
                              <h4 className="font-sans font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-slate-400" />
                                Reporting Device Info
                              </h4>
                              {log.device ? (
                                <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-1.5 text-slate-600">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Manufacturer:</span>
                                    <span className="font-semibold text-slate-700">{log.device.manufacturer}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Model:</span>
                                    <span className="font-semibold text-slate-700">{log.device.model}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Android Version:</span>
                                    <span className="font-mono text-slate-700">OS {log.device.osVersion} (SDK {log.device.sdkVersion})</span>
                                  </div>
                                  {log.device.brand && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Brand / Hardware:</span>
                                      <span className="text-slate-700">{log.device.brand} / {log.device.hardware}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-slate-400 text-[11px] italic p-3 bg-white border border-slate-100 rounded-xl">No device attributes provided in log report.</p>
                              )}
                            </div>

                            {/* Actions / Errors */}
                            <div className="space-y-2">
                              <h4 className="font-sans font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                <Server className="w-3 h-3 text-slate-400" />
                                Execution Status
                              </h4>
                              <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-1.5 text-slate-600 h-full">
                                {log.action && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Triggered Action:</span>
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700 truncate max-w-[180px]" title={log.action}>
                                      {log.action.split('.').pop()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Internal Document ID:</span>
                                  <span className="font-mono text-[10px] text-slate-700">{log.id}</span>
                                </div>
                                {log.errorMessage ? (
                                  <div className="mt-2 text-rose-600 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50 break-words font-mono text-[11px]">
                                    <strong>Error Trace:</strong> {log.errorMessage}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-emerald-600 bg-emerald-50/30 p-2 rounded-xl border border-emerald-100/30 font-semibold flex items-center gap-1 text-[11px]">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Completed without internal exceptions.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Raw Intent / RemoteMessage Data Payload Map */}
                          {log.payload && Object.keys(log.payload).length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-sans font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                  <Terminal className="w-3 h-3 text-slate-400" />
                                  Intent Data Extras / RemoteMessage Payload Map
                                </h4>
                                <button 
                                  onClick={() => copyToClipboard(JSON.stringify(log.payload, null, 2))}
                                  className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-[10px] border border-slate-200 bg-white rounded-lg px-2 py-1 hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy JSON
                                </button>
                              </div>
                              <pre className="bg-slate-900 text-slate-300 font-mono text-[11px] leading-relaxed p-4 rounded-xl overflow-x-auto shadow-inner select-all max-h-[250px]">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          )}

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </motion.div>
  );
};
