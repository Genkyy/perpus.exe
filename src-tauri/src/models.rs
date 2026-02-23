use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Book {
    pub id: Option<i64>,
    pub title: String,
    pub author: String,
    pub isbn: String,
    pub category: Option<String>,
    pub publisher: Option<String>,
    pub published_year: Option<i64>,
    pub rack_location: Option<String>,
    pub barcode: Option<String>,
    pub total_copy: i64,
    pub available_copy: i64,
    pub cover: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Member {
    pub id: Option<i64>,
    pub member_code: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub kelas: Option<String>,
    pub jenis_kelamin: Option<String>,
    pub status: Option<String>,
    pub joined_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Loan {
    pub id: Option<i64>,
    pub book_id: i64,
    pub member_id: i64,
    pub loan_date: DateTime<Utc>,
    pub due_date: DateTime<Utc>,
    pub return_date: Option<DateTime<Utc>>,
    pub status: String,
    pub book_condition: Option<String>,
    pub damage_category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct LoanWithDetails {
    pub id: i64,
    pub book_title: String,
    pub member_name: String,
    pub loan_date: DateTime<Utc>,
    pub due_date: DateTime<Utc>,
    pub return_date: Option<DateTime<Utc>>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub name: String,
    pub role: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewMember {
    pub member_code: Option<String>,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub kelas: Option<String>,
    pub jenis_kelamin: Option<String>,
    pub status: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Fine {
    pub id: Option<i64>,
    pub loan_id: i64,
    pub amount: i64,
    pub fine_type: String,
    pub status: String,
    pub created_at: Option<DateTime<Utc>>,
    pub paid_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct FineWithDetails {
    pub id: i64,
    pub loan_id: i64,
    pub member_id: i64,
    pub member_name: String,
    pub member_code: String,
    pub member_kelas: Option<String>,
    pub book_title: String,
    pub loan_date: DateTime<Utc>,
    pub due_date: DateTime<Utc>,
    pub return_date: Option<DateTime<Utc>>,
    pub amount: i64,
    pub fine_type: String,
    pub status: String,
    pub paid_at: Option<DateTime<Utc>>,
}
