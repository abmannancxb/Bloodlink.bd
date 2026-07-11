import express from "express";
import path from "path";
import fs from "fs/promises";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { GoogleGenAI, Type } from "@google/genai";
import { BANGLADESH_LOCATIONS } from "./src/constants";
import Groq from "groq-sdk";
import OpenAI from "openai";

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
  aiEnginePreference: "openai",
  geminiApiKeyOverride: "",
  groqApiKeyOverride: "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",
  openaiApiKeyOverride: "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",
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
      let groqApiKey = process.env.GROQ_API_KEY || "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";
      let openaiApiKey = process.env.OPENAI_API_KEY || "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";
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
          if (settingsData.openaiApiKeyOverride && settingsData.openaiApiKeyOverride.trim() !== '') {
            openaiApiKey = settingsData.openaiApiKeyOverride.trim();
            inMemoryAiSettings.openaiApiKeyOverride = settingsData.openaiApiKeyOverride.trim();
          } else {
            // Auto sync default OpenAI Key to existing settings doc
            try {
              await adminDb.collection("settings").doc("global").set({
                openaiApiKeyOverride: "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",
                aiEnginePreference: "openai"
              }, { merge: true });
              openaiApiKey = "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";
              inMemoryAiSettings.openaiApiKeyOverride = "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";
              aiEnginePreference = "openai";
              inMemoryAiSettings.aiEnginePreference = "openai";
            } catch (err: any) {
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
        } else {
          // If settingsDoc does not exist, create it with our defaults
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
          } catch (err: any) {
            console.warn("Could not auto-create missing Firestore settings:", err.message);
          }
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
        if (clientSettings.openaiApiKeyOverride && clientSettings.openaiApiKeyOverride.trim() !== '') {
          openaiApiKey = clientSettings.openaiApiKeyOverride.trim();
          inMemoryAiSettings.openaiApiKeyOverride = clientSettings.openaiApiKeyOverride.trim();
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
        if (inMemoryAiSettings.openaiApiKeyOverride && inMemoryAiSettings.openaiApiKeyOverride.trim() !== '') {
          openaiApiKey = inMemoryAiSettings.openaiApiKeyOverride;
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
1. GREETINGS, SALAM & CHAT (সালাম, শুভেচ্ছা ও সাধারণ আলাপন):
   - Always reply in Bengali (বাংলাদেশী বাংলা) unless the user requests another language.
   - If the user greets you with Salam ("আসসালামু আলাইকুম" or "সালাম"), respond warmly with: "ওয়ালাইকুম আসসালাম! আশা করি আল্লাহর রহমতে ভালো আছেন। আমি আপনার রক্তবন্ধু AI সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?"
   - Keep the tone friendly, professional, and concise. Ensure negative space, clean spacing and clear, short Bengali answers.
   - Ask only necessary questions. Never ask for information already available in the user's account automatically.
   - Always keep responses highly conversational and short, offering button options where available. Button format: [বাটন টেক্সট].
   - If the user is just saying hello or greeting you, keep "taskMode" as "idle". Do NOT invent or ask for blood group/district unless they explicitly requested help to find blood.

2. GENERAL AI KNOWLEDGE (যেকোন সাধারণ প্রশ্নের উত্তর):
   - You are Gemini AI. If the user asks general, educational, science, medical, or other common questions (e.g., "তুমি কে?", "জিমিনি কি?", "রক্ত দিলে কি ক্ষতি হয়?", "বাংলাদেশ কোন মহাদেশে?", "পানির উৎস কি?", "রক্তদানের উপকারিতা কী?"), do NOT reject them or tell them to only ask about blood. Respond with accurate, highly informative, polite, and concise explanations in standard Bangla as Gemini AI.
   - For these general questions, keep "taskMode" as "idle" (or maintain their current ongoing flow), and NEVER say "আমি কেবল রক্ত সংক্রান্ত সাহায্য করতে পারি". Beautifully answer their query first! Keep all previously unprovided parameters as null.

3. PATH A: Donor Search & Nearby Donors ("taskMode": "search_donors")
   - Use when the user wants to search, view, or find nearby donors (e.g., "ও পজিটিভ ডোনার লাগবে", "নিকটবর্তী ও পজিটিভ ডোনার দেখাও", "কক্সবাজারে ও পজিটিভ রক্তদাতা আছে?").
   - Required slots: 'bloodGroup' (e.g., "O+", "A+"), 'district' (matching BANGLADESH_LOCATIONS key), and 'thana' (matching sub-array values).
   - If the user says "A+ donor needed" or similar, save "A+" as bloodGroup and start search immediately for the location.
   - You must collect Blood Group and Location (district, thana). Once both are present, set 'actionTriggered' to true and 'taskMode' to "search_donors".
   - Extract location and blood groups directly, register them, and ask for any missing parameters one by one in polite Bangla, recommending choices using button syntax [বাটন].
   - Valid bloodGroup values: A+, A-, B+, B-, AB+, AB-, O+, O-. Normalize terms like "ও পজিটিভ" to "O+", "বি পজিটিভ" to "B+", etc.
   - Match Bangla/English locations to the BANGLADESH_LOCATIONS keys (English) like "Dhaka", "Chittagong" or sub-districts like "Mirpur", "Uttara".
   - Once location and bloodGroup slots are filled, set 'actionTriggered' to true. Set 'replyText' to: "ধন্যবাদ, আমি আপনার প্রদত্ত রক্তের গ্রুপ (\${bloodGroup}) এবং এলাকা (\${thana}, \${district}) অনুযায়ী নিকটবর্তী উপযুক্ত রক্তদাতা খুঁজছি..."

4. PATH B: Post Blood Request & Create Blood Request ("taskMode": "create_request")
   - Use when the user states they need/require blood or want to post a blood request (e.g., "ব্লাড লাগবে", "রক্ত লাগবে", "ব্লাড দরকার", "একটি রিকোয়েস্ট তৈরি করুন", "আবেদন করুন", "জরুরি ও পজিটিভ রক্ত দরকার" or "আমার বাবার জন্য রক্ত লাগবে").
   - AI SMART FEATURE: If user says "আমার বাবার জন্য রক্ত লাগবে", automatically ask for Blood Group, Bags, Hospital, and Emergency level all at once or one-by-one with beautiful option chips!
   - Follow these exact creation steps to secure slots:
     * Step 1: Determine blood group needed. Ask with buttons:
       "🩸 রক্তের গ্রুপ?\n[A+] [A-] [B+] [B-] [O+] [O-] [AB+] [AB-]"
     * Step 2: Ask for missing details politely, one by one:
       - Number of units required (Save inside 'medicalReason' slot, e.g., "২ ব্যাগ")
       - Hospital name (Save inside 'hospital' slot)
       - Emergency level (Urgent / Normal) (Save inside 'medicalReason' slot, e.g., "২ ব্যাগ, জরুরি")
     * Step 3: Use the logged-in user's mobile number automatically. If "\${currentUserPhone || ''}" is not empty, show:
       "আপনার মোবাইল নম্বর: \${currentUserPhone}\nএটি ব্যবহার করতে চান?\n[হ্যাঁ] [না]"
       If they confirm, set 'contactPhone' to that number. If missing or they choose "না", ask politely for their contact mobile number in Bangla.
     * Step 4: Generate a preview exactly as shown:
       "✅ রিকুয়েস্ট প্রস্তুত

       গ্রুপ: \${bloodGroup || ''}
       পরিমাণ: \${medicalReason || ''}
       হাসপাতাল: \${hospital || ''}
       মোবাইল: \${contactPhone || ''}
       অগ্রাধিকার: \${medicalReason?.includes('জরুরি') ? 'জরুরি' : 'নরমাল'}

       রিকুয়েস্টটি পোস্ট করতে চান?
       [পোস্ট করুন] [এডিট করুন]"
     * Step 5: Only after explicit confirmation (e.g., user says "পোস্ট করুন" or clicks [পোস্ট করুন]), set 'requestFormTriggered' to true. Never create or post without explicit confirmation.
   - Save volume/quantity and emergency parameters inside the 'medicalReason' slot exactly.
   - Ask for missing details one by one politely in Bangla. Never guess or hallucinate parameters. Maintain previously collected values.
   - Follow Step 3 for contact phone tracking default values and verification.
     * Ensure the user's phone is correctly stored once confirmed.
     * Set 'contactPhone' properly as instructed in Step 3.
   - When all request parameters are collected, show the preview to the user as defined in Step 4. Only trigger 'requestFormTriggered' to true if they confirm with "পোস্ট করুন" as defined in Step 5.

PATH C: Donor Lookup ("taskMode": "donor_lookup")
- Use when the user asks about a specific donor by name (e.g. "রফিক শেষ কবে রক্ত দিয়েছে?", "করিমের রক্তের গ্রুপ কী?").
- Match the requested name in the provided 'donors' list below.
- Available Donors List:
  ${JSON.stringify(simpleDonorsList)}

Conversational Steps & Parameter Memory Rules:
1. SLOT RETENTION: You MUST carry forward and return the non-null values provided in "Current extracted slots state" in your final JSON response keys.
2. Directivenes: Ask for only ONE missing slot at a time politely, in Bangla. You MUST NOT invent, guess, or assume values.

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

        const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

        for (const currentModel of modelsToTry) {
          try {
            console.log(`Using Gemini SDK with model: ${currentModel}...`);
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
              model: currentModel,
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
              usedEngine = `gemini (${currentModel})`;
              return true;
            }
          } catch (geminiError: any) {
            console.error(`Gemini model ${currentModel} error:`, geminiError.message || geminiError);
          }
        }
        return false;
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

      const tryOpenAI = async (): Promise<boolean> => {
        if (!openaiApiKey) {
          console.warn("OpenAI API key is not configured.");
          return false;
        }
        try {
          console.log("Using OpenAI API Key with gpt-4o-mini...");
          const openai = new OpenAI({ apiKey: openaiApiKey });
          
          const chatMessages: any[] = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((msg: any) => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
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
        } catch (openaiError: any) {
          console.error("OpenAI API error during query:", openaiError.message || openaiError);
          return false;
        }
      };

      // Implement Engines Orchestration depending on Selected Preferences
      if (aiEnginePreference === 'openai') {
        const ok = await tryOpenAI();
        if (!ok) {
          console.log("OpenAI failed, trying fallback to Gemini...");
          const okGem = await tryGemini();
          if (!okGem) {
            console.log("Gemini fallback also failed, trying fallback to Groq...");
            await tryGroq();
          }
        }
      } else if (aiEnginePreference === 'gemini') {
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
        
        const textCleaned = String(message || '').toLowerCase();
        
        let replyText = "আমার সিস্টেমের কাজ চলমান, অনুগ্রহ করে ম্যানুয়ালি খুঁজে নিন। দুঃখিত।";
        let finalTaskMode = slots?.taskMode || "idle";
        
        const isGreeting = textCleaned.includes('হ্যালো') || textCleaned.includes('হাই') || textCleaned.includes('hello') || textCleaned.includes('hi') || textCleaned.includes('সালাম') || textCleaned.includes('salam') || textCleaned.includes('আসসালামু');
        const isIntro = textCleaned.includes('কে তুমি') || textCleaned.includes('তুমি কে') || textCleaned.includes('পরিচয়') || textCleaned.includes('who are you') || textCleaned.includes('your name');
        const isBenefits = textCleaned.includes('রক্তদান') || textCleaned.includes('উপকারিতা') || textCleaned.includes('রক্ত দিলে') || textCleaned.includes('benefit');
        const isThanks = textCleaned.includes('ধন্যবাদ') || textCleaned.includes('thanks') || textCleaned.includes('thank you') || textCleaned.includes('থ্যাঙ্ক');
        
        if (isGreeting) {
          replyText = "ওয়ালাইকুম আসসালাম! আশা করি আল্লাহর রহমতে ভালো আছেন। আমি আপনার রক্তবন্ধু AI সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি? রক্তদাতা খুঁজতে বা আবেদন তৈরি করতে রক্তের গ্রুপ দিয়ে সরাসরি প্রশ্ন করুন!";
        } else if (isIntro) {
          replyText = "আমি ব্লাডলিঙ্ক এআই (BloodLink AI) সহকারী। আমি আপনাকে দ্রুত রক্তের গ্রুপ অনুযায়ী স্বেচ্ছাসেবী রক্তদাতা খুঁজে পেতে এবং জরুরী রক্তের আবেদন পোস্ট করতে সাহায্য করতে পারি।";
        } else if (isBenefits) {
          replyText = "রক্তদান একটি পরম মহৎ কাজ। রক্ত দিলে শরীরের রক্তকণিকা পুনরুজ্জীবিত হয়, রক্তে উপাদানের ভারসাম্য ঠিক থাকে এবং হৃদরোগ ও স্ট্রোকের ঝুঁকি কমে। একটি রক্তদান সর্বোচ্চ ৪ জনের জীবন বাঁচাতে পারে!";
        } else if (isThanks) {
          replyText = "আপনাকে অনেক ধন্যবাদ! ব্লাডলিঙ্ক বাংলাদেশের সাথে থাকুন এবং স্বেচ্ছায় রক্তদানে এগিয়ে আসুন।";
        } else if (slots?.bloodGroup) {
          if (textCleaned.includes('রক্ত চাই') || textCleaned.includes('request') || textCleaned.includes('দরকার') || textCleaned.includes('প্রয়োজন')) {
            replyText = `আমি আপনার ${slots.bloodGroup} গ্রুপের রক্তের আবেদনটির বিবরণ নোট করেছি। অনুগ্রহ করে নিচের 'Publish Request' বাটন ব্যবহার করে সরাসরি আবেদনটি পোস্ট করুন যাতে সকলে দেখতে পায়।`;
            finalTaskMode = "create_request";
          } else {
            replyText = `আমি আপনার জন্য ${slots.bloodGroup} গ্রুপের রক্তদাতার সন্ধান পেয়েছি। নিচে কাছাকাছি এলাকার উপযুক্ত রক্তদাতাদের দেখতে পাবেন এবং তাদের সাথে সরাসরি যোগাযোগ করতে পারবেন।`;
            finalTaskMode = "search_donors";
          }
        } else {
          replyText = `আমি আপনার বার্তাটি পেয়েছি: "${message}"। রক্তদাতা খুঁজতে, আবেদন পোস্ট করতে বা সাধারণ যেকোনো প্রশ্ন থাকলে দয়া করে বিস্তারিত বলুন (যেমন: রক্তের গ্রুপ ও আপনার জেলা)। আমি সাহায্য করার জন্য প্রস্তুত।`;
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

  // OpenAI Text-to-Speech Voice Model API Route
  app.get("/api/openai/speech", async (req, res) => {
    try {
      const text = String(req.query.text || "").trim();
      if (!text) {
        return res.status(400).send("No text provided");
      }

      // Dynamic load OpenAI config with priority
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
        // Fallback to in-memory override or default
        if (inMemoryAiSettings.openaiApiKeyOverride) {
          openaiApiKey = inMemoryAiSettings.openaiApiKeyOverride;
        }
      }

      const openai = new OpenAI({ apiKey: openaiApiKey });
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer", // Natural high-quality female voice friendly for Bangladeshi assistant
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (error: any) {
      if (error && (error.status === 429 || error.message?.includes("quota") || error.message?.includes("billing"))) {
        console.warn("OpenAI API Speech synthesis exceeded quota/billing limits. Local TTS fallbacks will activate automatically.");
        return res.status(429).send("Speech generation unavailable: Quota or billing limit exceeded.");
      }
      console.error("Error in openai-speech API:", error);
      res.status(500).send("Speech generation failed: " + error.message);
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

  // Android build state management
  let androidBuildState = {
    status: "idle", // "idle", "building", "success", "failed"
    logs: "No build started yet. Click 'Trigger Build' to compile and sync native android assets.\n",
    updatedAt: new Date().toISOString(),
    downloadReady: false
  };

  // Helper to run commands asynchronously
  const runBuildProcess = async () => {
    const { exec } = await import("child_process");
    androidBuildState.status = "building";
    androidBuildState.logs = `[${new Date().toISOString()}] Started Android build & update process...\n`;
    androidBuildState.logs += `[Step 1/3] Running 'npm run build' to bundle React production web assets...\n`;
    androidBuildState.updatedAt = new Date().toISOString();
    androidBuildState.downloadReady = false;

    exec("npm run build", (buildErr, buildStdout, buildStderr) => {
      if (buildErr) {
        androidBuildState.status = "failed";
        androidBuildState.logs += `\n❌ 'npm run build' failed!\nError:\n${buildErr.message}\nStderr:\n${buildStderr}\n`;
        androidBuildState.updatedAt = new Date().toISOString();
        return;
      }

      androidBuildState.logs += buildStdout + "\n";
      androidBuildState.logs += `[Step 2/3] Running 'npx cap sync' to synchronize assets and plugins into Android project...\n`;
      androidBuildState.updatedAt = new Date().toISOString();

      exec("npx cap sync", (syncErr, syncStdout, syncStderr) => {
        if (syncErr) {
          androidBuildState.status = "failed";
          androidBuildState.logs += `\n❌ 'npx cap sync' failed!\nError:\n${syncErr.message}\nStderr:\n${syncStderr}\n`;
          androidBuildState.updatedAt = new Date().toISOString();
          return;
        }

        androidBuildState.logs += syncStdout + "\n";
        androidBuildState.logs += `[Step 3/3] Running Python compression script to generate source zip file...\n`;
        androidBuildState.updatedAt = new Date().toISOString();

        // Write python compression inline
        const pythonZippingScript = `
import zipfile
import os

zip_path = '/tmp/android_source.zip'
if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # 1. Add android/ directory recursively
    for root, dirs, files in os.walk('android'):
        for file in files:
            file_path = os.path.join(root, file)
            zipf.write(file_path, file_path)
    # 2. Add capacitor.config.json and package.json
    if os.path.exists('capacitor.config.json'):
        zipf.write('capacitor.config.json', 'capacitor.config.json')
    if os.path.exists('package.json'):
        zipf.write('package.json', 'package.json')
print("Successfully compressed android source code!")
`;

        fs.writeFile("/tmp/zip_script.py", pythonZippingScript, "utf-8")
          .then(() => {
            exec("python3 /tmp/zip_script.py", (pyErr, pyStdout, pyStderr) => {
              if (pyErr) {
                androidBuildState.status = "failed";
                androidBuildState.logs += `\n❌ Python zip script failed!\nError:\n${pyErr.message}\nStderr:\n${pyStderr}\n`;
                androidBuildState.updatedAt = new Date().toISOString();
                return;
              }

              androidBuildState.logs += pyStdout + "\n";
              androidBuildState.logs += `\n🎉 Android Gradle project successfully synced, compiled, and zipped!\n`;
              androidBuildState.status = "success";
              androidBuildState.downloadReady = true;
              androidBuildState.updatedAt = new Date().toISOString();
            });
          })
          .catch((fsErr: any) => {
            androidBuildState.status = "failed";
            androidBuildState.logs += `\n❌ Could not write Python zipping utility: ${fsErr.message}\n`;
            androidBuildState.updatedAt = new Date().toISOString();
          });
      });
    });
  };

  // Get current build status
  app.get("/api/admin/build-android/status", (req, res) => {
    res.json({
      success: true,
      state: androidBuildState
    });
  });

  // Trigger new build
  app.post("/api/admin/build-android", (req, res) => {
    if (androidBuildState.status === "building") {
      return res.json({
        success: false,
        message: "A build compilation is already in progress.",
        state: androidBuildState
      });
    }

    runBuildProcess()
      .then(() => {
        console.log("Asynchronous build process initiated.");
      })
      .catch((e) => {
        console.error("Failed to start build:", e);
      });

    res.json({
      success: true,
      message: "Build process started successfully.",
      state: androidBuildState
    });
  });

  // Download resulting build zip
  app.get("/api/admin/build-android/download", async (req, res) => {
    const zipPath = "/tmp/android_source.zip";
    try {
      await fs.access(zipPath);
      res.download(zipPath, "bloodlink-android-source.zip");
    } catch (e) {
      res.status(404).send("Android build zip file not found or build hasn't completed successfully.");
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
