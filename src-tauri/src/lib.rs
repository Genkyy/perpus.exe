mod commands;
pub mod dashboard_commands;
pub mod dashboard_models;
mod db;
mod models;
pub mod settings_commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(&handle)
                    .await
                    .expect("Failed to initialize database");
                handle.manage(pool);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_books,
            commands::add_book,
            commands::update_book,
            commands::delete_book,
            commands::get_members,
            commands::add_member,
            commands::update_member,
            commands::delete_member,
            commands::borrow_book,
            commands::return_book,
            commands::get_recent_returns,
            commands::get_active_loans,
            commands::get_stats,
            commands::get_recent_activity,
            commands::get_weekly_circulation,
            commands::login,
            commands::find_member_by_code,
            commands::find_book_by_isbn,
            commands::find_active_loan,
            commands::get_monthly_new_members,
            commands::get_book_loan_count_year,
            commands::get_overdue_loans,
            commands::get_member_loans,
            commands::get_member_stats,
            commands::get_member_active_loan_count,
            commands::get_book_borrowers,
            commands::generate_member_code,
            commands::get_member_borrowing_history,
            commands::get_fines,
            commands::pay_fine,
            commands::create_fine,
            commands::get_fines_by_member,
            settings_commands::update_profile,
            settings_commands::change_password,
            settings_commands::backup_database,
            settings_commands::reset_database,
            settings_commands::get_app_version,
            settings_commands::get_settings,
            settings_commands::update_setting,
            dashboard_commands::get_popular_categories,
            dashboard_commands::get_most_borrowed_books,
            dashboard_commands::get_member_activity_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
