use crate::models::organizer::{MoveRecord, OrganizeBatch, UndoResult};
use chrono::Utc;
use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Path, PathBuf};

pub struct MoveService;

impl MoveService {
    /// Checks if source and destination are on different Windows drives (e.g. C: vs D:)
    pub fn is_cross_drive(src: &Path, dest: &Path) -> bool {
        let src_prefix = src.components().next();
        let dest_prefix = dest.components().next();
        src_prefix != dest_prefix
    }

    /// Calculates SHA256 of a file
    pub fn calculate_hash(path: &Path) -> io::Result<String> {
        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 65536];
        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        Ok(format!("{:x}", hasher.finalize()))
    }

    /// Safely moves a file, handling cross-drive copy-verify-delete with metadata preservation
    pub fn safe_move_file(src: &Path, dest: &Path) -> io::Result<(bool, String)> {
        // Ensure destination parent directory exists
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }

        let cross_drive = Self::is_cross_drive(src, dest);
        let src_metadata = fs::metadata(src)?;
        let src_size = src_metadata.len();
        let src_hash = Self::calculate_hash(src).unwrap_or_default();

        if !cross_drive {
            // Same filesystem: try rename first
            match fs::rename(src, dest) {
                Ok(_) => return Ok((false, src_hash)),
                Err(_) => {
                    // Fall back to copy-verify-delete if rename fails
                }
            }
        }

        // Cross-drive or fallback: Copy -> Verify -> Delete
        let temp_dest = dest.with_extension(format!("tmp_{}", uuid::Uuid::new_v4()));
        fs::copy(src, &temp_dest)?;

        // Verify size
        let temp_meta = fs::metadata(&temp_dest)?;
        if temp_meta.len() != src_size {
            let _ = fs::remove_file(&temp_dest);
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "Cross-drive verification failed: Size mismatch",
            ));
        }

        // Verify hash
        let temp_hash = Self::calculate_hash(&temp_dest)?;
        if temp_hash != src_hash {
            let _ = fs::remove_file(&temp_dest);
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "Cross-drive verification failed: Hash mismatch",
            ));
        }

        // Rename temp to destination
        fs::rename(&temp_dest, dest)?;

        // Delete source
        fs::remove_file(src)?;

        Ok((true, src_hash))
    }

    /// Records batch execution into SQLite
    pub fn record_batch(conn: &Connection, batch: &OrganizeBatch) -> rusqlite::Result<()> {
        conn.execute(
            "INSERT INTO organize_batches (batch_id, rule_id, rule_name, source_directory, target_base_directory, total_files, total_bytes, created_at, is_undone)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)",
            params![
                batch.batch_id,
                batch.rule_id,
                batch.rule_name,
                batch.source_directory,
                batch.target_base_directory,
                batch.total_files as i64,
                batch.total_bytes as i64,
                batch.created_at.to_rfc3339(),
            ],
        )?;

        for rec in &batch.records {
            conn.execute(
                "INSERT INTO move_records (id, batch_id, source_path, destination_path, file_size, source_mtime_ms, source_hash, is_cross_drive, moved_at, status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    rec.id,
                    rec.batch_id,
                    rec.source_path,
                    rec.destination_path,
                    rec.file_size as i64,
                    rec.source_mtime_ms,
                    rec.source_hash,
                    if rec.is_cross_drive { 1 } else { 0 },
                    rec.moved_at.to_rfc3339(),
                    rec.status,
                ],
            )?;
        }

        Ok(())
    }

    /// Reverses an organized batch completely using journal records
    pub fn undo_batch(conn: &Connection, batch_id: &str) -> Result<UndoResult, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, source_path, destination_path, file_size, source_mtime_ms, is_cross_drive 
                 FROM move_records WHERE batch_id = ?1 ORDER BY rowid DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![batch_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)? as u64,
                    row.get::<_, i64>(4)?,
                    row.get::<_, i32>(5)? == 1,
                ))
            })
            .map_err(|e| e.to_string())?;

        let mut restored_count = 0;
        let mut failed_count = 0;
        let mut restored_files = Vec::new();
        let mut errors = Vec::new();

        for r in rows {
            let (rec_id, src_orig, dest_current, _size, _mtime, _cross) = match r {
                Ok(item) => item,
                Err(e) => {
                    errors.push(e.to_string());
                    failed_count += 1;
                    continue;
                }
            };

            let dest_path = PathBuf::from(&dest_current);
            let src_path = PathBuf::from(&src_orig);

            if !dest_path.exists() {
                errors.push(format!("File missing at destination: {}", dest_current));
                failed_count += 1;
                continue;
            }

            match Self::safe_move_file(&dest_path, &src_path) {
                Ok(_) => {
                    restored_count += 1;
                    restored_files.push(src_orig);
                    let _ = conn.execute(
                        "UPDATE move_records SET status = 'restored' WHERE id = ?1",
                        params![rec_id],
                    );
                }
                Err(err) => {
                    errors.push(format!("Failed restoring {}: {}", dest_current, err));
                    failed_count += 1;
                }
            }
        }

        let _ = conn.execute(
            "UPDATE organize_batches SET is_undone = 1, undone_at = ?2 WHERE batch_id = ?1",
            params![batch_id, Utc::now().to_rfc3339()],
        );

        Ok(UndoResult {
            batch_id: batch_id.to_string(),
            restored_count,
            failed_count,
            restored_files,
            errors,
        })
    }
}
