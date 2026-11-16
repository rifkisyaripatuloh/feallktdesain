import { DesignType } from './designs-api';

export const kinds: { id: DesignType; label: string; sub: string; width: number; height: number }[] = [
  { id: 'EVENT_TICKET', label: 'Tiket Acara', sub: 'Konser, teater, festival', width: 1050, height: 600 },
  { id: 'PARKING_TICKET', label: 'Tiket Parkir', sub: 'Parkir valet, gedung, mall', width: 900, height: 420 },
  { id: 'ENTRY_TICKET', label: 'Tiket Masuk', sub: 'Pameran, seminar, museum', width: 1050, height: 600 },
  { id: 'INVITATION', label: 'Undangan', sub: 'Pernikahan, gala, VIP', width: 900, height: 600 },
  { id: 'MEMBERSHIP_CARD', label: 'Kartu Anggota', sub: 'Klub, gym, loyalitas', width: 900, height: 560 },
  { id: 'ID_CARD', label: 'Kartu Identitas', sub: 'Staff, panitia, akses', width: 900, height: 560 },
  { id: 'CUSTOM', label: 'Ukuran Khusus', sub: 'Tentukan ukuran bebas', width: 1000, height: 600 }
];

export const fontOptions = [
  { value: 'DM Sans', label: 'DM Sans — Modern & Bersih' },
  { value: 'Manrope', label: 'Manrope — Geometris Modern' },
  { value: 'Montserrat', label: 'Montserrat — Tegas & Bold' },
  { value: 'Space Grotesk', label: 'Space Grotesk — Futuristik' },
  { value: 'Playfair Display', label: 'Playfair Display — Editorial Elegan' },
  { value: 'Lora', label: 'Lora — Kaligrafi Klasik' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond — Luxury Serif' },
  { value: 'Oswald', label: 'Oswald — Condensed Poster' },
  { value: 'Bebas Neue', label: 'Bebas Neue — Display Headline' },
  { value: 'Roboto Slab', label: 'Roboto Slab — Solid Slab Serif' },
  { value: 'Source Serif 4', label: 'Source Serif 4 — Buku & Editorial' },
  { value: 'Nunito Sans', label: 'Nunito Sans — Ramah & Hangat' },
  { value: 'Urbanist', label: 'Urbanist — Kontemporer Minimal' },
  { value: 'Archivo Black', label: 'Archivo Black — Ultra Heavy' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville — Tradisional' },
  { value: 'Josefin Sans', label: 'Josefin Sans — Art Deco Geometris' },
  { value: 'Fira Code', label: 'Fira Code — Tech Monospace' },
  { value: 'DM Mono', label: 'DM Mono — Minimal Monospace' },
  { value: 'Space Mono', label: 'Space Mono — Monospace Eksentrik' }
];

export const ticketStyles = [
  { id: 'minimal', label: 'Minimalis Modern', description: 'Bersih, lega, fokus tipografi kuat.', background: '#f5f4ef', accent: '#0d99ff', ink: '#1e242b', font: 'Manrope' },
  { id: 'elegant', label: 'Elegan Mewah', description: 'Nuansa gala premium dan aksen emas.', background: '#1c1b18', accent: '#d8b26e', ink: '#faf7f2', font: 'Cormorant Garamond' },
  { id: 'festival', label: 'Festival Berani', description: 'Warna vibrant, ekspresif, energik.', background: '#1a102f', accent: '#ff4d6d', ink: '#ffffff', font: 'Space Grotesk' },
  { id: 'night', label: 'Konser Malam (Neon)', description: 'Dark canvas dengan aksen neon elektrik.', background: '#0f141c', accent: '#4ade80', ink: '#f1f5f9', font: 'Montserrat' },
  { id: 'retro', label: 'Retro Vintage', description: 'Nuansa kertas tua, tipografi poster klasik.', background: '#f5e8d3', accent: '#c85a32', ink: '#362b24', font: 'Oswald' },
  { id: 'corporate', label: 'Profesional & Korporat', description: 'Rapi, terpercaya, mudah dipindai.', background: '#f0f4f8', accent: '#2563eb', ink: '#0f172a', font: 'DM Sans' }
];

export const ticketNoStyles = [
  { id: 'plain', label: 'Polos Minimal', desc: 'Teks bersih tanpa bingkai', icon: 'T', bg: 'transparent', border: '', radius: 0, borderWidth: 0, color: '#0f172a' },
  { id: 'pill', label: 'Badge Kapsul', desc: 'Bentuk kapsul lonjong modern', icon: '💊', bg: '#ffffff', border: '#0d99ff', radius: 999, borderWidth: 1.5, color: '#0d99ff' },
  { id: 'box', label: 'Kotak Solid', desc: 'Bingkai kotak offset tajam', icon: '▢', bg: '#ffffff', border: '#0f172a', radius: 4, borderWidth: 2, color: '#0f172a' },
  { id: 'dashed', label: 'Kupon Voucher', desc: 'Garis putus-putus karcis', icon: '✂', bg: '#fefce8', border: '#ca8a04', radius: 6, borderWidth: 2, color: '#854d0e' },
  { id: 'neon', label: 'Cyber Neon', desc: 'Glow elektrik latar gelap', icon: '⚡', bg: '#0b0f19', border: '#22c55e', radius: 6, borderWidth: 1.5, color: '#4ade80' },
  { id: 'gold', label: 'VIP Luxury Gold', desc: 'Aksen emas mewah premium', icon: '👑', bg: '#1c1917', border: '#eab308', radius: 4, borderWidth: 1.5, color: '#fef08a' },
  { id: 'invert', label: 'Hitam Pekat', desc: 'Latar pekat solid kontras', icon: '⬛', bg: '#09090b', border: '#27272a', radius: 6, borderWidth: 1, color: '#ffffff' },
  { id: 'stamp', label: 'Stempel Tiket', desc: 'Garis ganda stempel resmi', icon: '🏷', bg: '#fff1f2', border: '#dc2626', radius: 4, borderWidth: 3, color: '#dc2626' }
];

export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  badge: string;
  icon: string;
}

export const canvasPresets: CanvasPreset[] = [
  { id: 'standard', name: 'Standar Event', width: 1050, height: 600, badge: '7:4', icon: '🎟' },
  { id: 'compact', name: 'Kompak / Konser', width: 900, height: 420, badge: '2:1', icon: '🎫' },
  { id: 'boarding', name: 'Boarding Pass', width: 1200, height: 500, badge: 'Wide', icon: '✈️' },
  { id: 'wristband', name: 'Gelang / Strip', width: 800, height: 300, badge: 'Slim', icon: '🏷' },
  { id: 'a4', name: 'A4 Lembar Cetak', width: 1120, height: 790, badge: 'A4', icon: '📄' },
  { id: 'mobile', name: 'Digital / Mobile', width: 720, height: 1280, badge: '9:16', icon: '📱' },
  { id: 'badge', name: 'ID Card / Pass', width: 650, height: 1000, badge: 'Badge', icon: '🪪' }
];

export interface AiThemeRecommendation {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  width: number;
  height: number;
  background: string;
  accent: string;
  ink: string;
  font: string;
  ticketStyle: string;
  badgeBg: string;
  badgeBorder: string;
  prompt: string;
}

export const aiRecommendations: AiThemeRecommendation[] = [
  {
    id: 'rock-neon',
    name: 'Neon Cyber Rock',
    category: 'Konser Musik',
    icon: '🎸',
    description: 'Tema gelap energetik dengan aksen neon glowing untuk festival musik dan konser rock.',
    width: 1050,
    height: 600,
    background: '#0d0f17',
    accent: '#00f2fe',
    ink: '#f8fafc',
    font: 'Space Grotesk',
    ticketStyle: 'neon',
    badgeBg: '#1e1b4b',
    badgeBorder: '#00f2fe',
    prompt: 'Konser musik rock indie festival, panggung megah malam hari dengan tata lampu neon spektakuler'
  },
  {
    id: 'luxury-gala',
    name: 'Royal Gold Gala',
    category: 'VIP & Gala Dinner',
    icon: '👑',
    description: 'Kemewahan elegan hitam keemasan dengan tipografi klasik untuk malam penghargaan eksklusif.',
    width: 1050,
    height: 600,
    background: '#0a0d14',
    accent: '#eab308',
    ink: '#ffffff',
    font: 'Playfair Display',
    ticketStyle: 'gold',
    badgeBg: '#1c1917',
    badgeBorder: '#eab308',
    prompt: 'Malam penganugerahan penghargaan mewah formal, champagne gold, ballroom eksklusif VIP'
  },
  {
    id: 'indie-art',
    name: 'Vintage Sunset Indie',
    category: 'Festival Seni',
    icon: '🎨',
    description: 'Nuansa hangat retro organik dengan palet terakota & krem estetik.',
    width: 900,
    height: 420,
    background: '#fdf8f0',
    accent: '#ea580c',
    ink: '#1c1917',
    font: 'Syne',
    ticketStyle: 'stamp',
    badgeBg: '#ffedd5',
    badgeBorder: '#ea580c',
    prompt: 'Festival seni kreatif anak muda, pameran estetik sore hari, sentuhan vintage terakota'
  },
  {
    id: 'tech-summit',
    name: 'Tech Future Summit',
    category: 'Seminar Bisnis',
    icon: '💼',
    description: 'Desain bersih profesional dengan biru royal korporat dan font geometris modern.',
    width: 1050,
    height: 600,
    background: '#f8fafc',
    accent: '#3b82f6',
    ink: '#0f172a',
    font: 'Inter',
    ticketStyle: 'pill',
    badgeBg: '#eff6ff',
    badgeBorder: '#3b82f6',
    prompt: 'Konferensi teknologi kecerdasan buatan, summit eksekutif bisnis modern, startup inovasi'
  },
  {
    id: 'cinema-classic',
    name: 'Classic Cinema Pass',
    category: 'Bioskop & Teater',
    icon: '🎟',
    description: 'Gaya karcis bioskop vintage dengan warna merah marun klasik dan border putus-putus kupon.',
    width: 900,
    height: 420,
    background: '#1a0b0e',
    accent: '#ef4444',
    ink: '#fef2f2',
    font: 'Space Mono',
    ticketStyle: 'dashed',
    badgeBg: '#450a0a',
    badgeBorder: '#ef4444',
    prompt: 'Pemutaran film premier layar lebar bioskop antik, pertunjukan seni teater drama panggung'
  },
  {
    id: 'cyber-edm',
    name: 'Ultra Violet Rave',
    category: 'EDM & Party',
    icon: '⚡',
    description: 'Dentuman bass neon ultraviolet dan magenta untuk pesta malam rave clubbing spektakuler.',
    width: 1200,
    height: 500,
    background: '#090514',
    accent: '#d946ef',
    ink: '#fdf4ff',
    font: 'Orbitron',
    ticketStyle: 'neon',
    badgeBg: '#2e1065',
    badgeBorder: '#d946ef',
    prompt: 'Pesta dansa musik elektronik EDM rave midnight clubbing laser show spektakuler'
  }
];

