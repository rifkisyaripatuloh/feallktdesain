import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { AuthApi, messageOf } from './core';
import { Design, DesignConfig, DesignElement, DesignInput, DesignType, DesignsApi } from './designs-api';

const Mark = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M9 8h14c7 0 11 4 11 10 0 4-2 7-6 8l7 7H23l-6-7h-1v7H9V8Zm7 7v5h7c2 0 3-1 3-3s-1-2-3-2h-7Z" fill="currentColor"/><circle cx="9" cy="33" r="2" fill="#E1F16B"/></svg>`;

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

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/app">
          <span class="brand-mark" [innerHTML]="brandMark"></span>
          ticketforge<span class="brand-ai">AI</span>
        </a>
        <div class="side-caption">RUANG KERJA</div>
        <a class="nav-link" routerLink="/app"><span>▦</span> Ringkasan</a>
        <a class="nav-link active" routerLink="/app/designs"><span>▧</span> Desain tiket</a>
        <a class="nav-link" routerLink="/app/profile"><span>◉</span> Profil & keamanan</a>
        <div class="sidebar-bottom">
          <div class="user-mini">
            <div class="avatar">{{ initials() }}</div>
            <div>
              <strong>{{ auth.user()?.name }}</strong>
              <small>{{ auth.user()?.email }}</small>
            </div>
            <button aria-label="Keluar" (click)="logout()">↗</button>
          </div>
        </div>
      </aside>

      <main class="dashboard designs-page">
        <header class="dash-header">
          <span>RUANG KERJA <b>/</b> KREASI <b>/</b> DESAIN TIKET</span>
          <a routerLink="/app/profile">Pengaturan akun <span>↗</span></a>
        </header>

        <section class="design-welcome">
          <div>
            <div class="eyebrow"><i></i> STUDIO DESAIN TIKET</div>
            <h1>Studio Desain <em>Figma & AI</em></h1>
            <p>Rancang tiket acara, kartu anggota, dan undangan dengan kanvas interaktif presisi tinggi.</p>
          </div>
          <div class="welcome-actions">
            <button class="outline-btn ai-sparkle-btn" (click)="openAi()">
              <span>✦ AI Rekomendasi</span>
            </button>
            <button class="primary-btn new-design-btn" (click)="openCreate()">
              <span>＋ Desain Baru</span>
              <span class="btn-arrow">↗</span>
            </button>
          </div>
        </section>

        <section class="design-tools">
          <label class="design-search">
            <span>⌕</span>
            <input aria-label="Cari desain" placeholder="Cari tiket atau kartu…" [value]="search()" (input)="onSearch($event)">
            <kbd>↵</kbd>
          </label>
          <span class="design-count">{{ designs().length }} DESAIN</span>
          <button class="refresh-btn" (click)="load()" aria-label="Muat ulang daftar" title="Muat ulang">↻</button>
        </section>

        @if (error()) {
          <div class="form-alert design-alert" role="alert">{{ error() }}</div>
        }

        @if (loading()) {
          <div class="design-loading">
            <span class="loading-orbit">✳</span>
            <p>Memuat daftar desain…</p>
          </div>
        } @else if (designs().length) {
          <section class="design-grid">
            @for (d of designs(); track d.id) {
              <article class="design-card">
                <button class="design-preview" (click)="edit(d)" [attr.aria-label]="'Edit ' + d.name">
                  <div class="mini-ticket" [style.background]="d.config.canvas.background || '#f4f1e8'">
                    <div class="mini-stamp">{{ d.type }}</div>
                    <div class="mini-title">{{ ticketTitle(d) }}</div>
                    <div class="mini-details">
                      <span>{{ d.width }} × {{ d.height }} {{ d.unit || 'px' }}</span>
                      <span>✳ &nbsp; ▦</span>
                    </div>
                    <div class="mini-hole left"></div>
                    <div class="mini-hole right"></div>
                  </div>
                  <span class="preview-edit">BUKA DI EDITOR ↗</span>
                </button>
                <div class="design-card-info">
                  <div>
                    <h3>{{ d.name }}</h3>
                    <p>{{ typeLabel(d.type) }} · {{ d.width }} × {{ d.height }} {{ d.unit || 'px' }}</p>
                  </div>
                  <button class="more-btn delete-card-btn" (click)="remove(d)" title="Hapus desain" aria-label="Hapus">✕</button>
                </div>
              </article>
            }
          </section>
        } @else {
          <section class="empty-design">
            <div class="empty-illustration">
              <div class="empty-ring"></div>
              <div class="empty-ticket">✳<span>TIKET<br>BARU</span></div>
              <span class="empty-spark">✦</span>
            </div>
            <div class="eyebrow">KANVAS MASIH KOSONG</div>
            <h2>Mulai Buat Tiket Pertama Anda</h2>
            <p>Pilih ukuran preset atau biarkan AI membuat rancangan tiket otomatis untuk Anda.</p>
            <div class="empty-actions">
              <button class="primary-btn" (click)="openCreate()">
                <span>＋ Buat Desain Baru</span>
                <span class="btn-arrow">↗</span>
              </button>
              <button class="outline-btn" (click)="openAi()">
                <span>✦ Buat via AI Generator</span>
              </button>
            </div>
          </section>
        }

        <footer class="dash-foot">
          <span>© 2025 TICKETFORGE AI</span>
          <span>STUDIO DESAIN KANVAS FIGMA STYLE <b>✳</b></span>
        </footer>
      </main>

      <!-- Modal Create Design -->
      @if (createOpen()) {
        <div class="modal-scrim" (click)="closeCreate()" (keydown.escape)="closeCreate()">
          <section class="create-modal figma-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="closeCreate()" aria-label="Tutup">×</button>
            <div class="eyebrow">LANGKAH PERTAMA</div>
            <h2>Pilih Format & Ukuran Tiket</h2>
            <p class="modal-intro">Pilih jenis tiket yang ingin Anda buat di editor kanvas.</p>

            <div class="type-options">
              @for (k of kinds; track k.id) {
                <button type="button" class="type-option" [class.selected]="selectedType() === k.id" (click)="selectedType.set(k.id)">
                  <span class="type-symbol">▦</span>
                  <span>
                    <strong>{{ k.label }}</strong>
                    <small>{{ k.sub }}</small>
                  </span>
                  <span class="type-size">{{ k.width }} × {{ k.height }} px</span>
                  <span class="type-check">{{ selectedType() === k.id ? '●' : '○' }}</span>
                </button>
              }
            </div>

            <label class="modal-label" for="new-name">Nama Desain</label>
            <input id="new-name" class="profile-input" [value]="newName()" (input)="newName.set($any($event.target).value)" placeholder="Contoh: Tiket Konser Senja 2025">

            @if (createError()) {
              <div class="form-alert">{{ createError() }}</div>
            }

            <div class="modal-actions">
              <button class="outline-btn" type="button" (click)="closeCreate()">Batal</button>
              <button class="primary-btn" type="button" (click)="save()" [disabled]="saving() || newName().trim().length < 2">
                <span>{{ saving() ? 'Membuat Kanvas…' : 'Buka Kanvas Editor' }}</span>
                <span class="btn-arrow">↗</span>
              </button>
            </div>
          </section>
        </div>
      }

      <!-- Modal AI Recommendation -->
      @if (aiOpen()) {
        <div class="modal-scrim" (click)="aiOpen.set(false)">
          <section class="create-modal ai-modal figma-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="aiOpen.set(false)" aria-label="Tutup">×</button>
            <div class="eyebrow">AI GENERATOR & REKOMENDASI</div>
            <h2>Hasilkan Desain Tiket dengan AI</h2>
            <p class="modal-intro">Tulis ide acara Anda, dan sistem akan merancang kanvas beserta palet warna dan tipografinya.</p>

            <label class="modal-label">Jenis Tiket</label>
            <select class="profile-input" [value]="selectedType()" (change)="selectedType.set($any($event.target).value)">
              @for (k of kinds; track k.id) {
                <option [value]="k.id">{{ k.label }} ({{ k.width }} × {{ k.height }} px)</option>
              }
            </select>

            <label class="modal-label">Gaya Visual</label>
            <div class="ai-styles-grid">
              @for (s of ticketStyles; track s.id) {
                <button type="button" class="ai-style-chip" [class.active]="selectedStyle() === s.id" (click)="selectedStyle.set(s.id)">
                  <span class="color-dot" [style.background]="s.accent"></span>
                  <span>{{ s.label }}</span>
                </button>
              }
            </div>

            <label class="modal-label" for="ai-prompt">Deskripsi atau Brief Acara</label>
            <textarea id="ai-prompt" class="profile-input" rows="3" [value]="aiPrompt()" (input)="aiPrompt.set($any($event.target).value)" placeholder="Contoh: Tiket konser musik jazz di tepi pantai dengan warna biru malam dan aksen emas."></textarea>

            @if (aiError()) {
              <div class="form-alert">{{ aiError() }}</div>
            }

            @if (aiDraft()) {
              <div class="ai-draft-preview">
                <strong>Pratinjau Hasil AI:</strong>
                <p>Kanvas berhasil dirancang dengan {{ aiDraft()!.elements.length }} elemen, latar {{ aiDraft()!.canvas.background }}.</p>
                <div class="ai-draft-chip">Model: {{ aiModel() || 'Local Template' }}</div>
              </div>
            }

            <div class="modal-actions">
              @if (!aiDraft()) {
                <button class="primary-btn" type="button" (click)="generateRecommendation()" [disabled]="aiBusy() || aiPrompt().trim().length < 5">
                  <span>{{ aiBusy() ? 'AI Sedang Merancang…' : '✦ Generate Desain AI' }}</span>
                </button>
              } @else {
                <button class="outline-btn" type="button" (click)="generateRecommendation()" [disabled]="aiBusy()">Buat Ulang</button>
                <button class="primary-btn" type="button" (click)="useAiDraft()">
                  <span>Gunakan Desain Ini ↗</span>
                </button>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `
})
export class DesignsListComponent {
  private api = inject(DesignsApi);
  auth = inject(AuthApi);
  private router = inject(Router);

  brandMark = Mark;
  kinds = kinds;
  ticketStyles = ticketStyles;

  designs = signal<Design[]>([]);
  loading = signal(true);
  error = signal('');
  search = signal('');

  createOpen = signal(false);
  selectedType = signal<DesignType>('EVENT_TICKET');
  newName = signal('');
  saving = signal(false);
  createError = signal('');

  aiOpen = signal(false);
  aiPrompt = signal('');
  selectedStyle = signal('minimal');
  aiBusy = signal(false);
  aiDraft = signal<DesignConfig | null>(null);
  aiModel = signal('');
  aiAvailable = signal<boolean | null>(null);
  aiError = signal('');

  private timer: any;

  constructor() {
    this.load();
  }

  initials() {
    return this.auth.user()?.name?.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'TF';
  }

  typeLabel(t: DesignType) {
    return kinds.find(k => k.id === t)?.label || t;
  }

  load() {
    this.loading.set(true);
    this.api.list(this.search()).subscribe({
      next: r => {
        this.designs.set(Array.isArray(r.data) ? r.data : []);
        this.loading.set(false);
        this.error.set('');
      },
      error: e => {
        this.loading.set(false);
        this.error.set(messageOf(e, 'Desain gagal dimuat. Pastikan API aktif dan sesi login berlaku.'));
      }
    });
  }

  onSearch(e: Event) {
    this.search.set((e.target as HTMLInputElement).value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), 300);
  }

  ticketTitle(d: Design) {
    const textEl = d.config?.elements?.find(x => x.type === 'text');
    return String(textEl?.['text'] || d.name).slice(0, 35);
  }

  openCreate() {
    this.createError.set('');
    this.newName.set('');
    this.createOpen.set(true);
  }

  closeCreate() {
    this.createOpen.set(false);
  }

  openAi() {
    this.aiError.set('');
    this.aiPrompt.set('');
    this.aiDraft.set(null);
    this.aiOpen.set(true);
  }

  generateRecommendation() {
    const brief = this.aiPrompt().trim();
    if (brief.length < 5) {
      this.aiError.set('Jelaskan ide desain minimal 5 karakter.');
      return;
    }
    const k = kinds.find(x => x.id === this.selectedType()) || kinds[0];
    const style = ticketStyles.find(s => s.id === this.selectedStyle()) || ticketStyles[0];
    const prompt = `Ticket: ${k.label}. Style: ${style.label}. Palette: bg ${style.background}, accent ${style.accent}, ink ${style.ink}. Font: ${style.font}. Brief: ${brief}`;

    this.aiBusy.set(true);
    this.aiError.set('');

    this.api.generate({ prompt, type: k.id, width: k.width, height: k.height, unit: 'px' }).subscribe({
      next: r => {
        this.aiBusy.set(false);
        const draft = r.data.config;
        draft.canvas.background = style.background;
        for (const el of draft.elements) {
          if (el.type === 'background') el['fill'] = style.background;
          if (el.type === 'text') {
            el['fontFamily'] = style.font;
            if (!el['color']) el['color'] = style.ink;
          }
          if (el.type === 'rectangle' || el.type === 'circle') el['fill'] = style.accent;
        }
        this.aiDraft.set(draft);
        this.aiModel.set(r.data.model || '');
        this.aiAvailable.set(r.data.aiAvailable);
        if (r.data.warning) this.aiError.set(r.data.warning);
      },
      error: e => {
        this.aiBusy.set(false);
        this.aiError.set(messageOf(e, 'Gagal menghubungkan ke generator AI.'));
      }
    });
  }

  useAiDraft() {
    const config = this.aiDraft();
    if (!config) return;
    const k = kinds.find(x => x.id === this.selectedType()) || kinds[0];
    const name = this.aiPrompt().trim().slice(0, 50) || 'Tiket AI Generated';
    this.saving.set(true);
    this.api.create({ name, type: k.id, width: k.width, height: k.height, unit: 'px', config }).subscribe({
      next: r => {
        this.saving.set(false);
        this.aiOpen.set(false);
        if (r.data?.id) this.router.navigate(['/app/designs', r.data.id, 'edit']);
        else this.load();
      },
      error: e => {
        this.saving.set(false);
        this.aiError.set(messageOf(e, 'Gagal menyimpan draf AI.'));
      }
    });
  }

  save() {
    const k = kinds.find(x => x.id === this.selectedType())!;
    const name = this.newName().trim();
    if (!name) return;

    const config: DesignConfig = {
      version: 1,
      type: k.id,
      canvas: { width: k.width, height: k.height, unit: 'px', background: '#f8f9fa' },
      elements: [
        { id: crypto.randomUUID(), type: 'background', x: 0, y: 0, width: k.width, height: k.height, fill: '#f8f9fa' },
        { id: crypto.randomUUID(), type: 'text', x: 60, y: 60, text: name.toUpperCase(), fontSize: 44, fontFamily: 'DM Sans', fontWeight: 700, color: '#1e293b' },
        { id: crypto.randomUUID(), type: 'text', x: 60, y: k.height - 80, text: 'ADMIT ONE · OFFICIAL PASS', fontSize: 16, fontFamily: 'DM Mono', color: '#64748b' },
        { id: crypto.randomUUID(), type: 'qr', x: k.width - 200, y: k.height - 200, width: 140, height: 140, value: 'https://ticketforge.local/verify', style: 'square', color: '#1e293b', qrBackground: '#ffffff', rotation: 0 }
      ]
    };

    this.saving.set(true);
    this.api.create({ name, type: k.id, width: k.width, height: k.height, unit: 'px', config }).subscribe({
      next: r => {
        this.saving.set(false);
        this.createOpen.set(false);
        if (r.data?.id) this.router.navigate(['/app/designs', r.data.id, 'edit']);
        else this.load();
      },
      error: e => {
        this.saving.set(false);
        this.createError.set(messageOf(e, 'Desain gagal dibuat.'));
      }
    });
  }

  edit(d: Design) {
    this.router.navigate(['/app/designs', d.id, 'edit']);
  }

  remove(d: Design) {
    if (confirm(`Hapus desain "${d.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      this.api.delete(d.id).subscribe({
        next: () => {
          this.designs.update(list => list.filter(x => x.id !== d.id));
        },
        error: e => {
          this.error.set(messageOf(e, 'Gagal menghapus desain.'));
        }
      });
    }
  }

  logout() {
    this.auth.logout().subscribe();
  }
}

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    <div class="figma-studio">
      <!-- Figma Top Navigation Bar -->
      <header class="figma-topbar">
        <div class="topbar-left">
          <a routerLink="/app/designs" class="figma-back-btn" title="Kembali ke daftar desain">
            <span class="back-icon">←</span>
            <span class="back-text">Kembali</span>
          </a>
          <span class="topbar-divider"></span>
          @if (design()) {
            <input class="figma-file-name" [value]="design()!.name" (change)="rename($event)" title="Klik untuk mengubah nama desain">
            <span class="figma-badge">{{ design()!.type }} · {{ design()!.width }} × {{ design()!.height }} px</span>
          }
        </div>

        <div class="topbar-center">
          <div class="figma-save-pill" [class.saving]="saving()">
            <span class="save-dot"></span>
            <span>{{ saving() ? 'Menyimpan perubahan…' : 'Tersimpan otomatis' }}</span>
          </div>
        </div>

        <div class="topbar-right">
          <button type="button" class="figma-btn ai-btn" (click)="generateAiDraft()" [disabled]="aiBusy()" title="Hasilkan variasi desain AI">
            <span class="spark-icon">✦</span>
            <span>{{ aiBusy() ? 'Merancang…' : 'Generate AI' }}</span>
          </button>
          <button type="button" class="figma-btn export-btn" (click)="openPrintModal()" title="Cetak tiket atau ekspor ke PDF (Batch / Multi-lembar)">
            <span>🖨 Cetak / PDF</span>
          </button>
          <button type="button" class="figma-btn danger-btn" (click)="deleteDesign()" title="Hapus desain ini">
            <span>🗑 Hapus</span>
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="figma-studio-loading">
          <div class="figma-spinner"></div>
          <p>Membuka Studio Kanvas…</p>
        </div>
      } @else if (error() && !design()) {
        <div class="figma-studio-error">
          <div class="error-box">
            <h3>Kanvas Tidak Dapat Dibuka</h3>
            <p>{{ error() }}</p>
            <a routerLink="/app/designs" class="primary-btn">Kembali ke Daftar Desain</a>
          </div>
        </div>
      } @else if (design()) {
        <div class="figma-workspace">
          <!-- Left Sidebar: Tools & Layers & AI Assistant -->
          <aside class="figma-left-panel">
            <div class="panel-tabs">
              <button type="button" [class.active]="leftTab === 'tools'" (click)="leftTab = 'tools'">Alat</button>
              <button type="button" [class.active]="leftTab === 'layers'" (click)="leftTab = 'layers'">Lapisan ({{ design()!.config.elements.length }})</button>
              <button type="button" [class.active]="leftTab === 'ai'" (click)="leftTab = 'ai'">Asisten AI</button>
            </div>

            <div class="panel-content">
              @if (leftTab === 'tools') {
                <div class="tool-section">
                  <div class="section-title">TAMBAH ELEMEN</div>
                  <button type="button" class="tool-btn" (click)="addText()">
                    <span class="tool-icon">T</span>
                    <span class="tool-label">Tambah Teks</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <button type="button" class="tool-btn" (click)="addTicketNumber()">
                    <span class="tool-icon">🔢</span>
                    <span class="tool-label">Tambah No Tiket</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <button type="button" class="tool-btn" (click)="addShape('rectangle')">
                    <span class="tool-icon">▢</span>
                    <span class="tool-label">Bentuk Kotak</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <button type="button" class="tool-btn" (click)="addShape('circle')">
                    <span class="tool-icon">◯</span>
                    <span class="tool-label">Bentuk Lingkaran</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <button type="button" class="tool-btn" (click)="addQr()">
                    <span class="tool-icon">▦</span>
                    <span class="tool-label">Generate QR Code</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <button type="button" class="tool-btn" (click)="logoInput.click()">
                    <span class="tool-icon">▣</span>
                    <span class="tool-label">Upload Gambar / Logo</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <input #logoInput hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="uploadLogo($event)">
                  <button type="button" class="tool-btn danger-tool mt-2" (click)="clearAllElements()" title="Bersihkan semua elemen di kanvas">
                    <span class="tool-icon danger">🗑</span>
                    <span class="tool-label">Hapus Semua Objek</span>
                    <span class="tool-plus">✕</span>
                  </button>
                </div>

                <div class="tool-section">
                  <div class="section-title">QUICK QR GENERATOR</div>
                  <label class="field-label">Tempel URL atau Teks Tiket</label>
                  <input class="figma-input" type="url" [(ngModel)]="quickQrLink" (input)="onQuickQrChange()" placeholder="https://acara.com/tiket">
                  <button type="button" class="figma-btn-primary full-width" (click)="insertQuickQr()">
                    <span>▦ Generate QR di Kanvas</span>
                  </button>
                </div>

                <div class="tool-section">
                  <div class="section-title">LATAR KANVAS</div>
                  <label class="field-label">Warna Latar</label>
                  <div class="color-picker-row">
                    <input type="color" [value]="background()" (input)="changeBackground($event)">
                    <span class="hex-text">{{ background() }}</span>
                  </div>
                  <button type="button" class="tool-btn mt-2" (click)="bgInput.click()">
                    <span class="tool-icon">▧</span>
                    <span class="tool-label">Upload Gambar Latar</span>
                    <span class="tool-plus">＋</span>
                  </button>
                  <input #bgInput hidden type="file" accept="image/png,image/jpeg,image/webp" (change)="uploadBackground($event)">
                  @if (backgroundImage()) {
                    <button type="button" class="remove-bg-btn" (click)="removeBackgroundImage()">✕ Hapus Gambar Latar</button>
                  }
                  <label class="field-label mt-2">Kliping / Mask Kanvas</label>
                  <select class="figma-select" [value]="backgroundMask()" (change)="maskChange($event)">
                    <option value="none">Tanpa Kliping (Persegi)</option>
                    <option value="circle">Lingkaran Penuh</option>
                    <option value="ellipse">Bentuk Elips</option>
                    <option value="diamond">Belah Ketupat</option>
                    <option value="star">Bintang Festival</option>
                  </select>
                </div>
              }

              @if (leftTab === 'layers') {
                <div class="layers-list">
                  <div class="section-title">DAFTAR ELEMEN DI KANVAS</div>
                  @for (el of design()!.config.elements; track el.id) {
                    @if (el.type !== 'background') {
                      <div class="layer-item" [class.selected]="selectedId() === el.id" (click)="selectedId.set(el.id)">
                        <span class="layer-icon">{{ layerIcon(el.type) }}</span>
                        <span class="layer-name">{{ layerName(el) }}</span>
                        <button type="button" class="layer-delete" (click)="removeElement(el); $event.stopPropagation()" title="Hapus elemen">✕</button>
                      </div>
                    }
                  }
                </div>
              }

              @if (leftTab === 'ai') {
                <div class="ai-assistant-panel">
                  <div class="section-title">ASISTEN GAYA & TEMA AI</div>
                  <label class="field-label">Deskripsikan Suasana Acara</label>
                  <textarea class="figma-textarea" rows="3" [(ngModel)]="aiBrief" placeholder="Contoh: Konser musik rock indie dengan warna gelap dan aksen neon hijau..."></textarea>
                  <button type="button" class="figma-btn ai-btn full-width" (click)="recommendStyle()">
                    <span>✦ Rekomendasikan Gaya</span>
                  </button>

                  @if (aiStyle()) {
                    <div class="ai-style-card">
                      <div class="ai-style-header">
                        <strong>{{ aiStyle()!.name }}</strong>
                        <span class="style-dot" [style.background]="aiStyle()!.accent"></span>
                      </div>
                      <p>{{ aiStyle()!.description }}</p>
                      <div class="ai-palette-preview">
                        <span class="swatch" [style.background]="aiStyle()!.background" title="Latar"></span>
                        <span class="swatch" [style.background]="aiStyle()!.accent" title="Aksen"></span>
                        <span class="swatch" [style.background]="aiStyle()!.ink" title="Teks"></span>
                        <span class="font-chip">{{ aiStyle()!.font }}</span>
                      </div>
                      <button type="button" class="figma-btn-primary full-width" (click)="applyStyle()">
                        <span>Terapkan ke Seluruh Kanvas</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </aside>

          <!-- Center Canvas Viewport -->
          <section class="figma-canvas-viewport" (pointerdown)="onCanvasPointerDown($event)">
            <div class="canvas-ruler-chip">
              <span>{{ design()!.width }} × {{ design()!.height }} px</span>
              <span class="ruler-dot">·</span>
              <span>Skala Otomatis Presisi</span>
            </div>

            <div class="ticket-canvas-wrapper">
              <div
                class="ticket-canvas"
                [style.width.px]="canvasWidth()"
                [style.aspect-ratio]="design()!.width + '/' + design()!.height"
                [style.background]="backgroundImage() ? 'transparent' : background()"
                [style.background-image]="backgroundImage() ? 'url(' + backgroundImage() + ')' : null"
                [style.background-size]="backgroundImage() ? 'cover' : null"
                [style.background-position]="backgroundImage() ? 'center' : null"
                [style.clip-path]="clipPath(backgroundMask())"
                (pointerdown)="onCanvasStageClick($event)"
              >
                @for (el of design()!.config.elements; track el.id) {
                  @if (el.type === 'background') {
                    <!-- Base background layer handled on canvas wrapper -->
                  } @else if (el.type === 'text') {
                    <div
                      class="canvas-element canvas-text"
                      [class.selected]="selectedId() === el.id"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.font-size.px]="number(el['fontSize'], 24) * canvasScale()"
                      [style.font-weight]="el['fontWeight'] || 600"
                      [style.color]="el['color'] || '#1e293b'"
                      [style.font-family]="el['fontFamily'] || 'DM Sans'"
                      [style.text-transform]="el['textStyle'] === 'uppercase' ? 'uppercase' : null"
                      [style.font-style]="el['textStyle'] === 'italic' ? 'italic' : null"
                      [style.text-decoration]="el['textStyle'] === 'underline' ? 'underline' : null"
                      [style.text-shadow]="el['textStyle'] === 'shadow' ? '2px 3px 6px rgba(0,0,0,0.35)' : null"
                      [style.webkit-text-stroke]="el['textStyle'] === 'outline' ? '1px currentColor' : null"
                      [style.letter-spacing.px]="number(el['letterSpacing'], 0) * canvasScale()"
                      [style.text-align]="el['textAlign'] || 'left'"
                      [style.width.%]="(number(el['width'], design()!.width * 0.6) / design()!.width) * 100"
                      [style.transform]="transform(el)"
                      (pointerdown)="startDrag($event, el)"
                    >
                      <span
                        class="text-content-inner"
                        [class.ticket-badge-span]="el['isTicketNo'] && el['ticketStyle'] && el['ticketStyle'] !== 'plain'"
                        [ngStyle]="ticketBadgeStyle(el)"
                        contenteditable="true"
                        (blur)="textInlineChange($event, el)"
                        (input)="textInlineInput($event, el)"
                        (pointerdown)="$event.stopPropagation()"
                      >{{ el['text'] }}</span>

                      @if (selectedId() === el.id) {
                        <div class="canva-floating-bar" (pointerdown)="$event.stopPropagation()">
                          <button type="button" class="canva-action-btn danger" (click)="removeElement(el); $event.stopPropagation()" title="Hapus Objek (Delete / Backspace)">
                            <span class="canva-icon">🗑</span>
                            <span class="canva-label">Hapus</span>
                          </button>
                          <button type="button" class="canva-action-btn" (click)="duplicateElement(el); $event.stopPropagation()" title="Duplikat Objek (Ctrl+D)">
                            <span class="canva-icon">📋</span>
                            <span class="canva-label">Duplikat</span>
                          </button>
                          <span class="canva-divider"></span>
                          <button type="button" class="canva-action-btn icon-only" (click)="bringForward(el); $event.stopPropagation()" title="Ke Depan">
                            <span>⬆</span>
                          </button>
                          <button type="button" class="canva-action-btn icon-only" (click)="sendBackward(el); $event.stopPropagation()" title="Ke Belakang">
                            <span>⬇</span>
                          </button>
                        </div>
                        <div class="figma-selection-handles">
                          <button class="figma-rotate-handle" (pointerdown)="startRotate($event, el)" title="Putar elemen">↻</button>
                          <span class="figma-resize-handle nw"></span>
                          <span class="figma-resize-handle ne"></span>
                          <span class="figma-resize-handle sw"></span>
                          <span class="figma-resize-handle se" (pointerdown)="startResize($event, el)" title="Ubah ukuran">↘</span>
                        </div>
                      }
                    </div>
                  } @else if (el.type === 'qr') {
                    <div
                      class="canvas-element canvas-qr"
                      [class.selected]="selectedId() === el.id"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.width.%]="(number(el['width'], 120) / design()!.width) * 100"
                      [style.height.%]="(number(el['height'], 120) / design()!.height) * 100"
                      [style.transform]="transform(el)"
                      (pointerdown)="startDrag($event, el)"
                    >
                      @if (el['qrDataUrl']) {
                        <img [src]="el['qrDataUrl']" alt="QR Code">
                      } @else {
                        <div class="qr-placeholder-box">
                          <span>▦</span>
                          <small>Membuat QR…</small>
                        </div>
                      }
                      @if (selectedId() === el.id) {
                        <div class="canva-floating-bar" (pointerdown)="$event.stopPropagation()">
                          <button type="button" class="canva-action-btn danger" (click)="removeElement(el); $event.stopPropagation()" title="Hapus Objek (Delete / Backspace)">
                            <span class="canva-icon">🗑</span>
                            <span class="canva-label">Hapus</span>
                          </button>
                          <button type="button" class="canva-action-btn" (click)="duplicateElement(el); $event.stopPropagation()" title="Duplikat Objek (Ctrl+D)">
                            <span class="canva-icon">📋</span>
                            <span class="canva-label">Duplikat</span>
                          </button>
                          <span class="canva-divider"></span>
                          <button type="button" class="canva-action-btn icon-only" (click)="bringForward(el); $event.stopPropagation()" title="Ke Depan">
                            <span>⬆</span>
                          </button>
                          <button type="button" class="canva-action-btn icon-only" (click)="sendBackward(el); $event.stopPropagation()" title="Ke Belakang">
                            <span>⬇</span>
                          </button>
                        </div>
                        <div class="figma-selection-handles">
                          <button class="figma-rotate-handle" (pointerdown)="startRotate($event, el)" title="Putar elemen">↻</button>
                          <span class="figma-resize-handle nw"></span>
                          <span class="figma-resize-handle ne"></span>
                          <span class="figma-resize-handle sw"></span>
                          <span class="figma-resize-handle se" (pointerdown)="startResize($event, el)" title="Ubah ukuran">↘</span>
                        </div>
                      }
                    </div>
                  } @else if (el.type === 'image') {
                    <div
                      class="canvas-element canvas-image"
                      [class.selected]="selectedId() === el.id"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.width.%]="(number(el['width'], 140) / design()!.width) * 100"
                      [style.height.%]="(number(el['height'], 90) / design()!.height) * 100"
                      [style.transform]="transform(el)"
                      [style.clip-path]="clipPath(el['clip'] || 'none')"
                      (pointerdown)="startDrag($event, el)"
                    >
                      <img [src]="el['src']" alt="Logo / Gambar">
                      @if (selectedId() === el.id) {
                        <div class="canva-floating-bar" (pointerdown)="$event.stopPropagation()">
                          <button type="button" class="canva-action-btn danger" (click)="removeElement(el); $event.stopPropagation()" title="Hapus Objek (Delete / Backspace)">
                            <span class="canva-icon">🗑</span>
                            <span class="canva-label">Hapus</span>
                          </button>
                          <button type="button" class="canva-action-btn" (click)="duplicateElement(el); $event.stopPropagation()" title="Duplikat Objek (Ctrl+D)">
                            <span class="canva-icon">📋</span>
                            <span class="canva-label">Duplikat</span>
                          </button>
                          <span class="canva-divider"></span>
                          <button type="button" class="canva-action-btn icon-only" (click)="bringForward(el); $event.stopPropagation()" title="Ke Depan">
                            <span>⬆</span>
                          </button>
                          <button type="button" class="canva-action-btn icon-only" (click)="sendBackward(el); $event.stopPropagation()" title="Ke Belakang">
                            <span>⬇</span>
                          </button>
                        </div>
                        <div class="figma-selection-handles">
                          <button class="figma-rotate-handle" (pointerdown)="startRotate($event, el)" title="Putar elemen">↻</button>
                          <span class="figma-resize-handle nw"></span>
                          <span class="figma-resize-handle ne"></span>
                          <span class="figma-resize-handle sw"></span>
                          <span class="figma-resize-handle se" (pointerdown)="startResize($event, el)" title="Ubah ukuran">↘</span>
                        </div>
                      }
                    </div>
                  } @else if (el.type === 'rectangle' || el.type === 'circle') {
                    <div
                      class="canvas-element canvas-shape"
                      [class.circle-shape]="el.type === 'circle'"
                      [class.selected]="selectedId() === el.id"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.width.%]="(number(el['width'], 120) / design()!.width) * 100"
                      [style.height.%]="(number(el['height'], 70) / design()!.height) * 100"
                      [style.transform]="transform(el)"
                      [style.background]="el['fill'] || '#0d99ff'"
                      [style.clip-path]="clipPath(el['clip'] || 'none')"
                      (pointerdown)="startDrag($event, el)"
                    >
                      @if (selectedId() === el.id) {
                        <div class="canva-floating-bar" (pointerdown)="$event.stopPropagation()">
                          <button type="button" class="canva-action-btn danger" (click)="removeElement(el); $event.stopPropagation()" title="Hapus Objek (Delete / Backspace)">
                            <span class="canva-icon">🗑</span>
                            <span class="canva-label">Hapus</span>
                          </button>
                          <button type="button" class="canva-action-btn" (click)="duplicateElement(el); $event.stopPropagation()" title="Duplikat Objek (Ctrl+D)">
                            <span class="canva-icon">📋</span>
                            <span class="canva-label">Duplikat</span>
                          </button>
                          <span class="canva-divider"></span>
                          <button type="button" class="canva-action-btn icon-only" (click)="bringForward(el); $event.stopPropagation()" title="Ke Depan">
                            <span>⬆</span>
                          </button>
                          <button type="button" class="canva-action-btn icon-only" (click)="sendBackward(el); $event.stopPropagation()" title="Ke Belakang">
                            <span>⬇</span>
                          </button>
                        </div>
                        <div class="figma-selection-handles">
                          <button class="figma-rotate-handle" (pointerdown)="startRotate($event, el)" title="Putar elemen">↻</button>
                          <span class="figma-resize-handle nw"></span>
                          <span class="figma-resize-handle ne"></span>
                          <span class="figma-resize-handle sw"></span>
                          <span class="figma-resize-handle se" (pointerdown)="startResize($event, el)" title="Ubah ukuran">↘</span>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          </section>

          <!-- Right Sidebar: Figma Properties Inspector -->
          <aside class="figma-inspector">
            @if (selectedElement()) {
              <div class="inspector-header">
                <div class="element-badge">
                  <span class="type-dot">●</span>
                  <span>{{ selectedElement()!.type.toUpperCase() }}</span>
                </div>
                <div class="inspector-quick-actions">
                  <button type="button" class="canva-quick-btn" (click)="duplicateElement(selectedElement()!)" title="Duplikat Objek (Ctrl+D)">📋 Duplikat</button>
                  <button type="button" class="canva-quick-btn danger" (click)="removeElement(selectedElement()!)" title="Hapus Objek (Delete)">🗑 Hapus</button>
                </div>
              </div>

              <!-- Posisi & Geometri -->
              <div class="inspector-section">
                <div class="section-title">POSISI & GEOMETRI</div>
                <div class="grid-2">
                  <label class="compact-field">
                    <span>X</span>
                    <input type="number" [value]="selectedElement()!.x" (input)="positionInput($event, selectedElement()!, 'x')">
                  </label>
                  <label class="compact-field">
                    <span>Y</span>
                    <input type="number" [value]="selectedElement()!.y" (input)="positionInput($event, selectedElement()!, 'y')">
                  </label>
                </div>
                <div class="grid-2 mt-2">
                  <label class="compact-field">
                    <span>W</span>
                    <input type="number" [value]="selectedElement()!['width'] || 100" (input)="dimensionInput($event, selectedElement()!, 'width')">
                  </label>
                  <label class="compact-field">
                    <span>H</span>
                    <input type="number" [value]="selectedElement()!['height'] || 100" (input)="dimensionInput($event, selectedElement()!, 'height')">
                  </label>
                </div>
                <div class="mt-2">
                  <label class="field-label">Rotasi: {{ selectedElement()!['rotation'] || 0 }}°</label>
                  <input type="range" min="-180" max="180" [value]="selectedElement()!['rotation'] || 0" (input)="rotationChange($event, selectedElement()!)">
                </div>
              </div>

              <!-- Tipografi (Jika Teks) -->
              @if (selectedElement()!.type === 'text') {
                <div class="inspector-section">
                  <div class="section-title">NOMOR TIKET OTOMATIS</div>
                  <label class="figma-toggle-row">
                    <input type="checkbox" [checked]="selectedElement()!['isTicketNo']" (change)="toggleTicketNo($event, selectedElement()!)">
                    <span>Gunakan Sebagai Nomor Tiket</span>
                  </label>

                  @if (selectedElement()!['isTicketNo']) {
                    <div class="ticket-no-config-box">
                      <label class="field-label">Format Awalan (Prefix Bebas)</label>
                      <input class="figma-input" [value]="selectedElement()!['ticketPrefix'] || 'TCK-'" (input)="updateTicketNoFormat($event, selectedElement()!, 'ticketPrefix')" placeholder="Contoh: TCK-, VIP-, NO: ">

                      <div class="grid-2 mt-2">
                        <label class="compact-field">
                          <span>Mulai</span>
                          <input type="number" min="1" [value]="selectedElement()!['ticketStart'] || 1" (input)="updateTicketNoFormat($event, selectedElement()!, 'ticketStart')">
                        </label>
                        <label class="compact-field">
                          <span>Digit</span>
                          <select class="figma-select-compact" [value]="selectedElement()!['ticketPad'] || 4" (change)="updateTicketNoFormat($event, selectedElement()!, 'ticketPad')">
                            <option value="3">3 Digit (001)</option>
                            <option value="4">4 Digit (0001)</option>
                            <option value="5">5 Digit (00001)</option>
                            <option value="0">Tanpa Nol (1)</option>
                          </select>
                        </label>
                      </div>

                      <label class="field-label mt-2">Akhiran / Suffix (Opsional)</label>
                      <input class="figma-input" [value]="selectedElement()!['ticketSuffix'] || ''" (input)="updateTicketNoFormat($event, selectedElement()!, 'ticketSuffix')" placeholder="Contoh: -A, /2025">

                      <!-- Pilihan Styling Desain Nomor Tiket -->
                      <div class="section-subtitle mt-3">PILIH STYLE DESAIN NOMOR TIKET</div>
                      <div class="ticket-style-grid">
                        @for (st of ticketNoStyles; track st.id) {
                          <button
                            type="button"
                            class="ticket-style-card"
                            [class.active]="(selectedElement()!['ticketStyle'] || 'pill') === st.id"
                            (click)="selectTicketStyle(selectedElement()!, st)"
                          >
                            <div class="style-card-head">
                              <span>{{ st.label }}</span>
                              <span class="style-card-icon">{{ st.icon }}</span>
                            </div>
                            <span class="style-card-desc">{{ st.desc }}</span>
                          </button>
                        }
                      </div>

                      <!-- Kustomisasi Warna & Border Badge -->
                      @if ((selectedElement()!['ticketStyle'] || 'pill') !== 'plain') {
                        <div class="ticket-badge-customizer mt-3">
                          <label class="field-label">Warna Latar Badge</label>
                          <div class="color-picker-row">
                            <input type="color" [value]="selectedElement()!['badgeBg'] || '#ffffff'" (input)="updateTicketBadgeField(selectedElement()!, 'badgeBg', $any($event.target).value)">
                            <span class="hex-text">{{ selectedElement()!['badgeBg'] || '#ffffff' }}</span>
                            <button type="button" class="mini-chip-btn" (click)="updateTicketBadgeField(selectedElement()!, 'badgeBg', 'transparent')">Transparan</button>
                          </div>

                          <label class="field-label mt-2">Warna Border / Garis</label>
                          <div class="color-picker-row">
                            <input type="color" [value]="selectedElement()!['badgeBorder'] || '#0d99ff'" (input)="updateTicketBadgeField(selectedElement()!, 'badgeBorder', $any($event.target).value)">
                            <span class="hex-text">{{ selectedElement()!['badgeBorder'] || '#0d99ff' }}</span>
                          </div>

                          <div class="grid-2 mt-2">
                            <label class="compact-field">
                              <span>Bentuk Sudut</span>
                              <select class="figma-select-compact" [value]="selectedElement()!['badgeRadius'] !== undefined ? selectedElement()!['badgeRadius'] : 999" (change)="updateTicketBadgeField(selectedElement()!, 'badgeRadius', +$any($event.target).value)">
                                <option value="0">Kotak Tajam (0px)</option>
                                <option value="4">Sedikit Bulat (4px)</option>
                                <option value="8">Sedang (8px)</option>
                                <option value="16">Melengkung (16px)</option>
                                <option value="999">Kapsul Penuh (Pill)</option>
                              </select>
                            </label>
                            <label class="compact-field">
                              <span>Tebal Border</span>
                              <select class="figma-select-compact" [value]="selectedElement()!['badgeBorderWidth'] !== undefined ? selectedElement()!['badgeBorderWidth'] : 1.5" (change)="updateTicketBadgeField(selectedElement()!, 'badgeBorderWidth', +$any($event.target).value)">
                                <option value="0">Tanpa Garis (0px)</option>
                                <option value="1">Tipis (1px)</option>
                                <option value="1.5">Standar (1.5px)</option>
                                <option value="2">Sedang (2px)</option>
                                <option value="3">Tebal (3px)</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      }

                      <div class="ticket-no-preview-pill mt-3">
                        <span>Pratinjau Badge:</span>
                        <span class="ticket-badge-span" [ngStyle]="ticketBadgeStyle(selectedElement()!)">
                          {{ selectedElement()!['text'] }}
                        </span>
                      </div>
                    </div>
                  }
                </div>

                <div class="inspector-section">
                  <div class="section-title">TIPOGRAFI</div>
                  <label class="field-label">Isi Teks</label>
                  <textarea class="figma-textarea" rows="2" [value]="selectedElement()!['text']" (input)="textChange($event, selectedElement()!)"></textarea>

                  <label class="field-label mt-2">Font Family</label>
                  <select class="figma-select" [value]="selectedElement()!['fontFamily'] || 'DM Sans'" (change)="fontFamilyChange($event, selectedElement()!)">
                    @for (f of fontOptions; track f.value) {
                      <option [value]="f.value">{{ f.label }}</option>
                    }
                  </select>

                  <div class="grid-2 mt-2">
                    <label class="compact-field">
                      <span>Ukuran</span>
                      <input type="number" min="8" max="180" [value]="selectedElement()!['fontSize'] || 24" (input)="fontSizeInput($event, selectedElement()!)">
                    </label>
                    <label class="compact-field">
                      <span>Tebal</span>
                      <select class="figma-select-compact" [value]="selectedElement()!['fontWeight'] || 600" (change)="fontWeightChange($event, selectedElement()!)">
                        <option value="400">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">SemiBold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </label>
                  </div>

                  <label class="field-label mt-2">Warna Teks</label>
                  <div class="color-picker-row">
                    <input type="color" [value]="selectedElement()!['color'] || '#1e293b'" (input)="textColorChange($event, selectedElement()!)">
                    <span class="hex-text">{{ selectedElement()!['color'] || '#1e293b' }}</span>
                  </div>

                  <label class="field-label mt-2">Gaya Visual Tipografi</label>
                  <select class="figma-select" [value]="selectedElement()!['textStyle'] || 'normal'" (change)="textStyleChange($event, selectedElement()!)">
                    <option value="normal">Normal</option>
                    <option value="uppercase">Kapital Tegas (UPPERCASE)</option>
                    <option value="italic">Miring (Italic)</option>
                    <option value="underline">Garis Bawah (Underline)</option>
                    <option value="outline">Teks Outline</option>
                    <option value="shadow">Teks Bayangan (Drop Shadow)</option>
                  </select>

                  <label class="field-label mt-2">Jarak Antar Huruf: {{ selectedElement()!['letterSpacing'] || 0 }}px</label>
                  <input type="range" min="-2" max="14" step="0.5" [value]="selectedElement()!['letterSpacing'] || 0" (input)="letterSpacingChange($event, selectedElement()!)">

                  <label class="field-label mt-2">Perataan Teks</label>
                  <div class="align-btn-group">
                    <button type="button" [class.active]="(selectedElement()!['textAlign'] || 'left') === 'left'" (click)="setTextAlign(selectedElement()!, 'left')">Kiri</button>
                    <button type="button" [class.active]="selectedElement()!['textAlign'] === 'center'" (click)="setTextAlign(selectedElement()!, 'center')">Tengah</button>
                    <button type="button" [class.active]="selectedElement()!['textAlign'] === 'right'" (click)="setTextAlign(selectedElement()!, 'right')">Kanan</button>
                  </div>
                </div>
              }

              <!-- QR Code (Jika QR) -->
              @if (selectedElement()!.type === 'qr') {
                <div class="inspector-section">
                  <div class="section-title">PENGATURAN QR CODE</div>
                  <label class="field-label">URL atau Isi Teks</label>
                  <textarea class="figma-textarea" rows="2" [value]="selectedElement()!['value'] || ''" (input)="qrValueChange($event, selectedElement()!)" placeholder="https://..."></textarea>

                  @if (selectedElement()!['qrDataUrl']) {
                    <div class="qr-preview-badge">
                      <img [src]="selectedElement()!['qrDataUrl']" alt="Pratinjau QR">
                      <div>
                        <strong>QR Code Siap</strong>
                        <small>{{ selectedElement()!['value'] || 'https://ticketforge.local/verify' }}</small>
                      </div>
                    </div>
                  }

                  <button type="button" class="figma-btn-primary full-width" (click)="generateQr(selectedElement()!)">
                    <span>↻ Generate Ulang QR</span>
                  </button>

                  <label class="field-label mt-2">Warna QR</label>
                  <div class="color-picker-row">
                    <input type="color" [value]="selectedElement()!['color'] || '#1e293b'" (input)="qrColorChange($event, selectedElement()!)">
                    <span class="hex-text">{{ selectedElement()!['color'] || '#1e293b' }}</span>
                  </div>

                  <label class="field-label mt-2">Warna Latar QR</label>
                  <div class="color-picker-row">
                    <input type="color" [value]="selectedElement()!['qrBackground'] || '#ffffff'" (input)="qrBgChange($event, selectedElement()!)">
                    <span class="hex-text">{{ selectedElement()!['qrBackground'] || '#ffffff' }}</span>
                  </div>
                </div>
              }

              <!-- Gambar / Logo -->
              @if (selectedElement()!.type === 'image') {
                <div class="inspector-section">
                  <div class="section-title">HAPUS LATAR OBJEK (SEPERTI CANVA)</div>
                  <button type="button" class="canva-magic-btn full-width" (click)="magicRemoveBackground(selectedElement()!)" title="Hapus warna latar belakang gambar secara otomatis">
                    <span class="magic-spark">✦</span>
                    <span>Hapus Latar Gambar (Magic Cutout)</span>
                  </button>

                  <label class="field-label mt-2">Nama File</label>
                  <input class="figma-input readonly" readonly [value]="selectedElement()!['fileName'] || 'Gambar'">

                  <label class="field-label mt-2">Bentuk Mask (Kliping)</label>
                  <select class="figma-select" [value]="selectedElement()!['clip'] || 'none'" (change)="elementMaskChange($event, selectedElement()!)">
                    <option value="none">Tanpa Kliping</option>
                    <option value="circle">Lingkaran</option>
                    <option value="ellipse">Elips</option>
                    <option value="diamond">Belah Ketupat</option>
                    <option value="star">Bintang</option>
                  </select>
                </div>
              }

              <!-- Bentuk Shape -->
              @if (selectedElement()!.type === 'rectangle' || selectedElement()!.type === 'circle') {
                <div class="inspector-section">
                  <div class="section-title">WARNA & KLIPING</div>
                  <label class="field-label">Warna Bentuk</label>
                  <div class="color-picker-row">
                    <input type="color" [value]="selectedElement()!['fill'] || '#0d99ff'" (input)="shapeFillChange($event, selectedElement()!)">
                    <span class="hex-text">{{ selectedElement()!['fill'] || '#0d99ff' }}</span>
                  </div>

                  <label class="field-label mt-2">Bentuk Kliping</label>
                  <select class="figma-select" [value]="selectedElement()!['clip'] || 'none'" (change)="elementMaskChange($event, selectedElement()!)">
                    <option value="none">Bawaan</option>
                    <option value="circle">Lingkaran</option>
                    <option value="ellipse">Elips</option>
                    <option value="diamond">Belah Ketupat</option>
                    <option value="star">Bintang</option>
                  </select>
                </div>
              }
            } @else {
              <!-- Canvas Level Properties when nothing is selected -->
              <div class="inspector-header">
                <div class="element-badge">
                  <span class="type-dot">●</span>
                  <span>KANVAS TIKET</span>
                </div>
              </div>

              <div class="inspector-section">
                <div class="section-title">DIMENSI KANVAS</div>
                <div class="canvas-spec-card">
                  <div class="spec-row">
                    <span>Lebar</span>
                    <strong>{{ design()!.width }} px</strong>
                  </div>
                  <div class="spec-row">
                    <span>Tinggi</span>
                    <strong>{{ design()!.height }} px</strong>
                  </div>
                  <div class="spec-row">
                    <span>Tipe</span>
                    <strong>{{ design()!.type }}</strong>
                  </div>
                </div>
              </div>

              <div class="inspector-section">
                <div class="section-title">WARNA & LATAR</div>
                <label class="field-label">Warna Latar Belakang</label>
                <div class="color-picker-row">
                  <input type="color" [value]="background()" (input)="changeBackground($event)">
                  <span class="hex-text">{{ background() }}</span>
                </div>

                <label class="field-label mt-2">Kliping Bentuk Tiket</label>
                <select class="figma-select" [value]="backgroundMask()" (change)="maskChange($event)">
                  <option value="none">Persegi Standar</option>
                  <option value="circle">Lingkaran</option>
                  <option value="ellipse">Elips</option>
                  <option value="diamond">Belah Ketupat</option>
                  <option value="star">Bintang</option>
                </select>
              </div>

              <div class="inspector-section figma-tips">
                <div class="section-title">PETUNJUK EDITOR</div>
                <p>• Klik elemen pada kanvas untuk mengedit ukuran, font, warna, dan posisi.</p>
                <p>• Geser / drag elemen langsung untuk memindahkannya.</p>
                <p>• Tarik handle sudut untuk memperbesar dan handle atas untuk memutar.</p>
                <p>• Perubahan disimpan otomatis ke akun Anda.</p>
              </div>
            }
          </aside>
        </div>
      }

      @if (error() && design()) {
        <div class="figma-toast-error">
          <span>⚠️ {{ error() }}</span>
          <button type="button" (click)="error.set('')">✕</button>
        </div>
      }

      <!-- Modal Batch Print & Ticket Number Generator -->
      @if (printModalOpen()) {
        <div class="modal-scrim" (click)="closePrintModal()" (keydown.escape)="closePrintModal()">
          <section class="create-modal print-modal figma-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="closePrintModal()" aria-label="Tutup">×</button>
            <div class="eyebrow">CETAK TIKET & GENERATE NOMOR</div>
            <h2>Cetak PDF & Generate Nomor Tiket</h2>
            <p class="modal-intro">Tentukan berapa lembar tiket yang ingin dicetak. Nomor tiket dan kode QR otomatis mengikuti jumlah lembar yang akan dicetak secara berurutan.</p>

            <div class="print-config-grid">
              <div class="print-field-group">
                <label class="modal-label">Jumlah Lembar Tiket yang Dicetak</label>
                <div class="count-input-wrapper">
                  <input class="profile-input count-input" type="number" min="1" max="1000" [value]="printCount()" (input)="onPrintCountChange($event)">
                  <span class="count-unit">LEMBAR</span>
                </div>
                <div class="quick-count-chips">
                  @for (c of [5, 10, 25, 50, 100]; track c) {
                    <button type="button" class="quick-chip" [class.active]="printCount() === c" (click)="printCount.set(c)">{{ c }} Lembar</button>
                  }
                </div>
              </div>

              <div class="print-field-group">
                <label class="modal-label">Format Nomor Tiket (Bisa Diisi Bebas)</label>
                <div class="grid-2">
                  <div>
                    <span class="sub-label">Awalan / Kode Bebas:</span>
                    <input class="profile-input" [value]="printPrefix()" (input)="printPrefix.set($any($event.target).value)" placeholder="Contoh: TCK-, VIP-, INV-">
                  </div>
                  <div>
                    <span class="sub-label">Nomor Tiket Mulai:</span>
                    <input class="profile-input" type="number" min="1" [value]="printStartNo()" (input)="printStartNo.set(number($any($event.target).value, 1))">
                  </div>
                </div>
                <div class="grid-2 mt-2">
                  <div>
                    <span class="sub-label">Panjang Digit Angka:</span>
                    <select class="profile-input" [value]="printPad()" (change)="printPad.set(number($any($event.target).value, 4))">
                      <option [value]="3">3 Digit (001)</option>
                      <option [value]="4">4 Digit (0001)</option>
                      <option [value]="5">5 Digit (00001)</option>
                      <option [value]="0">Tanpa Nol di Depan (1)</option>
                    </select>
                  </div>
                  <div>
                    <span class="sub-label">Akhiran / Suffix:</span>
                    <input class="profile-input" [value]="printSuffix()" (input)="printSuffix.set($any($event.target).value)" placeholder="Contoh: -A, /2025 (Opsional)">
                  </div>
                </div>
              </div>

              <div class="print-field-group">
                <label class="modal-label">Sinkronisasi QR Code Otomatis</label>
                <label class="figma-toggle-row">
                  <input type="checkbox" [checked]="printSyncQr()" (change)="printSyncQr.set($any($event.target).checked)">
                  <span>Otomatis sesuaikan QR Code dengan nomor tiket di setiap lembar</span>
                </label>
              </div>

              <div class="print-preview-summary">
                <div class="summary-header">
                  <strong>Pratinjau Urutan Nomor Tiket:</strong>
                  <span class="summary-badge">{{ printCount() }} Lembar Otomatis</span>
                </div>
                <div class="ticket-numbers-list">
                  @for (n of previewTicketNumbers(); track $index) {
                    <span class="ticket-no-badge">#{{ $index + 1 }}: <b>{{ n }}</b></span>
                  }
                  @if (printCount() > 6) {
                    <span class="ticket-no-badge more">… hingga lembar ke-{{ printCount() }} ({{ lastTicketNumber() }})</span>
                  }
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="outline-btn" type="button" (click)="closePrintModal()" [disabled]="printBusy()">Batal</button>
              <button class="primary-btn print-submit-btn" type="button" (click)="executeBatchPrint()" [disabled]="printBusy() || printCount() < 1">
                <span>{{ printBusy() ? 'Menyiapkan ' + printCount() + ' Lembar…' : '🖨 Generate & Cetak ' + printCount() + ' Lembar PDF' }}</span>
                <span class="btn-arrow">↗</span>
              </button>
            </div>
          </section>
        </div>
      }

      <!-- Batch Print Rendering Container for Browser Print / PDF Export -->
      @if (printPages().length > 0) {
        <div class="print-batch-root" id="print-batch-root">
          @for (page of printPages(); track $index) {
            <div class="print-sheet-wrapper">
              <div
                class="ticket-canvas print-canvas-instance"
                [style.aspect-ratio]="design()!.width + '/' + design()!.height"
                [style.background]="backgroundImage() ? 'transparent' : background()"
                [style.background-image]="backgroundImage() ? 'url(' + backgroundImage() + ')' : null"
                [style.background-size]="backgroundImage() ? 'cover' : null"
                [style.background-position]="backgroundImage() ? 'center' : null"
                [style.clip-path]="clipPath(backgroundMask())"
              >
                @for (el of design()!.config.elements; track el.id) {
                  @if (el.type === 'background') {
                    <!-- background -->
                  } @else if (el.type === 'text') {
                    <div
                      class="canvas-element canvas-text"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.font-size.px]="number(el['fontSize'], 24) * printScale()"
                      [style.font-weight]="el['fontWeight'] || 600"
                      [style.color]="el['color'] || '#1e293b'"
                      [style.font-family]="el['fontFamily'] || 'DM Sans'"
                      [style.text-transform]="el['textStyle'] === 'uppercase' ? 'uppercase' : null"
                      [style.font-style]="el['textStyle'] === 'italic' ? 'italic' : null"
                      [style.text-decoration]="el['textStyle'] === 'underline' ? 'underline' : null"
                      [style.text-shadow]="el['textStyle'] === 'shadow' ? '2px 3px 6px rgba(0,0,0,0.35)' : null"
                      [style.webkit-text-stroke]="el['textStyle'] === 'outline' ? '1px currentColor' : null"
                      [style.letter-spacing.px]="number(el['letterSpacing'], 0) * printScale()"
                      [style.text-align]="el['textAlign'] || 'left'"
                      [style.width.%]="(number(el['width'], design()!.width * 0.6) / design()!.width) * 100"
                      [style.transform]="transform(el)"
                    >
                      <span
                        class="text-content-inner"
                        [class.ticket-badge-span]="el['isTicketNo'] && el['ticketStyle'] && el['ticketStyle'] !== 'plain'"
                        [ngStyle]="ticketBadgeStyle(el)"
                      >{{ el['isTicketNo'] ? page.ticketNo : el['text'] }}</span>
                    </div>
                  } @else if (el.type === 'qr') {
                    <div
                      class="canvas-element canvas-qr"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.width.%]="(number(el['width'], 120) / design()!.width) * 100"
                      [style.height.%]="(number(el['height'], 120) / design()!.height) * 100"
                      [style.transform]="transform(el)"
                    >
                      <img [src]="page.qrDataUrl || el['qrDataUrl']" alt="QR Code">
                    </div>
                  } @else if (el.type === 'image') {
                    <div
                      class="canvas-element canvas-image"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.width.%]="(number(el['width'], 140) / design()!.width) * 100"
                      [style.height.%]="(number(el['height'], 90) / design()!.height) * 100"
                      [style.transform]="transform(el)"
                      [style.clip-path]="clipPath(el['clip'] || 'none')"
                    >
                      <img [src]="el['src']" alt="Logo / Gambar">
                    </div>
                  } @else if (el.type === 'rectangle' || el.type === 'circle') {
                    <div
                      class="canvas-element canvas-shape"
                      [class.circle-shape]="el.type === 'circle'"
                      [style.left.%]="(el.x / design()!.width) * 100"
                      [style.top.%]="(el.y / design()!.height) * 100"
                      [style.width.%]="(number(el['width'], 120) / design()!.width) * 100"
                      [style.height.%]="(number(el['height'], 70) / design()!.height) * 100"
                      [style.transform]="transform(el)"
                      [style.background]="el['fill'] || '#0d99ff'"
                      [style.clip-path]="clipPath(el['clip'] || 'none')"
                    ></div>
                  }
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class TicketEditorComponent implements OnDestroy {
  private api = inject(DesignsApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fontOptions = fontOptions;
  ticketStyles = ticketStyles;
  ticketNoStyles = ticketNoStyles;

  design = signal<Design | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  selectedId = signal('');
  background = signal('#f4f1e8');
  backgroundImage = signal('');
  backgroundMask = signal('none');

  leftTab: 'tools' | 'layers' | 'ai' = 'tools';
  quickQrLink = '';
  aiBrief = '';
  aiStyle = signal<{ name: string; description: string; background: string; accent: string; ink: string; font: string } | null>(null);
  aiBusyState = signal(false);

  printModalOpen = signal(false);
  printCount = signal(10);
  printPrefix = signal('TCK-');
  printStartNo = signal(1);
  printPad = signal(4);
  printSuffix = signal('');
  printSyncQr = signal(true);
  printBusy = signal(false);
  printPages = signal<Array<{ ticketNo: string; qrDataUrl?: string }>>([]);

  private drag: {
    id: string;
    kind: 'move' | 'resize' | 'rotate';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origWidth: number;
    origHeight: number;
    origRotation: number;
    centerX: number;
    centerY: number;
  } | null = null;

  private saveTimer: any;
  private qrTimers = new Map<string, any>();

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('ID desain tidak ditemukan.');
      return;
    }

    this.api.get(id).subscribe({
      next: r => {
        const d = r.data;
        this.design.set(d);
        this.background.set(d.config?.canvas?.background || '#f4f1e8');
        this.backgroundImage.set(String(d.config?.canvas?.backgroundImage || ''));
        this.backgroundMask.set(String(d.config?.canvas?.backgroundMask || 'none'));
        this.loading.set(false);
        for (const el of d.config?.elements || []) {
          if (el.type === 'qr') {
            this.generateQr(el);
          }
        }
      },
      error: e => {
        this.loading.set(false);
        this.error.set(messageOf(e, 'Desain tidak ditemukan atau tidak dapat dimuat.'));
      }
    });

    window.addEventListener('pointermove', this.moveDrag);
    window.addEventListener('pointerup', this.endDrag);
    window.addEventListener('keydown', this.onKeyDown);
  }

  ngOnDestroy() {
    window.removeEventListener('pointermove', this.moveDrag);
    window.removeEventListener('pointerup', this.endDrag);
    window.removeEventListener('keydown', this.onKeyDown);
    clearTimeout(this.saveTimer);
  }

  aiBusy() {
    return this.aiBusyState();
  }

  canvasWidth() {
    return Math.min(840, Math.max(340, window.innerWidth * 0.52));
  }

  canvasScale() {
    return this.canvasWidth() / (this.design()?.width || 1050);
  }

  number(v: unknown, f: number) {
    return typeof v === 'number' && !isNaN(v) ? v : f;
  }

  transform(el: DesignElement) {
    return `rotate(${this.number(el['rotation'], 0)}deg)`;
  }

  selectedElement(): DesignElement | null {
    return this.design()?.config.elements.find(e => e.id === this.selectedId()) || null;
  }

  layerIcon(type: string) {
    switch (type) {
      case 'text': return 'T';
      case 'qr': return '▦';
      case 'image': return '▣';
      case 'rectangle': return '▢';
      case 'circle': return '◯';
      default: return '▧';
    }
  }

  layerName(el: DesignElement) {
    if (el.type === 'text') return String(el['text'] || 'Teks').slice(0, 18);
    if (el.type === 'qr') return 'QR Code';
    if (el.type === 'image') return String(el['fileName'] || 'Gambar Logo');
    if (el.type === 'rectangle') return 'Kotak Shape';
    if (el.type === 'circle') return 'Lingkaran Shape';
    return el.type;
  }

  onCanvasPointerDown(e: PointerEvent) {
    // If clicked on empty stage area, deselect
    const target = e.target as HTMLElement;
    if (target.classList.contains('figma-canvas-viewport') || target.classList.contains('ticket-canvas-wrapper')) {
      this.selectedId.set('');
    }
  }

  onCanvasStageClick(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('ticket-canvas')) {
      this.selectedId.set('');
    }
  }

  private updateElement(id: string, fn: (e: DesignElement) => void, save = true) {
    this.mutate(d => {
      const el = d.config.elements.find(x => x.id === id);
      if (el) fn(el);
    }, save);
  }

  rename(e: Event) {
    const n = (e.target as HTMLInputElement).value.trim();
    if (n.length >= 2) this.mutate(d => d.name = n);
  }

  changeBackground(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.background.set(val);
    this.mutate(d => {
      d.config.canvas.background = val;
      const bg = d.config.elements.find(x => x.type === 'background');
      if (bg) bg['fill'] = val;
    });
  }

  removeBackgroundImage() {
    this.backgroundImage.set('');
    this.mutate(d => {
      d.config.canvas.backgroundImage = '';
    });
  }

  maskChange(e: Event) {
    const mask = (e.target as HTMLSelectElement).value;
    this.backgroundMask.set(mask);
    this.mutate(d => {
      d.config.canvas.backgroundMask = mask;
    });
  }

  clipPath(shape: unknown) {
    const key = typeof shape === 'string' ? shape : 'none';
    const shapes: Record<string, string> = {
      none: 'none',
      circle: 'circle(50% at 50% 50%)',
      ellipse: 'ellipse(50% 42% at 50% 50%)',
      diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
      star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 94%, 50% 72%, 21% 94%, 32% 57%, 2% 35%, 39% 35%)'
    };
    return shapes[key] || 'none';
  }

  uploadBackground(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error.set('Format gambar latar harus PNG, JPG, atau WEBP.');
      input.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.error.set('Ukuran gambar latar maksimal 4 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      this.backgroundImage.set(src);
      this.mutate(d => {
        d.config.canvas.backgroundImage = src;
        d.config.canvas.backgroundMask = this.backgroundMask();
      });
    };
    reader.onerror = () => this.error.set('Gambar latar tidak dapat dibaca.');
    reader.readAsDataURL(file);
    input.value = '';
  }

  uploadLogo(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      this.error.set('Format logo harus PNG, JPG, WEBP, atau SVG.');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.error.set('Ukuran file logo maksimal 2 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      this.addElement({
        id: crypto.randomUUID(),
        type: 'image',
        x: 80,
        y: 80,
        width: 140,
        height: 100,
        src,
        fileName: file.name,
        rotation: 0
      });
    };
    reader.onerror = () => this.error.set('File logo tidak dapat dibaca.');
    reader.readAsDataURL(file);
    input.value = '';
  }

  addText() {
    this.addElement({
      id: crypto.randomUUID(),
      type: 'text',
      x: 80,
      y: 120,
      text: 'Judul Tiket Baru',
      fontSize: 40,
      fontWeight: 700,
      color: '#1e293b',
      fontFamily: 'DM Sans',
      width: 480,
      rotation: 0
    });
  }

  addShape(type: 'rectangle' | 'circle') {
    this.addElement({
      id: crypto.randomUUID(),
      type,
      x: 100,
      y: 180,
      width: 160,
      height: 90,
      fill: '#0d99ff',
      rotation: 0
    });
  }

  onQuickQrChange() {
    const val = this.quickQrLink.trim();
    const sel = this.selectedElement();
    if (sel && sel.type === 'qr' && val) {
      this.updateElement(sel.id, x => {
        x['value'] = val;
      }, false);
      clearTimeout(this.qrTimers.get(sel.id));
      const t = setTimeout(() => this.generateQr({ ...sel, value: val }), 150);
      this.qrTimers.set(sel.id, t);
      this.scheduleSave();
    }
  }

  async insertQuickQr(customValue?: string) {
    const val = (customValue !== undefined ? customValue : this.quickQrLink).trim() || 'https://ticketforge.local/verify';
    const d = this.design();
    if (!d) return;

    const color = '#1e293b';
    const qrBackground = '#ffffff';

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(val, {
        width: 280,
        margin: 1,
        color: { dark: color, light: qrBackground },
        errorCorrectionLevel: 'H'
      });
    } catch {
      qrDataUrl = '';
    }

    const el: DesignElement = {
      id: crypto.randomUUID(),
      type: 'qr',
      x: Math.max(30, Math.round(d.width - 200)),
      y: Math.max(30, Math.round(d.height - 200)),
      width: 140,
      height: 140,
      value: val,
      style: 'square',
      color,
      qrBackground,
      rotation: 0,
      qrDataUrl
    };
    this.addElement(el);
  }

  addQr() {
    this.insertQuickQr(this.quickQrLink.trim() || 'https://ticketforge.local/verify');
  }

  private addElement(el: DesignElement) {
    this.mutate(d => d.config.elements.push(el));
    this.selectedId.set(el.id);
  }

  removeElement(el: DesignElement) {
    this.mutate(d => {
      d.config.elements = d.config.elements.filter(x => x.id !== el.id);
    });
    if (this.selectedId() === el.id) this.selectedId.set('');
  }

  duplicateElement(el: DesignElement) {
    const clone = structuredClone(el);
    clone.id = crypto.randomUUID();
    clone.x = Math.round(el.x + 24);
    clone.y = Math.round(el.y + 24);
    if (clone.type === 'qr') {
      delete clone['qrDataUrl'];
    }
    this.addElement(clone);
    if (clone.type === 'qr') {
      this.generateQr(clone);
    }
  }

  bringForward(el: DesignElement) {
    this.mutate(d => {
      const idx = d.config.elements.findIndex(x => x.id === el.id);
      if (idx >= 0 && idx < d.config.elements.length - 1) {
        const item = d.config.elements.splice(idx, 1)[0];
        d.config.elements.push(item);
      }
    });
  }

  sendBackward(el: DesignElement) {
    this.mutate(d => {
      const idx = d.config.elements.findIndex(x => x.id === el.id);
      const minIdx = d.config.elements[0]?.type === 'background' ? 1 : 0;
      if (idx > minIdx) {
        const item = d.config.elements.splice(idx, 1)[0];
        d.config.elements.splice(minIdx, 0, item);
      }
    });
  }

  clearAllElements() {
    const d = this.design();
    if (!d) return;
    const count = d.config.elements.filter(x => x.type !== 'background').length;
    if (count === 0) return;
    if (confirm(`Hapus semua ${count} objek di atas kanvas? Latar belakang tiket akan tetap disimpan.`)) {
      this.mutate(cur => {
        cur.config.elements = cur.config.elements.filter(x => x.type === 'background');
      });
      this.selectedId.set('');
    }
  }

  magicRemoveBackground(el: DesignElement) {
    if (!el['src']) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample corners to detect background color
      const corners = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1]
      ];
      let bgR = 0, bgG = 0, bgB = 0;
      for (const [cx, cy] of corners) {
        const idx = (cy * canvas.width + cx) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      }
      bgR = Math.round(bgR / corners.length);
      bgG = Math.round(bgG / corners.length);
      bgB = Math.round(bgB / corners.length);

      const tolerance = 48; // color distance threshold
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        if (dist < tolerance) {
          data[i + 3] = 0; // set alpha to transparent!
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const transparentSrc = canvas.toDataURL('image/png');
      this.updateElement(el.id, x => {
        x['src'] = transparentSrc;
      });
    };
    img.src = String(el['src'] || '');
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isTyping = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
    if (isTyping) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const sel = this.selectedElement();
      if (sel) {
        e.preventDefault();
        this.removeElement(sel);
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      const sel = this.selectedElement();
      if (sel) {
        e.preventDefault();
        this.duplicateElement(sel);
      }
    }
  };

  textChange(e: Event, el: DesignElement) {
    const val = (e.target as HTMLTextAreaElement).value;
    this.updateElement(el.id, x => x['text'] = val);
  }

  textInlineChange(e: Event, el: DesignElement) {
    const val = (e.target as HTMLElement).innerText;
    this.updateElement(el.id, x => x['text'] = val);
  }

  textInlineInput(e: Event, el: DesignElement) {
    const val = (e.target as HTMLElement).innerText;
    this.updateElement(el.id, x => x['text'] = val, false);
    this.scheduleSave();
  }

  fontFamilyChange(e: Event, el: DesignElement) {
    const font = (e.target as HTMLSelectElement).value;
    this.updateElement(el.id, x => x['fontFamily'] = font);
  }

  fontSizeInput(e: Event, el: DesignElement) {
    const size = Math.max(8, Math.min(180, Number((e.target as HTMLInputElement).value)));
    this.updateElement(el.id, x => x['fontSize'] = size);
  }

  fontWeightChange(e: Event, el: DesignElement) {
    const weight = Number((e.target as HTMLSelectElement).value);
    this.updateElement(el.id, x => x['fontWeight'] = weight);
  }

  textColorChange(e: Event, el: DesignElement) {
    const color = (e.target as HTMLInputElement).value;
    this.updateElement(el.id, x => x['color'] = color);
  }

  textStyleChange(e: Event, el: DesignElement) {
    const style = (e.target as HTMLSelectElement).value;
    this.updateElement(el.id, x => x['textStyle'] = style);
  }

  letterSpacingChange(e: Event, el: DesignElement) {
    const spacing = Number((e.target as HTMLInputElement).value);
    this.updateElement(el.id, x => x['letterSpacing'] = spacing, false);
    this.scheduleSave();
  }

  setTextAlign(el: DesignElement, align: string) {
    this.updateElement(el.id, x => x['textAlign'] = align);
  }

  positionInput(e: Event, el: DesignElement, key: 'x' | 'y') {
    const val = Number((e.target as HTMLInputElement).value);
    this.updateElement(el.id, x => x[key] = val);
  }

  dimensionInput(e: Event, el: DesignElement, key: 'width' | 'height') {
    const val = Math.max(16, Number((e.target as HTMLInputElement).value));
    this.updateElement(el.id, x => x[key] = val);
  }

  rotationChange(e: Event, el: DesignElement) {
    const val = Number((e.target as HTMLInputElement).value);
    this.updateElement(el.id, x => x['rotation'] = val, false);
    this.scheduleSave();
  }

  qrValueChange(e: Event, el: DesignElement) {
    const val = (e.target as HTMLTextAreaElement).value;
    this.updateElement(el.id, x => {
      x['value'] = val;
    }, false);
    clearTimeout(this.qrTimers.get(el.id));
    const timer = setTimeout(() => this.generateQr({ ...el, value: val }), 150);
    this.qrTimers.set(el.id, timer);
    this.scheduleSave();
  }

  qrColorChange(e: Event, el: DesignElement) {
    const color = (e.target as HTMLInputElement).value;
    this.updateElement(el.id, x => {
      x['color'] = color;
    }, false);
    this.generateQr({ ...el, color });
    this.scheduleSave();
  }

  qrBgChange(e: Event, el: DesignElement) {
    const qrBackground = (e.target as HTMLInputElement).value;
    this.updateElement(el.id, x => {
      x['qrBackground'] = qrBackground;
    }, false);
    this.generateQr({ ...el, qrBackground });
    this.scheduleSave();
  }

  async generateQr(el: DesignElement) {
    const val = String(el['value'] || '').trim() || 'https://ticketforge.local/verify';
    const color = String(el['color'] || '#1e293b');
    const qrBackground = String(el['qrBackground'] || '#ffffff');
    try {
      const src = await QRCode.toDataURL(val, {
        width: 280,
        margin: 1,
        color: {
          dark: color,
          light: qrBackground
        },
        errorCorrectionLevel: 'H'
      });
      this.updateElement(el.id, x => {
        x['qrDataUrl'] = src;
      }, false);
    } catch {
      this.error.set('Link atau teks tidak dapat diubah menjadi QR Code.');
    }
  }

  elementMaskChange(e: Event, el: DesignElement) {
    const clip = (e.target as HTMLSelectElement).value;
    this.updateElement(el.id, x => x['clip'] = clip);
  }

  shapeFillChange(e: Event, el: DesignElement) {
    const fill = (e.target as HTMLInputElement).value;
    this.updateElement(el.id, x => x['fill'] = fill);
  }

  recommendStyle() {
    const brief = this.aiBrief.trim().toLowerCase();
    let selected = ticketStyles[0];
    if (/jazz|elegan|mewah|undang|vip/.test(brief)) selected = ticketStyles[1];
    else if (/festival|ceria|warna|party/.test(brief)) selected = ticketStyles[2];
    else if (/konser|malam|gelap|rock|neon/.test(brief)) selected = ticketStyles[3];
    else if (/retro|vintage|klasik|poster/.test(brief)) selected = ticketStyles[4];
    else if (/bisnis|formal|kantor|perusahaan/.test(brief)) selected = ticketStyles[5];

    this.aiStyle.set({
      name: selected.label,
      description: `Rekomendasi gaya berdasarkan brief "${this.aiBrief}". ${selected.description}`,
      background: selected.background,
      accent: selected.accent,
      ink: selected.ink,
      font: selected.font
    });
  }

  applyStyle() {
    const style = this.aiStyle();
    if (!style) return;
    this.background.set(style.background);
    this.mutate(d => {
      d.config.canvas.background = style.background;
      const bg = d.config.elements.find(x => x.type === 'background');
      if (bg) bg['fill'] = style.background;
      for (const el of d.config.elements) {
        if (el.type === 'text') {
          el['fontFamily'] = style.font;
          el['color'] = style.ink;
        }
        if (el.type === 'rectangle' || el.type === 'circle') {
          el['fill'] = style.accent;
        }
      }
    });
  }

  generateAiDraft() {
    const d = this.design();
    if (!d) return;
    const prompt = this.aiBrief.trim() || `Improve this ${d.type} ticket design with professional typography and clear hierarchy.`;
    this.aiBusyState.set(true);
    this.error.set('');

    this.api.generate({
      prompt,
      type: d.type,
      width: d.width,
      height: d.height,
      unit: d.unit,
      designId: d.id
    }).subscribe({
      next: r => {
        this.aiBusyState.set(false);
        this.design.update(cur => cur ? { ...cur, config: r.data.config } : cur);
        this.background.set(r.data.config.canvas.background || '#f4f1e8');
        this.backgroundImage.set(String(r.data.config.canvas.backgroundImage || ''));
        this.selectedId.set('');
        this.scheduleSave();
        if (!r.data.aiAvailable) {
          this.error.set(r.data.warning || 'Backend memakai template dasar lokal (Ollama tidak aktif).');
        } else if (r.data.warning) {
          this.error.set(r.data.warning);
        }
      },
      error: e => {
        this.aiBusyState.set(false);
        this.error.set(messageOf(e, 'Generate AI gagal. Periksa koneksi backend dan login.'));
      }
    });
  }

  printPdf() {
    if (!this.design()) return;
    document.body.classList.add('printing-ticket');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-ticket'), 700);
  }

  startDrag(e: PointerEvent, el: DesignElement) {
    if ((e.target as HTMLElement).isContentEditable) return;
    e.preventDefault();
    e.stopPropagation();
    this.selectedId.set(el.id);
    this.beginDrag(e, el, 'move');
  }

  startResize(e: PointerEvent, el: DesignElement) {
    e.preventDefault();
    e.stopPropagation();
    this.selectedId.set(el.id);
    this.beginDrag(e, el, 'resize');
  }

  startRotate(e: PointerEvent, el: DesignElement) {
    e.preventDefault();
    e.stopPropagation();
    this.selectedId.set(el.id);
    this.beginDrag(e, el, 'rotate');
  }

  private beginDrag(e: PointerEvent, el: DesignElement, kind: 'move' | 'resize' | 'rotate') {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.drag = {
      id: el.id,
      kind,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origWidth: this.number(el['width'], 120),
      origHeight: this.number(el['height'], 80),
      origRotation: this.number(el['rotation'], 0),
      centerX: r.left + r.width / 2,
      centerY: r.top + r.height / 2
    };
  }

  private moveDrag = (e: PointerEvent) => {
    const g = this.drag;
    if (!g) return;
    const s = this.canvasScale();

    if (g.kind === 'move') {
      const dx = (e.clientX - g.startX) / s;
      const dy = (e.clientY - g.startY) / s;
      this.updateElement(g.id, x => {
        x.x = Math.max(0, Math.round(g.origX + dx));
        x.y = Math.max(0, Math.round(g.origY + dy));
      }, false);
    } else if (g.kind === 'resize') {
      const deltaX = (e.clientX - g.startX) / s;
      const deltaY = (e.clientY - g.startY) / s;
      const newW = Math.max(20, Math.min(800, Math.round(g.origWidth + deltaX)));
      const newH = Math.max(20, Math.min(800, Math.round(g.origHeight + deltaY)));
      this.updateElement(g.id, x => {
        x['width'] = newW;
        if (x.type === 'qr') x['height'] = newW;
        else x['height'] = newH;
      }, false);
    } else if (g.kind === 'rotate') {
      const angle = Math.atan2(e.clientY - g.centerY, e.clientX - g.centerX) * (180 / Math.PI);
      this.updateElement(g.id, x => {
        x['rotation'] = Math.round(angle + 90);
      }, false);
    }
  };

  private endDrag = () => {
    if (this.drag) {
      this.drag = null;
      this.scheduleSave();
    }
  };

  private mutate(fn: (d: Design) => void, save = true) {
    this.design.update(cur => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      fn(d);
      return d;
    });
    if (save) this.scheduleSave();
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saving.set(true);
    this.saveTimer = setTimeout(() => {
      const d = this.design();
      if (!d) return;

      const payloadConfig = structuredClone(d.config);
      for (const el of payloadConfig.elements) {
        delete el['qrDataUrl'];
      }

      this.api.update(d.id, {
        name: d.name,
        type: d.type,
        width: d.width,
        height: d.height,
        unit: d.unit,
        config: payloadConfig
      }).subscribe({
        next: r => {
          const qrMap = new Map(this.design()?.config.elements.map(e => [e.id, e['qrDataUrl']]));
          const updated = r.data;
          for (const el of updated.config?.elements || []) {
            if (el.type === 'qr') {
              el['qrDataUrl'] = qrMap.get(el.id) || '';
              if (!el['qrDataUrl']) this.generateQr(el);
            }
          }
          this.design.set(updated);
          this.saving.set(false);
          this.error.set('');
        },
        error: e => {
          this.saving.set(false);
          this.error.set(messageOf(e, 'Perubahan belum tersimpan. Coba lagi.'));
        }
      });
    }, 600);
  }

  formatTicketNumber(prefix: string, num: number, pad: number, suffix: string): string {
    const padStr = pad > 0 ? String(num).padStart(pad, '0') : String(num);
    return `${prefix || ''}${padStr}${suffix || ''}`;
  }

  previewTicketNumbers(): string[] {
    const count = Math.min(this.printCount(), 5);
    const prefix = this.printPrefix();
    const start = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      list.push(this.formatTicketNumber(prefix, start + i, pad, suffix));
    }
    return list;
  }

  lastTicketNumber(): string {
    const count = this.printCount();
    const prefix = this.printPrefix();
    const start = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();
    return this.formatTicketNumber(prefix, start + count - 1, pad, suffix);
  }

  onPrintCountChange(e: Event) {
    const raw = Number((e.target as HTMLInputElement).value) || 1;
    const clamped = Math.max(1, Math.min(1000, Math.round(raw)));
    this.printCount.set(clamped);
  }

  openPrintModal() {
    const ticketEl = this.design()?.config.elements.find(x => x['isTicketNo'] || x['isTicketNumber']);
    if (ticketEl) {
      if (ticketEl['ticketPrefix'] !== undefined) this.printPrefix.set(String(ticketEl['ticketPrefix']));
      if (ticketEl['ticketStart'] !== undefined) this.printStartNo.set(Number(ticketEl['ticketStart']) || 1);
      if (ticketEl['ticketPad'] !== undefined) this.printPad.set(Number(ticketEl['ticketPad']) || 4);
      if (ticketEl['ticketSuffix'] !== undefined) this.printSuffix.set(String(ticketEl['ticketSuffix']));
    }
    this.printModalOpen.set(true);
  }

  closePrintModal() {
    this.printModalOpen.set(false);
  }

  addTicketNumber() {
    const d = this.design();
    const width = d ? d.width : 1000;
    const height = d ? d.height : 600;
    const defaultPrefix = 'TCK-';
    const defaultStart = 1;
    const defaultPad = 4;
    const defaultText = this.formatTicketNumber(defaultPrefix, defaultStart, defaultPad, '');

    const newEl: DesignElement = {
      id: crypto.randomUUID(),
      type: 'text',
      x: Math.max(40, width - 260),
      y: 40,
      text: defaultText,
      fontSize: 22,
      fontWeight: 700,
      color: '#0d99ff',
      fontFamily: 'Space Mono',
      width: 220,
      rotation: 0,
      isTicketNo: true,
      ticketPrefix: defaultPrefix,
      ticketStart: defaultStart,
      ticketPad: defaultPad,
      ticketSuffix: '',
      ticketStyle: 'pill',
      badgeBg: '#ffffff',
      badgeBorder: '#0d99ff',
      badgeBorderWidth: 1.5,
      badgeRadius: 999
    };

    this.mutate(cur => cur.config.elements.push(newEl));
    this.selectedId.set(newEl.id);
  }

  toggleTicketNo(e: Event, el: DesignElement) {
    const isChecked = (e.target as HTMLInputElement).checked;
    this.updateElement(el.id, x => {
      x['isTicketNo'] = isChecked;
      if (isChecked) {
        if (!x['ticketPrefix']) x['ticketPrefix'] = 'TCK-';
        if (!x['ticketStart']) x['ticketStart'] = 1;
        if (x['ticketPad'] === undefined) x['ticketPad'] = 4;
        if (!x['ticketSuffix']) x['ticketSuffix'] = '';
        if (!x['ticketStyle']) x['ticketStyle'] = 'pill';
        if (!x['badgeBg']) x['badgeBg'] = '#ffffff';
        if (!x['badgeBorder']) x['badgeBorder'] = '#0d99ff';
        if (x['badgeBorderWidth'] === undefined) x['badgeBorderWidth'] = 1.5;
        if (x['badgeRadius'] === undefined) x['badgeRadius'] = 999;
        x['text'] = this.formatTicketNumber(
          String(x['ticketPrefix']),
          Number(x['ticketStart']),
          Number(x['ticketPad']),
          String(x['ticketSuffix'])
        );
      }
    });
  }

  ticketBadgeStyle(el: DesignElement | null | undefined): Record<string, string> {
    if (!el || !el['isTicketNo'] || !el['ticketStyle'] || el['ticketStyle'] === 'plain') {
      return {};
    }

    const s = String(el['ticketStyle']);
    const bg = String(el['badgeBg'] || '#ffffff');
    const border = String(el['badgeBorder'] || '#0d99ff');
    const borderWidth = el['badgeBorderWidth'] !== undefined ? `${el['badgeBorderWidth']}px` : '1.5px';
    const radius = el['badgeRadius'] !== undefined ? `${el['badgeRadius']}px` : (s === 'pill' ? '999px' : '6px');

    const base: Record<string, string> = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      padding: '4px 14px',
      borderRadius: radius,
      backgroundColor: bg
    };

    if (s === 'pill') {
      return {
        ...base,
        border: `${borderWidth} solid ${border}`,
        borderRadius: radius === '0px' ? '999px' : radius,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      };
    }
    if (s === 'box') {
      return {
        ...base,
        border: `${borderWidth} solid ${border}`,
        boxShadow: '2px 2px 0px rgba(15,23,42,0.85)'
      };
    }
    if (s === 'dashed') {
      return {
        ...base,
        border: `${borderWidth} dashed ${border}`,
        boxShadow: 'none'
      };
    }
    if (s === 'neon') {
      return {
        ...base,
        border: `${borderWidth} solid ${border}`,
        boxShadow: `0 0 10px ${border}66, inset 0 0 6px ${border}33`,
        textShadow: `0 0 8px ${el['color'] || border}`
      };
    }
    if (s === 'gold') {
      return {
        ...base,
        border: `${borderWidth} solid ${border}`,
        boxShadow: '0 2px 10px rgba(234, 179, 8, 0.25)',
        letterSpacing: '1px'
      };
    }
    if (s === 'invert') {
      return {
        ...base,
        border: `${borderWidth} solid ${border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      };
    }
    if (s === 'stamp') {
      return {
        ...base,
        border: `3px double ${border}`,
        transform: 'rotate(-2deg)',
        letterSpacing: '1px'
      };
    }

    return {
      ...base,
      border: `${borderWidth} solid ${border}`
    };
  }

  selectTicketStyle(el: DesignElement, styleItem: typeof ticketNoStyles[0]) {
    this.updateElement(el.id, x => {
      x['ticketStyle'] = styleItem.id;
      if (styleItem.id === 'plain') {
        x['badgeBg'] = 'transparent';
        x['badgeBorder'] = '';
        x['badgeBorderWidth'] = 0;
        x['badgeRadius'] = 0;
      } else {
        x['badgeBg'] = styleItem.bg;
        x['badgeBorder'] = styleItem.border;
        x['badgeRadius'] = styleItem.radius;
        x['badgeBorderWidth'] = styleItem.borderWidth;
        if (styleItem.color) {
          x['color'] = styleItem.color;
        }
      }
    });
  }

  updateTicketBadgeField(el: DesignElement, key: string, value: unknown) {
    this.updateElement(el.id, x => {
      x[key] = value;
    });
  }

  getTicketNoElement(): DesignElement | null {
    return this.design()?.config.elements.find(x => x['isTicketNo']) || null;
  }

  updateTicketNoFormat(e: Event, el: DesignElement, key: string) {
    const input = e.target as HTMLInputElement;
    const val = input.value;
    this.updateElement(el.id, x => {
      if (key === 'ticketStart' || key === 'ticketPad') {
        x[key] = Number(val) || 0;
      } else {
        x[key] = val;
      }
      x['text'] = this.formatTicketNumber(
        String(x['ticketPrefix'] || ''),
        Number(x['ticketStart']) || 1,
        Number(x['ticketPad']) || 0,
        String(x['ticketSuffix'] || '')
      );
    });
  }

  printScale(): number {
    return 1;
  }

  async executeBatchPrint() {
    const d = this.design();
    if (!d) return;

    this.printBusy.set(true);
    const count = this.printCount();
    const prefix = this.printPrefix();
    const start = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();
    const syncQr = this.printSyncQr();

    const pages: Array<{ ticketNo: string; qrDataUrl?: string }> = [];

    const qrEl = d.config.elements.find(x => x.type === 'qr');
    const qrColor = String(qrEl?.['color'] || '#1e293b');
    const qrBg = String(qrEl?.['qrBackground'] || '#ffffff');

    for (let i = 0; i < count; i++) {
      const ticketNo = this.formatTicketNumber(prefix, start + i, pad, suffix);
      let pageQrUrl = '';

      if (syncQr) {
        try {
          pageQrUrl = await QRCode.toDataURL(ticketNo, {
            width: 280,
            margin: 1,
            color: { dark: qrColor, light: qrBg },
            errorCorrectionLevel: 'H'
          });
        } catch {
          pageQrUrl = '';
        }
      }

      pages.push({ ticketNo, qrDataUrl: pageQrUrl });
    }

    this.printPages.set(pages);
    this.printBusy.set(false);
    this.printModalOpen.set(false);

    setTimeout(() => {
      document.body.classList.add('printing-ticket');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-ticket');
        this.printPages.set([]);
      }, 1000);
    }, 400);
  }

  deleteDesign() {
    const d = this.design();
    if (d && confirm(`Hapus desain "${d.name}"?`)) {
      this.api.delete(d.id).subscribe({
        next: () => this.router.navigateByUrl('/app/designs'),
        error: e => this.error.set(messageOf(e, 'Gagal menghapus desain.'))
      });
    }
  }
}
