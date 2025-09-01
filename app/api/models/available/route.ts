import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Dynamically scan the models directory
    const modelsDir = path.join(process.cwd(), 'models');
    
    if (!fs.existsSync(modelsDir)) {
      return NextResponse.json({
        models: [],
        default_model: 'resnet50',
        total_models: 0,
        error: 'Models directory not found'
      });
    }

    const modelFiles = fs.readdirSync(modelsDir);
    const models = [];

    for (const fileName of modelFiles) {
      if (fileName.endsWith('.pth') || fileName.endsWith('.safetensors')) {
        const filePath = path.join(modelsDir, fileName);
        const stat = fs.statSync(filePath);
        
        // Determine model type from filename
        let modelType = 'unknown';
        let modelName = fileName;
        let accuracy = 0.85; // Default accuracy
        let inferenceTime = '~200ms'; // Default time

        if (fileName.toLowerCase().includes('resnet')) {
          modelType = 'resnet';
          modelName = 'ResNet-50';
          accuracy = 0.92;
          inferenceTime = '~200ms';
        } else if (fileName.toLowerCase().includes('mobilenet')) {
          modelType = 'mobilenet';
          modelName = 'MobileNet V2';
          accuracy = 0.88;
          inferenceTime = '~100ms';
        } else if (fileName.toLowerCase().includes('alexnet')) {
          modelType = 'alexnet';
          modelName = 'AlexNet';
          accuracy = 0.85;
          inferenceTime = '~150ms';
        }

        // Try to read metadata from accompanying .json file
        const metadataPath = path.join(modelsDir, fileName + '.json');
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            if (metadata.accuracy) accuracy = metadata.accuracy;
            if (metadata.inference_time) inferenceTime = metadata.inference_time;
            if (metadata.description) modelName = metadata.description;
          } catch (e) {
            console.warn('Failed to parse metadata for', fileName);
          }
        }

        models.push({
          id: modelType,
          name: modelName,
          description: `${modelName} - ${fileName.includes('.safetensors') ? 'SafeTensors' : 'PyTorch'} format`,
          accuracy: accuracy,
          inference_time: inferenceTime,
          status: 'available',
          file_name: fileName,
          file_size: Math.round(stat.size / (1024 * 1024) * 100) / 100, // Size in MB
          last_modified: stat.mtime.toISOString(),
          format: fileName.endsWith('.safetensors') ? 'safetensors' : 'pytorch'
        });
      }
    }

    // Remove duplicates based on model type, prefer safetensors format
    const uniqueModels = [];
    const seenTypes = new Set();
    
    // Sort to prioritize safetensors format
    models.sort((a, b) => {
      if (a.format === 'safetensors' && b.format !== 'safetensors') return -1;
      if (a.format !== 'safetensors' && b.format === 'safetensors') return 1;
      return 0;
    });

    for (const model of models) {
      if (!seenTypes.has(model.id)) {
        uniqueModels.push(model);
        seenTypes.add(model.id);
      }
    }

    const response = {
      models: uniqueModels,
      default_model: uniqueModels.length > 0 ? uniqueModels[0].id : 'resnet50',
      total_models: uniqueModels.length,
      scanned_at: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error scanning models directory:', error);
    return NextResponse.json(
      { error: 'Failed to scan available models' },
      { status: 500 }
    );
  }
}
