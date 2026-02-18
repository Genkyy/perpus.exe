# 📋 Implementasi Fitur Baru - Perpustakaan

## Masalah yang Ditemukan

### 1. **Data Hilang Semua**
**Penyebab**: Kolom baru (`kelas`, `jenis_kelamin`, `status`) tidak ada di database lama
**Solusi**: Migration sudah dibuat di `20240218000001_update_members_table.sql`

### 2. **ID Anggota Tidak Reset**
**Penyebab**: Fungsi `generate_member_code` menggunakan `MAX(id)` yang tidak reset
**Solusi**: Sudah benar, ID tidak boleh reset (untuk menghindari duplikasi)

### 3. **Kolom Tidak Muncul**
**Penyebab**: Interface TypeScript tidak sinkron dengan database
**Solusi**: Update interface Member di App.tsx

---

## Perubahan yang Diperlukan

### A. Update Interface Member (App.tsx)

```typescript
interface Member {
  id: number;
  member_code: string;
  name: string;
  email?: string;           // Ubah jadi optional
  phone?: string;
  kelas?: string;           // ✅ TAMBAH
  jenis_kelamin?: string;   // ✅ TAMBAH
  status?: string;          // ✅ TAMBAH
  joined_at?: string;
}
```

### B. Update Form Data Member

Tambahkan field baru di form:
- **Kelas**: Input text atau select (X IPA 1, X IPA 2, dst)
- **Jenis Kelamin**: Select (Laki-laki / Perempuan)
- **Status**: Select (Aktif / Nonaktif)

### C. Detail Anggota - Tambah Informasi

Perlu menambahkan:
1. **Daftar buku yang sedang dipinjam**
2. **Total peminjaman dalam 30 hari terakhir**

**Backend Command Baru Diperlukan**:
```rust
#[tauri::command]
pub async fn get_member_loans(
    pool: State<'_, SqlitePool>,
    member_id: i64
) -> Result<Vec<LoanDetail>, String>

#[tauri::command]
pub async fn get_member_stats(
    pool: State<'_, SqlitePool>,
    member_id: i64
) -> Result<MemberStats, String>
```

### D. Detail Buku - Tambah Total Dipinjam

**Backend Command Baru**:
```rust
#[tauri::command]
pub async fn get_book_loan_count(
    pool: State<'_, SqlitePool>,
    book_id: i64
) -> Result<i64, String> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM loans 
         WHERE book_id = ? 
         AND loan_date >= datetime('now', '-1 year')"
    )
    .bind(book_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(count)
}
```

### E. Pengembalian - Informasi Peminjam

Tampilkan berapa buku yang sedang dipinjam member:
```typescript
interface MemberLoanInfo {
  member_id: number;
  member_name: string;
  member_code: string;
  active_loans_count: number;
  overdue_count: number;
}
```

### F. Pengembalian - Tabel Buku Terlambat

**Backend Command**:
```rust
#[tauri::command]
pub async fn get_overdue_loans(
    pool: State<'_, SqlitePool>
) -> Result<Vec<LoanDetail>, String> {
    let loans = sqlx::query_as::<_, LoanDetail>(
        r#"
        SELECT 
            l.id, l.book_id, l.member_id,
            b.title as book_title, b.isbn as book_isbn, b.cover as book_cover,
            m.name as member_name, m.member_code,
            l.loan_date, l.due_date, l.status,
            CAST(
                MAX(0, (julianday('now') - julianday(l.due_date))) * 1000 
            AS INTEGER) as fine_amount
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE l.status = 'borrowed'
        AND l.due_date < datetime('now')
        ORDER BY l.due_date ASC
        "#
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(loans)
}
```

---

## Langkah Implementasi

### Step 1: Jalankan Migration Database
```bash
# Database akan otomatis ter-migrate saat aplikasi dijalankan
# Atau manual dengan:
cd src-tauri
cargo tauri dev
```

### Step 2: Update Backend (Rust)

File: `src-tauri/src/commands.rs`
- Tambahkan command `get_member_loans`
- Tambahkan command `get_member_stats`
- Tambahkan command `get_book_loan_count`
- Tambahkan command `get_overdue_loans`

File: `src-tauri/src/lib.rs`
- Register command baru

### Step 3: Update Frontend (TypeScript)

File: `src/App.tsx`
- Update interface `Member`
- Update form tambah/edit member
- Update detail member dengan loan info
- Update detail buku dengan loan count
- Update halaman pengembalian dengan overdue table

---

## Contoh Implementasi Form Member

```typescript
// Form fields untuk Member
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
  {/* Nama */}
  <div style={{ gridColumn: 'span 2' }}>
    <label>Nama Lengkap *</label>
    <input 
      value={formData.name || ""} 
      onChange={e => setFormData({...formData, name: e.target.value})}
      required 
    />
  </div>

  {/* Kelas */}
  <div>
    <label>Kelas</label>
    <input 
      value={formData.kelas || ""} 
      onChange={e => setFormData({...formData, kelas: e.target.value})}
      placeholder="Contoh: X IPA 1"
    />
  </div>

  {/* Jenis Kelamin */}
  <div>
    <label>Jenis Kelamin</label>
    <select 
      value={formData.jenis_kelamin || ""} 
      onChange={e => setFormData({...formData, jenis_kelamin: e.target.value})}
    >
      <option value="">Pilih...</option>
      <option value="Laki-laki">Laki-laki</option>
      <option value="Perempuan">Perempuan</option>
    </select>
  </div>

  {/* Phone */}
  <div>
    <label>Nomor Telepon</label>
    <input 
      type="tel"
      value={formData.phone || ""} 
      onChange={e => setFormData({...formData, phone: e.target.value})}
    />
  </div>

  {/* Status */}
  <div>
    <label>Status</label>
    <select 
      value={formData.status || "Aktif"} 
      onChange={e => setFormData({...formData, status: e.target.value})}
    >
      <option value="Aktif">Aktif</option>
      <option value="Nonaktif">Nonaktif</option>
    </select>
  </div>
</div>
```

---

## Testing Checklist

- [ ] Migration database berhasil
- [ ] Tambah member dengan field baru
- [ ] Edit member dengan field baru
- [ ] Detail member menampilkan buku yang dipinjam
- [ ] Detail member menampilkan total pinjaman 30 hari
- [ ] Detail buku menampilkan total dipinjam 1 tahun
- [ ] Hapus buku menghapus riwayat
- [ ] Halaman pengembalian menampilkan info peminjam
- [ ] Halaman pengembalian menampilkan tabel overdue

---

## File yang Perlu Diubah

1. ✅ `src-tauri/migrations/20240218000001_update_members_table.sql` - SUDAH DIBUAT
2. ✅ `src-tauri/migrations/20240218000002_add_book_deleted_at.sql` - SUDAH DIBUAT
3. ⏳ `src-tauri/src/commands.rs` - PERLU UPDATE
4. ⏳ `src-tauri/src/lib.rs` - PERLU UPDATE
5. ⏳ `src/App.tsx` - PERLU UPDATE (interface + UI)

---

## Catatan Penting

⚠️ **ID Anggota Tidak Reset dari 0**
Ini adalah **DESAIN YANG BENAR**. ID tidak boleh reset karena:
- Mencegah duplikasi ID
- Menjaga integritas referensi database
- Standar best practice database

Format ID: `MBR-0001`, `MBR-0002`, dst. akan terus increment meskipun ada yang dihapus.

⚠️ **Data Hilang**
Jika data hilang setelah migration, kemungkinan:
1. Database file corrupt
2. Migration tidak jalan
3. Query SELECT tidak include kolom baru

Solusi: Cek file database di `src-tauri/target/debug/` atau `AppData`
