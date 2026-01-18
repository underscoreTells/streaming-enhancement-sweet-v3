use napi_derive::napi;

#[napi(object)]
#[derive(Debug)]
pub struct KeystoreEntry {
    pub service: String,
    pub account: String,
    pub value: String,
}

pub mod error;
pub mod platform;

pub use platform::Keystore;
