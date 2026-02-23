use crate::models::User;
use chrono;
use sqlx::SqlitePool;
use std::fs;
use tauri::{AppHandle, Manager, State}; // Added this import as it's used in backup_database

#[tauri::command]
pub async fn update_profile(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    name: String,
    avatar: Option<String>,
) -> Result<User, String> {
    sqlx::query("UPDATE users SET name = ?, avatar = ? WHERE id = ?")
        .bind(&name)
        .bind(&avatar)
        .bind(user_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, name, role, avatar FROM users WHERE id = ?",
    )
    .bind(user_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(user)
}

#[tauri::command]
pub async fn change_password(
    pool: State<'_, SqlitePool>,
    user_id: i64,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    let current_password: String = sqlx::query_scalar("SELECT password FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if current_password != old_password {
        return Err("Kata sandi lama salah".to_string());
    }

    sqlx::query("UPDATE users SET password = ? WHERE id = ?")
        .bind(new_password)
        .bind(user_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn backup_database(app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let db_path = app_dir.join("library.db");

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    let backup_dir = app_dir.join("backups");
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    }

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("library_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn reset_database(pool: State<'_, SqlitePool>) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM loans")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM books")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM members")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    // We don't delete users to avoid locking ourselves out, or we reset admin password
    sqlx::query("UPDATE users SET password = 'admin123' WHERE username = 'admin'")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
pub async fn get_settings(
    pool: State<'_, SqlitePool>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let rows: Vec<(String, String)> = sqlx::query_as("SELECT key, value FROM settings")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut map = std::collections::HashMap::new();
    for (k, v) in rows {
        map.insert(k, v);
    }
    Ok(map)
}

#[tauri::command]
pub async fn update_setting(
    pool: State<'_, SqlitePool>,
    key: String,
    value: String,
) -> Result<(), String> {
    sqlx::query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind(key)
        .bind(value)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
