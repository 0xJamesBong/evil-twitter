import { API_BASE_URL } from "../config";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message?: string }[];
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  identityToken?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (identityToken) {
    // Send identity token in Authorization Bearer header
    // Backend supports both Authorization Bearer and privy-id-token header
    headers["Authorization"] = `Bearer ${identityToken}`;
    // Also send as privy-id-token header for clarity
    headers["privy-id-token"] = identityToken;
  }

  const response = await fetch(`${API_BASE_URL}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message ?? "GraphQL request failed");
  }

  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }

  return json.data;
}
