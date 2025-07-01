import { supabase } from "../supabase/supabase";

const API_BASE_URL = "http://localhost:3000"; // Update this to your backend URL

export interface BackendImage {
  id?: string;
  url: string;
  uploader: string;
  created_at: string;
  parent_id?: string;
}

export interface NewImageRequest {
  url: string;
  uploader: string;
  parent_id?: string;
}

class ApiService {
  private async getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
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
      // 1. Upload file to Supabase Storage first
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      // 3. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 4. Send to backend
      const response = await fetch(`${API_BASE_URL}/images`, {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          url: publicUrl,
          uploader: user.id,
          parent_id: undefined,
        } as NewImageRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
