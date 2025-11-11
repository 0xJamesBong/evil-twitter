use async_graphql::Object;

// ============================================================================
// UserMutation Object
// ============================================================================

#[derive(Default)]
pub struct UserMutation;

#[Object]
impl UserMutation {
    /// Placeholder mutation - user mutations will be added here as needed
    async fn _placeholder(&self) -> String {
        "placeholder".to_string()
    }
}
