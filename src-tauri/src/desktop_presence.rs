use serde::Serialize;

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
                id: "show-console",
                label: "Show PersonaDesk",
                action: "focus-main-window",
                enabled: true,
            },
            TrayMenuItemPlan {
                id: "toggle-companion",
                label: "Show or hide companion",
                action: "toggle-companion-window",
                enabled: true,
            },
            TrayMenuItemPlan {
                id: "stop-observation",
                label: "Stop observation",
                action: "stop-active-observation",
                enabled: true,
            },
            TrayMenuItemPlan {
                id: "quit",
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
            "Tray actions are declared before they are wired to OS menu events.",
            "Notification previews use a local runtime notification API when permission already exists.",
            "No notification preview uploads task text, observation summaries, or companion chat.",
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_tray_and_notification_contracts() {
        let plan = presence_plan();

        assert!(plan.tray_menu_items.iter().any(|item| {
            item.id == "toggle-companion"
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
}
