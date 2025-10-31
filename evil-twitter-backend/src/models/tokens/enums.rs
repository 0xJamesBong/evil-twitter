use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
pub enum TokenType {
    Dooler,
    Usdc,
    Sol,
    Bling,
}
