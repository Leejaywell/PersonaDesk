mod agent_detection;
mod desktop_presence;
mod desktop_windows;

use agent_detection::{detect_known_agents, DetectedAgent};
use desktop_presence::{install_desktop_presence_tray, presence_plan, DesktopPresencePlan};
use desktop_windows::{
    companion_window_state, set_companion_window_visibility, window_plan, CompanionWindowState,
    DesktopWindowPlan,
};

#[tauri::command]
fn platform_name() -> &'static str {
    std::env::consts::OS
}

#[tauri::command]
fn detect_local_agents() -> Vec<DetectedAgent> {
    detect_known_agents()
}

#[tauri::command]
fn desktop_window_plan() -> Vec<DesktopWindowPlan> {
    window_plan()
}

#[tauri::command]
fn companion_window_status(app: tauri::AppHandle) -> CompanionWindowState {
    companion_window_state(&app)
}

#[tauri::command]
fn set_companion_window_visible(app: tauri::AppHandle, visible: bool) -> CompanionWindowState {
    set_companion_window_visibility(&app, visible)
}

#[tauri::command]
fn desktop_presence_plan() -> DesktopPresencePlan {
    presence_plan()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            install_desktop_presence_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            platform_name,
            companion_window_status,
            detect_local_agents,
            desktop_presence_plan,
            desktop_window_plan,
            set_companion_window_visible
        ])
        .run(tauri::generate_context!())
        .expect("error while running PersonaDesk");
}
