use super::error::KeystoreError;
use super::KeystoreEntry;
use super::KeystoreOperations;

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use sha2::{Sha256, Digest};

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
        let mut path = if cfg!(target_os = "windows") {
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
        fs::create_dir_all(parent_dir)
            .map_err(|e| KeystoreError::Io(e))?;
        
        fs::write(&key_file, key.as_slice())
            .map_err(|e| KeystoreError::Io(e))?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&key_file)
                .map_err(|e| KeystoreError::Io(e))?
                .permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&key_file, perms)
                .map_err(|e| KeystoreError::Io(e))?;
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
        fs::create_dir_all(parent_dir)
            .map_err(|e| KeystoreError::Io(e))?;
        
        fs::write(&self.file_path, json)
            .map_err(|e| KeystoreError::Io)?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&self.file_path)
                .map_err(|e| KeystoreError::Io(e))?
                .permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&self.file_path, perms)
                .map_err(|e| KeystoreError::Io(e))?;
        }
        
        Ok(())
    }
    
    fn derive_index(&self, service: &str, account: &str) -> Option<usize> {
        let data = self.load_data().ok()?;
        
        for (i, entry) in data.entries.iter().enumerate() {
            let cipher = Aes256Gcm::new(&self.key);
            if let Ok(decrypted) = cipher.decrypt(Nonce::from_slice(&entry.nonce), entry.ciphertext.as_ref()) {
                if let Ok(plaintext) = String::from_utf8(decrypted) {
                    if plaintext.starts_with(&format!("{}:{}", service, account)) {
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
            nonce: nonce.to_vec().try_into().unwrap(),
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