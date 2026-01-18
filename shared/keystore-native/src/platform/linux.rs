use crate::error::KeystoreError;
use crate::KeystoreEntry;
use super::KeystoreOperations;

pub struct LinuxKeystore;

impl LinuxKeystore {
    pub fn new() -> Result<Self, KeystoreError> {
        Ok(Self)
    }
}

impl KeystoreOperations for LinuxKeystore {
    fn set_password(&self, entry: &KeystoreEntry) -> Result<(), KeystoreError> {
        keyring::Entry::new(&entry.service, &entry.account)
            .map_err(|e| KeystoreError::Platform(format!("Failed to create entry: {}", e)))?
            .set_password(&entry.value)
            .map_err(|e| KeystoreError::Platform(format!("Failed to set password: {}", e)))
    }
    
    fn get_password(&self, service: &str, account: &str) -> Result<String, KeystoreError> {
        let entry = keyring::Entry::new(service, account)
            .map_err(|e| {
                let err_str = format!("{:?}", e);
                if err_str.contains("No password found") || err_str.contains("Entry not found") {
                    KeystoreError::KeyNotFound(format!("{}:{}", service, account))
                } else {
                    KeystoreError::Platform(format!("Failed to create entry: {}", e))
                }
            })?;
        
        entry.get_password()
            .map_err(|e| {
                let err_str = format!("{:?}", e);
                if err_str.contains("No password found") || err_str.contains("Entry not found") {
                    KeystoreError::KeyNotFound(format!("{}:{}", service, account))
                } else {
                    KeystoreError::Platform(format!("Failed to get password: {}", e))
                }
            })
    }
    
    fn delete_password(&self, service: &str, account: &str) -> Result<(), KeystoreError> {
        let entry = keyring::Entry::new(service, account)
            .map_err(|e| {
                let err_str = format!("{:?}", e);
                if err_str.contains("No password found") || err_str.contains("Entry not found") {
                    KeystoreError::KeyNotFound(format!("{}:{}", service, account))
                } else {
                    KeystoreError::Platform(format!("Failed to create entry: {}", e))
                }
            })?;
        
        entry.delete_credential()
            .map_err(|e| {
                let err_str = format!("{:?}", e);
                if err_str.contains("No password found") || err_str.contains("Entry not found") {
                    KeystoreError::KeyNotFound(format!("{}:{}", service, account))
                } else {
                    KeystoreError::Platform(format!("Failed to delete password: {}", e))
                }
            })
    }
    
    fn is_available(&self) -> bool {
        true
    }
}