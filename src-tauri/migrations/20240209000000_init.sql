-- =====================================
-- SETTINGS TABLE (buat dulu karena dipakai banyak insert)
-- =====================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default settings
INSERT INTO settings (key, value) VALUES ('language', 'id');
INSERT INTO settings (key, value) VALUES ('theme', 'light');
INSERT INTO settings (key, value) VALUES ('barcode_path', '');
INSERT INTO settings (key, value) VALUES ('fine_late_per_day', '1000');
INSERT INTO settings (key, value) VALUES ('fine_damage_light', '15000');
INSERT INTO settings (key, value) VALUES ('fine_damage_medium', '50000');
INSERT INTO settings (key, value) VALUES ('fine_damage_heavy', '0');


-- =====================================
-- BOOKS TABLE
-- =====================================
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    category TEXT,
    publisher TEXT,
    published_year INTEGER,
    rack_location TEXT,
    barcode TEXT UNIQUE,
    total_copy INTEGER NOT NULL DEFAULT 1,
    available_copy INTEGER NOT NULL DEFAULT 1,
    cover TEXT,
    status TEXT DEFAULT 'Tersedia',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);


-- =====================================
-- MEMBERS TABLE
-- =====================================
CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    kelas TEXT,
    jenis_kelamin TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Aktif',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);


-- =====================================
-- USERS TABLE
-- =====================================
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default admin
INSERT INTO users (username, password, name, role)
VALUES ('admin', 'admin123', 'Administrator', 'admin');


-- =====================================
-- LOANS TABLE
-- =====================================
CREATE TABLE loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    loan_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    status TEXT NOT NULL DEFAULT 'borrowed',
    book_condition TEXT DEFAULT 'Bagus',
    damage_category TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
);


-- =====================================
-- FINES TABLE
-- =====================================
CREATE TABLE fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    fine_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (loan_id) REFERENCES loans(id)
);