# TIFA — TelkomInfra Financial Assistant

TIFA adalah AI Assistant berbasis chat yang dirancang khusus untuk **TelkomInfra** — membantu tim keuangan dan proyek dalam menganalisis data, membuat laporan, dan mendapatkan insight finansial secara cepat dan akurat.

---

## 🚀 Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, React |
| **Styling** | Tailwind CSS, Recharts (visualisasi) |
| **AI Engine** | xAI Grok API (`grok-4.20-non-reasoning-latest` & `llama-3.3-70b-versatile`) |
| **Python Backend** | FastAPI (Python 3.10+) |
| **Database** | MySQL 8 (`tifa_db`) — 100% MySQL via Laragon / MySQL Server |
| **PDF/Export** | Puppeteer + @sparticuz/chromium |
| **WhatsApp** | Baileys / Fonnte Worker |

---

## 📁 Struktur Folder

```
Tifa/
├── .agents/                          # Custom AI agent skills
│   └── skills/
│       └── laporan-eksekutif-tifa/   # Skill pembuatan laporan PDF/Excel/Word
│           └── SKILL.md
│
├── api/                              # Python FastAPI backend
│   ├── index.py                      # Entry point FastAPI
│   └── services/
│       ├── anomaly_detector.py       # Deteksi anomali data keuangan
│       ├── chart_aggregator.py       # Agregasi data untuk chart
│       ├── db_helper.py              # MySQL query helper functions
│       ├── forecasting.py            # Forecasting & prediksi tren
│       ├── rag_parser.py             # RAG: parsing dokumen & file
│       ├── report_aggregator.py      # Agregasi data laporan keuangan
│       ├── sql_agent.py              # SQL agent untuk query natural language
│       └── vector_search.py         # Semantic search / pencarian vektor
│
├── db/                               # Database schema & utility scripts
│   ├── schema_mysql.sql              # ⭐ DDL utama — seluruh tabel MySQL tifa_db
│   ├── whatsapp_tifa.sql             # Tabel khusus WhatsApp worker
│   ├── import_excel_to_mysql.py      # Import data Excel ke MySQL
│   └── import_sql_to_mysql.py        # Import SQL dump ke MySQL
│
├── docs/                             # Data & dokumentasi referensi
│   ├── data_po-cashin.sql            # SQL dump data keuangan utama (PO & Cash In)
│   └── TUTORIAL.md                   # ⭐ Panduan lengkap jalankan aplikasi
│
├── scripts/                          # Dev & deployment scripts
│   ├── dev-launcher.mjs              # Menjalankan Next.js + Python backend sekaligus
│   ├── init-mysql-db.mjs             # Inisialisasi & migrate database MySQL
│   ├── whatsapp-worker.mjs           # WhatsApp bot worker (Baileys)
│   └── whatsapp-worker-launcher.mjs  # Launcher WhatsApp worker
│
├── public/                           # Static assets
│   ├── logo_utama.png
│   ├── logo_sidebar_dark.png
│   └── logo_sidebar_light.png
│
└── src/
    ├── app/                          # Next.js App Router
    │   ├── api/
    │   │   ├── auth/                 # Login, Register, Profile endpoints
    │   │   ├── chat/
    │   │   │   ├── route.ts          # ⭐ Endpoint utama AI chat (xAI Grok)
    │   │   │   └── history/route.ts  # Riwayat chat per user
    │   │   ├── welcome/route.ts      # Pesan sambutan + analisis singkat
    │   │   └── whatsapp/
    │   │       ├── internal/route.ts # Handler pesan masuk WhatsApp
    │   │       ├── report/route.ts   # Kirim laporan via WhatsApp
    │   │       └── visual/route.ts   # Kirim chart/visual via WhatsApp
    │   ├── login/                    # Halaman Login
    │   ├── share/[id]/               # Halaman share public chat
    │   ├── layout.tsx                # Root layout
    │   └── page.tsx                  # Halaman utama chat
    │
    ├── components/
    │   ├── features/
    │   │   ├── chat/               # ChatArea, MessageBubble, InputBar, dll
    │   │   ├── layout/             # Sidebar
    │   │   ├── modals/             # Auth, Profile, Settings, Share modal
    │   │   └── reports/            # ChartViewer, ReportCard, DataTable
    │   └── ui/                     # AppIcon, AppImage, AppLogo
    │
    └── lib/
        ├── ai/
        │   └── geminiTools.ts        # Dynamic function calling tools
        ├── api/
        │   └── pythonClient.ts       # HTTP client ke Python FastAPI
        ├── auth/
        │   └── userAuth.ts           # Auth helpers (JWT, MySQL user)
        ├── cache/
        │   └── responseCache.ts      # Cache layer untuk respons AI
        ├── db/
        │   ├── mysqlClient.ts        # ⭐ MySQL connection pool (mysql2)
        │   └── mysqlQueries.ts       # ⭐ Query functions (CRUD, lookup, aggregate)
        ├── reportGenerator.ts        # ⭐ Generator PDF/Excel/Word (Puppeteer)
        ├── serverBrowser.ts          # Puppeteer browser launcher
        └── timezone.ts               # WIB timezone helper
```

---

## ⚙️ Setup & Menjalankan Singkat

Panduan rinci dapat dibaca di **[`docs/TUTORIAL.md`](file:///d:/coding/Tifa/docs/TUTORIAL.md)**.

```bash
# 1. Install dependensi Node.js & Python
npm install
pip install -r requirements.txt

# 2. Inisialisasi Database MySQL (Laragon)
npm run db:init
python db/import_sql_to_mysql.py

# 3. Jalankan aplikasi web
npm run dev
```

---

## 🗄️ Database MySQL (`tifa_db`)

| Tabel | Keterangan |
|---|---|
| `users` | Data pengguna TIFA |
| `chat_sessions` | Sesi percakapan per user |
| `chat_messages` | Isi pesan chat (user + AI) |
| `user_memories` | Memori karakteristik user untuk personalisasi AI |
| `ai_knowledge_bank` | Bank pengetahuan AI (konteks khusus proyek) |
| `data_po-cashin` | ⭐ **Tabel utama data keuangan** — PO, Revenue, Cash In, BAST, RKAP (2021–2026+) |
| `whatsapp_tifa_requests` | Log request masuk dari WhatsApp |

---

## 🤖 Alur AI Chat

```
User → POST /api/chat
  ├─ Auth user dari MySQL (users table)
  ├─ Ambil memori user dari MySQL (user_memories)
  ├─ Pre-fetch agregasi data keuangan dinamis dari `data_po-cashin`
  │     (GROUP BY tahun dinamis, portofolio, TOP 5 proyek)
  ├─ Kirim ke xAI Grok API
  └─ Simpan pesan ke chat_sessions + chat_messages
```
