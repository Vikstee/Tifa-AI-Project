# TIFA WhatsApp Worker Modes

Pilih mode worker sesuai tempat API yang dipakai.

## Mode lokal

Gunakan saat kamu menjalankan Next.js di laptop sendiri.

```powershell
npm run dev
npm run worker:local
```

Mode ini akan otomatis mengarah ke:

- `TIFA_BASE_URL=http://127.0.0.1:4028`

## Mode Vercel

Gunakan saat web/API sudah deploy di Vercel dan worker tetap jalan di VPS atau laptop.

```powershell
npm run worker:vercel
```

Mode ini akan otomatis mengarah ke:

- `TIFA_BASE_URL=https://tifa-ai-assistant.vercel.app`

## Env yang tetap dibutuhkan

- `WHATSAPP_INTERNAL_TOKEN`
- `WHATSAPP_ALLOWED_GROUP_IDS` jika mau bypass whitelist Supabase untuk grup tertentu
- `WHATSAPP_AUTH_DIR` kalau kamu ingin auth WhatsApp disimpan di folder tertentu
