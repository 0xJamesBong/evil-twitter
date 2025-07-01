'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useImageStore } from '../lib/stores/imageStore';
import { useAuthStore } from '../lib/stores/authStore';

export function ImageUploader() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadImage } = useImageStore();
    const { isAuthenticated } = useAuthStore();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);

            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !isAuthenticated) {
            alert('Please select a file and make sure you are logged in');
            return;
        }

        setIsUploading(true);
        try {
            const metadata = {
                title: title || undefined,
                description: description || undefined,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
            };

            const result = await uploadImage(selectedFile, metadata);

            if (result.success) {
                // Reset form
                setTitle('');
                setDescription('');
                setTags('');
                setSelectedFile(null);
                setPreviewUrl('');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                alert('Image uploaded successfully!');
            } else {
                alert(`Upload failed: ${result.error}`);
            }
        } catch (error: any) {
            alert(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-center">
                    Please log in to upload images
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-white font-semibold mb-4">Upload Image</h4>

            {/* File Selection */}
            <div className="mb-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {!selectedFile ? (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-500 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    >
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <p className="text-gray-400">Click to select an image</p>
                        <p className="text-gray-500 text-sm">or drag and drop</p>
                    </button>
                ) : (
                    <div className="relative">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                            onClick={removeFile}
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                        >
                            <X size={16} className="text-white" />
                        </button>
                    </div>
                )}
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3">
                <div>
                    <label className="block text-gray-300 text-sm mb-1">Title (optional)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter image title"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-gray-300 text-sm mb-1">Description (optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter image description"
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                    />
                </div>

                <div>
                    <label className="block text-gray-300 text-sm mb-1">Tags (optional)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Enter tags separated by commas"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full mt-4 bg-purple-500 py-3 rounded-lg text-white font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Uploading...
                    </div>
                ) : (
                    'Upload Image'
                )}
            </button>
        </div>
    );
} 