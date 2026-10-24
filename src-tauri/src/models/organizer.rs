use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RuleType {
    Extension,
    NamePattern,
    FileSize,
    FileAge,
    Category,
    SourceFolder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleCondition {
    pub rule_type: RuleType,
    pub pattern: Option<String>,
    pub extensions: Option<Vec<String>>,
    pub min_size_bytes: Option<u64>,
    pub max_size_bytes: Option<u64>,
    pub min_age_days: Option<u32>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizeRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_preset: bool,
    pub is_enabled: bool,
    pub priority: i32,
    pub conditions: Vec<RuleCondition>,
    pub target_template: String,
    pub conflict_strategy: ConflictStrategy,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConflictStrategy {
    Skip,
    AutoRename,
    Overwrite,
    RecycleDuplicateIfIdentical,
    PromptUser,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConflictType {
    None,
    NameCollision,
    IdenticalDuplicate,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizePlanItem {
    pub id: String,
    pub source_path: String,
    pub target_path: String,
    pub file_name: String,
    pub extension: String,
    pub size_bytes: u64,
    pub formatted_size: String,
    pub modified_at: Option<DateTime<Utc>>,
    pub matched_rule_id: String,
    pub matched_rule_name: String,
    pub conflict_type: ConflictType,
    pub suggested_action: ConflictStrategy,
    pub is_cross_drive: bool,
    pub is_selected: bool,
    pub safety_warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveRecord {
    pub id: String,
    pub batch_id: String,
    pub source_path: String,
    pub destination_path: String,
    pub file_size: u64,
    pub source_mtime_ms: i64,
    pub source_hash: Option<String>,
    pub is_cross_drive: bool,
    pub moved_at: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizeBatch {
    pub batch_id: String,
    pub rule_id: String,
    pub rule_name: String,
    pub source_directory: String,
    pub target_base_directory: String,
    pub total_files: usize,
    pub total_bytes: u64,
    pub records: Vec<MoveRecord>,
    pub created_at: DateTime<Utc>,
    pub is_undone: bool,
    pub undone_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizePreviewResult {
    pub source_directory: String,
    pub target_base_directory: String,
    pub plan_items: Vec<OrganizePlanItem>,
    pub total_files: usize,
    pub total_bytes: u64,
    pub conflicts_count: usize,
    pub identical_duplicates_count: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UndoResult {
    pub batch_id: String,
    pub restored_count: usize,
    pub failed_count: usize,
    pub restored_files: Vec<String>,
    pub errors: Vec<String>,
}
