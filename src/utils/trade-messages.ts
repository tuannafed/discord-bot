export function getTpMessage(pnlPct: number): string {
  const mult = (1 + pnlPct / 100).toFixed(1);
  // +1000% (X11) — cùng câu tier 👑
  if (pnlPct >= 1000) return `👑 HUYỀN THOẠI! x${mult} — bro này không phải người thường!`;
  if (pnlPct >= 500) return `👑 HUYỀN THOẠI! x${mult} — bro này không phải người thường!`;
  // +300% (X4) — cùng câu tier 🚀
  if (pnlPct >= 300) return `🚀 x${mult} CHÁY QUÁ! Bán hết nhà chưa mà lời dữ vậy?`;
  if (pnlPct >= 200) return `🚀 x${mult} CHÁY QUÁ! Bán hết nhà chưa mà lời dữ vậy?`;
  if (pnlPct >= 100) return `🎉 x${mult} — nhân đôi rồi bro! Khao anh em chưa?`;
  if (pnlPct >= 50)  return `💰 +${pnlPct.toFixed(0)}% ngon lành! Chốt đúng điểm chuẩn không cần chỉnh!`;
  if (pnlPct >= 0)   return `✅ Chốt lời nhẹ nhàng — ít mà chắc, không tham là khôn!`;
  return `😅 TP mà lỗ á? Chắc entry trước khi TP hả bro...`;
}

export function getClMessage(pnlPct: number): string {
  const p = `${pnlPct.toFixed(0)}%`;
  const worst = `☠️ ${p} — bro còn tài khoản không đấy? Gọi ngay đường dây hỗ trợ tâm lý!`;
  const deep = `💀 ${p} — cắt đúng lúc đó, thêm tí nữa là bay màu luôn rồi!`;
  const oneR = `😱 ${p} — cháy 1R rồi bro, nghỉ ngơi đi rồi tính tiếp!`;
  if (pnlPct <= -1000) return worst; // -10R
  if (pnlPct <= -900)  return worst; // -9R
  if (pnlPct <= -800)  return worst; // -8R
  if (pnlPct <= -700)  return worst; // -7R
  if (pnlPct <= -600)  return worst; // -6R
  if (pnlPct <= -500)  return worst; // -5R
  if (pnlPct <= -400)  return deep;  // -4R
  if (pnlPct <= -300)  return deep;  // -3R
  if (pnlPct <= -200)  return deep;  // -2R
  if (pnlPct <= -100)  return oneR;  // -1R
  if (pnlPct <= -50)   return `😢 ${p} — đau thật, nhưng không cắt thì còn đau hơn!`;
  if (pnlPct < 0)      return `😔 ${p} — lần này thị trường thắng, lần sau mình thắng lại!`;
  return `😅 CL mà còn lời á? Bro này chơi ngược chiều hay gì vậy?`;
}

export function getSlMessage(pnlPct: number): string {
  const p = `${pnlPct.toFixed(0)}%`;
  const worst = `☠️ ${p} — SL mà còn để lâu vậy? Lần sau đặt SL từ đầu đi bro!`;
  const deep = `💀 ${p} — đau ghê, nhưng may mà còn SL chứ không thì toang!`;
  const oneR = `😱 ${p} — 1R bay rồi! Kỷ luật SL quan trọng lắm bro ơi!`;
  if (pnlPct <= -1000) return worst; // -10R
  if (pnlPct <= -900)  return worst; // -9R
  if (pnlPct <= -800)  return worst; // -8R
  if (pnlPct <= -700)  return worst; // -7R
  if (pnlPct <= -600)  return worst; // -6R
  if (pnlPct <= -500)  return worst; // -5R
  if (pnlPct <= -400)  return deep;  // -4R
  if (pnlPct <= -300)  return deep;  // -3R
  if (pnlPct <= -200)  return deep;  // -2R
  if (pnlPct <= -100)  return oneR;  // -1R
  if (pnlPct <= -50)   return `😢 ${p} — chấp nhận được, còn cứu được vốn!`;
  if (pnlPct < 0)      return `😤 ${p} — SL nhẹ thôi, kỷ luật tốt lắm bro!`;
  return `😲 SL mà còn lời á? Thị trường hôm nay có gì lạ không?`;
}
