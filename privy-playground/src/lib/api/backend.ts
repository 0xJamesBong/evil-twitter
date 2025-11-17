const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export interface OnboardUserInput {
  handle: string;
  displayName: string;
}

export interface OnboardUserResponse {
  data: {
    onboardUser: {
      user: {
        id: string;
        privyId: string;
        wallet: string;
        loginType: string;
        email?: string;
        profile?: {
          handle: string;
          displayName: string;
        };
      };
    };
  };
}

export async function onboardUser(
  accessToken: string,
  input: OnboardUserInput
): Promise<OnboardUserResponse> {
  const mutation = `
    mutation OnboardUser($input: OnboardUserInput!) {
      onboardUser(input: $input) {
        user {
          id
          privyId
          wallet
          loginType
          email
          profile {
            handle
            displayName
          }
        }
      }
    }
  `;

  const response = await fetch(`${BACKEND_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "GraphQL error");
  }

  return result;
}
