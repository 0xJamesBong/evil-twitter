use async_graphql::{EmptySubscription, Schema};
use mongodb::Database;

use crate::graphql::{GraphQLState, mutations::MergedMutationRoot, queries::MergedQueryRoot};

pub type AppSchema = Schema<MergedQueryRoot, MergedMutationRoot, EmptySubscription>;

pub fn build_schema(db: Database) -> AppSchema {
    Schema::build(
        MergedQueryRoot::default(),
        MergedMutationRoot::default(),
        EmptySubscription,
    )
    .data(GraphQLState { db })
    .limit_complexity(1_000)
    .limit_depth(10)
    .finish()
}
