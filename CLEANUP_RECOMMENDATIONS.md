# 🧹 Rekomendasi Pembersihan Proyek Perpustakaan

## File yang Harus Dihapus

### 1. File Referensi & Temporary
```bash
# Hapus file-file ini:
- books_view_part.txt       # Kode lama yang tidak terpakai
- refrensi.html             # Referensi desain saja
- refrensi2.html            # Referensi desain saja
- ts_errors.txt             # File log error
- src/Dashboard.css         # CSS yang tidak digunakan
```

### 2. Dependencies yang Tidak Terpakai
Hapus dari `package.json`:
```json
{
  "dependencies": {
    "lucide-react": "^0.563.0",      // ❌ Tidak digunakan
    "chart.js": "^4.5.1",            // ❌ Tidak digunakan
    "react-chartjs-2": "^5.3.1",     // ❌ Tidak digunakan
    "date-fns": "^4.1.0"             // ❌ Tidak digunakan
  }
}
```

## Masalah Kode yang Perlu Diperbaiki

### 1. Inline Styles Berlebihan
**Masalah**: Terlalu banyak inline styles di `App.tsx` (2500+ baris)
**Solusi**: Pindahkan ke CSS modules atau styled-components

### 2. Duplikasi Kode
**Masalah**: Beberapa komponen memiliki style yang sama
**Solusi**: Buat reusable components

### 3. Mock Data di Production
**Masalah**: Fungsi `safeInvoke` masih memiliki mock data
**Solusi**: Hapus mock data setelah backend selesai

## Langkah-Langkah Pembersihan

### Step 1: Hapus File yang Tidak Terpakai
```bash
# Di terminal PowerShell:
Remove-Item "books_view_part.txt"
Remove-Item "refrensi.html"
Remove-Item "refrensi2.html"
Remove-Item "ts_errors.txt"
Remove-Item "src\Dashboard.css"
```

### Step 2: Bersihkan Dependencies
```bash
npm uninstall lucide-react chart.js react-chartjs-2 date-fns
```

### Step 3: Verifikasi Build
```bash
npm run build
```

## Struktur Proyek yang Disarankan

```
Perpustakaan/
├── src/
│   ├── components/
│   │   ├── AlertSystem.tsx        ✅ Sudah ada
│   │   ├── Dashboard/             🆕 Pisahkan dashboard
│   │   ├── Books/                 🆕 Pisahkan books view
│   │   ├── Members/               🆕 Pisahkan members view
│   │   └── Loans/                 🆕 Pisahkan loans view
│   ├── styles/
│   │   ├── index.css              ✅ Sudah ada
│   │   └── App.css                ✅ Sudah ada
│   ├── utils/
│   │   └── safeInvoke.ts          🆕 Pisahkan helper
│   ├── types/
│   │   └── index.ts               🆕 Pisahkan types
│   ├── App.tsx                    ✅ Sudah ada
│   └── main.tsx                   ✅ Sudah ada
├── src-tauri/                     ✅ Sudah ada
└── package.json                   ✅ Sudah ada
```

## Estimasi Pengurangan Ukuran

- **File yang dihapus**: ~60 KB
- **Dependencies yang dihapus**: ~15 MB (node_modules)
- **Total penghematan**: ~15 MB

## Prioritas

### 🔴 Prioritas Tinggi
1. Hapus file referensi (refrensi.html, refrensi2.html)
2. Hapus file temporary (ts_errors.txt, books_view_part.txt)
3. Hapus dependencies yang tidak terpakai

### 🟡 Prioritas Sedang
1. Hapus Dashboard.css
2. Refactor inline styles
3. Pisahkan komponen besar

### 🟢 Prioritas Rendah
1. Optimasi struktur folder
2. Tambahkan unit tests
3. Dokumentasi kode

## Catatan Penting

⚠️ **Sebelum menghapus file apapun, pastikan untuk:**
1. Backup proyek Anda
2. Commit perubahan ke Git
3. Test aplikasi setelah pembersihan

✅ **Setelah pembersihan:**
1. Jalankan `npm install` untuk update dependencies
2. Jalankan `npm run build` untuk verifikasi
3. Test semua fitur aplikasi
