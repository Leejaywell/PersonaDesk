mod agent_detection;
mod desktop_windows;

use agent_detection::{detect_known_agents, DetectedAgent};
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            platform_name,
            detect_local_agents,
            desktop_window_plan
        ])
        .run(tauri::generate_context!())
        .expect("error while running PersonaDesk");
}
