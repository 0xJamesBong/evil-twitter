import { supabase } from "@/lib/supabase";

export const getAuthHeaders = async (
  includeJson: boolean = true
): Promise<Record<string, string>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};

export const parseMongoId = (value: any): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if ("$oid" in value && typeof value.$oid === "string") {
      return value.$oid;
    }
    if ("$id" in value && typeof value.$id === "string") {
      return value.$id;
    }
  }

  return null;
};
