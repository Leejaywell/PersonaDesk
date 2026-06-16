mod agent_detection;
mod desktop_presence;
mod desktop_windows;

use agent_detection::{detect_known_agents, DetectedAgent};
use desktop_presence::{install_desktop_presence_tray, presence_plan, DesktopPresencePlan};
use desktop_windows::{window_plan, DesktopWindowPlan};

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
fn desktop_presence_plan() -> DesktopPresencePlan {
    presence_plan()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            install_desktop_presence_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            platform_name,
            detect_local_agents,
            desktop_presence_plan,
            desktop_window_plan
        ])
        .run(tauri::generate_context!())
        .expect("error while running PersonaDesk");
}
