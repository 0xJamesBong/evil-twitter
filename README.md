# Image Remix Application

A full-stack AI image remixing application built with Rust, Python, and Next.js. Upload images and transform them using AI-powered Stable Diffusion.

## 🏗️ Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Rust with Axum and MongoDB
- **AI Service**: Python with FastAPI and Stable Diffusion
- **Database**: MongoDB for image storage and metadata

## 📁 Project Structure

```
image-remix/
├── image-remix-nextjs/     # Next.js frontend
├── image-remix-backend/    # Rust backend API
├── ai-remix-service/       # Python AI service
├── backend/                # Legacy backend (not used)
└── stock-image/           # Sample images for testing
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable)
- **Python** (3.11 or higher)
- **MongoDB** (running locally or cloud instance)
- **Git**

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd image-remix
```

### 2. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS with Homebrew
brew services start mongodb-community

# Or run MongoDB manually
mongod
```

### 3. Setup Python AI Service

```bash
cd ai-remix-service

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# .venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt

# Start the AI service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The AI service will be available at `http://localhost:8000`

### 4. Setup Rust Backend

```bash
cd image-remix-backend

# Install dependencies and run
cargo run
```

The backend will be available at `http://localhost:3000`

### 5. Setup Next.js Frontend

```bash
cd image-remix-nextjs

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3001`

## 🔧 Configuration

### Environment Variables

Create `.env` files in each service directory as needed:

#### Backend (.env in image-remix-backend/)

```env
MONGODB_URI=mongodb://localhost:27017/image_remix
PORT=3000
```

#### Frontend (.env.local in image-remix-nextjs/)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
```

## 🎯 Usage

### 1. Access the Application

Open your browser and navigate to `http://localhost:3001`

### 2. Upload and Remix Images

1. **Upload an image** using the file picker in the AI Image Remixer section
2. **Enter a prompt** describing how you want to transform the image
3. **Adjust parameters**:
   - **Strength** (0.1-1.0): How much to transform (subtle to dramatic)
   - **Guidance Scale** (1-20): How closely to follow the prompt
4. **Click "Remix Image"** and wait for processing
5. **Download your result** when complete

### 3. Example Prompts

- "Turn this into a watercolor painting"
- "Make it look like a vintage photograph"
- "Transform into a cyberpunk style"
- "Convert to anime art style"
- "Make it look like an oil painting"

## 🔍 API Endpoints

### Rust Backend (Port 3000)

- `GET /ping` - Health check
- `GET /images` - Get all images
- `GET /images?user={userId}` - Get user's images
- `POST /images` - Upload image
- `DELETE /images/{id}` - Delete image
- `POST /remix` - Remix image via backend

### Python AI Service (Port 8000)

- `GET /health` - Health check
- `POST /remix` - Remix uploaded image
- `POST /remix-url` - Remix image from URL
- `GET /results/{filename}` - Get remixed image

## 🛠️ Development

### Running in Development Mode

All services support hot reloading:

```bash
# Terminal 1: AI Service
cd ai-remix-service
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Backend
cd image-remix-backend
cargo run

# Terminal 3: Frontend
cd image-remix-nextjs
npm run dev
```

### Building for Production

```bash
# Frontend
cd image-remix-nextjs
npm run build
npm start

# Backend
cd image-remix-backend
cargo build --release
./target/release/image-remix-backend

# AI Service
cd ai-remix-service
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :8000
   lsof -i :3001

   # Kill the process
   kill -9 <PID>
   ```

2. **Python dependencies issues**

   ```bash
   cd ai-remix-service
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **MongoDB connection issues**

   - Ensure MongoDB is running
   - Check connection string in backend configuration
   - Verify network access

4. **CORS issues**
   - Check that all services are running on correct ports
   - Verify CORS configuration in backend

### Service Health Checks

```bash
# Test all services
curl http://localhost:3000/ping
curl http://localhost:8000/health
curl http://localhost:3001
```

## 📦 Dependencies

### Python AI Service

- FastAPI
- Uvicorn
- PyTorch
- Diffusers
- Transformers
- Pillow
- aiohttp

### Rust Backend

- Axum
- MongoDB
- Serde
- Tokio
- reqwest

### Next.js Frontend

- React
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Supabase (authentication)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test all services
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Verify all services are running
3. Check the console logs for error messages
4. Ensure all dependencies are installed correctly

---

**Happy Remixing! 🎨✨**
