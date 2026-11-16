import { Component, inject, signal, computed, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { AuthApi, messageOf } from './core';
import { Design, DesignConfig, DesignElement, DesignInput, DesignType, DesignsApi } from './designs-api';
import { AiThemeRecommendation, aiRecommendations, canvasPresets, fontOptions, kinds, ticketNoStyles, ticketStyles } from './design-options';
import { Mark } from './design-shared';


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
            
            <div class="topbar-dimension-control" title="Ubah Ukuran Lebar & Tinggi Kanvas Tiket">
              <span class="dim-icon">📐</span>
              <div class="dim-inputs-group">
                <input
                  type="number"
                  class="dim-num-input"
                  [value]="design()!.width"
                  (change)="onCanvasDimensionChange('width', $event)"
                  title="Lebar Kanvas (px)"
                  min="200"
                  max="4000"
                >
                <span class="dim-cross">×</span>
                <input
                  type="number"
                  class="dim-num-input"
                  [value]="design()!.height"
                  (change)="onCanvasDimensionChange('height', $event)"
                  title="Tinggi Kanvas (px)"
                  min="150"
                  max="4000"
                >
                <span class="dim-unit">px</span>
              </div>

              <!-- Quick Presets Dropdown -->
              <select
                class="dim-presets-select"
                (change)="onPresetSelectChange($event)"
                title="Pilih Ukuran Standar Tiket"
              >
                <option value="" disabled selected>Preset Ukuran</option>
                @for (p of canvasPresets; track p.id) {
                  <option [value]="p.width + 'x' + p.height + '|' + p.id">
                    {{ p.icon }} {{ p.name }} ({{ p.width }}×{{ p.height }})
                  </option>
                }
              </select>
            </div>
          }
        </div>

        <div class="topbar-center">
          <div class="figma-save-pill" [class.saving]="saving()">
            <span class="save-dot"></span>
            <span>{{ saving() ? 'Menyimpan…' : 'Tersimpan otomatis' }}</span>
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
          <div class="figma-dock" [class.dock-floating]="dockPosition() !== null" [style.left.px]="dockPosition()?.x ?? null" [style.top.px]="dockPosition()?.y ?? null" [style.flex-direction]="dockVertical() ? 'column' : 'row'">
            <button type="button" class="dock-drag-handle" (pointerdown)="startDockDrag($event)" title="Seret toolbar untuk memindahkan posisi" aria-label="Pindahkan toolbar">⠿</button>
            <!-- Undo & Redo Controls -->
            <button
              type="button"
              class="figma-dock-item"
              [disabled]="!canUndo()"
              [class.disabled-item]="!canUndo()"
              (click)="undo()"
              title="Undo / Urungkan (Ctrl+Z)"
            >
              <span class="dock-glyph">↶</span>
            </button>
            <button
              type="button"
              class="figma-dock-item"
              [disabled]="!canRedo()"
              [class.disabled-item]="!canRedo()"
              (click)="redo()"
              title="Redo / Majukan (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <span class="dock-glyph">↷</span>
            </button>
            <span class="dock-sep"></span>

            <!-- Figma Tools -->
            <button type="button" class="figma-dock-item" [class.active]="activeTool() === 'select'" (click)="setTool('select')" title="Alat Pilih / Pindah (V)">
              <span class="dock-glyph">↖</span>
            </button>
            <button type="button" class="figma-dock-item" [class.active]="activeTool() === 'pen'" (click)="setTool(activeTool() === 'pen' ? 'select' : 'pen')" title="Pen Tool: Tracing & Clipping Mask (P)">
              <span class="dock-glyph">✒️</span>
            </button>
            <span class="dock-sep"></span>
            <button type="button" class="figma-dock-item" (click)="addShape('rectangle')" title="Bentuk Kotak (R)">
              <span class="dock-glyph">▢</span>
            </button>
            <button type="button" class="figma-dock-item" (click)="addShape('circle')" title="Bentuk Lingkaran (O)">
              <span class="dock-glyph">◯</span>
            </button>
            <button type="button" class="figma-dock-item" (click)="addText()" title="Tambah Teks (T)">
              <span class="dock-glyph">T</span>
            </button>
            <button type="button" class="figma-dock-item" (click)="addTicketNumber()" title="Tambah No Tiket (N)">
              <span class="dock-glyph">🔢</span>
            </button>
            <button type="button" class="figma-dock-item" (click)="addQr()" title="Generate QR Code (Q)">
              <span class="dock-glyph">▦</span>
            </button>
            <button type="button" class="figma-dock-item" (click)="topbarLogoInput.click()" title="Upload Gambar / Logo (I)">
              <span class="dock-glyph">▣</span>
            </button>
            <input #topbarLogoInput hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="uploadLogo($event)">
          </div>

          <!-- Left Sidebar: Tools & Layers & AI Assistant -->
          <aside class="figma-left-panel">
            <div class="panel-tabs">
              <button type="button" [class.active]="leftTab === 'tools'" (click)="leftTab = 'tools'">Alat</button>
              <button type="button" [class.active]="leftTab === 'layers'" (click)="leftTab = 'layers'">Lapisan ({{ design()!.config.elements.length }})</button>
              <button type="button" [class.active]="leftTab === 'ai'" (click)="leftTab = 'ai'">Asisten AI</button>
            </div>

            <div class="panel-content">
              @if (leftTab === 'tools') {
                <!-- Undo & Redo History Quick Access -->
                <div class="tool-section">
                  <div class="section-title">RIWAYAT PERUBAHAN</div>
                  <div class="tool-grid-2">
                    <button type="button" class="tool-grid-btn" [disabled]="!canUndo()" (click)="undo()" title="Undo / Urungkan (Ctrl+Z)">
                      <span>↶ Urungkan (Undo)</span>
                      <span class="tool-badge-pill">Ctrl+Z</span>
                    </button>
                    <button type="button" class="tool-grid-btn" [disabled]="!canRedo()" (click)="redo()" title="Redo / Majukan (Ctrl+Y)">
                      <span>↷ Majukan (Redo)</span>
                      <span class="tool-badge-pill">Ctrl+Y</span>
                    </button>
                  </div>
                </div>

                <!-- Pen Tool & Tracing Category -->
                <div class="tool-section">
                  <div class="section-title">PENTOOL & TRACING KONTUR</div>
                  <div class="pen-tool-card" [class.active]="activeTool() === 'pen'">
                    <div class="pen-card-title">
                      <span class="pen-card-label">✒️ Pen Tool Tracing</span>
                      <span class="tool-badge-pill">P</span>
                    </div>
                    <p class="pen-card-desc">Tracing kontur objek bebas, buat clipping mask presisi atau buat objek vektor.</p>
                    <button type="button" class="tool-grid-btn full-width" [class.active]="activeTool() === 'pen'" (click)="setTool(activeTool() === 'pen' ? 'select' : 'pen')">
                      <span>{{ activeTool() === 'pen' ? '✓ Sedang Aktif (Klik Kanvas)' : '✒️ Aktifkan Pen Tool' }}</span>
                      <span class="tool-badge-pill">P</span>
                    </button>
                  </div>
                </div>

                <!-- Elemen & Bentuk Category -->
                <div class="tool-section">
                  <div class="section-title">BENTUK & ELEMEN VEKTOR</div>
                  <div class="tool-grid-2">
                    <button type="button" class="tool-grid-btn" (click)="addShape('rectangle')" title="Bentuk Kotak (R)">
                      <span>▢ Kotak</span>
                      <span class="tool-badge-pill">R</span>
                    </button>
                    <button type="button" class="tool-grid-btn" (click)="addShape('circle')" title="Bentuk Lingkaran (O)">
                      <span>◯ Lingkaran</span>
                      <span class="tool-badge-pill">O</span>
                    </button>
                  </div>
                </div>

                <!-- Teks & No Tiket Category -->
                <div class="tool-section">
                  <div class="section-title">TEKS & PENOMORAN TIKET</div>
                  <div class="tool-grid-2">
                    <button type="button" class="tool-grid-btn" (click)="addText()" title="Tambah Teks (T)">
                      <span>T Teks Baru</span>
                      <span class="tool-badge-pill">T</span>
                    </button>
                    <button type="button" class="tool-grid-btn" (click)="addTicketNumber()" title="Tambah Nomor Tiket (N)">
                      <span>🔢 No Tiket</span>
                      <span class="tool-badge-pill">N</span>
                    </button>
                  </div>
                  <button type="button" class="tool-btn mt-2" (click)="topbarLogoInput.click()" title="Upload Gambar atau Logo (I)">
                    <span class="tool-icon">▣</span>
                    <span class="tool-label">Upload Gambar / Logo</span>
                    <span class="tool-badge-pill">I</span>
                  </button>
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
              <div class="layer-item" [class.selected]="selectedId() === el.id" [class.drag-target]="dragOverLayerId() === el.id" draggable="true" (dragstart)="onLayerDragStart($event, el)" (dragover)="onLayerDragOver($event, el)" (drop)="onLayerDrop($event, el)" (dragend)="clearLayerDrag()" (click)="selectedId.set(el.id)">
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
                  <div class="section-title">REKOMENDASI GAYA & TEMA AI</div>

                  <label class="field-label">Pilih Kategori Cepat:</label>
                  <div class="ai-category-chips">
                    @for (rec of aiRecommendations; track rec.id) {
                      <button
                        type="button"
                        class="ai-cat-chip"
                        [class.active]="aiSelectedTheme()?.id === rec.id"
                        (click)="selectAiTheme(rec)"
                      >
                        <span>{{ rec.icon }} {{ rec.category }}</span>
                      </button>
                    }
                  </div>

                  <label class="field-label mt-2">Atau Ketik Konsep Acara Anda:</label>
                  <textarea
                    class="figma-textarea"
                    rows="2"
                    [(ngModel)]="aiBrief"
                    placeholder="Contoh: Konser musik rock indie, tema malam gelap dengan aksen neon hijau..."
                  ></textarea>

                  <div class="ai-action-buttons-row">
                    <button type="button" class="figma-btn ai-btn full-width" (click)="recommendStyle()" [disabled]="aiBusyState()">
                      <span>✦ Analisis & Rekomendasikan AI</span>
                    </button>
                  </div>

                  @if (aiSelectedTheme()) {
                    <div class="ai-theme-preview-card">
                      <div class="theme-card-header">
                        <span class="theme-card-icon">{{ aiSelectedTheme()!.icon }}</span>
                        <div class="theme-card-info">
                          <strong>{{ aiSelectedTheme()!.name }}</strong>
                          <span class="theme-card-cat">{{ aiSelectedTheme()!.category }} · {{ aiSelectedTheme()!.width }}×{{ aiSelectedTheme()!.height }} px</span>
                        </div>
                      </div>
                      <p class="theme-card-desc">{{ aiSelectedTheme()!.description }}</p>

                      <div class="theme-specs-row">
                        <div class="theme-palette">
                          <span class="swatch" [style.background]="aiSelectedTheme()!.background" title="Latar"></span>
                          <span class="swatch" [style.background]="aiSelectedTheme()!.accent" title="Aksen Utama"></span>
                          <span class="swatch" [style.background]="aiSelectedTheme()!.ink" title="Teks"></span>
                        </div>
                        <span class="theme-font-tag">{{ aiSelectedTheme()!.font }}</span>
                        <span class="theme-badge-tag">{{ aiSelectedTheme()!.ticketStyle }}</span>
                      </div>

                      <div class="theme-apply-actions">
                        <button type="button" class="figma-btn-primary full-width" (click)="applyAiTheme(aiSelectedTheme()!)">
                          <span>🎨 Terapkan Gaya & Warna AI</span>
                        </button>
                        <button type="button" class="figma-btn full-width mt-1 ai-generate-full-btn" (click)="applyFullAiLayout(aiSelectedTheme()!)">
                          <span>⚡ Buat Tata Letak Tiket Lengkap</span>
                        </button>
                      </div>
                    </div>
                  }

                  <!-- All Recommended Presets Catalog -->
                  <div class="section-title mt-3">KATALOG TEMA REKOMENDASI AI</div>
                  <div class="ai-presets-catalog">
                    @for (rec of aiRecommendations; track rec.id) {
                      <div class="preset-catalog-item" [class.selected]="aiSelectedTheme()?.id === rec.id" (click)="selectAiTheme(rec)">
                        <div class="catalog-item-top">
                          <span>{{ rec.icon }} <b>{{ rec.name }}</b></span>
                          <small>{{ rec.width }}×{{ rec.height }}</small>
                        </div>
                        <div class="catalog-item-palette">
                          <span class="mini-dot" [style.background]="rec.background"></span>
                          <span class="mini-dot" [style.background]="rec.accent"></span>
                          <span class="mini-dot" [style.background]="rec.ink"></span>
                          <small class="mini-font-name">{{ rec.font }}</small>
                        </div>
                      </div>
                    }
                  </div>
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

            <!-- Canvas sheet list removed as requested -->

            @if (activeTool() === 'pen') {
              <div class="figma-pen-dock">
                <div class="pen-dock-status">
                  <span class="pen-dock-icon">✒️</span>
                  <span class="pen-dock-badge">Pen Tool: Tracing</span>
                  <span class="pen-dock-points-count">{{ penPoints().length }} titik</span>
                </div>
                <div class="pen-dock-hint">
                  @if (penPoints().length === 0) {
                    Klik pada kanvas atau gambar untuk mulai meletakkan titik tracing
                  } @else if (penPoints().length < 3) {
                    Tandai minimal 3 titik untuk membuat mask / bentuk
                  } @else {
                    Klik titik awal untuk menutup, atau pilih aksi di samping:
                  }
                </div>
                <div class="pen-dock-actions">
                  @if (penPoints().length >= 3) {
                    <button type="button" class="pen-action-btn primary" (click)="applyPenClippingMask()" title="Terapkan hasil tracing sebagai kliping mask">
                      <span>✂️ Jadikan Mask</span>
                    </button>
                    <button type="button" class="pen-action-btn accent" (click)="createPenVectorShape()" title="Buat objek bentuk vektor baru dari tracing">
                      <span>✦ Buat Vektor</span>
                    </button>
                  }
                  @if (penPoints().length > 0) {
                    <button type="button" class="pen-action-btn subtle" (click)="undoPenPoint()" title="Undo titik (Backspace)">
                      <span>↺ Undo</span>
                    </button>
                  }
                  <button type="button" class="pen-action-btn cancel" (click)="exitPenTool()" title="Selesai (Esc / V)">
                    <span>✕ Selesai</span>
                  </button>
                </div>
              </div>
            }

            <div class="ticket-canvas-wrapper">
              <div
                #canvasEl
                class="ticket-canvas"
                [class.pen-mode-active]="activeTool() === 'pen'"
                [style.width.px]="canvasWidth()"
                [style.aspect-ratio]="design()!.width + '/' + design()!.height"
                [style.background]="backgroundImage() ? 'transparent' : background()"
                [style.background-image]="backgroundImage() ? 'url(' + backgroundImage() + ')' : null"
                [style.background-size]="backgroundImage() ? 'cover' : null"
                [style.background-position]="backgroundImage() ? 'center' : null"
                [style.clip-path]="clipPath(backgroundMask())"
                (pointerdown)="onCanvasStageClick($event)"
                (pointermove)="onCanvasStageMove($event)"
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
                        [class.ticket-badge-span]="(el['isTicketNo'] || isPrimaryTicketNoEl(el)) && el['ticketStyle'] && el['ticketStyle'] !== 'plain'"
                        [ngStyle]="ticketBadgeStyle(el)"
                        contenteditable="false"
                        (pointerdown)="onTextPointerDown($event, el)"
                        (dblclick)="enableInlineTextEdit($event)"
                        (blur)="textInlineChange($event, el)"
                        (input)="textInlineInput($event, el)"
                      >{{ isPrimaryTicketNoEl(el) ? getTicketNoForSheet(activeSheetIndex()) : el['text'] }}</span>

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

                <!-- Pen Tool Tracing & Clipping SVG Overlay -->
                @if (activeTool() === 'pen') {
                  <svg
                    class="pen-tracing-svg"
                    [attr.viewBox]="'0 0 ' + design()!.width + ' ' + design()!.height"
                    (pointerdown)="onPenSvgClick($event)"
                  >
                    @if (penPoints().length >= 3) {
                      <polygon [attr.points]="penSvgPoints()" class="pen-traced-polygon-preview" />
                    }
                    @if (penPoints().length >= 2) {
                      <polyline [attr.points]="penSvgPoints()" class="pen-traced-polyline" />
                    }
                    @if (penPoints().length >= 1 && penHoverPoint()) {
                      <line
                        [attr.x1]="penPoints()[penPoints().length - 1].x"
                        [attr.y1]="penPoints()[penPoints().length - 1].y"
                        [attr.x2]="penHoverPoint()!.x"
                        [attr.y2]="penHoverPoint()!.y"
                        class="pen-rubberband-line"
                      />
                    }
                    @for (p of penPoints(); track $index) {
                      <g class="pen-anchor-node" [class.first-node]="$index === 0">
                        @if ($index === 0) {
                          <circle
                            [attr.cx]="p.x"
                            [attr.cy]="p.y"
                            r="12"
                            class="pen-start-halo"
                            (pointerdown)="onPenStartNodeClick($event)"
                            title="Klik untuk menutup kontur tracing"
                          />
                        }
                        <circle
                          [attr.cx]="p.x"
                          [attr.cy]="p.y"
                          r="6"
                          class="pen-anchor-dot"
                          (pointerdown)="onPenAnchorClick($index, $event)"
                        />
                        <text [attr.x]="p.x + 8" [attr.y]="p.y - 8" class="pen-point-index">P{{ $index + 1 }}</text>
                      </g>
                    }
                  </svg>
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

                  <label class="field-label mt-2">Bentuk Mask (Kliping & Tracing)</label>
                  <button type="button" class="figma-btn-primary full-width mb-2" (click)="startTracingSelectedElement(selectedElement()!)" title="Gunakan Pen Tool untuk tracing kontur dan memotong gambar ini">
                    <span>✒️ Tracing Objek dengan Pen Tool</span>
                  </button>
                  @if (isCustomPolygon(selectedElement()!['clip'])) {
                    <div class="custom-mask-status-badge">
                      <span>✂️ Mask Tracing Kustom Aktif</span>
                      <button type="button" class="mask-reset-mini-btn" (click)="removeElementMask(selectedElement()!)" title="Lepas Mask">Lepas</button>
                    </div>
                  }
                  <select class="figma-select" [value]="selectedElement()!['clip'] || 'none'" (change)="elementMaskChange($event, selectedElement()!)">
                    <option value="none">Tanpa Kliping</option>
                    @if (isCustomPolygon(selectedElement()!['clip'])) {
                      <option [value]="selectedElement()!['clip']">Poligon Kustom (Hasil Tracing Pen)</option>
                    }
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

                  <label class="field-label mt-2">Bentuk Kliping & Tracing</label>
                  <button type="button" class="figma-btn-primary full-width mb-2" (click)="startTracingSelectedElement(selectedElement()!)" title="Gunakan Pen Tool untuk tracing kontur dan memotong bentuk ini">
                    <span>✒️ Tracing Objek dengan Pen Tool</span>
                  </button>
                  @if (isCustomPolygon(selectedElement()!['clip'])) {
                    <div class="custom-mask-status-badge">
                      <span>✂️ Mask Tracing Kustom Aktif</span>
                      <button type="button" class="mask-reset-mini-btn" (click)="removeElementMask(selectedElement()!)" title="Lepas Mask">Lepas</button>
                    </div>
                  }
                  <select class="figma-select" [value]="selectedElement()!['clip'] || 'none'" (change)="elementMaskChange($event, selectedElement()!)">
                    <option value="none">Bawaan</option>
                    @if (isCustomPolygon(selectedElement()!['clip'])) {
                      <option [value]="selectedElement()!['clip']">Poligon Kustom (Hasil Tracing Pen)</option>
                    }
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
                <div class="section-title">DIMENSI & UKURAN TIKET</div>
                
                <div class="canvas-dimension-inputs">
                  <div class="dim-field">
                    <label>Lebar (Width)</label>
                    <div class="input-with-unit">
                      <input
                        type="number"
                        min="200"
                        max="4000"
                        [value]="design()!.width"
                        (change)="onCanvasDimensionChange('width', $event)"
                      >
                      <span>px</span>
                    </div>
                  </div>
                  <div class="dim-field">
                    <label>Tinggi (Height)</label>
                    <div class="input-with-unit">
                      <input
                        type="number"
                        min="150"
                        max="4000"
                        [value]="design()!.height"
                        (change)="onCanvasDimensionChange('height', $event)"
                      >
                      <span>px</span>
                    </div>
                  </div>
                </div>

                <label class="field-label mt-2">Pilihan Preset Ukuran Standar:</label>
                <div class="dimension-preset-chips-grid">
                  @for (p of canvasPresets; track p.id) {
                    <button
                      type="button"
                      class="dim-chip-btn"
                      [class.active]="design()!.width === p.width && design()!.height === p.height"
                      (click)="setCanvasPreset(p.width, p.height, p.id)"
                      title="{{ p.name }} - {{ p.width }} × {{ p.height }} px"
                    >
                      <span class="dim-chip-icon">{{ p.icon }}</span>
                      <div class="dim-chip-text">
                        <strong>{{ p.name }}</strong>
                        <small>{{ p.width }} × {{ p.height }} px</small>
                      </div>
                      <span class="dim-chip-badge">{{ p.badge }}</span>
                    </button>
                  }
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
                  @for (c of [10, 25, 50, 100, 200, 500]; track c) {
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
                <div class="field-header-row">
                  <label class="modal-label">Tata Letak & Kapasitas per Lembar Kertas (A4)</label>
                  <span class="paper-saving-badge">
                    💡 Hemat Kertas: {{ totalSheetsCount() }} Lembar A4 untuk {{ printCount() }} Tiket (Hemat {{ Math.max(0, printCount() - totalSheetsCount()) }} Lembar!)
                  </span>
                </div>
                
                <div class="layout-options-grid enhanced">
                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === 'auto'"
                    (click)="printLayout.set('auto')"
                  >
                    <span class="layout-chip-icon">⚡</span>
                    <span class="layout-chip-title">Otomatis Optimal</span>
                    <small>{{ getEffectiveLayout().perSheet }} Tiket / Lembar (Auto-Fit)</small>
                  </button>

                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === '20-per-page'"
                    (click)="printLayout.set('20-per-page')"
                  >
                    <span class="layout-chip-icon">▦</span>
                    <span class="layout-chip-title">20 Tiket / Lembar</span>
                    <small>Grid 4 × 5 • hasil lebih kecil</small>
                  </button>

                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === '4-per-page'"
                    (click)="printLayout.set('4-per-page')"
                  >
                    <span class="layout-chip-icon">▦</span>
                    <span class="layout-chip-title">4 Tiket / Lembar</span>
                    <small>Grid 2 × 2 Berurutan</small>
                  </button>

                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === '6-per-page'"
                    (click)="printLayout.set('6-per-page')"
                  >
                    <span class="layout-chip-icon">▤</span>
                    <span class="layout-chip-title">6 Tiket / Lembar</span>
                    <small>Grid 2 × 3 Berurutan</small>
                  </button>

                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === '8-per-page'"
                    (click)="printLayout.set('8-per-page')"
                  >
                    <span class="layout-chip-icon">▩</span>
                    <span class="layout-chip-title">8 Tiket / Lembar</span>
                    <small>Grid 2 × 4 Berurutan</small>
                  </button>

                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === '2-per-page'"
                    (click)="printLayout.set('2-per-page')"
                  >
                    <span class="layout-chip-icon">📑</span>
                    <span class="layout-chip-title">2 Tiket / Lembar</span>
                    <small>Susun 2 Berurutan</small>
                  </button>

                  <button
                    type="button"
                    class="layout-chip"
                    [class.active]="printLayout() === '1-per-page'"
                    (click)="printLayout.set('1-per-page')"
                  >
                    <span class="layout-chip-icon">📄</span>
                    <span class="layout-chip-title">1 Tiket / Lembar</span>
                    <small>Halaman Penuh (Full Size)</small>
                  </button>
                </div>
              </div>

              <!-- Panduan Pemotongan Tiket (Cutting Guides & Crop Marks) -->
              <div class="print-field-group cutting-options-group">
                <label class="modal-label">Panduan Pemotongan Tiket (Cutting Guides)</label>
                <div class="cutting-toggles-grid">
                  <label class="figma-toggle-row">
                    <input type="checkbox" [checked]="printShowCutLines()" (change)="printShowCutLines.set($any($event.target).checked)">
                    <span>✂️ Garis Putus-Putus Potong (Dashed Cut Lines)</span>
                  </label>
                  <label class="figma-toggle-row">
                    <input type="checkbox" [checked]="printShowCropMarks()" (change)="printShowCropMarks.set($any($event.target).checked)">
                    <span>📐 Tanda Sudut Potong (Corner Crop Marks)</span>
                  </label>
                </div>
                <small class="field-hint">
                  Garis potong memudahkan pemotongan dengan gunting atau pisau cutter secara lurus dan presisi tanpa merusak desain tiket.
                </small>
              </div>

              <div class="print-field-group">
                <label class="modal-label">Sinkronisasi QR Code Otomatis</label>
                <label class="figma-toggle-row">
                  <input type="checkbox" [checked]="printSyncQr()" (change)="printSyncQr.set($any($event.target).checked)">
                  <span>Otomatis sesuaikan QR Code dengan nomor tiket di setiap lembar</span>
                </label>
              </div>

              <!-- Live Sheet Preview Card in Modal (Showing A4 Sheet with Multi-Tickets & Cutting Guides) -->
              <div class="print-preview-sheet-card">
                <div class="sheet-preview-header">
                  <div class="sheet-step-indicator">
                    <span>Pratinjau Lembar Kertas A4: <b>#{{ previewSheetIndex() + 1 }}</b> dari <b>{{ totalSheetsCount() }} Lembar</b></span>
                    <span class="preview-ticket-badge">{{ getSheetTicketRange(previewSheetIndex()) }}</span>
                  </div>
                  <div class="sheet-nav-btns">
                    <button type="button" class="sheet-nav-btn" [disabled]="previewSheetIndex() <= 0" (click)="previewSheetIndex.set(previewSheetIndex() - 1)">◀ Lembar Sebelumnya</button>
                    <button type="button" class="sheet-nav-btn" [disabled]="previewSheetIndex() >= totalSheetsCount() - 1" (click)="previewSheetIndex.set(previewSheetIndex() + 1)">Lembar Berikutnya ▶</button>
                  </div>
                </div>

                <div class="modal-ticket-preview-viewport multi-sheet-viewport">
                  <div class="a4-sheet-preview-board" [attr.data-orientation]="getEffectiveLayout().orientation">
                    <div class="a4-sheet-header-strip">
                      <span>A4 {{ getEffectiveLayout().orientation | uppercase }} • {{ getEffectiveLayout().perSheet }} TIKET / LEMBAR</span>
                      <span>✂ PANDUAN POTONG AKTIF</span>
                    </div>

                    <div
                      class="a4-sheet-tickets-grid"
                      [style.grid-template-columns]="'repeat(' + getEffectiveLayout().cols + ', 1fr)'"
                      [style.grid-template-rows]="'repeat(' + getEffectiveLayout().rows + ', 1fr)'"
                    >
                      @for (ticket of getTicketsForSheet(previewSheetIndex()); track ticket.ticketNo; let idx = $index) {
                        <div class="a4-preview-ticket-cell">
                          <div
                            class="ticket-canvas modal-mini-canvas"
                            [style.aspect-ratio]="design()!.width + '/' + design()!.height"
                            [style.background]="backgroundImage() ? 'transparent' : background()"
                            [style.background-image]="backgroundImage() ? 'url(' + backgroundImage() + ')' : null"
                            [style.background-size]="backgroundImage() ? 'cover' : null"
                            [style.background-position]="backgroundImage() ? 'center' : null"
                            [style.clip-path]="clipPath(backgroundMask())"
                          >
                            @if (!hasTicketNoInElements()) {
                              <div
                                class="canvas-element canvas-text auto-printed-ticket-badge"
                                [style.right.%]="6"
                                [style.top.%]="6"
                                [style.font-size.px]="18 * modalMultiPreviewScale()"
                                style="position: absolute; font-family: 'Space Mono', monospace; font-weight: 700; z-index: 99;"
                              >
                                <span
                                  class="text-content-inner ticket-badge-span"
                                  [ngStyle]="autoTicketBadgeStyle()"
                                >{{ ticket.ticketNo }}</span>
                              </div>
                            }

                            @for (el of design()!.config.elements; track el.id) {
                              @if (el.type === 'text') {
                                <div
                                  class="canvas-element canvas-text"
                                  [style.left.%]="(el.x / design()!.width) * 100"
                                  [style.top.%]="(el.y / design()!.height) * 100"
                                  [style.font-size.px]="number(el['fontSize'], 24) * modalMultiPreviewScale()"
                                  [style.font-weight]="el['fontWeight'] || 600"
                                  [style.color]="el['color'] || '#1e293b'"
                                  [style.font-family]="el['fontFamily'] || 'DM Sans'"
                                  [style.width.%]="(number(el['width'], design()!.width * 0.6) / design()!.width) * 100"
                                  [style.transform]="transform(el)"
                                >
                                  <span
                                    class="text-content-inner"
                                    [class.ticket-badge-span]="(el['isTicketNo'] || isPrimaryTicketNoEl(el)) && el['ticketStyle'] && el['ticketStyle'] !== 'plain'"
                                    [ngStyle]="ticketBadgeStyle(el)"
                                  >{{ isPrimaryTicketNoEl(el) ? ticket.ticketNo : el['text'] }}</span>
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
                                  <img [src]="el['qrDataUrl']" alt="QR Code">
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

                          @if (printShowCutLines() && (idx + 1) % getEffectiveLayout().cols !== 0) {
                            <div class="modal-preview-vertical-cut">
                              <span>✂</span>
                            </div>
                          }
                          @if (printShowCutLines() && idx < getTicketsForSheet(previewSheetIndex()).length - getEffectiveLayout().cols) {
                            <div class="modal-preview-horizontal-cut">
                              <span>✂</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
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
              <button class="outline-btn" type="button" (click)="closePrintModal()" [disabled]="printBusy() || pdfGenerating()">Batal</button>
              <button class="figma-btn btn-preview-pdf" type="button" (click)="openFullPdfPreview()" [disabled]="printBusy() || pdfGenerating() || printCount() < 1" title="Buka Pratinjau Dokumen PDF Lengkap">
                <span>{{ pdfGenerating() ? 'Menyiapkan (' + pdfProgress() + '%)…' : '👁 Pratinjau PDF' }}</span>
              </button>
              <button class="figma-btn-primary" type="button" (click)="saveDirectPdf()" [disabled]="printBusy() || pdfGenerating() || printCount() < 1" title="Unduh dan Simpan Langsung File PDF ke Komputer">
                <span>{{ pdfGenerating() ? 'Menyimpan (' + pdfProgress() + '%)…' : '💾 Simpan File PDF' }}</span>
              </button>
             
            </div>
          </section>
        </div>
      }

      <!-- Batch Print Rendering Container for Browser Print / PDF Export -->
      <!-- Dedicated PDF Document Viewer & Direct Save Modal -->
      @if (pdfViewerModalOpen()) {
        <div class="modal-scrim pdf-preview-scrim" (click)="closePdfViewerModal()">
          <section class="pdf-viewer-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <!-- PDF Viewer Header Toolbar -->
            <div class="pdf-viewer-header">
              <div class="pdf-viewer-title-group">
                <span class="pdf-file-icon">📄</span>
                <div>
                  <strong>{{ design()!.name || 'Tiket-Event' }}.pdf</strong>
                  <span class="pdf-meta-badge">{{ pdfPageItems().length }} Halaman • {{ getTicketNoForSheet(0) }} s/d {{ getTicketNoForSheet(pdfPageItems().length - 1) }}</span>
                </div>
              </div>

              <div class="pdf-viewer-controls">
                <!-- Mode View Switcher: Document vs Batch Grid -->
                <div class="pdf-view-mode-toggle">
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.active]="pdfViewMode() === 'grid'"
                    (click)="pdfViewMode.set('grid')"
                    title="Tampilkan Semua Lembar Batch dalam Grid"
                  >
                    <span>⊞ Grid Semua ({{ pdfPageItems().length }})</span>
                  </button>
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    [class.active]="pdfViewMode() === 'document'"
                    (click)="pdfViewMode.set('document')"
                    title="Tampilkan Lembar Tunggal Resolusi Tinggi"
                  >
                    <span>📄 Lembar</span>
                  </button>
                </div>

                @if (pdfViewMode() === 'document') {
                  <button type="button" class="pdf-nav-btn" [disabled]="pdfCurrentPage() <= 0" (click)="pdfCurrentPage.set(pdfCurrentPage() - 1)">◀</button>
                  <span class="pdf-page-indicator">Halaman {{ pdfCurrentPage() + 1 }} / {{ pdfPageItems().length }}</span>
                  <button type="button" class="pdf-nav-btn" [disabled]="pdfCurrentPage() >= pdfPageItems().length - 1" (click)="pdfCurrentPage.set(pdfCurrentPage() + 1)">▶</button>

                  <span class="pdf-divider"></span>

                  <button type="button" class="pdf-zoom-btn" (click)="zoomOutPdf()">－</button>
                  <span class="pdf-zoom-level">{{ Math.round(pdfZoom() * 100) }}%</span>
                  <button type="button" class="pdf-zoom-btn" (click)="zoomInPdf()">＋</button>
                  <button type="button" class="pdf-zoom-btn" (click)="resetZoomPdf()">Fit</button>
                }
              </div>

              <div class="pdf-viewer-actions">
                <button type="button" class="figma-btn-primary pdf-download-btn" (click)="downloadPdfFile()" [disabled]="pdfGenerating()">
                  <span>💾 Simpan File PDF</span>
                </button>
                <button type="button" class="figma-btn export-btn" (click)="printFromPdfViewer()">
                  <span>🖨 Cetak</span>
                </button>
                <button type="button" class="modal-close-btn" (click)="closePdfViewerModal()">✕</button>
              </div>
            </div>

            <!-- PDF Viewer Body -->
            <div class="pdf-viewer-body">
              @if (pdfViewMode() === 'document') {
                <!-- Left Thumbnail Strip -->
                <aside class="pdf-thumbnail-sidebar">
                  <div class="sidebar-title">DAFTAR LEMBAR ({{ pdfPageItems().length }})</div>
                  <div class="pdf-thumbnail-list">
                    @for (item of pdfPageItems(); track $index) {
                      <div
                        class="pdf-thumb-card"
                        [class.active]="pdfCurrentPage() === $index"
                        (click)="pdfCurrentPage.set($index)"
                      >
                        <div class="thumb-header">
                          <span class="thumb-page-num">#{{ $index + 1 }}</span>
                          <span class="thumb-ticket-no">{{ item.ticketNo }}</span>
                        </div>
                        <div class="thumb-img-wrapper">
                          <img [src]="item.dataUrl" [alt]="'Lembar ' + ($index + 1)">
                        </div>
                      </div>
                    }
                  </div>
                </aside>

                <!-- Main Single Page Stage -->
                <main class="pdf-main-stage">
                  <div class="pdf-page-display-wrapper" [style.transform]="'scale(' + pdfZoom() + ')'">
                    @if (pdfPageItems().length > 0 && pdfPageItems()[pdfCurrentPage()]) {
                      <div class="pdf-rendered-page-sheet">
                        <img
                          [src]="pdfPageItems()[pdfCurrentPage()].dataUrl"
                          [alt]="'Halaman ' + (pdfCurrentPage() + 1)"
                          class="pdf-page-rendered-img"
                        >
                        <div class="pdf-watermark-footer">
                          <span>{{ design()!.name }}</span>
                          <span>Lembar {{ pdfCurrentPage() + 1 }} dari {{ pdfPageItems().length }} ({{ pdfPageItems()[pdfCurrentPage()].ticketNo }})</span>
                        </div>
                      </div>
                    } @else {
                      <div class="pdf-loading-box">
                        <div class="figma-spinner"></div>
                        <p>Memuat Halaman PDF…</p>
                      </div>
                    }
                  </div>
                </main>
              } @else {
                <!-- All Batch Tickets Grid Stage -->
                <main class="pdf-grid-stage">
                  <div class="pdf-grid-overview-header">
                    <div class="grid-overview-title">
                      <strong>BATCH TIKET: {{ pdfPageItems().length }} LEMBAR SIAP CETAK</strong>
                      <span class="grid-seq-badge">Nomor Urut: {{ getTicketNoForSheet(0) }} s/d {{ getTicketNoForSheet(pdfPageItems().length - 1) }}</span>
                    </div>
                    <div class="grid-overview-hint">
                      💡 Klik salah satu tiket untuk beralih dan melihat perbesaran resolusi tinggi lembar tersebut.
                    </div>
                  </div>

                  <div class="pdf-grid-container">
                    @for (item of pdfPageItems(); track $index) {
                      <div class="pdf-batch-card" (click)="selectTicketFromGrid($index)" title="Klik untuk melihat lembar #{{ $index + 1 }} ({{ item.ticketNo }})">
                        <div class="batch-card-header">
                          <span class="batch-card-index">Lembar #{{ $index + 1 }}</span>
                          <span class="batch-card-ticket-no">{{ item.ticketNo }}</span>
                        </div>
                        <div class="batch-card-preview">
                          <img [src]="item.dataUrl" [alt]="'Tiket #' + ($index + 1) + ' - ' + item.ticketNo">
                        </div>
                        <div class="batch-card-footer">
                          <span class="batch-status-dot">●</span>
                          <span>Siap Cetak PDF (300 DPI)</span>
                        </div>
                      </div>
                    }
                  </div>
                </main>
              }
            </div>
          </section>
        </div>
      }

      @if (printPages().length > 0) {
        <div class="print-batch-root" id="print-batch-root" [attr.data-layout]="printLayout()" [attr.data-orientation]="getEffectiveLayout().orientation">
          @for (sheet of printSheets(); track $index) {
            <div class="print-sheet-wrapper" [class]="'layout-' + printLayout()" [attr.data-orientation]="getEffectiveLayout().orientation">
              <div class="print-sheet-header-meta">
                <span>{{ design()!.name }}</span>
                <span>Lembar {{ $index + 1 }} dari {{ printSheets().length }} ({{ sheet[0]?.ticketNo }} s/d {{ sheet[sheet.length - 1]?.ticketNo }})</span>
                <span class="meta-cut-hint">✂ Garis Potong Aktif</span>
              </div>
              <div class="print-sheet-grid" [style.grid-template-columns]="'repeat(' + getEffectiveLayout().cols + ', 1fr)'">
                @for (page of sheet; track page.ticketNo; let idx = $index) {
                  <div class="print-ticket-cell">
                    <div
                      class="ticket-canvas print-canvas-instance"
                      [style.aspect-ratio]="design()!.width + '/' + design()!.height"
                      [style.background]="backgroundImage() ? 'transparent' : background()"
                      [style.background-image]="backgroundImage() ? 'url(' + backgroundImage() + ')' : null"
                      [style.background-size]="backgroundImage() ? 'cover' : null"
                      [style.background-position]="backgroundImage() ? 'center' : null"
                      [style.clip-path]="clipPath(backgroundMask())"
                    >
                      @if (!hasTicketNoInElements()) {
                        <div
                          class="canvas-element canvas-text auto-printed-ticket-badge"
                          [style.right.%]="6"
                          [style.top.%]="6"
                          [style.font-size.px]="22 * printScale()"
                          style="position: absolute; font-family: 'Space Mono', monospace; font-weight: 700; z-index: 99;"
                        >
                          <span
                            class="text-content-inner ticket-badge-span"
                            [ngStyle]="autoTicketBadgeStyle()"
                          >{{ page.ticketNo }}</span>
                        </div>
                      }
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
                              [class.ticket-badge-span]="(el['isTicketNo'] || isPrimaryTicketNoEl(el)) && el['ticketStyle'] && el['ticketStyle'] !== 'plain'"
                              [ngStyle]="ticketBadgeStyle(el)"
                            >{{ isPrimaryTicketNoEl(el) ? page.ticketNo : el['text'] }}</span>
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
                            <img [src]="(printSyncQr() && page.qrDataUrl) ? page.qrDataUrl : (el['qrDataUrl'] || page.qrDataUrl)" alt="QR Code">
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

                    @if (printShowCropMarks()) {
                      <span class="crop-mark top-left"></span>
                      <span class="crop-mark top-right"></span>
                      <span class="crop-mark bottom-left"></span>
                      <span class="crop-mark bottom-right"></span>
                    }
                    @if (printShowCutLines() && (idx + 1) % getEffectiveLayout().cols !== 0) {
                      <div class="vertical-cut-guide">
                        <span class="cut-scissor">✂</span>
                      </div>
                    }
                    @if (printShowCutLines() && idx < sheet.length - getEffectiveLayout().cols) {
                      <div class="horizontal-cut-guide">
                        <span class="cut-scissor">✂</span>
                      </div>
                    }
                  </div>
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
  Math = Math;
  @ViewChild('canvasEl') canvasEl?: ElementRef<HTMLElement>;
  @ViewChild('topbarLogoInput') topbarLogoInput?: ElementRef<HTMLInputElement>;

  activeTool = signal<'select' | 'pen'>('select');
  penPoints = signal<Array<{ x: number; y: number }>>([]);
  penHoverPoint = signal<{ x: number; y: number } | null>(null);

  // Undo & Redo History System
  private history: Array<DesignConfig> = [];
  private historyIndex = signal<number>(-1);
  private isUndoingOrRedoing = false;

  canUndo = computed(() => this.historyIndex() > 0 || (this.activeTool() === 'pen' && this.penPoints().length > 0));
  canRedo = computed(() => this.historyIndex() >= 0 && this.historyIndex() < this.history.length - 1);

  private api = inject(DesignsApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fontOptions = fontOptions;
  ticketStyles = ticketStyles;
  ticketNoStyles = ticketNoStyles;
  canvasPresets = canvasPresets;
  aiRecommendations = aiRecommendations;
  aiSelectedTheme = signal<AiThemeRecommendation | null>(aiRecommendations[0]);
  pdfViewMode = signal<'document' | 'grid'>('grid');

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
  printShowCutLines = signal(true);
  printShowCropMarks = signal(true);
  printBusy = signal(false);
  printPages = signal<Array<{ ticketNo: string; qrDataUrl?: string }>>([]);
  activeSheetIndex = signal<number>(0);
  previewSheetIndex = signal<number>(0);
  printLayout = signal<string>('auto');
  pdfViewerModalOpen = signal<boolean>(false);
  pdfGenerating = signal<boolean>(false);
  pdfProgress = signal<number>(0);
  pdfCurrentPage = signal<number>(0);
  pdfZoom = signal<number>(0.75);
  pdfPageItems = signal<Array<{ ticketNo: string; dataUrl: string }>>([]);

  getEffectiveLayout(): { cols: number; rows: number; perSheet: number; orientation: 'portrait' | 'landscape'; label: string } {
    const layout = this.printLayout();
    const d = this.design();
    const tw = d?.width || 1050;
    const th = d?.height || 600;
    const ratio = tw / th;

    if (layout === '1-per-page') {
      return { cols: 1, rows: 1, perSheet: 1, orientation: ratio >= 1 ? 'landscape' : 'portrait', label: '1 Tiket / Lembar' };
    }
    if (layout === '2-per-page') {
      return { cols: 1, rows: 2, perSheet: 2, orientation: 'portrait', label: '2 Tiket / Lembar A4' };
    }
    if (layout === '3-per-page') {
      return { cols: 1, rows: 3, perSheet: 3, orientation: 'portrait', label: '3 Tiket / Lembar A4' };
    }
    if (layout === '4-per-page') {
      return { cols: 2, rows: 2, perSheet: 4, orientation: ratio >= 1.5 ? 'landscape' : 'portrait', label: '4 Tiket / Lembar A4' };
    }
    if (layout === '6-per-page') {
      return ratio >= 1.8
        ? { cols: 2, rows: 3, perSheet: 6, orientation: 'portrait', label: '6 Tiket / Lembar A4' }
        : { cols: 3, rows: 2, perSheet: 6, orientation: 'landscape', label: '6 Tiket / Lembar A4' };
    }
    if (layout === '8-per-page') {
      return { cols: 2, rows: 4, perSheet: 8, orientation: 'portrait', label: '8 Tiket / Lembar A4' };
    }
    if (layout === '20-per-page') {
      return { cols: 4, rows: 5, perSheet: 20, orientation: 'portrait', label: '20 Tiket / Lembar A4' };
    }
    if (layout === '10-per-page') {
      return { cols: 2, rows: 5, perSheet: 10, orientation: 'portrait', label: '10 Tiket / Lembar A4' };
    }

    // Default 'auto': calculate optimal fit for standard A4
    if (ratio >= 2.3) {
      return { cols: 2, rows: 4, perSheet: 8, orientation: 'portrait', label: 'Otomatis: 8 Tiket / Lembar A4' };
    } else if (ratio >= 1.6) {
      return { cols: 2, rows: 2, perSheet: 4, orientation: 'landscape', label: 'Otomatis: 4 Tiket / Lembar A4' };
    } else if (ratio >= 1.1) {
      return { cols: 2, rows: 2, perSheet: 4, orientation: 'portrait', label: 'Otomatis: 4 Tiket / Lembar A4' };
    } else {
      return { cols: 3, rows: 1, perSheet: 3, orientation: 'landscape', label: 'Otomatis: 3 Tiket / Lembar A4' };
    }
  }

  totalSheetsCount = computed(() => {
    const count = this.printCount();
    const perSheet = this.getEffectiveLayout().perSheet;
    return Math.max(1, Math.ceil(count / perSheet));
  });

  getTicketsForSheet(sheetIdx: number): Array<{ index: number; ticketNo: string }> {
    const perSheet = this.getEffectiveLayout().perSheet;
    const startIdx = sheetIdx * perSheet;
    const count = this.printCount();
    const endIdx = Math.min(count, startIdx + perSheet);
    const prefix = this.printPrefix();
    const startNo = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();

    const tickets: Array<{ index: number; ticketNo: string }> = [];
    for (let i = startIdx; i < endIdx; i++) {
      const ticketNo = this.formatTicketNumber(prefix, startNo + i, pad, suffix);
      tickets.push({ index: i, ticketNo });
    }
    return tickets;
  }

  getSheetTicketRange(sheetIdx: number): string {
    const tickets = this.getTicketsForSheet(sheetIdx);
    if (tickets.length === 0) return '';
    if (tickets.length === 1) return tickets[0].ticketNo;
    return `${tickets[0].ticketNo} s/d ${tickets[tickets.length - 1].ticketNo} (${tickets.length} Tiket)`;
  }

  modalMultiPreviewScale(): number {
    const perSheet = this.getEffectiveLayout().perSheet;
    if (perSheet <= 2) return 0.32;
    if (perSheet <= 4) return 0.22;
    if (perSheet <= 6) return 0.17;
    return 0.14;
  }

  sheetIndexes = computed(() => {
    const count = Math.min(this.totalSheetsCount(), 30);
    return Array.from({ length: count }, (_, i) => i);
  });

  printSheets = computed(() => {
    const pages = this.printPages();
    const perSheet = this.getEffectiveLayout().perSheet;
    const sheets: Array<Array<{ ticketNo: string; qrDataUrl?: string }>> = [];
    for (let i = 0; i < pages.length; i += perSheet) {
      sheets.push(pages.slice(i, i + perSheet));
    }
    return sheets;
  });

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
  private dragHistoryBefore: DesignConfig | null = null;
  dockPosition = signal<{ x: number; y: number } | null>(null);
  dockVertical = signal(false);
  dragOverLayerId = signal('');
  private draggedLayerId = '';
  private dockPointerStart: { x: number; y: number; left: number; top: number } | null = null;
  private dockPointerMove = (event: PointerEvent) => this.moveDockDrag(event);
  private dockPointerEnd = () => this.endDockDrag();
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
        this.history = [structuredClone(d.config)];
        this.historyIndex.set(0);
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
    window.removeEventListener('pointermove', this.dockPointerMove);
    window.removeEventListener('pointerup', this.dockPointerEnd);
    window.removeEventListener('pointercancel', this.dockPointerEnd);
    window.removeEventListener('keydown', this.onKeyDown);
    clearTimeout(this.saveTimer);
  }

  aiBusy() {
    return this.aiBusyState();
  }

  startDockDrag(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    const dock = (event.currentTarget as HTMLElement).parentElement;
    const workspace = dock?.closest<HTMLElement>('.figma-workspace');
    if (!dock || !workspace) return;
    const rect = dock.getBoundingClientRect();
    const bounds = workspace.getBoundingClientRect();
    const left = rect.left - bounds.left;
    const top = rect.top - bounds.top;
    this.dockPosition.set({ x: left, y: top });
    this.dockPointerStart = { x: event.clientX, y: event.clientY, left, top };
    window.addEventListener('pointermove', this.dockPointerMove);
    window.addEventListener('pointerup', this.dockPointerEnd, { once: true });
    window.addEventListener('pointercancel', this.dockPointerEnd, { once: true });
  }

  private moveDockDrag(event: PointerEvent) {
    const start = this.dockPointerStart;
    if (!start) return;
    const dock = document.querySelector<HTMLElement>('.figma-dock.dock-floating');
    const workspace = dock?.closest<HTMLElement>('.figma-workspace');
    if (!dock || !workspace) return;
    const maxX = Math.max(8, workspace.clientWidth - dock.offsetWidth - 8);
    const maxY = Math.max(8, workspace.clientHeight - dock.offsetHeight - 8);
    this.dockPosition.set({
      x: Math.max(8, Math.min(maxX, start.left + event.clientX - start.x)),
      y: Math.max(8, Math.min(maxY, start.top + event.clientY - start.y))
    });
  }

  private endDockDrag = () => {
    this.dockPointerStart = null;
    window.removeEventListener('pointermove', this.dockPointerMove);
    window.removeEventListener('pointercancel', this.dockPointerEnd);
  };

  toggleDockOrientation() {
    this.dockVertical.update(value => !value);
  }

  onLayerDragStart(event: DragEvent, element: DesignElement) {
    this.draggedLayerId = element.id;
    event.dataTransfer?.setData('text/plain', element.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    this.selectedId.set(element.id);
  }

  onLayerDragOver(event: DragEvent, element: DesignElement) {
    event.preventDefault();
    this.dragOverLayerId.set(element.id);
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onLayerDrop(event: DragEvent, target: DesignElement) {
    event.preventDefault();
    const sourceId = this.draggedLayerId || event.dataTransfer?.getData('text/plain');
    if (!sourceId || sourceId === target.id) return;
    this.mutate(design => {
      const elements = design.config.elements;
      const from = elements.findIndex(element => element.id === sourceId);
      const to = elements.findIndex(element => element.id === target.id);
      if (from < 0 || to < 0) return;
      const [moving] = elements.splice(from, 1);
      elements.splice(to, 0, moving);
    });
    this.clearLayerDrag();
  }

  clearLayerDrag() {
    this.draggedLayerId = '';
    this.dragOverLayerId.set('');
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
    if (!save) {
      this.design.update(cur => {
        if (!cur) return cur;
        const d = structuredClone(cur);
        const el = d.config.elements.find(x => x.id === id);
        if (el) fn(el);
        return d;
      });
      return;
    }
    this.mutate(d => {
      const el = d.config.elements.find(x => x.id === id);
      if (el) fn(el);
    }, true);
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
    if (key.startsWith('polygon(') || key.startsWith('path(')) {
      return key;
    }
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

    // Undo (Ctrl+Z / Cmd+Z)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault();
      this.undo();
      return;
    }

    // Redo (Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z)
    if (
      ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey)
    ) {
      e.preventDefault();
      this.redo();
      return;
    }

    if (this.activeTool() === 'pen') {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.exitPenTool();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        this.undoPenPoint();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.applyPenClippingMask();
        return;
      }
    }

    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      this.setTool(this.activeTool() === 'pen' ? 'select' : 'pen');
      return;
    }
    if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      this.setTool('select');
      return;
    }


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

  onTextPointerDown(event: PointerEvent, el: DesignElement) {
    // Treat text like every other canvas object: select and start dragging on the first click.
    if ((event.target as HTMLElement).isContentEditable) return;
    this.startDrag(event, el);
  }

  enableInlineTextEdit(event: MouseEvent) {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.contentEditable = 'true';
    target.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
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

  onCanvasDimensionChange(dim: 'width' | 'height', e: Event) {
    const input = e.target as HTMLInputElement;
    const val = Number(input.value);
    this.updateCanvasDimension(dim, val);
  }

  updateCanvasDimension(key: 'width' | 'height', val: number | string) {
    const dim = key;
    this.design.update(cur => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      d[dim] = Math.max(150, Math.min(4000, Math.round(Number(val) || (dim === 'width' ? 1050 : 600))));
      if (!d.config.canvas) d.config.canvas = { width: d.width, height: d.height };
      d.config.canvas[dim] = d[dim];
      this.pushHistory(d.config);
      return d;
    });
    this.scheduleSave();
  }

  setCanvasPreset(width: number, height: number, typeName?: string) {
    this.design.update(cur => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      d.width = width;
      d.height = height;
      // typeName is the canvas preset id (e.g. "compact"), not the API DesignType.
      // Changing canvas dimensions must not overwrite the design's ticket category.
      d.config.type = d.type;
      if (!d.config.canvas) d.config.canvas = { width, height };
      d.config.canvas.width = width;
      d.config.canvas.height = height;
      this.pushHistory(d.config);
      return d;
    });
    this.scheduleSave();
  }

  onPresetSelectChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    if (!val) return;
    const [dimStr, id] = val.split('|');
    const [w, h] = dimStr.split('x').map(Number);
    if (w && h) {
      this.setCanvasPreset(w, h, id);
    }
  }

  selectAiTheme(rec: AiThemeRecommendation) {
    this.aiSelectedTheme.set(rec);
    this.aiBrief = rec.prompt;
  }

  applyAiTheme(theme: AiThemeRecommendation) {
    this.setCanvasPreset(theme.width, theme.height);
    this.background.set(theme.background);
    this.backgroundImage.set('');
    this.backgroundMask.set('none');

    this.design.update(cur => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      d.config.canvas.background = theme.background;
      d.config.canvas.backgroundImage = '';
      d.config.canvas.backgroundMask = 'none';

      for (const el of d.config.elements) {
        if (el.type === 'text') {
          el['fontFamily'] = theme.font;
          if (this.isPrimaryTicketNoEl(el)) {
            el['ticketStyle'] = theme.ticketStyle;
            el['badgeBg'] = theme.badgeBg;
            el['badgeBorder'] = theme.badgeBorder;
            el['color'] = theme.accent;
          } else {
            const fs = Number(el['fontSize']) || 24;
            if (fs >= 28) {
              el['color'] = theme.accent;
            } else {
              el['color'] = theme.ink;
            }
          }
        } else if (el.type === 'qr') {
          el['color'] = theme.accent;
          el['qrBackground'] = theme.badgeBg;
        } else if (el.type === 'rectangle' || el.type === 'circle') {
          el['fill'] = theme.accent;
        }
      }

      this.pushHistory(d.config);
      return d;
    });

    const qrEl = this.design()?.config.elements.find(x => x.type === 'qr');
    if (qrEl) this.generateQr(qrEl);
    this.scheduleSave();
  }

  applyFullAiLayout(theme: AiThemeRecommendation) {
    const w = theme.width;
    const h = theme.height;
    const ticketNo = this.formatTicketNumber(this.printPrefix(), this.printStartNo(), this.printPad(), this.printSuffix());
    const eventName = this.design()?.name || 'CONCERT LIVE 2025';

    const elements: DesignElement[] = [
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: 48,
        y: 40,
        text: `✦ ${theme.category.toUpperCase()} ✦`,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: theme.font,
        color: theme.accent,
        width: 300,
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: 48,
        y: 72,
        text: eventName.toUpperCase(),
        fontSize: Math.round(w * 0.042),
        fontWeight: 800,
        fontFamily: theme.font,
        color: theme.ink,
        width: Math.round(w * 0.65),
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: 48,
        y: 130,
        text: 'SPECIAL PERFORMANCE • LIVE STAGE • OFFICIAL PASS',
        fontSize: 16,
        fontWeight: 500,
        fontFamily: theme.font,
        color: theme.accent,
        width: Math.round(w * 0.6),
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: 48,
        y: Math.round(h * 0.42),
        text: 'SABTU, 28 DESEMBER 2025 • 19:00 WIB',
        fontSize: 18,
        fontWeight: 700,
        fontFamily: theme.font,
        color: theme.ink,
        width: 400,
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: 48,
        y: Math.round(h * 0.52),
        text: 'STADION UTAMA GELORA BUNG KARNO, JAKARTA',
        fontSize: 15,
        fontWeight: 500,
        fontFamily: theme.font,
        color: theme.accent,
        width: 450,
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: 48,
        y: Math.round(h * 0.68),
        text: 'GATE 03 • ROW A • SEAT 14',
        fontSize: 17,
        fontWeight: 700,
        fontFamily: 'Space Mono',
        color: theme.ink,
        width: 320,
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: Math.round(w - 280),
        y: 40,
        text: ticketNo,
        fontSize: 22,
        fontWeight: 700,
        fontFamily: 'Space Mono',
        color: theme.accent,
        width: 240,
        rotation: 0,
        isTicketNo: true,
        ticketPrefix: this.printPrefix(),
        ticketStart: this.printStartNo(),
        ticketPad: this.printPad(),
        ticketSuffix: this.printSuffix(),
        ticketStyle: theme.ticketStyle,
        badgeBg: theme.badgeBg,
        badgeBorder: theme.badgeBorder,
        badgeBorderWidth: 1.5,
        badgeRadius: 999
      },
      {
        id: crypto.randomUUID(),
        type: 'qr',
        x: Math.round(w - 230),
        y: Math.round(h * 0.35),
        width: 170,
        height: 170,
        value: `https://ticketforge.local/verify?ticket=${ticketNo}`,
        color: theme.accent,
        qrBackground: theme.badgeBg,
        rotation: 0
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: Math.round(w - 230),
        y: Math.round(h * 0.35 + 180),
        text: 'SCAN UNTUK VALIDASI',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'Space Mono',
        color: theme.accent,
        width: 170,
        textAlign: 'center',
        rotation: 0
      }
    ];

    this.setCanvasPreset(w, h);
    this.background.set(theme.background);
    this.backgroundImage.set('');
    this.backgroundMask.set('none');

    this.design.update(cur => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      d.config.canvas.background = theme.background;
      d.config.canvas.backgroundImage = '';
      d.config.canvas.backgroundMask = 'none';
      d.config.elements = elements;
      this.pushHistory(d.config);
      return d;
    });

    const qrEl = this.design()?.config.elements.find(x => x.type === 'qr');
    if (qrEl) this.generateQr(qrEl);
    this.scheduleSave();
  }

  selectTicketFromGrid(index: number) {
    this.pdfCurrentPage.set(index);
    this.pdfViewMode.set('document');
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
    if (this.activeTool() === 'pen') return;
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
    this.dragHistoryBefore = this.design() ? structuredClone(this.design()!.config) : null;
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
      const before = this.dragHistoryBefore;
      this.dragHistoryBefore = null;
      const after = this.design()?.config;
      if (before && after && JSON.stringify(before) !== JSON.stringify(after)) {
        this.pushHistory(structuredClone(after));
      }
      this.scheduleSave();
    }
  };

  private pushHistory(config: DesignConfig) {
    if (this.isUndoingOrRedoing) return;
    const snapshot = structuredClone(config);
    const current = this.history[this.historyIndex()];
    // Skip duplicate snapshots (for example, a key edit followed by drag end).
    if (current && JSON.stringify(current) === JSON.stringify(snapshot)) return;
    const nextHistory = this.history.slice(0, this.historyIndex() + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > 60) nextHistory.shift();
    this.history = nextHistory;
    this.historyIndex.set(nextHistory.length - 1);
  }

  private mutate(fn: (d: Design) => void, save = true, recordHistory = true) {
    this.design.update(cur => {
      if (!cur) return cur;
      const d = structuredClone(cur);
      fn(d);

      if (recordHistory && !this.isUndoingOrRedoing) {
        this.pushHistory(d.config);
      }

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

  isPrimaryTicketNoEl(el: DesignElement): boolean {
    if (el.type !== 'text') return false;
    if (el['isTicketNo'] || el['isTicketNumber']) return true;
    const primary = this.getPrimaryTicketNoElement();
    return primary?.id === el.id;
  }

  hasTicketNoInElements(): boolean {
    return this.getPrimaryTicketNoElement() !== null;
  }

  getPrimaryTicketNoElement(): DesignElement | null {
    const elements = this.design()?.config.elements || [];
    // 1. Explicit ticket number element
    const explicit = elements.find(x => x.type === 'text' && (x['isTicketNo'] || x['isTicketNumber']));
    if (explicit) return explicit;

    // 2. Element matching ticket number patterns (e.g. TCK-..., NO: ..., 0001, etc.)
    const pattern = /^(TCK|TIK|TKT|NO|NUM|INV|VIP|ADM|#)[\s\-\:\.\/]?\d+|\b\d{3,}\b/i;
    const matched = elements.find(x => x.type === 'text' && pattern.test(String(x['text'] || '').trim()));
    if (matched) return matched;

    // 3. Match against current printPrefix
    const prefix = this.printPrefix().trim();
    if (prefix.length >= 2) {
      const prefixMatched = elements.find(x => x.type === 'text' && String(x['text'] || '').includes(prefix));
      if (prefixMatched) return prefixMatched;
    }

    return null;
  }

  autoTicketBadgeStyle(): Record<string, string> {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 14px',
      borderRadius: '999px',
      backgroundColor: '#ffffff',
      color: '#0d99ff',
      border: '1.5px solid #0d99ff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      fontWeight: '700',
      letterSpacing: '1px'
    };
  }

  getTicketNoForSheet(index: number): string {
    const prefix = this.printPrefix();
    const start = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();
    return this.formatTicketNumber(prefix, start + index, pad, suffix);
  }

  setActiveSheet(index: number) {
    this.activeSheetIndex.set(index);
  }

  incrementSheetCount() {
    this.printCount.update(c => Math.min(1000, c + 1));
    this.setActiveSheet(this.printCount() - 1);
  }

  modalPreviewScale(): number {
    return 0.42;
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
    const count = Math.max(1, Number(this.printCount()) || 1);
    const prefix = this.printPrefix();
    const start = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();
    const syncQr = this.printSyncQr();

    // Mark and synchronize the primary ticket number element in the design if present
    const targetEl = this.getPrimaryTicketNoElement();
    if (targetEl) {
      this.updateElement(targetEl.id, x => {
        x['isTicketNo'] = true;
        x['ticketPrefix'] = prefix;
        x['ticketStart'] = start;
        x['ticketPad'] = pad;
        x['ticketSuffix'] = suffix;
        x['text'] = this.formatTicketNumber(prefix, start, pad, suffix);
      }, true);
    }

    const pages: Array<{ ticketNo: string; qrDataUrl?: string }> = [];

    const qrEl = d.config.elements.find(x => x.type === 'qr');
    const qrColor = String(qrEl?.['color'] || '#1e293b');
    const qrBg = String(qrEl?.['qrBackground'] || '#ffffff');

    // Generate perfectly sequential ticket numbers: start, start + 1, start + 2, ..., start + count - 1
    for (let i = 0; i < count; i++) {
      const currentNumber = start + i;
      const ticketNo = this.formatTicketNumber(prefix, currentNumber, pad, suffix);
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

    // Give DOM 450ms to render all sequential pages before opening print dialog
    setTimeout(() => {
      document.body.classList.add('printing-ticket');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-ticket');
        this.printPages.set([]);
      }, 1500);
    }, 450);
  }


  undo() {
    if (this.activeTool() === 'pen' && this.penPoints().length > 0) {
      this.undoPenPoint();
      return;
    }

    if (!this.canUndo()) return;
    const targetIdx = this.historyIndex() - 1;
    if (targetIdx < 0 || targetIdx >= this.history.length) return;

    const d = this.design();
    if (!d) return;

    this.isUndoingOrRedoing = true;
    const prevConfig = structuredClone(this.history[targetIdx]);
    this.historyIndex.set(targetIdx);

    this.design.update(cur => {
      if (!cur) return cur;
      const restored = structuredClone(cur);
      restored.config = prevConfig;
      restored.width = prevConfig.canvas.width;
      restored.height = prevConfig.canvas.height;
      restored.type = prevConfig.type;
      return restored;
    });

    this.background.set(prevConfig.canvas?.background || '#f4f1e8');
    this.backgroundImage.set(String(prevConfig.canvas?.backgroundImage || ''));
    this.backgroundMask.set(String(prevConfig.canvas?.backgroundMask || 'none'));
    this.rebuildQrPreviews(prevConfig);
    this.scheduleSave();
    this.isUndoingOrRedoing = false;
  }

  redo() {
    if (!this.canRedo()) return;
    const targetIdx = this.historyIndex() + 1;
    if (targetIdx >= this.history.length) return;

    const d = this.design();
    if (!d) return;

    this.isUndoingOrRedoing = true;
    const nextConfig = structuredClone(this.history[targetIdx]);
    this.historyIndex.set(targetIdx);

    this.design.update(cur => {
      if (!cur) return cur;
      const restored = structuredClone(cur);
      restored.config = nextConfig;
      restored.width = nextConfig.canvas.width;
      restored.height = nextConfig.canvas.height;
      restored.type = nextConfig.type;
      return restored;
    });

    this.background.set(nextConfig.canvas?.background || '#f4f1e8');
    this.backgroundImage.set(String(nextConfig.canvas?.backgroundImage || ''));
    this.backgroundMask.set(String(nextConfig.canvas?.backgroundMask || 'none'));
    this.rebuildQrPreviews(nextConfig);
    this.scheduleSave();
    this.isUndoingOrRedoing = false;
  }

  private rebuildQrPreviews(config: DesignConfig) {
    this.design.update(cur => {
      if (!cur) return cur;
      const restored = structuredClone(cur);
      restored.config.elements = restored.config.elements.map(el => {
        if (el.type !== 'qr') return el;
        const previous = cur.config.elements.find(item => item.id === el.id);
        return { ...el, qrDataUrl: previous?.['qrDataUrl'] || '' };
      });
      return restored;
    });
    for (const el of config.elements || []) {
      if (el.type === 'qr') this.generateQr(el);
    }
  }

  setTool(tool: 'select' | 'pen') {
    this.activeTool.set(tool);
    if (tool === 'select') {
      this.penHoverPoint.set(null);
    }
  }

  triggerUploadImage() {
    this.topbarLogoInput?.nativeElement.click();
  }

  onCanvasStageMove(e: PointerEvent) {
    if (this.activeTool() !== 'pen') return;
    const rect = this.canvasEl?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    const scale = this.canvasScale();
    this.penHoverPoint.set({
      x: Math.round((e.clientX - rect.left) / scale),
      y: Math.round((e.clientY - rect.top) / scale)
    });
  }

  onPenSvgClick(e: PointerEvent) {
    if (this.activeTool() !== 'pen') return;
    e.preventDefault();
    e.stopPropagation();
    const rect = this.canvasEl?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    const scale = this.canvasScale();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    this.penPoints.update(pts => [...pts, { x, y }]);
  }

  onPenAnchorClick(index: number, e: PointerEvent) {
    e.stopPropagation();
    if (index === 0 && this.penPoints().length >= 3) {
      this.applyPenClippingMask();
    }
  }

  onPenStartNodeClick(e: PointerEvent) {
    e.stopPropagation();
    if (this.penPoints().length >= 3) {
      this.applyPenClippingMask();
    }
  }

  penSvgPoints(): string {
    return this.penPoints().map(p => `${p.x},${p.y}`).join(' ');
  }

  undoPenPoint() {
    this.penPoints.update(pts => pts.slice(0, -1));
  }

  exitPenTool() {
    this.penPoints.set([]);
    this.penHoverPoint.set(null);
    this.activeTool.set('select');
  }

  applyPenClippingMask() {
    const pts = this.penPoints();
    if (pts.length < 3) return;
    const sel = this.selectedElement();
    if (sel && (sel.type === 'image' || sel.type === 'rectangle' || sel.type === 'circle')) {
      const w = Math.max(1, this.number(sel['width'], 100));
      const h = Math.max(1, this.number(sel['height'], 100));
      const poly = 'polygon(' + pts.map(p => {
        const px = Math.max(0, Math.min(100, Math.round(((p.x - sel.x) / w) * 1000) / 10));
        const py = Math.max(0, Math.min(100, Math.round(((p.y - sel.y) / h) * 1000) / 10));
        return `${px}% ${py}%`;
      }).join(', ') + ')';
      this.updateElement(sel.id, x => x['clip'] = poly);
    } else {
      const d = this.design();
      if (d) {
        const poly = 'polygon(' + pts.map(p => {
          const px = Math.max(0, Math.min(100, Math.round((p.x / d.width) * 1000) / 10));
          const py = Math.max(0, Math.min(100, Math.round((p.y / d.height) * 1000) / 10));
          return `${px}% ${py}%`;
        }).join(', ') + ')';
        this.backgroundMask.set(poly);
        this.mutate(cur => cur.config.canvas.backgroundMask = poly);
      }
    }
    this.exitPenTool();
  }

  createPenVectorShape() {
    const pts = this.penPoints();
    if (pts.length < 3) return;
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(30, maxX - minX);
    const height = Math.max(30, maxY - minY);
    const poly = 'polygon(' + pts.map(p => {
      const px = Math.max(0, Math.min(100, Math.round(((p.x - minX) / width) * 1000) / 10));
      const py = Math.max(0, Math.min(100, Math.round(((p.y - minY) / height) * 1000) / 10));
      return `${px}% ${py}%`;
    }).join(', ') + ')';

    this.addElement({
      id: crypto.randomUUID(),
      type: 'rectangle',
      x: minX,
      y: minY,
      width,
      height,
      fill: '#0d99ff',
      clip: poly,
      rotation: 0
    });
    this.exitPenTool();
  }

  startTracingSelectedElement(el: DesignElement) {
    this.selectedId.set(el.id);
    this.setTool('pen');
    this.penPoints.set([]);
  }

  removeElementMask(el: DesignElement) {
    this.updateElement(el.id, x => x['clip'] = 'none');
  }

  isCustomPolygon(val: unknown): boolean {
    return typeof val === 'string' && val.startsWith('polygon(');
  }

  closePdfViewerModal() {
    this.pdfViewerModalOpen.set(false);
  }

  zoomInPdf() {
    this.pdfZoom.update(z => Math.min(2.0, Math.round((z + 0.15) * 100) / 100));
  }

  zoomOutPdf() {
    this.pdfZoom.update(z => Math.max(0.35, Math.round((z - 0.15) * 100) / 100));
  }

  resetZoomPdf() {
    this.pdfZoom.set(0.75);
  }

  printFromPdfViewer() {
    this.closePdfViewerModal();
    this.executeBatchPrint();
  }

  async openFullPdfPreview() {
    this.pdfGenerating.set(true);
    this.pdfProgress.set(0);

    try {
      const items = await this.generatePdfPagesData();
      this.pdfPageItems.set(items);
      this.pdfCurrentPage.set(0);
      this.pdfZoom.set(0.75);
      this.pdfViewerModalOpen.set(true);
    } catch (err) {
      console.error('Error opening PDF preview:', err);
      this.error.set('Gagal memuat pratinjau PDF. Periksa gambar dan elemen tiket.');
    } finally {
      this.pdfGenerating.set(false);
    }
  }

  async saveDirectPdf() {
    this.pdfGenerating.set(true);
    this.pdfProgress.set(0);

    try {
      const items = await this.generatePdfPagesData();
      this.pdfPageItems.set(items);
      this.downloadPdfFile();
    } catch (err) {
      console.error('Error generating PDF:', err);
      this.error.set('Gagal membuat file PDF. Silakan coba lagi.');
    } finally {
      this.pdfGenerating.set(false);
    }
  }

  downloadPdfFile() {
    const items = this.pdfPageItems();
    if (items.length === 0) return;

    const layout = this.getEffectiveLayout();
    const isLandscape = layout.orientation === 'landscape';
    // Standard A4 in PDF points (72 pt/inch, 210 x 297 mm): 595 x 842 pt
    const widthPt = isLandscape ? 842 : 595;
    const heightPt = isLandscape ? 595 : 842;

    const pdfUint8 = this.buildPdfFromDataUrls(items.map(it => it.dataUrl), widthPt, heightPt);
    const blob = new Blob([pdfUint8.buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const cleanName = (this.design()?.name || 'Tiket').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const sheetCount = items.length;
    const ticketCount = this.printCount();
    a.download = `${cleanName}-${ticketCount}Tiket-${sheetCount}LembarA4.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 25000);
  }

  async generatePdfPagesData(): Promise<Array<{ ticketNo: string; dataUrl: string }>> {
    const d = this.design();
    if (!d) return [];

    const count = Math.max(1, Number(this.printCount()) || 1);
    const layout = this.getEffectiveLayout();
    const perSheet = layout.perSheet;
    const totalSheets = Math.ceil(count / perSheet);

    const prefix = this.printPrefix();
    const start = Number(this.printStartNo()) || 1;
    const pad = Number(this.printPad()) || 0;
    const suffix = this.printSuffix();
    const syncQr = this.printSyncQr();
    const showCutLines = this.printShowCutLines();
    const showCropMarks = this.printShowCropMarks();

    const qrEl = d.config.elements.find(x => x.type === 'qr');
    const qrColor = String(qrEl?.['color'] || '#1e293b');
    const qrBg = String(qrEl?.['qrBackground'] || '#ffffff');

    // Pre-cache background and logo images so they aren't reloaded repeatedly
    let cachedBgImg: HTMLImageElement | null = null;
    if (this.backgroundImage()) {
      try {
        cachedBgImg = await this.loadImage(this.backgroundImage());
      } catch (e) {
        console.warn('Failed to pre-cache background image:', e);
      }
    }

    const cachedImages = new Map<string, HTMLImageElement>();
    for (const el of d.config.elements) {
      if (el.type === 'image' && el['src']) {
        try {
          const img = await this.loadImage(String(el['src']));
          cachedImages.set(el.id, img);
        } catch (e) {
          console.warn('Failed to pre-cache image element:', el.id, e);
        }
      }
    }

    // A4 sheet canvas dimensions: 2970 x 2100 px (Landscape) or 2100 x 2970 px (Portrait)
    const isLandscape = layout.orientation === 'landscape';
    const sheetWidth = isLandscape ? 2970 : 2100;
    const sheetHeight = isLandscape ? 2100 : 2970;

    const canvas = document.createElement('canvas');
    canvas.width = sheetWidth;
    canvas.height = sheetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const items: Array<{ ticketNo: string; dataUrl: string }> = [];

    // Pre-generate all QR codes needed for the batch
    const qrCache = new Map<string, HTMLImageElement | null>();
    for (let i = 0; i < count; i++) {
      const ticketNo = this.formatTicketNumber(prefix, start + i, pad, suffix);
      if (syncQr) {
        try {
          const qrUrl = await QRCode.toDataURL(ticketNo, {
            width: 280,
            margin: 1,
            color: { dark: qrColor, light: qrBg },
            errorCorrectionLevel: 'H'
          });
          const img = await this.loadImage(qrUrl);
          qrCache.set(ticketNo, img);
        } catch {
          qrCache.set(ticketNo, null);
        }
      }
    }

    // Render each A4 paper sheet containing multiple tickets and cutting guides
    for (let s = 0; s < totalSheets; s++) {
      const startIdx = s * perSheet;
      const endIdx = Math.min(count, startIdx + perSheet);
      const sheetTickets: Array<{ ticketNo: string; qrImg: HTMLImageElement | null }> = [];

      for (let i = startIdx; i < endIdx; i++) {
        const ticketNo = this.formatTicketNumber(prefix, start + i, pad, suffix);
        const qrImg = qrCache.get(ticketNo) || null;
        sheetTickets.push({ ticketNo, qrImg });
      }

      const dataUrl = this.renderSheetWithMultipleTickets(
        canvas,
        ctx,
        sheetWidth,
        sheetHeight,
        layout,
        sheetTickets,
        {
          cachedBgImg,
          cachedImages,
          showCutLines,
          showCropMarks,
          sheetIndex: s,
          totalSheets
        }
      );

      const firstNo = sheetTickets[0]?.ticketNo || '';
      const lastNo = sheetTickets[sheetTickets.length - 1]?.ticketNo || '';
      const sheetLabel = sheetTickets.length > 1 ? `${firstNo} – ${lastNo} (${sheetTickets.length} Tiket)` : firstNo;

      items.push({ ticketNo: sheetLabel, dataUrl });
      this.pdfProgress.set(Math.round(((s + 1) / totalSheets) * 100));

      if (s % 2 === 0 && s > 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    return items;
  }

  renderSheetWithMultipleTickets(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    sheetWidth: number,
    sheetHeight: number,
    layout: { cols: number; rows: number; perSheet: number; orientation: 'portrait' | 'landscape' },
    sheetTickets: Array<{ ticketNo: string; qrImg: HTMLImageElement | null }>,
    opt: {
      cachedBgImg: HTMLImageElement | null;
      cachedImages: Map<string, HTMLImageElement>;
      showCutLines: boolean;
      showCropMarks: boolean;
      sheetIndex: number;
      totalSheets: number;
    }
  ): string {
    const d = this.design();
    if (!d) return '';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. Draw Paper Sheet Background (Pure White Paper)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetWidth, sheetHeight);

    const marginX = 100;
    const marginTop = 120;
    const marginBottom = 100;
    const availW = sheetWidth - marginX * 2;
    const availH = sheetHeight - marginTop - marginBottom;

    const cols = layout.cols;
    const rows = layout.rows;
    const gapX = cols > 1 ? 40 : 0;
    const gapY = rows > 1 ? 40 : 0;

    const cellW = (availW - (cols - 1) * gapX) / cols;
    const cellH = (availH - (rows - 1) * gapY) / rows;

    const ticketW = d.width || 1050;
    const ticketH = d.height || 600;

    // 2. Render each ticket inside its cell
    for (let i = 0; i < sheetTickets.length; i++) {
      const ticket = sheetTickets[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cellX = marginX + col * (cellW + gapX);
      const cellY = marginTop + row * (cellH + gapY);

      // Fit ticket proportionally inside cell with 12px safe inner breathing room
      const safePad = 12;
      const scale = Math.min((cellW - safePad * 2) / ticketW, (cellH - safePad * 2) / ticketH);
      const drawnW = ticketW * scale;
      const drawnH = ticketH * scale;
      const tx = cellX + (cellW - drawnW) / 2;
      const ty = cellY + (cellH - drawnH) / 2;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Draw ticket background
      ctx.fillStyle = this.backgroundImage() ? '#ffffff' : this.background();
      ctx.fillRect(0, 0, ticketW, ticketH);

      if (opt.cachedBgImg) {
        ctx.drawImage(opt.cachedBgImg, 0, 0, ticketW, ticketH);
      }

      // Draw ticket elements
      for (const el of d.config.elements) {
        if (el.type === 'background') continue;

        ctx.save();
        const ex = el.x;
        const ey = el.y;
        const rot = (Number(el['rotation']) || 0) * (Math.PI / 180);

        ctx.translate(ex, ey);
        if (rot) ctx.rotate(rot);

        if (el.type === 'rectangle') {
          const w = Number(el['width']) || 120;
          const h = Number(el['height']) || 70;
          ctx.fillStyle = String(el['fill'] || '#0d99ff');
          ctx.fillRect(0, 0, w, h);
        } else if (el.type === 'circle') {
          const w = Number(el['width']) || 120;
          const h = Number(el['height']) || 70;
          ctx.fillStyle = String(el['fill'] || '#0d99ff');
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (el.type === 'image') {
          const w = Number(el['width']) || 140;
          const h = Number(el['height']) || 90;
          const img = opt.cachedImages.get(el.id);
          if (img) ctx.drawImage(img, 0, 0, w, h);
        } else if (el.type === 'qr') {
          const w = Number(el['width']) || 120;
          const h = Number(el['height']) || 120;
          if (ticket.qrImg) ctx.drawImage(ticket.qrImg, 0, 0, w, h);
        } else if (el.type === 'text') {
          const isTicket = this.isPrimaryTicketNoEl(el);
          const textToDraw = isTicket ? ticket.ticketNo : String(el['text'] || '');
          const fontSize = Number(el['fontSize']) || 24;
          const fontWeight = el['fontWeight'] || 600;
          const fontFamily = el['fontFamily'] || 'DM Sans';
          const color = String(el['color'] || '#1e293b');

          ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;

          if (isTicket && el['ticketStyle'] && el['ticketStyle'] !== 'plain') {
            const metrics = ctx.measureText(textToDraw);
            const textW = metrics.width;
            const padX = 14;
            const padY = 6;
            const badgeW = textW + padX * 2;
            const badgeH = fontSize + padY * 2;

            const bg = String(el['badgeBg'] || '#ffffff');
            const border = String(el['badgeBorder'] || '#0d99ff');
            const radius = Number(el['badgeRadius']) || (el['ticketStyle'] === 'pill' ? 999 : 6);

            ctx.fillStyle = bg;
            this.drawRoundedRect(ctx, 0, -fontSize * 0.9, badgeW, badgeH, radius);
            ctx.fill();

            if (border) {
              ctx.strokeStyle = border;
              ctx.lineWidth = Number(el['badgeBorderWidth']) || 1.5;
              ctx.stroke();
            }

            ctx.fillStyle = color;
            ctx.fillText(textToDraw, padX, -fontSize * 0.9 + padY + fontSize * 0.72);
          } else {
            ctx.fillStyle = color;
            ctx.fillText(textToDraw, 0, fontSize * 0.82);
          }
        }

        ctx.restore();
      }

      // Fallback ticket badge if not explicit
      if (!this.hasTicketNoInElements()) {
        ctx.save();
        const textToDraw = ticket.ticketNo;
        const fontSize = 22;
        ctx.font = `700 ${fontSize}px "Space Mono", monospace`;
        const metrics = ctx.measureText(textToDraw);
        const badgeW = metrics.width + 28;
        const badgeH = fontSize + 16;
        const bx = ticketW - badgeW - 36;
        const by = 36;

        ctx.fillStyle = '#ffffff';
        this.drawRoundedRect(ctx, bx, by, badgeW, badgeH, 999);
        ctx.fill();

        ctx.strokeStyle = '#0d99ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0d99ff';
        ctx.fillText(textToDraw, bx + 14, by + fontSize + 3);
        ctx.restore();
      }

      ctx.restore();

      // Corner crop marks around ticket for cutting precision
      if (opt.showCropMarks) {
        const markLen = 22;
        const markDist = 8;
        ctx.save();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(tx - markDist, ty);
        ctx.lineTo(tx - markDist - markLen, ty);
        ctx.moveTo(tx, ty - markDist);
        ctx.lineTo(tx, ty - markDist - markLen);

        // Top-right
        ctx.moveTo(tx + drawnW + markDist, ty);
        ctx.lineTo(tx + drawnW + markDist + markLen, ty);
        ctx.moveTo(tx + drawnW, ty - markDist);
        ctx.lineTo(tx + drawnW, ty - markDist - markLen);

        // Bottom-left
        ctx.moveTo(tx - markDist, ty + drawnH);
        ctx.lineTo(tx - markDist - markLen, ty + drawnH);
        ctx.moveTo(tx, ty + drawnH + markDist);
        ctx.lineTo(tx, ty + drawnH + markDist - markLen);

        // Bottom-right
        ctx.moveTo(tx + drawnW + markDist, ty + drawnH);
        ctx.lineTo(tx + drawnW + markDist + markLen, ty + drawnH);
        ctx.moveTo(tx + drawnW, ty + drawnH + markDist);
        ctx.lineTo(tx + drawnW, ty + drawnH + markDist + markLen);

        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Draw Dashed Cutting Guides with Scissor Icons (Garis Potong)
    if (opt.showCutLines) {
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.8;

      // Vertical cutting lines between columns
      for (let c = 1; c < cols; c++) {
        const cutX = marginX + c * cellW + (c - 0.5) * gapX;
        ctx.beginPath();
        ctx.moveTo(cutX, marginTop - 30);
        ctx.lineTo(cutX, sheetHeight - marginBottom + 30);
        ctx.stroke();

        // Draw scissor symbols along the vertical line
        ctx.save();
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✂', cutX, marginTop - 15);
        ctx.fillText('✂', cutX, (marginTop + sheetHeight - marginBottom) / 2);
        ctx.fillText('✂', cutX, sheetHeight - marginBottom + 15);
        ctx.restore();
      }

      // Horizontal cutting lines between rows
      for (let r = 1; r < rows; r++) {
        const cutY = marginTop + r * cellH + (r - 0.5) * gapY;
        ctx.beginPath();
        ctx.moveTo(marginX - 30, cutY);
        ctx.lineTo(sheetWidth - marginX + 30, cutY);
        ctx.stroke();

        // Draw scissor symbols along the horizontal line
        ctx.save();
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✂', marginX - 15, cutY);
        ctx.fillText('✂', (marginX + sheetWidth - marginX) / 2, cutY);
        ctx.fillText('✂', sheetWidth - marginX + 15, cutY);
        ctx.restore();
      }

      ctx.restore();
    }

    // 4. Header & Footer Sheet Info
    ctx.save();
    ctx.font = '600 18px "DM Sans", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`${d.name} • Lembar ${opt.sheetIndex + 1} dari ${opt.totalSheets} • ${sheetTickets.length} Tiket per Lembar (Format A4)`, marginX, marginTop - 50);

    ctx.font = '700 16px monospace';
    ctx.fillStyle = '#0d99ff';
    ctx.textAlign = 'right';
    ctx.fillText(`✂ PANDUAN POTONG: Gunting Mengikuti Garis Putus-Putus`, sheetWidth - marginX, marginTop - 50);

    ctx.font = '500 15px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(`Nomor Tiket Lembar Ini: ${sheetTickets.map(t => t.ticketNo).join(', ')}`, marginX, sheetHeight - marginBottom + 55);

    ctx.textAlign = 'right';
    ctx.fillText(`Dicetak dengan TicketForge AI • Hemat Kertas A4`, sheetWidth - marginX, sheetHeight - marginBottom + 55);
    ctx.restore();

    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.92);
  }

    drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    const rad = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }

  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  buildPdfFromDataUrls(jpegDataUrls: string[], widthPt = 842, heightPt = 595): Uint8Array {
    const pageCount = jpegDataUrls.length;
    const objects: Array<{ id: number; data: Uint8Array | string }> = [];
    const pageObjIds: number[] = [];

    for (let i = 0; i < pageCount; i++) {
      const pageId = 3 + i * 3;
      pageObjIds.push(pageId);
    }

    objects.push({ id: 1, data: '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj' });
    objects.push({
      id: 2,
      data: `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>\nendobj`
    });

    const encoder = new TextEncoder();

    for (let i = 0; i < pageCount; i++) {
      const pageId = pageObjIds[i];
      const contentId = pageId + 1;
      const imgId = pageId + 2;
      const imgName = `Im${i + 1}`;

      const base64 = (jpegDataUrls[i].split(',')[1] || jpegDataUrls[i]).trim();
      const binaryStr = atob(base64);
      const imgBytes = new Uint8Array(binaryStr.length);
      for (let j = 0; j < binaryStr.length; j++) {
        imgBytes[j] = binaryStr.charCodeAt(j);
      }

      const imgW = Math.round(widthPt * 2);
      const imgH = Math.round(heightPt * 2);

      objects.push({
        id: pageId,
        data: `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Contents ${contentId} 0 R /Resources << /XObject << /${imgName} ${imgId} 0 R >> >> >>\nendobj`
      });

      const streamContent = `q ${widthPt} 0 0 ${heightPt} 0 0 cm /${imgName} Do Q`;
      objects.push({
        id: contentId,
        data: `${contentId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj`
      });

      const header = `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`;
      const footer = '\nendstream\nendobj';

      const hBytes = encoder.encode(header);
      const fBytes = encoder.encode(footer);
      const fullImgObj = new Uint8Array(hBytes.length + imgBytes.length + fBytes.length);
      fullImgObj.set(hBytes, 0);
      fullImgObj.set(imgBytes, hBytes.length);
      fullImgObj.set(fBytes, hBytes.length + imgBytes.length);

      objects.push({ id: imgId, data: fullImgObj });
    }

    objects.sort((a, b) => a.id - b.id);

    const pdfHeader = encoder.encode('%PDF-1.4\n');
    const chunks: Uint8Array[] = [pdfHeader];
    let currentOffset = pdfHeader.length;
    const offsets: number[] = [];

    for (const obj of objects) {
      offsets.push(currentOffset);
      let bytes: Uint8Array;
      if (typeof obj.data === 'string') {
        bytes = encoder.encode(obj.data + '\n');
      } else {
        const newline = encoder.encode('\n');
        const combined = new Uint8Array(obj.data.length + 1);
        combined.set(obj.data, 0);
        combined.set(newline, obj.data.length);
        bytes = combined;
      }
      chunks.push(bytes);
      currentOffset += bytes.length;
    }

    const startXref = currentOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
    chunks.push(encoder.encode(xref + trailer));

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const c of chunks) {
      result.set(c, pos);
      pos += c.length;
    }
    return result;
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
