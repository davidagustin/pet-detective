"""
Model conversion utilities for PyTorch and SafeTensors formats
"""

import os
import torch
import logging
import time
from safetensors.torch import save_file, load_file
from typing import Dict, Any, Optional, Union
import json

logger = logging.getLogger(__name__)

class ModelConverter:
    """Utility class for converting between PyTorch and SafeTensors formats"""
    
    @staticmethod
    def pth_to_safetensors(pth_path: str, safetensors_path: Optional[str] = None) -> str:
        """
        Convert a PyTorch .pth file to SafeTensors format
        
        Args:
            pth_path: Path to the .pth file
            safetensors_path: Output path for .safetensors file (optional)
            
        Returns:
            Path to the created .safetensors file
        """
        try:
            if not os.path.exists(pth_path):
                raise FileNotFoundError(f"PyTorch model file not found: {pth_path}")
            
            # Load PyTorch model
            logger.info(f"Loading PyTorch model from: {pth_path}")
            state_dict = torch.load(pth_path, map_location='cpu')
            
            # Determine output path
            if safetensors_path is None:
                base_path = os.path.splitext(pth_path)[0]
                safetensors_path = f"{base_path}.safetensors"
            
            # Convert to SafeTensors format
            logger.info(f"Converting to SafeTensors format: {safetensors_path}")
            save_file(state_dict, safetensors_path)
            
            # Create metadata file
            metadata_path = f"{os.path.splitext(safetensors_path)[0]}.json"
            metadata = {
                "format": "safetensors",
                "original_format": "pytorch",
                "original_file": pth_path,
                "conversion_timestamp": time.time(),
                "model_info": {
                    "num_parameters": sum(p.numel() for p in state_dict.values()),
                    "parameter_shapes": {k: list(v.shape) for k, v in state_dict.items()}
                }
            }
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Successfully converted {pth_path} to {safetensors_path}")
            logger.info(f"Metadata saved to: {metadata_path}")
            
            return safetensors_path
            
        except Exception as e:
            logger.error(f"Error converting PyTorch model to SafeTensors: {e}")
            raise
    
    @staticmethod
    def safetensors_to_pth(safetensors_path: str, pth_path: Optional[str] = None) -> str:
        """
        Convert a SafeTensors file to PyTorch .pth format
        
        Args:
            safetensors_path: Path to the .safetensors file
            pth_path: Output path for .pth file (optional)
            
        Returns:
            Path to the created .pth file
        """
        try:
            if not os.path.exists(safetensors_path):
                raise FileNotFoundError(f"SafeTensors model file not found: {safetensors_path}")
            
            # Load SafeTensors model
            logger.info(f"Loading SafeTensors model from: {safetensors_path}")
            state_dict = load_file(safetensors_path)
            
            # Determine output path
            if pth_path is None:
                base_path = os.path.splitext(safetensors_path)[0]
                pth_path = f"{base_path}.pth"
            
            # Convert to PyTorch format
            logger.info(f"Converting to PyTorch format: {pth_path}")
            torch.save(state_dict, pth_path)
            
            logger.info(f"Successfully converted {safetensors_path} to {pth_path}")
            
            return pth_path
            
        except Exception as e:
            logger.error(f"Error converting SafeTensors model to PyTorch: {e}")
            raise
    
    @staticmethod
    def batch_convert_pth_to_safetensors(models_dir: str = "models") -> Dict[str, str]:
        """
        Convert all .pth files in a directory to .safetensors format
        
        Args:
            models_dir: Directory containing .pth files
            
        Returns:
            Dictionary mapping original .pth paths to converted .safetensors paths
        """
        converted_files = {}
        
        if not os.path.exists(models_dir):
            logger.warning(f"Models directory does not exist: {models_dir}")
            return converted_files
        
        for filename in os.listdir(models_dir):
            if filename.endswith('.pth'):
                pth_path = os.path.join(models_dir, filename)
                try:
                    safetensors_path = ModelConverter.pth_to_safetensors(pth_path)
                    converted_files[pth_path] = safetensors_path
                except Exception as e:
                    logger.error(f"Failed to convert {pth_path}: {e}")
        
        logger.info(f"Batch conversion completed. Converted {len(converted_files)} files.")
        return converted_files
    
    @staticmethod
    def get_model_info(model_path: str) -> Dict[str, Any]:
        """
        Get information about a model file (supports both .pth and .safetensors)
        
        Args:
            model_path: Path to the model file
            
        Returns:
            Dictionary containing model information
        """
        try:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            file_size = os.path.getsize(model_path)
            file_ext = os.path.splitext(model_path)[1].lower()
            
            info = {
                "path": model_path,
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "format": "unknown",
                "loadable": False
            }
            
            if file_ext == '.pth':
                info["format"] = "pytorch"
                try:
                    state_dict = torch.load(model_path, map_location='cpu')
                    info["loadable"] = True
                    info["num_parameters"] = sum(p.numel() for p in state_dict.values())
                    info["parameter_shapes"] = {k: list(v.shape) for k, v in state_dict.items()}
                except Exception as e:
                    logger.warning(f"Could not load PyTorch model {model_path}: {e}")
                    
            elif file_ext == '.safetensors':
                info["format"] = "safetensors"
                try:
                    state_dict = load_file(model_path)
                    info["loadable"] = True
                    info["num_parameters"] = sum(p.numel() for p in state_dict.values())
                    info["parameter_shapes"] = {k: list(v.shape) for k, v in state_dict.items()}
                except Exception as e:
                    logger.warning(f"Could not load SafeTensors model {model_path}: {e}")
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting model info for {model_path}: {e}")
            return {"path": model_path, "error": str(e)}
    
    @staticmethod
    def cleanup_old_pth_files(models_dir: str = "models", keep_safetensors: bool = True) -> int:
        """
        Remove .pth files after successful conversion to .safetensors
        
        Args:
            models_dir: Directory containing model files
            keep_safetensors: Whether to keep .safetensors files
            
        Returns:
            Number of files removed
        """
        removed_count = 0
        
        if not os.path.exists(models_dir):
            return removed_count
        
        for filename in os.listdir(models_dir):
            if filename.endswith('.pth'):
                pth_path = os.path.join(models_dir, filename)
                base_path = os.path.splitext(pth_path)[0]
                safetensors_path = f"{base_path}.safetensors"
                
                # Check if corresponding .safetensors file exists
                if os.path.exists(safetensors_path):
                    try:
                        # Verify both files are loadable
                        pth_info = ModelConverter.get_model_info(pth_path)
                        safetensors_info = ModelConverter.get_model_info(safetensors_path)
                        
                        if pth_info.get("loadable") and safetensors_info.get("loadable"):
                            # Remove .pth file
                            os.remove(pth_path)
                            removed_count += 1
                            logger.info(f"Removed {pth_path} (safetensors version exists)")
                        else:
                            logger.warning(f"Keeping {pth_path} (conversion verification failed)")
                    except Exception as e:
                        logger.error(f"Error during cleanup of {pth_path}: {e}")
        
        logger.info(f"Cleanup completed. Removed {removed_count} .pth files.")
        return removed_count

# Convenience functions
def convert_pth_to_safetensors(pth_path: str, safetensors_path: Optional[str] = None) -> str:
    """Convert a PyTorch .pth file to SafeTensors format"""
    return ModelConverter.pth_to_safetensors(pth_path, safetensors_path)

def convert_safetensors_to_pth(safetensors_path: str, pth_path: Optional[str] = None) -> str:
    """Convert a SafeTensors file to PyTorch .pth format"""
    return ModelConverter.safetensors_to_pth(safetensors_path, pth_path)

def batch_convert_models(models_dir: str = "models") -> Dict[str, str]:
    """Convert all .pth files in a directory to .safetensors format"""
    return ModelConverter.batch_convert_pth_to_safetensors(models_dir)

def get_model_info(model_path: str) -> Dict[str, Any]:
    """Get information about a model file"""
    return ModelConverter.get_model_info(model_path)
