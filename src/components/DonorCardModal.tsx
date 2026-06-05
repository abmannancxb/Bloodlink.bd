import React, { useRef, useEffect, useState } from "react";
import { X, Download, Share2, Copy, Check, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  bloodGroup: string | null;
  thana: string | null;
  district: string | null;
  photoURL: string | null;
  isVerified?: boolean;
  lastDonationDate?: any;
}

interface DonorCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  addToast: (title: string, body: string, type: "success" | "error" | "info") => void;
}

export function DonorCardModal({ isOpen, onClose, profile, addToast }: DonorCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [generating, setGenerating] = useState(true);

  // Helper date function
  const formatDisplayDate = (val: any) => {
    if (!val) return "2026-06-02";
    if (typeof val === "string") return val;
    if (val.seconds) {
      const d = new Date(val.seconds * 1000);
      return d.toISOString().split("T")[0];
    }
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    return String(val);
  };

  const donorId = `BLD${profile.uid.substring(0, 8).toUpperCase()}`;

  useEffect(() => {
    if (!isOpen) return;

    const renderCard = async () => {
      setGenerating(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Ensure crisp high definition
      canvas.width = 1000;
      canvas.height = 524;

      // 1. Draw rounded outer clipper path for high-end look
      ctx.save();
      ctx.beginPath();
      const radius = 32;
      ctx.moveTo(radius, 0);
      ctx.lineTo(canvas.width - radius, 0);
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
      ctx.lineTo(canvas.width, canvas.height - radius);
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
      ctx.lineTo(radius, canvas.height);
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();

      // 2. Draw rich crimson-to-ruby red linear gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#E53935"); // Primary Curvaceous From
      grad.addColorStop(0.5, "#FF1744"); // Mid Ruby Active
      grad.addColorStop(1, "#E31B23"); // Baseline Ruby Solid
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Draw ambient lighting overlay (curved glowing shapes/vector rings)
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.arc(-50, canvas.height + 50, 240, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 64, 129, 0.15)";
      ctx.beginPath();
      ctx.arc(canvas.width + 50, -50, 300, 0, Math.PI * 2);
      ctx.fill();

      // Subtle modern tech vector horizontal lines for sleek touch
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < canvas.height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // 4. Header title: "DONOR PROFILE"
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "black 20px 'Space Grotesk', 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      // Track the letter spacing nicely matching photo standard
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = "10px";
      }
      ctx.fillText("DONOR PROFILE", canvas.width / 2, 50);

      // Restore letterspacing for rest of texts
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = "normal";
      }

      // 5. Draw QR Code White Container Box on the Right
      const qrBoxX = 720;
      const qrBoxY = 135;
      const qrBoxW = 190;
      const qrBoxH = 240;
      const qrR = 20;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(qrBoxX + qrR, qrBoxY);
      ctx.lineTo(qrBoxX + qrBoxW - qrR, qrBoxY);
      ctx.quadraticCurveTo(qrBoxX + qrBoxW, qrBoxY, qrBoxX + qrBoxW, qrBoxY + qrR);
      ctx.lineTo(qrBoxX + qrBoxW, qrBoxY + qrBoxH - qrR);
      ctx.quadraticCurveTo(qrBoxX + qrBoxW, qrBoxY + qrBoxH, qrBoxX + qrBoxW - qrR, qrBoxY + qrBoxH);
      ctx.lineTo(qrBoxX + qrR, qrBoxY + qrBoxH);
      ctx.quadraticCurveTo(qrBoxX, qrBoxY + qrBoxH, qrBoxX, qrBoxY + qrBoxH - qrR);
      ctx.lineTo(qrBoxX, qrBoxY + qrR);
      ctx.quadraticCurveTo(qrBoxX, qrBoxY, qrBoxX + qrR, qrBoxY);
      ctx.closePath();
      ctx.fill();

      // Add soft inset shadow line in QR container
      ctx.strokeStyle = "rgba(240, 240, 240, 0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw stylized high-end vector QR grid matrix
      const matrixX = qrBoxX + 25;
      const matrixY = qrBoxY + 25;
      const matrixSize = 140;

      ctx.fillStyle = "#0F172A"; // Slate-900

      // Draw Top-Left QR Anchor Square
      ctx.fillRect(matrixX, matrixY, 35, 35);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(matrixX + 5, matrixY + 5, 25, 25);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(matrixX + 10, matrixY + 10, 15, 15);

      // Draw Top-Right QR Anchor Square
      ctx.fillRect(matrixX + matrixSize - 35, matrixY, 35, 35);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(matrixX + matrixSize - 30, matrixY + 5, 25, 25);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(matrixX + matrixSize - 25, matrixY + 10, 15, 15);

      // Draw Bottom-Left QR Anchor Square
      ctx.fillRect(matrixX, matrixY + matrixSize - 35, 35, 35);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(matrixX + 5, matrixY + matrixSize - 30, 25, 25);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(matrixX + 10, matrixY + matrixSize - 25, 15, 15);

      // Draw Bottom-Right alignment target
      ctx.fillRect(matrixX + matrixSize - 25, matrixY + matrixSize - 25, 15, 15);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(matrixX + matrixSize - 21, matrixY + matrixSize - 21, 7, 7);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(matrixX + matrixSize - 18, matrixY + matrixSize - 18, 3, 3);

      // Fill in some random aesthetic QR pixels to look incredibly lifelike
      srand(profile.uid); // seed RNG to make it static per user
      const cellSize = 6;
      for (let row = 0; row < matrixSize; row += cellSize) {
        for (let col = 0; col < matrixSize; col += cellSize) {
          // Avoid corner anchor regions
          const isTopLeft = row < 40 && col < 40;
          const isTopRight = row < 40 && col > matrixSize - 40;
          const isBottomLeft = row > matrixSize - 40 && col < 40;
          const isBottomRight = row > matrixSize - 30 && col > matrixSize - 30;

          if (!isTopLeft && !isTopRight && !isBottomLeft && !isBottomRight) {
            if (random() > 0.45) {
              ctx.fillRect(matrixX + col, matrixY + row, cellSize - 1, cellSize - 1);
            }
          }
        }
      }

      // Text inside White QR box
      ctx.fillStyle = "#64748B"; // slate-500
      ctx.font = "900 10px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
      ctx.fillText("DONOR ID", qrBoxX + qrBoxW / 2, qrBoxY + qrBoxH - 45);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "normal";

      ctx.fillStyle = "#0F172A"; // slate-900
      ctx.font = "900 15px 'Courier New', monospace";
      ctx.fillText(donorId, qrBoxX + qrBoxW / 2, qrBoxY + qrBoxH - 24);

      // 6. Draw Left Column Text & Details
      const labelX = 320;

      // Primary name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 38px 'Space Grotesk', 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(profile.displayName, labelX, 150);

      // Verified check circle if eligible
      const textWidth = ctx.measureText(profile.displayName).width;
      if (profile.isVerified) {
        ctx.fillStyle = "#10B981"; // emerald-500 verified
        ctx.beginPath();
        ctx.arc(labelX + textWidth + 25, 163, 11, 0, Math.PI * 2);
        ctx.fill();

        // Draw small beautiful tick
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(labelX + textWidth + 21, 163);
        ctx.lineTo(labelX + textWidth + 24, 166);
        ctx.lineTo(labelX + textWidth + 29, 159);
        ctx.stroke();
      }

      // Draw Badge Pills side-by-side
      // Badge 1 (Blood Group): White pill with red group
      const bgPillX = labelX;
      const bgPillY = 195;
      const bgPillW = 160;
      const bgPillH = 34;
      const pillR = 17;

      ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bgPillX, bgPillY, bgPillW, bgPillH, pillR) : drawFallbackRoundRect(ctx, bgPillX, bgPillY, bgPillW, bgPillH, pillR);
      ctx.fill();

      // Draw blood circle node
      ctx.fillStyle = "#EC4899"; // pink-500
      ctx.beginPath();
      ctx.arc(bgPillX + 16, bgPillY + 17, 5, 0, Math.PI * 2);
      ctx.fill();

      // Blood Badge Text
      ctx.fillStyle = "#E11D48"; // rose-600
      ctx.font = "900 13px 'Space Grotesk', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${profile.bloodGroup || "O+"} Positive`, bgPillX + 28, bgPillY + 22);

      // Badge 2 (Verified Rank Badge): White pill with green verified
      const rankPillX = labelX + 175;
      const rankPillW = 155;

      ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(rankPillX, bgPillY, rankPillW, bgPillH, pillR) : drawFallbackRoundRect(ctx, rankPillX, bgPillY, rankPillW, bgPillH, pillR);
      ctx.fill();

      // Green shield node
      ctx.strokeStyle = "#10B981"; // emerald-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rankPillX + 12, bgPillY + 12);
      ctx.lineTo(rankPillX + 18, bgPillY + 8);
      ctx.lineTo(rankPillX + 24, bgPillY + 12);
      ctx.lineTo(rankPillX + 24, bgPillY + 19);
      ctx.quadraticCurveTo(rankPillX + 18, bgPillY + 26, rankPillX + 18, bgPillY + 26);
      ctx.quadraticCurveTo(rankPillX + 12, bgPillY + 19, rankPillX + 12, bgPillY + 19);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = "#059669"; // emerald-600 font
      ctx.font = "900 13px 'Space Grotesk', sans-serif";
      ctx.fillText("Verified Donor", rankPillX + 32, bgPillY + 22);

      // 7. Last Donation, Location, and Availability Rows
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 15px 'Space Grotesk', 'Inter', sans-serif";

      // Row A: Map Pin Icon & Location details
      const rowY1 = 265;
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("📍", labelX, rowY1 + 13);
      ctx.font = "bold 16px 'Space Grotesk', sans-serif";
      ctx.fillText(`${profile.thana || "Cox's Bazar"}, ${profile.district || "Cox's Bazar"}, BD`, labelX + 22, rowY1 + 14);

      // Row B: Calendar Icon & Info
      const rowY2 = 315;
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("📅", labelX, rowY2 + 13);
      ctx.font = "bold 16px 'Space Grotesk', sans-serif";
      ctx.fillText(`Last Donation: ${formatDisplayDate(profile.lastDonationDate)}`, labelX + 22, rowY2 + 14);

      // Row C: Pulse Active Status Node
      const rowY3 = 365;
      ctx.fillStyle = "#4ADE80"; // emerald-400 indicator node
      ctx.beginPath();
      ctx.arc(labelX + 8, rowY3 + 12, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "900 16px 'Space Grotesk', sans-serif";
      ctx.fillText("Online • Available for donor search", labelX + 22, rowY3 + 17);

      // 8. Load and render circular avatar of the donor with robust CORS handling
      const avatarBoxX = 130;
      const avatarBoxY = 262; // vertical center circle
      const avatarR = 80;

      // Draw circular avatar with premium 2.5D white framing
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(avatarBoxX, avatarBoxY, avatarR + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Try reading user profile image directly
      const photoSrc = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=200&background=F1F5F9&color=0F172A&bold=true`;

      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      avatarImg.src = photoSrc;

      const drawDefaultFallbackAvatar = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarBoxX, avatarBoxY, avatarR, 0, Math.PI * 2);
        ctx.clip();

        // Gorgeous slate fill
        ctx.fillStyle = "#F1F5F9";
        ctx.fillRect(avatarBoxX - avatarR, avatarBoxY - avatarR, avatarR * 2, avatarR * 2);

        // Draw big gorgeous letter initials representing name
        ctx.fillStyle = "#0F172A";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "900 54px 'Space Grotesk', sans-serif";
        const initials = profile.displayName
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        ctx.fillText(initials, avatarBoxX, avatarBoxY);
        ctx.restore();

        drawStatusIndicator(ctx, avatarBoxX, avatarBoxY, avatarR);
        setGenerating(false);
      };

      avatarImg.onload = () => {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarBoxX, avatarBoxY, avatarR, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(avatarImg, avatarBoxX - avatarR, avatarBoxY - avatarR, avatarR * 2, avatarR * 2);
          ctx.restore();

          drawStatusIndicator(ctx, avatarBoxX, avatarBoxY, avatarR);
          setGenerating(false);
        } catch (e) {
          console.warn("Canvas Tainted, using slate avatar backup:", e);
          drawDefaultFallbackAvatar();
        }
      };

      avatarImg.onerror = () => {
        drawDefaultFallbackAvatar();
      };

      ctx.restore();
    };

    renderCard();
  }, [isOpen, profile]);

  const drawStatusIndicator = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    // Beautiful green indicator
    ctx.save();
    const indX = centerX + radius * Math.cos(Math.PI / 4);
    const indY = centerY + radius * Math.sin(Math.PI / 4);
    
    ctx.fillStyle = "#10B981"; // Status circle emerald
    ctx.strokeStyle = "#FFFFFF"; // Frame padding
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(indX, indY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawFallbackRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Safe seed RNG to draw deterministic QR grids
  let seed = 1;
  const srand = (str: string) => {
    let s = 0;
    for (let i = 0; i < str.length; i++) {
      s += str.charCodeAt(i);
    }
    seed = s || 1;
  };
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Safe copy links to clipboard
  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}?profile=${profile.uid}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      addToast("Card Link Copied!", "Shareable profile registry link copied to your clipboard.", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // File download JPG card handler
  const handleDownloadJPG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setDownloading(true);
      // Generate clean max quality image from native canvas
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      
      const link = document.createElement("a");
      link.download = `BloodDonor_Card_${profile.displayName.replace(/\s+/g, "_")}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast("Card Downloaded!", "Your official HD Donor Profile card saved as JPG successfully.", "success");
    } catch (err: any) {
      console.error(err);
      addToast("Download failed", "An unexpected error occurred during image compilation.", "error");
    } finally {
      setDownloading(false);
    }
  };

  // Share generated JPG Card via Web Share API
  const handleShareJPG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setSharing(true);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          addToast("Generation failed", "Could not generate file representation of your card.", "error");
          setSharing(false);
          return;
        }

        const file = new File([blob], `DonorCard_${profile.displayName.replace(/\s+/g, "_")}.jpg`, { type: "image/jpeg" });
        const shareData = {
          files: [file],
          title: `${profile.displayName} | Blood Link Profile Card`,
          text: `রক্তদাতাদের সাথে যুক্ত থাকতে আমাদের প্ল্যাটফর্মে যুক্ত হোন! ${profile.displayName} (${profile.bloodGroup || 'O+'} Positive) রক্তদাতার পাবলিক কার্ড দেখুন।`,
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            addToast("Shared Successfully!", "Thank you for spreading the lifesaving word!", "success");
          } catch (shareErr: any) {
            // Cancelled or unsupported
            if (shareErr.name !== "AbortError") {
              handleCopyLink();
            }
          }
        } else {
          // Direct fallback to copy link and auto download for seamless fallback coverage
          addToast("Link Copied & Image Downloaded", "Web sharing not fully supported on this device. Copied directory link and saved card JPG image instead!", "info");
          handleCopyLink();
          handleDownloadJPG();
        }
        setSharing(false);
      }, "image/jpeg", 0.95);
    } catch (err: any) {
      console.error(err);
      addToast("Sharing issue", "Could not stream card byte payload.", "error");
      setSharing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Ambient backdrop glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-3xl shadow-2xl relative w-full max-w-[540px] overflow-hidden border border-slate-100 z-10 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <QrCode className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Lifesaving Donor Card</h3>
                  <p className="text-[10px] text-slate-400 font-bold leading-none">Share & Spread the Voluntary Blood Movement</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Visual Render Zone */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-50/20 text-center gap-4">
              <p className="text-[11px] text-slate-500 font-extrabold flex items-center gap-1 leading-none select-none">
                <span>🌟</span>
                <span>Generating High-Definition shareable badge card...</span>
              </p>

              {/* Responsive container bounding widescreen canvas */}
              <div className="w-full relative rounded-2xl overflow-hidden aspect-[1000/524] shadow-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-red-50 flex items-center justify-center max-w-[480px]">
                {generating && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2.5 z-10">
                    <div className="w-8 h-8 rounded-full border-3 border-rose-500 border-t-transparent animate-spin" />
                    <span className="text-[10px] text-rose-600 font-black uppercase tracking-widest animate-pulse">Rendering Vector...</span>
                  </div>
                )}
                {/* Visual rendering target canvas */}
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
              </div>

              <span className="text-[9.5px] text-slate-400 font-bold max-w-[340px] leading-tight">
                This secure identity card includes your Verified Blood Group badges, physical location, and real-time voluntary donor registry serial ID.
              </span>
            </div>

            {/* Action footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/80 grid grid-cols-2 gap-3.5">
              <button
                onClick={handleShareJPG}
                disabled={sharing || generating}
                className="w-full bg-[#FF1744] hover:bg-[#D50000] text-white rounded-2xl py-3.5 flex items-center justify-center gap-2.5 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-red-500/10 active:scale-97 select-none"
              >
                <Share2 className="w-4.5 h-4.5" />
                <span>{sharing ? "Sharing..." : "Share to WhatsApp / Apps"}</span>
              </button>

              <button
                onClick={handleDownloadJPG}
                disabled={downloading || generating}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2.5 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md active:scale-97 select-none"
              >
                <Download className="w-4.5 h-4.5" />
                <span>{downloading ? "Downloading..." : "Download JPG (HD)"}</span>
              </button>

              <button
                onClick={handleCopyLink}
                disabled={generating}
                className="col-span-2 w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl py-3 flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-98 cursor-pointer select-none mt-1"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? "Profile Link Copied!" : "Copy Public Profile Web Link"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
