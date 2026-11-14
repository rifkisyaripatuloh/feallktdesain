# TicketForge AI Frontend — font dan preset gaya ticket

## Font yang tersedia di editor
Frontend membundel font lokal melalui `@fontsource`, jadi pilihan font teks tidak tergantung request Google Fonts saat runtime. File CSS font di-import dari `src/main.ts` lewat `src/app/font-families.ts`. Pilihan editor meliputi DM Sans, Manrope, Montserrat, Space Grotesk, Playfair Display, Lora, Cormorant Garamond, Oswald, DM Mono, dan Space Mono. Font Family disimpan pada properti elemen `fontFamily` dalam config desain.

## Rekomendasi gaya
Di dialog rekomendasi, pengguna memilih jenis ticket, gaya visual (minimal, elegan, festival, konser malam, retro, profesional), dan menuliskan brief. Frontend menyisipkan tipe, brief, palet warna dan font yang dipilih ke prompt generator API, lalu menerapkan palet/font pilihan pada draft yang dikembalikan sebelum ditinjau. AI menyarankan struktur/layout; FE mengunci pilihan tema supaya rekomendasi tetap mengikuti gaya yang diminta.

Build check Angular TypeScript: `npx tsc --noEmit -p tsconfig.app.json`.

