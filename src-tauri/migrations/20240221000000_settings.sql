CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'id');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light');
INSERT OR IGNORE INTO settings (key, value) VALUES ('barcode_path', '');
