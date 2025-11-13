use std::sync::Arc;

use async_graphql::http::GraphiQLSource;
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{extract::State, http::HeaderMap, response::Html};

use crate::{app_state::AppState, graphql::schema::AppSchema};

/// GraphiQL playground handler
pub async fn graphiql_handler() -> Html<String> {
    Html(
        GraphiQLSource::build()
            .endpoint("/graphql")
            .subscription_endpoint("/graphql/ws")
            .finish(),
    )
}

/// GraphQL handler for both GET and POST requests
///
/// This handler:
/// 1. Extracts headers from the request
/// 2. Injects headers into GraphQL context so resolvers can access them
/// 3. Executes the GraphQL query/mutation
/// 4. Returns the response
pub async fn graphql_handler(
    State((schema, _app_state)): State<(AppSchema, Arc<AppState>)>,
    headers: HeaderMap,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = req.into_inner();

    // Inject headers into GraphQL context so resolvers can access them
    // This is critical for authentication in GraphQL resolvers
    request = request.data(headers);

    // Execute the GraphQL request
    schema.execute(request).await.into()
}
