use crate::error::KeystoreError;
use crate::KeystoreEntry;
use super::KeystoreOperations;

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng, AeadCore},
    Aes256Gcm, Key, Nonce,
};

const KEY_SIZE: usize = 32;
const NONCE_SIZE: usize = 12;

#[derive(Serialize, Deserialize)]
struct EncryptedEntry {
    nonce: [u8; NONCE_SIZE],
    ciphertext: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
struct KeystoreData {
    entries: Vec<EncryptedEntry>,
}

pub struct FallbackKeystore {
    file_path: PathBuf,
    key: Key<Aes256Gcm>,
}

impl FallbackKeystore {
    pub fn new() -> Result<Self, KeystoreError> {
        let file_path = Self::get_file_path();
        
        let key = Self::get_or_create_key()?;
        
        Ok(Self { file_path, key })
    }
    
    fn get_file_path() -> PathBuf {
        let path = if cfg!(target_os = "windows") {
            let appdata = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(appdata).join("streaming-enhancement")
        } else if cfg!(target_os = "macos") {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join("Library/Application Support/streaming-enhancement")
        } else {
            let config = std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                format!("{}/.config", home)
            });
            PathBuf::from(config).join("streaming-enhancement")
        };
        
        fs::create_dir_all(&path).ok();
        path.join("keystore.fallback")
    }
    
    fn get_or_create_key() -> Result<Key<Aes256Gcm>, KeystoreError> {
        let key_file = if cfg!(target_os = "windows") {
            let appdata = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(appdata).join("streaming-enhancement/enc.key")
        } else if cfg!(target_os = "macos") {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join("Library/Application Support/streaming-enhancement/enc.key")
        } else {
            let config = std::env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
                format!("{}/.config", home)
            });
            PathBuf::from(config).join("streaming-enhancement/enc.key")
        };
        
        if let Ok(key_data) = fs::read(&key_file) {
            if key_data.len() == KEY_SIZE {
                return Ok(Key::<Aes256Gcm>::from_slice(&key_data).clone());
            }
        }
        
        let key = Aes256Gcm::generate_key(&mut OsRng);
        
        let parent_dir = key_file.parent().unwrap();
        fs::create_dir_all(parent_dir)?;
        
        fs::write(&key_file, key.as_slice())?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&key_file)?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&key_file, perms)?;
        }
        
        Ok(key)
    }
    
    fn load_data(&self) -> Result<KeystoreData, KeystoreError> {
        if !self.file_path.exists() {
            return Ok(KeystoreData { entries: vec![] });
        }
        
        let data = fs::read_to_string(&self.file_path)
            .map_err(KeystoreError::Io)?;
        
        serde_json::from_str(&data)
            .map_err(|e| KeystoreError::Serialization(e.to_string()))
    }
    
    fn save_data(&self, data: &KeystoreData) -> Result<(), KeystoreError> {
        let json = serde_json::to_string_pretty(data)
            .map_err(|e| KeystoreError::Serialization(e.to_string()))?;
        
        let parent_dir = self.file_path.parent().unwrap();
        fs::create_dir_all(parent_dir)?;
        
        fs::write(&self.file_path, json)?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&self.file_path)?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&self.file_path, perms)?;
        }
        
        Ok(())
    }
    
    fn derive_index(&self, service: &str, account: &str) -> Option<usize> {
        let data = self.load_data().ok()?;
        
        for (i, entry) in data.entries.iter().enumerate() {
            let cipher = Aes256Gcm::new(&self.key);
            if let Ok(decrypted) = cipher.decrypt(Nonce::from_slice(&entry.nonce), entry.ciphertext.as_ref()) {
                if let Ok(plaintext) = String::from_utf8(decrypted) {
                    let parts: Vec<&str> = plaintext.splitn(3, ':').collect();
                    if parts.len() == 3 && parts[0] == service && parts[1] == account {
                        return Some(i);
                    }
                }
            }
        }
        
        None
    }
}

impl KeystoreOperations for FallbackKeystore {
    fn set_password(&self, entry: &KeystoreEntry) -> Result<(), KeystoreError> {
        let mut data = self.load_data()?;
        
        let plaintext = format!("{}:{}:{}", entry.service, entry.account, entry.value);
        
        let cipher = Aes256Gcm::new(&self.key);
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        
        let ciphertext = cipher.encrypt(&nonce, plaintext.as_bytes())
            .map_err(|e| KeystoreError::Platform(format!("Encryption failed: {}", e)))?;
        
        let encrypted_entry = EncryptedEntry {
            nonce: <[u8; 12]>::try_from(nonce.as_slice()).unwrap(),
            ciphertext,
        };
        
        if let Some(index) = self.derive_index(&entry.service, &entry.account) {
            data.entries[index] = encrypted_entry;
        } else {
            data.entries.push(encrypted_entry);
        }
        
        self.save_data(&data)
    }
    
    fn get_password(&self, service: &str, account: &str) -> Result<String, KeystoreError> {
        let data = self.load_data()?;
        
        for entry in data.entries {
            let cipher = Aes256Gcm::new(&self.key);
            if let Ok(decrypted) = cipher.decrypt(Nonce::from_slice(&entry.nonce), entry.ciphertext.as_ref()) {
                if let Ok(plaintext) = String::from_utf8(decrypted) {
                    let parts: Vec<&str> = plaintext.splitn(3, ':').collect();
                    if parts.len() == 3 && parts[0] == service && parts[1] == account {
                        return Ok(parts[2].to_string());
                    }
                }
            }
        }
        
        Err(KeystoreError::KeyNotFound(format!("{}:{}", service, account)))
    }
    
    fn delete_password(&self, service: &str, account: &str) -> Result<(), KeystoreError> {
        let mut data = self.load_data()?;
        
        if let Some(index) = self.derive_index(service, account) {
            data.entries.remove(index);
            self.save_data(&data)?;
            return Ok(());
        }
        
        Err(KeystoreError::KeyNotFound(format!("{}:{}", service, account)))
    }
    
    fn is_available(&self) -> bool {
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_fallback(temp_dir: &TempDir) -> FallbackKeystore {
        let file_path = temp_dir.path().join("keystore-test.fallback");
        let key = Aes256Gcm::generate_key(&mut OsRng);
        FallbackKeystore { file_path, key }
    }

    fn create_test_entry(service: &str, account: &str, value: &str) -> KeystoreEntry {
        KeystoreEntry {
            service: service.to_string(),
            account: account.to_string(),
            value: value.to_string(),
        }
    }

    #[test]
    fn test_set_and_get_password() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let entry = create_test_entry("test-service", "test-account", "my-secret-password");
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("test-service", "test-account").unwrap();
        assert_eq!(result, "my-secret-password");
    }

    #[test]
    fn test_get_nonexistent_password() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let result = keystore.get_password("nonexistent-service", "nonexistent-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_delete_nonexistent_password() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let result = keystore.delete_password("nonexistent-service", "nonexistent-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error"),
        }
    }

    #[test]
    fn test_update_existing_password() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let entry1 = create_test_entry("update-service", "update-account", "old-password");
        let entry2 = create_test_entry("update-service", "update-account", "new-password");
        
        keystore.set_password(&entry1).unwrap();
        keystore.set_password(&entry2).unwrap();
        
        let result = keystore.get_password("update-service", "update-account").unwrap();
        assert_eq!(result, "new-password");
        
        assert!(keystore.get_password("update-service", "update-account").unwrap() == "new-password");
    }

    #[test]
    fn test_empty_value() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let entry = create_test_entry("empty-service", "empty-account", "");
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("empty-service", "empty-account").unwrap();
        assert_eq!(result, "");
    }

    #[test]
    fn test_special_characters() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let special_value = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\n\t\r";
        let entry = create_test_entry("special-service", "special-account", special_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("special-service", "special-account").unwrap();
        assert_eq!(result, special_value);
    }

    #[test]
    fn test_long_value() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let long_value = "a".repeat(1000);
        let entry = create_test_entry("long-service", "long-account", &long_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("long-service", "long-account").unwrap();
        assert_eq!(result, long_value);
    }

    #[test]
    fn test_multiple_services() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
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
    }

    #[test]
    fn test_utf8_values() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let utf8_value = "Hello 世界 🌍 Привет";
        let entry = create_test_entry("utf8-service", "utf8-account", utf8_value);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("utf8-service", "utf8-account").unwrap();
        assert_eq!(result, utf8_value);
    }

    #[test]
    fn test_delete_password() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let entry = create_test_entry("delete-service", "delete-account", "to-delete");
        
        keystore.set_password(&entry).unwrap();
        assert!(keystore.get_password("delete-service", "delete-account").is_ok());
        
        keystore.delete_password("delete-service", "delete-account").unwrap();
        
        let result = keystore.get_password("delete-service", "delete-account");
        assert!(result.is_err());
        match result.unwrap_err() {
            KeystoreError::KeyNotFound(_) => (),
            _ => panic!("Expected KeyNotFound error after delete"),
        }
    }

    #[test]
    fn test_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("keystore-persist-test.fallback");
        let key = Aes256Gcm::generate_key(&mut OsRng);
        
        let entry = create_test_entry("persist-service", "persist-account", "persist-value");
        
        {
            let keystore1 = FallbackKeystore { file_path: file_path.clone(), key: key.clone() };
            keystore1.set_password(&entry).unwrap();
        }
        
        {
            let keystore2 = FallbackKeystore { file_path: file_path.clone(), key };
            let result = keystore2.get_password("persist-service", "persist-account").unwrap();
            assert_eq!(result, "persist-value");
        }
    }

    #[test]
    fn test_colon_in_value() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let value_with_colons = "value:with:multiple:colons::";
        let entry = create_test_entry("colon-service", "colon-account", value_with_colons);
        
        keystore.set_password(&entry).unwrap();
        
        let result = keystore.get_password("colon-service", "colon-account").unwrap();
        assert_eq!(result, value_with_colons);
    }

    #[test]
    fn test_encryption_output_is_not_plaintext() {
        let temp_dir = TempDir::new().unwrap();
        let keystore = create_test_fallback(&temp_dir);
        
        let entry = create_test_entry("encrypt-service", "encrypt-account", "plaintext-password");
        keystore.set_password(&entry).unwrap();
        
        let file_content = fs::read_to_string(&keystore.file_path).unwrap();
        
        assert!(!file_content.contains("plaintext-password"));
        assert!(!file_content.contains("encrypt-service"));
        assert!(!file_content.contains("encrypt-account"));
    }
}