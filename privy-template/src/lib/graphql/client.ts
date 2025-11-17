import { API_BASE_URL } from "../config";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message?: string }[];
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
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
