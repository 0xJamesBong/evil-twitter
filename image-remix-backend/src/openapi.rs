use utoipa::{
    Modify, OpenApi,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
};

pub const SESSION_COOKIE_NAME: &str = "SESSION_COOKIE_NAME";

#[derive(OpenApi)]
#[openapi(
    info(
        description = "Uranium Digital API", 
        version = "0.1.0", 
        title = "Uranium Digital API"
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "Images", description = "images"),

    )
)]
pub struct ApiDoc;
pub struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "cookie",
                SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description(
                    SESSION_COOKIE_NAME,
                    "httpOnly Cookie, user connect API",
                ))),
            );
        }
    }
}
