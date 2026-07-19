import { BloodRequest, UserProfile, CommunityPost, HealthTip, AppEvent, Organization, AdminCustomBanner, SystemSettings } from './types';

export const mockSettings: SystemSettings = {
  googleMapsApiKey: "",
  googleMapsMapId: "",
  showDistrictRequests: true,
  showGroupRequests: true,
  showDonorsOnMap: true,
  defaultLat: 23.8103,
  defaultLng: 90.4125,
  showLoginOrg: true,
  showLoginGuest: true,
  showLoginGoogle: false,
  homeShowEmergencyBanner: true,
  homeShowMap: true,
  homeShowNearestDonor: true,
  homeShowLiveFeed: true,
  homeShowMetrics: true,
  homeShowQuickActions: true,
};

export const mockRequests: BloodRequest[] = [
  {
    id: "req_fallback_1",
    requesterUid: "user_fallback_alice",
    requesterName: "Dr. Alice Rahman",
    bloodGroup: "O+",
    district: "Dhaka",
    thana: "Dhanmondi",
    hospital: "Dhanmondi General Hospital",
    hospitalAddress: "Road 8/A, Dhanmondi, Dhaka",
    lat: 23.7461,
    lng: 90.3742,
    unitsNeeded: 2,
    urgency: "Critical",
    medicalReason: "Emergency open-heart surgery. Patient is critical.",
    contactPhone: "+8801712345678",
    contactCount: 4,
    status: "Pending",
    createdAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 }
  },
  {
    id: "req_fallback_2",
    requesterUid: "user_fallback_bob",
    requesterName: "Kamal Uddin",
    bloodGroup: "B-",
    district: "Chittagong",
    thana: "Chittagong Sadar",
    hospital: "Chittagong Medical College Hospital",
    hospitalAddress: "CMCH Road, Chittagong",
    lat: 22.3569,
    lng: 91.8123,
    unitsNeeded: 1,
    urgency: "Urgent",
    medicalReason: "Thalassemia patient regular monthly transfusion transfusion.",
    contactPhone: "+8801812345679",
    contactCount: 2,
    status: "Pending",
    createdAt: { seconds: Date.now() / 1000 - 7200, nanoseconds: 0 }
  },
  {
    id: "req_fallback_3",
    requesterUid: "user_fallback_charlie",
    requesterName: "Nusrat Jahan",
    bloodGroup: "AB-",
    district: "Sylhet",
    thana: "Sylhet Sadar",
    hospital: "Sylhet MAG Osmani Medical College",
    hospitalAddress: "Osmani Hospital Road, Sylhet",
    lat: 24.8949,
    lng: 91.8687,
    unitsNeeded: 3,
    urgency: "Normal",
    medicalReason: "Scheduled chemotherapy support blood backup.",
    contactPhone: "+8801912345680",
    contactCount: 1,
    status: "Pending",
    createdAt: { seconds: Date.now() / 1000 - 14400, nanoseconds: 0 }
  },
  {
    id: "req_fallback_4",
    requesterUid: "user_fallback_david",
    requesterName: "Imran Ahmed",
    bloodGroup: "A+",
    district: "Dhaka",
    thana: "Mirpur",
    hospital: "Mirpur Heart Foundation",
    hospitalAddress: "Plot 4, Road 2, Section 2, Mirpur, Dhaka",
    lat: 23.8056,
    lng: 90.3625,
    unitsNeeded: 2,
    urgency: "Urgent",
    medicalReason: "Accident trauma surgery backup support.",
    contactPhone: "+8801512345681",
    contactCount: 3,
    status: "Fulfilled",
    createdAt: { seconds: Date.now() / 1000 - 86400, nanoseconds: 0 }
  }
];

export const mockDonors: UserProfile[] = [
  {
    uid: "donor_fallback_1",
    displayName: "Anisur Rahman",
    email: "anis@bloodlink.org",
    bloodGroup: "O+",
    district: "Dhaka",
    thana: "Dhanmondi",
    phone: "+8801711111111",
    isAvailable: true,
    donationCount: 8,
    gender: "male",
    isVerified: true,
    lastDonationDate: "2026-04-10",
    statusBubble: "Ready to save lives!",
    username: "anis_donor"
  },
  {
    uid: "donor_fallback_2",
    displayName: "Sultana Yasmin",
    email: "sultana@bloodlink.org",
    bloodGroup: "B-",
    district: "Chittagong",
    thana: "Chittagong Sadar",
    phone: "+8801811111112",
    isAvailable: true,
    donationCount: 4,
    gender: "female",
    isVerified: true,
    lastDonationDate: "2026-02-15",
    statusBubble: "Always active for B- groups.",
    username: "sultana_active"
  },
  {
    uid: "donor_fallback_3",
    displayName: "Tanvir Hasan",
    email: "tanvir@bloodlink.org",
    bloodGroup: "AB-",
    district: "Sylhet",
    thana: "Sylhet Sadar",
    phone: "+8801911111113",
    isAvailable: true,
    donationCount: 2,
    gender: "male",
    isVerified: false,
    lastDonationDate: "2025-11-20",
    statusBubble: "Contact for emergency AB- requests.",
    username: "tanvir_ab_neg"
  },
  {
    uid: "donor_fallback_4",
    displayName: "Fariha Kabir",
    email: "fariha@bloodlink.org",
    bloodGroup: "A+",
    district: "Dhaka",
    thana: "Mirpur",
    phone: "+8801511111114",
    isAvailable: true,
    donationCount: 11,
    gender: "female",
    isVerified: true,
    lastDonationDate: "2026-05-01",
    statusBubble: "Eligible and willing to donate.",
    username: "fariha_k"
  }
];

export const mockPosts: CommunityPost[] = [
  {
    id: "post_fallback_1",
    authorUid: "donor_fallback_1",
    authorName: "Anisur Rahman",
    authorBloodGroup: "O+",
    content: "Just completed my 8th blood donation today at Dhanmondi General Hospital! It feels absolutely amazing to know that a single unit can save up to 3 lives. Let's make blood donation a regular habit, friends! ❤️🩸 #SaveLives #BloodDonation",
    likes: ["user_fallback_bob", "user_fallback_charlie"],
    dislikes: [],
    commentCount: 2,
    createdAt: { seconds: Date.now() / 1000 - 1800, nanoseconds: 0 }
  },
  {
    id: "post_fallback_2",
    authorUid: "user_fallback_bob",
    authorName: "Kamal Uddin",
    authorBloodGroup: "B-",
    content: "Heartfelt gratitude to the BloodLink community! Yesterday we urgently needed B- blood for our Thalassemia patient, and a matching donor responded and came to Chittagong Medical College within an hour. You guys are real heroes! 🙏🏼🚀",
    likes: ["donor_fallback_1", "donor_fallback_4", "user_fallback_alice"],
    dislikes: [],
    commentCount: 1,
    createdAt: { seconds: Date.now() / 1000 - 10800, nanoseconds: 0 }
  }
];

export const mockHealthTips: HealthTip[] = [
  {
    id: "tip_fallback_1",
    title: "Essential Tips for First-Time Blood Donors",
    content: "1. Eat a healthy meal rich in iron and drink plenty of water before your donation.\n2. Get a good night's rest (at least 7-8 hours) prior to donating.\n3. Keep your donor card or national identity card ready.\n4. Wear comfortable clothing with sleeves that can easily be rolled up.\n5. Take 15-20 minutes to relax and eat a light snack after donation before leaving the center.",
    createdBy: "admin_fallback",
    readTime: "3 min read",
    likes: ["donor_fallback_1", "donor_fallback_2"],
    createdAt: { seconds: Date.now() / 1000 - 86400, nanoseconds: 0 }
  },
  {
    id: "tip_fallback_2",
    title: "Post-Donation Recovery Best Practices",
    content: "1. Stay hydrated! Drink extra fluids for the next 24 to 48 hours.\n2. Avoid strenuous physical activity or heavy lifting for the rest of the day.\n3. Keep the band-aid on your arm clean and dry for at least 4-5 hours.\n4. If you feel dizzy, lie down with your feet elevated until the feeling passes.\n5. Eat iron-rich foods like spinach, meat, beans, and raisins to replenish your blood supply.",
    createdBy: "admin_fallback",
    readTime: "4 min read",
    likes: ["donor_fallback_3"],
    createdAt: { seconds: Date.now() / 1000 - 172800, nanoseconds: 0 }
  }
];

export const mockEvents: AppEvent[] = [
  {
    id: "event_fallback_1",
    title: "Mega Voluntary Blood Donation Campaign 2026",
    description: "Join us in our annual mega campaign to collect blood for public hospital banks and create awareness about voluntary blood donation. Special badges and digital certificates for all active donors!",
    location: "National Museum Auditorium Ground, Shahbagh, Dhaka",
    eventDate: "2026-08-15",
    status: "Active",
    createdAt: { seconds: Date.now() / 1000 - 172800, nanoseconds: 0 },
    createdBy: "admin_fallback",
    joinedUsers: ["donor_fallback_1", "donor_fallback_4"]
  },
  {
    id: "event_fallback_2",
    title: "World Blood Donor Day Seminar & Gathering",
    description: "An educational seminar highlighting safe clinical transfusion practices and thanking voluntary blood donors for their life-saving gifts.",
    location: "Chittagong Medical College Auditorium, Chittagong",
    eventDate: "2026-06-14",
    status: "Passed",
    createdAt: { seconds: Date.now() / 1000 - 518400, nanoseconds: 0 },
    createdBy: "admin_fallback",
    joinedUsers: ["donor_fallback_2"]
  }
];

export const mockOrganizations: Organization[] = [
  {
    id: "org_fallback_1",
    name: "Sandhani CMCH Branch",
    description: "One of the premier medical student-run voluntary blood donation organizations, coordinating daily critical requests in Chittagong region.",
    district: "Chittagong",
    thana: "Chittagong Sadar",
    contact: "+8801811112222",
    adminUid: "donor_fallback_2",
    memberCount: 24,
    createdAt: { seconds: Date.now() / 1000 - 1000000, nanoseconds: 0 }
  },
  {
    id: "org_fallback_2",
    name: "Badhan Dhaka University",
    description: "A voluntary blood donors' association run by Dhaka University students, serving emergency patients with dedicated service 24/7.",
    district: "Dhaka",
    thana: "Ramna",
    contact: "+8801711113333",
    adminUid: "donor_fallback_1",
    memberCount: 85,
    createdAt: { seconds: Date.now() / 1000 - 2000000, nanoseconds: 0 }
  }
];

export const mockBanners: AdminCustomBanner[] = [
  {
    id: "banner_fallback_1",
    title: "Running in Offline Mode",
    subtitle: "Due to Firebase limit, we have preloaded offline simulated content so all features stay fully testable!",
    buttonText: "Register as Donor",
    buttonLink: "#",
    bgColor: "from-amber-500 to-orange-600",
    isActive: true,
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
  }
];
