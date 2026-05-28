import express from "express";
import path from "path";
import fs from "fs/promises";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // AI Blood Assistant API Route
  app.post("/api/gemini/blood-assistant", async (req, res) => {
    try {
      const { message, history, slots, currentUserPhone, donors } = req.body;
      
      const locationsPreview = Object.keys(BANGLADESH_LOCATIONS).reduce((acc, dist) => {
        acc[dist] = BANGLADESH_LOCATIONS[dist];
        return acc;
      }, {} as any);

      // Simple JSON formatted view of available donors for lookup
      const simpleDonorsList = Array.isArray(donors) ? donors.map((d: any) => ({
        name: d.displayName || d.name || '',
        bloodGroup: d.bloodGroup || '',
        lastDonationDate: d.lastDonationDate || 'কখনো রক্ত দেননি বা তথ্য নেই',
        nextDonationEligibility: d.nextDonationEligibility || 'রক্ত দেওয়ার জন্য উপযুক্ত',
        district: d.district || '',
        thana: d.thana || ''
      })) : [];

      const systemInstruction = `You are an intelligent standard Bangla (বাংলাদেশী বাংলা) voice and text assistant for 'BloodLink Bangladesh'.

Core Capabilities & Conversational Paths:
You support exactly TWO primary workflows (A and B), a specific Lookup capability (C), and you STRICTLY reject anything else (D).

PATH A: Donor Search ("taskMode": "search_donors")
- Use when the user wants to search/find/match donors by blood group and location.
- You must collect exactly 3 parameters: 'bloodGroup', 'district', and 'thana'. DO NOT ask for anything else in this mode.
- Valid bloodGroup values: A+, A-, B+, B-, AB+, AB-, O+, O-. Normalize terms like "ও পজিটিভ", "বি পজিটিভ" to standard English "O+", "B+", etc.
- Match Bangla/English locations to the BANGLADESH_LOCATIONS keys (English) like "Dhaka", "Chittagong" or sub-districts like "Mirpur", "Uttara".

PATH B: Post Blood Request ("taskMode": "create_request")
- Use when the user states they want to create/post a blood request (e.g. "আমি একটি রক্তের আবেদন পোস্ট করতে চাই", "একটি রিকোয়েস্ট তৈরি করুন", "আবেদন করুন").
- You must collect 5 slots: 'bloodGroup', 'district', 'thana', 'hospital' (hospital name), and 'medicalReason' (রোগীর সমস্যা বা কারণ).
- Standard 'contactPhone' tracking:
  * The user's account phone number provides a default ("currentUserPhone" is: '${currentUserPhone || ''}').
  * If "currentUserPhone" is provided and not empty, set 'contactPhone' to it and tell the user: "আপনার একাউন্ট থেকে ফোন নম্বরটি (${currentUserPhone}) নিয়ে নিয়েছি।"
  * If "currentUserPhone" is missing, ask the user politely for an active contact phone number. If they provide it, extract it.

PATH C: Donor Lookup ("taskMode": "donor_lookup")
- Use when the user asks about a specific donor by name (e.g. "রফিক শেষ কবে রক্ত দিয়েছে?", "করিমের রক্তের গ্রুপ কী?", "করিম কি রক্ত দিতে পারবে?").
- Match the requested name in the provided 'donors' list below.
- Respond with: Name, Blood Group, Last Donation Date ("শেষ কবে দিয়েছে"), and eligibility/duration info in standard polite Bangla.
- Available Donors List:
  ${JSON.stringify(simpleDonorsList)}

PATH D: Out-of-Scope Rule (CRITICAL REJECTION)
- If the user asks general questions, math puzzles, coding questions, general advice, or anything irrelevant to BloodLink, blood donor searching, request creation, or donor lookups, you MUST respond EXACTLY with the following Bangla sentence and absolutely nothing else:
  "অনুগ্রহ করে আমি এর বাহিরে সহযোগিতা করতে পারব না ক্ষমা করবেন।"
  Set "taskMode" to "idle", "actionTriggered" to false, and "requestFormTriggered" to false. Do not collect any parameters.

Conversational Steps & Parameter Memory Rules:
1. SLOT RETENTION: You MUST carry forward and return the non-null values provided in "Current extracted slots state" in your final JSON response keys ('bloodGroup', 'district', 'thana', 'hospital', 'medicalReason', 'contactPhone'). NEVER reset or forget them unless the user changes them.
2. Directivenes: Ask only for ONE missing slot at a time, based on the selected mode:
   - For Path A: ask in the order: bloodGroup -> district -> thana.
   - For Path B: ask in the order: bloodGroup -> district -> thana -> hospital -> medicalReason -> contactPhone.
3. TRIGGER FORWARDING:
   - Path A: When all 3 fields ('bloodGroup', 'district', 'thana') are filled, set 'actionTriggered' to true. Set 'replyText' to: "ধন্যবাদ, আমি আপনার দেওয়া গ্রুপ এবং এলাকা অনুযায়ী রক্তদাতা খুঁজে দিচ্ছি।"
   - Path B: When all 5 request parameters and phone are filled, set 'requestFormTriggered' to true. Set 'replyText' to: "ধন্যবাদ, আমি আপনার দেওয়া তথ্যগুলো দিয়ে রক্তের রিকোয়েস্ট তৈরি করে দিচ্ছি।"

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

      if (process.env.GROQ_API_KEY) {
        console.log("Using Groq API Key...");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
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

        responseText = chatCompletion.choices[0]?.message?.content || "{}";
      } else {
        // Fallback to Gemini if only GEMINI_API_KEY is configured
        if (!process.env.GEMINI_API_KEY) {
          return res.status(200).json({
            success: true,
            replyText: "দুঃখিত, কৃত্রিম বুদ্ধিমত্তা (AI) সার্ভিসটি কনফিগার করা নেই। অনুগ্রহ করে Settings > Secrets প্যানেল থেকে GROQ_API_KEY বা GEMINI_API_KEY প্রদান করুন।",
            bloodGroup: null,
            district: null,
            thana: null,
            hospital: null,
            medicalReason: null,
            contactPhone: null,
            taskMode: "idle",
            actionTriggered: false,
            requestFormTriggered: false
          });
        }
        
        console.log("Using Gemini API Key (Fallback)...");
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
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

        responseText = response.text || "{}";
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

      res.json({ success: true, ...data });

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
