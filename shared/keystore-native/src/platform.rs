use super::error::KeystoreError;
use super::KeystoreEntry;
use napi::Error;
use napi_derive::napi;

#[cfg(windows)]
mod windows;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;

// Fallback is available on non-standard platforms, for tests, and on Linux when Secret Service is unavailable
#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
mod fallback;

#[cfg(target_os = "linux")]
mod fallback;

#[cfg(all(test, any(windows, target_os = "macos")))]
mod fallback;

impl From<KeystoreError> for Error {
    fn from(err: KeystoreError) -> Self {
        let code = match err {
            KeystoreError::PlatformNotSupported => "ERR_PLATFORM_NOT_SUPPORTED",
            KeystoreError::KeyNotFound(_) => "ERR_KEY_NOT_FOUND",
            KeystoreError::AccessDenied(_) => "ERR_ACCESS_DENIED",
            KeystoreError::Io(_) => "ERR_IO",
            KeystoreError::Serialization(_) => "ERR_SERIALIZATION",
            KeystoreError::Platform(_) => "ERR_PLATFORM",
        };

        Error::new(napi::Status::GenericFailure, format!("{}: {}", code, err))
    }
}

pub trait KeystoreOperations {
    fn set_password(&self, entry: &KeystoreEntry) -> Result<(), KeystoreError>;
    fn get_password(&self, service: &str, account: &str) -> Result<String, KeystoreError>;
    fn delete_password(&self, service: &str, account: &str) -> Result<(), KeystoreError>;
    fn is_available(&self) -> bool;
}

cfg_if::cfg_if! {
    if #[cfg(windows)] {
        pub use windows::WindowsKeystore as Keystore;
    } else if #[cfg(target_os = "macos")] {
        pub use macos::MacOsKeystore as Keystore;
    } else if #[cfg(target_os = "linux")] {
        pub use linux::LinuxKeystore as Keystore;
    } else {
        pub use fallback::FallbackKeystore as Keystore;
    }
}

#[napi]
pub struct NapiKeystore {
    inner: Box<dyn KeystoreOperations + Send + Sync>,
}

#[cfg(windows)]
#[napi]
impl NapiKeystore {
    #[napi(constructor)]
    pub fn new() -> Result<Self, Error> {
        let inner =
            Box::new(windows::WindowsKeystore::new()?) as Box<dyn KeystoreOperations + Send + Sync>;
        Ok(Self { inner })
    }

    #[napi]
    pub fn set_password(
        &self,
        service: String,
        account: String,
        value: String,
    ) -> Result<(), Error> {
        let entry = KeystoreEntry {
            service: service.clone(),
            account: account.clone(),
            value,
        };
        Ok(self.inner.set_password(&entry)?)
    }

    #[napi]
    pub fn get_password(&self, service: String, account: String) -> Result<String, Error> {
        Ok(self.inner.get_password(&service, &account)?)
    }

    #[napi]
    pub fn delete_password(&self, service: String, account: String) -> Result<(), Error> {
        Ok(self.inner.delete_password(&service, &account)?)
    }

    #[napi]
    pub fn is_available(&self) -> bool {
        self.inner.is_available()
    }
}

#[cfg(target_os = "macos")]
#[napi]
impl NapiKeystore {
    #[napi(constructor)]
    pub fn new() -> Result<Self, Error> {
        let inner =
            Box::new(macos::MacOsKeystore::new()?) as Box<dyn KeystoreOperations + Send + Sync>;
        Ok(Self { inner })
    }

    #[napi]
    pub fn set_password(
        &self,
        service: String,
        account: String,
        value: String,
    ) -> Result<(), Error> {
        let entry = KeystoreEntry {
            service: service.clone(),
            account: account.clone(),
            value,
        };
        Ok(self.inner.set_password(&entry)?)
    }

    #[napi]
    pub fn get_password(&self, service: String, account: String) -> Result<String, Error> {
        Ok(self.inner.get_password(&service, &account)?)
    }

    #[napi]
    pub fn delete_password(&self, service: String, account: String) -> Result<(), Error> {
        Ok(self.inner.delete_password(&service, &account)?)
    }

    #[napi]
    pub fn is_available(&self) -> bool {
        self.inner.is_available()
    }
}

#[cfg(target_os = "linux")]
#[napi]
impl NapiKeystore {
    #[napi(constructor)]
    pub fn new() -> Result<Self, Error> {
        // Try native Linux keystore first, fall back to encrypted file if unavailable
        let linux_keystore = linux::LinuxKeystore::new()?;
        if linux_keystore.is_available() {
            let inner = Box::new(linux_keystore) as Box<dyn KeystoreOperations + Send + Sync>;
            Ok(Self { inner })
        } else {
            let inner = Box::new(fallback::FallbackKeystore::new()?)
                as Box<dyn KeystoreOperations + Send + Sync>;
            Ok(Self { inner })
        }
    }

    #[napi]
    pub fn set_password(
        &self,
        service: String,
        account: String,
        value: String,
    ) -> Result<(), Error> {
        let entry = KeystoreEntry {
            service: service.clone(),
            account: account.clone(),
            value,
        };
        Ok(self.inner.set_password(&entry)?)
    }

    #[napi]
    pub fn get_password(&self, service: String, account: String) -> Result<String, Error> {
        Ok(self.inner.get_password(&service, &account)?)
    }

    #[napi]
    pub fn delete_password(&self, service: String, account: String) -> Result<(), Error> {
        Ok(self.inner.delete_password(&service, &account)?)
    }

    #[napi]
    pub fn is_available(&self) -> bool {
        self.inner.is_available()
    }
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
#[napi]
impl NapiKeystore {
    #[napi(constructor)]
    pub fn new() -> Result<Self, Error> {
        let inner = Box::new(fallback::FallbackKeystore::new()?)
            as Box<dyn KeystoreOperations + Send + Sync>;
        Ok(Self { inner })
    }

    #[napi]
    pub fn set_password(
        &self,
        service: String,
        account: String,
        value: String,
    ) -> Result<(), Error> {
        let entry = KeystoreEntry {
            service: service.clone(),
            account: account.clone(),
            value,
        };
        Ok(self.inner.set_password(&entry)?)
    }

    #[napi]
    pub fn get_password(&self, service: String, account: String) -> Result<String, Error> {
        Ok(self.inner.get_password(&service, &account)?)
    }

    #[napi]
    pub fn delete_password(&self, service: String, account: String) -> Result<(), Error> {
        Ok(self.inner.delete_password(&service, &account)?)
    }

    #[napi]
    pub fn is_available(&self) -> bool {
        self.inner.is_available()
    }
}
