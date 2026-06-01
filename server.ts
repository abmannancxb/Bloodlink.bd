import express from "express";
import path from "path";
import fs from "fs/promises";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { GoogleGenAI, Type } from "@google/genai";
import { BANGLADESH_LOCATIONS } from "./src/constants";
import Groq from "groq-sdk";

// Initialize firebase-admin safely
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
} catch (err: any) {
  console.error("Error initializing firebase-admin in server.ts:", err.message);
}

const adminDb = getFirestore(firebaseConfig.firestoreDatabaseId || "(default)");

// Helper function to generate complete sitemap content asynchronously
async function getSitemapXml(): Promise<string> {
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

  // 1. Static views base
  views.forEach(v => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${v.path}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>${v.changefreq}</changefreq>\n`;
    xml += `    <priority>${v.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // 2. Dynamic Posts: Fetch all stories from Firestore and append /story/:id
  try {
    const postsSnapshot = await adminDb.collection("posts").get();
    if (!postsSnapshot.empty) {
      postsSnapshot.forEach(docSnap => {
        const postData = docSnap.data();
        if (postData && !postData.isHidden) {
          const postId = docSnap.id;
          
          let postLastMod = lastMod;
          try {
            if (postData.createdAt) {
              let dateObj: Date | null = null;
              if (typeof postData.createdAt.toDate === "function") {
                dateObj = postData.createdAt.toDate();
              } else if (postData.createdAt._seconds) {
                dateObj = new Date(postData.createdAt._seconds * 1000);
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
            // fallback gracefully
          }

          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/story/${postId}</loc>\n`;
          xml += `    <lastmod>${postLastMod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.75</priority>\n`;
          xml += `  </url>\n`;
        }
      });
    }
  } catch (err: any) {
    console.warn("Could not retrieve active posts for sitemap generation:", err.message);
  }

  // 3. Dynamic Public Donor Profiles to index people searching for blood group matching
  try {
    const usersSnapshot = await adminDb.collection("users").get();
    if (!usersSnapshot.empty) {
      usersSnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        if (userData && userData.uid) {
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/public-profile?uid=${userData.uid}</loc>\n`;
          xml += `    <lastmod>${lastMod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.6</priority>\n`;
          xml += `  </url>\n`;
        }
      });
    }
  } catch (err: any) {
    console.warn("Could not retrieve active user profiles for sitemap generation:", err.message);
  }

  xml += `</urlset>`;
  return xml;
}

// Safe server-side memory state for AI assistant settings and limits fallback (useful when Firestore write/read permissions are restricted)
const inMemoryAiSettings = {
  aiEnginePreference: "both_gemini",
  geminiApiKeyOverride: "",
  groqApiKeyOverride: "",
  aiDailyLimit: 500,
  aiTodayUsageCount: 0,
  aiTodayResetDate: new Date().toISOString().split('T')[0]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // AI Blood Assistant API Route
  app.post("/api/gemini/blood-assistant", async (req, res) => {
    try {
      const { message, history, slots, currentUserPhone, donors, settings: clientSettings } = req.body;

      // 1. Fetch Dynamic Configuration & Usage tracking from Firestore with absolute resilience
      let geminiApiKey = process.env.GEMINI_API_KEY || "";
      let groqApiKey = process.env.GROQ_API_KEY || "";
      let aiEnginePreference = inMemoryAiSettings.aiEnginePreference; 
      let aiDailyLimit = inMemoryAiSettings.aiDailyLimit; 
      let aiTodayUsageCount = inMemoryAiSettings.aiTodayUsageCount;
      let aiTodayResetDate = inMemoryAiSettings.aiTodayResetDate;

      const todayStr = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD

      // Auto-reset check for in-memory
      if (inMemoryAiSettings.aiTodayResetDate !== todayStr) {
        inMemoryAiSettings.aiTodayUsageCount = 0;
        inMemoryAiSettings.aiTodayResetDate = todayStr;
      }

      let isFirestoreOperational = false;

      try {
        const settingsDoc = await adminDb.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
          const settingsData = settingsDoc.data() || {};
          if (settingsData.geminiApiKeyOverride && settingsData.geminiApiKeyOverride.trim() !== '') {
            geminiApiKey = settingsData.geminiApiKeyOverride.trim();
            inMemoryAiSettings.geminiApiKeyOverride = settingsData.geminiApiKeyOverride.trim();
          }
          if (settingsData.groqApiKeyOverride && settingsData.groqApiKeyOverride.trim() !== '') {
            groqApiKey = settingsData.groqApiKeyOverride.trim();
            inMemoryAiSettings.groqApiKeyOverride = settingsData.groqApiKeyOverride.trim();
          }
          if (settingsData.aiEnginePreference) {
            aiEnginePreference = settingsData.aiEnginePreference;
            inMemoryAiSettings.aiEnginePreference = settingsData.aiEnginePreference;
          }
          if (typeof settingsData.aiDailyLimit === 'number') {
            aiDailyLimit = settingsData.aiDailyLimit;
            inMemoryAiSettings.aiDailyLimit = settingsData.aiDailyLimit;
          }

          aiTodayResetDate = settingsData.aiTodayResetDate || "";
          aiTodayUsageCount = typeof settingsData.aiTodayUsageCount === 'number' ? settingsData.aiTodayUsageCount : 0;

          // Auto-reset check
          if (aiTodayResetDate !== todayStr) {
            aiTodayUsageCount = 0;
            aiTodayResetDate = todayStr;
            try {
              await adminDb.collection("settings").doc("global").set({
                aiTodayUsageCount: 0,
                aiTodayResetDate: todayStr
              }, { merge: true });
            } catch (err) {
              // Ignore silent write failures on auto-reset
            }
          }
          
          inMemoryAiSettings.aiTodayUsageCount = aiTodayUsageCount;
          inMemoryAiSettings.aiTodayResetDate = aiTodayResetDate;
          isFirestoreOperational = true;
        }
      } catch (settingsError: any) {
        console.warn("Firestore settings read permission restricted. Falling back to in-memory configurations dashboard:", settingsError.message || settingsError);
      }

      // If client provided active config cached states, accept them as secondary overrides
      if (clientSettings) {
        if (clientSettings.aiEnginePreference) {
          aiEnginePreference = clientSettings.aiEnginePreference;
          inMemoryAiSettings.aiEnginePreference = clientSettings.aiEnginePreference;
        }
        if (clientSettings.geminiApiKeyOverride && clientSettings.geminiApiKeyOverride.trim() !== '') {
          geminiApiKey = clientSettings.geminiApiKeyOverride.trim();
          inMemoryAiSettings.geminiApiKeyOverride = clientSettings.geminiApiKeyOverride.trim();
        }
        if (clientSettings.groqApiKeyOverride && clientSettings.groqApiKeyOverride.trim() !== '') {
          groqApiKey = clientSettings.groqApiKeyOverride.trim();
          inMemoryAiSettings.groqApiKeyOverride = clientSettings.groqApiKeyOverride.trim();
        }
        if (typeof clientSettings.aiDailyLimit === 'number') {
          aiDailyLimit = clientSettings.aiDailyLimit;
          inMemoryAiSettings.aiDailyLimit = clientSettings.aiDailyLimit;
        }
        if (typeof clientSettings.aiTodayUsageCount === 'number') {
          // Sync with clients who successfully write counters
          if (clientSettings.aiTodayUsageCount > inMemoryAiSettings.aiTodayUsageCount) {
            inMemoryAiSettings.aiTodayUsageCount = clientSettings.aiTodayUsageCount;
          }
        }
      }

      // Ensure robust local fallback if Firestore couldn't be loaded at all
      if (!isFirestoreOperational) {
        if (inMemoryAiSettings.geminiApiKeyOverride && inMemoryAiSettings.geminiApiKeyOverride.trim() !== '') {
          geminiApiKey = inMemoryAiSettings.geminiApiKeyOverride;
        }
        if (inMemoryAiSettings.groqApiKeyOverride && inMemoryAiSettings.groqApiKeyOverride.trim() !== '') {
          groqApiKey = inMemoryAiSettings.groqApiKeyOverride;
        }
        aiEnginePreference = inMemoryAiSettings.aiEnginePreference;
        aiDailyLimit = inMemoryAiSettings.aiDailyLimit;
        aiTodayUsageCount = inMemoryAiSettings.aiTodayUsageCount;
        aiTodayResetDate = inMemoryAiSettings.aiTodayResetDate;
      }

      // Check if daily limit reached
      if (aiTodayUsageCount >= aiDailyLimit) {
        console.warn(`AI assistant message limit reached! Current count: ${aiTodayUsageCount}, Daily limit: ${aiDailyLimit}`);
        return res.status(200).json({
          success: true,
          replyText: "আমার সিস্টেমের কাজ চলমান, অনুগ্রহ করে ম্যানুয়ালি খুঁজে নিন। দুঃখিত।",
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
      
      // Optimize tokens to prevent "PayloadTooLargeError" and Groq/Gemini "Rate limit exceeded" (TPD):
      // Instead of sending all 64 districts & hundreds of thanas on every turn, we send a highly optimized view.
      const selectedDistrict = slots?.district;
      const locationsPreview: any = {};
      const allDistricts = Object.keys(BANGLADESH_LOCATIONS);
      
      locationsPreview["AvailableDistricts_ChooseOne"] = allDistricts;
      if (selectedDistrict && BANGLADESH_LOCATIONS[selectedDistrict as keyof typeof BANGLADESH_LOCATIONS]) {
        locationsPreview[`Thanas_For_${selectedDistrict}`] = BANGLADESH_LOCATIONS[selectedDistrict as keyof typeof BANGLADESH_LOCATIONS];
      } else {
        // Safe check for partially matched/differently cased districts to be resilient
        const matchedDist = allDistricts.find(d => d.toLowerCase() === String(selectedDistrict).trim().toLowerCase());
        if (matchedDist) {
          locationsPreview[`Thanas_For_${matchedDist}`] = BANGLADESH_LOCATIONS[matchedDist as keyof typeof BANGLADESH_LOCATIONS];
        } else {
          locationsPreview["Note"] = "Thanas Checklist for correct matching will be provided dynamically here once values are stored in slots.district.";
        }
      }

      // Simple JSON formatted view of available donors for lookup
      const simpleDonorsList = Array.isArray(donors) ? donors.map((d: any) => ({
        name: d.displayName || d.name || '',
        bloodGroup: d.bloodGroup || '',
        lastDonationDate: d.lastDonationDate || 'কখনো রক্ত দেননি বা তথ্য নেই',
      })) : [];

      const systemInstruction = `You are a highly intelligent, polite, and friendly Bangla (বাংলাদেশী বাংলা) voice and text assistant for 'BloodLink Bangladesh', behaving as Gemini Artificial Intelligence (জিমিনি আর্টিফিশিয়াল এআই).

Core Guidelines & Conversational Paths:
1. GREETINGS & SALAM (সালাম ও শুভেচ্ছা):
   - If the user greets you with Salam ("আসসালামু আলাইকুম" or "সালাম"), respond warmly with: "ওয়ালাইকুম আসসালাম! আশা করি আল্লাহর রহমতে ভালো আছেন। আমি আপনার রক্তবন্ধু AI রক্ত সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?"
   - If they say other greetings like "শুভ সকাল" (Good Morning), "শুভ বিকেল" (Good Afternoon), "শুভ সন্ধ্যা" (Good Evening), "হ্যালো", "Hi", "Hello", reply appropriately in Bangla: e.g. "শুভ সকাল! আমি রক্তবন্ধু AI রক্ত সহকারী। আশা করি আপনার আজকের দিনটি সুন্দর কাটবে। রক্ত খোঁজা বা রক্তদানের বিষয়ে কীভাবে সাহায্য করতে পারি বলুন।"
   - Keep the tone respectful, friendly, and deeply helpful.

2. GENERAL AI KNOWLEDGE (যেকোন সাধারণ প্রশ্ন):
   - You are Gemini AI. If the user asks general, educational, science, medical, or other common questions (e.g., "তুমি কে?", "জিমিনি কি?", "রক্ত দিলে কি ক্ষতি হয়?", "বাংলাদেশ কোন মহাদেশে?", "পানির উৎস কি?"), do NOT reject them. Respond with accurate, highly informative, and concise explanations in standard Bangla.
   - For these general questions, keep "taskMode" as "idle" (or maintain their current ongoing flow), and NEVER say "অনুগ্রহ করে আমাকে অপ্রয়োজনীয় প্রশ্ন করবেন না". Simply answer their question beautifully!

3. PATH A: Donor Search & Nearby Donors ("taskMode": "search_donors")
   - Use when the user wants to search, view, or find nearby donors (e.g., "ও পজিটিভ ডোনার লাগবে", "নিকটবর্তী ও পজিটিভ ডোনার দেখাও", "কক্সবাজারে ও পজিটিভ রক্তদাতা আছে?").
   - You must collect 3 parameters: 'bloodGroup', 'district', and 'thana'.
   - Extract any location or blood group given in the query directly, register it, and gently ask for any missing parameter (one by one) in polite Bangla.
   - Valid bloodGroup values: A+, A-, B+, B-, AB+, AB-, O+, O-. Normalize terms like "ও পজিটিভ" to "O+", "বি পজিটিভ" to "B+", etc.
   - Match Bangla/English locations to the BANGLADESH_LOCATIONS keys (English) like "Dhaka", "Chittagong" or sub-districts like "Mirpur", "Uttara".
   - Once all 3 fields ('bloodGroup', 'district', 'thana') are filled, set 'actionTriggered' to true. Set 'replyText' to: "ধন্যবাদ, আমি আপনার প্রদত্ত রক্তের গ্রুপ (\${bloodGroup}) এবং এলাকা (\${thana}, \${district}) অনুযায়ী নিকটবর্তী উপযুক্ত রক্তদাতা খুঁজছি..."

4. PATH B: Post Blood Request & Create Blood Request ("taskMode": "create_request")
   - Use when the user states they need/require blood or want to post a blood request (e.g., "ব্লাড লাগবে", "রক্ত লাগবে", "ব্লাড দরকার", "একটি রিকোয়েস্ট তৈরি করুন", "আবেদন করুন", "জরুরি ও পজিটিভ রক্ত দরকার").
   - You must extract and save 5 slots: 'bloodGroup', 'district', 'thana', 'hospital' (hospital name), and 'medicalReason' (রোগীর সমস্যা ও রক্তের পরিমাণ).
   - **Important**: Any specified blood volume/quantity (রক্তের পরিমাণ, e.g., "১ ব্যাগ", "২ ব্যাগ", "2 units", "২ ইউনিট রক্ত লাগবে") provided in the user's message MUST be saved inside the 'medicalReason' slot! For example, set 'medicalReason' to: "জরুরি রক্ত প্রয়োজন, পরিমাণ: ২ ব্যাগ" or "রক্তের পরিমাণ: ৩ ব্যাগ".
   - **Slopping/Missing Checking Rule**: Whatever details are specified first (রক্তের গ্রুপ, জেলা, থানা, হাসপাতাল নাম, রক্তের পরিমাণ) must be saved immediately. Ask for only the missing details ("যেটা কম হবে সেটা জিজ্ঞেস করে নিবে"), one by one politely.
   - Standard 'contactPhone' tracking:
     * The user's account phone number provides a default ("currentUserPhone" is: '\${currentUserPhone || ''}').
     * If "currentUserPhone" is provided and not empty, set 'contactPhone' to it. If missing, politely ask the user for an active contact phone number.
   - When all 5 request parameters and phone are filled, set 'requestFormTriggered' to true. Set 'replyText' to: "ধন্যবাদ, আমি আপনার দেওয়া সকল তথ্য (গ্রুপ: \${bloodGroup || ''}, জেলা: \${district || ''}, থানা: \${thana || ''}, হাসপাতাল: \${hospital || ''}, পরিমাণ/কারণ: \${medicalReason || ''}) পেয়েছি। রক্তের আবেদনটি স্বয়ংক্রিয়ভাবে তৈরি করে দেওয়া হচ্ছে।"

PATH C: Donor Lookup ("taskMode": "donor_lookup")
- Use when the user asks about a specific donor by name (e.g. "রফিক শেষ কবে রক্ত দিয়েছে?", "করিমের রক্তের গ্রুপ কী?").
- Match the requested name in the provided 'donors' list below.
- Available Donors List:
  ${JSON.stringify(simpleDonorsList)}

Conversational Steps & Parameter Memory Rules:
1. SLOT RETENTION: You MUST carry forward and return the non-null values provided in "Current extracted slots state" in your final JSON response keys.
2. Directivenes: Ask for only ONE missing slot at a time politely, in Bangla.

Current extracted slots state from previous turns:
- bloodGroup: ${slots?.bloodGroup || 'null'}
- district: ${slots?.district || 'null'}
- thana: ${slots?.thana || 'null'}
- hospital: ${slots?.hospital || 'null'}
- medicalReason: ${slots?.medicalReason || 'null'}
- contactPhone: ${slots?.contactPhone || 'null'}
- activeMode: ${slots?.taskMode || 'idle'}

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

      const tryGemini = async (): Promise<boolean> => {
        if (!geminiApiKey) {
          console.warn("Gemini API key is not configured.");
          return false;
        }
        try {
          console.log("Using Gemini-3.5-Flash model with loaded Key...");
          const ai = new GoogleGenAI({
            apiKey: geminiApiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const chatMessages = [
            ...(history || []).map((msg: any) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.text }]
            })),
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ];

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: chatMessages,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  replyText: { type: Type.STRING },
                  bloodGroup: { type: Type.STRING },
                  district: { type: Type.STRING },
                  thana: { type: Type.STRING },
                  hospital: { type: Type.STRING },
                  medicalReason: { type: Type.STRING },
                  contactPhone: { type: Type.STRING },
                  taskMode: { type: Type.STRING },
                  actionTriggered: { type: Type.BOOLEAN },
                  requestFormTriggered: { type: Type.BOOLEAN }
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
            usedEngine = "gemini";
            return true;
          }
          return false;
        } catch (geminiError: any) {
          console.error("Gemini API error during query:", geminiError.message || geminiError);
          return false;
        }
      };

      const tryGroq = async (): Promise<boolean> => {
        if (!groqApiKey) {
          console.warn("Groq API key is not configured.");
          return false;
        }
        try {
          console.log("Using Groq API Key...");
          const groq = new Groq({ apiKey: groqApiKey });
          
          const chatMessages: any[] = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((msg: any) => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
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
        } catch (groqError: any) {
          console.error("Groq API error during query:", groqError.message || groqError);
          return false;
        }
      };

      // Implement Engines Orchestration depending on Selected Preferences
      if (aiEnginePreference === 'gemini') {
        await tryGemini();
      } else if (aiEnginePreference === 'groq') {
        await tryGroq();
      } else if (aiEnginePreference === 'both_groq') {
        const ok = await tryGroq();
        if (!ok) {
          console.log("Groq failed or limit exceeded, trying fallback to Gemini...");
          await tryGemini();
        }
      } else {
        // Defaults to 'both_gemini'
        const ok = await tryGemini();
        if (!ok) {
          console.log("Gemini failed or limit exceeded, trying fallback to Groq...");
          await tryGroq();
        }
      }

      // If neither succeeded or rate limits/quotas were hit
      if (!usedEngine) {
        console.warn("All available AI Engines failed or keys are missing. Triggering precise fallback error.");
        return res.status(200).json({
          success: true,
          replyText: "আমার সিস্টেমের কাজ চলমান, অনুগ্রহ করে ম্যানুয়ালি খুঁজে নিন। দুঃখিত।",
          limitReached: true,
          bloodGroup: slots?.bloodGroup || null,
          district: slots?.district || null,
          thana: slots?.thana || null,
          hospital: slots?.hospital || null,
          medicalReason: slots?.medicalReason || null,
          contactPhone: slots?.contactPhone || null,
          taskMode: slots?.taskMode || "idle",
          actionTriggered: false,
          requestFormTriggered: false
        });
      }

      // Increment successful usage counter (both in memory and try DB with safe try/catch)
      inMemoryAiSettings.aiTodayUsageCount += 1;
      
      try {
        await adminDb.collection("settings").doc("global").set({
          aiTodayUsageCount: FieldValue.increment(1),
          aiTodayResetDate: todayStr
        }, { merge: true });
        console.log(`Incremented AI usage counter in Firestore settings/global.`);
      } catch (incError: any) {
        console.warn("Firestore write permissions restricted on Cloud Run service account, using in-memory live tracking counter fallback safely.");
      }

      // Safe robust JSON cleaning/parsing to support formatting quirks
      let data: any = {};
      try {
        let cleanText = responseText.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
        }
        data = JSON.parse(cleanText);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw response was:", responseText);
        data = {
          replyText: "আমি বুঝতে পেরেছি, দয়া করে আবার বলুন।",
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

      // Server-side fallback/carry-forward of slots to prevent the AI from ever forgetting them
      const cleanInputSlot = (val: any) => {
        if (!val) return null;
        const s = String(val).trim().toLowerCase();
        if (s === 'null' || s === 'undefined' || s === '') return null;
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

      // Handle automatic auto-loaded user phone integration if in create_request mode
      if (data.taskMode === 'create_request' && !data.contactPhone && currentUserPhone) {
        data.contactPhone = currentUserPhone;
        if (!data.replyText.includes(currentUserPhone)) {
          data.replyText = `অবশ্যই, আমি আপনার একাউন্টের সচল ফোন নম্বরটি (${currentUserPhone}) সংযুক্ত করে নিয়েছি। ` + data.replyText;
        }
      }

      // Standard trigger validation for search donor mode
      const finalBloodGroup = cleanInputSlot(data.bloodGroup);
      const finalDistrict = cleanInputSlot(data.district);
      const finalThana = cleanInputSlot(data.thana);

      if (data.taskMode === 'search_donors' && finalBloodGroup && finalDistrict && finalThana) {
        data.actionTriggered = true;
        data.replyText = data.replyText || "ধন্যবাদ, আমি আপনার দেওয়া গ্রুপ এবং এলাকা অনুযায়ী রক্তদাতা খুঁজে দিচ্ছি।";
      }

      // Standard trigger validation for request posting mode
      if (data.taskMode === 'create_request' && finalBloodGroup && finalDistrict && finalThana && data.hospital && data.medicalReason && data.contactPhone) {
        data.requestFormTriggered = true;
        data.replyText = data.replyText || "ধন্যবাদ, আমি আপনার দেওয়া তথ্যগুলো দিয়ে রক্তের রিকোয়েস্ট তৈরি করে দিচ্ছি।";
      }

      res.json({ 
        success: true, 
        ...data,
        updatedUsageCount: inMemoryAiSettings.aiTodayUsageCount 
      });

    } catch (error: any) {
      console.error("Error in blood-assistant API:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Dynamic Sitemap with direct Firestore integration
  app.get(["/sitemap.xml", "/sitemap"], async (req, res) => {
    try {
      const xml = await getSitemapXml();
      res.header("Content-Type", "application/xml; charset=utf-8");
      res.send(xml);
    } catch (err: any) {
      res.status(500).send("Error generating dynamic sitemap");
    }
  });



  // Admin API endpoint to generate static sitemap snapshot
  app.post("/api/admin/generate-sitemap", async (req, res) => {
    try {
      const xml = await getSitemapXml();

      let publicWritten = false;
      let distWritten = false;

      // Attempt to write sitemap.xml to public/ directory
      try {
        await fs.writeFile(path.join(process.cwd(), "public", "sitemap.xml"), xml, "utf-8");
        publicWritten = true;
      } catch (err: any) {
        console.warn("Could not write to public/sitemap.xml:", err.message);
      }

      // Attempt to write sitemap.xml to dist/ directory
      try {
        await fs.writeFile(path.join(process.cwd(), "dist", "sitemap.xml"), xml, "utf-8");
        distWritten = true;
      } catch (err: any) {
        console.warn("Could not write to dist/sitemap.xml:", err.message);
      }

      const outcomeMessage = (publicWritten || distWritten)
        ? `Sitemap successfully generated! (public: ${publicWritten ? "Yes" : "No"}, dist: ${distWritten ? "Yes" : "No"})`
        : "Sitemap served dynamically (Static sitemap files couldn't be written due to read-only hosting environment, but is active!)";

      res.json({ 
        success: true, 
        message: outcomeMessage,
        details: { publicWritten, distWritten }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = 'bloodlink.bd';
    const baseUrl = `https://${host}`;
    
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Dynamic routing fallback to handle non-static clean subpaths on reload
    app.get('*all', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import("fs/promises");
        const template = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // Production static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
