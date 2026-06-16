use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWindowPlan {
    pub label: &'static str,
    pub surface: &'static str,
    pub title: &'static str,
    pub width: u32,
    pub height: u32,
    pub always_on_top: bool,
    pub decorations: bool,
    pub transparent: bool,
    pub shadow: bool,
    pub skip_taskbar: bool,
    pub focus: bool,
    pub drag_region: bool,
}

pub fn window_plan() -> Vec<DesktopWindowPlan> {
    vec![
        DesktopWindowPlan {
            label: "main",
            surface: "control-console",
            title: "PersonaDesk",
            width: 1280,
            height: 820,
            always_on_top: false,
            decorations: true,
            transparent: false,
            shadow: true,
            skip_taskbar: false,
            focus: true,
            drag_region: false,
        },
        DesktopWindowPlan {
            label: "companion",
            surface: "floating-companion",
            title: "PersonaDesk Companion",
            width: 280,
            height: 360,
            always_on_top: true,
            decorations: false,
            transparent: true,
            shadow: false,
            skip_taskbar: true,
            focus: false,
            drag_region: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn exposes_main_and_companion_window_plan() {
        let plan = window_plan();

        assert_eq!(plan.len(), 2);
        assert!(plan.iter().any(|window| window.label == "main"));
        assert!(plan.iter().any(|window| {
            window.label == "companion"
                && window.surface == "floating-companion"
                && window.always_on_top
                && !window.decorations
                && window.transparent
                && !window.shadow
                && window.skip_taskbar
                && !window.focus
                && window.drag_region
        }));
    }

    #[test]
    fn companion_window_plan_matches_tauri_config() {
        let config: Value = serde_json::from_str(include_str!("../tauri.conf.json")).expect("valid tauri config");
        let windows = config["app"]["windows"].as_array().expect("window config array");
        let companion = windows
            .iter()
            .find(|window| window["label"] == "companion")
            .expect("companion window config exists");
        let companion_plan = window_plan()
            .into_iter()
            .find(|window| window.label == "companion")
            .expect("companion window plan exists");

        assert_eq!(companion["url"], "index.html?surface=companion");
        assert_eq!(companion["title"].as_str(), Some(companion_plan.title));
        assert_eq!(companion["width"].as_u64(), Some(u64::from(companion_plan.width)));
        assert_eq!(companion["height"].as_u64(), Some(u64::from(companion_plan.height)));
        assert_eq!(companion["alwaysOnTop"].as_bool(), Some(companion_plan.always_on_top));
        assert_eq!(companion["decorations"].as_bool(), Some(companion_plan.decorations));
        assert_eq!(companion["transparent"].as_bool(), Some(companion_plan.transparent));
        assert_eq!(companion["shadow"].as_bool(), Some(companion_plan.shadow));
        assert_eq!(companion["skipTaskbar"].as_bool(), Some(companion_plan.skip_taskbar));
        assert_eq!(companion["focus"].as_bool(), Some(companion_plan.focus));
        assert!(companion_plan.drag_region);
    }
}
