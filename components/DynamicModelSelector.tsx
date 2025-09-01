'use client'

import { useState } from 'react'

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
  const [selectedModelType, setSelectedModelType] = useState<string>('all')

  // Convert the imported JSON data to the format expected by the component
  const availableModels: { [key: string]: AvailableModel } = {
    'resnet50': {
      name: 'resnet_model_improved.safetensors.best',
      type: 'resnet',
      path: 'models/resnet_model_improved.safetensors.best',
      size_mb: 45.2,
      created: Date.now() / 1000 - 86400,
      modified: Date.now() / 1000 - 3600
    },
    'mobilenetv2': {
      name: 'mobilenet_model.safetensors',
      type: 'mobilenet',
      path: 'models/mobilenet_model.safetensors',
      size_mb: 12.8,
      created: Date.now() / 1000 - 86400,
      modified: Date.now() / 1000 - 3600
    },
    'alexnet': {
      name: 'alexnet_model.safetensors',
      type: 'alexnet',
      path: 'models/alexnet_model.safetensors',
      size_mb: 8.5,
      created: Date.now() / 1000 - 86400,
      modified: Date.now() / 1000 - 3600
    }
  }

  const modelTypes: { [key: string]: ModelType } = {
    'resnet': {
      name: 'ResNet-50',
      description: 'Deep Residual Network with 50 layers',
      architecture: 'Residual Neural Network',
      parameters: '25.6M',
      accuracy: '92%',
      speed: 'Medium',
      strengths: ['High accuracy', 'Good generalization', 'Stable training'],
      weaknesses: ['Larger model size', 'Slower inference']
    },
    'mobilenet': {
      name: 'MobileNet V2',
      description: 'Efficient mobile-optimized model',
      architecture: 'Depthwise Separable Convolutions',
      parameters: '3.4M',
      accuracy: '88%',
      speed: 'Fast',
      strengths: ['Small size', 'Fast inference', 'Mobile-friendly'],
      weaknesses: ['Lower accuracy', 'Limited on complex images']
    },
    'alexnet': {
      name: 'AlexNet',
      description: 'Classic CNN architecture',
      architecture: 'Convolutional Neural Network',
      parameters: '61M',
      accuracy: '85%',
      speed: 'Medium',
      strengths: ['Simple architecture', 'Well-documented', 'Stable'],
      weaknesses: ['Lower accuracy', 'Older design']
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

  const filteredModels = getFilteredModels()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 sm:mb-0">
          🤖 Model Selection
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter by type */}
          <select
            value={selectedModelType}
            onChange={(e) => setSelectedModelType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No Models Found</h3>
          <p className="text-gray-600 dark:text-gray-300">
            No trained models found in the models directory.
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Train a model first to see it appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <div
                key={model.name}
                className={`border rounded-lg p-4 cursor-pointer transition-all bg-white dark:bg-gray-700 ${
                  selectedModel === model.name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
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
                    <span 
                      className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[140px]"
                      title={model.name}
                    >
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
                    <span className="text-gray-600 dark:text-gray-300">Type:</span>
                    <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{model.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Size:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{model.size_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Created:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(model.created)}</span>
                  </div>
                </div>

                {/* Model Type Info */}
                {modelTypes[model.type] && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
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
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Selected Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="col-span-1 md:col-span-2">
                  <span className="text-gray-600 dark:text-gray-300">Name:</span>
                  <span className="font-medium ml-2 break-words text-gray-900 dark:text-gray-100">{availableModels[selectedModel].name}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Type:</span>
                  <span className="font-medium ml-2 capitalize text-gray-900 dark:text-gray-100">{availableModels[selectedModel].type}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Size:</span>
                  <span className="font-medium ml-2 text-gray-900 dark:text-gray-100">{availableModels[selectedModel].size_mb} MB</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Created:</span>
                  <span className="font-medium ml-2 text-gray-900 dark:text-gray-100">{formatDate(availableModels[selectedModel].created)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
