'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useImageStore } from '../lib/stores/imageStore';
import { useAuthStore } from '../lib/stores/authStore';

interface UploadProgress {
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

export function ImageUploader() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadImage, refreshImages } = useImageStore();
    const { isAuthenticated } = useAuthStore();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files]);

            // Initialize upload progress for new files
            const newProgress: UploadProgress[] = files.map(file => ({
                file,
                status: 'pending',
                progress: 0
            }));
            setUploadProgress(prev => [...prev, ...newProgress]);
        }
    };

    const removeFile = (fileToRemove: File) => {
        setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
        setUploadProgress(prev => prev.filter(p => p.file !== fileToRemove));
    };

    const uploadSingleFile = async (file: File, index: number): Promise<void> => {
        // Update progress to uploading
        setUploadProgress(prev => prev.map((p, i) =>
            p.file === file ? { ...p, status: 'uploading', progress: 0 } : p
        ));

        try {
            const metadata = {
                title: title || file.name,
                description: description || undefined,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
            };

            const result = await uploadImage(file, metadata);

            if (result.success) {
                // Update progress to success
                setUploadProgress(prev => prev.map(p =>
                    p.file === file ? { ...p, status: 'success', progress: 100 } : p
                ));
            } else {
                // Update progress to error
                setUploadProgress(prev => prev.map(p =>
                    p.file === file ? { ...p, status: 'error', error: result.error } : p
                ));
            }
        } catch (error: any) {
            // Update progress to error
            setUploadProgress(prev => prev.map(p =>
                p.file === file ? { ...p, status: 'error', error: error.message } : p
            ));
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !isAuthenticated) {
            alert('Please select files and make sure you are logged in');
            return;
        }

        setIsUploading(true);

        try {
            // Upload all files simultaneously and track results
            const uploadResults = await Promise.allSettled(
                selectedFiles.map((file, index) => uploadSingleFile(file, index))
            );

            // Count successful and failed uploads
            const successfulUploads = uploadResults.filter(result => result.status === 'fulfilled').length;
            const failedUploads = uploadResults.filter(result => result.status === 'rejected').length;

            if (failedUploads === 0) {
                // All uploads succeeded
                setTitle('');
                setDescription('');
                setTags('');
                setSelectedFiles([]);
                setUploadProgress([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                await refreshImages();
                alert(`All ${successfulUploads} images uploaded successfully!`);
            } else {
                alert(`Upload completed: ${successfulUploads} successful, ${failedUploads} failed`);
            }
        } catch (error: any) {
            alert(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const getFilePreviewUrl = (file: File): string => {
        return URL.createObjectURL(file);
    };

    const getStatusIcon = (status: UploadProgress['status']) => {
        switch (status) {
            case 'pending':
                return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
            case 'uploading':
                return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
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
            <h4 className="text-white font-semibold mb-4">Upload Images</h4>

            {/* File Selection */}
            <div className="mb-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-500 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                >
                    <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                    <p className="text-gray-400">Click to select images</p>
                    <p className="text-gray-500 text-sm">or drag and drop (multiple files supported)</p>
                </button>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
                <div className="mb-4">
                    <h5 className="text-white font-medium mb-2">Selected Files ({selectedFiles.length})</h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedFiles.map((file, index) => {
                            const progress = uploadProgress.find(p => p.file === file);
                            return (
                                <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-600 rounded-lg p-2">
                                    <div className="flex items-center space-x-2 flex-1">
                                        {getStatusIcon(progress?.status || 'pending')}
                                        <span className="text-white text-sm truncate">{file.name}</span>
                                        <span className="text-gray-400 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </div>
                                    {progress?.status === 'error' && (
                                        <span className="text-red-400 text-xs ml-2">{progress.error}</span>
                                    )}
                                    <button
                                        onClick={() => removeFile(file)}
                                        className="ml-2 text-red-400 hover:text-red-300"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Metadata Fields */}
            <div className="space-y-3">
                <div>
                    <label className="block text-gray-300 text-sm mb-1">Title (optional - will use filename if empty)</label>
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
                disabled={selectedFiles.length === 0 || isUploading}
                className="w-full mt-4 bg-purple-500 py-3 rounded-lg text-white font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Uploading {selectedFiles.length} images...
                    </div>
                ) : (
                    `Upload ${selectedFiles.length} Image${selectedFiles.length !== 1 ? 's' : ''}`
                )}
            </button>
        </div>
    );
} 