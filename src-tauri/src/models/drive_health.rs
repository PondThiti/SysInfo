use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionMapping {
    pub drive_letter: Option<String>,
    pub partition_number: u32,
    pub size_bytes: u64,
    pub size_gb: f64,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalDriveInfo {
    pub device_id: String,
    pub friendly_name: String,
    pub manufacturer: String,
    pub model: String,
    pub firmware_revision: String,
    pub media_type: String,
    pub raw_media_type: String,
    pub bus_type: String,
    pub raw_bus_type: String,
    pub size_bytes: u64,
    pub size_gb: f64,
    pub health_status: String,
    pub operational_status: String,
    pub is_removable: bool,
    pub is_virtual: bool,
    pub is_boot: bool,
    pub is_system: bool,
    pub partition_style: String,
    pub partitions: Vec<PartitionMapping>,
    pub masked_serial: String,
    pub data_source: String,
    pub last_seen_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricValue {
    pub id: String,
    pub name: String,
    pub value: Option<serde_json::Value>,
    pub delta: Option<i64>,
    pub unit: Option<String>,
    pub raw_name: String,
    pub source: String,
    pub status: String,
    pub health_level: Option<String>,
    pub meaning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveHealthSnapshot {
    pub device_id: String,
    pub checked_at: String,
    pub overall_status: String,
    pub data_coverage: String,
    pub metrics: Vec<MetricValue>,
    pub reasons: Vec<String>,
    pub backup_recommended: bool,
    pub data_source: String,
    pub has_admin_rights: bool,
}
