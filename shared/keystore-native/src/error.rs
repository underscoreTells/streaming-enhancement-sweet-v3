use napi_derive::napi;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum KeystoreError {
    #[error("Platform not supported")]
    PlatformNotSupported,
    
    #[error("Key not found: {0}")]
    KeyNotFound(String),
    
    #[error("Access denied: {0}")]
    AccessDenied(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("Platform error: {0}")]
    Platform(String),
}

#[napi(object)]
pub struct NapiKeystoreError {
    pub code: String,
    pub message: String,
}

impl From<KeystoreError> for NapiKeystoreError {
    fn from(err: KeystoreError) -> Self {
        let code = match err {
            KeystoreError::PlatformNotSupported => "ERR_PLATFORM_NOT_SUPPORTED",
            KeystoreError::KeyNotFound(_) => "ERR_KEY_NOT_FOUND",
            KeystoreError::AccessDenied(_) => "ERR_ACCESS_DENIED",
            KeystoreError::Io(_) => "ERR_IO",
            KeystoreError::Serialization(_) => "ERR_SERIALIZATION",
            KeystoreError::Platform(_) => "ERR_PLATFORM",
        };
        
        NapiKeystoreError {
            code: code.to_string(),
            message: err.to_string(),
        }
    }
}
