'use client'

import { useState, useEffect } from 'react'

interface AvailableModel {
  name: string
  type: string
  path: string
  size_mb: number
  created: number
  modified: number
}

interface ModelType {
  name: string
  description: string
  architecture: string
  parameters: string
  accuracy: string
  speed: string
  strengths: string[]
  weaknesses: string[]
}

interface DynamicModelSelectorProps {
  selectedModel: string
  onModelSelect: (modelName: string, modelType: string) => void
}

export default function DynamicModelSelector({ selectedModel, onModelSelect }: DynamicModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<{ [key: string]: AvailableModel }>({})
  const [modelTypes, setModelTypes] = useState<{ [key: string]: ModelType }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedModelType, setSelectedModelType] = useState<string>('all')

  useEffect(() => {
    fetchAvailableModels()
  }, [])

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/models/available')
      const data = await response.json()
      
      if (response.ok) {
        setAvailableModels(data.available_models || {})
        setModelTypes(data.model_types || {})
      } else {
        setError(data.error || 'Failed to load available models')
      }
    } catch (error) {
      setError('Failed to load available models')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getFilteredModels = () => {
    const models = Object.values(availableModels)
    
    if (selectedModelType === 'all') {
      return models
    }
    
    return models.filter(model => model.type === selectedModelType)
  }

  const handleModelSelect = (modelName: string, modelType: string) => {
    onModelSelect(modelName, modelType)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🤖 Model Selection</h2>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading available models...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">🤖 Model Selection</h2>
        <div className="text-red-600 text-center">{error}</div>
      </div>
    )
  }

  const filteredModels = getFilteredModels()

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
          🤖 Model Selection
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter by type */}
          <select
            value={selectedModelType}
            onChange={(e) => setSelectedModelType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="resnet">ResNet</option>
            <option value="alexnet">AlexNet</option>
            <option value="mobilenet">MobileNet</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {filteredModels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Models Found</h3>
          <p className="text-gray-600">
            No trained models found in the models directory.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Train a model first to see it appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <div
                key={model.name}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedModel === model.name
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
                onClick={() => handleModelSelect(model.name, model.type)}
              >
                {/* Model Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      model.type === 'resnet' ? 'bg-blue-500' :
                      model.type === 'alexnet' ? 'bg-green-500' :
                      model.type === 'mobilenet' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="font-semibold text-gray-800">
                      {model.name}
                    </span>
                  </div>
                  {selectedModel === model.name && (
                    <div className="text-blue-500">✓</div>
                  )}
                </div>

                {/* Model Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{model.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{model.size_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(model.created)}</span>
                  </div>
                </div>

                {/* Model Type Info */}
                {modelTypes[model.type] && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div><strong>Architecture:</strong> {modelTypes[model.type].architecture}</div>
                      <div><strong>Parameters:</strong> {modelTypes[model.type].parameters}</div>
                      <div><strong>Expected Accuracy:</strong> {modelTypes[model.type].accuracy}</div>
                      <div><strong>Speed:</strong> {modelTypes[model.type].speed}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selected Model Info */}
          {selectedModel && availableModels[selectedModel] && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Selected Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium ml-2">{availableModels[selectedModel].name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium ml-2 capitalize">{availableModels[selectedModel].type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium ml-2">{availableModels[selectedModel].size_mb} MB</span>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium ml-2">{formatDate(availableModels[selectedModel].created)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
