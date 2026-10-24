use rusqlite::{Connection, Result};

pub fn init_database(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS organizer_rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_preset INTEGER NOT NULL DEFAULT 0,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            priority INTEGER NOT NULL DEFAULT 100,
            conditions_json TEXT NOT NULL,
            target_template TEXT NOT NULL,
            conflict_strategy TEXT NOT NULL DEFAULT 'auto_rename',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS organize_batches (
            batch_id TEXT PRIMARY KEY,
            rule_id TEXT NOT NULL,
            rule_name TEXT NOT NULL,
            source_directory TEXT NOT NULL,
            target_base_directory TEXT NOT NULL,
            total_files INTEGER NOT NULL,
            total_bytes INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_undone INTEGER NOT NULL DEFAULT 0,
            undone_at TEXT
        );

        CREATE TABLE IF NOT EXISTS move_records (
            id TEXT PRIMARY KEY,
            batch_id TEXT NOT NULL,
            source_path TEXT NOT NULL,
            destination_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            source_mtime_ms INTEGER NOT NULL,
            source_hash TEXT,
            is_cross_drive INTEGER NOT NULL DEFAULT 0,
            moved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'moved',
            FOREIGN KEY (batch_id) REFERENCES organize_batches(batch_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_move_records_batch ON move_records(batch_id);
        CREATE INDEX IF NOT EXISTS idx_organizer_rules_priority ON organizer_rules(priority);
        "#
    )?;
    Ok(())
}
