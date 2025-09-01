"""
Model metadata management system for tracking model statistics and performance
"""

import os
import json
import time
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
import logging
from dataclasses import dataclass, asdict
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class ModelMetadata:
    """Model metadata structure"""
    # Basic information
    name: str
    file_path: str
    format: str  # 'pytorch' or 'safetensors'
    model_type: str  # 'resnet', 'alexnet', 'mobilenet'
    
    # File information
    file_size_bytes: int
    file_size_mb: float
    created_timestamp: float
    modified_timestamp: float
    
    # Model architecture
    num_parameters: int
    num_layers: Optional[int] = None
    input_shape: Optional[List[int]] = None
    output_shape: Optional[List[int]] = None
    
    # Training information
    training_epochs: Optional[int] = None
    training_batch_size: Optional[int] = None
    learning_rate: Optional[float] = None
    optimizer: Optional[str] = None
    scheduler: Optional[str] = None
    weight_decay: Optional[float] = None
    dropout_rate: Optional[float] = None
    
    # Performance metrics
    validation_accuracy: Optional[float] = None
    training_accuracy: Optional[float] = None
    validation_loss: Optional[float] = None
    training_loss: Optional[float] = None
    
    # Dataset information
    dataset_name: Optional[str] = None
    dataset_size: Optional[int] = None
    num_classes: Optional[int] = None
    class_names: Optional[List[str]] = None
    
    # Training details
    training_duration_seconds: Optional[float] = None
    training_start_time: Optional[str] = None
    training_end_time: Optional[str] = None
    device_used: Optional[str] = None
    
    # Hyperparameter tuning
    hyperparameter_tuning: Optional[bool] = None
    tuning_method: Optional[str] = None  # 'optuna', 'grid_search', 'random_search'
    best_hyperparameters: Optional[Dict[str, Any]] = None
    
    # Model checksum for integrity
    file_hash: Optional[str] = None
    
    # Additional metadata
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    version: Optional[str] = None
    author: Optional[str] = None
    
    # Usage statistics
    usage_count: int = 0
    last_used: Optional[str] = None
    average_inference_time: Optional[float] = None
    
    # Model status
    is_active: bool = True
    is_public: bool = True
    requires_auth: bool = False

class ModelMetadataManager:
    """Manages model metadata storage and retrieval"""
    
    def __init__(self, metadata_dir: str = "models/metadata"):
        self.metadata_dir = Path(metadata_dir)
        self.metadata_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.metadata_dir / "models.json"
        self.metadata_cache: Dict[str, ModelMetadata] = {}
        self._load_metadata()
    
    def _load_metadata(self):
        """Load existing metadata from file"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)
                    for model_data in data.values():
                        metadata = ModelMetadata(**model_data)
                        self.metadata_cache[metadata.name] = metadata
                logger.info(f"Loaded {len(self.metadata_cache)} model metadata entries")
            except Exception as e:
                logger.error(f"Error loading metadata: {e}")
    
    def _save_metadata(self):
        """Save metadata to file"""
        try:
            data = {name: asdict(metadata) for name, metadata in self.metadata_cache.items()}
            with open(self.metadata_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            logger.info(f"Saved {len(self.metadata_cache)} model metadata entries")
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of model file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def register_model(self, 
                      model_path: str,
                      model_type: str,
                      training_info: Optional[Dict[str, Any]] = None,
                      performance_info: Optional[Dict[str, Any]] = None,
                      dataset_info: Optional[Dict[str, Any]] = None) -> ModelMetadata:
        """
        Register a new model with metadata
        
        Args:
            model_path: Path to the model file
            model_type: Type of model architecture
            training_info: Training parameters and details
            performance_info: Performance metrics
            dataset_info: Dataset information
            
        Returns:
            ModelMetadata object
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Get file information
        stat = os.stat(model_path)
        file_size_bytes = stat.st_size
        file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
        
        # Determine format
        file_ext = Path(model_path).suffix.lower()
        format_type = 'safetensors' if file_ext == '.safetensors' else 'pytorch'
        
        # Get model name
        model_name = Path(model_path).stem
        
        # Calculate file hash
        file_hash = self._calculate_file_hash(model_path)
        
        # Create metadata
        metadata = ModelMetadata(
            name=model_name,
            file_path=model_path,
            format=format_type,
            model_type=model_type,
            file_size_bytes=file_size_bytes,
            file_size_mb=file_size_mb,
            created_timestamp=stat.st_ctime,
            modified_timestamp=stat.st_mtime,
            file_hash=file_hash,
            training_start_time=datetime.now().isoformat(),
            device_used="cuda" if training_info and training_info.get('use_cuda') else "cpu"
        )
        
        # Add training information
        if training_info:
            metadata.training_epochs = training_info.get('epochs')
            metadata.training_batch_size = training_info.get('batch_size')
            metadata.learning_rate = training_info.get('learning_rate')
            metadata.optimizer = training_info.get('optimizer', 'Adam')
            metadata.scheduler = training_info.get('scheduler_type')
            metadata.weight_decay = training_info.get('weight_decay')
            metadata.dropout_rate = training_info.get('dropout_rate')
            metadata.hyperparameter_tuning = training_info.get('enable_tuning', False)
            metadata.tuning_method = training_info.get('tuning_method')
            metadata.best_hyperparameters = training_info.get('best_hyperparameters')
        
        # Add performance information
        if performance_info:
            metadata.validation_accuracy = performance_info.get('validation_accuracy')
            metadata.training_accuracy = performance_info.get('training_accuracy')
            metadata.validation_loss = performance_info.get('validation_loss')
            metadata.training_loss = performance_info.get('training_loss')
            metadata.training_duration_seconds = performance_info.get('training_duration')
        
        # Add dataset information
        if dataset_info:
            metadata.dataset_name = dataset_info.get('name', 'Oxford-IIIT Pet Dataset')
            metadata.dataset_size = dataset_info.get('size')
            metadata.num_classes = dataset_info.get('num_classes', 37)
            metadata.class_names = dataset_info.get('class_names')
        
        # Store metadata
        self.metadata_cache[model_name] = metadata
        self._save_metadata()
        
        logger.info(f"Registered model: {model_name} ({format_type}, {file_size_mb}MB)")
        return metadata
    
    def get_model_metadata(self, model_name: str) -> Optional[ModelMetadata]:
        """Get metadata for a specific model"""
        return self.metadata_cache.get(model_name)
    
    def get_all_models(self) -> List[ModelMetadata]:
        """Get all registered models"""
        return list(self.metadata_cache.values())
    
    def get_models_by_type(self, model_type: str) -> List[ModelMetadata]:
        """Get models filtered by type"""
        return [m for m in self.metadata_cache.values() if m.model_type == model_type]
    
    def get_models_by_format(self, format_type: str) -> List[ModelMetadata]:
        """Get models filtered by format"""
        return [m for m in self.metadata_cache.values() if m.format == format_type]
    
    def update_model_usage(self, model_name: str, inference_time: Optional[float] = None):
        """Update model usage statistics"""
        if model_name in self.metadata_cache:
            metadata = self.metadata_cache[model_name]
            metadata.usage_count += 1
            metadata.last_used = datetime.now().isoformat()
            
            if inference_time is not None:
                if metadata.average_inference_time is None:
                    metadata.average_inference_time = inference_time
                else:
                    # Update running average
                    metadata.average_inference_time = (
                        (metadata.average_inference_time * (metadata.usage_count - 1) + inference_time) 
                        / metadata.usage_count
                    )
            
            self._save_metadata()
    
    def update_model_performance(self, model_name: str, performance_metrics: Dict[str, Any]):
        """Update model performance metrics"""
        if model_name in self.metadata_cache:
            metadata = self.metadata_cache[model_name]
            
            for key, value in performance_metrics.items():
                if hasattr(metadata, key):
                    setattr(metadata, key, value)
            
            self._save_metadata()
    
    def delete_model_metadata(self, model_name: str):
        """Delete metadata for a model"""
        if model_name in self.metadata_cache:
            del self.metadata_cache[model_name]
            self._save_metadata()
            logger.info(f"Deleted metadata for model: {model_name}")
    
    def export_metadata(self, output_path: str):
        """Export all metadata to a JSON file"""
        data = {name: asdict(metadata) for name, metadata in self.metadata_cache.items()}
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        logger.info(f"Exported metadata to: {output_path}")
    
    def get_model_stats(self) -> Dict[str, Any]:
        """Get overall statistics about all models"""
        if not self.metadata_cache:
            return {}
        
        models = list(self.metadata_cache.values())
        
        stats = {
            "total_models": len(models),
            "total_size_mb": sum(m.file_size_mb for m in models),
            "total_parameters": sum(m.num_parameters or 0 for m in models),
            "models_by_type": {},
            "models_by_format": {},
            "average_validation_accuracy": 0,
            "best_validation_accuracy": 0,
            "most_used_model": None,
            "recently_used_models": []
        }
        
        # Models by type
        for model in models:
            model_type = model.model_type
            if model_type not in stats["models_by_type"]:
                stats["models_by_type"][model_type] = 0
            stats["models_by_type"][model_type] += 1
        
        # Models by format
        for model in models:
            format_type = model.format
            if format_type not in stats["models_by_format"]:
                stats["models_by_format"][format_type] = 0
            stats["models_by_format"][format_type] += 1
        
        # Accuracy statistics
        accuracies = [m.validation_accuracy for m in models if m.validation_accuracy is not None]
        if accuracies:
            stats["average_validation_accuracy"] = sum(accuracies) / len(accuracies)
            stats["best_validation_accuracy"] = max(accuracies)
        
        # Usage statistics
        if models:
            most_used = max(models, key=lambda m: m.usage_count)
            stats["most_used_model"] = {
                "name": most_used.name,
                "usage_count": most_used.usage_count
            }
        
        # Recently used models
        recent_models = [m for m in models if m.last_used]
        recent_models.sort(key=lambda m: m.last_used, reverse=True)
        stats["recently_used_models"] = [
            {"name": m.name, "last_used": m.last_used} 
            for m in recent_models[:5]
        ]
        
        return stats

# Global metadata manager instance
metadata_manager = ModelMetadataManager()

# Convenience functions
def register_model(model_path: str, model_type: str, **kwargs) -> ModelMetadata:
    """Register a new model with metadata"""
    return metadata_manager.register_model(model_path, model_type, **kwargs)

def get_model_metadata(model_name: str) -> Optional[ModelMetadata]:
    """Get metadata for a specific model"""
    return metadata_manager.get_model_metadata(model_name)

def get_all_models() -> List[ModelMetadata]:
    """Get all registered models"""
    return metadata_manager.get_all_models()

def update_model_usage(model_name: str, inference_time: Optional[float] = None):
    """Update model usage statistics"""
    metadata_manager.update_model_usage(model_name, inference_time)

def get_model_stats() -> Dict[str, Any]:
    """Get overall model statistics"""
    return metadata_manager.get_model_stats()
