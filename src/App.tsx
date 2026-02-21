import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./App.css";
import { useAlert } from "./components/AlertSystem";

/* eslint-disable jsx-a11y/no-inline-styles */

// Types
interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher?: string;
  published_year?: number;
  rack_location?: string;
  barcode?: string;
  total_copy: number;
  available_copy: number;
  cover?: string;
  status?: string;
}

interface Member {
  id: number;
  member_code: string;
  name: string;
  email?: string;
  phone?: string;
  kelas?: string;
  jenis_kelamin?: string;
  status?: string;
  joined_at?: string;
}


interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface LoanDetail {
  id: number;
  book_id: number;
  member_id: number;
  book_title: string;
  book_isbn: string;
  book_cover?: string;
  member_name: string;
  member_code: string;
  member_kelas?: string;
  loan_date: string;
  due_date: string;
  status: string;
  member_active_loans: number;
  member_status?: string;
}

// Helper to handle invoke safely in browser for preview
const safeInvoke = async (cmd: string, args: any = {}): Promise<any> => {
  if (window.hasOwnProperty("__TAURI_INTERNALS__") || window.hasOwnProperty("__TAURI__")) {
    return await invoke(cmd, args);
  }

  // Mock data for Browser Preview
  console.warn(`Browser Preview: Mocking Tauri command "${cmd}"`);

  if (cmd === "login") {
    if (args.username === "admin" && args.password === "admin123") {
      return { id: 1, username: "admin", name: "Administrator", role: "admin" };
    } else {
      throw "Username atau password salah";
    }
  }

  const mocks: any = {
    "get_book_borrowers": [],
    "get_stats": { total_books: 12450, total_members: 892, active_loans: 45, overdue_loans: 12 },
    "get_books": [
      { id: 1, title: "Laskar Pelangi", author: "Andrea Hirata", isbn: "978-979-3062-79-1", category: "Fiksi", total_copy: 8, available_copy: 5 },
      { id: 2, title: "Bumi Manusia", author: "Pramoedya Ananta Toer", isbn: "978-602-9144-01-6", category: "Sejarah", total_copy: 12, available_copy: 8 },
      { id: 3, title: "Clean Code", author: "Robert C. Martin", isbn: "978-013-2350-88-4", category: "Teknologi", total_copy: 5, available_copy: 3 },
      { id: 4, title: "The Midnight Library", author: "Matt Haig", isbn: "978-052-5559-47-4", category: "Fiksi", total_copy: 10, available_copy: 0 },
      { id: 5, title: "Sapiens", author: "Yuval Noah Harari", isbn: "978-006-2316-09-7", category: "Sejarah", total_copy: 15, available_copy: 12 }
    ],
    "get_members": [
      { id: 1, member_code: "MBR001", name: "Budi Santoso", email: "budi@mail.com", phone: "0812345" }
    ],
    "get_active_loans": [
      { id: 1, book_title: "Atomic Habits", member_name: "Michael Chen", loan_date: new Date().toISOString(), due_date: new Date(Date.now() + 604800000).toISOString(), status: "borrowed" }
    ],
    "get_recent_activity": [
      { id: "L-1", title: "Michael Chen", description: 'meminjam "Atomic Habits"', time: new Date().toISOString(), type_name: "loan" },
      { id: "M-1", title: "Sarah Williams", description: "Bergabung sebagai anggota baru", time: new Date(Date.now() - 3600000).toISOString(), type_name: "member" }
    ],
    "get_weekly_circulation": [
      { day: "Minggu", count: 12 }, { day: "Senin", count: 25 }, { day: "Selasa", count: 18 }, { day: "Rabu", count: 32 }, { day: "Kamis", count: 45 }, { day: "Jumat", count: 28 }, { day: "Sabtu", count: 15 }
    ],
    "get_member_loans": [
      { id: 1, book_title: "Atomic Habits", member_name: "Michael Chen", member_code: "MBR001", loan_date: new Date().toISOString(), due_date: new Date(Date.now() + 604800000).toISOString(), status: "borrowed", member_status: "Aktif" }
    ],
    "get_member_borrowing_history": [
      { id: 1, book_id: 1, book_title: "Laskar Pelangi", book_isbn: "978-979-3062-79-1", loan_date: "2025-11-12T00:00:00Z", due_date: "2025-11-26T00:00:00Z", return_date: "2025-11-26T00:00:00Z", status: "returned" },
      { id: 2, book_id: 2, book_title: "Bumi Manusia", book_isbn: "978-602-9144-01-6", loan_date: "2025-05-01T00:00:00Z", due_date: "2025-05-15T00:00:00Z", return_date: null, status: "borrowed" },
      { id: 3, book_id: 3, book_title: "Clean Code", book_isbn: "978-013-2350-88-4", loan_date: "2025-02-15T00:00:00Z", due_date: "2025-03-01T00:00:00Z", return_date: "2025-03-01T00:00:00Z", status: "returned" },
      { id: 4, book_id: 4, book_title: "The Midnight Library", book_isbn: "978-052-5559-47-4", loan_date: "2025-06-10T00:00:00Z", due_date: "2025-06-24T00:00:00Z", return_date: null, status: "borrowed" },
      { id: 5, book_id: 5, book_title: "Sapiens", book_isbn: "978-006-2316-09-7", loan_date: "2024-12-05T00:00:00Z", due_date: "2024-12-19T00:00:00Z", return_date: "2024-12-19T00:00:00Z", status: "returned" },
      { id: 6, book_id: 1, book_title: "Educated", book_isbn: "978-979-3062-79-1", loan_date: "2025-01-20T00:00:00Z", due_date: "2025-02-03T00:00:00Z", return_date: "2025-02-03T00:00:00Z", status: "returned" }
    ],
    "find_active_loan": [
      { id: 1, book_title: "Atomic Habits", book_isbn: "978-052-5559-47-4", member_name: "Michael Chen", member_code: "MBR001", member_status: "Aktif", loan_date: new Date().toISOString(), due_date: new Date(Date.now() + 604800000).toISOString(), status: "borrowed", member_active_loans: 1 }
    ],
    "get_overdue_loans": []
  };

  return mocks[cmd] || (cmd.startsWith("add_") ? 1 : null);
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState("dashboard");
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const s = await safeInvoke('get_settings');
        if (s && s.theme) {
          document.documentElement.setAttribute('data-theme', s.theme);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [view, user]);

  const loadData = async () => {
    try {
      if (view === "books") {
        const data = await safeInvoke("get_books");
        setBooks(data);
      } else if (view === "members") {
        const data = await safeInvoke("get_members");
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
            <span className="material-symbols-outlined">library_books</span>
          </div>
          <div className="logo-text">
            <h1>LibAdmin</h1>
            <p>SMA Persada Bunda</p>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-item ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </button>
          <button
            className={`nav-item ${view === "loans" ? "active" : ""}`}
            onClick={() => setView("loans")}
          >
            <span className="material-symbols-outlined">bookmark_add</span> Peminjaman
          </button>
          <button
            className={`nav-item ${view === "returns" ? "active" : ""}`}
            onClick={() => setView("returns")}
          >
            <span className="material-symbols-outlined">assignment_return</span> Pengembalian
          </button>
          <button
            className={`nav-item ${view === "books" ? "active" : ""}`}
            onClick={() => setView("books")}
          >
            <span className="material-symbols-outlined">menu_book</span> Katalog Buku
          </button>
          <button
            className={`nav-item ${view === "members" ? "active" : ""}`}
            onClick={() => setView("members")}
          >
            <span className="material-symbols-outlined">group</span> Data Anggota
          </button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-item" onClick={() => setUser(null)} style={{ color: '#ef4444' }}>
            <span className="material-symbols-outlined">logout</span> Keluar
          </button>
          <button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
            <span className="material-symbols-outlined">settings</span> Pengaturan
          </button>
        </div>


        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="profile-img"></div>
            <div className="profile-info">
              <p>{user.name}</p>
              <p>{user.role === 'admin' ? 'Administrator' : 'Staf Pustaka'}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "dashboard" && <DashboardView setView={setView} />}
            {view === "books" && (
              <BooksView
                books={books}
                onRefresh={loadData}
              />
            )}
            {view === "members" && (
              <MembersView
                members={members}
                onRefresh={loadData}
              />
            )}
            {view === "loans" && (
              <LoansView
                onRefresh={loadData}
              />
            )}
            {view === "returns" && <ReturnsView />}
            {view === "settings" && <SettingsView user={user} onProfileUpdate={setUser} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function ReturnsView() {
  const [query, setQuery] = useState("");
  const [activeLoans, setActiveLoans] = useState<LoanDetail[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanDetail | null>(null);
  const [recentReturns, setRecentReturns] = useState<LoanDetail[]>([]);
  const [overdueList, setOverdueList] = useState<LoanDetail[]>([]);
  const { showAlert, showConfirm } = useAlert();

  useEffect(() => {
    loadOverdue();
    loadRecentReturns();
  }, []);

  const loadRecentReturns = async () => {
    try {
      const results = await safeInvoke("get_recent_returns", { limit: 10 });
      if (Array.isArray(results)) {
        setRecentReturns(results);
      }
    } catch (err) {
      console.error("Failed to load recent returns:", err);
    }
  };

  const loadOverdue = async () => {
    try {
      const results = await safeInvoke("get_overdue_loans", {});
      setOverdueList(results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const results = await safeInvoke("find_active_loan", { query });
      if (Array.isArray(results) && results.length > 0) {
        setActiveLoans(results);
        if (results.length === 1) {
          setSelectedLoan(results[0]);
        } else {
          setSelectedLoan(null);
        }
        setQuery("");
      } else {
        await showAlert("Data tidak ditemukan");
        setActiveLoans([]);
        setSelectedLoan(null);
      }
    } catch (err) {
      await showAlert("Error: " + err);
      setActiveLoans([]);
      setSelectedLoan(null);
    }
  };

  const handleReturnAction = async (loan: LoanDetail) => {
    const confirmed = await showConfirm(`Selesaikan pengembalian buku "${loan.book_title}"?`);
    if (confirmed) {
      try {
        await safeInvoke("return_book", { loanId: loan.id });
        await showAlert("Buku berhasil dikembalikan!", "success");

        // Update local state
        const remaining = activeLoans.filter(l => l.id !== loan.id);
        setActiveLoans(remaining);
        if (selectedLoan?.id === loan.id) {
          setSelectedLoan(remaining.length === 1 ? remaining[0] : null);
        }

        // Reload recent returns
        loadRecentReturns();
        loadOverdue();
      } catch (err) {
        await showAlert("Gagal mengembalikan buku: " + err, "error");
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysLate = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div style={{ margin: '-40px', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>Pengembalian Buku</h2>
          <p style={{ color: '#64748b' }}>Scan barcode buku atau masukkan ID anggota untuk memproses pengembalian.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waktu Lokal</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} | {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Search Bar */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ position: 'relative', maxWidth: '768px' }}>
          <div style={{ position: 'absolute', left: '16px', top: '0', bottom: '0', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: '1.875rem' }}>barcode_scanner</span>
          </div>
          <input
            autoFocus
            className="login-input"
            style={{
              width: '100%',
              paddingLeft: '64px',
              paddingRight: '128px',
              height: '72px',
              borderRadius: '16px',
              fontSize: '1.25rem',
              fontWeight: 500,
              border: '2px solid #e2e8f0',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
            placeholder="Scan Barcode atau Masukkan ID Buku / Anggota"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div style={{ position: 'absolute', right: '12px', top: '0', bottom: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ENTER</span>
            <button
              onClick={handleSearch}
              className="btn-primary"
              style={{ padding: '8px 24px', borderRadius: '12px', fontWeight: 700, height: '48px', boxShadow: '0 4px 6px -1px rgba(19, 127, 236, 0.2)' }}
            >
              Cari
            </button>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '32px' }}>
        {/* Main Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {activeLoans.length > 1 && (
            <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>group_work</span>
                Buku yang sedang dipinjam:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {activeLoans.map(loan => (
                  <div
                    key={loan.id}
                    onClick={() => setSelectedLoan(loan)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: selectedLoan?.id === loan.id ? '2px solid var(--primary)' : '1px solid #f1f5f9',
                      backgroundColor: selectedLoan?.id === loan.id ? 'rgba(19, 127, 236, 0.05)' : 'white',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '40px', height: '56px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0 }}>
                      {loan.book_cover && <img src={loan.book_cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: '0.813rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loan.book_title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                        <p style={{ fontSize: '0.688rem', color: getDaysLate(loan.due_date) > 0 ? '#ef4444' : '#64748b', margin: 0, fontWeight: getDaysLate(loan.due_date) > 0 ? 600 : 400 }}>
                          {getDaysLate(loan.due_date) > 0 ? 'Terlambat!' : `Tempo: ${formatDate(loan.due_date)}`}
                        </p>
                        <p style={{ fontSize: '0.688rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
                          {loan.member_name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedLoan ? (
            <div className="content-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: getDaysLate(selectedLoan.due_date) > 0 ? '#fee2e2' : '#fef3c7',
                  color: getDaysLate(selectedLoan.due_date) > 0 ? '#ef4444' : '#b45309',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {getDaysLate(selectedLoan.due_date) > 0 ? 'Status: Terlambat' : 'Status: Dipinjam'}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>ID Pinjam: #{selectedLoan.id}</span>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '32px' }}>
                  <div style={{ width: '192px', flexShrink: 0 }}>
                    <div style={{ aspectRatio: '3/4', backgroundColor: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      {selectedLoan.book_cover ? (
                        <img src={selectedLoan.book_cover} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#cbd5e1' }}>book</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>{selectedLoan.book_title}</h3>
                      <p style={{ color: '#64748b', fontWeight: 500 }}>ISBN: {selectedLoan.book_isbn}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                      <div>
                        <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' }}>Peminjam</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>{selectedLoan.member_name}</p>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            backgroundColor: selectedLoan.member_status === 'Aktif' || selectedLoan.member_status === 'Active' ? '#dcfce7' : '#fee2e2',
                            color: selectedLoan.member_status === 'Aktif' || selectedLoan.member_status === 'Active' ? '#16a34a' : '#ef4444'
                          }}>
                            {selectedLoan.member_status || 'Unknown'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {selectedLoan.member_code}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Jatuh Tempo</p>
                        <p style={{ fontWeight: 700, color: getDaysLate(selectedLoan.due_date) > 0 ? '#ef4444' : '#1e293b' }}>
                          {formatDate(selectedLoan.due_date)}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {getDaysLate(selectedLoan.due_date) > 0 ? `Terlambat ${getDaysLate(selectedLoan.due_date)} hari` : 'Masih dalam periode pinjam'}
                        </p>
                      </div>
                    </div>


                  </div>
                </div>
              </div>
              <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleReturnAction(selectedLoan)}
                  className="btn-primary"
                  style={{
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontSize: '1.125rem',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 10px 15px -3px rgba(19, 127, 236, 0.3)'
                  }}
                >
                  <span className="material-symbols-outlined">task_alt</span>
                  Selesaikan Pengembalian
                </button>
              </div>
            </div>
          ) : activeLoans.length === 0 && (
            <div className="content-card" style={{ padding: '64px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '16px' }}>search</span>
              <p style={{ fontSize: '1.25rem' }}>Silakan scan buku atau anggota untuk memulai</p>
            </div>
          )}
        </div>

        {/* Sidebar Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Borrower Account Info */}
          {selectedLoan && (
            <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Informasi Akun Peminjam</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                  {selectedLoan.member_name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 900, color: '#0f172a', margin: 0, fontSize: '1.125rem' }}>{selectedLoan.member_name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Code: {selectedLoan.member_code}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>Pinjaman Aktif</span>
                  <span style={{
                    fontWeight: 900,
                    color: 'var(--primary)',
                    backgroundColor: 'rgba(19, 127, 236, 0.1)',
                    padding: '4px 12px',
                    borderRadius: '8px'
                  }}>{selectedLoan.member_active_loans} buku</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>Status Member</span>
                  <span style={{ fontWeight: 800, color: selectedLoan.member_status === 'Aktif' ? '#10b981' : '#ef4444' }}>
                    {selectedLoan.member_status || 'Terverifikasi'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Overdue Highlights */}
          <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px' }}>warning</span>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Sudah Jatuh Tempo</h4>
              </div>
              <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>{overdueList.length}</span>
            </div>

            <div className="custom-scrollbar" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {overdueList.length > 0 ? overdueList.map(loan => (
                <div
                  key={loan.id}
                  onClick={() => {
                    setActiveLoans([loan]);
                    setSelectedLoan(loan);
                  }}
                  style={{
                    padding: '16px',
                    border: '1px solid #fee2e2',
                    borderRadius: '12px',
                    backgroundColor: '#fffafb',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#fecaca'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#fee2e2'}
                >
                  <p style={{ fontWeight: 800, fontSize: '0.813rem', margin: '0 0 6px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loan.book_title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{loan.member_name}</span>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: loan.member_status === 'Aktif' || loan.member_status === 'Active' ? '#10b981' : '#ef4444'
                      }}></span>
                    </div>
                    <span style={{ color: '#ef4444', fontWeight: 800, backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>+{getDaysLate(loan.due_date)} hr</span>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>check_circle</span>
                  <p style={{ fontSize: '0.75rem', margin: 0, fontWeight: 500 }}>Semua pengembalian tepat waktu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ padding: '24px', borderRadius: '16px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>history</span>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', margin: 0 }}>Aktivitas Pengembalian Terakhir</h4>
          </div>
          <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>{recentReturns.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recentReturns.length > 0 ? recentReturns.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>check_circle</span>
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{item.book_title}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Peminjam: {item.member_name}</span>
                  <span>Tanda terima OK</span>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>inbox</span>
              <p style={{ fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>Belum ada pengembalian hari ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await safeInvoke("login", { username, password });
      onLogin(u);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-left">
          <img src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop" alt="Library" />
          <div className="login-overlay"></div>
          <div className="login-left-content">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>menu_book</span>
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Library System</h1>
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '20px', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.6 }}>"Membaca adalah alat paling dasar untuk meraih hidup yang baik."</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>sync</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sistem Terkoneksi: Online</span>
              </div>
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-form-container">
            <header className="login-header" style={{ marginBottom: '40px' }}>
              <h2>Masuk Staf</h2>
              <p>Silakan masuk untuk mengelola perpustakaan.</p>
            </header>

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label className="input-label">Username</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined">person</span>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Kata Sandi</label>
                </div>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined">lock</span>
                  <input
                    className="login-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 500, marginBottom: '20px', border: '1px solid #fee2e2' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Memproses...' : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <footer style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>LibAdmin Desktop v2.5.0</p>
              <div style={{ display: 'flex', gap: '24px', color: '#cbd5e1' }}>
                <span className="material-symbols-outlined" style={{ cursor: 'help' }}>verified_user</span>
                <span className="material-symbols-outlined" style={{ cursor: 'help' }}>lan</span>
                <span className="material-symbols-outlined" style={{ cursor: 'help' }}>terminal</span>
              </div>
            </footer>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardView({ setView }: { setView: (v: string) => void }) {
  const [stats, setStats] = useState({ total_books: 0, total_members: 0, active_loans: 0, overdue_loans: 0, monthly_new_members: 0, total_loans_count: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [topBooks, setTopBooks] = useState<any[]>([]);
  const [memberStats, setMemberStats] = useState<any[]>([]);
  const { showAlert } = useAlert();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [s, cat, books, members] = await Promise.all([
        safeInvoke("get_stats"),
        safeInvoke("get_popular_categories"),
        safeInvoke("get_most_borrowed_books"),
        safeInvoke("get_member_activity_stats")
      ]);
      setStats(s || { total_books: 0, total_members: 0, active_loans: 0, overdue_loans: 0, monthly_new_members: 0, total_loans_count: 0 });
      setCategories(cat || []);
      setTopBooks(books || []);
      setMemberStats(members || []);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Never";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return dateStr;
    }
  };

  const totalLoans = categories.length > 0 ? categories.reduce((sum, cat) => sum + (cat.count || 0), 0) : 0;
  const categoryColors = ['#137fec', '#f59e0b', '#10b981', '#6366f1', '#94a3b8'];

  const handleExportPDF = async () => {
    await showAlert("Export PDF akan segera tersedia", "info");
  };

  const handleExportExcel = async () => {
    try {
      // For dashboard, just show a message to use specific view exports
      await showAlert("Silakan gunakan fitur ekspor di menu Buku atau Data Anggota untuk mendapatkan data spesifik.", "info");
    } catch (err) {
      await showAlert("Gagal ekspor Excel: " + err, "error");
    }
  };

  const handlePrint = async () => {
    window.print();
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '4px', letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: '#617589', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
            Pembaruan terakhir pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => { }}
            style={{ height: '40px', padding: '0 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', border: '1px solid #e5e7eb', color: '#111418', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
            Last 30 Days
          </button>
          <button
            onClick={handlePrint}
            style={{ height: '40px', padding: '0 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', border: '1px solid #e5e7eb', color: '#111418', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            Print
          </button>
          <button
            onClick={handleExportExcel}
            style={{ height: '40px', padding: '0 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--primary)', color: 'white', border: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>ios_share</span>
            Export All
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div
          onClick={() => setView("books")}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Total Koleksi Buku</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>library_books</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{(stats?.total_books || 0).toLocaleString()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#078838', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>inventory_2</span>
            Unit buku terdaftar
          </div>
        </div>

        <div
          onClick={() => setView("members")}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Pendaftar Bulan Ini</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>person_add</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{(stats?.monthly_new_members || 0).toLocaleString()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#078838', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>group</span>
            Total: {stats?.total_members} Anggota Aktif
          </div>
        </div>

        <div
          onClick={() => setView("loans")}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Peminjaman Aktif</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>outbox</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{stats?.active_loans || 0}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#078838', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
            Buku sedang dibawa anggota
          </div>
        </div>

        <div
          onClick={() => setView("returns")}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Buku Terlambat</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(231, 57, 8, 0.1)', color: '#e73908', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>warning</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{stats?.overdue_loans || 0}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#e73908', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>alarm_on</span>
            {stats?.overdue_loans > 0 ? 'Perlu tindakan segera' : 'Aman'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        {/* Popular Categories */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Kategori Terpopuler</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportExcel}
                style={{ fontSize: '12px', fontWeight: 700, background: 'white', border: '2px solid #e5e7eb', color: '#111418', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
              >
                Excel
              </button>
              <button
                onClick={handleExportPDF}
                style={{ fontSize: '12px', fontWeight: 700, background: 'white', border: '2px solid #e5e7eb', color: '#111418', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
              >
                PDF
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '16px 8px', minHeight: '240px' }}>
            {/* Pie Chart */}
            <div style={{
              position: 'relative', width: '160px', height: '160px', borderRadius: '50%', background: totalLoans > 0 ? `conic-gradient(${categories.map((cat, i) => {
                const prevPercent = categories.slice(0, i).reduce((sum, c) => sum + ((c.count || 0) / totalLoans * 100), 0);
                const percent = ((cat.count || 0) / totalLoans * 100);
                return `${categoryColors[i % categoryColors.length]} ${prevPercent}% ${prevPercent + percent}%`;
              }).join(', ')})` : '#f1f5f9', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ position: 'absolute', inset: '24px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1, margin: 0 }}>{totalLoans.toLocaleString()}</p>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#617589', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '4px 0 0 0' }}>Total Peminjaman</p>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map((cat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: categoryColors[i % categoryColors.length] }}></span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111418' }}>{cat.category || 'Uncategorized'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#617589' }}>{cat.count}</span>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#111418' }}>{totalLoans > 0 ? Math.round((cat.count / totalLoans) * 100) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Borrowed Books */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Buku Terpopuler</h3>
            <button
              onClick={() => setView("books")}
              style={{ color: 'var(--primary)', background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topBooks.map((book, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '48px', height: '64px', backgroundColor: '#f3f4f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ color: 'rgba(19, 127, 236, 0.4)', fontSize: '24px' }}>book</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111418' }}>{book.title}</h4>
                  <p style={{ fontSize: '12px', color: '#617589', margin: '4px 0 0 0' }}>{book.author} • {book.category || 'General'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111418' }}>{book.loan_count}</p>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#617589', textTransform: 'uppercase', margin: '4px 0 0 0' }}>Borrows</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Activity Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111418' }}>Aktivitas Member</h3>
            <p style={{ fontSize: '12px', color: '#617589', margin: '4px 0 0 0' }}>Ringkasan Keaktifan Anggota selama 30 hari terakhir.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportPDF}
              style={{ fontSize: '12px', padding: '6px 12px', background: 'white', border: '1px solid #e5e7eb', color: '#111418', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>picture_as_pdf</span>
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              style={{ fontSize: '12px', padding: '6px 12px', background: 'white', border: '1px solid #e5e7eb', color: '#111418', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>table_view</span>
              Export Excel
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#617589', letterSpacing: '0.05em', textAlign: 'left' }}>Nama Member</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#617589', letterSpacing: '0.05em', textAlign: 'left' }}>Tanggal Bergabung</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#617589', letterSpacing: '0.05em', textAlign: 'left' }}>Total Peminjaman</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#617589', letterSpacing: '0.05em', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#617589', letterSpacing: '0.05em', textAlign: 'left' }}>Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {memberStats.map((member, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                        {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111418' }}>{member.name}</p>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#617589' }}>{formatDate(member.joined_at)}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#111418', fontWeight: 500 }}>{member.total_loans}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: member.status === 'Active' ? '#f0fdf4' : '#f3f4f6',
                      color: member.status === 'Active' ? '#15803d' : '#6b7280',
                      border: `1px solid ${member.status === 'Active' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`
                    }}>
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#617589' }}>{getTimeAgo(member.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setView("members")}
            style={{ fontSize: '12px', fontWeight: 700, color: '#617589', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#617589'; }}
          >
            Lihat Statistik Lainnya
          </button>
        </div>
      </div>
    </div>
  );
}

/* eslint-enable jsx-a11y/no-inline-styles */
/* eslint-disable jsx-a11y/no-inline-styles */
function BooksView({ books, onRefresh }: { books: Book[], onRefresh: () => void }) {
  const [modalType, setModalType] = useState<"none" | "add" | "edit" | "barcode" | "detail" | "delete">("none");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchingIsbn, setSearchingIsbn] = useState(false);
  const [loanCountYear, setLoanCountYear] = useState(0);
  const [bookBorrowers, setBookBorrowers] = useState<LoanDetail[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState<Partial<Book>>({
    title: "",
    author: "",
    isbn: "",
    category: "Fiksi",
    publisher: "",
    published_year: new Date().getFullYear(),
    rack_location: "",
    total_copy: 1,
    cover: "",
    status: "Tersedia"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");

  const resetForm = () => {
    setFormData({
      title: "",
      author: "",
      isbn: "",
      category: "Fiksi",
      publisher: "",
      published_year: new Date().getFullYear(),
      rack_location: "",
      total_copy: 1,
      cover: "",
      status: "Tersedia"
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalType("add");
  };

  const handleOpenEdit = (book: Book) => {
    setFormData(book);
    setSelectedBook(book);
    setModalType("edit");
  };

  const handleOpenBarcode = (book: Book) => {
    setSelectedBook(book);
    setModalType("barcode");
  };

  const handleOpenDetail = async (book: Book) => {
    setSelectedBook(book);
    setModalType("detail");
    setBookBorrowers([]);
    try {
      const [count, borrowers] = await Promise.all([
        safeInvoke("get_book_loan_count_year", { bookId: book.id }),
        safeInvoke("get_book_borrowers", { bookId: book.id })
      ]);
      setLoanCountYear(count as number);
      setBookBorrowers(borrowers || []);
    } catch (err) {
      console.error("Failed to fetch book details:", err);
      setLoanCountYear(0);
      setBookBorrowers([]);
    }
  };

  const handleDeleteClick = (book: Book) => {
    setSelectedBook(book);
    setModalType("delete");
  };


  const handleCekIsbn = async () => {
    if (!formData.isbn) return;
    setSearchingIsbn(true);
    try {
      const isbnClean = formData.isbn.replace(/-/g, "").trim();
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbnClean}&format=json&jscmd=data`);
      const data = await response.json();
      const bookData = data[`ISBN:${isbnClean}`];

      if (bookData) {
        setFormData({
          ...formData,
          title: bookData.title || formData.title,
          author: bookData.authors?.map((a: any) => a.name).join(", ") || formData.author,
          publisher: bookData.publishers?.map((p: any) => p.name).join(", ") || formData.publisher,
          published_year: bookData.publish_date ? parseInt(bookData.publish_date.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()) : formData.published_year,
          cover: bookData.cover?.large || bookData.cover?.medium || formData.cover
        });
      } else {
        await showAlert("Buku tidak ditemukan di database OpenLibrary.");
      }
    } catch (err) {
      console.error(err);
      await showAlert("Gagal mengambil data ISBN.");
    } finally {
      setSearchingIsbn(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, cover: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === "add") {
        const bookToSend = {
          ...formData,
          available_copy: formData.total_copy || 1
        };
        const newBookId = await safeInvoke("add_book", { book: bookToSend });

        const bookData = { ...formData, id: newBookId } as Book;
        setSelectedBook(bookData);
        setModalType("barcode");
      } else if (modalType === "edit" && selectedBook) {
        // Calculate new available_copy based on total_copy change
        const borrowedCount = selectedBook.total_copy - selectedBook.available_copy;
        const totalCopy = formData.total_copy || 1;
        const newAvailable = Math.max(0, totalCopy - borrowedCount);

        const bookToSend = {
          ...formData,
          id: selectedBook.id,
          available_copy: newAvailable,
          status: formData.status || (newAvailable > 0 ? "Tersedia" : "Dipinjam")
        };
        await safeInvoke("update_book", { book: bookToSend });
        setModalType("none");
      }
      onRefresh();
    } catch (err) {
      await showAlert(err as string, "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBook) return;

    try {
      await safeInvoke("delete_book", {
        id: selectedBook.id,
      });

      await showAlert("Buku berhasil dihapus!", "success");
      onRefresh();
      setModalType("none");
    } catch (err) {
      await showAlert(err as string, "error");
    }
  };


  const filteredBooks = (books || []).filter(book => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Semua Kategori" || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const categories = ["Fiksi", "Non-Fiksi", "Sejarah", "Teknologi", "Sains", "Umum"];

  return (
    <div style={{ margin: '-40px' }}>
      <header className="header-top" style={{ padding: '40px 40px 20px', marginBottom: 0, backgroundColor: 'white', borderBottom: '1px solid var(--border-main)' }}>
        <div className="header-title">
          <h2>Daftar Buku</h2>
          <nav style={{ display: 'flex', fontSize: '0.75rem', color: '#64748b', marginTop: '4px', gap: '8px' }}>
            <span style={{ cursor: 'pointer' }}>Dashboard</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Buku</span>
          </nav>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <span className="material-symbols-outlined">add</span> Tambah Buku Baru
        </button>
      </header>

      <section className="filter-bar">
        <div className="search-box" style={{ flex: 1, minWidth: '300px' }}>
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            className="search-input"
            type="text"
            placeholder="Cari judul, penulis, atau ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search books"
          />
        </div>

        <div className="filter-select-group">
          <label htmlFor="category-select" style={{ display: 'none' }}>Kategori</label>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#64748b', marginRight: '8px' }}>category</span>
          <select
            id="category-select"
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option>Semua Kategori</option>
            {categories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        <button className="action-btn-circle" style={{ border: '1px solid var(--border-main)', borderRadius: '12px', height: '42px', width: '42px' }}>
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </section>

      <div className="data-table-container">
        <div className="content-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px', textAlign: 'center' }}>Kode Buku</th>
                <th style={{ width: '80px' }}>Cover</th>
                <th>Judul Buku</th>
                <th>Penulis</th>
                <th>ISBN</th>
                <th>Kategori</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.length > 0 ? filteredBooks.map(book => (
                <tr key={book.id}>
                  <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: '0.75rem' }}>{book.barcode || `ID-${book.id}`}</td>
                  <td>
                    <div className="book-cover-mini">
                      <img
                        src={book.cover || `https://images.unsplash.com/photo-1543005268-9d235e373fb4?q=80&w=100&auto=format&fit=crop`}
                        alt="cover"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1543005268-9d235e373fb4?q=80&w=100&auto=format&fit=crop';
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{book.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Stok: {book.available_copy} / {book.total_copy}</div>
                  </td>
                  <td style={{ color: '#475569' }}>{book.author}</td>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{book.isbn}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px', color: '#475569' }}>
                      {book.category || 'Umum'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${book.status === 'Tidak Tersedia' ? 'status-borrowed' : (book.available_copy > 0 ? 'status-available' : 'status-borrowed')}`}>
                      {book.status === 'Tidak Tersedia' ? 'Tidak Tersedia' : (book.available_copy > 0 ? 'Tersedia' : 'Dipinjam')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button className="action-btn-circle" title="Lihat Detail" onClick={() => handleOpenDetail(book)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>visibility</span>
                      </button>
                      <button className="action-btn-circle" title="Edit Data" onClick={() => handleOpenEdit(book)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                      </button>
                      <button className="action-btn-circle" title="Hapus Data" onClick={() => handleDeleteClick(book)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>delete</span>
                      </button>
                      <button className="action-btn-circle action-btn-barcode" title="Cetak Barcode" onClick={() => handleOpenBarcode(book)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>barcode_scanner</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    Tidak ada buku yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <footer className="pagination-bar" style={{ borderRadius: '0 0 16px 16px' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Menampilkan <span style={{ fontWeight: 600, color: '#1e293b' }}>1 - {filteredBooks.length}</span> dari <span style={{ fontWeight: 600, color: '#1e293b' }}>{(books || []).length}</span> buku
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button className="page-btn" disabled><span className="material-symbols-outlined">chevron_left</span> Sebelumnya</button>
              <div className="page-numbers"><div className="page-num active">1</div></div>
              <button className="page-btn">Berikutnya <span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </footer>
        </div>
      </div>

      {(modalType === "add" || modalType === "edit") && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            maxWidth: '672px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(19, 127, 236, 0.1)'
          }}>
            {/* Header */}
            <div className="modal-header" style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(19, 127, 236, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'white',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', padding: '8px', borderRadius: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>library_add</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>
                  {modalType === "add" ? "Tambah Buku Baru" : "Edit Data Buku"}
                </h2>
              </div>
              <button
                onClick={() => setModalType("none")}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', marginLeft: 'auto' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* ISBN Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                  ISBN <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.125rem' }}>qr_code</span>
                    <input
                      className="login-input"
                      style={{ height: '44px', paddingLeft: '40px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                      value={formData.isbn || ""}
                      onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                      placeholder="Contoh: 978-602-03-3295-6"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ height: '44px', padding: '0 16px', borderRadius: '8px', fontSize: '0.875rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    onClick={handleCekIsbn}
                    disabled={searchingIsbn}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', marginRight: '4px' }}>search</span>
                    {searchingIsbn ? "Cek..." : "Cek"}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>Gunakan tombol 'Cek' untuk mengambil data otomatis dari database online.</p>
              </div>

              <div style={{ borderTop: '1px solid #f3f4f6' }}></div>

              {/* Grid Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Judul Buku <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <input
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                    value={formData.title || ""}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Masukkan judul lengkap buku"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Penulis <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <input
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                    value={formData.author || ""}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Nama penulis"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Penerbit <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <input
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                    value={formData.publisher || ""}
                    onChange={e => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="Nama penerbit"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="published-year" className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Tahun Terbit <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <select
                    id="published-year"
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '8px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                    value={formData.published_year}
                    onChange={e => setFormData({ ...formData, published_year: parseInt(e.target.value) })}
                    required
                  >
                    <option value="" disabled>Pilih tahun</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="book-category" className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Kategori <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <select
                    id="book-category"
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '8px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="" disabled>Pilih kategori</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Lokasi Rak <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.125rem' }}>grid_view</span>
                    <input
                      className="login-input"
                      style={{ height: '44px', paddingLeft: '40px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                      value={formData.rack_location || ""}
                      onChange={e => setFormData({ ...formData, rack_location: e.target.value })}
                      placeholder="Contoh: A-12"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Jumlah Eksemplar <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.125rem' }}>content_copy</span>
                    <input
                      className="login-input"
                      style={{ height: '44px', paddingLeft: '40px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                      type="number"
                      value={formData.total_copy ?? 1}
                      onChange={e => setFormData({ ...formData, total_copy: parseInt(e.target.value) || 0 })}
                      min="1"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="book-status" className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Status Ketersediaan <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                  </label>
                  <select
                    id="book-status"
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '8px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                    value={formData.status || 'Tersedia'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Tidak Tersedia">Tidak Tersedia</option>
                  </select>
                </div>
              </div>

              {/* Preview Section */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: 'rgba(19, 127, 236, 0.05)',
                  border: '2px dashed rgba(19, 127, 236, 0.2)',
                  borderRadius: '12px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input id="book-cover-upload" type="file" aria-label="Upload cover buku" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                {formData.cover ? (
                  <img src={formData.cover} alt="Preview" style={{ maxHeight: '120px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgba(19, 127, 236, 0.4)' }}>image</span>
                    <p style={{ fontSize: '12px', color: 'rgba(19, 127, 236, 0.6)', fontWeight: 500, margin: 0 }}>Pratinjau Sampul (Otomatis)</p>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 0 0',
                borderTop: '1px solid rgba(19, 127, 236, 0.1)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'white',
                position: 'sticky',
                bottom: -24, // adjust for form padding
                zIndex: 10
              }}>
                <button
                  type="button"
                  className="btn-white"
                  onClick={() => setModalType("none")}
                  style={{ height: '42px', padding: '0 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #d1d5db' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ height: '42px', padding: '0 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(19, 127, 236, 0.2)' }}
                >
                  <span>Simpan & Lanjut ke Barcode</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalType === "delete" && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '32px' }}>
            <div className="modal-header" style={{ padding: '32px 32px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#ef444420', padding: '10px', borderRadius: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '1.5rem' }}>delete</span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#1e293b' }}>Hapus Buku</h3>
              </div>
              <button onClick={() => setModalType("none")} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 32px 32px' }}>
              <p style={{ fontSize: '0.9375rem', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
                Apakah Anda yakin ingin menghapus buku <strong style={{ color: '#1e293b' }}>{selectedBook?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '0 32px 32px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 32px 32px' }}>
              <button
                type="button"
                className="btn-white"
                onClick={() => setModalType("none")}
                style={{ height: '42px', padding: '0 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #d1d5db' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-danger"
                style={{ height: '42px', padding: '0 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "barcode" && selectedBook && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '32px' }}>
            <div className="modal-header" style={{ padding: '32px 32px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#10b98120', padding: '10px', borderRadius: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.5rem' }}>barcode_scanner</span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#1e293b' }}>Barcode Buku</h3>
              </div>
              <button onClick={() => setModalType("none")} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '0 32px 32px' }}>
              <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '24px', width: '100%' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{selectedBook.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.813rem', color: '#64748b', fontWeight: 500, flexWrap: 'wrap' }}>
                  <span>{selectedBook.author}</span>
                  <span>•</span>
                  <span style={{ fontFamily: 'monospace' }}>ISBN: {selectedBook.isbn}</span>
                </div>
              </div>

              <div id="barcode-printable" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '2px solid #dbe0e6', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '20px', pageBreakAfter: 'avoid' }}>
                {/* Barcode bars representation */}
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', gap: '2px', justifyContent: 'center' }}>
                  {(() => {
                    const bars: number[] = [];
                    for (let i = 0; i < 40; i++) {
                      bars.push(Math.floor(Math.random() * 4) + 1);
                    }

                    return bars.map((w, i) => (
                      <div key={i} style={{ width: `${w * 2}px`, height: `${60 + (i % 2) * 15}px`, backgroundColor: '#1e293b' }}></div>
                    ));
                  })()}
                </div>

                {/* Barcode text */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '2rem', color: '#1e293b', letterSpacing: '4px', marginBottom: '8px' }}>
                    {selectedBook.barcode || `ID-${selectedBook.id}`}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0', fontWeight: 600 }}>
                    {selectedBook.title.substring(0, 40)}{selectedBook.title.length > 40 ? '...' : ''}
                  </p>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', width: '100%' }}>
                <p style={{ margin: 0 }}>📋 Catatan: Pastikan barcode dalam kondisi jelas saat dicetak untuk hasil scanning yang optimal.</p>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0 32px 32px', display: 'flex', gap: '12px' }}>
              <button
                className="btn-white"
                onClick={() => {
                  setTimeout(() => window.print(), 100);
                }}
                style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span> Cetak
              </button>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    // Create a canvas for the barcode
                    const canvas = document.createElement('canvas');
                    canvas.width = 400;
                    canvas.height = 300;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                      await showAlert("Gagal membuat barcode", "error");
                      return;
                    }

                    // Draw white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw barcode pattern
                    const barcodeText = selectedBook.barcode || `ID-${selectedBook.id}`;
                    ctx.fillStyle = '#1e293b';

                    // Generate readable bars
                    const barWidth = 4;
                    let x = 50;

                    for (let i = 0; i < 40; i++) {
                      const height = 60 + (Math.random() * 40);
                      ctx.fillRect(x, 80 - height / 2, barWidth, height);
                      x += barWidth + 2;
                    }

                    // Draw barcode text
                    ctx.fillStyle = '#1e293b';
                    ctx.font = 'bold 32px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(barcodeText, canvas.width / 2, 240);

                    // Draw title
                    ctx.font = '12px Arial';
                    ctx.fillStyle = '#64748b';
                    const titleText = selectedBook.title.substring(0, 35);
                    ctx.fillText(titleText, canvas.width / 2, 270);

                    // Download as PNG
                    canvas.toBlob((blob) => {
                      if (blob) {
                        saveAs(blob, `barcode_${selectedBook.barcode || selectedBook.id}.png`);
                        showAlert("Barcode berhasil diunduh!", "success");
                      }
                    }, 'image/png');
                  } catch (err) {
                    console.error("Download error:", err);
                    await showAlert("Gagal mengunduh barcode. Coba gunakan fitur cetak.", "error");
                  }
                }}
                style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span> Unduh
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "detail" && selectedBook && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-content" style={{
            width: '100%',
            maxWidth: '1000px',
            backgroundColor: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            border: '1px solid #dbe0e6',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Left Sidebar: Book Cover & Status */}
            <div style={{
              width: '320px',
              backgroundColor: '#f8fafc',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              borderRight: '1px solid #dbe0e6'
            }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  borderRadius: '16px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  border: '1px solid #dbe0e6'
                }}>
                  {selectedBook.cover ? (
                    <img src={selectedBook.cover} alt={selectedBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', backgroundColor: '#f1f5f9' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>image</span>
                      <p style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: 600 }}>NO COVER</p>
                    </div>
                  )}
                </div>
                {/* Status Badge Overlay */}
                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '9999px',
                    backgroundColor: selectedBook.available_copy > 0 && selectedBook.status === 'Tersedia' ? '#10b981' : '#ef4444',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {selectedBook.available_copy > 0 && selectedBook.status === 'Tersedia' ? 'check_circle' : 'error'}
                    </span>
                    {selectedBook.available_copy > 0 && selectedBook.status === 'Tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #dbe0e6' }}>
                  <p style={{ color: '#617589', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Lokasi Rak</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>shelves</span>
                    <p style={{ color: '#111418', fontWeight: 700, fontSize: '15px', margin: 0 }}>{selectedBook.rack_location || '-'}</p>
                  </div>
                  <p style={{ color: '#617589', fontSize: '11px', marginTop: '6px', margin: 0 }}>Lantai 2, Sayap Barat</p>
                </div>
                {/* Action Button: Copy Details */}
                <button
                  onClick={() => {
                    const text = `[${selectedBook.barcode || `BK-${selectedBook.id}`}] ${selectedBook.title} - ${selectedBook.author} (${selectedBook.category})`;
                    navigator.clipboard.writeText(text);
                    showAlert("Info buku berhasil disalin!", "success");
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid rgba(19, 127, 236, 0.15)',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '14px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>content_copy</span>
                  Salin Info Detail
                </button>
              </div>
            </div>

            {/* Right Content: Metadata & Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header Section */}
              <div style={{ padding: '32px 32px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#111418', lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
                    {selectedBook.title}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ color: '#617589', fontSize: '16px', fontWeight: 500, margin: 0 }}>Penulis: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedBook.author}</span></p>
                    <span style={{ color: '#dbe0e6' }}>•</span>
                    <p style={{ color: '#617589', fontSize: '16px', margin: 0 }}>{selectedBook.published_year || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Stats/Metrics Row */}
              <div style={{ padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '20px', padding: '24px', border: '1px solid #dbe0e6', backgroundColor: 'rgba(19, 127, 236, 0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#111418', margin: 0 }}>Stok Eksemplar</p>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>inventory_2</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <p style={{ color: 'var(--primary)', fontSize: '32px', fontWeight: 900, margin: 0 }}>{selectedBook.available_copy}</p>
                    <p style={{ color: '#617589', fontSize: '14px', fontWeight: 600, margin: 0 }}>/ {selectedBook.total_copy} Total</p>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#dbe0e6', borderRadius: '9999px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: 'var(--primary)', borderRadius: '9999px', width: `${(selectedBook.available_copy / selectedBook.total_copy) * 100}%` }}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '20px', padding: '24px', border: '1px solid #dbe0e6', backgroundColor: 'rgba(19, 127, 236, 0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#111418', margin: 0 }}>Popularity Metric</p>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>trending_up</span>
                  </div>
                  <p style={{ color: 'var(--primary)', fontSize: '32px', fontWeight: 900, margin: 0 }}>{loanCountYear}</p>
                  <p style={{ color: '#617589', fontSize: '14px', fontWeight: 600, margin: 0 }}>Pinjaman (Tahun Ini)</p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div style={{ padding: '32px', flex: 1 }}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '17px', height: '3.5px', backgroundColor: 'var(--primary)' }}></div>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#111418', textTransform: 'uppercase', margin: 0 }}>Informasi Detail Buku</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 40px' }}>
                    <div style={{ borderBottom: '1px solid #dbe0e6', paddingBottom: '8px' }}>
                      <p style={{ color: '#617589', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Kode Buku</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111418', margin: '4px 0 0', fontFamily: 'monospace' }}>{selectedBook.barcode || `BK-${selectedBook.id}`}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid #dbe0e6', paddingBottom: '8px' }}>
                      <p style={{ color: '#617589', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>ISBN</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111418', margin: '4px 0 0' }}>{selectedBook.isbn}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid #dbe0e6', paddingBottom: '8px' }}>
                      <p style={{ color: '#617589', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Penerbit</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111418', margin: '4px 0 0' }}>{selectedBook.publisher || '-'}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid #dbe0e6', paddingBottom: '8px' }}>
                      <p style={{ color: '#617589', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Kategori</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111418', margin: '4px 0 0' }}>{selectedBook.category}</p>
                    </div>
                  </div>
                </div>

                {/* Borrowers List Section (New Style) */}
                {bookBorrowers && bookBorrowers.length > 0 && (
                  <div style={{ borderRadius: '16px', backgroundColor: '#f0f9ff', padding: '20px', border: '1px solid rgba(19, 127, 236, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary)', marginTop: '2px' }}>info</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#111418', margin: 0 }}>Sedang Dipinjam Oleh</p>
                        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {bookBorrowers.map((loan, idx) => (
                            <span
                              key={idx}
                              title={`Kelas: ${loan.member_kelas || '-'}`}
                              style={{ padding: '6px 12px', background: 'white', border: '1px solid rgba(19, 127, 236, 0.1)', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }}>
                              <span style={{ color: 'var(--primary)', fontSize: '18px' }} className="material-symbols-outlined">person</span>
                              {loan.member_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', borderTop: '1px solid #dbe0e6', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setModalType("none")}
                  style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #dbe0e6', background: 'white', color: '#111418', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Tutup
                </button>
                <button
                  onClick={() => { setFormData(selectedBook); setModalType("edit"); }}
                  style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(19, 91, 236, 0.2)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                  Edit Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-enable jsx-a11y/no-inline-styles */
/* eslint-disable jsx-a11y/no-inline-styles */
function MembersView({ members, onRefresh }: { members: Member[], onRefresh: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active'>('active');
  const [filterKelas, setFilterKelas] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [modalType, setModalType] = useState<"none" | "add" | "edit" | "detail">("none");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { showAlert, showConfirm } = useAlert();
  const [memberStats, setMemberStats] = useState<{ total_loans_1_year: number } | null>(null);
  const [memberLoans, setMemberLoans] = useState<any[]>([]);
  const [showBorrowingHistory, setShowBorrowingHistory] = useState(false);
  const [borrowingHistory, setBorrowingHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState<Partial<Member>>({
    name: "",
    email: "",
    phone: "",
    kelas: "",
    jenis_kelamin: "",
    status: "Aktif",
    member_code: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      kelas: "",
      jenis_kelamin: "",
      status: "Aktif",
      member_code: ""
    });
  };

  const handleOpenAdd = async () => {
    resetForm();
    setModalType("add");
    try {
      const code = await safeInvoke("generate_member_code");
      setFormData(prev => ({ ...prev, member_code: code }));
    } catch (err) {
      console.error("Failed to generate member code:", err);
    }
  };

  const handleOpenEdit = (member: Member) => {
    setFormData(member);
    setSelectedMember(member);
    setModalType("edit");
  };

  const handleOpenDetail = async (member: Member) => {
    setSelectedMember(member);
    setModalType("detail");
    setMemberStats(null);
    setMemberLoans([]);
    try {
      const [stats, loans] = await Promise.all([
        safeInvoke("get_member_stats", { memberId: member.id }),
        safeInvoke("get_member_loans", { memberId: member.id })
      ]);
      setMemberStats(stats);
      setMemberLoans(loans || []);
    } catch (err) {
      console.error("Failed to fetch member details:", err);
    }
  };

  const handleDelete = async (member: Member) => {
    const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus anggota "${member.name}"?`);
    if (confirmed) {
      try {
        await safeInvoke("delete_member", { id: member.id });
        onRefresh();
        await showAlert("Anggota berhasil dihapus!", "success");
      } catch (err) {
        await showAlert("Gagal menghapus anggota: " + err, "error");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === "add") {
        await safeInvoke("add_member", { member: formData });
        await showAlert("Anggota berhasil ditambahkan!", "success");
      } else if (modalType === "edit" && selectedMember) {
        await safeInvoke("update_member", { member: { ...formData, id: selectedMember.id } });
        await showAlert("Data anggota berhasil diperbarui!", "success");
      }
      setModalType("none");
      onRefresh();
    } catch (err) {
      await showAlert("Gagal menyimpan data: " + err, "error");
    }
  };

  const handleExport = async () => {
    try {
      if (!filteredMembers || filteredMembers.length === 0) {
        await showAlert("Tidak ada data anggota untuk dieksport", "warning");
        return;
      }

      const membersExportData = filteredMembers.map(m => ({
        'ID Anggota': m.member_code,
        'Nama': m.name,
        'Email': m.email || '-',
        'Kelas': m.kelas || '-',
        'Jenis Kelamin': m.jenis_kelamin || '-',
        'Telepon': m.phone || '-',
        'Status': m.status || 'Aktif',
        'Terdaftar': m.joined_at ? new Date(m.joined_at).toLocaleDateString('id-ID') : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(membersExportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Anggota");

      // Auto-size columns
      const columnWidths = [15, 20, 20, 12, 15, 15, 12, 15];
      ws['!cols'] = columnWidths.map(width => ({ wch: width }));

      const fileName = `data_anggota_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      await showAlert("Data anggota berhasil diexport, silahkan cek folder download!", "success");
    } catch (err) {
      console.error("Export error:", err);
      await showAlert("Gagal mengeksport data: " + err, "error");
    }
  };

  const filteredMembers = (members || []).filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.kelas || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && (member.status === 'Aktif' || !member.status || member.status === ''));

    const matchesKelas = filterKelas === "all" || member.kelas === filterKelas;
    const matchesGender = filterGender === "all" || member.jenis_kelamin === filterGender;

    return matchesSearch && matchesStatus && matchesKelas && matchesGender;
  });

  return (
    <div style={{ margin: '-40px' }}>
      <header className="header-top" style={{ padding: '40px 40px 20px', marginBottom: 0, backgroundColor: 'white', borderBottom: '1px solid var(--border-main)' }}>
        <div className="header-title">
          <h2>Manajemen Anggota</h2>
          <p>Kelola dan pantau seluruh data anggota perpustakaan</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', fontWeight: 600 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>person_add</span>
          Registrasi Anggota Baru
        </button>
      </header>

      <section style={{ padding: '24px 40px', backgroundColor: 'white', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-main)', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 2, minWidth: '300px' }}>
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            className="search-input"
            type="text"
            placeholder="Cari Nama, ID Anggota, atau Kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', fontSize: '0.875rem', fontWeight: 600, color: '#475569', outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">Semua Kelas</option>
          <option value="X A">X A</option>
          <option value="X B">X B</option>
          <option value="XI A">XI A</option>
          <option value="XI B">XI B</option>
          <option value="XII A">XII A</option>
          <option value="XII B">XII B</option>
        </select>

        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-main)', fontSize: '0.875rem', fontWeight: 600, color: '#475569', outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">Semua Kelamin</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>

        <button
          className={filterStatus === 'all' ? 'btn-white' : 'btn-primary'}
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', border: filterStatus === 'all' ? '1px solid var(--border-main)' : 'none' }}
          onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{filterStatus === 'all' ? 'visibility' : 'visibility_off'}</span>
          {filterStatus === 'all' ? 'Lihat Semua (Inc. Nonaktif)' : 'Tampilkan Hanya Aktif'}
        </button>

        <button onClick={handleExport} className="btn-white" style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border-main)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>download</span>
          Ekspor Data
        </button>
      </section>

      <div style={{ padding: '0 40px 40px' }}>
        <div className="content-card" style={{ borderRadius: '16px', overflow: 'hidden', marginTop: '24px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingLeft: '24px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>ID Anggota</th>
                <th style={{ textAlign: 'left', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>Nama Lengkap</th>
                <th style={{ textAlign: 'left', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>Kelas</th>
                <th style={{ textAlign: 'left', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>Jenis Kelamin</th>
                <th style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>Status</th>
                <th style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? filteredMembers.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ paddingLeft: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>{m.member_code}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{m.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.phone || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {m.kelas || '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {m.jenis_kelamin || '-'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 12px',
                      backgroundColor: m.status === 'Nonaktif' ? '#fee2e2' : '#d1fae5',
                      color: m.status === 'Nonaktif' ? '#991b1b' : '#065f46',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      {m.status || 'Aktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => handleOpenDetail(m)} className="action-btn-circle" title="Lihat Detail" style={{ color: '#64748b' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>visibility</span>
                      </button>
                      <button onClick={() => handleOpenEdit(m)} className="action-btn-circle" title="Edit Data" style={{ color: '#64748b' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
                      </button>
                      <button onClick={() => handleDelete(m)} className="action-btn-circle" title="Hapus" style={{ color: '#ef4444' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    Tidak ada anggota yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <footer className="pagination-bar" style={{ borderRadius: '0 0 16px 16px', padding: '16px 24px' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Menampilkan <span style={{ fontWeight: 600, color: '#1e293b' }}>1 sampai {filteredMembers.length}</span> dari <span style={{ fontWeight: 600, color: '#1e293b' }}>{(members || []).length}</span> anggota
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="page-btn" disabled style={{ opacity: 0.5 }}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="page-numbers">
                <div className="page-num active">1</div>
                <div className="page-num">2</div>
                <div className="page-num">3</div>
              </div>
              <button className="page-btn">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </footer>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '24px' }}>
          <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '1.5rem' }}>group</span>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Anggota</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0' }}>{(members || []).length}</h3>
              </div>
            </div>
          </div>

          <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#d1fae5', padding: '12px', borderRadius: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.5rem' }}>person_check</span>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Anggota Aktif</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0' }}>
                  {members.filter(m => !m.status || m.status === 'Aktif').length}
                </h3>
              </div>
            </div>
          </div>

          <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#fed7aa', padding: '12px', borderRadius: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#ea580c', fontSize: '1.5rem' }}>person_add</span>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Pendaftaran Bulan Ini</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0' }}>
                  {members.filter(m => {
                    if (!m.joined_at) return false;
                    const joinDate = new Date(m.joined_at);
                    const now = new Date();
                    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
                  }).length}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modalType === "add" || modalType === "edit") && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            maxWidth: '700px',
            backgroundColor: 'white',
            borderRadius: '16px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div className="modal-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', padding: '8px', borderRadius: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                    {modalType === "add" ? "person_add" : "edit"}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>
                  {modalType === "add" ? "Registrasi Anggota Baru" : "Edit Data Anggota"}
                </h2>
              </div>
              <button
                onClick={() => setModalType("none")}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                  Kode Anggota <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span className="material-symbols-outlined" style={{ color: '#9ca3af', fontSize: '20px', position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)' }}>qr_code</span>
                    <input
                      className="login-input"
                      style={{ height: '44px', paddingLeft: '44px', fontSize: '0.875rem', borderColor: '#d1d5db', backgroundColor: '#f8fafc', color: '#1f2937' }}
                      value={formData.member_code || ""}
                      readOnly
                      placeholder="Klik tombol generate..."
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const code = await safeInvoke("generate_member_code");
                        setFormData(prev => ({ ...prev, member_code: code }));
                      } catch (err) {
                        showAlert("Gagal generate kode", "error");
                      }
                    }}
                    className="btn-primary"
                    style={{ padding: '0 20px', borderRadius: '8px', fontSize: '0.813rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Generate
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>Sistem akan membuatkan kode unik untuk anggota ini.</p>
              </div>

              {/* Nama Lengkap */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                  Nama Lengkap <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="login-input"
                  style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                  value={formData.name || ""}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              {/* Grid 2 Kolom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Email
                  </label>
                  <input
                    className="login-input"
                    type="email"
                    style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                    value={formData.email || ""}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@email.com"
                  />
                </div>

                {/* Nomor Telepon */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Nomor Telepon
                  </label>
                  <input
                    className="login-input"
                    type="tel"
                    style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                    value={formData.phone || ""}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08xx-xxxx-xxxx"
                  />
                </div>

                {/* Kelas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Kelas
                  </label>
                  <select
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '8px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                    value={formData.kelas || ""}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                  >
                    <option value="">Pilih Kelas...</option>
                    <option value="X A">X A</option>
                    <option value="X B">X B</option>
                    <option value="XI A">XI A</option>
                    <option value="XI B">XI B</option>
                    <option value="XII A">XII A</option>
                    <option value="XII B">XII B</option>
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Jenis Kelamin
                  </label>
                  <select
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '8px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                    value={formData.jenis_kelamin || ""}
                    onChange={e => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  >
                    <option value="">Pilih...</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '8px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                    value={formData.status || "Aktif"}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 0 0',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: 'auto'
              }}>
                <button
                  type="button"
                  className="btn-white"
                  onClick={() => setModalType("none")}
                  style={{ height: '42px', padding: '0 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #d1d5db' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ height: '42px', padding: '0 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === "detail" && selectedMember && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content" style={{
            width: '100%',
            maxWidth: '1000px',
            backgroundColor: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh'
          }}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

              {/* Close Button */}
              <button
                onClick={() => setModalType("none")}
                style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, padding: '8px', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
              </button>

              <div style={{ padding: '32px' }}>
                {/* Profile Header Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                  {/* Tablet/Desktop Layout for Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '16px',
                        backgroundColor: '#e2e8f0',
                        border: '4px solid #f8fafc',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#64748b',
                        overflow: 'hidden'
                      }}>
                        {/* Use initial if no image */}
                        {selectedMember.name.charAt(0)}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{selectedMember.name}</h1>
                          <span style={{
                            padding: '2px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: selectedMember.status === 'Nonaktif' ? '#fee2e2' : '#dcfce7',
                            color: selectedMember.status === 'Nonaktif' ? '#b91c1c' : '#15803d',
                            border: `1px solid ${selectedMember.status === 'Nonaktif' ? '#fecaca' : '#bbf7d0'}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {selectedMember.status || 'Active'}
                          </span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500, margin: 0 }}>ID: {selectedMember.member_code}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setFormData(selectedMember); setModalType("edit"); }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: '14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <section style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>account_circle</span>
                        Detail Siswa
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Gender</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedMember.jenis_kelamin || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Class/Grade</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedMember.kelas || '-'}</span>
                        </div>
                        <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                          <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Phone</p>
                          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '12px', margin: 0 }}>{selectedMember.phone || '-'}</p>
                        </div>
                        <div>
                          <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Email</p>
                          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '12px', margin: 0 }}>{selectedMember.email || '-'}</p>
                        </div>
                      </div>
                    </section>

                    <section style={{ backgroundColor: 'rgba(19, 127, 236, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(19, 127, 236, 0.1)' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>analytics</span>
                        Statistik
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid rgba(19, 127, 236, 0.1)' }}>
                          <p style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total Peminjaman</p>
                          <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{memberStats?.total_loans_1_year || 0}</p>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid rgba(19, 127, 236, 0.1)' }}>
                          <p style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Bergabung Sejak</p>
                          <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', color: '#0f172a' }}>
                            {selectedMember.joined_at ? new Date(selectedMember.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                          </p>
                          <p style={{ fontSize: '9px', color: '#94a3b8', margin: 0 }}>
                            {selectedMember.joined_at ? `${new Date().getFullYear() - new Date(selectedMember.joined_at).getFullYear()} yrs active` : ''}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Borrowed Books */}
                  <div style={{ gridColumn: 'span 1' }}> {/* In a larger grid this would be span 2 if we had 3 columns, but here we have auto-fit */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>auto_stories</span>
                        Currently Borrowed
                      </h3>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                        {memberLoans.length} BUKU
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {memberLoans.length > 0 ? memberLoans.map((loan, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                          <div style={{ width: '48px', height: '72px', flexShrink: 0, backgroundColor: '#cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                            {/* Placeholder for book cover */}
                            {loan.book_cover ? (
                              <img src={loan.book_cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#94a3b8' }}>book</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                            <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{loan.book_title}</h4>
                            <p style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: new Date(loan.due_date) < new Date() ? '#ef4444' : '#64748b'
                            }}>
                              {new Date(loan.due_date) < new Date() && <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>event_busy</span>}
                              {new Date(loan.due_date) < new Date()
                                ? `Overdue: ${new Date(loan.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                : `Due: ${new Date(loan.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                              }
                            </p>
                          </div>
                        </div>
                      )) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                          Tidak ada buku yang sedang dipinjam
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                      <button
                        onClick={async () => {
                          setLoadingHistory(true);
                          try {
                            const history = await safeInvoke("get_member_borrowing_history", { memberId: selectedMember.id });
                            setBorrowingHistory(history || []);
                          } catch (err) {
                            console.error("Failed to fetch history:", err);
                            setBorrowingHistory([]);
                          }
                          setLoadingHistory(false);
                          setShowBorrowingHistory(true);
                        }}
                        style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        View Full History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrowing History Modal */}
      {showBorrowingHistory && selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBorrowingHistory(false); }}
        >
          <div style={{
            backgroundColor: 'white',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.025em', margin: 0 }}>
                  Riwayat Peminjaman <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '18px' }}>(1 Tahun Terakhir)</span>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                  <p style={{ margin: 0 }}>Anggota: <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{selectedMember.name}</span></p>
                  <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                  <p style={{ margin: 0 }}>ID: {selectedMember.member_code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBorrowingHistory(false)}
                style={{
                  padding: '8px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Table Content - Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.3, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  <p style={{ marginTop: '12px', fontWeight: 600 }}>Memuat data...</p>
                </div>
              ) : borrowingHistory.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.3 }}>menu_book</span>
                  <p style={{ marginTop: '12px', fontWeight: 600 }}>Tidak ada riwayat peminjaman</p>
                </div>
              ) : (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Judul Buku</th>
                      <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Tanggal Pinjam</th>
                      <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Tanggal Kembali</th>
                      <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowingHistory.map((item: any, idx: number) => {
                      const isReturned = item.status === 'returned';
                      const isOverdue = item.status === 'borrowed' && new Date(item.due_date) < new Date();

                      let statusLabel = 'Dipinjam';
                      let statusBg = '#dbeafe';
                      let statusColor = '#1d4ed8';
                      let dotColor = '#3b82f6';

                      if (isReturned) {
                        statusLabel = 'Dikembalikan';
                        statusBg = '#d1fae5';
                        statusColor = '#047857';
                        dotColor = '#10b981';
                      } else if (isOverdue) {
                        statusLabel = 'Terlambat';
                        statusBg = '#ffe4e6';
                        statusColor = '#b91c1c';
                        dotColor = '#ef4444';
                      }

                      const formatDate = (dateStr: string) => {
                        if (!dateStr) return '-';
                        return new Date(dateStr).toLocaleDateString('sv-SE');
                      };

                      return (
                        <tr
                          key={idx}
                          style={{ transition: 'background-color 0.15s', borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(248, 250, 252, 0.5)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '32px',
                                height: '48px',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                {item.book_cover ? (
                                  <img src={item.book_cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: '18px' }}>book</span>
                                )}
                              </div>
                              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{item.book_title}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px' }}>
                            {formatDate(item.loan_date)}
                          </td>
                          <td style={{
                            padding: '16px 24px',
                            fontSize: '14px',
                            color: isReturned ? '#475569' : '#ef4444',
                            fontWeight: isReturned ? 400 : 500
                          }}>
                            {isReturned ? formatDate(item.return_date) : 'Belum dikembalikan'}
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor: statusBg,
                              color: statusColor
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '9999px',
                                backgroundColor: dotColor,
                                marginRight: '6px'
                              }}></span>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                Menampilkan <span style={{ fontWeight: 500 }}>{borrowingHistory.length}</span> data peminjaman
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowBorrowingHistory(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0 24px',
                    height: '44px',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px 0 rgba(19, 127, 236, 0.2)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                  Kembali ke Profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-enable jsx-a11y/no-inline-styles */
/* eslint-disable jsx-a11y/no-inline-styles */
function LoansView({ onRefresh }: { onRefresh: () => void }) {
  const [memberCode, setMemberCode] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberLoanCount, setMemberLoanCount] = useState(0);
  const [cart, setCart] = useState<Array<{ book: Book, dueDate: string }>>([]);
  const [loanDays] = useState(7);
  const { showAlert, showConfirm } = useAlert();

  const handleUpdateDueDate = (index: number, newDateString: string) => {
    if (!newDateString) return;
    const newDate = new Date(newDateString);
    if (isNaN(newDate.getTime())) return;

    const newCart = [...cart];
    newCart[index].dueDate = newDate.toISOString();
    setCart(newCart);
  };

  const handleScanMember = async () => {
    if (!memberCode.trim()) return;

    try {
      const member = await safeInvoke("find_member_by_code", { memberCode: memberCode }) as Member;
      if (member.status === "Nonaktif") {
        await showAlert("Anggota berstatus NONAKTIF tidak diperbolehkan meminjam buku", "error");
        setSelectedMember(null);
        setMemberCode("");
        return;
      }

      try {
        const count = await safeInvoke("get_member_active_loan_count", { memberId: member.id }) as number;
        setMemberLoanCount(count);
      } catch (e) {
        console.error("Failed to get loan count", e);
        setMemberLoanCount(0);
      }

      setSelectedMember(member);
    } catch (err) {
      await showAlert("Info: " + err);
      setSelectedMember(null);
    }
  };

  const handleScanBook = async () => {
    if (!bookCode.trim()) {
      await showAlert("Masukkan ID Buku atau ISBN!");
      return;
    }

    try {
      const book = await safeInvoke("find_book_by_isbn", { isbn: bookCode }) as Book;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + loanDays);

      setCart([...cart, { book, dueDate: dueDate.toISOString() }]);
      setBookCode("");
    } catch (err) {
      await showAlert("Error: " + err);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleClearCart = async () => {
    const confirmed = await showConfirm("Hapus semua buku dari daftar peminjaman?");
    if (confirmed) {
      setCart([]);
    }
  };

  const handleProcessLoan = async () => {
    if (!selectedMember) {
      await showAlert("Silakan scan kartu anggota terlebih dahulu!", "warning");
      return;
    }

    if (cart.length === 0) {
      await showAlert("Belum ada buku yang dipilih!", "warning");
      return;
    }

    const confirmed = await showConfirm(`Proses peminjaman ${cart.length} buku untuk ${selectedMember.name}?`);
    if (confirmed) {
      try {
        const loanDate = new Date();
        loanDate.setHours(0, 0, 0, 0);

        for (const item of cart) {
          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          const diffTime = dueDate.getTime() - loanDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          await safeInvoke("borrow_book", {
            bookId: item.book.id,
            memberId: selectedMember.id,
            days: diffDays > 0 ? diffDays : 1
          });
        }

        await showAlert("Peminjaman berhasil diproses!", "success");
        setCart([]);
        setSelectedMember(null);
        setMemberCode("");
        onRefresh();
      } catch (err) {
        await showAlert("Gagal memproses peminjaman, " + err, "error");
      }
    }
  };

  return (
    <div style={{ margin: '-40px', minHeight: '100vh', backgroundColor: '#f6f7f8' }}>
      {/* Breadcrumbs */}
      <div style={{ padding: '24px 40px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#64748b' }}>
        <a href="#" style={{ color: '#64748b', textDecoration: 'none' }}>Dashboard</a>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
        <span style={{ color: '#1e293b', fontWeight: 600 }}>Peminjaman Buku</span>
      </div>

      {/* Page Title */}
      <div style={{ padding: '0 40px 32px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Transaksi Peminjaman</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Scan barcode anggota dan buku untuk memulai transaksi pinjaman baru.</p>
      </div>

      {/* Main Content Grid */}
      <div style={{ padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '32px' }}>
        {/* Left Column: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Member Scan Card */}
          <div className="content-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>1</span>
              Identitas Peminjam
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>ID Anggota</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.25rem' }}>barcode_scanner</span>
                <input
                  className="login-input"
                  style={{ height: '56px', paddingLeft: '48px', fontSize: '1.125rem', borderWidth: '2px', borderColor: '#d1d5db' }}
                  placeholder="Scan kartu anggota..."
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleScanMember()}
                />
              </div>
            </div>

            {/* Member Info Display */}
            {selectedMember && (
              <div style={{ backgroundColor: 'rgba(19, 127, 236, 0.05)', border: '1px solid rgba(19, 127, 236, 0.2)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#94a3b8' }}>person</span>
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.125rem', marginBottom: '4px' }}>{selectedMember.name}</h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '4px' }}>
                    Status: <span style={{
                      color: (selectedMember.status === 'Nonaktif') ? '#ef4444' : '#10b981',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '0.75rem'
                    }}>
                      {selectedMember.status || 'Aktif'}
                    </span>
                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Kelas: {selectedMember.kelas || '-'}</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Sedang meminjam: <span style={{ fontWeight: 700, color: memberLoanCount >= 3 ? '#ef4444' : '#1e293b' }}>{memberLoanCount}</span> / 5 Buku
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Book Scan Card */}
          <div className="content-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>2</span>
              Input Buku
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>ID Buku / ISBN</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '1.25rem' }}>book_5</span>
                <input
                  className="login-input"
                  style={{ height: '56px', paddingLeft: '48px', fontSize: '1.125rem', borderWidth: '2px', borderColor: '#d1d5db' }}
                  placeholder="Scan barcode buku..."
                  value={bookCode}
                  onChange={(e) => setBookCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleScanBook()}
                />
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>info</span>
                Fokuskan kursor di sini untuk mulai memindai secara otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Cart */}
        <div className="content-card" style={{ borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
          {/* Cart Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Daftar Peminjaman</h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{cart.length} buku siap diproses</p>
            </div>
            {cart.length > 0 && (
              <button onClick={handleClearCart} style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', backgroundColor: 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                Hapus Semua
              </button>
            )}
          </div>

          {/* Cart Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informasi Buku</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tgl. Kembali</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '48px', height: '64px', backgroundColor: '#f1f5f9', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {item.book.cover ? (
                              <img src={item.book.cover} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span className="material-symbols-outlined" style={{ color: '#cbd5e1' }}>book</span>
                            )}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{item.book.title}</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ISBN: {item.book.isbn}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <input
                          type="date"
                          value={item.dueDate.split('T')[0]}
                          onChange={(e) => handleUpdateDueDate(index, e.target.value)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            width: '100%',
                            outline: 'none'
                          }}
                        />
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <button onClick={() => handleRemoveFromCart(index)} style={{ backgroundColor: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '8px' }}>
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#cbd5e1' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '16px' }}>shopping_cart_checkout</span>
                <p style={{ fontSize: '1.125rem' }}>Belum ada buku yang di-scan</p>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>
                Total Item: <span style={{ color: '#1e293b', fontWeight: 700 }}>{cart.length} Buku</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>event</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>
                  Tanggal Pinjam: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <button
              onClick={handleProcessLoan}
              disabled={cart.length === 0 || !selectedMember}
              className="btn-primary"
              style={{
                width: '100%',
                height: '64px',
                borderRadius: '12px',
                fontSize: '1.25rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 10px 15px -3px rgba(19, 127, 236, 0.2)',
                opacity: (cart.length === 0 || !selectedMember) ? 0.5 : 1,
                cursor: (cart.length === 0 || !selectedMember) ? 'not-allowed' : 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>check_circle</span>
              SELESAIKAN PEMINJAMAN
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Struk akan dicetak otomatis setelah konfirmasi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
/* eslint-enable jsx-a11y/no-inline-styles */

/* eslint-disable jsx-a11y/no-inline-styles */
function SettingsView({ user, onProfileUpdate }: { user: User, onProfileUpdate: (u: User) => void }) {
  const { showAlert, showConfirm } = useAlert();
  const [profileName, setProfileName] = useState(user.name);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [settings, setSettings] = useState<{ [key: string]: string }>({
    language: 'id',
    theme: 'light',
    barcode_path: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await safeInvoke('get_settings');
      if (s) setSettings(s);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await safeInvoke('update_setting', { key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
      if (key === 'theme') {
        document.documentElement.setAttribute('data-theme', value);
      }
    } catch (err) {
      showAlert('Gagal menyimpan pengaturan: ' + err, 'error');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updatedUser = await safeInvoke('update_profile', { userId: user.id, name: profileName });
      onProfileUpdate(updatedUser);
      await showAlert('Profil berhasil diperbarui!', 'success');
    } catch (err) {
      await showAlert('Gagal menyimpan profil: ' + err, 'error');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      await showAlert('Semua field harus diisi', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      await showAlert('Kata sandi baru tidak cocok', 'error');
      return;
    }
    if (newPassword.length < 6) {
      await showAlert('Kata sandi minimal 6 karakter', 'warning');
      return;
    }
    try {
      await safeInvoke('change_password', { userId: user.id, oldPassword, newPassword });
      await showAlert('Kata sandi berhasil diubah!', 'success');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      await showAlert('Gagal mengubah kata sandi: ' + err, 'error');
    }
  };

  const handleBackup = async () => {
    try {
      const path = await safeInvoke('backup_database');
      await showAlert(`Database berhasil dicadangkan ke: ${path}`, 'success');
    } catch (err) {
      await showAlert('Gagal melakukan backup: ' + err, 'error');
    }
  };

  const handleRestore = async () => {
    await showAlert('Fitur restore database akan segera tersedia. Untuk saat ini silakan hubungi admin IT untuk restore manual file database.', 'info');
  };

  const handleReset = async () => {
    const confirmed = await showConfirm('PERINGATAN: Semua data (Buku, Member, Peminjaman) akan dihapus permanen. Apakah Anda benar-benar yakin ingin mereset database?');
    if (confirmed) {
      try {
        await safeInvoke('reset_database');
        await showAlert('Database berhasil direset. Silakan muat ulang aplikasi.', 'success');
        window.location.reload();
      } catch (err) {
        await showAlert('Gagal mereset database: ' + err, 'error');
      }
    }
  };

  // Section card style
  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'var(--card-main)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
    border: '1px solid var(--border-main)',
    overflow: 'hidden'
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '24px',
    borderBottom: '1px solid var(--border-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-main)'
  };

  return (
    <div style={{ margin: '-40px' }}>
      {/* Header */}
      <header className="header-top" style={{ padding: '40px 40px 20px', marginBottom: 0, backgroundColor: 'var(--sidebar-main)', borderBottom: '1px solid var(--border-main)' }}>
        <div className="header-title">
          <h2 style={{ color: 'var(--text-main)' }}>Pengaturan</h2>
          <p style={{ color: 'var(--text-muted)' }}>Kelola profil, preferensi sistem, dan database</p>
        </div>
        <button
          onClick={handleSaveProfile}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', fontWeight: 600 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>save</span>
          Simpan Semua
        </button>
      </header>

      {/* Settings Content */}
      <div style={{ padding: '32px 40px 40px', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* === 1. Profil Petugas === */}
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>person</span>
            <h3 style={{ fontWeight: 700, fontSize: '18px', margin: 0 }}>Profil Petugas</h3>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '9999px',
                  backgroundColor: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  fontWeight: 700,
                  color: '#64748b',
                  border: '4px solid #f8fafc',
                  boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)'
                }}>
                  {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <button style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '9999px',
                  border: '2px solid white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ fontWeight: 700, fontSize: '18px', margin: 0, color: '#0f172a' }}>{user.name}</h4>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{user.role === 'admin' ? 'Administrator Utama Perpustakaan' : 'Staf Perpustakaan'}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ID: PETUGAS-{user.id}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-main)',
                    backgroundColor: 'var(--bg-main)',
                    fontSize: '14px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kata Sandi</label>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-main)',
                    backgroundColor: 'var(--bg-main)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    color: 'var(--text-main)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Ganti kata sandi...</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>lock_reset</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* === 2. Preferensi Sistem === */}
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>display_settings</span>
            <h3 style={{ fontWeight: 700, fontSize: '18px', margin: 0 }}>Preferensi Sistem</h3>
          </div>
          <div style={{ padding: '0 24px' }}>
            {/* Mode Tampilan */}
            <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: '#0f172a' }}>Mode Tampilan</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Pilih antara tema terang atau gelap sesuai kenyamanan mata.</p>
              </div>
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => handleUpdateSetting('theme', 'light')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: settings.theme === 'light' ? 'white' : 'transparent',
                    boxShadow: settings.theme === 'light' ? '0 1px 2px 0 rgba(0,0,0,0.05)' : 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    color: settings.theme === 'light' ? '#0f172a' : '#64748b'
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>light_mode</span> Terang
                </button>
                <button
                  onClick={() => handleUpdateSetting('theme', 'dark')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: settings.theme === 'dark' ? 'white' : 'transparent',
                    boxShadow: settings.theme === 'dark' ? '0 1px 2px 0 rgba(0,0,0,0.05)' : 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    color: settings.theme === 'dark' ? '#0f172a' : '#64748b'
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dark_mode</span> Gelap
                </button>
              </div>
            </div>

            {/* Bahasa Aplikasi */}
            <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: '#0f172a' }}>Bahasa Aplikasi</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Gunakan bahasa pilihan Anda untuk antarmuka pengguna.</p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => handleUpdateSetting('language', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  fontSize: '14px',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}>
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English (US)</option>
              </select>
            </div>

            {/* Lokasi Penyimpanan Barcode */}
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: '#0f172a' }}>Lokasi Penyimpanan Barcode</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Folder tempat file barcode buku yang digenerasi akan disimpan secara lokal.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  color: '#475569',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis'
                }}>
                  {settings.barcode_path || 'Belum diatur (Default: Documents/LibAdmin)'}
                </div>
                <button
                  onClick={async () => {
                    // In a real app, use tauri dialog to pick a folder
                    // For now, let's just simulate or provide a way to set it
                    await showAlert('Pilih folder tidak didukung di lingkungan ini. Path akan diset ke default.', 'info');
                    handleUpdateSetting('barcode_path', 'C:\\Users\\Admin\\Documents\\LibAdmin\\Barcodes\\');
                  }}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    color: '#0f172a'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>folder_open</span> Telusuri
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* === 3. Manajemen Database === */}
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>database</span>
            <h3 style={{ fontWeight: 700, fontSize: '18px', margin: 0 }}>Manajemen Database</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Backup */}
              <button
                onClick={handleBackup}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'rgba(19, 127, 236, 0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(19, 127, 236, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-outlined">backup</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#0f172a' }}>Backup Data</p>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>Ekspor database ke lokal</p>
                </div>
              </button>

              {/* Restore */}
              <button
                onClick={handleRestore}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'rgba(19, 127, 236, 0.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(19, 127, 236, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-outlined">restore_page</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#0f172a' }}>Restore Data</p>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>Impor database dari file</p>
                </div>
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-outlined">delete_forever</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: '#dc2626' }}>Reset Database</p>
                  <p style={{ fontSize: '10px', color: '#f87171', margin: '4px 0 0' }}>Hapus semua data (Permanen)</p>
                </div>
              </button>
            </div>

            {/* Warning */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px'
            }}>
              <span className="material-symbols-outlined" style={{ color: '#f59e0b', flexShrink: 0 }}>warning</span>
              <p style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6, margin: 0 }}>
                <strong>Peringatan Keamanan:</strong> Pastikan Anda telah melakukan backup sebelum menjalankan pemulihan atau reset database. Tindakan reset tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </section>

        {/* === 4. Tentang Aplikasi === */}
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>info</span>
            <h3 style={{ fontWeight: 700, fontSize: '18px', margin: 0 }}>Tentang Aplikasi</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{
                width: '96px',
                height: '96px',
                backgroundColor: 'rgba(19, 127, 236, 0.1)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '56px' }}>menu_book</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, color: '#0f172a' }}>LibAdmin Pro — Offline Edition</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#64748b'
                  }}>Versi 1.0.0 (Stable)</span>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#059669'
                  }}>Lisensi Aktif</span>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '440px' }}>
                  Solusi manajemen perpustakaan desktop modern yang berjalan sepenuhnya secara luring untuk keamanan data maksimal.
                </p>
                <div style={{ paddingTop: '4px' }}>
                  <button style={{
                    color: 'var(--primary)',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cloud_sync</span> Cek Pembaruan Offline
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: '#94a3b8'
          }}>
            <p style={{ margin: 0 }}>&copy; 2024 LibAdmin Software Solution.</p>
            <p style={{ margin: 0 }}>SMA Persada Bunda</p>
          </div>
        </section>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{
            maxWidth: '480px',
            backgroundColor: 'white',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', padding: '8px', borderRadius: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>lock_reset</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>Ganti Kata Sandi</h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Kata Sandi Lama</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Kata Sandi Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="btn-white"
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid #d1d5db' }}
              >Batal</button>
              <button
                onClick={handleChangePassword}
                className="btn-primary"
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                Ubah Kata Sandi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* eslint-enable jsx-a11y/no-inline-styles */

export default App;
