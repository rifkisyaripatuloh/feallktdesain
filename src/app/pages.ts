import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApi, messageOf } from './core';
import { Design, DesignsApi } from './designs-api';

const Mark = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M9 8h14c7 0 11 4 11 10 0 4-2 7-6 8l7 7H23l-6-7h-1v7H9V8Zm7 7v5h7c2 0 3-1 3-3s-1-2-3-2h-7Z" fill="currentColor"/><circle cx="9" cy="33" r="2" fill="#E1F16B"/></svg>`;

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-layout">
      <section class="auth-story">
        <a class="brand" routerLink="/login">
          <span class="brand-mark" [innerHTML]="brandMark"></span>
          ticketforge<span class="brand-ai">AI</span>
        </a>
        <div class="story-main">
          <div class="eyebrow"><i></i> TIKET, TANPA RIBUT</div>
          <h1>Hal seru<br>dimulai <em>di sini.</em></h1>
          <p>Semua yang kamu butuhkan untuk membuat momen jadi lebih berarti. Satu tempat, beres.</p>
          <div class="story-art">
            <div class="ticket-card">
              <div class="ticket-top">
                <span>ADMIT ONE</span>
                <span>TF—2025</span>
              </div>
              <div class="ticket-big">GOOD<br>THINGS<br>HAPPEN<span class="ticket-spark">✳</span></div>
              <div class="ticket-bottom">
                <span>MAKE IT A MOMENT</span>
                <span>✦ ✦ ✦</span>
              </div>
            </div>
            <div class="float-tag">✦ &nbsp; waktunya bikin sesuatu</div>
            <div class="orbit orbit-one"></div>
            <div class="orbit orbit-two"></div>
            <span class="art-dot"></span>
          </div>
        </div>
        <div class="story-foot">
          <span>BUAT MOMEN YANG BERARTI.</span>
          <span>01 — 03</span>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-box">
          <div class="auth-mobile-brand">
            <span class="brand-mark" [innerHTML]="brandMark"></span>ticketforge <b>AI</b>
          </div>
          <div class="form-heading">
            <div class="eyebrow">SENANG KETEMU LAGI</div>
            <h2>Masuk ke ruangmu.</h2>
            <p>Masukkan detail akun untuk langsung membuka desain tiket Anda.</p>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="email">Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉</span>
              <input id="email" type="email" formControlName="email" placeholder="nama@email.com" autocomplete="email" [attr.aria-invalid]="email.invalid && email.touched">
            </div>
            @if (email.invalid && email.touched) {
              <small class="field-error">Masukkan alamat email yang valid.</small>
            }

            <label for="password" class="password-label">Kata sandi <a routerLink="/register">Buat akun</a></label>
            <div class="input-wrap">
              <span class="input-icon">◈</span>
              <input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" placeholder="Masukkan kata sandi" autocomplete="current-password">
              <button type="button" class="peek" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'">
                {{ showPassword() ? '◉' : '◎' }}
              </button>
            </div>

            @if (error()) {
              <div class="form-alert" role="alert">{{ error() }}</div>
            }

            <button class="primary-btn" type="submit" [disabled]="form.invalid || busy()">
              <span>{{ busy() ? 'Sedang masuk…' : 'Masuk ke Desain Tiket' }}</span>
              <span class="btn-arrow">↗</span>
            </button>
          </form>

          <div class="auth-switch">Belum punya akun? <a routerLink="/register">Daftar gratis <span>→</span></a></div>
          <div class="fine-print">Dengan melanjutkan, kamu menyetujui ketentuan layanan dan kebijakan privasi.</div>
        </div>
        <div class="panel-footer">
          <span>© 2025 TICKETFORGE AI</span>
          <span>DIBUAT UNTUK MOMEN TERBAIKMU <b>✳</b></span>
        </div>
      </section>
    </main>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApi);
  private router = inject(Router);

  brandMark = Mark;
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  busy = signal(false);
  error = signal('');
  showPassword = signal(false);

  get email() {
    return this.form.controls.email;
  }

  submit() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    this.api.login(this.email.value, this.form.controls.password.value).subscribe({
      next: () => this.router.navigateByUrl('/app/designs'),
      error: e => {
        this.error.set(messageOf(e, 'Tidak dapat terhubung ke layanan. Periksa koneksi dan coba lagi.'));
        this.busy.set(false);
      }
    });
  }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-layout">
      <section class="auth-story">
        <a class="brand" routerLink="/login">
          <span class="brand-mark" [innerHTML]="brandMark"></span>
          ticketforge<span class="brand-ai">AI</span>
        </a>
        <div class="story-main">
          <div class="eyebrow"><i></i> MOMEN BESAR DIMULAI KECIL</div>
          <h1>Mulai sesuatu<br>yang <em>seru.</em></h1>
          <p>Bikin akunmu dan bersiap merayakan hal-hal yang layak dikenang.</p>
          <div class="story-art">
            <div class="ticket-card">
              <div class="ticket-top">
                <span>ADMIT ONE</span>
                <span>TF—2025</span>
              </div>
              <div class="ticket-big">YOUR<br>NEXT<br>CHAPTER<span class="ticket-spark">✳</span></div>
              <div class="ticket-bottom">
                <span>MAKE IT A MOMENT</span>
                <span>✦ ✦ ✦</span>
              </div>
            </div>
            <div class="float-tag">✦ &nbsp; semuanya berawal dari sini</div>
            <div class="orbit orbit-one"></div>
            <div class="orbit orbit-two"></div>
            <span class="art-dot"></span>
          </div>
        </div>
        <div class="story-foot">
          <span>BUAT MOMEN YANG BERARTI.</span>
          <span>02 — 03</span>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-box">
          <div class="auth-mobile-brand">
            <span class="brand-mark" [innerHTML]="brandMark"></span>ticketforge <b>AI</b>
          </div>
          <div class="form-heading">
            <div class="eyebrow">AKUN BARU, CERITA BARU</div>
            <h2>Yuk, kenalan dulu.</h2>
            <p>Hanya butuh beberapa detail untuk memulai.</p>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="name">Nama lengkap</label>
            <div class="input-wrap">
              <span class="input-icon">◉</span>
              <input id="name" formControlName="name" placeholder="Nama kamu" autocomplete="name" [attr.aria-invalid]="name.invalid && name.touched">
            </div>
            @if (name.invalid && name.touched) {
              <small class="field-error">Nama harus terdiri dari 2–120 karakter.</small>
            }

            <label for="email">Email</label>
            <div class="input-wrap">
              <span class="input-icon">✉</span>
              <input id="email" type="email" formControlName="email" placeholder="nama@email.com" autocomplete="email">
            </div>
            @if (email.invalid && email.touched) {
              <small class="field-error">Masukkan email yang valid.</small>
            }

            <label for="password">Kata sandi</label>
            <div class="input-wrap">
              <span class="input-icon">◈</span>
              <input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" placeholder="Minimal 12 karakter" autocomplete="new-password">
              <button class="peek" type="button" (click)="showPassword.set(!showPassword())">
                {{ showPassword() ? '◉' : '◎' }}
              </button>
            </div>
            @if (password.invalid && password.touched) {
              <small class="field-error">Kata sandi harus 12–128 karakter.</small>
            }

            <label for="confirm">Konfirmasi kata sandi</label>
            <div class="input-wrap">
              <span class="input-icon">◈</span>
              <input id="confirm" [type]="showPassword() ? 'text' : 'password'" formControlName="confirm" placeholder="Ketik ulang kata sandi" autocomplete="new-password">
            </div>
            @if (mismatch()) {
              <small class="field-error">Kata sandi belum sama.</small>
            }

            @if (error()) {
              <div class="form-alert" role="alert">{{ error() }}</div>
            }

            <button class="primary-btn" type="submit" [disabled]="form.invalid || mismatch() || busy()">
              <span>{{ busy() ? 'Membuat akun…' : 'Buat akun gratis' }}</span>
              <span class="btn-arrow">↗</span>
            </button>
          </form>

          <div class="auth-switch">Sudah punya akun? <a routerLink="/login">Masuk di sini <span>→</span></a></div>
        </div>
        <div class="panel-footer">
          <span>© 2025 TICKETFORGE AI</span>
          <span>DIBUAT UNTUK MOMEN TERBAIKMU <b>✳</b></span>
        </div>
      </section>
    </main>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApi);
  private router = inject(Router);

  brandMark = Mark;
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirm: ['', [Validators.required]]
  });
  busy = signal(false);
  error = signal('');
  showPassword = signal(false);

  get name() {
    return this.form.controls.name;
  }
  get email() {
    return this.form.controls.email;
  }
  get password() {
    return this.form.controls.password;
  }

  mismatch() {
    return this.form.controls.confirm.touched && this.password.value !== this.form.controls.confirm.value;
  }

  submit() {
    if (this.form.invalid || this.mismatch()) return;
    this.busy.set(true);
    this.api.register(this.name.value, this.email.value, this.password.value).subscribe({
      next: () => this.api.login(this.email.value, this.password.value).subscribe({
        next: () => this.router.navigateByUrl('/app/designs'),
        error: () => {
          this.busy.set(false);
          this.error.set('Akun berhasil dibuat. Silakan masuk dengan akunmu.');
        }
      }),
      error: e => {
        this.busy.set(false);
        this.error.set(messageOf(e, 'Pendaftaran gagal. Periksa koneksi lalu coba lagi.'));
      }
    });
  }
}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/app">
          <span class="brand-mark" [innerHTML]="brandMark"></span>
          ticketforge<span class="brand-ai">AI</span>
        </a>
        <div class="side-caption">RUANG KERJAMU</div>
        <a class="nav-link" routerLink="/app"><span>▦</span> Ringkasan</a>
        <a class="nav-link active" routerLink="/app/designs"><span>▧</span> Desain tiket <b>↗</b></a>
        <a class="nav-link" routerLink="/app/profile"><span>◉</span> Profil & keamanan</a>
        <div class="side-caption lower">SEGERA HADIR</div>
        <div class="nav-link disabled"><span>✳</span> Organisasi <i>soon</i></div>
        <div class="nav-link disabled"><span>⌗</span> Check-in <i>soon</i></div>
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

      <main class="dashboard">
        <header class="dash-header">
          <span>RUANG KERJA <b>/</b> RINGKASAN</span>
          <a routerLink="/app/designs" class="header-link">Studio Desain Tiket <span>↗</span></a>
        </header>

        <section class="welcome">
          <div>
            <div class="eyebrow"><i></i> SEMUANYA SIAP DIMULAI</div>
            <h1>Hai, {{ firstName() }}<span class="wave">✳</span></h1>
            <p>Selamat datang di ruang kreatifmu. Akses dan kelola desain tiket yang sudah dibuat.</p>
          </div>
          <div class="welcome-actions">
            <a routerLink="/app/designs" class="primary-btn">
              <span>✦ Buka Semua Desain Tiket</span>
              <span class="btn-arrow">↗</span>
            </a>
          </div>
        </section>

        <!-- Daftar Desain Tiket yang Sudah Dibuat -->
        <section class="recent-designs-section">
          <div class="section-title">
            <div>
              <div class="eyebrow">KARYA ANDA</div>
              <h2>Desain Tiket Yang Sudah Dibuat</h2>
            </div>
            <a routerLink="/app/designs" class="outline-btn">Lihat Semua Desain ({{ designs().length }}) ↗</a>
          </div>

          @if (loadingDesigns()) {
            <div class="design-loading">
              <span class="loading-orbit">✳</span>
              <p>Memuat daftar desain tiket Anda…</p>
            </div>
          } @else if (designs().length > 0) {
            <div class="design-grid">
              @for (d of designs(); track d.id) {
                <article class="design-card">
                  <button class="design-preview" (click)="openDesign(d)">
                    <div class="mini-ticket" [style.background]="d.config.canvas.background || '#f4f1e8'">
                      <div class="mini-stamp">{{ d.type }}</div>
                      <div class="mini-title">{{ d.name }}</div>
                      <div class="mini-details">
                        <span>{{ d.width }} × {{ d.height }} {{ d.unit || 'px' }}</span>
                        <span>✳ &nbsp; ▦</span>
                      </div>
                    </div>
                    <span class="preview-edit">BUKA DI EDITOR ↗</span>
                  </button>
                  <div class="design-card-info">
                    <div>
                      <h3>{{ d.name }}</h3>
                      <p>{{ d.type }} · {{ d.width }} × {{ d.height }} px</p>
                    </div>
                    <a [routerLink]="['/app/designs', d.id, 'edit']" class="more-btn" title="Buka di editor kanvas">↗</a>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="empty-dash-box">
              <p>Belum ada tiket yang dibuat. Mulai buat rancangan tiket pertamamu sekarang!</p>
              <a routerLink="/app/designs" class="primary-btn">
                <span>＋ Buat Desain Tiket Baru</span>
                <span class="btn-arrow">↗</span>
              </a>
            </div>
          }
        </section>

        <section class="hero-card mt-4">
          <div class="hero-copy">
            <div class="eyebrow">STUDIO DESAIN TIKET FIGMA & AI</div>
            <h2>Desain tiket presisi,<br>estetik & <em>siap cetak.</em></h2>
            <p>Rancang tiket acara, kartu anggota, atur nomor tiket otomatis, buat QR code, hapus objek ala Canva, hingga cetak lembaran PDF.</p>
            <div class="mt-3">
              <a routerLink="/app/designs" class="primary-btn">
                <span>✦ Masuk ke Studio Desain</span>
                <span class="btn-arrow">↗</span>
              </a>
            </div>
          </div>
          <div class="hero-art">
            <div class="hero-ticket">
              <div class="ht-mini">TICKETFORGE <span>✳</span></div>
              <div class="ht-title">MAKE<br>IT A<br>MOMENT</div>
              <div class="ht-foot">ADMIT ONE &nbsp; · &nbsp; ANYWHERE</div>
            </div>
            <span class="hero-star">✳</span>
            <span class="hero-orbit"></span>
          </div>
        </section>

        <div class="section-title mt-4">
          <div>
            <div class="eyebrow">FITUR SISTEM</div>
            <h2>Layanan & Kemampuan Platform</h2>
          </div>
        </div>

        <section class="feature-grid">
          <a routerLink="/app/designs" class="feature-card feature-card-active">
            <div class="feature-icon icon-lavender">▧</div>
            <div class="feature-meta">01 — KREATIVITAS (AKTIF)</div>
            <h3>Studio Desain Tiket</h3>
            <p>Desain tiket interaktif Figma style, generator no tiket, hapus background, AI assistant, dan batch PDF.</p>
            <span class="feature-badge-live">AKTIF · BUKA SEKARANG ↗</span>
          </a>
          <article class="feature-card">
            <div class="feature-icon icon-lime">✳</div>
            <div class="feature-meta">02 — PERENCANAAN</div>
            <h3>Organisasi acara</h3>
            <p>Rencanakan hal-hal besar bersama tim.</p>
            <span class="feature-soon">SEGERA TERSEDIA</span>
          </article>
          <article class="feature-card">
            <div class="feature-icon icon-peach">⌗</div>
            <div class="feature-meta">03 — HARI-H</div>
            <h3>Check-in pintar</h3>
            <p>Masuk acara dengan scan QR tanpa antre panjang.</p>
            <span class="feature-soon">SEGERA TERSEDIA</span>
          </article>
        </section>

        <footer class="dash-foot">
          <span>© 2025 TICKETFORGE AI</span>
          <span>BUAT MOMEN YANG BERARTI <b>✳</b></span>
        </footer>
      </main>
    </div>
  `
})
export class DashboardComponent {
  auth = inject(AuthApi);
  private api = inject(DesignsApi);
  private router = inject(Router);

  brandMark = Mark;
  designs = signal<Design[]>([]);
  loadingDesigns = signal(true);

  constructor() {
    this.api.list().subscribe({
      next: r => {
        this.designs.set(Array.isArray(r.data) ? r.data : []);
        this.loadingDesigns.set(false);
      },
      error: () => this.loadingDesigns.set(false)
    });
  }

  firstName() {
    return this.auth.user()?.name.split(' ')[0] || 'teman';
  }

  initials() {
    return this.auth.user()?.name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'TF';
  }

  openDesign(d: Design) {
    this.router.navigate(['/app/designs', d.id, 'edit']);
  }

  logout() {
    this.auth.logout().subscribe();
  }
}

@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/app">
          <span class="brand-mark" [innerHTML]="brandMark"></span>
          ticketforge<span class="brand-ai">AI</span>
        </a>
        <div class="side-caption">RUANG KERJAMU</div>
        <a class="nav-link" routerLink="/app"><span>▦</span> Ringkasan</a>
        <a class="nav-link" routerLink="/app/designs"><span>▧</span> Desain tiket <b>↗</b></a>
        <a class="nav-link active" routerLink="/app/profile"><span>◉</span> Profil & keamanan <b>↗</b></a>
        <div class="side-caption lower">SEGERA HADIR</div>
        <div class="nav-link disabled"><span>✳</span> Organisasi <i>soon</i></div>
        <div class="nav-link disabled"><span>⌗</span> Check-in <i>soon</i></div>
        <div class="sidebar-bottom">
          <div class="user-mini">
            <div class="avatar">{{ initials() }}</div>
            <div>
              <strong>{{ api.user()?.name }}</strong>
              <small>{{ api.user()?.email }}</small>
            </div>
            <button aria-label="Keluar" (click)="logout()">↗</button>
          </div>
        </div>
      </aside>

      <main class="dashboard profile-page">
        <header class="dash-header">
          <span>RUANG KERJA <b>/</b> PROFIL & KEAMANAN</span>
          <a routerLink="/app/designs">← Kembali ke Desain Tiket</a>
        </header>

        <div class="profile-heading">
          <div class="eyebrow">AKUN DAN IDENTITAS</div>
          <h1>Ruang pribadimu.</h1>
          <p>Kelola detail akun dan pastikan semuanya tetap aman.</p>
        </div>

        <section class="profile-card">
          <div class="profile-card-head">
            <div class="profile-avatar">{{ initials() }}</div>
            <div>
              <h2>Informasi profil</h2>
              <p>Detail dasar yang terhubung dengan akunmu.</p>
            </div>
          </div>
          <form [formGroup]="profile" (ngSubmit)="saveName()">
            <label>Nama lengkap</label>
            <input class="profile-input" formControlName="name" autocomplete="name">
            <label>Email</label>
            <input class="profile-input readonly" [value]="api.user()?.email || ''" readonly>
            <label>Peran</label>
            <input class="profile-input readonly" [value]="api.user()?.role || ''" readonly>
            @if (profileMessage()) {
              <div class="success-note">{{ profileMessage() }}</div>
            }
            @if (profileError()) {
              <div class="form-alert">{{ profileError() }}</div>
            }
            <button class="primary-btn profile-submit" [disabled]="profile.invalid || saving()">
              {{ saving() ? 'Menyimpan…' : 'Simpan perubahan' }}
              <span class="btn-arrow">↗</span>
            </button>
          </form>
        </section>

        <section class="profile-card security-card">
          <div class="profile-card-head">
            <div class="security-icon">⌑</div>
            <div>
              <h2>Ganti kata sandi</h2>
              <p>Gunakan minimal 12 karakter untuk menjaga akunmu.</p>
            </div>
          </div>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <label>Kata sandi saat ini</label>
            <input class="profile-input" type="password" formControlName="current" autocomplete="current-password">
            <label>Kata sandi baru</label>
            <input class="profile-input" type="password" formControlName="next" autocomplete="new-password">
            @if (passwordMessage()) {
              <div class="success-note">{{ passwordMessage() }}</div>
            }
            @if (passwordError()) {
              <div class="form-alert">{{ passwordError() }}</div>
            }
            <div class="security-notice">ⓘ &nbsp; Setelah berhasil, semua sesi akan dicabut. Kamu perlu masuk kembali dengan kata sandi baru.</div>
            <button class="outline-btn" [disabled]="passwordForm.invalid || savingPassword()">
              {{ savingPassword() ? 'Memperbarui…' : 'Perbarui kata sandi' }}
              <span>↗</span>
            </button>
          </form>
        </section>

        <footer class="dash-foot">
          <span>© 2025 TICKETFORGE AI</span>
          <span>JAGA AKUNMU, JAGA MOMENMU <b>✳</b></span>
        </footer>
      </main>
    </div>
  `
})
export class ProfileComponent {
  api = inject(AuthApi);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  brandMark = Mark;
  profile = this.fb.nonNullable.group({
    name: [this.api.user()?.name || '', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]]
  });
  passwordForm = this.fb.nonNullable.group({
    current: ['', [Validators.required]],
    next: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]]
  });
  saving = signal(false);
  savingPassword = signal(false);
  profileMessage = signal('');
  profileError = signal('');
  passwordMessage = signal('');
  passwordError = signal('');

  initials() {
    return this.api.user()?.name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'TF';
  }

  saveName() {
    if (this.profile.invalid) return;
    this.saving.set(true);
    this.profileMessage.set('');
    this.api.updateName(this.profile.controls.name.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.profileMessage.set('Nama profil berhasil diperbarui.');
      },
      error: e => {
        this.saving.set(false);
        this.profileError.set(messageOf(e, 'Gagal menyimpan profil.'));
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    this.savingPassword.set(true);
    this.passwordError.set('');
    this.passwordMessage.set('');
    this.api.changePassword(this.passwordForm.controls.current.value, this.passwordForm.controls.next.value).subscribe({
      next: () => {
        this.api.user.set(null);
        this.passwordMessage.set('Kata sandi diperbarui. Mengarahkanmu ke halaman masuk…');
        setTimeout(() => this.router.navigateByUrl('/login'), 1800);
      },
      error: e => {
        this.savingPassword.set(false);
        this.passwordError.set(messageOf(e, 'Gagal memperbarui kata sandi.'));
      }
    });
  }

  logout() {
    this.api.logout().subscribe();
  }
}
