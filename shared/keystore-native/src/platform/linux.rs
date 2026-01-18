use super::KeystoreOperations;
use crate::error::KeystoreError;
use crate::KeystoreEntry;

pub struct LinuxKeystore;

impl LinuxKeystore {
    pub fn new() -> Result<Self, KeystoreError> {
        Ok(Self)
    }
}

impl KeystoreOperations for LinuxKeystore {
    fn set_password(&self, entry: &KeystoreEntry) -> Result<(), KeystoreError> {
        keyring::Entry::new(&entry.service, &entry.account)
            .map_err(|e| match e {
                keyring::Error::NoEntry => {
                    KeystoreError::KeyNotFound(format!("{}:{}", entry.service, entry.account))
                }
                _ => KeystoreError::Platform(format!("Failed to create entry: {}", e)),
            })?
            .set_password(&entry.value)
            .map_err(|e| match e {
                keyring::Error::NoEntry => {
                    KeystoreError::KeyNotFound(format!("{}:{}", entry.service, entry.account))
                }
                _ => KeystoreError::Platform(format!("Failed to set password: {}", e)),
            })
    }

    fn get_password(&self, service: &str, account: &str) -> Result<String, KeystoreError> {
        let entry = keyring::Entry::new(service, account).map_err(|e| match e {
            keyring::Error::NoEntry => {
                KeystoreError::KeyNotFound(format!("{}:{}", service, account))
            }
            _ => KeystoreError::Platform(format!("Failed to create entry: {}", e)),
        })?;

        entry.get_password().map_err(|e| match e {
            keyring::Error::NoEntry => {
                KeystoreError::KeyNotFound(format!("{}:{}", service, account))
            }
            _ => KeystoreError::Platform(format!("Failed to get password: {}", e)),
        })
    }

    fn delete_password(&self, service: &str, account: &str) -> Result<(), KeystoreError> {
        let entry = keyring::Entry::new(service, account).map_err(|e| match e {
            keyring::Error::NoEntry => {
                KeystoreError::KeyNotFound(format!("{}:{}", service, account))
            }
            _ => KeystoreError::Platform(format!("Failed to create entry: {}", e)),
        })?;

        entry.delete_credential().map_err(|e| match e {
            keyring::Error::NoEntry => {
                KeystoreError::KeyNotFound(format!("{}:{}", service, account))
            }
            _ => KeystoreError::Platform(format!("Failed to delete password: {}", e)),
        })
    }

    fn is_available(&self) -> bool {
        match keyring::Entry::new("keystore-availability-test", "test-availability") {
            Ok(entry) => match entry.get_password() {
                Ok(_) | Err(keyring::Error::NoEntry) => true,
                Err(_) => false,
            },
            Err(_) => false,
        }
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

    fn check_keyring_available() -> bool {
        let keystore = LinuxKeystore::new().unwrap();
        let test_entry = create_test_entry("test-availability", "test-availability", "test");

        let set_result = keystore.set_password(&test_entry);
        if set_result.is_err() {
            return false;
        }

        let get_result = keystore.get_password("test-availability", "test-availability");

        let _ = keystore.delete_password("test-availability", "test-availability");

        get_result.is_ok()
    }

    #[test]
    fn test_set_and_get_password() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let entry = create_test_entry(
            "test-service-rust-unit",
            "test-account-rust-unit",
            "my-secret-password",
        );

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("test-service-rust-unit", "test-account-rust-unit")
            .unwrap();
        assert_eq!(result, "my-secret-password");

        keystore
            .delete_password("test-service-rust-unit", "test-account-rust-unit")
            .unwrap();
    }

    #[test]
    fn test_get_nonexistent_password() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let result = keystore.get_password(
            "nonexistent-service-rust-unit",
            "nonexistent-account-rust-unit",
        );
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_delete_nonexistent_password() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let result = keystore.delete_password(
            "nonexistent-service-rust-unit",
            "nonexistent-account-rust-unit",
        );
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_update_existing_password() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let entry1 = create_test_entry(
            "update-service-rust-unit",
            "update-account-rust-unit",
            "old-password",
        );
        let entry2 = create_test_entry(
            "update-service-rust-unit",
            "update-account-rust-unit",
            "new-password",
        );

        keystore.set_password(&entry1).unwrap();
        keystore.set_password(&entry2).unwrap();

        let result = keystore
            .get_password("update-service-rust-unit", "update-account-rust-unit")
            .unwrap();
        assert_eq!(result, "new-password");

        keystore
            .delete_password("update-service-rust-unit", "update-account-rust-unit")
            .unwrap();
    }

    #[test]
    fn test_empty_value() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let entry = create_test_entry("empty-service-rust-unit", "empty-account-rust-unit", "");

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("empty-service-rust-unit", "empty-account-rust-unit")
            .unwrap();
        assert_eq!(result, "");

        keystore
            .delete_password("empty-service-rust-unit", "empty-account-rust-unit")
            .unwrap();
    }

    #[test]
    fn test_special_characters() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let special_value = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\r";
        let entry = create_test_entry(
            "special-service-rust-unit",
            "special-account-rust-unit",
            special_value,
        );

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("special-service-rust-unit", "special-account-rust-unit")
            .unwrap();
        assert_eq!(result, special_value);

        keystore
            .delete_password("special-service-rust-unit", "special-account-rust-unit")
            .unwrap();
    }

    #[test]
    fn test_long_value() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let long_value = "a".repeat(1000);
        let entry = create_test_entry(
            "long-service-rust-unit",
            "long-account-rust-unit",
            &long_value,
        );

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("long-service-rust-unit", "long-account-rust-unit")
            .unwrap();
        assert_eq!(result, long_value);

        keystore
            .delete_password("long-service-rust-unit", "long-account-rust-unit")
            .unwrap();
    }

    #[test]
    fn test_multiple_services() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let entries = vec![
            create_test_entry("service1-rust-unit", "account1-rust-unit", "password1"),
            create_test_entry("service1-rust-unit", "account2-rust-unit", "password2"),
            create_test_entry("service2-rust-unit", "account1-rust-unit", "password3"),
        ];

        for entry in &entries {
            keystore.set_password(entry).unwrap();
        }

        assert_eq!(
            keystore
                .get_password("service1-rust-unit", "account1-rust-unit")
                .unwrap(),
            "password1"
        );
        assert_eq!(
            keystore
                .get_password("service1-rust-unit", "account2-rust-unit")
                .unwrap(),
            "password2"
        );
        assert_eq!(
            keystore
                .get_password("service2-rust-unit", "account1-rust-unit")
                .unwrap(),
            "password3"
        );

        keystore
            .delete_password("service1-rust-unit", "account1-rust-unit")
            .unwrap();
        keystore
            .delete_password("service1-rust-unit", "account2-rust-unit")
            .unwrap();
        keystore
            .delete_password("service2-rust-unit", "account1-rust-unit")
            .unwrap();
    }

    #[test]
    fn test_utf8_values() {
        if !check_keyring_available() {
            eprintln!("Skipping Linux keyring tests: Secret Service not available");
            return;
        }

        let keystore = LinuxKeystore::new().unwrap();

        let utf8_value = "Hello 世界 🌍 Привет";
        let entry = create_test_entry(
            "utf8-service-rust-unit",
            "utf8-account-rust-unit",
            utf8_value,
        );

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("utf8-service-rust-unit", "utf8-account-rust-unit")
            .unwrap();
        assert_eq!(result, utf8_value);

        keystore
            .delete_password("utf8-service-rust-unit", "utf8-account-rust-unit")
            .unwrap();
    }
}
