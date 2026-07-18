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
    if (!val) return "20 May 2024";
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

  const formattedDonationDate = formatDisplayDate(profile.lastDonationDate);
  
  // Format to standard "25 Aug 1996" or similar
  const getReadableDate = (dateStr: string) => {
    try {
      if (!dateStr) return "20 May 2024";
      const parts = dateStr.includes("-") ? dateStr.split("-") : dateStr.split(" ");
      if (parts.length === 3) {
        // assume YYYY-MM-DD
        if (parts[0].length === 4) {
          const year = parts[0];
          const monthIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return `${day} ${months[monthIdx] || "May"} ${year}`;
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const getValidUptoDate = (dateStr: string) => {
    try {
      const baseDate = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(baseDate.getTime())) {
        return "20 May 2026";
      }
      // Valid for 2 years
      baseDate.setFullYear(baseDate.getFullYear() + 2);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${baseDate.getDate()} ${months[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
    } catch (e) {
      return "20 May 2026";
    }
  };

  // Generate a beautiful unique serial code based on rank
  const sortedAll = [...allUsers].sort((a, b) => a.uid.localeCompare(b.uid));
  const userIndex = sortedAll.findIndex(u => u.uid === profile.uid);
  const serialNo = userIndex !== -1 ? userIndex + 1 : 156;
  const paddedSerial = String(serialNo).padStart(4, "0");
  const year = profile.createdAt 
    ? new Date(profile.createdAt.seconds ? profile.createdAt.seconds * 1000 : profile.createdAt).getFullYear() 
    : 2024;
  const cardDonorId = `BLK-DNR-${year}-${paddedSerial}`;

  useEffect(() => {
    if (!isOpen) return;

    const renderCard = async () => {
      setGenerating(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Ultra crisp 1200x800 resolution matching the pristine design
      canvas.width = 1200;
      canvas.height = 800;

      // Draw elegant canvas environment (dark background to make card stand out)
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card Dimensions
      const cardX = 30;
      const cardY = 30;
      const cardW = 1140;
      const cardH = 740;
      const cardR = 48;

      // 1. Solid White Card Background with custom drop shadow
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 35;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(cardX, cardY, cardW, cardH, cardR) 
        : drawFallbackRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fill();
      ctx.restore();

      // Clip inside card for all subsequent drawings
      ctx.save();
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(cardX, cardY, cardW, cardH, cardR) 
        : drawFallbackRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.clip();

      // 2. Faint Blood Drop Watermark in the background (Right side)
      ctx.save();
      ctx.fillStyle = "rgba(211, 31, 39, 0.02)";
      ctx.strokeStyle = "rgba(211, 31, 39, 0.035)";
      ctx.lineWidth = 14;
      const dropX = cardX + cardW * 0.78;
      const dropY = cardY + cardH * 0.45;
      const dropSize = 180;
      
      ctx.beginPath();
      ctx.moveTo(dropX, dropY - dropSize);
      ctx.quadraticCurveTo(dropX + dropSize, dropY + dropSize * 0.25, dropX, dropY + dropSize);
      ctx.quadraticCurveTo(dropX - dropSize, dropY + dropSize * 0.25, dropX, dropY - dropSize);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      
      // Inside: draw heart watermark shape
      ctx.beginPath();
      const hCX = dropX;
      const hCY = dropY + dropSize * 0.25;
      const hSize = 55;
      ctx.moveTo(hCX, hCY - hSize / 4);
      ctx.bezierCurveTo(hCX - hSize, hCY - hSize, hCX - hSize, hCY + hSize / 2, hCX, hCY + hSize);
      ctx.bezierCurveTo(hCX + hSize, hCY + hSize / 2, hCX + hSize, hCY - hSize, hCX, hCY - hSize / 4);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();

      // 3. Top-Left: bloodLink Logo & Slogan
      const logoX = cardX + 50;
      const logoY = cardY + 50;
      const logoW = 110;
      const logoH = 110;
      const logoR = 26;

      // Squircle background
      ctx.save();
      const logoGrad = ctx.createLinearGradient(logoX, logoY, logoX, logoY + logoH);
      logoGrad.addColorStop(0, "#FF1744");
      logoGrad.addColorStop(1, "#D31F27");
      ctx.fillStyle = logoGrad;
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(logoX, logoY, logoW, logoH, logoR) 
        : drawFallbackRoundRect(ctx, logoX, logoY, logoW, logoH, logoR);
      ctx.fill();

      // Overlapping white droplets
      const drawLogoDroplet = (cx: number, cy: number, scale: number, outline = false) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - scale);
        ctx.quadraticCurveTo(cx + scale * 0.8, cy + scale * 0.2, cx, cy + scale);
        ctx.quadraticCurveTo(cx - scale * 0.8, cy + scale * 0.2, cx, cy - scale);
        ctx.closePath();
        if (outline) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 3.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
        }
      };

      drawLogoDroplet(logoX + 55, logoY + 62, 25, true);
      drawLogoDroplet(logoX + 38, logoY + 70, 15, true);
      drawLogoDroplet(logoX + 72, logoY + 70, 15, true);
      ctx.restore();

      // Slogan Text besides logo
      const textStartX = logoX + 135;
      
      // "blood" in bold red
      ctx.fillStyle = "#D31F27";
      ctx.font = "900 68px 'Inter', 'Space Grotesk', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("blood", textStartX, logoY - 5);
      const bloodW = ctx.measureText("blood").width;

      // "Link" in dark charcoal grey
      ctx.fillStyle = "#1E293B";
      ctx.font = "900 68px 'Inter', 'Space Grotesk', sans-serif";
      ctx.fillText("Link", textStartX + bloodW, logoY - 5);

      // "— Bangladesh —" under "bloodLink"
      const subLineY = logoY + 72;
      ctx.fillStyle = "#D31F27";
      ctx.font = "bold 20px 'Space Grotesk', sans-serif";
      ctx.fillText("B a n g l a d e s h", textStartX + 52, subLineY);
      
      // Thin red lines next to "Bangladesh"
      ctx.strokeStyle = "#D31F27";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(textStartX, subLineY + 12);
      ctx.lineTo(textStartX + 42, subLineY + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(textStartX + 258, subLineY + 12);
      ctx.lineTo(textStartX + 300, subLineY + 12);
      ctx.stroke();

      // "Connect. Donate. Save Lives."
      ctx.fillStyle = "#475569";
      ctx.font = "500 18px 'Space Grotesk', sans-serif";
      ctx.fillText("Connect. Donate. Save Lives.", textStartX, logoY + 104);

      // 4. Top-Right: "PROUD BLOOD DONOR" Capsule
      const pillW = 230;
      const pillH = 76;
      const pillX = cardX + cardW - pillW - 50;
      const pillY = cardY + 50;
      const pillR = 38;

      ctx.save();
      ctx.fillStyle = "#D31F27";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(pillX, pillY, pillW, pillH, pillR) 
        : drawFallbackRoundRect(ctx, pillX, pillY, pillW, pillH, pillR);
      ctx.fill();

      // White circle inside pill on the left
      const pillCircleX = pillX + 42;
      const pillCircleY = pillY + 38;
      const pillCircleRadius = 24;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(pillCircleX, pillCircleY, pillCircleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw red heart with pulse wave inside the white circle
      ctx.fillStyle = "#D31F27";
      ctx.save();
      ctx.translate(pillCircleX, pillCircleY - 1);
      ctx.beginPath();
      const heartS = 13;
      ctx.moveTo(0, -heartS / 4);
      ctx.bezierCurveTo(-heartS, -heartS, -heartS, heartS / 2, 0, heartS);
      ctx.bezierCurveTo(heartS, heartS / 2, heartS, -heartS, 0, -heartS / 4);
      ctx.closePath();
      ctx.fill();

      // Pulse line
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 1);
      ctx.lineTo(-4, 1);
      ctx.lineTo(-2, -5);
      ctx.lineTo(1, 5);
      ctx.lineTo(3, -2);
      ctx.lineTo(5, 1);
      ctx.lineTo(10, 1);
      ctx.stroke();
      ctx.restore();

      // Capsule Text
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      ctx.fillText("PROUD", pillX + 82, pillY + 28);
      ctx.font = "900 14px 'Space Grotesk', sans-serif";
      ctx.fillText("BLOOD DONOR", pillX + 82, pillY + 48);
      ctx.restore();

      // 5. Left: Profile Picture (Circular with beautiful Red border)
      const avatarCX = cardX + 160;
      const avatarCY = cardY + 285;
      const avatarRadius = 110;

      ctx.save();
      // Thick beautiful border
      ctx.strokeStyle = "#D31F27";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarRadius, 0, Math.PI * 2);
      ctx.stroke();

      const drawDefaultFallbackAvatar = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarRadius - 4, 0, Math.PI * 2);
        ctx.clip();

        // Elegant red-pink gradient for fallback
        const backGrad = ctx.createLinearGradient(avatarCX - avatarRadius, avatarCY - avatarRadius, avatarCX + avatarRadius, avatarCY + avatarRadius);
        backGrad.addColorStop(0, "#FF406D");
        backGrad.addColorStop(1, "#D31F27");
        ctx.fillStyle = backGrad;
        ctx.fillRect(avatarCX - avatarRadius, avatarCY - avatarRadius, avatarRadius * 2, avatarRadius * 2);

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "900 74px 'Space Grotesk', sans-serif";
        const initials = profile.displayName
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        ctx.fillText(initials, avatarCX, avatarCY);
        ctx.restore();
      };

      // Load Profile Photo asynchronously
      const photoSrc = profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=300&background=D31F27&color=FFFFFF&bold=true`;
      const avatarImg = new Image();
      avatarImg.crossOrigin = "anonymous";
      avatarImg.src = photoSrc;

      const finishDrawing = () => {
        // Draw status bubble & make sure loaded fully
        setGenerating(false);
      };

      await new Promise<void>((resolve) => {
        avatarImg.onload = () => {
          try {
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarCX, avatarCY, avatarRadius - 4, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatarImg, avatarCX - avatarRadius + 4, avatarCY - avatarRadius + 4, (avatarRadius - 4) * 2, (avatarRadius - 4) * 2);
            ctx.restore();
          } catch (e) {
            console.warn("Canvas profile image tainted, using fallback:", e);
            drawDefaultFallbackAvatar();
          }
          resolve();
        };
        avatarImg.onerror = () => {
          drawDefaultFallbackAvatar();
          resolve();
        };
      });

      // 6. Left Bottom: QR Code box (With Red frame surrounding it)
      const qrX = cardX + 70;
      const qrY = cardY + 440;
      const qrW = 180;
      const qrH = 180;

      ctx.save();
      // Elegant thin Red border surrounding QR Box
      ctx.strokeStyle = "#D31F27";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(qrX - 10, qrY - 10, qrW + 20, qrH + 20, 16) 
        : drawFallbackRoundRect(ctx, qrX - 10, qrY - 10, qrW + 20, qrH + 20, 16);
      ctx.stroke();

      // White inside QR background
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(qrX - 8, qrY - 8, qrW + 16, qrH + 16, 14) 
        : drawFallbackRoundRect(ctx, qrX - 8, qrY - 8, qrW + 16, qrH + 16, 14);
      ctx.fill();

      // Draw QR Matrices
      drawFinderPattern(ctx, qrX + 15, qrY + 15, 45);
      drawFinderPattern(ctx, qrX + qrW - 60, qrY + 15, 45);
      drawFinderPattern(ctx, qrX + 15, qrY + qrH - 60, 45);

      srand(profile.uid);
      const cellS = 7;
      ctx.fillStyle = "#0F172A";
      for (let row = 0; row < qrH - 30; row += cellS) {
        for (let col = 0; col < qrW - 30; col += cellS) {
          const isTopLeft = row < 55 && col < 55;
          const isTopRight = row < 55 && col > qrW - 85;
          const isBottomLeft = row > qrH - 85 && col < 55;

          if (!isTopLeft && !isTopRight && !isBottomLeft) {
            if (random() > 0.44) {
              ctx.fillRect(qrX + col + 18, qrY + row + 18, cellS - 1.5, cellS - 1.5);
            }
          }
        }
      }
      ctx.restore();

      // 7. Middle Column: Name & Dynamic ID Layout
      const infoStartX = cardX + 325;
      
      ctx.fillStyle = "#0F172A";
      ctx.font = "900 48px 'Inter', 'Space Grotesk', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(profile.displayName, infoStartX, cardY + 235);

      // DONOR ID label
      ctx.fillStyle = "#D31F27";
      ctx.font = "bold 20px 'Space Grotesk', sans-serif";
      ctx.fillText(`DONOR ID: ${cardDonorId}`, infoStartX, cardY + 280);

      // 8. Details Rows with pristine horizontal lines & Red custom icons
      const rowStartY = cardY + 315;
      const rowHeight = 52;
      const fields = [
        {
          label: "Blood Group",
          value: profile.bloodGroup ? `${profile.bloodGroup}` : "O+",
          drawIcon: (cx: number, cy: number) => {
            // Draw person icon outline
            ctx.fillStyle = "#D31F27";
            ctx.beginPath();
            ctx.arc(cx, cy - 5, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy + 12, 10, Math.PI, Math.PI * 2);
            ctx.fill();
          }
        },
        {
          label: "Date of Birth",
          value: profile.dateOfBirth ? getReadableDate(profile.dateOfBirth) : "25 Aug 1996",
          drawIcon: (cx: number, cy: number) => {
            // Draw calendar grid
            ctx.strokeStyle = "#D31F27";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect 
              ? ctx.roundRect(cx - 9, cy - 8, 18, 17, 3) 
              : ctx.rect(cx - 9, cy - 8, 18, 17);
            ctx.stroke();
            // grid bars
            ctx.beginPath();
            ctx.moveTo(cx - 9, cy - 2);
            ctx.lineTo(cx + 9, cy - 2);
            ctx.moveTo(cx - 3, cy - 8);
            ctx.lineTo(cx - 3, cy + 9);
            ctx.moveTo(cx + 3, cy - 8);
            ctx.lineTo(cx + 3, cy + 9);
            ctx.stroke();
          }
        },
        {
          label: "Last Donated",
          value: profile.lastDonationDate ? getReadableDate(formattedDonationDate) : "20 May 2024",
          drawIcon: (cx: number, cy: number) => {
            // Blood droplet
            ctx.fillStyle = "#D31F27";
            ctx.beginPath();
            ctx.moveTo(cx, cy - 11);
            ctx.quadraticCurveTo(cx + 9, cy + 1, cx, cy + 11);
            ctx.quadraticCurveTo(cx - 9, cy + 1, cx, cy - 11);
            ctx.closePath();
            ctx.fill();
          }
        },
        {
          label: "Location",
          value: `${profile.thana || "Dhaka"}, ${profile.district || "Bangladesh"}`,
          drawIcon: (cx: number, cy: number) => {
            // Map Pin icon
            ctx.fillStyle = "#D31F27";
            ctx.beginPath();
            ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx - 7, cy - 4);
            ctx.quadraticCurveTo(cx, cy + 12, cx, cy + 12);
            ctx.quadraticCurveTo(cx, cy + 12, cx + 7, cy - 4);
            ctx.fill();
            // inner circle
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(cx, cy - 4, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      ];

      fields.forEach((field, index) => {
        const ry = rowStartY + index * rowHeight;
        
        // Horizontal dividing line
        ctx.strokeStyle = "#F1F5F9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(infoStartX, ry + rowHeight);
        ctx.lineTo(infoStartX + 420, ry + rowHeight);
        ctx.stroke();

        // Icon background circle
        const iconCX = infoStartX + 20;
        const iconCY = ry + rowHeight / 2;
        ctx.fillStyle = "rgba(211, 31, 39, 0.08)";
        ctx.beginPath();
        ctx.arc(iconCX, iconCY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Render the exact custom icon glyph inside the peach circle
        field.drawIcon(iconCX, iconCY);

        // Label
        ctx.fillStyle = "#475569";
        ctx.font = "600 20px 'Space Grotesk', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(field.label, infoStartX + 52, ry + rowHeight / 2);

        // Colon alignment
        ctx.fillStyle = "#475569";
        ctx.font = "bold 20px 'Space Grotesk', sans-serif";
        ctx.fillText(":", infoStartX + 245, ry + rowHeight / 2);

        // Value text
        ctx.fillStyle = "#0F172A";
        ctx.font = "900 21px 'Space Grotesk', sans-serif";
        ctx.fillText(field.value, infoStartX + 270, ry + rowHeight / 2);
      });

      // 9. Lifesaver Shield Badge and Slogan Message
      const shieldX = infoStartX;
      const shieldY = rowStartY + fields.length * rowHeight + 24;
      const shieldW = 44;
      const shieldH = 50;

      ctx.save();
      // Draw pristine dark red shield
      ctx.fillStyle = "#D31F27";
      ctx.beginPath();
      ctx.moveTo(shieldX + shieldW / 2, shieldY);
      ctx.lineTo(shieldX + shieldW, shieldY + shieldH * 0.3);
      ctx.quadraticCurveTo(shieldX + shieldW, shieldY + shieldH * 0.7, shieldX + shieldW / 2, shieldY + shieldH);
      ctx.quadraticCurveTo(shieldX, shieldY + shieldH * 0.7, shieldX, shieldY + shieldH * 0.3);
      ctx.closePath();
      ctx.fill();

      // Draw elegant white tick check inside shield
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(shieldX + shieldW * 0.3, shieldY + shieldH * 0.5);
      ctx.lineTo(shieldX + shieldW * 0.45, shieldY + shieldH * 0.65);
      ctx.lineTo(shieldX + shieldW * 0.7, shieldY + shieldH * 0.35);
      ctx.stroke();
      ctx.restore();

      // Slogan Text right next to the Shield
      const textX = shieldX + 60;
      ctx.fillStyle = "#475569";
      ctx.font = "500 18px 'Space Grotesk', sans-serif";
      ctx.fillText("Thank you for being a", textX, shieldY + 12);
      
      ctx.fillStyle = "#D31F27";
      ctx.font = "900 22px 'Space Grotesk', sans-serif";
      ctx.fillText("LIFESAVER ❤️", textX, shieldY + 38);

      // 10. Right side: Authorized Signature Doodle & Stamp
      const sigStartX = infoStartX + 420;
      const sigY = shieldY + 10;
      
      // Underlying line
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sigStartX, sigY + 15);
      ctx.lineTo(sigStartX + 180, sigY + 15);
      ctx.stroke();

      // Scribe signature subtitle
      ctx.fillStyle = "#64748B";
      ctx.font = "600 13px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Authorized Signature", sigStartX + 90, sigY + 34);

      // Draw super high-end elegant black signature doodle path above line
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(sigStartX + 20, sigY - 10);
      ctx.bezierCurveTo(sigStartX + 50, sigY - 45, sigStartX + 70, sigY + 25, sigStartX + 90, sigY - 20);
      ctx.bezierCurveTo(sigStartX + 110, sigY - 40, sigStartX + 130, sigY + 20, sigStartX + 160, sigY - 5);
      ctx.stroke();

      // 11. Bottom Wave Gradient Area & Footnote Blocks
      const waveStartY = cardY + cardH - 120;
      ctx.save();
      
      // Pristine red gradient matching attached card
      const barGrad = ctx.createLinearGradient(cardX, cardY + cardH - 140, cardX + cardW, cardY + cardH);
      barGrad.addColorStop(0, "#E11D48");
      barGrad.addColorStop(0.45, "#D31F27");
      barGrad.addColorStop(1, "#991B1B");

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.moveTo(cardX, cardY + cardH); // Bottom-left of card
      ctx.lineTo(cardX, waveStartY); // start of wave
      
      // Quad curve to shape the wave organically
      ctx.bezierCurveTo(
        cardX + cardW * 0.35, waveStartY - 35, 
        cardX + cardW * 0.65, waveStartY + 35, 
        cardX + cardW, waveStartY - 20
      );
      ctx.lineTo(cardX + cardW, cardY + cardH); // Bottom-right of card
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Inside Wave Bar Items: Three columns separated by vertical line accents
      const textMidY = cardY + cardH - 45;

      // Col 1: Phone Contact Icon & text
      const col1CX = cardX + 110;
      // White circle background
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(col1CX, textMidY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Handset icon inside white circle
      ctx.strokeStyle = "#D31F27";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(col1CX - 8, col1CX - 8); // temporary handset curve
      // Draw classic receiver shape
      ctx.moveTo(col1CX - 7, textMidY - 7);
      ctx.quadraticCurveTo(col1CX - 12, textMidY, col1CX - 3, textMidY + 9);
      ctx.lineTo(col1CX + 6, textMidY + 6);
      ctx.stroke();
      ctx.fillStyle = "#D31F27";
      ctx.beginPath();
      ctx.arc(col1CX - 7, textMidY - 7, 3.5, 0, Math.PI * 2);
      ctx.arc(col1CX + 6, textMidY + 6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Label & text
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      ctx.fillText("Emergency Contact", col1CX + 40, textMidY - 12);
      
      ctx.font = "900 21px 'Space Grotesk', sans-serif";
      ctx.fillText(profile.phone || "+880 1234-567890", col1CX + 40, textMidY + 12);

      // Vertical line divider 1
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 440, textMidY - 24);
      ctx.lineTo(cardX + 440, textMidY + 24);
      ctx.stroke();

      // Col 2: Web URL
      const col2CX = cardX + 500;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(col2CX, textMidY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Web Globe inside
      ctx.strokeStyle = "#D31F27";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(col2CX, textMidY, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(col2CX - 13, textMidY);
      ctx.lineTo(col2CX + 13, textMidY);
      ctx.stroke();
      ctx.ellipse(col2CX, textMidY, 5, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Text url
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 22px 'Space Grotesk', sans-serif";
      ctx.fillText("www.bloodlink.bd", col2CX + 40, textMidY);

      // Vertical line divider 2
      ctx.beginPath();
      ctx.moveTo(cardX + 790, textMidY - 24);
      ctx.lineTo(cardX + 790, textMidY + 24);
      ctx.stroke();

      // Col 3: Card Valid Upto
      const col3StartX = cardX + 835;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      ctx.fillText("Card Valid Upto", col3StartX, textMidY - 12);
      
      ctx.font = "900 22px 'Space Grotesk', sans-serif";
      ctx.fillText(getValidUptoDate(formattedDonationDate), col3StartX, textMidY + 12);

      ctx.restore(); // Restore clipper
      finishDrawing();
    };

    renderCard();
  }, [isOpen, profile]);

  const drawFinderPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, size, size, 10) : ctx.fillRect(x, y, size, size);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x + 5, y + 5, size - 10, size - 10, 6) : ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
    ctx.fill();

    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x + 10, y + 10, size - 20, size - 20, 4) : ctx.fillRect(x + 10, y + 10, size - 20, size - 20);
    ctx.fill();
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
              <div className="w-full relative rounded-2xl overflow-hidden aspect-[1200/800] shadow-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-red-50 flex items-center justify-center max-w-[480px]">
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
