import express from "express";
import path from "path";
import fs from "fs/promises";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { GoogleGenAI, Type } from "@google/genai";
import { BANGLADESH_LOCATIONS } from "./src/constants";

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

  app.use(express.json());

  // AI Blood Assistant API Route
  app.post("/api/gemini/blood-assistant", async (req, res) => {
    try {
      const { message, history, slots } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({
          success: true,
          replyText: "দুঃখিত, কৃত্রিম বুদ্ধিমত্তা (AI) সার্ভিসটি কনফিগার করা নেই। অনুগ্রহ করে Settings > Secrets প্যানেল থেকে GEMINI_API_KEY প্রদান করুন।",
          bloodGroup: null,
          district: null,
          thana: null,
          intentType: "unknown",
          actionTriggered: false,
          requestFormTriggered: false
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const locationsPreview = Object.keys(BANGLADESH_LOCATIONS).reduce((acc, dist) => {
        acc[dist] = BANGLADESH_LOCATIONS[dist];
        return acc;
      }, {} as any);

      const systemInstruction = `You are a helpful standard Bangla (বাংলাদেশী বাংলা) voice assistant for 'BloodLink Bangladesh'.
Your EXCLUSIVE task is to get exactly 3 parameters from the user to search for a blood donor. The three fields are: 'bloodGroup', 'district', and 'thana'. DO NOT ask for anything else.

CRITICAL INSTRUCTIONS FOR CONVERSATIONAL MEMORY AND FIELD CAPTURE:
1. SLOT MEMORY RETENTION: You MUST carry forward and return the non-null values provided below in "Current extracted slots state from previous turns" in your final JSON response keys ('bloodGroup', 'district', 'thana'). NEVER reset them to null if they were already captured in previous turns unless the user specifically speaks a new/different value for that field.

2. EXTRACTION ON ANY ENTRY ORDER: The user might say these fields in any random order or all together (e.g. "মিরপুর" first, or "ঢাকা ও পজিটিভ" first). Carefully extract them whenever they are mentioned in any format:
   - 'bloodGroup': Valid values are A+, A-, B+, B-, AB+, AB-, O+, O-. Normalize "ও পজিটিভ", "বি পজিটিভ", "বি নেগেটিভ", "O positive" etc. to their standard English labels like "O+", "B+", "B-", "AB+".
   - 'district': Match and normalize any Bangla/English district names to the English district key from BANGLADESH_LOCATIONS (e.g. "ঢাকা" -> "Dhaka", "চট্টগ্রাম" -> "Chittagong", "সিলেট" -> "Sylhet").
   - 'thana': Match the Thana/sub-district with values in BANGLADESH_LOCATIONS. (e.g. "মিরপুর" -> "Mirpur", "খিলগাঁও" -> "Khilgaon").

3. CONVERSATIONAL DIRECTIVENESS & STEPS (ONLY ASK MISSING FIELDS):
   - Every response must look at what is still missing among 'bloodGroup', 'district', and 'thana' based on both previous slots and the new message.
   - If 'bloodGroup' is missing: Say: "আপনার কোন গ্রুপের রক্ত লাগবে?"
   - If 'bloodGroup' is present but 'district' is missing: Say: "কোন জেলায় রক্ত প্রয়োজন?"
   - If 'bloodGroup' and 'district' are present but 'thana' is missing: Say: "উক্ত জেলার কোন থানায় রক্ত লাগবে?"
   - Do NOT ask more than one question at a time. Do NOT ask for health conditions, hospital names, or patient descriptions. Only ask for the missing slot of these three.

4. TRIGGER SEARCH:
   - When all 3 fields ('bloodGroup', 'district', 'thana') are filled, set 'actionTriggered' to true. Set 'replyText' to: "ধন্যবাদ, আমি আপনার দেওয়া গ্রুপ এবং এলাকা অনুযায়ী রক্তদাতা খুঁজে দিচ্ছি।" (Thank you, I am finding donor based on your group and location).

Current extracted slots state from previous turns:
- bloodGroup: ${slots?.bloodGroup || 'null'}
- district: ${slots?.district || 'null'}
- thana: ${slots?.thana || 'null'}

Valid locations map for matching districts and thanas (English names):
${JSON.stringify(locationsPreview)}

You must output STRICT valid JSON matching the schema. Always answer in clear, polite standard Bangla dialouge.`;

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
              replyText: {
                type: Type.STRING,
                description: "Bangla speech text to speak or display to the user.",
              },
              bloodGroup: {
                type: Type.STRING,
                description: "Extracted blood group (must be one of A+, A-, B+, B-, AB+, AB-, O+, O- or null).",
              },
              district: {
                type: Type.STRING,
                description: "Extracted english district name from BANGLADESH_LOCATIONS keys or null.",
              },
              thana: {
                type: Type.STRING,
                description: "Extracted english thana name matching one of the values in the selected district or null.",
              },
              intentType: {
                type: Type.STRING,
                description: "Must be one of: 'search_donors', 'create_request', 'greeting', 'unknown'.",
              },
              actionTriggered: {
                type: Type.BOOLEAN,
                description: "Set to true when bloodGroup is captured and you are ready to trigger the database search.",
              },
              requestFormTriggered: {
                type: Type.BOOLEAN,
                description: "Set to true if user wants to post or create a blood request.",
              }
            },
            required: ["replyText", "bloodGroup", "district", "thana", "intentType", "actionTriggered", "requestFormTriggered"]
          }
        }
      });

      const responseText = response.text || "{}";
      const data = JSON.parse(responseText.trim());

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

      const returnedBloodGroup = cleanInputSlot(data.bloodGroup);
      const returnedDistrict = cleanInputSlot(data.district);
      const returnedThana = cleanInputSlot(data.thana);

      if (!returnedBloodGroup && prevBloodGroup) {
        data.bloodGroup = prevBloodGroup;
      }
      if (!returnedDistrict && prevDistrict) {
        data.district = prevDistrict;
      }
      if (!returnedThana && prevThana) {
        data.thana = prevThana;
      }

      // If all three slots are filled, force actionTriggered to be true
      const finalBloodGroup = cleanInputSlot(data.bloodGroup);
      const finalDistrict = cleanInputSlot(data.district);
      const finalThana = cleanInputSlot(data.thana);

      if (finalBloodGroup && finalDistrict && finalThana) {
        data.actionTriggered = true;
        // Adjust response greeting slightly to reflect search launch
        data.replyText = data.replyText || "ধন্যবাদ, আমি আপনার দেওয়া গ্রুপ এবং এলাকা অনুযায়ী রক্তদাতা খুঁজে দিচ্ছি।";
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
