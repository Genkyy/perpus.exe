use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CategoryStat {
    pub category: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct BookStat {
    pub title: String,
    pub author: String,
    pub category: Option<String>,
    pub cover: Option<String>,
    pub loan_count: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MemberActivity {
    pub name: String,
    pub joined_at: Option<DateTime<Utc>>,
    pub total_loans: i64,
    pub status: String, // 'Active' or 'Inactive' based on logic
    pub last_activity: Option<DateTime<Utc>>,
}
