-- Users table for staff login
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- In a real app, this should be hashed
    name TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default admin user
INSERT OR IGNORE INTO users (username, password, name, role) 
VALUES ('admin', 'admin123', 'Administrator', 'admin');
