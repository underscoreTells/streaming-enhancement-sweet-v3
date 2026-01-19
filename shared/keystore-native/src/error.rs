use napi::bindgen_prelude::ToNapiValue;
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

pub struct JsKeystoreError(pub KeystoreError);

impl JsKeystoreError {
    pub fn new(err: KeystoreError) -> Self {
        Self(err)
    }

    fn error_code(&self) -> &'static str {
        match self.0 {
            KeystoreError::PlatformNotSupported => "ERR_PLATFORM_NOT_SUPPORTED",
            KeystoreError::KeyNotFound(_) => "ERR_KEY_NOT_FOUND",
            KeystoreError::AccessDenied(_) => "ERR_ACCESS_DENIED",
            KeystoreError::Io(_) => "ERR_IO",
            KeystoreError::Serialization(_) => "ERR_SERIALIZATION",
            KeystoreError::Platform(_) => "ERR_PLATFORM",
        }
    }
}

impl ToNapiValue for JsKeystoreError {
    unsafe fn to_napi_value(env: *mut napi::sys::napi_env__, value: Self) -> napi::Result<*mut napi::sys::napi_value__> {
        use napi::sys::*;

        let code = value.error_code();
        let message = value.0.to_string();

        let mut error_value = std::ptr::null_mut();

        let mut code_js_value = std::ptr::null_mut();
        let code_cstring = std::ffi::CString::new(code).unwrap();
        let status = napi_create_string_utf8(
            env,
            code_cstring.as_ptr(),
            code.len() as isize,
            &mut code_js_value,
        );

        if status != 0 {
            return Err(napi::Error::from_status(napi::Status::GenericFailure));
        }

        let mut message_js_value = std::ptr::null_mut();
        let message_cstring = std::ffi::CString::new(message.as_str()).unwrap();
        let status = napi_create_string_utf8(
            env,
            message_cstring.as_ptr(),
            message.len() as isize,
            &mut message_js_value,
        );

        if status != 0 {
            return Err(napi::Error::from_status(napi::Status::GenericFailure));
        }

        let status = napi_create_error(
            env,
            code_js_value,
            message_js_value,
            &mut error_value,
        );

        if status != 0 {
            return Err(napi::Error::from_status(napi::Status::GenericFailure));
        }

        let mut code_property_value = std::ptr::null_mut();
        let code_property_cstring = std::ffi::CString::new(code).unwrap();
        let status = napi_create_string_utf8(
            env,
            code_property_cstring.as_ptr(),
            code.len() as isize,
            &mut code_property_value,
        );

        if status != 0 {
            return Err(napi::Error::from_status(napi::Status::GenericFailure));
        }

        let code_key_cstring = std::ffi::CString::new("code").unwrap();
        let status = napi_set_named_property(
            env,
            error_value,
            code_key_cstring.as_ptr(),
            code_property_value,
        );

        if status != 0 {
            return Err(napi::Error::from_status(napi::Status::GenericFailure));
        }

        Ok(error_value)
    }
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
