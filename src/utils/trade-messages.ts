export function getTpMessage(pnlPct: number): string {
  const mult = (1 + pnlPct / 100).toFixed(1);
  if (pnlPct >= 500) return `👑 HUYỀN THOẠI! x${mult} — bro này không phải người thường!`;
  if (pnlPct >= 200) return `🚀 x${mult} CHÁY QUÁ! Bán hết nhà chưa mà lời dữ vậy?`;
  if (pnlPct >= 100) return `🎉 x${mult} — nhân đôi rồi bro! Khao anh em chưa?`;
  if (pnlPct >= 50)  return `💰 +${pnlPct.toFixed(0)}% ngon lành! Chốt đúng điểm chuẩn không cần chỉnh!`;
  if (pnlPct >= 0)   return `✅ Chốt lời nhẹ nhàng — ít mà chắc, không tham là khôn!`;
  return `😅 TP mà lỗ á? Chắc entry trước khi TP hả bro...`;
}

export function getClMessage(pnlPct: number): string {
  if (pnlPct <= -500) return `☠️ ${pnlPct.toFixed(0)}% — bro còn tài khoản không đấy? Gọi ngay đường dây hỗ trợ tâm lý!`;
  if (pnlPct <= -200) return `💀 ${pnlPct.toFixed(0)}% — cắt đúng lúc đó, thêm tí nữa là bay màu luôn rồi!`;
  if (pnlPct <= -100) return `😱 ${pnlPct.toFixed(0)}% — cháy 1R rồi bro, nghỉ ngơi đi rồi tính tiếp!`;
  if (pnlPct <= -50)  return `😢 ${pnlPct.toFixed(0)}% — đau thật, nhưng không cắt thì còn đau hơn!`;
  if (pnlPct < 0)    return `😔 ${pnlPct.toFixed(0)}% — lần này thị trường thắng, lần sau mình thắng lại!`;
  return `😅 CL mà còn lời á? Bro này chơi ngược chiều hay gì vậy?`;
}

export function getSlMessage(pnlPct: number): string {
  if (pnlPct <= -500) return `☠️ ${pnlPct.toFixed(0)}% — SL mà còn để lâu vậy? Lần sau đặt SL từ đầu đi bro!`;
  if (pnlPct <= -200) return `💀 ${pnlPct.toFixed(0)}% — đau ghê, nhưng may mà còn SL chứ không thì toang!`;
  if (pnlPct <= -100) return `😱 ${pnlPct.toFixed(0)}% — 1R bay rồi! Kỷ luật SL quan trọng lắm bro ơi!`;
  if (pnlPct <= -50)  return `😢 ${pnlPct.toFixed(0)}% — chấp nhận được, còn cứu được vốn!`;
  if (pnlPct < 0)    return `😤 ${pnlPct.toFixed(0)}% — SL nhẹ thôi, kỷ luật tốt lắm bro!`;
  return `😲 SL mà còn lời á? Thị trường hôm nay có gì lạ không?`;
}
