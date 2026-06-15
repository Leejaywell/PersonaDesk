use serde::Serialize;
use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedAgent {
    pub id: String,
    pub display_name: String,
    pub available: bool,
    pub version: Option<String>,
}

struct KnownAgent {
    id: &'static str,
    display_name: &'static str,
    executable: &'static str,
    version_args: &'static [&'static str],
}

const KNOWN_AGENTS: &[KnownAgent] = &[
    KnownAgent {
        id: "codex-cli",
        display_name: "Codex CLI",
        executable: "codex",
        version_args: &["--version"],
    },
    KnownAgent {
        id: "claude-code",
        display_name: "Claude Code",
        executable: "claude",
        version_args: &["--version"],
    },
    KnownAgent {
        id: "gemini-cli",
        display_name: "Gemini CLI",
        executable: "gemini",
        version_args: &["--version"],
    },
    KnownAgent {
        id: "cursor-cli",
        display_name: "Cursor CLI",
        executable: "cursor",
        version_args: &["--version"],
    },
];

pub fn detect_known_agents() -> Vec<DetectedAgent> {
    let path_value = env::var_os("PATH").unwrap_or_default();

    KNOWN_AGENTS
        .iter()
        .map(|agent| {
            let executable_path = find_executable_in_path(&path_value, agent.executable);
            let version = executable_path
                .as_ref()
                .and_then(|path| probe_version(path, agent.version_args));

            DetectedAgent {
                id: agent.id.to_string(),
                display_name: agent.display_name.to_string(),
                available: executable_path.is_some(),
                version,
            }
        })
        .collect()
}

fn find_executable_in_path(path_value: &OsString, executable: &str) -> Option<PathBuf> {
    env::split_paths(path_value)
        .flat_map(|directory| candidate_paths(&directory, executable))
        .find(|candidate| candidate.is_file())
}

fn candidate_paths(directory: &Path, executable: &str) -> Vec<PathBuf> {
    let base = directory.join(executable);

    if cfg!(windows) {
        let pathext = env::var("PATHEXT").unwrap_or_else(|_| ".EXE;.CMD;.BAT".to_string());
        let mut candidates = vec![base.clone()];
        candidates.extend(
            pathext
                .split(';')
                .filter(|ext| !ext.is_empty())
                .map(|ext| directory.join(format!("{executable}{ext}"))),
        );
        candidates
    } else {
        vec![base]
    }
}

fn probe_version(path: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new(path).args(args).output().ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let version = if stdout.is_empty() { stderr } else { stdout };

    if version.is_empty() {
        None
    } else {
        Some(version.lines().next().unwrap_or_default().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn finds_executable_in_path_value() {
        let temp_dir = env::temp_dir().join(format!("personadesk-agent-test-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).expect("create temp dir");
        let executable = temp_dir.join("codex");
        fs::write(&executable, "#!/bin/sh\n").expect("write executable");

        let path_value = OsString::from(temp_dir.as_os_str());
        let found = find_executable_in_path(&path_value, "codex");

        fs::remove_file(executable).ok();
        fs::remove_dir(temp_dir).ok();

        assert!(found.is_some());
    }

    #[test]
    fn returns_none_for_missing_executable() {
        let path_value = OsString::from("/definitely/not/a/personadesk/path");

        assert!(find_executable_in_path(&path_value, "codex").is_none());
    }
}
