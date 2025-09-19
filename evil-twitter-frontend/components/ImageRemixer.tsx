'use client';

import React, { useState, useRef, useEffect } from 'react';
import { apiService, RemixResponse, ModelInfo, ModelsResponse } from '../lib/services/api';

interface ImageRemixerProps {
    className?: string;
}

export function ImageRemixer({ className = '' }: ImageRemixerProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [strength, setStrength] = useState(0.6);
    const [guidanceScale, setGuidanceScale] = useState(7.5);
    const [selectedModel, setSelectedModel] = useState('stable-diffusion-v1-5');
    const [isRemixing, setIsRemixing] = useState(false);
    const [remixResult, setRemixResult] = useState<RemixResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<ModelsResponse | null>(null);
    const [selectedModelInfo, setSelectedModelInfo] = useState<ModelInfo | null>(null);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load models on component mount
    useEffect(() => {
        loadModels();
    }, []);

    // Update selected model info when model changes
    useEffect(() => {
        if (models && selectedModel) {
            const modelInfo = models.models.find(m => m.id === selectedModel);
            setSelectedModelInfo(modelInfo || null);

            // Update default parameters based on model
            if (modelInfo) {
                setStrength(modelInfo.default_strength);
                setGuidanceScale(modelInfo.default_guidance_scale);
            }
        }
    }, [selectedModel, models]);

    const loadModels = async () => {
        try {
            setIsLoadingModels(true);
            const modelsData = await apiService.getModels();
            setModels(modelsData);
        } catch (err) {
            console.error('Failed to load models:', err);
            setError('Failed to load available models');
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setError(null);
        } else {
            setError('Please select a valid image file');
        }
    };

    const handleRemix = async () => {
        if (!selectedFile) {
            setError('Please select an image first');
            return;
        }

        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return;
        }

        setIsRemixing(true);
        setError(null);
        setRemixResult(null);

        try {
            const result = await apiService.remixImageDirect(
                selectedFile,
                prompt,
                strength,
                guidanceScale,
                selectedModel
            );
            setRemixResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remix image');
        } finally {
            setIsRemixing(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPrompt('');
        if (selectedModelInfo) {
            setStrength(selectedModelInfo.default_strength);
            setGuidanceScale(selectedModelInfo.default_guidance_scale);
        } else {
            setStrength(0.6);
            setGuidanceScale(7.5);
        }
        setRemixResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
    };

    const handleExamplePromptClick = (examplePrompt: string) => {
        setPrompt(examplePrompt);
    };

    if (isLoadingModels) {
        return (
            <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <span className="ml-3 text-gray-300">Loading models...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
            <h2 className="text-2xl font-bold text-white mb-6">AI Image Remixer</h2>

            {/* Model Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select AI Model
                </label>
                <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    {models?.models.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.name} ({model.category})
                        </option>
                    ))}
                </select>

                {/* Model Info */}
                {selectedModelInfo && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                        <h4 className="text-sm font-medium text-white mb-2">{selectedModelInfo.name}</h4>
                        <p className="text-sm text-gray-300 mb-3">{selectedModelInfo.description}</p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                            {selectedModelInfo.tags.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-purple-600 text-white text-xs rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Example Prompts */}
                        {selectedModelInfo.example_prompts.length > 0 && (
                            <div>
                                <p className="text-sm text-gray-400 mb-2">Example prompts:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModelInfo.example_prompts.map((prompt, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleExamplePromptClick(prompt)}
                                            className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600 transition-colors"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* File Upload */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Image
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-500 file:text-white hover:file:bg-purple-600"
                />
                {selectedFile && (
                    <div className="mt-2 text-sm text-gray-400">
                        Selected: {selectedFile.name}
                    </div>
                )}
            </div>

            {/* Prompt Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Remix Prompt
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how you want to remix the image..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                />
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Strength: {strength}
                    </label>
                    <input
                        type="range"
                        min={selectedModelInfo?.min_strength || 0.1}
                        max={selectedModelInfo?.max_strength || 1.0}
                        step="0.1"
                        value={strength}
                        onChange={(e) => setStrength(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                        How much to transform the image (0.1 = subtle, 1.0 = dramatic)
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Guidance Scale: {guidanceScale}
                    </label>
                    <input
                        type="range"
                        min={selectedModelInfo?.min_guidance_scale || 1}
                        max={selectedModelInfo?.max_guidance_scale || 20}
                        step="0.5"
                        value={guidanceScale}
                        onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                        How closely to follow the prompt (1 = creative, 20 = strict)
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200">
                    {error}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={handleRemix}
                    disabled={isRemixing || !selectedFile || !prompt.trim()}
                    className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isRemixing ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Remixing...
                        </span>
                    ) : (
                        'Remix Image'
                    )}
                </button>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                    Reset
                </button>
            </div>

            {/* Results */}
            {remixResult && (
                <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Remix Result</h3>
                    {remixResult.success && remixResult.result_url ? (
                        <div className="space-y-4">
                            {remixResult.model_used && (
                                <div className="text-sm text-gray-400">
                                    Model used: <span className="text-purple-400">{remixResult.model_used}</span>
                                </div>
                            )}
                            <div className="flex justify-center">
                                <img
                                    src={remixResult.result_url}
                                    alt="Remixed image"
                                    className="max-w-full h-auto rounded-lg shadow-lg"
                                    style={{ maxHeight: '400px' }}
                                />
                            </div>
                            <div className="text-center">
                                <a
                                    href={remixResult.result_url}
                                    download="remixed-image.jpg"
                                    className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    Download Result
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-red-400">
                            Remix failed: {remixResult.error || 'Unknown error'}
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">How to use:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Choose an AI model that fits your desired style</li>
                    <li>• Upload an image you want to remix</li>
                    <li>• Enter a descriptive prompt or click an example</li>
                    <li>• Adjust strength and guidance scale to control the transformation</li>
                    <li>• Click "Remix Image" and wait for the AI to process</li>
                    <li>• Download your remixed image when complete</li>
                </ul>
            </div>
        </div>
    );
} 