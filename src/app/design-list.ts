import { Component, inject, signal, computed, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { AuthApi, messageOf } from './core';
import { Design, DesignConfig, DesignElement, DesignType, DesignsApi } from './designs-api';
import { kinds, ticketStyles } from './design-options';
import { Mark } from './design-shared';


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
          <span>© 2026 TICKETFORGE AI</span>
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

