import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
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

interface Loan {
  id: number;
  book_title: string;
  member_name: string;
  loan_date: string;
  due_date: string;
  status: string;
  fine_amount: number;
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
  loan_date: string;
  due_date: string;
  status: string;
  fine_amount: number;
  member_active_loans: number;
}

// Helper to handle invoke safely in browser for preview
const safeInvoke = async (cmd: string, args: any = {}): Promise<any> => {
  if (window.hasOwnProperty("__TAURI_INTERNALS__")) {
    return await invoke(cmd, args);
  }

  // Mock data for Browser Preview
  console.warn(`Browser Preview: Mocking Tauri command "${cmd}"`);
  const mocks: any = {
    "login": { id: 1, username: "admin", name: "Administrator", role: "admin" },
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
      { id: 1, book_title: "Atomic Habits", member_name: "Michael Chen", loan_date: new Date().toISOString(), due_date: new Date(Date.now() + 604800000).toISOString(), status: "borrowed", fine_amount: 0 }
    ],
    "get_recent_activity": [
      { id: "L-1", title: "Michael Chen", description: 'meminjam "Atomic Habits"', time: new Date().toISOString(), type_name: "loan" },
      { id: "M-1", title: "Sarah Williams", description: "Bergabung sebagai anggota baru", time: new Date(Date.now() - 3600000).toISOString(), type_name: "member" }
    ],
    "get_weekly_circulation": [
      { day: "Minggu", count: 12 },
      { day: "Senin", count: 25 },
      { day: "Selasa", count: 18 },
      { day: "Rabu", count: 32 },
      { day: "Kamis", count: 45 },
      { day: "Jumat", count: 28 },
      { day: "Sabtu", count: 15 }
    ]
  };

  if (cmd === "login") {
    if (args.username === "admin" && args.password === "admin123") {
      return mocks.login;
    } else {
      throw "Username atau password salah";
    }
  }

  return mocks[cmd] || (cmd.startsWith("add_") ? 1 : null);
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState("dashboard");
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

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
      } else if (view === "loans") {
        const data = await safeInvoke("get_active_loans");
        setLoans(data);
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
          <button className="nav-item">
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
                loans={loans}
                onRefresh={loadData}
              />
            )}
            {view === "returns" && <ReturnsView />}
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
  }, []);

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
        setRecentReturns([loan, ...recentReturns]);

        // Update local state
        const remaining = activeLoans.filter(l => l.id !== loan.id);
        setActiveLoans(remaining);
        if (selectedLoan?.id === loan.id) {
          setSelectedLoan(remaining.length === 1 ? remaining[0] : null);
        }
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
                      <p style={{ fontSize: '0.688rem', color: loan.fine_amount > 0 ? '#ef4444' : '#64748b', margin: '2px 0 0', fontWeight: loan.fine_amount > 0 ? 600 : 400 }}>
                        {loan.fine_amount > 0 ? 'Terlambat!' : `Tempo: ${formatDate(loan.due_date)}`}
                      </p>
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
                  backgroundColor: selectedLoan.fine_amount > 0 ? '#fee2e2' : '#fef3c7',
                  color: selectedLoan.fine_amount > 0 ? '#ef4444' : '#b45309',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {selectedLoan.fine_amount > 0 ? 'Status: Terlambat' : 'Status: Dipinjam'}
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
                        <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Peminjam</p>
                        <p style={{ fontWeight: 700, color: '#1e293b' }}>{selectedLoan.member_name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {selectedLoan.member_code}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Jatuh Tempo</p>
                        <p style={{ fontWeight: 700, color: selectedLoan.fine_amount > 0 ? '#ef4444' : '#1e293b' }}>
                          {formatDate(selectedLoan.due_date)}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {selectedLoan.fine_amount > 0 ? `Terlambat ${getDaysLate(selectedLoan.due_date)} hari` : 'Masih dalam periode pinjam'}
                        </p>
                      </div>
                    </div>

                    {selectedLoan.fine_amount > 0 && (
                      <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px', borderRadius: '8px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: '#b91c1c', margin: 0, fontWeight: 600 }}>Denda Keterlambatan</p>
                          <p style={{ fontSize: '1.125rem', color: '#b91c1c', margin: 0, fontWeight: 900 }}>Rp {selectedLoan.fine_amount.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    )}
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
          {(activeLoans.length > 0) && (
            <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Informasi Akun Peminjam</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                  {activeLoans[0].member_name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 900, color: '#0f172a', margin: 0, fontSize: '1.125rem' }}>{activeLoans[0].member_name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Code: {activeLoans[0].member_code}</p>
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
                  }}>{activeLoans[0].member_active_loans} buku</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>Status Member</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>Terverifikasi</span>
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
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{loan.member_name}</span>
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

      <div className="content-card" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktivitas Terakhir</h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {recentReturns.length > 0 ? recentReturns.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>check_circle</span>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.book_title}</p>
                <p style={{ fontSize: '0.625rem', color: '#64748b' }}>Dikembalikan baru saja</p>
              </div>
            </div>
          )) : (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada aktivitas</p>
          )}
        </div>
      </div>

      <div style={{ padding: '24px', backgroundColor: 'rgba(19, 127, 236, 0.05)', borderRadius: '16px', border: '1px solid rgba(19, 127, 236, 0.2)' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>lightbulb</span>
          <h5 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>Tips Cepat</h5>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5' }}>
          Gunakan tombol <strong>F1</strong> pada keyboard untuk kembali fokus ke kolom pencarian ID Buku.
        </p>
      </div>
    </div>
  );
}

/* eslint-enable jsx-a11y/no-inline-styles */

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
  const [stats, setStats] = useState({ total_books: 0, total_members: 0, active_loans: 0, overdue_loans: 0 });
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
      setStats(s || { total_books: 0, total_members: 0, active_loans: 0, overdue_loans: 0 });
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

  const totalLoans = categories.reduce((sum, cat) => sum + cat.count, 0);
  const categoryColors = ['#137fec', '#f59e0b', '#10b981', '#6366f1', '#94a3b8'];

  const handleExportPDF = async () => {
    await showAlert("Export PDF akan segera tersedia", "info");
  };

  const handleExportExcel = async () => {
    await showAlert("Export Excel akan segera tersedia", "info");
  };

  const handlePrint = async () => {
    window.print();
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '4px', letterSpacing: '-0.02em' }}>Reports & Analytics</h1>
          <p style={{ color: '#617589', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
            Last comprehensive update: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Total Peminjaman</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>menu_book</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{(stats?.total_books || 0).toLocaleString()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#078838', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>
            +2.5% this month
          </div>
        </div>

        <div
          onClick={() => setView("members")}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Anggota Aktif</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>person</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{(stats?.total_members || 0).toLocaleString()}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#e73908', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_down</span>
            -1.2% this month
          </div>
        </div>

        <div
          onClick={() => setView("loans")}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#617589', margin: 0 }}>Buku Sedang Dipinjam</p>
            <span className="material-symbols-outlined" style={{ backgroundColor: 'rgba(19, 127, 236, 0.1)', color: 'var(--primary)', padding: '6px', borderRadius: '8px', fontSize: '18px' }}>outbox</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: '#111418' }}>{stats?.active_loans || 0}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#078838', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>
            +5.0% vs last week
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#078838', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
            4 less than yesterday
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
              position: 'relative', width: '160px', height: '160px', borderRadius: '50%', background: `conic-gradient(${categories.map((cat, i) => {
                const prevPercent = categories.slice(0, i).reduce((sum, c) => sum + (c.count / totalLoans * 100), 0);
                const percent = (cat.count / totalLoans * 100);
                return `${categoryColors[i % categoryColors.length]} ${prevPercent}% ${prevPercent + percent}%`;
              }).join(', ')})`, flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#111418' }}>{Math.round((cat.count / totalLoans) * 100)}%</span>
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
                <div style={{ width: '48px', height: '64px', background: 'linear-gradient(135deg, rgba(19, 127, 236, 0.3), rgba(19, 127, 236, 0.1))', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'rgba(19, 127, 236, 0.4)', fontSize: '24px' }}>book</span>
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
    try {
      const count = await safeInvoke("get_book_loan_count_year", { bookId: book.id });
      setLoanCountYear(count as number);
    } catch (err) {
      console.error("Failed to fetch loan count:", err);
      setLoanCountYear(0);
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
          available_copy: formData.total_copy
        };
        const newBookId = await safeInvoke("add_book", { book: bookToSend });

        const bookData = { ...formData, id: newBookId } as Book;
        setSelectedBook(bookData);
        setModalType("barcode");
      } else if (modalType === "edit" && selectedBook) {
        const bookToSend = {
          ...formData,
          id: selectedBook.id
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
        book_id: selectedBook.id,
      });

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
              justifyContent: 'between',
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
                      value={formData.total_copy}
                      onChange={e => setFormData({ ...formData, total_copy: parseInt(e.target.value) })}
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
          <div className="modal-content" style={{ maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '32px' }}>
            <div className="modal-header" style={{ padding: '32px 32px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#10b98120', padding: '10px', borderRadius: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.5rem' }}>barcode_scanner</span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#1e293b' }}>Digital Asset Barcode</h3>
              </div>
              <button onClick={() => setModalType("none")} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '0 32px 32px' }}>
              <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '24px', width: '100%' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{selectedBook.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.813rem', color: '#64748b', fontWeight: 500 }}>
                  <span>{selectedBook.author}</span>
                  <span>•</span>
                  <span style={{ fontFamily: 'monospace' }}>ISBN: {selectedBook.isbn}</span>
                </div>
              </div>

              <div id="barcode-printable" style={{ backgroundColor: 'white', padding: '48px 32px', borderRadius: '24px', border: '2px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', height: '80px', gap: '2px', marginBottom: '24px', width: '100%', justifyContent: 'center' }}>
                  {[1, 3, 1, 2, 1, 3, 2, 1, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2].map((w, i) => (
                    <div key={i} style={{ width: `${w * 2.5}px`, height: '100%', backgroundColor: i % 2 === 0 ? '#1e293b' : 'transparent' }}></div>
                  ))}
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '8px', fontSize: '1.25rem', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '8px 24px', borderRadius: '12px' }}>
                  {selectedBook.barcode || `ID-${selectedBook.id}`}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0 32px 32px', display: 'flex', gap: '12px' }}>
              <button className="btn-white" onClick={() => window.print()} style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>print</span> Cetak
              </button>
              <button className="btn-primary" style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>download</span> Unduh
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "detail" && selectedBook && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid rgba(19, 127, 236, 0.1)' }}>
            {/* Header */}
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(19, 127, 236, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>book</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>Detail Informasi Buku</h2>
              </div>
              <button onClick={() => setModalType("none")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px', alignItems: 'start' }}>
              {/* Book Cover */}
              <div style={{ aspectRatio: '2/3', width: '100%', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                {selectedBook.cover ? (
                  <img src={selectedBook.cover} alt="Book Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.3 }}>image</span>
                    <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>BOOK COVER</p>
                  </div>
                )}
              </div>

              {/* Book Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Status & Last Updated */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    padding: '6px 12px',
                    backgroundColor: selectedBook.status === 'Tersedia' ? '#d1fae5' : '#fee2e2',
                    color: selectedBook.status === 'Tersedia' ? '#065f46' : '#991b1b',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: selectedBook.status === 'Tersedia' ? '#10b981' : '#ef4444' }}></span>
                    {selectedBook.status || 'Tersedia'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                {/* Title */}
                <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2, margin: 0 }}>{selectedBook.title}</h2>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>ID Internal</span>
                    <span style={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace' }}>{selectedBook.barcode || `LIB-BK-${selectedBook.id}`}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>ISBN</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedBook.isbn}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Penulis</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedBook.author}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Penerbit</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedBook.publisher || '-'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Tahun Terbit</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedBook.published_year || '-'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Kategori</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedBook.category}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Lokasi Rak</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>location_on</span>
                      <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedBook.rack_location || '-'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Stok Eksemplar</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedBook.available_copy}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>dari {selectedBook.total_copy} total</span>
                    </div>
                  </div>

                  {/* New Statistic: Total Borrows in 1 Year */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid #f59e0b', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Popularitas</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>
                        {loanCountYear}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>total pinjam (1 thn terakhir)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(19, 127, 236, 0.1)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
                <p style={{ fontSize: '12px', margin: 0 }}>Klik 'Edit Data' untuk mengubah informasi buku ini.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setModalType("none")} className="btn-white" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #d1d5db' }}>
                  Tutup
                </button>
                <button onClick={() => { setFormData(selectedBook); setModalType("edit"); }} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(19, 127, 236, 0.2)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [modalType, setModalType] = useState<"none" | "add" | "edit" | "detail">("none");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { showAlert, showConfirm } = useAlert();
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

  const handleOpenAdd = () => {
    resetForm();
    setModalType("add");
  };

  const handleOpenEdit = (member: Member) => {
    setFormData(member);
    setSelectedMember(member);
    setModalType("edit");
  };

  const handleOpenDetail = (member: Member) => {
    setSelectedMember(member);
    setModalType("detail");
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

  const handleExport = () => {
    const csvContent = [
      ["ID Anggota", "Nama", "Kelas", "Jenis Kelamin", "Telepon", "Status"],
      ...filteredMembers.map(m => [m.member_code, m.name, m.kelas || '', m.jenis_kelamin || '', m.phone || '', m.status || 'Aktif'])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anggota_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredMembers = (members || []).filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.member_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.kelas || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && (member.status === 'Aktif' || !member.status));

    return matchesSearch && matchesStatus;
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

      <section style={{ padding: '24px 40px', backgroundColor: 'white', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-main)' }}>
        <div className="search-box" style={{ flex: 1, maxWidth: '1000px' }}>
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            className="search-input"
            type="text"
            placeholder="Cari Nama, ID Anggota, atau Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className={filterStatus === 'all' ? 'btn-primary' : 'btn-white'}
          style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>filter_list</span>
          {filterStatus === 'all' ? 'Semua Status' : 'Hanya Aktif'}
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
                <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0' }}>{(members || []).length}</h3>
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
                <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0' }}>+24</h3>
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
              {/* Kode Anggota */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                  Kode Anggota <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="login-input"
                  style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                  value={formData.member_code || ""}
                  onChange={e => setFormData({ ...formData, member_code: e.target.value })}
                  placeholder="Contoh: MBR-2024-001"
                  required
                />
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
                {/* Kelas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                    Kelas
                  </label>
                  <input
                    className="login-input"
                    style={{ height: '44px', paddingLeft: '12px', fontSize: '0.875rem', borderColor: '#d1d5db' }}
                    value={formData.kelas || ""}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                    placeholder="Contoh: X IPA 1"
                  />
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

                {/* Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

      {/* Detail Modal */}
      {modalType === "detail" && selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid rgba(19, 127, 236, 0.1)' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(19, 127, 236, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>badge</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>Detail Anggota</h2>
              </div>
              <button onClick={() => setModalType("none")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    padding: '6px 12px',
                    backgroundColor: selectedMember.status === 'Nonaktif' ? '#fee2e2' : '#d1fae5',
                    color: selectedMember.status === 'Nonaktif' ? '#991b1b' : '#065f46',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: selectedMember.status === 'Nonaktif' ? '#ef4444' : '#10b981' }}></span>
                    {selectedMember.status || 'Aktif'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                    Bergabung: {selectedMember.joined_at ? new Date(selectedMember.joined_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>ID Anggota</span>
                    <span style={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace' }}>{selectedMember.member_code}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Nama Lengkap</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedMember.name}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Kelas</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedMember.kelas || '-'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Jenis Kelamin</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedMember.jenis_kelamin || '-'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Telepon</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedMember.phone || '-'}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid rgba(19, 127, 236, 0.2)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Email</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{selectedMember.email || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(19, 127, 236, 0.1)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setModalType("none")} className="btn-white" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #d1d5db' }}>
                Tutup
              </button>
              <button onClick={() => { setFormData(selectedMember); setModalType("edit"); }} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
                Edit Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-enable jsx-a11y/no-inline-styles */
/* eslint-disable jsx-a11y/no-inline-styles */
function LoansView({ loans: _loans, onRefresh }: { loans: Loan[], onRefresh: () => void }) {
  const [memberCode, setMemberCode] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [cart, setCart] = useState<Array<{ book: Book, dueDate: string }>>([]);
  const [loanDays] = useState(7);
  const { showAlert, showConfirm } = useAlert();

  const handleScanMember = async () => {
    if (!memberCode.trim()) return;

    try {
      const member = await safeInvoke("find_member_by_code", { memberCode: memberCode }) as Member;
      setSelectedMember(member);
    } catch (err) {
      await showAlert("Anggota tidak ditemukan: " + err);
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
        for (const item of cart) {
          await safeInvoke("borrow_book", {
            bookId: item.book.id,
            memberId: selectedMember.id,
            days: loanDays
          });
        }

        await showAlert("Peminjaman berhasil diproses!", "success");
        setCart([]);
        setSelectedMember(null);
        setMemberCode("");
        onRefresh();
      } catch (err) {
        await showAlert("Gagal memproses peminjaman: " + err, "error");
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
                    Status: <span style={{ color: '#10b981', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Aktif</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Batas pinjam: 3 / 5 Buku</p>
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
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', display: 'block' }}>
                            {new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({loanDays} Hari)</span>
                        </div>
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

export default App;
