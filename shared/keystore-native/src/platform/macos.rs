use super::error::KeystoreError;
use super::KeystoreEntry;
use super::KeystoreOperations;

use security_framework::passwords::{
    delete_generic_password, get_generic_password, set_generic_password,
};

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

    fn generate_unique_id() -> String {
        format!("{}-{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
            uuid::Uuid::new_v4().simple())
    }

    struct TestGuard<'a> {
        service: String,
        account: String,
        keystore: &'a MacOsKeystore,
    }

    impl<'a> TestGuard<'a> {
        fn new(service: String, account: String, keystore: &'a MacOsKeystore) -> Self {
            Self { service, account, keystore }
        }
    }

    impl<'a> Drop for TestGuard<'a> {
        fn drop(&mut self) {
            let _ = self.keystore.delete_password(&self.service, &self.account);
        }
    }

    #[test]
    fn test_set_and_get_password() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("test-service-{}", id);
        let account = format!("test-account-{}", id);
        
        let _guard = TestGuard::new(service.clone(), account.clone(), &keystore);
        let entry = create_test_entry(&service, &account, "my-secret-password");
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password(&service, &account).unwrap();
        assert_eq!(result, "my-secret-password");
    }

    #[test]
    fn test_get_nonexistent_password() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("nonexistent-service-{}", id);
        let account = format!("nonexistent-account-{}", id);
        
        let result = keystore.get_password(&service, &account);
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_delete_nonexistent_password() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("nonexistent-service-{}", id);
        let account = format!("nonexistent-account-{}", id);
        
        let result = keystore.delete_password(&service, &account);
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_update_existing_password() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("update-service-{}", id);
        let account = format!("update-account-{}", id);
        
        let _guard = TestGuard::new(service.clone(), account.clone(), &keystore);
        let entry1 = create_test_entry(&service, &account, "old-password");
        let entry2 = create_test_entry(&service, &account, "new-password");
        
        keystore.set_password(&entry1).unwrap();
        keystore.set_password(&entry2).unwrap();
        
        let result = keystore.get_password(&service, &account).unwrap();
        assert_eq!(result, "new-password");
    }

    #[test]
    fn test_empty_value() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("empty-service-{}", id);
        let account = format!("empty-account-{}", id);
        
        let _guard = TestGuard::new(service.clone(), account.clone(), &keystore);
        let entry = create_test_entry(&service, &account, "");
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password(&service, &account).unwrap();
        assert_eq!(result, "");
    }

    #[test]
    fn test_special_characters() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("special-service-{}", id);
        let account = format!("special-account-{}", id);
        
        let _guard = TestGuard::new(service.clone(), account.clone(), &keystore);
        let special_value = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\r";
        let entry = create_test_entry(&service, &account, special_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password(&service, &account).unwrap();
        assert_eq!(result, special_value);
    }

    #[test]
    fn test_long_value() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("long-service-{}", id);
        let account = format!("long-account-{}", id);
        
        let _guard = TestGuard::new(service.clone(), account.clone(), &keystore);
        let long_value = "a".repeat(1000);
        let entry = create_test_entry(&service, &account, &long_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password(&service, &account).unwrap();
        assert_eq!(result, long_value);
    }

    #[test]
    fn test_multiple_services() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        
        let entries = vec![
            create_test_entry(&format!("service1-{}", id), &format!("account1-{}", id), "password1"),
            create_test_entry(&format!("service1-{}", id), &format!("account2-{}", id), "password2"),
            create_test_entry(&format!("service2-{}", id), &format!("account1-{}", id), "password3"),
        ];
        
        let guards: Vec<TestGuard> = entries.iter()
            .map(|e| TestGuard::new(e.service.clone(), e.account.clone(), &keystore))
            .collect();
        
        for entry in &entries {
            keystore.set_password(entry).unwrap();
        }
        
        assert_eq!(keystore.get_password(&format!("service1-{}", id), &format!("account1-{}", id)).unwrap(), "password1");
        assert_eq!(keystore.get_password(&format!("service1-{}", id), &format!("account2-{}", id)).unwrap(), "password2");
        assert_eq!(keystore.get_password(&format!("service2-{}", id), &format!("account1-{}", id)).unwrap(), "password3");
        
        drop(guards);
    }

    #[test]
    fn test_utf8_values() {
        let keystore = MacOsKeystore::new().unwrap();
        let id = generate_unique_id();
        let service = format!("utf8-service-{}", id);
        let account = format!("utf8-account-{}", id);
        
        let _guard = TestGuard::new(service.clone(), account.clone(), &keystore);
        let utf8_value = "Hello 世界 🌍 Привет";
        let entry = create_test_entry(&service, &account, utf8_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password(&service, &account).unwrap();
        assert_eq!(result, utf8_value);
    }
}