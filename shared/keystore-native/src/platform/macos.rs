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

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_entry(service: &str, account: &str, value: &str) -> KeystoreEntry {
        KeystoreEntry {
            service: service.to_string(),
            account: account.to_string(),
            value: value.to_string(),
        }
    }

    #[test]
    fn test_set_and_get_password() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let entry = create_test_entry("test-service", "test-account", "my-secret-password");
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("test-service", "test-account").unwrap();
        assert_eq!(result, "my-secret-password");
        
        keystore.delete_password("test-service", "test-account").unwrap();
    }

    #[test]
    fn test_get_nonexistent_password() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let result = keystore.get_password("nonexistent-service", "nonexistent-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_delete_nonexistent_password() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let result = keystore.delete_password("nonexistent-service", "nonexistent-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_update_existing_password() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let entry1 = create_test_entry("update-service", "update-account", "old-password");
        let entry2 = create_test_entry("update-service", "update-account", "new-password");
        
        keystore.set_password(&entry1).unwrap();
        keystore.set_password(&entry2).unwrap();
        
        let result = keystore.get_password("update-service", "update-account").unwrap();
        assert_eq!(result, "new-password");
        
        keystore.delete_password("update-service", "update-account").unwrap();
    }

    #[test]
    fn test_empty_value() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let entry = create_test_entry("empty-service", "empty-account", "");
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("empty-service", "empty-account").unwrap();
        assert_eq!(result, "");
        
        keystore.delete_password("empty-service", "empty-account").unwrap();
    }

    #[test]
    fn test_special_characters() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let special_value = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\r";
        let entry = create_test_entry("special-service", "special-account", special_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("special-service", "special-account").unwrap();
        assert_eq!(result, special_value);
        
        keystore.delete_password("special-service", "special-account").unwrap();
    }

    #[test]
    fn test_long_value() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let long_value = "a".repeat(1000);
        let entry = create_test_entry("long-service", "long-account", &long_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("long-service", "long-account").unwrap();
        assert_eq!(result, long_value);
        
        keystore.delete_password("long-service", "long-account").unwrap();
    }

    #[test]
    fn test_multiple_services() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let entries = vec![
            create_test_entry("service1", "account1", "password1"),
            create_test_entry("service1", "account2", "password2"),
            create_test_entry("service2", "account1", "password3"),
        ];
        
        for entry in &entries {
            keystore.set_password(entry).unwrap();
        }
        
        assert_eq!(keystore.get_password("service1", "account1").unwrap(), "password1");
        assert_eq!(keystore.get_password("service1", "account2").unwrap(), "password2");
        assert_eq!(keystore.get_password("service2", "account1").unwrap(), "password3");
        
        keystore.delete_password("service1", "account1").unwrap();
        keystore.delete_password("service1", "account2").unwrap();
        keystore.delete_password("service2", "account1").unwrap();
    }

    #[test]
    fn test_utf8_values() {
        let keystore = MacOsKeystore::new().unwrap();
        
        let utf8_value = "Hello 世界 🌍 Привет";
        let entry = create_test_entry("utf8-service", "utf8-account", utf8_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("utf8-service", "utf8-account").unwrap();
        assert_eq!(result, utf8_value);
        
        keystore.delete_password("utf8-service", "utf8-account").unwrap();
    }
}