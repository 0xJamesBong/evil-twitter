import { supabase } from "../supabase";

const API_BASE_URL = "http://localhost:3000"; // Update this to your backend URL

export interface BackendImage {
  _id?: { $oid: string };
  id?: string; // For backward compatibility
  url: string;
  uploader: string;
  created_at: { $date: { $numberLong: string } } | string;
  parent_id?: { $oid: string };
  title?: string;
  description?: string;
  tags?: string[];
  file_id?: { $oid: string };
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  ai_processed?: boolean;
  ai_model_version?: string;
  ai_processing_status?: string;
  ai_features?: string[];
  remix_count?: number;
  original_image_id?: { $oid: string };
}

export interface NewImageRequest {
  url: string;
  uploader: string;
  parent_id?: string;
}

class ApiService {
  private async getAuthHeaders(contentType: string = "application/json") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": contentType,
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
    };
  }

  async uploadImage(
    file: File,
    metadata: { title?: string; description?: string; tags?: string[] }
  ): Promise<BackendImage> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Create FormData to send file directly to backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploader", user.id);
      if (metadata.title) formData.append("title", metadata.title);
      if (metadata.description)
        formData.append("description", metadata.description);
      if (metadata.tags) formData.append("tags", metadata.tags.join(","));

      // Send file directly to backend
      const response = await fetch(`${API_BASE_URL}/images`, {
        method: "POST",
        headers: {
          // Don't set Content-Type, let browser set it with boundary for FormData
          // Only include auth headers if needed
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  async getImages(): Promise<BackendImage[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/images`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("getImages response", response);
      return await response.json();
    } catch (error) {
      console.error("Error fetching images:", error);
      throw error;
    }
  }

  async deleteImage(imageId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/images/${imageId}`, {
        method: "DELETE",
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  }

  async updateImage(
    imageId: string,
    updates: Partial<BackendImage>
  ): Promise<BackendImage> {
    try {
      const response = await fetch(`${API_BASE_URL}/images/${imageId}`, {
        method: "PUT",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating image:", error);
      throw error;
    }
  }

  async ping(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/ping`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error("Error pinging backend:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
