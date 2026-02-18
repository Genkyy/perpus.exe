use crate::dashboard_models::{BookStat, CategoryStat, MemberActivity};
use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};
use tauri::State;

#[tauri::command]
pub async fn get_popular_categories(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<CategoryStat>, String> {
    let rows = sqlx::query(
        r#"
        SELECT 
            b.category, 
            COUNT(l.id) as count
        FROM loans l
        JOIN books b ON l.book_id = b.id
        GROUP BY b.category
        ORDER BY count DESC
        LIMIT 5
        "#,
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut stats = Vec::new();
    for row in rows {
        stats.push(CategoryStat {
            category: row
                .try_get("category")
                .unwrap_or("Uncategorized".to_string()),
            count: row.try_get("count").unwrap_or(0),
        });
    }
    Ok(stats)
}

#[tauri::command]
pub async fn get_most_borrowed_books(pool: State<'_, SqlitePool>) -> Result<Vec<BookStat>, String> {
    let rows = sqlx::query(
        r#"
        SELECT 
            b.title, 
            b.author, 
            b.category,
            b.cover,
            COUNT(l.id) as loan_count
        FROM loans l
        JOIN books b ON l.book_id = b.id
        GROUP BY b.id
        ORDER BY loan_count DESC
        LIMIT 3
        "#,
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut stats = Vec::new();
    for row in rows {
        stats.push(BookStat {
            title: row.try_get("title").unwrap_or_default(),
            author: row.try_get("author").unwrap_or_default(),
            category: row.try_get("category").unwrap_or_default(),
            cover: row.try_get("cover").ok(),
            loan_count: row.try_get("loan_count").unwrap_or(0),
        });
    }
    Ok(stats)
}

#[tauri::command]
pub async fn get_member_activity_stats(
    pool: State<'_, SqlitePool>,
) -> Result<Vec<MemberActivity>, String> {
    let rows = sqlx::query(
        r#"
        SELECT 
            m.name, 
            m.joined_at,
            (SELECT COUNT(*) FROM loans WHERE member_id = m.id) as total_loans,
            (SELECT MAX(loan_date) FROM loans WHERE member_id = m.id) as last_activity
        FROM members m
        ORDER BY last_activity DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut activities = Vec::new();
    let now = Utc::now();

    for row in rows {
        let name: String = row.try_get("name").unwrap_or_default();
        let joined_at: Option<DateTime<Utc>> = row.try_get("joined_at").ok(); // Use Option
        let total_loans: i64 = row.try_get("total_loans").unwrap_or(0);
        let last_activity: Option<DateTime<Utc>> = row.try_get("last_activity").ok();

        let status = match last_activity {
            Some(date) => {
                let diff = (now - date).num_days();
                if diff <= 30 {
                    "Active".to_string()
                } else {
                    "Inactive".to_string()
                }
            }
            None => "Inactive".to_string(),
        };

        activities.push(MemberActivity {
            name,
            joined_at,
            total_loans,
            status,
            last_activity: last_activity,
        });
    }

    Ok(activities)
}
