# Models Directory

This directory contains all trained pet classification models.

## File Naming Convention

Models are automatically saved with the following naming convention:
- `{model_type}_{training_type}_{timestamp}.pth`

Examples:
- `resnet_standard_1703123456.pth` - Standard ResNet model trained at timestamp 1703123456
- `alexnet_tuned_1703123457.pth` - Tuned AlexNet model with hyperparameter optimization
- `mobilenet_standard_1703123458.pth` - Standard MobileNet model

## Model Types

- **resnet**: ResNet-50 architecture (high accuracy, medium speed)
- **alexnet**: AlexNet architecture (medium accuracy, fast speed)
- **mobilenet**: MobileNet V2 architecture (lower accuracy, very fast speed)

## Training Types

- **standard**: Models trained with default hyperparameters
- **tuned**: Models trained with hyperparameter optimization (Optuna or Grid Search)

## Usage

Models in this directory are automatically detected by the application and can be selected through the "Select Trained Model" interface. The system will scan this directory and provide a list of available models for users to choose from.

## File Information

Each model file contains:
- Trained model weights
- Model architecture information
- Training metadata (if available)

## Size Information

- ResNet models: ~100-200 MB
- AlexNet models: ~200-300 MB  
- MobileNet models: ~20-50 MB
