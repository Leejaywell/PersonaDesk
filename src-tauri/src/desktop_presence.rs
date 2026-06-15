use serde::Serialize;
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    App, Emitter, Manager, Runtime,
};

pub const TRAY_SHOW_CONSOLE_ID: &str = "show-console";
pub const TRAY_TOGGLE_COMPANION_ID: &str = "toggle-companion";
pub const TRAY_STOP_OBSERVATION_ID: &str = "stop-observation";
pub const TRAY_QUIT_ID: &str = "quit";
pub const STOP_OBSERVATION_EVENT: &str = "personadesk-stop-observation";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayMenuItemPlan {
    pub id: &'static str,
    pub label: &'static str,
    pub action: &'static str,
    pub enabled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationTriggerPlan {
    pub id: &'static str,
    pub label: &'static str,
    pub source: &'static str,
    pub requires_user_permission: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopPresencePlan {
    pub message: &'static str,
    pub tray_menu_items: Vec<TrayMenuItemPlan>,
    pub notification_triggers: Vec<NotificationTriggerPlan>,
    pub disclosures: Vec<&'static str>,
}

pub fn presence_plan() -> DesktopPresencePlan {
    DesktopPresencePlan {
        message: "Native desktop presence contracts are available in the Tauri runtime.",
        tray_menu_items: vec![
            TrayMenuItemPlan {
                id: TRAY_SHOW_CONSOLE_ID,
                label: "Show PersonaDesk",
                action: "focus-main-window",
                enabled: true,
            },
            TrayMenuItemPlan {
                id: TRAY_TOGGLE_COMPANION_ID,
                label: "Show or hide companion",
                action: "toggle-companion-window",
                enabled: true,
            },
            TrayMenuItemPlan {
                id: TRAY_STOP_OBSERVATION_ID,
                label: "Stop observation",
                action: "stop-active-observation",
                enabled: true,
            },
            TrayMenuItemPlan {
                id: TRAY_QUIT_ID,
                label: "Quit PersonaDesk",
                action: "quit-app",
                enabled: true,
            },
        ],
        notification_triggers: vec![
            NotificationTriggerPlan {
                id: "task-delivered",
                label: "Task delivered",
                source: "task-run",
                requires_user_permission: true,
            },
            NotificationTriggerPlan {
                id: "task-blocked",
                label: "Task blocked for approval",
                source: "task-run",
                requires_user_permission: true,
            },
            NotificationTriggerPlan {
                id: "observation-boundary",
                label: "Observation boundary blocked",
                source: "observation-session",
                requires_user_permission: true,
            },
        ],
        disclosures: vec![
            "Tray actions are wired to local Tauri window and app events.",
            "Notification previews use a local runtime notification API when permission already exists.",
            "No notification preview uploads task text, observation summaries, or companion chat.",
        ],
    }
}

pub fn tray_action_for_menu_id(menu_id: &str) -> Option<&'static str> {
    presence_plan()
        .tray_menu_items
        .into_iter()
        .find(|item| item.id == menu_id)
        .map(|item| item.action)
}

pub fn install_desktop_presence_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let handle = app.handle();
    let plan = presence_plan();
    let mut menu = MenuBuilder::new(handle);

    for item in &plan.tray_menu_items {
        menu = menu.item(&MenuItemBuilder::with_id(item.id, item.label).enabled(item.enabled).build(handle)?);
    }

    let menu = menu.build()?;
    let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;

    TrayIconBuilder::with_id("personadesk-main")
        .tooltip("PersonaDesk")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            handle_tray_menu_event(app, event.id().as_ref());
        })
        .build(app)?;

    Ok(())
}

fn handle_tray_menu_event<R: Runtime>(app: &tauri::AppHandle<R>, menu_id: &str) {
    match tray_action_for_menu_id(menu_id) {
        Some("focus-main-window") => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        Some("toggle-companion-window") => {
            if let Some(window) = app.get_webview_window("companion") {
                let visible = window.is_visible().unwrap_or(false);

                if visible {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                }
            }
        }
        Some("stop-active-observation") => {
            let _ = app.emit(STOP_OBSERVATION_EVENT, ());
        }
        Some("quit-app") => app.exit(0),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_tray_and_notification_contracts() {
        let plan = presence_plan();

        assert!(plan.tray_menu_items.iter().any(|item| {
            item.id == TRAY_TOGGLE_COMPANION_ID
                && item.action == "toggle-companion-window"
                && item.enabled
        }));
        assert!(plan
            .notification_triggers
            .iter()
            .any(|trigger| trigger.id == "task-delivered" && trigger.requires_user_permission));
        assert!(plan
            .disclosures
            .iter()
            .any(|disclosure| disclosure.contains("No notification preview uploads")));
    }

    #[test]
    fn maps_menu_ids_to_tray_actions() {
        assert_eq!(tray_action_for_menu_id(TRAY_SHOW_CONSOLE_ID), Some("focus-main-window"));
        assert_eq!(
            tray_action_for_menu_id(TRAY_TOGGLE_COMPANION_ID),
            Some("toggle-companion-window")
        );
        assert_eq!(
            tray_action_for_menu_id(TRAY_STOP_OBSERVATION_ID),
            Some("stop-active-observation")
        );
        assert_eq!(tray_action_for_menu_id(TRAY_QUIT_ID), Some("quit-app"));
        assert_eq!(tray_action_for_menu_id("unknown"), None);
    }
}
