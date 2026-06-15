mod agent_detection;

use agent_detection::{detect_known_agents, DetectedAgent};

#[tauri::command]
fn platform_name() -> &'static str {
    std::env::consts::OS
}

#[tauri::command]
fn detect_local_agents() -> Vec<DetectedAgent> {
    detect_known_agents()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![platform_name, detect_local_agents])
        .run(tauri::generate_context!())
        .expect("error while running PersonaDesk");
}
