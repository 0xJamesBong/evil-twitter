use async_graphql::{EmptySubscription, Schema};
use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::{mutations::MergedMutationRoot, queries::MergedQueryRoot};

pub type AppSchema = Schema<MergedQueryRoot, MergedMutationRoot, EmptySubscription>;

pub fn build_schema(app_state: Arc<AppState>) -> AppSchema {
    Schema::build(
        MergedQueryRoot::default(),
        MergedMutationRoot::default(),
        EmptySubscription,
    )
    .data(app_state.clone())
    .limit_complexity(1_000)
    .limit_depth(10)
    .finish()
}
