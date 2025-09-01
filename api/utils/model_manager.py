import os
import json
import torch
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import matplotlib.pyplot as plt
import numpy as np

class ModelManager:
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.metadata_file = self.models_dir / "models_metadata.json"
        self.load_metadata()
    
    def load_metadata(self):
        """Load existing model metadata"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {}
    
    def save_metadata(self):
        """Save model metadata"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def register_model(self, model_id: str, model_type: str, hyperparameters: Dict, 
                      training_history: Dict, final_metrics: Dict):
        """Register a new trained model"""
        model_info = {
            "model_id": model_id,
            "model_type": model_type,
            "created_at": datetime.now().isoformat(),
            "hyperparameters": hyperparameters,
            "training_history": training_history,
            "final_metrics": final_metrics,
            "model_path": f"models/{model_id}.pth",
            "history_path": f"models/{model_id}_history.json",
            "plots_path": f"models/{model_id}_plots.png"
        }
        
        self.metadata[model_id] = model_info
        self.save_metadata()
        
        # Save training history
        history_path = self.models_dir / f"{model_id}_history.json"
        with open(history_path, 'w') as f:
            json.dump(training_history, f, indent=2)
        
        # Generate and save plots
        self.generate_training_plots(model_id, training_history)
        
        return model_info
    
    def generate_training_plots(self, model_id: str, training_history: Dict):
        """Generate training plots for the model"""
        epochs = training_history.get('epochs', [])
        train_losses = training_history.get('train_losses', [])
        val_losses = training_history.get('val_losses', [])
        train_accuracies = training_history.get('train_accuracies', [])
        val_accuracies = training_history.get('val_accuracies', [])
        learning_rates = training_history.get('learning_rates', [])
        
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        
        # Loss plot
        ax1.plot(epochs, train_losses, label='Training Loss', color='blue')
        ax1.plot(epochs, val_losses, label='Validation Loss', color='red')
        ax1.set_title('Training and Validation Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.legend()
        ax1.grid(True)
        
        # Accuracy plot
        ax2.plot(epochs, train_accuracies, label='Training Accuracy', color='blue')
        ax2.plot(epochs, val_accuracies, label='Validation Accuracy', color='red')
        ax2.set_title('Training and Validation Accuracy')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Accuracy (%)')
        ax2.legend()
        ax2.grid(True)
        
        # Learning rate plot
        ax3.plot(epochs, learning_rates, color='green')
        ax3.set_title('Learning Rate Schedule')
        ax3.set_xlabel('Epoch')
        ax3.set_ylabel('Learning Rate')
        ax3.grid(True)
        
        # Loss vs Accuracy
        ax4.scatter(val_losses, val_accuracies, alpha=0.6, color='purple')
        ax4.set_title('Validation Loss vs Accuracy')
        ax4.set_xlabel('Validation Loss')
        ax4.set_ylabel('Validation Accuracy (%)')
        ax4.grid(True)
        
        plt.tight_layout()
        plot_path = self.models_dir / f"{model_id}_plots.png"
        plt.savefig(plot_path, dpi=300, bbox_inches='tight')
        plt.close()
    
    def get_model_info(self, model_id: str) -> Optional[Dict]:
        """Get information about a specific model"""
        return self.metadata.get(model_id)
    
    def get_all_models(self) -> Dict[str, Dict]:
        """Get all registered models"""
        return self.metadata
    
    def delete_model(self, model_id: str) -> bool:
        """Delete a model and its metadata"""
        if model_id in self.metadata:
            model_info = self.metadata[model_id]
            
            # Delete model files
            model_path = self.models_dir / f"{model_id}.pth"
            history_path = self.models_dir / f"{model_id}_history.json"
            plots_path = self.models_dir / f"{model_id}_plots.png"
            
            for file_path in [model_path, history_path, plots_path]:
                if file_path.exists():
                    file_path.unlink()
            
            # Remove from metadata
            del self.metadata[model_id]
            self.save_metadata()
            return True
        return False
    
    def get_model_performance_summary(self, model_id: str) -> Dict:
        """Get performance summary for a model"""
        model_info = self.get_model_info(model_id)
        if not model_info:
            return {}
        
        training_history = model_info.get('training_history', {})
        final_metrics = model_info.get('final_metrics', {})
        
        return {
            "model_id": model_id,
            "model_type": model_info.get('model_type'),
            "created_at": model_info.get('created_at'),
            "best_val_accuracy": max(training_history.get('val_accuracies', [0])),
            "final_val_accuracy": training_history.get('val_accuracies', [0])[-1] if training_history.get('val_accuracies') else 0,
            "best_val_loss": min(training_history.get('val_losses', [float('inf')])),
            "final_val_loss": training_history.get('val_losses', [float('inf')])[-1] if training_history.get('val_losses') else float('inf'),
            "total_epochs": len(training_history.get('epochs', [])),
            "hyperparameters": model_info.get('hyperparameters', {}),
            "final_metrics": final_metrics
        }
    
    def compare_models(self, model_ids: List[str]) -> Dict:
        """Compare multiple models"""
        comparison = {
            "models": {},
            "summary": {}
        }
        
        for model_id in model_ids:
            performance = self.get_model_performance_summary(model_id)
            if performance:
                comparison["models"][model_id] = performance
        
        # Create summary statistics
        if comparison["models"]:
            accuracies = [m["best_val_accuracy"] for m in comparison["models"].values()]
            losses = [m["best_val_loss"] for m in comparison["models"].values()]
            
            comparison["summary"] = {
                "best_accuracy": max(accuracies),
                "worst_accuracy": min(accuracies),
                "avg_accuracy": np.mean(accuracies),
                "best_loss": min(losses),
                "worst_loss": max(losses),
                "avg_loss": np.mean(losses)
            }
        
        return comparison

# Global model manager instance
model_manager = ModelManager()
