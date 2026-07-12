var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_firestore = require("firebase-admin/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "gen-lang-client-0156966945",
  appId: "1:275980342094:web:28d30228f2689c0530841f",
  apiKey: "AIzaSyCQGaOC4tl9yOp37eyqdYcOYkCLAPI5qzI",
  authDomain: "gen-lang-client-0156966945.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-9c1a2b2f-5129-4d0b-8cc7-0a1f276a52d2",
  storageBucket: "gen-lang-client-0156966945.firebasestorage.app",
  messagingSenderId: "275980342094",
  measurementId: ""
};

// server.ts
var import_genai = require("@google/genai");

// src/constants.ts
var BANGLADESH_LOCATIONS = {
  "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
  "Bandarban": ["Bandarban Sadar", "Thanchi", "Lama", "Naikhongchhari", "Ali Kadam", "Rowangchhari", "Ruma"],
  "Barguna": ["Barguna Sadar", "Amtali", "Betagi", "Bamna", "Patharghata", "Taltali"],
  "Barisal": ["Barisal Sadar", "Bakerganj", "Babuganj", "Wazirpur", "Banaripara", "Gauranadi", "Agailjhara", "Mehendiganj", "Muladi", "Hizla"],
  "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
  "Bogra": ["Bogra Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatola"],
  "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Akhaura", "Bancharampur", "Bijoynagar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
  "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab North", "Matlab South", "Shahrasti"],
  "Chapai Nawabganj": ["Chapai Nawabganj Sadar", "Bholahat", "Gomastapur", "Nachole", "Shibganj"],
  "Chittagong": ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda", "Chittagong Sadar"],
  "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
  "Comilla": ["Comilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Lalmai", "Meghna", "Monohargonj", "Muradnagar", "Nangalkot", "Titas"],
  "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Pekua"],
  "Dhaka": ["Adabor", "Badda", "Bangsal", "Bimanbandar", "Cantonment", "Chak Bazar", "Darus Salam", "Demra", "Dhanmondi", "Gendaria", "Gulshan", "Hazaribagh", "Jatrabari", "Kadamtali", "Kafrul", "Kalabagan", "Kamrangirchar", "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh", "Mirpur", "Mohammadpur", "Motijheel", "New Market", "Pallabi", "Paltan", "Ramna", "Rampura", "Sabujbagh", "Shah Ali", "Shahbagh", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon", "Tejgaon Industrial Area", "Turag", "Uttara", "Uttar Khan", "Vatara", "Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"],
  "Dinajpur": ["Dinajpur Sadar", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Phulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
  "Faridpur": ["Faridpur Sadar", "Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
  "Feni": ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Sonagazi", "Fulgazi"],
  "Gaibandha": ["Gaibandha Sadar", "Phulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
  "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
  "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  "Habiganj": ["Habiganj Sadar", "Ajmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Lakhai", "Madhabpur", "Nabiganj", "Sayestaganj"],
  "Jamalpur": ["Jamalpur Sadar", "Bakshiganj", "Dewanganj", "Islampur", "Madarganj", "Melenandaha", "Sarishabari"],
  "Jessore": ["Jessore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
  "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"],
  "Jhenaidah": ["Jhenaidah Sadar", "Harinakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
  "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
  "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"],
  "Khulna": ["Khulna Sadar", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada"],
  "Kishoreganj": ["Kishoreganj Sadar", "Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"],
  "Kurigram": ["Kurigram Sadar", "Bhurungamari", "Char Rajibpur", "Chilmari", "Phulbari", "Nageshwari", "Rajarhat", "Raumari", "Ulipur"],
  "Kushtia": ["Kushtia Sadar", "Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Mirpur"],
  "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
  "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"],
  "Madaripur": ["Madaripur Sadar", "Kalkini", "Rajoir", "Shibganj"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  "Manikganj": ["Manikganj Sadar", "Singair", "Shibalaya", "Saturia", "Harirampur", "Ghior", "Daulatpur"],
  "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
  "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
  "Munshiganj": ["Munshiganj Sadar", "Sreenagar", "Sirajdikhan", "Lauhajang", "Gajaria", "Tongibari"],
  "Mymensingh": ["Mymensingh Sadar", "Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Nandail", "Phulpur", "Trishal", "Tara Khanda"],
  "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
  "Narail": ["Narail Sadar", "Lohagara", "Kalia"],
  "Narayanganj": ["Narayanganj Sadar", "Araihazar", "Bandar", "Rupganj", "Sonargaon"],
  "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
  "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
  "Netrokona": ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Purbadhala"],
  "Nilphamari": ["Nilphamari Sadar", "Saidpur", "Jaldhaka", "Kishoreganj", "Domar", "Dimla"],
  "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companyganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"],
  "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
  "Panchagarh": ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"],
  "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Dashmina", "Galachipa", "Kalapara", "Mirzaganj", "Dumki", "Rangabali"],
  "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Zianagar"],
  "Rajbari": ["Rajbari Sadar", "Baliakandi", "Goalandaghat", "Pangsha", "Kalukhali"],
  "Rajshahi": ["Rajshahi Sadar", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"],
  "Rangamati": ["Rangamati Sadar", "Belaichhari", "Bagaichhari", "Barkal", "Juraichhari", "Rajasthali", "Kaptai", "Langadu", "Nanichar", "Kawkhali"],
  "Rangpur": ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
  "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
  "Shariatpur": ["Shariatpur Sadar", "Damudya", "Gosairhat", "Naria", "Zajira", "Bhedarganj"],
  "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"],
  "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Tarash", "Ullahpara"],
  "Sunamganj": ["Sunamganj Sadar", "Bishwamvarpur", "Chhatak", "Derai", "Dharamapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Tahirpur", "South Sunamganj"],
  "Sylhet": ["Sylhet Sadar", "Balaganj", "Beanibazar", "Bishwanath", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "South Surma", "Zakiganj"],
  "Tangail": ["Tangail Sadar", "Basail", "Bhuapur", "Delduar", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Dhanbari"],
  "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Ranisankail", "Pirganj"]
};

// server.ts
var import_groq_sdk = __toESM(require("groq-sdk"), 1);
var import_openai = __toESM(require("openai"), 1);
try {
  if (import_firebase_admin.default.apps.length === 0) {
    import_firebase_admin.default.initializeApp({
      projectId: firebase_applet_config_default.projectId
    });
  }
} catch (err) {
  console.error("Error initializing firebase-admin in server.ts:", err.message);
}
var adminDb = (0, import_firestore.getFirestore)(firebase_applet_config_default.firestoreDatabaseId || "(default)");
async function getSitemapXml() {
  const host = "bloodlink.bd";
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
  const lastMod = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  views.forEach((v) => {
    xml += `  <url>
`;
    xml += `    <loc>${baseUrl}${v.path}</loc>
`;
    xml += `    <lastmod>${lastMod}</lastmod>
`;
    xml += `    <changefreq>${v.changefreq}</changefreq>
`;
    xml += `    <priority>${v.priority}</priority>
`;
    xml += `  </url>
`;
  });
  try {
    const postsSnapshot = await adminDb.collection("posts").get();
    if (!postsSnapshot.empty) {
      postsSnapshot.forEach((docSnap) => {
        const postData = docSnap.data();
        if (postData && !postData.isHidden) {
          const postId = docSnap.id;
          let postLastMod = lastMod;
          try {
            if (postData.createdAt) {
              let dateObj = null;
              if (typeof postData.createdAt.toDate === "function") {
                dateObj = postData.createdAt.toDate();
              } else if (postData.createdAt._seconds) {
                dateObj = new Date(postData.createdAt._seconds * 1e3);
              } else if (typeof postData.createdAt === "string" || typeof postData.createdAt === "number") {
                dateObj = new Date(postData.createdAt);
              } else if (postData.createdAt instanceof Date) {
                dateObj = postData.createdAt;
              }
              if (dateObj && !isNaN(dateObj.getTime())) {
                postLastMod = dateObj.toISOString().split("T")[0];
              }
            }
          } catch (e) {
          }
          xml += `  <url>
`;
          xml += `    <loc>${baseUrl}/story/${postId}</loc>
`;
          xml += `    <lastmod>${postLastMod}</lastmod>
`;
          xml += `    <changefreq>weekly</changefreq>
`;
          xml += `    <priority>0.75</priority>
`;
          xml += `  </url>
`;
        }
      });
    }
  } catch (err) {
    console.warn("Could not retrieve active posts for sitemap generation:", err.message);
  }
  try {
    const usersSnapshot = await adminDb.collection("users").get();
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData && userData.uid) {
          xml += `  <url>
`;
          xml += `    <loc>${baseUrl}/public-profile?uid=${userData.uid}</loc>
`;
          xml += `    <lastmod>${lastMod}</lastmod>
`;
          xml += `    <changefreq>weekly</changefreq>
`;
          xml += `    <priority>0.6</priority>
`;
          xml += `  </url>
`;
        }
      });
    }
  } catch (err) {
    console.warn("Could not retrieve active user profiles for sitemap generation:", err.message);
  }
  xml += `</urlset>`;
  return xml;
}
var inMemoryAiSettings = {
  aiEnginePreference: "openai",
  geminiApiKeyOverride: "",
  groqApiKeyOverride: "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",
  openaiApiKeyOverride: "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",
  aiDailyLimit: 500,
  aiTodayUsageCount: 0,
  aiTodayResetDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.post("/api/gemini/blood-assistant", async (req, res) => {
    try {
      const { message, history, slots, currentUserPhone, donors, settings: clientSettings } = req.body;
      let geminiApiKey = process.env.GEMINI_API_KEY || "";
      let groqApiKey = process.env.GROQ_API_KEY || "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";
      let openaiApiKey = process.env.OPENAI_API_KEY || "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";
      let aiEnginePreference = inMemoryAiSettings.aiEnginePreference;
      let aiDailyLimit = inMemoryAiSettings.aiDailyLimit;
      let aiTodayUsageCount = inMemoryAiSettings.aiTodayUsageCount;
      let aiTodayResetDate = inMemoryAiSettings.aiTodayResetDate;
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (inMemoryAiSettings.aiTodayResetDate !== todayStr) {
        inMemoryAiSettings.aiTodayUsageCount = 0;
        inMemoryAiSettings.aiTodayResetDate = todayStr;
      }
      let isFirestoreOperational = false;
      try {
        const settingsDoc = await adminDb.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
          const settingsData = settingsDoc.data() || {};
          if (settingsData.geminiApiKeyOverride && settingsData.geminiApiKeyOverride.trim() !== "") {
            geminiApiKey = settingsData.geminiApiKeyOverride.trim();
            inMemoryAiSettings.geminiApiKeyOverride = settingsData.geminiApiKeyOverride.trim();
          }
          if (settingsData.groqApiKeyOverride && settingsData.groqApiKeyOverride.trim() !== "") {
            groqApiKey = settingsData.groqApiKeyOverride.trim();
            inMemoryAiSettings.groqApiKeyOverride = settingsData.groqApiKeyOverride.trim();
          }
          if (settingsData.openaiApiKeyOverride && settingsData.openaiApiKeyOverride.trim() !== "") {
            openaiApiKey = settingsData.openaiApiKeyOverride.trim();
            inMemoryAiSettings.openaiApiKeyOverride = settingsData.openaiApiKeyOverride.trim();
          } else {
            try {
              await adminDb.collection("settings").doc("global").set({
                openaiApiKeyOverride: "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",
                aiEnginePreference: "openai"
              }, { merge: true });
              openaiApiKey = "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";
              inMemoryAiSettings.openaiApiKeyOverride = "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";
              aiEnginePreference = "openai";
              inMemoryAiSettings.aiEnginePreference = "openai";
            } catch (err) {
              console.warn("Could not auto-populate OpenAI key in existing Firestore settings:", err.message);
            }
          }
          if (settingsData.aiEnginePreference) {
            aiEnginePreference = settingsData.aiEnginePreference;
            inMemoryAiSettings.aiEnginePreference = settingsData.aiEnginePreference;
          } else {
            aiEnginePreference = "openai";
            inMemoryAiSettings.aiEnginePreference = "openai";
          }
          if (typeof settingsData.aiDailyLimit === "number") {
            aiDailyLimit = settingsData.aiDailyLimit;
            inMemoryAiSettings.aiDailyLimit = settingsData.aiDailyLimit;
          }
          aiTodayResetDate = settingsData.aiTodayResetDate || "";
          aiTodayUsageCount = typeof settingsData.aiTodayUsageCount === "number" ? settingsData.aiTodayUsageCount : 0;
          if (aiTodayResetDate !== todayStr) {
            aiTodayUsageCount = 0;
            aiTodayResetDate = todayStr;
            try {
              await adminDb.collection("settings").doc("global").set({
                aiTodayUsageCount: 0,
                aiTodayResetDate: todayStr
              }, { merge: true });
            } catch (err) {
            }
          }
          inMemoryAiSettings.aiTodayUsageCount = aiTodayUsageCount;
          inMemoryAiSettings.aiTodayResetDate = aiTodayResetDate;
          isFirestoreOperational = true;
        } else {
          try {
            await adminDb.collection("settings").doc("global").set({
              aiEnginePreference: "openai",
              geminiApiKeyOverride: "",
              groqApiKeyOverride: "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",
              openaiApiKeyOverride: "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",
              aiDailyLimit: 500,
              aiTodayUsageCount: 0,
              aiTodayResetDate: todayStr
            });
            isFirestoreOperational = true;
            aiEnginePreference = "openai";
            groqApiKey = "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";
            openaiApiKey = "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";
          } catch (err) {
            console.warn("Could not auto-create missing Firestore settings:", err.message);
          }
        }
      } catch (settingsError) {
        console.warn("Firestore settings read permission restricted. Falling back to in-memory configurations dashboard:", settingsError.message || settingsError);
      }
      if (clientSettings) {
        if (clientSettings.aiEnginePreference) {
          aiEnginePreference = clientSettings.aiEnginePreference;
          inMemoryAiSettings.aiEnginePreference = clientSettings.aiEnginePreference;
        }
        if (clientSettings.geminiApiKeyOverride && clientSettings.geminiApiKeyOverride.trim() !== "") {
          geminiApiKey = clientSettings.geminiApiKeyOverride.trim();
          inMemoryAiSettings.geminiApiKeyOverride = clientSettings.geminiApiKeyOverride.trim();
        }
        if (clientSettings.groqApiKeyOverride && clientSettings.groqApiKeyOverride.trim() !== "") {
          groqApiKey = clientSettings.groqApiKeyOverride.trim();
          inMemoryAiSettings.groqApiKeyOverride = clientSettings.groqApiKeyOverride.trim();
        }
        if (clientSettings.openaiApiKeyOverride && clientSettings.openaiApiKeyOverride.trim() !== "") {
          openaiApiKey = clientSettings.openaiApiKeyOverride.trim();
          inMemoryAiSettings.openaiApiKeyOverride = clientSettings.openaiApiKeyOverride.trim();
        }
        if (typeof clientSettings.aiDailyLimit === "number") {
          aiDailyLimit = clientSettings.aiDailyLimit;
          inMemoryAiSettings.aiDailyLimit = clientSettings.aiDailyLimit;
        }
        if (typeof clientSettings.aiTodayUsageCount === "number") {
          if (clientSettings.aiTodayUsageCount > inMemoryAiSettings.aiTodayUsageCount) {
            inMemoryAiSettings.aiTodayUsageCount = clientSettings.aiTodayUsageCount;
          }
        }
      }
      if (!isFirestoreOperational) {
        if (inMemoryAiSettings.geminiApiKeyOverride && inMemoryAiSettings.geminiApiKeyOverride.trim() !== "") {
          geminiApiKey = inMemoryAiSettings.geminiApiKeyOverride;
        }
        if (inMemoryAiSettings.groqApiKeyOverride && inMemoryAiSettings.groqApiKeyOverride.trim() !== "") {
          groqApiKey = inMemoryAiSettings.groqApiKeyOverride;
        }
        if (inMemoryAiSettings.openaiApiKeyOverride && inMemoryAiSettings.openaiApiKeyOverride.trim() !== "") {
          openaiApiKey = inMemoryAiSettings.openaiApiKeyOverride;
        }
        aiEnginePreference = inMemoryAiSettings.aiEnginePreference;
        aiDailyLimit = inMemoryAiSettings.aiDailyLimit;
        aiTodayUsageCount = inMemoryAiSettings.aiTodayUsageCount;
        aiTodayResetDate = inMemoryAiSettings.aiTodayResetDate;
      }
      if (aiTodayUsageCount >= aiDailyLimit) {
        console.warn(`AI assistant message limit reached! Current count: ${aiTodayUsageCount}, Daily limit: ${aiDailyLimit}`);
        return res.status(200).json({
          success: true,
          replyText: "\u0986\u09AE\u09BE\u09B0 \u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE\u09C7\u09B0 \u0995\u09BE\u099C \u099A\u09B2\u09AE\u09BE\u09A8, \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C1\u09AF\u09BC\u09BE\u09B2\u09BF \u0996\u09C1\u0981\u099C\u09C7 \u09A8\u09BF\u09A8\u0964 \u09A6\u09C1\u0983\u0996\u09BF\u09A4\u0964",
          limitReached: true,
          bloodGroup: slots?.bloodGroup || null,
          district: slots?.district || null,
          thana: slots?.thana || null,
          hospital: slots?.hospital || null,
          medicalReason: slots?.medicalReason || null,
          contactPhone: slots?.contactPhone || null,
          taskMode: slots?.taskMode || "idle",
          actionTriggered: false,
          requestFormTriggered: false,
          updatedUsageCount: aiTodayUsageCount
        });
      }
      const selectedDistrict = slots?.district;
      const locationsPreview = {};
      const allDistricts = Object.keys(BANGLADESH_LOCATIONS);
      locationsPreview["AvailableDistricts_ChooseOne"] = allDistricts;
      if (selectedDistrict && BANGLADESH_LOCATIONS[selectedDistrict]) {
        locationsPreview[`Thanas_For_${selectedDistrict}`] = BANGLADESH_LOCATIONS[selectedDistrict];
      } else {
        const matchedDist = allDistricts.find((d) => d.toLowerCase() === String(selectedDistrict).trim().toLowerCase());
        if (matchedDist) {
          locationsPreview[`Thanas_For_${matchedDist}`] = BANGLADESH_LOCATIONS[matchedDist];
        } else {
          locationsPreview["Note"] = "Thanas Checklist for correct matching will be provided dynamically here once values are stored in slots.district.";
        }
      }
      const simpleDonorsList = Array.isArray(donors) ? donors.map((d) => ({
        name: d.displayName || d.name || "",
        bloodGroup: d.bloodGroup || "",
        lastDonationDate: d.lastDonationDate || "\u0995\u0996\u09A8\u09CB \u09B0\u0995\u09CD\u09A4 \u09A6\u09C7\u09A8\u09A8\u09BF \u09AC\u09BE \u09A4\u09A5\u09CD\u09AF \u09A8\u09C7\u0987"
      })) : [];
      const systemInstruction = `You are a highly intelligent, polite, and friendly Bangla (\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C0 \u09AC\u09BE\u0982\u09B2\u09BE) voice and text assistant for 'BloodLink Bangladesh', behaving as Gemini Artificial Intelligence (\u099C\u09BF\u09AE\u09BF\u09A8\u09BF \u0986\u09B0\u09CD\u099F\u09BF\u09AB\u09BF\u09B6\u09BF\u09DF\u09BE\u09B2 \u098F\u0986\u0987).

Core Guidelines & Conversational Paths:
1. GREETINGS, SALAM & CHAT (\u09B8\u09BE\u09B2\u09BE\u09AE, \u09B6\u09C1\u09AD\u09C7\u099A\u09CD\u099B\u09BE \u0993 \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u0986\u09B2\u09BE\u09AA\u09A8):
   - Always reply in Bengali (\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C0 \u09AC\u09BE\u0982\u09B2\u09BE) unless the user requests another language.
   - If the user greets you with Salam ("\u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE\u09C1 \u0986\u09B2\u09BE\u0987\u0995\u09C1\u09AE" or "\u09B8\u09BE\u09B2\u09BE\u09AE"), respond warmly with: "\u0993\u09DF\u09BE\u09B2\u09BE\u0987\u0995\u09C1\u09AE \u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE! \u0986\u09B6\u09BE \u0995\u09B0\u09BF \u0986\u09B2\u09CD\u09B2\u09BE\u09B9\u09B0 \u09B0\u09B9\u09AE\u09A4\u09C7 \u09AD\u09BE\u09B2\u09CB \u0986\u099B\u09C7\u09A8\u0964 \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09B0\u0995\u09CD\u09A4\u09AC\u09A8\u09CD\u09A7\u09C1 AI \u09B8\u09B9\u0995\u09BE\u09B0\u09C0\u0964 \u0986\u099C \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0995\u09C0\u09AD\u09BE\u09AC\u09C7 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF?"
   - Keep the tone friendly, professional, and concise. Ensure negative space, clean spacing and clear, short Bengali answers.
   - Ask only necessary questions. Never ask for information already available in the user's account automatically.
   - Always keep responses highly conversational and short, offering button options where available. Button format: [\u09AC\u09BE\u099F\u09A8 \u099F\u09C7\u0995\u09CD\u09B8\u099F].
   - If the user is just saying hello or greeting you, keep "taskMode" as "idle". Do NOT invent or ask for blood group/district unless they explicitly requested help to find blood.

2. GENERAL AI KNOWLEDGE (\u09AF\u09C7\u0995\u09CB\u09A8 \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09C7\u09B0 \u0989\u09A4\u09CD\u09A4\u09B0):
   - You are Gemini AI. If the user asks general, educational, science, medical, or other common questions (e.g., "\u09A4\u09C1\u09AE\u09BF \u0995\u09C7?", "\u099C\u09BF\u09AE\u09BF\u09A8\u09BF \u0995\u09BF?", "\u09B0\u0995\u09CD\u09A4 \u09A6\u09BF\u09B2\u09C7 \u0995\u09BF \u0995\u09CD\u09B7\u09A4\u09BF \u09B9\u09DF?", "\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 \u0995\u09CB\u09A8 \u09AE\u09B9\u09BE\u09A6\u09C7\u09B6\u09C7?", "\u09AA\u09BE\u09A8\u09BF\u09B0 \u0989\u09CE\u09B8 \u0995\u09BF?", "\u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A8\u09C7\u09B0 \u0989\u09AA\u0995\u09BE\u09B0\u09BF\u09A4\u09BE \u0995\u09C0?"), do NOT reject them or tell them to only ask about blood. Respond with accurate, highly informative, polite, and concise explanations in standard Bangla as Gemini AI.
   - For these general questions, keep "taskMode" as "idle" (or maintain their current ongoing flow), and NEVER say "\u0986\u09AE\u09BF \u0995\u09C7\u09AC\u09B2 \u09B0\u0995\u09CD\u09A4 \u09B8\u0982\u0995\u09CD\u09B0\u09BE\u09A8\u09CD\u09A4 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF". Beautifully answer their query first! Keep all previously unprovided parameters as null.

3. PATH A: Donor Search & Nearby Donors ("taskMode": "search_donors")
   - Use when the user wants to search, view, or find nearby donors (e.g., "\u0993 \u09AA\u099C\u09BF\u099F\u09BF\u09AD \u09A1\u09CB\u09A8\u09BE\u09B0 \u09B2\u09BE\u0997\u09AC\u09C7", "\u09A8\u09BF\u0995\u099F\u09AC\u09B0\u09CD\u09A4\u09C0 \u0993 \u09AA\u099C\u09BF\u099F\u09BF\u09AD \u09A1\u09CB\u09A8\u09BE\u09B0 \u09A6\u09C7\u0996\u09BE\u0993", "\u0995\u0995\u09CD\u09B8\u09AC\u09BE\u099C\u09BE\u09B0\u09C7 \u0993 \u09AA\u099C\u09BF\u099F\u09BF\u09AD \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE \u0986\u099B\u09C7?").
   - Required slots: 'bloodGroup' (e.g., "O+", "A+"), 'district' (matching BANGLADESH_LOCATIONS key), and 'thana' (matching sub-array values).
   - If the user says "A+ donor needed" or similar, save "A+" as bloodGroup and start search immediately for the location.
   - You must collect Blood Group and Location (district, thana). Once both are present, set 'actionTriggered' to true and 'taskMode' to "search_donors".
   - Extract location and blood groups directly, register them, and ask for any missing parameters one by one in polite Bangla, recommending choices using button syntax [\u09AC\u09BE\u099F\u09A8].
   - Valid bloodGroup values: A+, A-, B+, B-, AB+, AB-, O+, O-. Normalize terms like "\u0993 \u09AA\u099C\u09BF\u099F\u09BF\u09AD" to "O+", "\u09AC\u09BF \u09AA\u099C\u09BF\u099F\u09BF\u09AD" to "B+", etc.
   - Match Bangla/English locations to the BANGLADESH_LOCATIONS keys (English) like "Dhaka", "Chittagong" or sub-districts like "Mirpur", "Uttara".
   - Once location and bloodGroup slots are filled, set 'actionTriggered' to true. Set 'replyText' to: "\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6, \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09CD\u09B0\u09A6\u09A4\u09CD\u09A4 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0997\u09CD\u09B0\u09C1\u09AA (\${bloodGroup}) \u098F\u09AC\u0982 \u098F\u09B2\u09BE\u0995\u09BE (\${thana}, \${district}) \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09A8\u09BF\u0995\u099F\u09AC\u09B0\u09CD\u09A4\u09C0 \u0989\u09AA\u09AF\u09C1\u0995\u09CD\u09A4 \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE \u0996\u09C1\u0981\u099C\u099B\u09BF..."

4. PATH B: Post Blood Request & Create Blood Request ("taskMode": "create_request")
   - Use when the user states they need/require blood or want to post a blood request (e.g., "\u09AC\u09CD\u09B2\u09BE\u09A1 \u09B2\u09BE\u0997\u09AC\u09C7", "\u09B0\u0995\u09CD\u09A4 \u09B2\u09BE\u0997\u09AC\u09C7", "\u09AC\u09CD\u09B2\u09BE\u09A1 \u09A6\u09B0\u0995\u09BE\u09B0", "\u098F\u0995\u099F\u09BF \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8", "\u0986\u09AC\u09C7\u09A6\u09A8 \u0995\u09B0\u09C1\u09A8", "\u099C\u09B0\u09C1\u09B0\u09BF \u0993 \u09AA\u099C\u09BF\u099F\u09BF\u09AD \u09B0\u0995\u09CD\u09A4 \u09A6\u09B0\u0995\u09BE\u09B0" or "\u0986\u09AE\u09BE\u09B0 \u09AC\u09BE\u09AC\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09B0\u0995\u09CD\u09A4 \u09B2\u09BE\u0997\u09AC\u09C7").
   - AI SMART FEATURE: If user says "\u0986\u09AE\u09BE\u09B0 \u09AC\u09BE\u09AC\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09B0\u0995\u09CD\u09A4 \u09B2\u09BE\u0997\u09AC\u09C7", automatically ask for Blood Group, Bags, Hospital, and Emergency level all at once or one-by-one with beautiful option chips!
   - Follow these exact creation steps to secure slots:
     * Step 1: Determine blood group needed. Ask with buttons:
       "\u{1FA78} \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0997\u09CD\u09B0\u09C1\u09AA?
[A+] [A-] [B+] [B-] [O+] [O-] [AB+] [AB-]"
     * Step 2: Ask for missing details politely, one by one:
       - Number of units required (Save inside 'medicalReason' slot, e.g., "\u09E8 \u09AC\u09CD\u09AF\u09BE\u0997")
       - Hospital name (Save inside 'hospital' slot)
       - Emergency level (Urgent / Normal) (Save inside 'medicalReason' slot, e.g., "\u09E8 \u09AC\u09CD\u09AF\u09BE\u0997, \u099C\u09B0\u09C1\u09B0\u09BF")
     * Step 3: Use the logged-in user's mobile number automatically. If "\${currentUserPhone || ''}" is not empty, show:
       "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0: \${currentUserPhone}
\u098F\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u099A\u09BE\u09A8?
[\u09B9\u09CD\u09AF\u09BE\u0981] [\u09A8\u09BE]"
       If they confirm, set 'contactPhone' to that number. If missing or they choose "\u09A8\u09BE", ask politely for their contact mobile number in Bangla.
     * Step 4: Generate a preview exactly as shown:
       "\u2705 \u09B0\u09BF\u0995\u09C1\u09AF\u09BC\u09C7\u09B8\u09CD\u099F \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4

       \u0997\u09CD\u09B0\u09C1\u09AA: \${bloodGroup || ''}
       \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3: \${medicalReason || ''}
       \u09B9\u09BE\u09B8\u09AA\u09BE\u09A4\u09BE\u09B2: \${hospital || ''}
       \u09AE\u09CB\u09AC\u09BE\u0987\u09B2: \${contactPhone || ''}
       \u0985\u0997\u09CD\u09B0\u09BE\u09A7\u09BF\u0995\u09BE\u09B0: \${medicalReason?.includes('\u099C\u09B0\u09C1\u09B0\u09BF') ? '\u099C\u09B0\u09C1\u09B0\u09BF' : '\u09A8\u09B0\u09AE\u09BE\u09B2'}

       \u09B0\u09BF\u0995\u09C1\u09AF\u09BC\u09C7\u09B8\u09CD\u099F\u099F\u09BF \u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09A4\u09C7 \u099A\u09BE\u09A8?
       [\u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8] [\u098F\u09A1\u09BF\u099F \u0995\u09B0\u09C1\u09A8]"
     * Step 5: Only after explicit confirmation (e.g., user says "\u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8" or clicks [\u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8]), set 'requestFormTriggered' to true. Never create or post without explicit confirmation.
   - Save volume/quantity and emergency parameters inside the 'medicalReason' slot exactly.
   - Ask for missing details one by one politely in Bangla. Never guess or hallucinate parameters. Maintain previously collected values.
   - Follow Step 3 for contact phone tracking default values and verification.
     * Ensure the user's phone is correctly stored once confirmed.
     * Set 'contactPhone' properly as instructed in Step 3.
   - When all request parameters are collected, show the preview to the user as defined in Step 4. Only trigger 'requestFormTriggered' to true if they confirm with "\u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8" as defined in Step 5.

PATH C: Donor Lookup ("taskMode": "donor_lookup")
- Use when the user asks about a specific donor by name (e.g. "\u09B0\u09AB\u09BF\u0995 \u09B6\u09C7\u09B7 \u0995\u09AC\u09C7 \u09B0\u0995\u09CD\u09A4 \u09A6\u09BF\u09DF\u09C7\u099B\u09C7?", "\u0995\u09B0\u09BF\u09AE\u09C7\u09B0 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0997\u09CD\u09B0\u09C1\u09AA \u0995\u09C0?").
- Match the requested name in the provided 'donors' list below.
- Available Donors List:
  ${JSON.stringify(simpleDonorsList)}

Conversational Steps & Parameter Memory Rules:
1. SLOT RETENTION: You MUST carry forward and return the non-null values provided in "Current extracted slots state" in your final JSON response keys.
2. Directivenes: Ask for only ONE missing slot at a time politely, in Bangla. You MUST NOT invent, guess, or assume values.

Current extracted slots state from previous turns:
- bloodGroup: ${slots?.bloodGroup || "null"}
- district: ${slots?.district || "null"}
- thana: ${slots?.thana || "null"}
- hospital: ${slots?.hospital || "null"}
- medicalReason: ${slots?.medicalReason || "null"}
- contactPhone: ${slots?.contactPhone || "null"}
- activeMode: ${slots?.taskMode || "idle"}

Valid locations map for matching districts and thanas (English names):
${JSON.stringify(locationsPreview)}

Always output STRICT valid JSON matching the following schema. Always answer in clear, polite standard Bangla dialogue.
Response JSON Schema:
{
  "replyText": string (Bangla response),
  "bloodGroup": string or null (e.g. "O+", "A+", etc),
  "district": string or null (matching keys of BANGLADESH_LOCATIONS like "Dhaka"),
  "thana": string or null (matching values of BANGLADESH_LOCATIONS like "Mirpur"),
  "hospital": string or null,
  "medicalReason": string or null,
  "contactPhone": string or null,
  "taskMode": "search_donors" | "create_request" | "donor_lookup" | "idle",
  "actionTriggered": boolean,
  "requestFormTriggered": boolean
}`;
      let responseText = "{}";
      let usedEngine = "";
      const tryGemini = async () => {
        if (!geminiApiKey) {
          console.warn("Gemini API key is not configured.");
          return false;
        }
        const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
        for (const currentModel of modelsToTry) {
          try {
            console.log(`Using Gemini SDK with model: ${currentModel}...`);
            const ai = new import_genai.GoogleGenAI({
              apiKey: geminiApiKey,
              httpOptions: {
                headers: {
                  "User-Agent": "aistudio-build"
                }
              }
            });
            const chatMessages = [
              ...(history || []).map((msg) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.text }]
              })),
              {
                role: "user",
                parts: [{ text: message }]
              }
            ];
            const response = await ai.models.generateContent({
              model: currentModel,
              contents: chatMessages,
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    replyText: { type: import_genai.Type.STRING },
                    bloodGroup: { type: import_genai.Type.STRING },
                    district: { type: import_genai.Type.STRING },
                    thana: { type: import_genai.Type.STRING },
                    hospital: { type: import_genai.Type.STRING },
                    medicalReason: { type: import_genai.Type.STRING },
                    contactPhone: { type: import_genai.Type.STRING },
                    taskMode: { type: import_genai.Type.STRING },
                    actionTriggered: { type: import_genai.Type.BOOLEAN },
                    requestFormTriggered: { type: import_genai.Type.BOOLEAN }
                  },
                  required: [
                    "replyText",
                    "bloodGroup",
                    "district",
                    "thana",
                    "hospital",
                    "medicalReason",
                    "contactPhone",
                    "taskMode",
                    "actionTriggered",
                    "requestFormTriggered"
                  ]
                }
              }
            });
            if (response && response.text) {
              responseText = response.text;
              usedEngine = `gemini (${currentModel})`;
              return true;
            }
          } catch (geminiError) {
            console.error(`Gemini model ${currentModel} error:`, geminiError.message || geminiError);
          }
        }
        return false;
      };
      const tryGroq = async () => {
        if (!groqApiKey) {
          console.warn("Groq API key is not configured.");
          return false;
        }
        try {
          console.log("Using Groq API Key...");
          const groq = new import_groq_sdk.default({ apiKey: groqApiKey });
          const chatMessages = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((msg) => ({
              role: msg.role === "assistant" ? "assistant" : "user",
              content: msg.text
            })),
            { role: "user", content: message }
          ];
          const chatCompletion = await groq.chat.completions.create({
            messages: chatMessages,
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.1
          });
          if (chatCompletion && chatCompletion.choices?.[0]?.message?.content) {
            responseText = chatCompletion.choices[0].message.content;
            usedEngine = "groq";
            return true;
          }
          return false;
        } catch (groqError) {
          console.error("Groq API error during query:", groqError.message || groqError);
          return false;
        }
      };
      const tryOpenAI = async () => {
        if (!openaiApiKey) {
          console.warn("OpenAI API key is not configured.");
          return false;
        }
        try {
          console.log("Using OpenAI API Key with gpt-4o-mini...");
          const openai = new import_openai.default({ apiKey: openaiApiKey });
          const chatMessages = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((msg) => ({
              role: msg.role === "assistant" ? "assistant" : "user",
              content: msg.text
            })),
            { role: "user", content: message }
          ];
          const chatCompletion = await openai.chat.completions.create({
            messages: chatMessages,
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.1
          });
          if (chatCompletion && chatCompletion.choices?.[0]?.message?.content) {
            responseText = chatCompletion.choices[0].message.content;
            usedEngine = "openai";
            return true;
          }
          return false;
        } catch (openaiError) {
          console.error("OpenAI API error during query:", openaiError.message || openaiError);
          return false;
        }
      };
      if (aiEnginePreference === "openai") {
        const ok = await tryOpenAI();
        if (!ok) {
          console.log("OpenAI failed, trying fallback to Gemini...");
          const okGem = await tryGemini();
          if (!okGem) {
            console.log("Gemini fallback also failed, trying fallback to Groq...");
            await tryGroq();
          }
        }
      } else if (aiEnginePreference === "gemini") {
        await tryGemini();
      } else if (aiEnginePreference === "groq") {
        await tryGroq();
      } else if (aiEnginePreference === "both_groq") {
        const ok = await tryGroq();
        if (!ok) {
          console.log("Groq failed or limit exceeded, trying fallback to Gemini...");
          await tryGemini();
        }
      } else {
        const ok = await tryGemini();
        if (!ok) {
          console.log("Gemini failed or limit exceeded, trying fallback to Groq...");
          await tryGroq();
        }
      }
      if (!usedEngine) {
        console.warn("All available AI Engines failed or keys are missing. Triggering precise fallback error.");
        const textCleaned = String(message || "").toLowerCase();
        let replyText = "\u0986\u09AE\u09BE\u09B0 \u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE\u09C7\u09B0 \u0995\u09BE\u099C \u099A\u09B2\u09AE\u09BE\u09A8, \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AE\u09CD\u09AF\u09BE\u09A8\u09C1\u09AF\u09BC\u09BE\u09B2\u09BF \u0996\u09C1\u0981\u099C\u09C7 \u09A8\u09BF\u09A8\u0964 \u09A6\u09C1\u0983\u0996\u09BF\u09A4\u0964";
        let finalTaskMode = slots?.taskMode || "idle";
        const isGreeting = textCleaned.includes("\u09B9\u09CD\u09AF\u09BE\u09B2\u09CB") || textCleaned.includes("\u09B9\u09BE\u0987") || textCleaned.includes("hello") || textCleaned.includes("hi") || textCleaned.includes("\u09B8\u09BE\u09B2\u09BE\u09AE") || textCleaned.includes("salam") || textCleaned.includes("\u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE\u09C1");
        const isIntro = textCleaned.includes("\u0995\u09C7 \u09A4\u09C1\u09AE\u09BF") || textCleaned.includes("\u09A4\u09C1\u09AE\u09BF \u0995\u09C7") || textCleaned.includes("\u09AA\u09B0\u09BF\u099A\u09DF") || textCleaned.includes("who are you") || textCleaned.includes("your name");
        const isBenefits = textCleaned.includes("\u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A8") || textCleaned.includes("\u0989\u09AA\u0995\u09BE\u09B0\u09BF\u09A4\u09BE") || textCleaned.includes("\u09B0\u0995\u09CD\u09A4 \u09A6\u09BF\u09B2\u09C7") || textCleaned.includes("benefit");
        const isThanks = textCleaned.includes("\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6") || textCleaned.includes("thanks") || textCleaned.includes("thank you") || textCleaned.includes("\u09A5\u09CD\u09AF\u09BE\u0999\u09CD\u0995");
        if (isGreeting) {
          replyText = "\u0993\u09DF\u09BE\u09B2\u09BE\u0987\u0995\u09C1\u09AE \u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE! \u0986\u09B6\u09BE \u0995\u09B0\u09BF \u0986\u09B2\u09CD\u09B2\u09BE\u09B9\u09B0 \u09B0\u09B9\u09AE\u09A4\u09C7 \u09AD\u09BE\u09B2\u09CB \u0986\u099B\u09C7\u09A8\u0964 \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09B0\u0995\u09CD\u09A4\u09AC\u09A8\u09CD\u09A7\u09C1 AI \u09B8\u09B9\u0995\u09BE\u09B0\u09C0\u0964 \u0986\u099C \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0995\u09C0\u09AD\u09BE\u09AC\u09C7 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF? \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE \u0996\u09C1\u0981\u099C\u09A4\u09C7 \u09AC\u09BE \u0986\u09AC\u09C7\u09A6\u09A8 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09A4\u09C7 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0997\u09CD\u09B0\u09C1\u09AA \u09A6\u09BF\u09DF\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u0995\u09B0\u09C1\u09A8!";
        } else if (isIntro) {
          replyText = "\u0986\u09AE\u09BF \u09AC\u09CD\u09B2\u09BE\u09A1\u09B2\u09BF\u0999\u09CD\u0995 \u098F\u0986\u0987 (BloodLink AI) \u09B8\u09B9\u0995\u09BE\u09B0\u09C0\u0964 \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0997\u09CD\u09B0\u09C1\u09AA \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09B8\u09CD\u09AC\u09C7\u099A\u09CD\u099B\u09BE\u09B8\u09C7\u09AC\u09C0 \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE \u0996\u09C1\u0981\u099C\u09C7 \u09AA\u09C7\u09A4\u09C7 \u098F\u09AC\u0982 \u099C\u09B0\u09C1\u09B0\u09C0 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0986\u09AC\u09C7\u09A6\u09A8 \u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09A4\u09C7 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF\u0964";
        } else if (isBenefits) {
          replyText = "\u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A8 \u098F\u0995\u099F\u09BF \u09AA\u09B0\u09AE \u09AE\u09B9\u09CE \u0995\u09BE\u099C\u0964 \u09B0\u0995\u09CD\u09A4 \u09A6\u09BF\u09B2\u09C7 \u09B6\u09B0\u09C0\u09B0\u09C7\u09B0 \u09B0\u0995\u09CD\u09A4\u0995\u09A3\u09BF\u0995\u09BE \u09AA\u09C1\u09A8\u09B0\u09C1\u099C\u09CD\u099C\u09C0\u09AC\u09BF\u09A4 \u09B9\u09DF, \u09B0\u0995\u09CD\u09A4\u09C7 \u0989\u09AA\u09BE\u09A6\u09BE\u09A8\u09C7\u09B0 \u09AD\u09BE\u09B0\u09B8\u09BE\u09AE\u09CD\u09AF \u09A0\u09BF\u0995 \u09A5\u09BE\u0995\u09C7 \u098F\u09AC\u0982 \u09B9\u09C3\u09A6\u09B0\u09CB\u0997 \u0993 \u09B8\u09CD\u099F\u09CD\u09B0\u09CB\u0995\u09C7\u09B0 \u099D\u09C1\u0981\u0995\u09BF \u0995\u09AE\u09C7\u0964 \u098F\u0995\u099F\u09BF \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A8 \u09B8\u09B0\u09CD\u09AC\u09CB\u099A\u09CD\u099A \u09EA \u099C\u09A8\u09C7\u09B0 \u099C\u09C0\u09AC\u09A8 \u09AC\u09BE\u0981\u099A\u09BE\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7!";
        } else if (isThanks) {
          replyText = "\u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0985\u09A8\u09C7\u0995 \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6! \u09AC\u09CD\u09B2\u09BE\u09A1\u09B2\u09BF\u0999\u09CD\u0995 \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09A5\u09BE\u0995\u09C1\u09A8 \u098F\u09AC\u0982 \u09B8\u09CD\u09AC\u09C7\u099A\u09CD\u099B\u09BE\u09DF \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A8\u09C7 \u098F\u0997\u09BF\u09DF\u09C7 \u0986\u09B8\u09C1\u09A8\u0964";
        } else if (slots?.bloodGroup) {
          if (textCleaned.includes("\u09B0\u0995\u09CD\u09A4 \u099A\u09BE\u0987") || textCleaned.includes("request") || textCleaned.includes("\u09A6\u09B0\u0995\u09BE\u09B0") || textCleaned.includes("\u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8")) {
            replyText = `\u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 ${slots.bloodGroup} \u0997\u09CD\u09B0\u09C1\u09AA\u09C7\u09B0 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0986\u09AC\u09C7\u09A6\u09A8\u099F\u09BF\u09B0 \u09AC\u09BF\u09AC\u09B0\u09A3 \u09A8\u09CB\u099F \u0995\u09B0\u09C7\u099B\u09BF\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 'Publish Request' \u09AC\u09BE\u099F\u09A8 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0986\u09AC\u09C7\u09A6\u09A8\u099F\u09BF \u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8 \u09AF\u09BE\u09A4\u09C7 \u09B8\u0995\u09B2\u09C7 \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u09DF\u0964`;
            finalTaskMode = "create_request";
          } else {
            replyText = `\u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF ${slots.bloodGroup} \u0997\u09CD\u09B0\u09C1\u09AA\u09C7\u09B0 \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE\u09B0 \u09B8\u09A8\u09CD\u09A7\u09BE\u09A8 \u09AA\u09C7\u09DF\u09C7\u099B\u09BF\u0964 \u09A8\u09BF\u099A\u09C7 \u0995\u09BE\u099B\u09BE\u0995\u09BE\u099B\u09BF \u098F\u09B2\u09BE\u0995\u09BE\u09B0 \u0989\u09AA\u09AF\u09C1\u0995\u09CD\u09A4 \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE\u09A6\u09C7\u09B0 \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u09AC\u09C7\u09A8 \u098F\u09AC\u0982 \u09A4\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8\u0964`;
            finalTaskMode = "search_donors";
          }
        } else {
          replyText = `\u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09BE\u09B0\u09CD\u09A4\u09BE\u099F\u09BF \u09AA\u09C7\u09DF\u09C7\u099B\u09BF: "${message}"\u0964 \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE \u0996\u09C1\u0981\u099C\u09A4\u09C7, \u0986\u09AC\u09C7\u09A6\u09A8 \u09AA\u09CB\u09B8\u09CD\u099F \u0995\u09B0\u09A4\u09C7 \u09AC\u09BE \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u09A5\u09BE\u0995\u09B2\u09C7 \u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u09AC\u09B2\u09C1\u09A8 (\u09AF\u09C7\u09AE\u09A8: \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0997\u09CD\u09B0\u09C1\u09AA \u0993 \u0986\u09AA\u09A8\u09BE\u09B0 \u099C\u09C7\u09B2\u09BE)\u0964 \u0986\u09AE\u09BF \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4\u0964`;
        }
        return res.status(200).json({
          success: true,
          replyText,
          limitReached: false,
          bloodGroup: slots?.bloodGroup || null,
          district: slots?.district || null,
          thana: slots?.thana || null,
          hospital: slots?.hospital || null,
          medicalReason: slots?.medicalReason || null,
          contactPhone: slots?.contactPhone || null,
          taskMode: finalTaskMode,
          actionTriggered: false,
          requestFormTriggered: false
        });
      }
      inMemoryAiSettings.aiTodayUsageCount += 1;
      try {
        await adminDb.collection("settings").doc("global").set({
          aiTodayUsageCount: import_firestore.FieldValue.increment(1),
          aiTodayResetDate: todayStr
        }, { merge: true });
        console.log(`Incremented AI usage counter in Firestore settings/global.`);
      } catch (incError) {
        console.warn("Firestore write permissions restricted on Cloud Run service account, using in-memory live tracking counter fallback safely.");
      }
      let data = {};
      try {
        let cleanText = responseText.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
        }
        data = JSON.parse(cleanText);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw response was:", responseText);
        data = {
          replyText: "\u0986\u09AE\u09BF \u09AC\u09C1\u099D\u09A4\u09C7 \u09AA\u09C7\u09B0\u09C7\u099B\u09BF, \u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09AC\u09B2\u09C1\u09A8\u0964",
          bloodGroup: slots?.bloodGroup || null,
          district: slots?.district || null,
          thana: slots?.thana || null,
          hospital: slots?.hospital || null,
          medicalReason: slots?.medicalReason || null,
          contactPhone: slots?.contactPhone || null,
          taskMode: slots?.taskMode || "idle",
          actionTriggered: false,
          requestFormTriggered: false
        };
      }
      const cleanInputSlot = (val) => {
        if (!val) return null;
        const s = String(val).trim().toLowerCase();
        if (s === "null" || s === "undefined" || s === "") return null;
        return val;
      };
      const prevBloodGroup = cleanInputSlot(slots?.bloodGroup);
      const prevDistrict = cleanInputSlot(slots?.district);
      const prevThana = cleanInputSlot(slots?.thana);
      const prevHospital = cleanInputSlot(slots?.hospital);
      const prevMedicalReason = cleanInputSlot(slots?.medicalReason);
      const prevContactPhone = cleanInputSlot(slots?.contactPhone);
      const returnedBloodGroup = cleanInputSlot(data.bloodGroup);
      const returnedDistrict = cleanInputSlot(data.district);
      const returnedThana = cleanInputSlot(data.thana);
      const returnedHospital = cleanInputSlot(data.hospital);
      const returnedMedicalReason = cleanInputSlot(data.medicalReason);
      const returnedContactPhone = cleanInputSlot(data.contactPhone);
      if (!returnedBloodGroup && prevBloodGroup) data.bloodGroup = prevBloodGroup;
      if (!returnedDistrict && prevDistrict) data.district = prevDistrict;
      if (!returnedThana && prevThana) data.thana = prevThana;
      if (!returnedHospital && prevHospital) data.hospital = prevHospital;
      if (!returnedMedicalReason && prevMedicalReason) data.medicalReason = prevMedicalReason;
      if (!returnedContactPhone && prevContactPhone) data.contactPhone = prevContactPhone;
      if (data.taskMode === "create_request" && !data.contactPhone && currentUserPhone) {
        data.contactPhone = currentUserPhone;
        if (!data.replyText.includes(currentUserPhone)) {
          data.replyText = `\u0985\u09AC\u09B6\u09CD\u09AF\u0987, \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u098F\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0 \u09B8\u099A\u09B2 \u09AB\u09CB\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0\u099F\u09BF (${currentUserPhone}) \u09B8\u0982\u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C7 \u09A8\u09BF\u09DF\u09C7\u099B\u09BF\u0964 ` + data.replyText;
        }
      }
      const finalBloodGroup = cleanInputSlot(data.bloodGroup);
      const finalDistrict = cleanInputSlot(data.district);
      const finalThana = cleanInputSlot(data.thana);
      if (data.taskMode === "search_donors" && finalBloodGroup && finalDistrict && finalThana) {
        data.actionTriggered = true;
        data.replyText = data.replyText || "\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6, \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09A6\u09C7\u0993\u09DF\u09BE \u0997\u09CD\u09B0\u09C1\u09AA \u098F\u09AC\u0982 \u098F\u09B2\u09BE\u0995\u09BE \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE \u0996\u09C1\u0981\u099C\u09C7 \u09A6\u09BF\u099A\u09CD\u099B\u09BF\u0964";
      }
      if (data.taskMode === "create_request" && finalBloodGroup && finalDistrict && finalThana && data.hospital && data.medicalReason && data.contactPhone) {
        data.requestFormTriggered = true;
        data.replyText = data.replyText || "\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6, \u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09A6\u09C7\u0993\u09DF\u09BE \u09A4\u09A5\u09CD\u09AF\u0997\u09C1\u09B2\u09CB \u09A6\u09BF\u09DF\u09C7 \u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C7 \u09A6\u09BF\u099A\u09CD\u099B\u09BF\u0964";
      }
      res.json({
        success: true,
        ...data,
        updatedUsageCount: inMemoryAiSettings.aiTodayUsageCount
      });
    } catch (error) {
      console.error("Error in blood-assistant API:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/openai/speech", async (req, res) => {
    try {
      const text = String(req.query.text || "").trim();
      if (!text) {
        return res.status(400).send("No text provided");
      }
      let openaiApiKey = process.env.OPENAI_API_KEY || "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";
      try {
        const settingsDoc = await adminDb.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
          const settingsData = settingsDoc.data() || {};
          if (settingsData.openaiApiKeyOverride && settingsData.openaiApiKeyOverride.trim() !== "") {
            openaiApiKey = settingsData.openaiApiKeyOverride.trim();
          }
        }
      } catch (err) {
        if (inMemoryAiSettings.openaiApiKeyOverride) {
          openaiApiKey = inMemoryAiSettings.openaiApiKeyOverride;
        }
      }
      const openai = new import_openai.default({ apiKey: openaiApiKey });
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer",
        // Natural high-quality female voice friendly for Bangladeshi assistant
        input: text
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (error) {
      if (error && (error.status === 429 || error.message?.includes("quota") || error.message?.includes("billing"))) {
        console.warn("OpenAI API Speech synthesis exceeded quota/billing limits. Local TTS fallbacks will activate automatically.");
        return res.status(429).send("Speech generation unavailable: Quota or billing limit exceeded.");
      }
      console.error("Error in openai-speech API:", error);
      res.status(500).send("Speech generation failed: " + error.message);
    }
  });
  app.get(["/sitemap.xml", "/sitemap"], async (req, res) => {
    try {
      const xml = await getSitemapXml();
      res.header("Content-Type", "application/xml; charset=utf-8");
      res.send(xml);
    } catch (err) {
      res.status(500).send("Error generating dynamic sitemap");
    }
  });
  app.post("/api/admin/generate-sitemap", async (req, res) => {
    try {
      const xml = await getSitemapXml();
      let publicWritten = false;
      let distWritten = false;
      try {
        await import_promises.default.writeFile(import_path.default.join(process.cwd(), "public", "sitemap.xml"), xml, "utf-8");
        publicWritten = true;
      } catch (err) {
        console.warn("Could not write to public/sitemap.xml:", err.message);
      }
      try {
        await import_promises.default.writeFile(import_path.default.join(process.cwd(), "dist", "sitemap.xml"), xml, "utf-8");
        distWritten = true;
      } catch (err) {
        console.warn("Could not write to dist/sitemap.xml:", err.message);
      }
      const outcomeMessage = publicWritten || distWritten ? `Sitemap successfully generated! (public: ${publicWritten ? "Yes" : "No"}, dist: ${distWritten ? "Yes" : "No"})` : "Sitemap served dynamically (Static sitemap files couldn't be written due to read-only hosting environment, but is active!)";
      res.json({
        success: true,
        message: outcomeMessage,
        details: { publicWritten, distWritten }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/robots.txt", (req, res) => {
    const host = "bloodlink.bd";
    const baseUrl = `https://${host}`;
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`);
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*all", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs2 = await import("fs/promises");
        const template = await fs2.readFile(import_path.default.join(process.cwd(), "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
