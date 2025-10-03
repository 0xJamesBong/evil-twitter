import { supabase } from "../supabase";

const API_BASE_URL = "http://localhost:3000"; // Update this to your backend URL
const AI_SERVICE_URL = "http://localhost:8000"; // AI service URL

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

export interface RemixRequest {
  prompt: string;
  strength?: number;
  guidance_scale?: number;
  model_id?: string;
}

export interface RemixResponse {
  success: boolean;
  result_url?: string;
  error?: string;
  model_used?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  example_prompts: string[];
  default_strength: number;
  default_guidance_scale: number;
  max_strength: number;
  min_strength: number;
  max_guidance_scale: number;
  min_guidance_scale: number;
  loaded?: boolean;
}

export interface ModelsResponse {
  models: ModelInfo[];
  categories: Record<string, ModelInfo[]>;
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

  async getUserImages(userId: string): Promise<BackendImage[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/images?user=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching user images:", error);
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

  async getUserById(
    userId: string
  ): Promise<{ dollar_conversion_rate: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "GET",
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const userData = await response.json();
      return {
        dollar_conversion_rate: userData.dollar_conversion_rate || 10000,
      };
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  }

  async getModels(): Promise<ModelsResponse> {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/models`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo> {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/models/${modelId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching model info:", error);
      throw error;
    }
  }

  async remixImage(
    imageUrl: string,
    prompt: string,
    strength: number = 0.6,
    guidance_scale: number = 7.5,
    modelId: string = "stable-diffusion-v1-5"
  ): Promise<RemixResponse> {
    try {
      // Call the Rust backend's remix endpoint
      const response = await fetch(`${API_BASE_URL}/remix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt,
          strength,
          guidance_scale,
          model_id: modelId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error remixing image:", error);
      throw error;
    }
  }

  async remixImageDirect(
    file: File,
    prompt: string,
    strength: number = 0.6,
    guidance_scale: number = 7.5,
    modelId: string = "stable-diffusion-v1-5"
  ): Promise<RemixResponse> {
    try {
      // Call the Python AI service directly
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prompt", prompt);
      formData.append("strength", strength.toString());
      formData.append("guidance_scale", guidance_scale.toString());
      formData.append("model_id", modelId);

      const response = await fetch(`${AI_SERVICE_URL}/remix`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const result = await response.json();

      // Convert the result URL to include the AI service base URL
      if (result.success && result.result_url) {
        result.result_url = `${AI_SERVICE_URL}${result.result_url}`;
      }

      return result;
    } catch (error) {
      console.error("Error remixing image directly:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
