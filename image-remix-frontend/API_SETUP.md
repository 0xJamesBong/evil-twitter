# API Integration Setup

This document explains how the frontend connects to the Rust backend API for image management.

## Backend API Endpoints

The Rust backend provides the following endpoints:

- `GET /ping` - Health check
- `GET /images` - Get all images
- `POST /images` - Create a new image
- `DELETE /images/:id` - Delete an image
- `PUT /images/:id` - Update an image

## Frontend Integration

### API Service (`services/api.ts`)

The `ApiService` class handles all communication with the backend:

- **uploadImage**: Uploads file to Supabase Storage, then creates record in backend
- **getImages**: Fetches all images from backend
- **deleteImage**: Deletes image from backend
- **updateImage**: Updates image in backend
- **ping**: Tests backend connectivity

### Image Store (`stores/imageStore.ts`)

The Zustand store has been updated to use the backend API instead of direct Supabase calls:

- All CRUD operations now go through the `ApiService`
- Maintains compatibility with existing frontend components
- Handles conversion between frontend and backend data formats

### Components

- **ApiTest**: Test component to verify backend connectivity
- **ImageGalleryWithAPI**: Updated gallery component that uses real API data
- **ImageUploader**: Upload component that works with the backend

## Testing the Connection

1. **Start the backend**:

   ```bash
   cd image-remix-backend
   cargo run
   ```

2. **Start the frontend**:

   ```bash
   cd image-remix-frontend
   npm start
   ```

3. **Test the connection**:
   - The `ApiTest` component is included on the main page
   - Click "Test Ping" to verify backend connectivity
   - Click "Test Get Images" to verify image fetching

## Data Flow

1. **Image Upload**:

   - File uploaded to Supabase Storage
   - Public URL generated
   - Image metadata sent to Rust backend
   - Backend stores image record in MongoDB

2. **Image Fetching**:

   - Frontend requests images from Rust backend
   - Backend returns image data from MongoDB
   - Frontend displays images using URLs from Supabase Storage

3. **Image Management**:
   - Delete/update operations go through Rust backend
   - Backend updates MongoDB records
   - Frontend state updated accordingly

## Configuration

Update the `API_BASE_URL` in `services/api.ts` to match your backend URL:

```typescript
const API_BASE_URL = "http://localhost:3000"; // Update this to your backend URL
```

## Troubleshooting

- **CORS Issues**: Ensure backend allows requests from frontend origin
- **Network Errors**: Check if backend is running on correct port
- **Authentication**: Backend currently doesn't require auth, but frontend sends auth headers for future use
