use crate::models::organizer::{ConflictStrategy, OrganizeRule};
use rusqlite::{params, Connection, Result};

pub struct RuleRepository;

impl RuleRepository {
    pub fn list_rules(conn: &Connection) -> Result<Vec<OrganizeRule>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, is_preset, is_enabled, priority, conditions_json, target_template, conflict_strategy 
             FROM organizer_rules ORDER BY priority ASC, name ASC"
        )?;

        let rows = stmt.query_map([], |row| {
            let conditions_json: String = row.get(6)?;
            let conditions = serde_json::from_str(&conditions_json).unwrap_or_default();
            let strategy_str: String = row.get(8)?;
            let strategy = match strategy_str.as_str() {
                "skip" => ConflictStrategy::Skip,
                "overwrite" => ConflictStrategy::Overwrite,
                "recycle_duplicate_if_identical" => ConflictStrategy::RecycleDuplicateIfIdentical,
                "prompt_user" => ConflictStrategy::PromptUser,
                _ => ConflictStrategy::AutoRename,
            };

            Ok(OrganizeRule {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_preset: row.get::<_, i32>(3)? == 1,
                is_enabled: row.get::<_, i32>(4)? == 1,
                priority: row.get(5)?,
                conditions,
                target_template: row.get(7)?,
                conflict_strategy: strategy,
            })
        })?;

        let mut rules = Vec::new();
        for r in rows {
            rules.push(r?);
        }
        Ok(rules)
    }

    pub fn save_rule(conn: &Connection, rule: &OrganizeRule) -> Result<()> {
        let conditions_json = serde_json::to_string(&rule.conditions).unwrap_or_else(|_| "[]".to_string());
        let strategy_str = match rule.conflict_strategy {
            ConflictStrategy::Skip => "skip",
            ConflictStrategy::AutoRename => "auto_rename",
            ConflictStrategy::Overwrite => "overwrite",
            ConflictStrategy::RecycleDuplicateIfIdentical => "recycle_duplicate_if_identical",
            ConflictStrategy::PromptUser => "prompt_user",
        };

        conn.execute(
            "INSERT INTO organizer_rules (id, name, description, is_preset, is_enabled, priority, conditions_json, target_template, conflict_strategy, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                is_preset = excluded.is_preset,
                is_enabled = excluded.is_enabled,
                priority = excluded.priority,
                conditions_json = excluded.conditions_json,
                target_template = excluded.target_template,
                conflict_strategy = excluded.conflict_strategy,
                updated_at = CURRENT_TIMESTAMP",
            params![
                rule.id,
                rule.name,
                rule.description,
                if rule.is_preset { 1 } else { 0 },
                if rule.is_enabled { 1 } else { 0 },
                rule.priority,
                conditions_json,
                rule.target_template,
                strategy_str,
            ],
        )?;

        Ok(())
    }

    pub fn delete_rule(conn: &Connection, rule_id: &str) -> Result<()> {
        conn.execute("DELETE FROM organizer_rules WHERE id = ?1", params![rule_id])?;
        Ok(())
    }
}
