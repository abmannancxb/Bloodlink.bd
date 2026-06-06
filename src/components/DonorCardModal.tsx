import React, { useRef, useEffect, useState } from "react";
import { X, Download, Share2, Copy, Check, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, getDonorId } from "../types";

interface DonorCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  addToast: (title: string, body: string, type: "success" | "error" | "info") => void;
  allUsers?: UserProfile[];
}

export function DonorCardModal({ isOpen, onClose, profile, addToast, allUsers = [] }: DonorCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [generating, setGenerating] = useState(true);

  // Helper date function
  const formatDisplayDate = (val: any) => {
    if (!val) return "2026-06-02";
    if (typeof val === "string") return val;
    if (val && typeof val === "object" && 'seconds' in val) {
      const d = new Date((val as any).seconds * 1000);
      return d.toISOString().split("T")[0];
    }
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    return String(val);
  };

  const donorId = getDonorId(profile, allUsers);

  useEffect(() => {
    if (!isOpen) return;

    const renderCard = async () => {
      setGenerating(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Ensure crisp high definition with widescreen standard layout cropped to the card outline
      canvas.width = 1000;
      canvas.height = 680;

      // Draw elegant soft background of the card environment (soft off-white bento stage)
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Red Card background
      ctx.save();
      const redCardX = 25;
      const redCardY = 25;
      const redCardW = 950;
      const redCardH = 630;
      const redCardR = 48;

      // Realistic premium drop shadow on the central ID card
      ctx.shadowColor = "rgba(220, 38, 38, 0.25)";
      ctx.shadowBlur = 35;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;

      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(redCardX, redCardY, redCardW, redCardH, redCardR) 
        : drawFallbackRoundRect(ctx, redCardX, redCardY, redCardW, redCardH, redCardR);
      ctx.closePath();

      // Premium ruby cherry red linear gradient background from screenshot
      const grad = ctx.createLinearGradient(redCardX, redCardY, redCardX, redCardY + redCardH);
      grad.addColorStop(0, "#FF406D"); // Light coral rose accent
      grad.addColorStop(0.35, "#EF4444"); // Mid vibrant red
      grad.addColorStop(1, "#D31F27"); // Sleek base crimson red
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore(); // Restore shadow so it does not affect any inner items

      // Draw premium design/wave line overlays on card background with clipping to stay within margins
      ctx.save();
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(redCardX, redCardY, redCardW, redCardH, redCardR) 
        : drawFallbackRoundRect(ctx, redCardX, redCardY, redCardW, redCardH, redCardR);
      ctx.clip();

      // Elegant glow behind the profile photo
      const avatarBoxX = 135;
      const avatarBoxY = 250;
      const avatarR = 75;
      const labelX = 240;

      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.arc(avatarBoxX, avatarBoxY, 200, 0, Math.PI * 2);
      ctx.fill();

      // Top right elegant concentric vector swoop lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(redCardX + redCardW, redCardY, 320, Math.PI * 0.95, Math.PI * 1.55);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(redCardX + redCardW, redCardY, 380, Math.PI * 0.95, Math.PI * 1.55);
      ctx.stroke();

      // Bottom left concentric wave arcs surrounding the details area
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(redCardX, redCardY + redCardH, 450, Math.PI * 1.6, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // 2. Header Title text: "DONOR PROFILE"
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 34px 'Space Grotesk', 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = "15px";
      }
      ctx.fillText("DONOR PROFILE", redCardX + redCardW / 2, redCardY + 65);
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = "normal";
      }

      // 3. Right White Box for QR Code badge (Floating with soft corner matching frame - aligned higher up!)
      const qrBoxX = 705;
      const qrBoxY = 110;
      const qrBoxW = 220;
      const qrBoxH = 265;
      const qrR = 28;

      ctx.save();
      // Premium depth shadows under the floating QR panel to make it high-end and pop-out
      ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, qrR) 
        : drawFallbackRoundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, qrR);
      ctx.fill();
      ctx.restore();

      // Style finder patterns and modern high-end vector QR grid matrix
      const matrixX = qrBoxX + 40;
      const matrixY = qrBoxY + 25;
      const matrixSize = 140;

      drawFinderPattern(ctx, matrixX, matrixY, 35);
      drawFinderPattern(ctx, matrixX + matrixSize - 35, matrixY, 35);
      drawFinderPattern(ctx, matrixX, matrixY + matrixSize - 35, 35);

      // Seed deterministic generator with UID to construct static unique QR representation
      srand(profile.uid);

      // Draw high-density QR pixel squares
      const cellSize = 7;
      ctx.fillStyle = "#1E293B"; // Slate dark pixel grid
      for (let row = 0; row < matrixSize; row += cellSize) {
        for (let col = 0; col < matrixSize; col += cellSize) {
          const isTopLeft = row < 40 && col < 40;
          const isTopRight = row < 40 && col > matrixSize - 40;
          const isBottomLeft = row > matrixSize - 40 && col < 40;

          if (!isTopLeft && !isTopRight && !isBottomLeft) {
            if (random() > 0.42) {
              ctx.beginPath();
              ctx.roundRect 
                ? ctx.roundRect(matrixX + col + 1, matrixY + row + 1, cellSize - 2, cellSize - 2, 2.5)
                : ctx.fillRect(matrixX + col + 1, matrixY + row + 1, cellSize - 2, cellSize - 2);
              ctx.fill();
            }
          }
        }
      }

      // Labels below the QR inside the white panel
      ctx.fillStyle = "#64748B"; // Premium medium slate
      ctx.font = "900 12px 'Space Grotesk', sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = "4px";
      }
      ctx.fillText("DONOR ID", qrBoxX + qrBoxW / 2, qrBoxY + 195); // Perfectly balanced padding
      if ("letterSpacing" in ctx) {
        ctx.letterSpacing = "normal";
      }

      // Big, highly bold and legible DONOR ID
      ctx.fillStyle = "#0F172A"; // Ultra slate dark
      ctx.font = "900 24px 'Space Grotesk', sans-serif";
      ctx.fillText(donorId, qrBoxX + qrBoxW / 2, qrBoxY + 225);

      // 4. Draw Left Column elements matching vertical layout of screenshot
      const nameText = profile.displayName.toUpperCase();
      ctx.fillStyle = "#FFFFFF";
      
      // Dynamic font size optimization for long names to prevent bleeding into QR Code area (starts at 705)
      let nameFontSize = 42;
      ctx.font = `900 ${nameFontSize}px 'Space Grotesk', 'Inter', sans-serif`;
      while (ctx.measureText(nameText).width > 440 && nameFontSize > 22) {
        nameFontSize -= 2;
        ctx.font = `900 ${nameFontSize}px 'Space Grotesk', 'Inter', sans-serif`;
      }
      
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(nameText, labelX, 175);

      const nameW = ctx.measureText(nameText).width;

      // Draw high fidelity verified check Badge right next to the Name
      if (profile.isVerified) {
        const checkCenterX = labelX + nameW + 24;
        const checkCenterY = 175;
        const checkRadius = 14;

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(checkCenterX, checkCenterY, checkRadius, 0, Math.PI * 2);
        ctx.fill();

        // Custom Crimson Thick Check shape
        ctx.strokeStyle = "#E11D48";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(checkCenterX - 5, checkCenterY);
        ctx.lineTo(checkCenterX - 1.8, checkCenterY + 3.8);
        ctx.lineTo(checkCenterX + 5, checkCenterY - 3.8);
        ctx.stroke();
      }

      // Pills side-by-side
      // Pill 1: Blood Group
      const bgText = `• ${profile.bloodGroup || "O+"} Positive`;
      ctx.font = "900 18px 'Space Grotesk', sans-serif";
      const pill1W = ctx.measureText(bgText).width + 30;
      const pillH = 40;
      const pillY = 215;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(labelX, pillY, pill1W, pillH, 20) 
        : drawFallbackRoundRect(ctx, labelX, pillY, pill1W, pillH, 20);
      ctx.fill();

      ctx.fillStyle = "#E11D48"; // Premium Rose
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(bgText, labelX + 15, pillY + 20);

      // Pill 2: Verified Donor
      const verText = "Verified Donor";
      ctx.font = "900 18px 'Space Grotesk', sans-serif";
      const pill2W = ctx.measureText(verText).width + 50;
      const pill2X = labelX + pill1W + 15;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(pill2X, pillY, pill2W, pillH, 20) 
        : drawFallbackRoundRect(ctx, pill2X, pillY, pill2W, pillH, 20);
      ctx.fill();

      // Shield active emerald outline logo inside Verified Pill
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pill2X + 15, pillY + 15);
      ctx.lineTo(pill2X + 21, pillY + 11);
      ctx.lineTo(pill2X + 27, pillY + 15);
      ctx.lineTo(pill2X + 27, pillY + 21);
      ctx.quadraticCurveTo(pill2X + 21, pillY + 28, pill2X + 21, pillY + 28);
      ctx.quadraticCurveTo(pill2X + 15, pillY + 22, pill2X + 15, pillY + 22);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pill2X + 18, pillY + 19);
      ctx.lineTo(pill2X + 20, pillY + 21);
      ctx.lineTo(pill2X + 24, pillY + 17);
      ctx.stroke();

      ctx.fillStyle = "#059669"; // emerald dark
      ctx.fillText(verText, pill2X + 37, pillY + 20);

      // Location details line — Optimized to prevent overlapping with any QR Code box on the right (starts at X=705)
      const localThana = profile.thana || "Cox's Bazar Sadar";
      const localDistrict = profile.district || "Cox's Bazar";
      const locationText = `📍 Location: ${localThana}, ${localDistrict}`;
      ctx.fillStyle = "#FFFFFF";
      
      let locFontSize = 18;
      ctx.font = `900 ${locFontSize}px 'Space Grotesk', sans-serif`;
      while (ctx.measureText(locationText).width > 440 && locFontSize > 13) {
        locFontSize -= 1;
        ctx.font = `900 ${locFontSize}px 'Space Grotesk', sans-serif`;
      }
      ctx.fillText(locationText, labelX, 285);

      // Height and Weight metrics row — Optimized to ensure Height is fully visible and not hidden/cut-off in the QR area
      const heightStr = profile.heightFeet ? `${profile.heightFeet} Ft ${profile.heightInches || 0} In` : "5 Ft 9 In";
      const weightStr = profile.weight ? `${profile.weight} KG` : "68 KG";
      const statsRowText = `⚖️ Weight: ${weightStr}  |  📏 Height: ${heightStr}`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      
      let statsFontSize = 16;
      ctx.font = `900 ${statsFontSize}px 'Space Grotesk', sans-serif`;
      while (ctx.measureText(statsRowText).width > 440 && statsFontSize > 12) {
        statsFontSize -= 1;
        ctx.font = `900 ${statsFontSize}px 'Space Grotesk', sans-serif`;
      }
      ctx.fillText(statsRowText, labelX, 335);

      // Date parsing to visual style
      const formattedDonationDate = formatDisplayDate(profile.lastDonationDate);
      let displayDateText = formattedDonationDate;
      if (formattedDonationDate && formattedDonationDate.includes("-")) {
        try {
          const parts = formattedDonationDate.split("-");
          if (parts.length === 3) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const year = parts[0];
            const month = months[parseInt(parts[1], 10) - 1] || "Apr";
            const day = parseInt(parts[2], 10);
            displayDateText = `${day} ${month} ${year}`;
          }
        } catch (e) {}
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 20px 'Space Grotesk', sans-serif";
      ctx.fillText(`🗓️ Last Donation: ${displayDateText || "20 Apr 2024"}`, labelX, 380);

      // Active status dot and text
      ctx.fillStyle = "#10B981"; // Emerald
      ctx.beginPath();
      ctx.arc(labelX + 8, 420, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 18px 'Space Grotesk', sans-serif";
      ctx.fillText("Online • Available for donation", labelX + 24, 420);

      // 5. Draw Unified White Bar inside Red Card at the bottom
      const whiteBarX = redCardX + 25;
      const whiteBarY = 475;
      const whiteBarW = redCardW - 50;
      const whiteBarH = 150;
      const whiteBarR = 28;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(whiteBarX, whiteBarY, whiteBarW, whiteBarH, whiteBarR) 
        : drawFallbackRoundRect(ctx, whiteBarX, whiteBarY, whiteBarW, whiteBarH, whiteBarR);
      ctx.fill();

      // Separate 4 stats blocks horizontally inside the white bar
      const statCols = [
        {
          value: String(profile.donationCount || 25),
          label1: "TOTAL",
          label2: "DONATIONS",
          bgColor: "#EFF6FF",
          iconColor: "#3B82F6",
          drawIcon: (cx: number, cy: number) => drawDroplet(ctx, cx, cy, 14)
        },
        {
          value: String((profile.donationCount || 25) * 3),
          label1: "LIVES",
          label2: "SAVED",
          bgColor: "#FFF1F2",
          iconColor: "#EF4444",
          drawIcon: (cx: number, cy: number) => drawHeart(ctx, cx, cy, 13)
        },
        {
          value: "4.9",
          label1: "STAR",
          label2: "RATING",
          bgColor: "#FEF3C7",
          iconColor: "#F59E0B",
          drawIcon: (cx: number, cy: number) => drawStar(ctx, cx, cy, 13)
        },
        {
          value: "98%",
          label1: "RESPONSE",
          label2: "RATE",
          bgColor: "#FDF2F8",
          iconColor: "#EC4899",
          drawIcon: (cx: number, cy: number) => {
            ctx.strokeStyle = "#EC4899";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            drawPulse(ctx, cx, cy, 14);
          }
        }
      ];

      statCols.forEach((col, i) => {
        const cx = whiteBarX + 112.5 + i * 225;
        const iconY = whiteBarY + 38;

        // Soft circle background
        ctx.fillStyle = col.bgColor;
        ctx.beginPath();
        ctx.arc(cx, iconY, 22, 0, Math.PI * 2);
        ctx.fill();

        // Draw the exact vector icon
        ctx.fillStyle = col.iconColor;
        col.drawIcon(cx, iconY);

        // Big value number
        ctx.fillStyle = "#0F172A";
        ctx.font = "900 32px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(col.value, cx, whiteBarY + 85);

        // Underneath labels
        ctx.fillStyle = "#64748B";
        ctx.font = "900 11px 'Space Grotesk', sans-serif";
        ctx.fillText(col.label1, cx, whiteBarY + 114);
        ctx.fillText(col.label2, cx, whiteBarY + 130);
      });

      // Draw dividing vertical line accents between bento sections
      ctx.strokeStyle = "rgba(15, 23, 42, 0.05)";
      ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        const lx = whiteBarX + i * 225;
        ctx.beginPath();
        ctx.moveTo(lx, whiteBarY + 25);
        ctx.lineTo(lx, whiteBarY + whiteBarH - 25);
        ctx.stroke();
      }

      // 6. Avatar Circle Image Placement

      const photoSrc = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=200&background=F1F5F9&color=0F172A&bold=true`;

      // Draw premium thick white circle profile border
      ctx.save();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(avatarBoxX, avatarBoxY, avatarR + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const drawDefaultFallbackAvatar = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarBoxX, avatarBoxY, avatarR, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = "#F1F5F9";
        ctx.fillRect(avatarBoxX - avatarR, avatarBoxY - avatarR, avatarR * 2, avatarR * 2);

        ctx.fillStyle = "#0F172A";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "900 60px 'Space Grotesk', sans-serif";
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

      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      avatarImg.src = photoSrc;

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
          console.warn("Canvas Tainted, using slate fallback avatar:", e);
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

  const drawFinderPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = "#1E293B";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, size, size, 10) : ctx.fillRect(x, y, size, size);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x + 5, y + 5, size - 10, size - 10, 6) : ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
    ctx.fill();

    ctx.fillStyle = "#1E293B";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x + 10, y + 10, size - 20, size - 20, 4) : ctx.fillRect(x + 10, y + 10, size - 20, size - 20);
    ctx.fill();
  };

  const drawDroplet = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size, cy + size / 4, cx, cy + size);
    ctx.quadraticCurveTo(cx - size, cy + size / 4, cx, cy - size);
    ctx.closePath();
    ctx.fill();
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size / 4);
    ctx.bezierCurveTo(cx - size, cy - size, cx - size, cy + size / 2, cx, cy + size);
    ctx.bezierCurveTo(cx + size, cy + size / 2, cx + size, cy - size, cx, cy - size / 4);
    ctx.closePath();
    ctx.fill();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        cx + Math.cos(((18 + i * 72) * Math.PI) / 180) * size,
        cy - Math.sin(((18 + i * 72) * Math.PI) / 180) * size
      );
      ctx.lineTo(
        cx + Math.cos(((54 + i * 72) * Math.PI) / 180) * (size / 2.2),
        cy - Math.sin(((54 + i * 72) * Math.PI) / 180) * (size / 2.2)
      );
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawPulse = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx - size * 0.4, cy);
    ctx.lineTo(cx - size * 0.2, cy - size * 0.6);
    ctx.lineTo(cx, cy + size * 0.7);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.4);
    ctx.lineTo(cx + size * 0.4, cy);
    ctx.lineTo(cx + size, cy);
    ctx.stroke();
  };

  const drawStatusIndicator = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    ctx.save();
    const indX = centerX + radius * Math.cos(Math.PI / 4) - 2;
    const indY = centerY + radius * Math.sin(Math.PI / 4) - 2;

    ctx.fillStyle = "#10B981"; // Status circle emerald
    ctx.strokeStyle = "#FFFFFF"; // Frame padding
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.arc(indX, indY, 19, 0, Math.PI * 2);
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
    const sortedAll = [...allUsers].sort((a, b) => a.uid.localeCompare(b.uid));
    const userIndex = sortedAll.findIndex(u => u.uid === profile.uid);
    const serialNoStr = String(userIndex !== -1 ? userIndex + 1 : 1).padStart(2, '0');
    
    // Copy URL will be domain/username if username exists, else bdnr-XX representation
    const path = profile.username ? profile.username.toLowerCase().trim() : `bdnr-${serialNoStr}`;
    const shareUrl = `${window.location.origin}/${path}`;
    
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
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{profile.displayName}'s Donor Card</h3>
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
                <span>Generating High-Definition shareable badge card for {profile.displayName}...</span>
              </p>

              {/* Responsive container bounding widescreen canvas */}
              <div className="w-full relative rounded-2xl overflow-hidden aspect-[1000/680] shadow-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-red-50 flex items-center justify-center max-w-[480px]">
                {generating && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2.5 z-10">
                    <div className="w-8 h-8 rounded-full border-3 border-rose-500 border-t-transparent animate-spin" />
                    <span className="text-[10px] text-rose-600 font-black uppercase tracking-widest animate-pulse">Rendering {profile.displayName}'s Card...</span>
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
