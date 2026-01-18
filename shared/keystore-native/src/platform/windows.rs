use super::error::KeystoreError;
use super::KeystoreEntry;
use super::KeystoreOperations;

use windows::core::{HSTRING, PCWSTR};
use windows::Win32::Foundation::{GetLastError, ERROR_NOT_FOUND};
use windows::Win32::Security::Credentials::*;

pub struct WindowsKeystore;

impl WindowsKeystore {
    pub fn new() -> Result<Self, KeystoreError> {
        Ok(Self)
    }
}

impl KeystoreOperations for WindowsKeystore {
    fn set_password(&self, entry: &KeystoreEntry) -> Result<(), KeystoreError> {
        let credential_name = format!("{}:{}", entry.service, entry.account);
        let credential_name_hstring = HSTRING::from(credential_name.as_str());

        let mut cred_blob = entry.value.as_bytes().to_vec();

        let account_hstring = HSTRING::from(entry.account.as_str());

        let credential = CREDENTIALW {
            Flags: CRED_FLAGS(0),
            Type: CRED_TYPE_GENERIC,
            TargetName: PCWSTR(credential_name_hstring.as_ptr()),
            Comment: PCWSTR::null(),
            LastWritten: windows::Win32::Foundation::FILETIME::default(),
            CredentialBlobSize: cred_blob.len() as u32,
            CredentialBlob: cred_blob.as_mut_ptr() as *mut u8,
            Persist: CRED_PERSIST::ENTERPRISE,
            UserName: PCWSTR(account_hstring.as_ptr()),
            Attributes: std::ptr::null_mut(),
            TargetAlias: PCWSTR::null(),
            ..Default::default()
        };

        unsafe {
            CredWriteW(&credential, 0)
                .map_err(|e| KeystoreError::Platform(format!("Failed to write credential: {}", e)))
        }
    }

    fn get_password(&self, service: &str, account: &str) -> Result<String, KeystoreError> {
        let credential_name = format!("{}:{}", service, account);
        let credential_name_hstring = HSTRING::from(credential_name.as_str());

        unsafe {
            let mut credential_ptr: *mut CREDENTIALW = std::ptr::null_mut();

            CredReadW(
                PCWSTR(credential_name_hstring.as_ptr()),
                CRED_TYPE_GENERIC,
                0,
                &mut credential_ptr as *mut *mut CREDENTIALW,
            )
            .map_err(|e| {
                if e.code() == ERROR_NOT_FOUND.to_hresult() {
                    KeystoreError::KeyNotFound(credential_name.clone())
                } else {
                    KeystoreError::Platform(format!("Failed to read credential: {}", e))
                }
            })?;

            if credential_ptr.is_null() {
                return Err(KeystoreError::KeyNotFound(credential_name));
            }

            let credential = &*credential_ptr;

            let blob_len = credential.CredentialBlobSize as usize;
            let blob_ptr = credential.CredentialBlob;

            let blob_slice = std::slice::from_raw_parts(blob_ptr, blob_len);
            let blob_vec = blob_slice.to_vec();

            CredFree(credential_ptr as *const _);

            let password = String::from_utf8(blob_vec)
                .map_err(|e| KeystoreError::Serialization(e.to_string()))?;

            Ok(password)
        }
    }

    fn delete_password(&self, service: &str, account: &str) -> Result<(), KeystoreError> {
        let credential_name = format!("{}:{}", service, account);
        let credential_name_hstring = HSTRING::from(credential_name.as_str());

        unsafe {
            CredDeleteW(
                PCWSTR(credential_name_hstring.as_ptr()),
                CRED_TYPE_GENERIC,
                0,
            )
            .map_err(|e| {
                if e.code() == ERROR_NOT_FOUND.to_hresult() {
                    KeystoreError::KeyNotFound(credential_name.clone())
                } else {
                    KeystoreError::Platform(format!("Failed to delete credential: {}", e))
                }
            })
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
        let keystore = WindowsKeystore::new().unwrap();

        let entry = create_test_entry("test-service", "test-account", "my-secret-password");

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("test-service", "test-account")
            .unwrap();
        assert_eq!(result, "my-secret-password");

        keystore
            .delete_password("test-service", "test-account")
            .unwrap();
    }

    #[test]
    fn test_get_nonexistent_password() {
        let keystore = WindowsKeystore::new().unwrap();

        let result = keystore.get_password("nonexistent-service", "nonexistent-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_delete_nonexistent_password() {
        let keystore = WindowsKeystore::new().unwrap();

        let result = keystore.delete_password("nonexistent-service", "nonexistent-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_update_existing_password() {
        let keystore = WindowsKeystore::new().unwrap();

        let entry1 = create_test_entry("update-service", "update-account", "old-password");
        let entry2 = create_test_entry("update-service", "update-account", "new-password");

        keystore.set_password(&entry1).unwrap();
        keystore.set_password(&entry2).unwrap();

        let result = keystore
            .get_password("update-service", "update-account")
            .unwrap();
        assert_eq!(result, "new-password");

        keystore
            .delete_password("update-service", "update-account")
            .unwrap();
    }

    #[test]
    fn test_empty_value() {
        let keystore = WindowsKeystore::new().unwrap();

        let entry = create_test_entry("empty-service", "empty-account", "");

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("empty-service", "empty-account")
            .unwrap();
        assert_eq!(result, "");

        keystore
            .delete_password("empty-service", "empty-account")
            .unwrap();
    }

    #[test]
    fn test_special_characters() {
        let keystore = WindowsKeystore::new().unwrap();

        let special_value = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\r";
        let entry = create_test_entry("special-service", "special-account", special_value);

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("special-service", "special-account")
            .unwrap();
        assert_eq!(result, special_value);

        keystore
            .delete_password("special-service", "special-account")
            .unwrap();
    }

    #[test]
    fn test_long_value() {
        let keystore = WindowsKeystore::new().unwrap();

        let long_value = "a".repeat(1000);
        let entry = create_test_entry("long-service", "long-account", &long_value);

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("long-service", "long-account")
            .unwrap();
        assert_eq!(result, long_value);

        keystore
            .delete_password("long-service", "long-account")
            .unwrap();
    }

    #[test]
    fn test_multiple_services() {
        let keystore = WindowsKeystore::new().unwrap();

        let entries = vec![
            create_test_entry("service1", "account1", "password1"),
            create_test_entry("service1", "account2", "password2"),
            create_test_entry("service2", "account1", "password3"),
        ];

        for entry in &entries {
            keystore.set_password(entry).unwrap();
        }

        assert_eq!(
            keystore.get_password("service1", "account1").unwrap(),
            "password1"
        );
        assert_eq!(
            keystore.get_password("service1", "account2").unwrap(),
            "password2"
        );
        assert_eq!(
            keystore.get_password("service2", "account1").unwrap(),
            "password3"
        );

        keystore.delete_password("service1", "account1").unwrap();
        keystore.delete_password("service1", "account2").unwrap();
        keystore.delete_password("service2", "account1").unwrap();
    }

    #[test]
    fn test_utf8_values() {
        let keystore = WindowsKeystore::new().unwrap();

        let utf8_value = "Hello 世界 🌍 Привет";
        let entry = create_test_entry("utf8-service", "utf8-account", utf8_value);

        keystore.set_password(&entry).unwrap();

        let result = keystore
            .get_password("utf8-service", "utf8-account")
            .unwrap();
        assert_eq!(result, utf8_value);

        keystore
            .delete_password("utf8-service", "utf8-account")
            .unwrap();
    }
}
