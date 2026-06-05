import { User as FirebaseUser } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bloodGroup: string;
  district: string;
  thana: string;
  phone: string;
  isAvailable: boolean;
  photoURL?: string;
  lastDonationDate?: string;
  fcmToken?: string;
  role?: 'user' | 'admin';
  isBlocked?: boolean;
  isVerified?: boolean;
  organizationId?: string;
  organizationName?: string;
  donationCount?: number;
  lastSeen?: any;
  followers?: string[];
  gender?: 'male' | 'female' | 'other';
  nextDonationEligibility?: string;
  coverURL?: string;
  username?: string;
}

export function getDonorId(profile: UserProfile, allUsers: UserProfile[] = []) {
  if (profile.username) {
    return `BDNR-${profile.username.toUpperCase()}`;
  }
  // Stable sorting of all users who do not have a username by their uid
  const sortedWithoutUsername = [...allUsers]
    .filter(u => !u.username)
    .sort((a, b) => a.uid.localeCompare(b.uid));
    
  let index = sortedWithoutUsername.findIndex(u => u.uid === profile.uid);
  if (index === -1) {
    // If not found in the filtered list, check in the complete list
    const sortedAll = [...allUsers].sort((a, b) => a.uid.localeCompare(b.uid));
    index = sortedAll.findIndex(u => u.uid === profile.uid);
  }
  
  const serialNo = index !== -1 ? index + 1 : 1;
  const padded = String(serialNo).padStart(2, '0');
  return `BDNR-${padded}`;
}

export interface DonationRecord {
  id: string;
  requestId?: string;
  date: any; 
  hospitalName: string;
  bloodGroup: string;
  requesterName?: string;
  createdAt: any;
}

export interface SystemSettings {
  googleMapsApiKey?: string;
  googleMapsMapId?: string;
  showDistrictRequests?: boolean;
  showGroupRequests?: boolean;
  showDonorsOnMap?: boolean;
  defaultLat?: number;
  defaultLng?: number;
  // Login Page Settings
  showLoginOrg?: boolean;
  showLoginGuest?: boolean;
  showLoginGoogle?: boolean;
  // SEO Pages editable content
  seoAbout?: string;
  seoContact?: string;
  seoPrivacy?: string;
  seoTerms?: string;
  seoFaq?: string;
  // AI Assistant configuration
  aiEnginePreference?: 'both_gemini' | 'both_groq' | 'gemini' | 'groq' | 'openai';
  geminiApiKeyOverride?: string;
  groqApiKeyOverride?: string;
  openaiApiKeyOverride?: string;
  aiDailyLimit?: number;
  aiTodayUsageCount?: number;
  aiTodayResetDate?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  district: string;
  thana: string;
  contact: string;
  adminUid: string;
  memberCount: number;
  createdAt: any;
}

export interface OrganizationMember {
  userId: string;
  displayName: string;
  bloodGroup: string;
  status: 'active' | 'blocked';
  joinedAt: any;
}

export interface BloodRequest {
  id: string;
  requesterUid: string;
  requesterName: string;
  requesterPhoto?: string;
  bloodGroup: string;
  district: string;
  thana: string;
  hospital: string;
  hospitalAddress?: string;
  lat?: number;
  lng?: number;
  unitsNeeded: number;
  urgency: 'Urgent' | 'Normal';
  medicalReason: string;
  contactPhone: string;
  contactCount?: number;
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  createdAt: any;
}

export interface CommunityPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  authorBloodGroup?: string;
  content: string;
  imageUrl?: string;
  likes?: string[];
  dislikes?: string[];
  commentCount?: number;
  reportCount?: number;
  isHidden?: boolean;
  createdAt: any;
}

export interface Toast {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  requestId?: string;
  timestamp: number;
}

export interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type: 'danger' | 'info' | 'warning';
  onResolve: (value: boolean) => void;
}

export interface Report {
  id: string;
  targetId: string;
  targetType: 'post' | 'comment';
  targetContent?: string;
  reportedBy: string;
  reportedByName?: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: any;
}

export interface PostComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  linkView?: string;
  createdAt: any;
  isRead: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt: any;
  unreadCount?: { [uid: string]: number };
  otherUser?: UserProfile;
  typing?: { [uid: string]: boolean };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  read?: boolean;
  type?: 'text' | 'call';
  callId?: string;
  callDuration?: number;
  callStatus?: VoiceCall['status'];
}

export interface VoiceCall {
  id: string;
  callerUid: string;
  callerName: string;
  callerPhoto?: string;
  receiverUid: string;
  receiverName: string;
  receiverPhoto?: string;
  status: 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy';
  offer?: any;
  answer?: any;
  createdAt: any;
  connectedAt?: any;
  endedAt?: any;
}

export interface OrganizationApplication {
  id: string;
  applicantUid: string;
  applicantName: string;
  applicantEmail: string;
  orgName: string;
  description: string;
  district: string;
  thana: string;
  contact: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export { BANGLADESH_LOCATIONS, BLOOD_GROUPS } from './constants';
