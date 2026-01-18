use super::error::KeystoreError;
use super::KeystoreEntry;
use super::KeystoreOperations;

use windows::core::{PCWSTR, HSTRING};
use windows::Win32::Foundation::{ERROR_NOT_FOUND, GetLastError};
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
        
        let credential = CREDENTIALW {
            Flags: CRED_FLAGS(0),
            Type: CRED_TYPE_GENERIC,
            TargetName: PCWSTR(credential_name_hstring.as_ptr()),
            Comment: PCWSTR::null(),
            LastWritten: windows::Win32::Foundation::FILETIME::default(),
            CredentialBlobSize: cred_blob.len() as u32,
            CredentialBlob: cred_blob.as_mut_ptr() as *mut u8,
            Persist: CRED_PERSIST::ENTERPRISE,
            UserName: PCWSTR(HSTRING::from(entry.account.as_str()).as_ptr()),
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
            ).map_err(|e| {
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
            let password = String::from_utf8(blob_slice.to_vec())
                .map_err(|e| KeystoreError::Serialization(e.to_string()))?;
            
            CredFree(credential_ptr as *const _);
            
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
            ).map_err(|e| {
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