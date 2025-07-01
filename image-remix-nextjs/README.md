# Image Remix - Next.js Frontend

This is the Next.js version of the Image Remix app, providing a cleaner web experience compared to the Expo/React Native version.

## Features

- **Authentication**: Email/password login with Supabase
- **Image Upload**: Upload images with metadata (title, description, tags)
- **Image Gallery**: View all uploaded images in a responsive grid
- **User Profile**: Display user information and stats
- **API Integration**: Connect to the Rust backend for image management
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env.local` file in the root directory with:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
image-remix-nextjs/
├── components/          # React components
│   ├── AuthModal.tsx    # Authentication modal
│   ├── ImageGallery.tsx # Image display component
│   ├── ImageUploader.tsx # Image upload component
│   ├── UserProfile.tsx  # User profile display
│   ├── UserStats.tsx    # User statistics
│   └── ApiTest.tsx      # API testing component
├── lib/                 # Utility libraries
│   ├── supabase.ts      # Supabase client configuration
│   ├── stores/          # Zustand state management
│   │   ├── authStore.ts # Authentication state
│   │   └── imageStore.ts # Image management state
│   └── services/        # API services
│       └── api.ts       # Backend API integration
└── src/app/             # Next.js app directory
    └── page.tsx         # Main page component
```

## Backend Integration

This frontend connects to the Rust backend running on `http://localhost:3000`. Make sure your backend is running before testing the API functionality.

## Key Differences from Expo Version

- **Web-focused**: Optimized for web browsers instead of mobile apps
- **Better Performance**: No React Native overhead
- **Easier Development**: Standard web development tools and debugging
- **Responsive Design**: Tailwind CSS for responsive layouts
- **File Upload**: Native HTML file input instead of React Native picker

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

1. **CORS Issues**: Make sure your Rust backend has CORS configured properly
2. **Environment Variables**: Double-check your Supabase credentials in `.env.local`
3. **Backend Connection**: Ensure your Rust backend is running on port 3000
4. **Image Upload**: Verify your Supabase storage bucket is configured correctly

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
