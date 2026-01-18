use super::error::KeystoreError;
use super::KeystoreEntry;
use super::KeystoreOperations;

use security_framework::passwords::{
    delete_generic_password, get_generic_password, set_generic_password,
    delete_internet_password, get_internet_password, set_internet_password,
};
use security_framework::base::Error as SecurityError;

pub struct MacOsKeystore;

impl MacOsKeystore {
    pub fn new() -> Result<Self, KeystoreError> {
        Ok(Self)
    }
}

impl KeystoreOperations for MacOsKeystore {
    fn set_password(&self, entry: &KeystoreEntry) -> Result<(), KeystoreError> {
        match set_generic_password(&entry.service, &entry.account, entry.value.as_bytes()) {
            Ok(_) => Ok(()),
            Err(e) => Err(KeystoreError::Platform(format!("Failed to set password: {}", e))),
        }
    }
    
    fn get_password(&self, service: &str, account: &str) -> Result<String, KeystoreError> {
        match get_generic_password(service, account) {
            Ok(bytes) => {
                let password = String::from_utf8(bytes)
                    .map_err(|e| KeystoreError::Serialization(e.to_string()))?;
                Ok(password)
            },
            Err(e) => {
                if e.code() == -25300 {
                    Err(KeystoreError::KeyNotFound(format!("{}:{}", service, account)))
                } else {
                    Err(KeystoreError::Platform(format!("Failed to get password: {}", e)))
                }
            },
        }
    }
    
    fn delete_password(&self, service: &str, account: &str) -> Result<(), KeystoreError> {
        match delete_generic_password(service, account) {
            Ok(_) => Ok(()),
            Err(e) => {
                if e.code() == -25300 {
                    Err(KeystoreError::KeyNotFound(format!("{}:{}", service, account)))
                } else {
                    Err(KeystoreError::Platform(format!("Failed to delete password: {}", e)))
                }
            },
        }
    }
    
    fn is_available(&self) -> bool {
        true
    }
}