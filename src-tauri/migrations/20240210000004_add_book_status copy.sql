-- Add status column to books table
ALTER TABLE books ADD COLUMN status TEXT DEFAULT 'Tersedia';
