export const TIFA_TIME_ZONE = 'Asia/Jakarta';

export function getTifaTimeContext(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: TIFA_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formatted = formatter.format(now).replace(/\\./g, ':');
  return `[KONTEKS WAKTU RESMI TIFA]\nZona waktu: WIB (Asia/Jakarta)\nTanggal dan waktu saat ini: ${formatted} WIB\nISO UTC referensi: ${now.toISOString()}\nGunakan konteks waktu ini untuk menjawab pertanyaan tentang jam, tanggal, hari, periode "hari ini", "kemarin", "besok", dan rentang waktu. Jangan menebak waktu dari pengetahuan model.`;
}
