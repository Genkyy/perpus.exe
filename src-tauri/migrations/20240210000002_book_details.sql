-- Add new fields to books table
ALTER TABLE books ADD COLUMN publisher TEXT;
ALTER TABLE books ADD COLUMN published_year INTEGER;
ALTER TABLE books ADD COLUMN rack_location TEXT;
ALTER TABLE books ADD COLUMN barcode TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_barcode ON books(barcode);
