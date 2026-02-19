use crate::models::{Book, Loan, LoanWithDetails, Member, NewMember, User};
use chrono::{Duration, Utc};
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn get_books(pool: State<'_, SqlitePool>) -> Result<Vec<Book>, String> {
    sqlx::query_as::<_, Book>("SELECT * FROM books WHERE deleted_at IS NULL ORDER BY title ASC")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn add_book(pool: State<'_, SqlitePool>, book: Book) -> Result<i64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let res = sqlx::query("INSERT INTO books (title, author, isbn, category, publisher, published_year, rack_location, total_copy, available_copy, cover, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(book.title)
        .bind(book.author)
        .bind(book.isbn)
        .bind(book.category)
        .bind(book.publisher)
        .bind(book.published_year)
        .bind(book.rack_location)
        .bind(book.total_copy)
        .bind(book.total_copy) // initial available copy is total copy
        .bind(book.cover)
        .bind(book.status.unwrap_or_else(|| "Tersedia".to_string()))
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let id = res.last_insert_rowid();
    let year = Utc::now().format("%Y").to_string();
    let barcode = format!("B-{}-{}", year, format!("{:04}", id));

    sqlx::query("UPDATE books SET barcode = ? WHERE id = ?")
        .bind(barcode)
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn update_book(pool: State<'_, SqlitePool>, book: Book) -> Result<(), String> {
    sqlx::query("UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, publisher = ?, published_year = ?, rack_location = ?, total_copy = ?, available_copy = ?, cover = ?, status = ? WHERE id = ?")
        .bind(book.title)
        .bind(book.author)
        .bind(book.isbn)
        .bind(book.category)
        .bind(book.publisher)
        .bind(book.published_year)
        .bind(book.rack_location)
        .bind(book.total_copy)
        .bind(book.available_copy)
        .bind(book.cover)
        .bind(book.status)
        .bind(book.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_book(pool: State<'_, SqlitePool>, id: i64) -> Result<(), String> {
    let active_loans: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM loans WHERE book_id = ? AND status = 'borrowed'")
            .bind(id)
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    if active_loans > 0 {
        return Err("Buku masih sedang dipinjam".to_string());
    }

    sqlx::query("UPDATE books SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Members Commands
#[tauri::command]
pub async fn get_members(pool: State<'_, SqlitePool>) -> Result<Vec<Member>, String> {
    sqlx::query_as::<_, Member>("SELECT * FROM members ORDER BY name ASC")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_book_loan_count_year(
    pool: State<'_, SqlitePool>,
    book_id: i64,
) -> Result<i64, String> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM loans WHERE book_id = ? AND loan_date >= date('now', '-1 year')",
    )
    .bind(book_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(count)
}

#[tauri::command]
pub async fn add_member(pool: State<'_, SqlitePool>, member: NewMember) -> Result<i64, String> {
    let code = match member.member_code {
        Some(c) if !c.trim().is_empty() => c,
        _ => internal_generate_member_code(&pool)
            .await
            .map_err(|e| e.to_string())?,
    };

    let res = sqlx::query(
        r#"
        INSERT INTO members
        (member_code, name, email, kelas, phone, jenis_kelamin, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(code)
    .bind(member.name)
    .bind(member.email)
    .bind(member.kelas)
    .bind(member.phone)
    .bind(member.jenis_kelamin)
    .bind(member.status.unwrap_or_else(|| "Aktif".to_string()))
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(res.last_insert_rowid())
}

// Loan Logic
#[tauri::command]
pub async fn borrow_book(
    pool: State<'_, SqlitePool>,
    book_id: i64,
    member_id: i64,
    days: i64,
) -> Result<i64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Check book availability
    let book = sqlx::query_as::<_, Book>("SELECT * FROM books WHERE id = ? AND deleted_at IS NULL")
        .bind(book_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| "Buku tidak ditemukan".to_string())?;

    if book.available_copy <= 0 {
        return Err("Stok buku habis".to_string());
    }

    // Check member status
    let member_status: String = sqlx::query_scalar("SELECT status FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| "Member tidak ditemukan".to_string())?;

    if member_status == "Nonaktif" {
        return Err("Anggota berstatus Nonaktif tidak dapat meminjam buku".to_string());
    }

    // Create loan record
    let loan_date = Utc::now();
    let due_date = loan_date + Duration::days(days);

    let res = sqlx::query("INSERT INTO loans (book_id, member_id, loan_date, due_date, status) VALUES (?, ?, ?, ?, 'borrowed')")
        .bind(book_id)
        .bind(member_id)
        .bind(loan_date)
        .bind(due_date)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Update book status and stock
    sqlx::query("UPDATE books SET available_copy = available_copy - 1, status = CASE WHEN available_copy - 1 = 0 THEN 'Dipinjam' ELSE status END WHERE id = ?")
        .bind(book_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(res.last_insert_rowid())
}

#[tauri::command]
pub async fn return_book(pool: State<'_, SqlitePool>, loan_id: i64) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let loan = sqlx::query_as::<_, Loan>("SELECT * FROM loans WHERE id = ?")
        .bind(loan_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| "Loan record not found".to_string())?;

    if loan.status == "returned" {
        return Err("Book already returned".to_string());
    }

    let return_date = Utc::now();
    let mut fine: i64 = 0;

    if return_date > loan.due_date {
        let overdue_days = (return_date - loan.due_date).num_days();
        fine = overdue_days * 1000; // Example fine: 1000 per day
    }

    sqlx::query(
        "UPDATE loans SET return_date = ?, status = 'returned', fine_amount = ? WHERE id = ?",
    )
    .bind(return_date)
    .bind(fine)
    .bind(loan_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE books SET available_copy = available_copy + 1, status = 'Tersedia' WHERE id = ?",
    )
    .bind(loan.book_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_active_loans(pool: State<'_, SqlitePool>) -> Result<Vec<LoanWithDetails>, String> {
    sqlx::query_as::<_, LoanWithDetails>(
        r#"
        SELECT 
            l.id, 
            b.title as book_title, 
            m.name as member_name, 
            l.loan_date, 
            l.due_date, 
            l.return_date, 
            COALESCE(l.fine_amount, 0) as fine_amount, 
            l.status
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE l.status = 'borrowed' AND b.deleted_at IS NULL
        ORDER BY l.loan_date DESC
        "#,
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct RecentActivity {
    pub id: String,
    pub title: String,
    pub description: String,
    pub time: String,
    pub type_name: String, // loan, return, member
}

#[tauri::command]
pub async fn get_recent_activity(
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<Vec<RecentActivity>, String> {
    // This query combines latest loans and latest new members using UNION
    let activities = sqlx::query_as::<_, RecentActivity>(
        r#"
        SELECT 
            'L-' || l.id as id,
            m.name as title,
            'meminjam "' || b.title || '"' as description,
            l.loan_date as time,
            'loan' as type_name
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE b.deleted_at IS NULL
        UNION ALL
        SELECT 
            'M-' || id as id,
            name as title,
            'Bergabung sebagai anggota baru' as description,
            joined_at as time,
            'member' as type_name
        FROM members
        ORDER BY time DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(activities)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DailyStats {
    pub day: String,
    pub count: i64,
}

#[tauri::command]
pub async fn get_weekly_circulation(
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<Vec<DailyStats>, String> {
    let days = vec![
        "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
    ];
    let mut stats = Vec::new();

    for (index, day) in days.iter().enumerate() {
        // Simple query to count loans per weekday (SQLite strftime %w: 0-6)
        let count: i64 = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM loans WHERE strftime('%w', loan_date) = ?",
        )
        .bind(index.to_string())
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

        stats.push(DailyStats {
            day: day.to_string(),
            count,
        });
    }

    Ok(stats)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Stats {
    pub total_books: i64,
    pub total_members: i64,
    pub active_loans: i64,
    pub overdue_loans: i64,
    pub monthly_new_members: i64,
    pub total_loans_count: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct MemberLoanInfo {
    pub id: i64,
    pub book_id: i64,
    pub book_title: String,
    pub book_isbn: String,
    pub book_cover: Option<String>,
    pub loan_date: chrono::DateTime<chrono::Utc>,
    pub due_date: chrono::DateTime<chrono::Utc>,
    pub status: String,
    pub fine_amount: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MemberStats {
    pub total_loans_30_days: i64,
    pub total_loans_1_year: i64,
    pub active_loans: i64,
    pub overdue_loans: i64,
    pub total_fines: i64,
}

#[tauri::command]
pub async fn get_stats(pool: tauri::State<'_, sqlx::SqlitePool>) -> Result<Stats, String> {
    let total_books: i64 =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM books WHERE deleted_at IS NULL")
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    let total_members: i64 = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM members WHERE status = 'Aktif' OR status IS NULL",
    )
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let active_loans: i64 =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM loans l JOIN books b ON l.book_id = b.id WHERE l.status = 'borrowed' AND b.deleted_at IS NULL")
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    let overdue_loans: i64 = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM loans l JOIN books b ON l.book_id = b.id WHERE l.status = 'borrowed' AND b.deleted_at IS NULL AND l.due_date < CURRENT_TIMESTAMP",
    )
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let monthly_new_members: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM members WHERE joined_at >= date('now', 'start of month')",
    )
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let total_loans_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM loans")
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Stats {
        total_books,
        total_members,
        active_loans,
        overdue_loans,
        monthly_new_members,
        total_loans_count,
    })
}

#[tauri::command]
pub async fn login(
    pool: tauri::State<'_, sqlx::SqlitePool>,
    username: String,
    password: String,
) -> Result<User, String> {
    let user = sqlx::query_as::<sqlx::Sqlite, User>(
        "SELECT id, username, name, role FROM users WHERE username = ? AND password = ?",
    )
    .bind(username)
    .bind(password)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    match user {
        Some(u) => Ok(u),
        None => Err("Username atau password salah".to_string()),
    }
}

#[tauri::command]
pub async fn find_member_by_code(
    pool: State<'_, SqlitePool>,
    member_code: String,
) -> Result<Member, String> {
    let member = sqlx::query_as::<_, Member>("SELECT * FROM members WHERE member_code = ?")
        .bind(member_code)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    match member {
        Some(m) => Ok(m),
        None => Err("Anggota tidak ditemukan".to_string()),
    }
}

#[tauri::command]
pub async fn find_book_by_isbn(pool: State<'_, SqlitePool>, isbn: String) -> Result<Book, String> {
    let book =
        sqlx::query_as::<_, Book>("SELECT * FROM books WHERE (isbn = ? OR barcode = ?) AND deleted_at IS NULL ORDER BY id ASC LIMIT 1")
            .bind(&isbn)
            .bind(&isbn)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    match book {
        Some(b) => {
            if b.available_copy <= 0 {
                Err("Stok buku habis".to_string())
            } else if b.status.as_deref().unwrap_or("Tersedia") == "Tidak Tersedia" {
                Err("Buku sedang tidak tersedia (Non-Aktif)".to_string())
            } else {
                Ok(b)
            }
        }
        None => Err("Buku tidak ditemukan".to_string()),
    }
}

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct LoanDetail {
    pub id: i64,
    pub book_id: i64,
    pub member_id: i64,
    pub book_title: String,
    pub book_isbn: String,
    pub book_cover: Option<String>,
    pub member_name: String,
    pub member_code: String,
    pub member_kelas: Option<String>,
    pub loan_date: chrono::DateTime<chrono::Utc>,
    pub due_date: chrono::DateTime<chrono::Utc>,
    pub status: String,
    pub fine_amount: i64,
    pub member_active_loans: i64,
    pub member_status: Option<String>,
}

#[tauri::command]
pub async fn find_active_loan(
    pool: State<'_, SqlitePool>,
    query: String,
) -> Result<Vec<LoanDetail>, String> {
    let sql = r#"
        SELECT 
            l.id, l.book_id, l.member_id,
            b.title as book_title, b.isbn as book_isbn, b.cover as book_cover,
            m.name as member_name, m.member_code, m.status as member_status, m.kelas as member_kelas,
            l.loan_date, l.due_date, l.status,
            CAST(
                MAX(0, (julianday('now') - julianday(l.due_date))) * 1000 
            AS INTEGER) as fine_amount,
            (SELECT COUNT(*) FROM loans WHERE member_id = m.id AND status = 'borrowed') as member_active_loans
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE l.status = 'borrowed' AND b.deleted_at IS NULL
        AND (
            b.isbn = ? OR 
            b.barcode = ? OR 
            m.member_code = ? OR
            m.name LIKE ?
        )
        ORDER BY l.due_date ASC
    "#;

    let loans = sqlx::query_as::<_, LoanDetail>(sql)
        .bind(&query)
        .bind(&query)
        .bind(&query)
        .bind(format!("%{}%", query))
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if loans.is_empty() {
        return Err("Data peminjaman tidak ditemukan".to_string());
    }

    Ok(loans)
}

#[tauri::command]
pub async fn get_overdue_loans(pool: State<'_, SqlitePool>) -> Result<Vec<LoanDetail>, String> {
    let sql = r#"
        SELECT 
            l.id, l.book_id, l.member_id,
            b.title as book_title, b.isbn as book_isbn, b.cover as book_cover,
            m.name as member_name, m.member_code, m.kelas as member_kelas,
            l.loan_date, l.due_date, l.status,
            CAST(
                MAX(0, (julianday('now') - julianday(l.due_date))) * 1000 
            AS INTEGER) as fine_amount,
            (SELECT COUNT(*) FROM loans WHERE member_id = m.id AND status = 'borrowed') as member_active_loans
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE l.status = 'borrowed' AND l.due_date < CURRENT_TIMESTAMP AND b.deleted_at IS NULL
        ORDER BY l.due_date ASC
    "#;

    sqlx::query_as::<_, LoanDetail>(sql)
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_member_loans(
    pool: State<'_, SqlitePool>,
    member_id: i64,
) -> Result<Vec<MemberLoanInfo>, String> {
    let loans = sqlx::query_as::<_, MemberLoanInfo>(
        r#"
        SELECT 
            l.id,
            l.book_id,
            b.title as book_title,
            b.isbn as book_isbn,
            b.cover as book_cover,
            l.loan_date,
            l.due_date,
            l.status,
            CAST(
                MAX(0, (julianday('now') - julianday(l.due_date))) * 1000 
            AS INTEGER) as fine_amount
        FROM loans l
        JOIN books b ON l.book_id = b.id
        WHERE l.member_id = ?
        AND l.status = 'borrowed'
        ORDER BY l.loan_date DESC
        "#,
    )
    .bind(member_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(loans)
}

#[tauri::command]
pub async fn get_member_stats(
    pool: State<'_, SqlitePool>,
    member_id: i64,
) -> Result<MemberStats, String> {
    let total_loans_30_days: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) 
        FROM loans 
        WHERE member_id = ? 
        AND loan_date >= datetime('now', '-30 days')
        "#,
    )
    .bind(member_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let active_loans: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM loans WHERE member_id = ? AND status = 'borrowed'",
    )
    .bind(member_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let overdue_loans: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) 
        FROM loans 
        WHERE member_id = ? 
        AND status = 'borrowed' 
        AND due_date < datetime('now')
        "#,
    )
    .bind(member_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let total_loans_1_year: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) 
        FROM loans 
        WHERE member_id = ? 
        AND loan_date >= datetime('now', '-1 year')
        "#,
    )
    .bind(member_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let total_fines: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(
            CAST(
                MAX(0, (julianday('now') - julianday(due_date))) * 1000 
            AS INTEGER)
        ), 0)
        FROM loans 
        WHERE member_id = ? 
        AND status = 'borrowed'
        "#,
    )
    .bind(member_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(MemberStats {
        total_loans_30_days,
        total_loans_1_year,
        active_loans,
        overdue_loans,
        total_fines,
    })
}

#[tauri::command]
pub async fn get_member_active_loan_count(
    pool: State<'_, SqlitePool>,
    member_id: i64,
) -> Result<i64, String> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM loans WHERE member_id = ? AND status = 'borrowed'",
    )
    .bind(member_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(count)
}
#[tauri::command]
pub async fn get_monthly_new_members(
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<i64, String> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) 
        FROM members
        WHERE strftime('%Y-%m', joined_at) = strftime('%Y-%m', 'now')
        "#,
    )
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(count)
}
#[tauri::command]
pub async fn delete_member(
    pool: tauri::State<'_, sqlx::SqlitePool>,
    member_id: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE members SET status = 'Nonaktif' WHERE id = ?")
        .bind(member_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
#[tauri::command]
pub async fn update_member(pool: State<'_, SqlitePool>, member: Member) -> Result<(), String> {
    sqlx::query(
        r#"
        UPDATE members SET
            member_code = ?,
            name = ?,
            email = ?,
            phone = ?,
            kelas = ?,
            jenis_kelamin = ?,
            status = ?
        WHERE id = ?
        "#,
    )
    .bind(member.member_code)
    .bind(member.name)
    .bind(member.email)
    .bind(member.phone)
    .bind(member.kelas)
    .bind(member.jenis_kelamin)
    .bind(member.status)
    .bind(member.id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn generate_member_code(pool: State<'_, SqlitePool>) -> Result<String, String> {
    internal_generate_member_code(&pool)
        .await
        .map_err(|e| e.to_string())
}

async fn internal_generate_member_code(pool: &SqlitePool) -> Result<String, sqlx::Error> {
    let current_year = chrono::Utc::now().format("%Y").to_string();
    let last_code: Option<String> = sqlx::query_scalar(
        "SELECT member_code FROM members WHERE member_code LIKE ? ORDER BY member_code DESC LIMIT 1"
    )
    .bind(format!("MBR-{}%", current_year))
    .fetch_optional(pool)
    .await?;

    let next_num = match last_code {
        Some(code) => {
            let parts: Vec<&str> = code.split('-').collect();
            if parts.len() == 3 {
                parts[2].parse::<i64>().unwrap_or(0) + 1
            } else {
                1
            }
        }
        None => 1,
    };

    Ok(format!("MBR-{}-{:04}", current_year, next_num))
}

#[tauri::command]
pub async fn get_book_borrowers(
    pool: State<'_, SqlitePool>,
    book_id: i64,
) -> Result<Vec<LoanDetail>, String> {
    let loans = sqlx::query_as::<_, LoanDetail>(
        r#"
        SELECT 
            l.id, l.book_id, l.member_id,
            b.title as book_title, b.isbn as book_isbn, b.cover as book_cover,
            m.name as member_name, m.member_code, m.status as member_status, m.kelas as member_kelas,
            l.loan_date, l.due_date, l.status,
            CAST(
                MAX(0, (julianday('now') - julianday(l.due_date))) * 1000 
            AS INTEGER) as fine_amount,
            (SELECT COUNT(*) FROM loans WHERE member_id = m.id AND status = 'borrowed') as member_active_loans
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN members m ON l.member_id = m.id
        WHERE l.book_id = ? AND l.status = 'borrowed'
        ORDER BY l.loan_date DESC
        "#
    )
    .bind(book_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(loans)
}
