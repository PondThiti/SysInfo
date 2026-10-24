use crate::models::organizer::*;
use crate::services::move_service::MoveService;
use chrono::{DateTime, Datelike, Utc};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct OrganizerService;

impl OrganizerService {
    /// Categorizes file extension
    pub fn get_file_category(ext: &str) -> &'static str {
        let ext = ext.to_lowercase();
        match ext.as_str() {
            "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tiff" | "psd" | "raw" => "Images",
            "pdf" | "docx" | "doc" | "xlsx" | "xls" | "pptx" | "ppt" | "txt" | "md" | "rtf" | "csv" => "Documents",
            "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" | "webm" | "m4v" => "Videos",
            "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" | "wma" => "Audio",
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" | "iso" => "Archives",
            "exe" | "msi" | "bat" | "cmd" | "ps1" | "apk" => "Executables",
            "js" | "ts" | "jsx" | "tsx" | "py" | "rs" | "go" | "cpp" | "c" | "h" | "java" | "html" | "css" | "json" | "xml" | "yaml" | "yml" => "Code",
            "pak" | "ucas" | "utoc" | "starpak" | "vpk" | "bundle" | "assets" | "unity3d" | "res" | "wad" | "bik" | "dat" => "GameAssets",
            _ => "Others",
        }
    }

    /// Evaluates if a file matches a rule condition
    pub fn matches_rule(path: &Path, meta: &fs::Metadata, rule: &OrganizeRule) -> bool {
        if !rule.is_enabled {
            return false;
        }

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let category = Self::get_file_category(&ext);

        for cond in &rule.conditions {
            match cond.rule_type {
                RuleType::Extension => {
                    if let Some(ref exts) = cond.extensions {
                        let matched = exts.iter().any(|e| {
                            let clean = e.trim_start_matches('.').to_lowercase();
                            clean == ext
                        });
                        if !matched {
                            return false;
                        }
                    }
                }
                RuleType::Category => {
                    if let Some(ref cat) = cond.category {
                        if !cat.eq_ignore_ascii_case(category) {
                            return false;
                        }
                    }
                }
                RuleType::FileSize => {
                    let size = meta.len();
                    if let Some(min) = cond.min_size_bytes {
                        if size < min {
                            return false;
                        }
                    }
                    if let Some(max) = cond.max_size_bytes {
                        if size > max {
                            return false;
                        }
                    }
                }
                RuleType::NamePattern => {
                    if let Some(ref pat) = cond.pattern {
                        if let Ok(re) = regex::Regex::new(pat) {
                            if !re.is_match(file_name) {
                                return false;
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        true
    }

    /// Resolves target path based on template tokens: {type}, {ext}, {year}, {month}, {day}, {name}, {counter}
    pub fn resolve_target_path(
        base_target_dir: &Path,
        file_path: &Path,
        template: &str,
        counter: usize,
    ) -> PathBuf {
        let file_name = file_path.file_name().and_then(|n| n.to_str()).unwrap_or("file");
        let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let stem = file_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let category = Self::get_file_category(ext);

        let now = Utc::now();
        let year_str = now.year().to_string();
        let month_str = format!("{:02}", now.month());
        let day_str = format!("{:02}", now.day());

        let mut sub_path = template
            .replace("{type}", category)
            .replace("{ext}", ext)
            .replace("{year}", &year_str)
            .replace("{month}", &month_str)
            .replace("{day}", &day_str)
            .replace("{name}", stem)
            .replace("{counter}", &format!("{:02}", counter));

        sub_path = sub_path.replace('/', "\\");
        base_target_dir.join(sub_path).join(file_name)
    }

    /// Checks if path touches protected Windows folders or critical dev projects
    pub fn check_safety_boundary(path: &Path) -> Result<(), String> {
        let path_str = path.to_string_lossy().to_lowercase();
        let system_roots = [
            "c:\\windows",
            "c:\\program files",
            "c:\\program files (x86)",
            "c:\\recovery",
            "$recycle.bin",
            "system volume information",
        ];

        for root in &system_roots {
            if path_str.starts_with(root) {
                return Err(format!("Protected Windows system location cannot be organized: {}", path.display()));
            }
        }

        // Project directory check
        let project_markers = [".git", "package.json", "cargo.toml", "go.mod"];
        for marker in &project_markers {
            if path.join(marker).exists() {
                return Err(format!("Directory contains development project marker '{}'. Splintering project files is restricted.", marker));
            }
        }

        Ok(())
    }

    /// Evaluates files in a source directory and returns dry-run preview items
    pub fn generate_preview(
        source_dir: &Path,
        target_base_dir: &Path,
        rules: &[OrganizeRule],
    ) -> Result<OrganizePreviewResult, String> {
        Self::check_safety_boundary(source_dir)?;

        let mut plan_items = Vec::new();
        let mut total_bytes = 0u64;
        let mut conflicts_count = 0usize;
        let mut identical_duplicates_count = 0usize;
        let mut warnings = Vec::new();

        let mut counter = 1;
        for entry in WalkDir::new(source_dir).min_depth(1).max_depth(3) {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let meta = match fs::metadata(path) {
                Ok(m) => m,
                Err(_) => continue,
            };

            for rule in rules {
                if Self::matches_rule(path, &meta, rule) {
                    let target_path = Self::resolve_target_path(target_base_dir, path, &rule.target_template, counter);
                    counter += 1;

                    let mut conflict_type = ConflictType::None;
                    let mut suggested_action = ConflictStrategy::AutoRename;

                    if target_path.exists() {
                        conflicts_count += 1;
                        if let (Ok(src_h), Ok(dest_h)) = (MoveService::calculate_hash(path), MoveService::calculate_hash(&target_path)) {
                            if src_h == dest_h {
                                conflict_type = ConflictType::IdenticalDuplicate;
                                identical_duplicates_count += 1;
                                suggested_action = ConflictStrategy::RecycleDuplicateIfIdentical;
                            } else {
                                conflict_type = ConflictType::NameCollision;
                                suggested_action = ConflictStrategy::AutoRename;
                            }
                        } else {
                            conflict_type = ConflictType::NameCollision;
                        }
                    }

                    let size_bytes = meta.len();
                    total_bytes += size_bytes;

                    let is_cross_drive = MoveService::is_cross_drive(path, &target_path);

                    plan_items.push(OrganizePlanItem {
                        id: uuid::Uuid::new_v4().to_string(),
                        source_path: path.to_string_lossy().to_string(),
                        target_path: target_path.to_string_lossy().to_string(),
                        file_name: path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string(),
                        extension: path.extension().and_then(|e| e.to_str()).unwrap_or("").to_string(),
                        size_bytes,
                        formatted_size: format!("{:.2} MB", size_bytes as f64 / (1024.0 * 1024.0)),
                        modified_at: meta.modified().ok().map(DateTime::<Utc>::from),
                        matched_rule_id: rule.id.clone(),
                        matched_rule_name: rule.name.clone(),
                        conflict_type,
                        suggested_action,
                        is_cross_drive,
                        is_selected: true,
                        safety_warning: None,
                    });
                    break;
                }
            }
        }

        if plan_items.is_empty() {
            warnings.push("No files matched the active organize rules in the specified directory.".to_string());
        }

        Ok(OrganizePreviewResult {
            source_directory: source_dir.to_string_lossy().to_string(),
            target_base_directory: target_base_dir.to_string_lossy().to_string(),
            total_files: plan_items.len(),
            plan_items,
            total_bytes,
            conflicts_count,
            identical_duplicates_count,
            warnings,
        })
    }
}
