use crate::models::organizer::*;
use crate::services::move_service::MoveService;
use crate::services::organizer_service::OrganizerService;
use crate::services::rule_repository::RuleRepository;
use chrono::Utc;
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};

/// 1. List all available rules (presets and custom)
pub fn list_organizer_rules(conn: &Connection) -> Result<Vec<OrganizeRule>, String> {
    RuleRepository::list_rules(conn).map_err(|e| e.to_string())
}

/// 2. Save or update an organizer rule
pub fn save_organizer_rule(conn: &Connection, rule: OrganizeRule) -> Result<(), String> {
    RuleRepository::save_rule(conn, &rule).map_err(|e| e.to_string())
}

/// 3. Preview organization without making any changes (Dry-Run Preview)
pub fn preview_organize(
    source_dir: String,
    target_base_dir: String,
    rules: Vec<OrganizeRule>,
) -> Result<OrganizePreviewResult, String> {
    let src = PathBuf::from(source_dir);
    let dest = PathBuf::from(target_base_dir);
    OrganizerService::generate_preview(&src, &dest, &rules)
}

/// 4. Execute file organization plan (Batch Apply + Cross-drive safety + Journal)
pub fn apply_organize(
    conn: &Connection,
    batch_id: String,
    rule_id: String,
    rule_name: String,
    source_directory: String,
    target_base_directory: String,
    selected_items: Vec<OrganizePlanItem>,
) -> Result<OrganizeBatch, String> {
    let mut move_records = Vec::new();
    let mut total_bytes = 0u64;

    for item in selected_items {
        if !item.is_selected {
            continue;
        }

        let src_path = PathBuf::from(&item.source_path);
        let dest_path = PathBuf::from(&item.target_path);

        if !src_path.exists() {
            continue;
        }

        let meta = match fs::metadata(&src_path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let mtime_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        match MoveService::safe_move_file(&src_path, &dest_path) {
            Ok((is_cross, hash)) => {
                total_bytes += item.size_bytes;
                move_records.push(MoveRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    batch_id: batch_id.clone(),
                    source_path: item.source_path,
                    destination_path: item.target_path,
                    file_size: item.size_bytes,
                    source_mtime_ms: mtime_ms,
                    source_hash: Some(hash),
                    is_cross_drive: is_cross,
                    moved_at: Utc::now(),
                    status: "moved".to_string(),
                });
            }
            Err(e) => {
                eprintln!("Failed moving {}: {}", item.source_path, e);
            }
        }
    }

    let batch = OrganizeBatch {
        batch_id,
        rule_id,
        rule_name,
        source_directory,
        target_base_directory,
        total_files: move_records.len(),
        total_bytes,
        records: move_records,
        created_at: Utc::now(),
        is_undone: false,
        undone_at: None,
    };

    MoveService::record_batch(conn, &batch).map_err(|e| e.to_string())?;

    Ok(batch)
}

/// 5. Revert an entire batch back to its original state (Undo Journal)
pub fn undo_organize(conn: &Connection, batch_id: String) -> Result<UndoResult, String> {
    MoveService::undo_batch(conn, &batch_id)
}

/// 6. Get organizer execution history
pub fn get_organize_history(conn: &Connection) -> Result<Vec<OrganizeBatch>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT batch_id, rule_id, rule_name, source_directory, target_base_directory, total_files, total_bytes, created_at, is_undone, undone_at 
             FROM organize_batches ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let created_str: String = row.get(7)?;
            let undone_str: Option<String> = row.get(9)?;
            Ok(OrganizeBatch {
                batch_id: row.get(0)?,
                rule_id: row.get(1)?,
                rule_name: row.get(2)?,
                source_directory: row.get(3)?,
                target_base_directory: row.get(4)?,
                total_files: row.get::<_, i64>(5)? as usize,
                total_bytes: row.get::<_, i64>(6)? as u64,
                created_at: chrono::DateTime::parse_from_rfc3339(&created_str)
                    .map(|d| d.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                is_undone: row.get::<_, i32>(8)? == 1,
                undone_at: undone_str.and_then(|s| {
                    chrono::DateTime::parse_from_rfc3339(&s)
                        .map(|d| d.with_timezone(&Utc))
                        .ok()
                }),
                records: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut batches = Vec::new();
    for r in rows {
        batches.push(r.map_err(|e| e.to_string())?);
    }
    Ok(batches)
}

/// 7. Scans and removes empty folders left behind after organize
pub fn clean_empty_folders(source_dir: String) -> Result<Vec<String>, String> {
    let mut deleted = Vec::new();
    let root = PathBuf::from(source_dir);

    for entry in walkdir::WalkDir::new(&root)
        .contents_first(true)
        .min_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_dir() {
            let p = entry.path();
            if let Ok(mut read) = fs::read_dir(p) {
                if read.next().is_none() {
                    if fs::remove_dir(p).is_ok() {
                        deleted.push(p.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    Ok(deleted)
}
