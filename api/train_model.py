import os
import json
import time
import argparse
import itertools
import torch
import torch.nn as nn
import torch.optim as optim
import torchvision.transforms as transforms
from torch.utils.data import DataLoader, random_split
from pet_classifier import PetClassifier, PetDataset
from model_metadata import register_model
import optuna
from optuna.samplers import TPESampler
from datetime import datetime
import json
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
import logging
from torch.optim.lr_scheduler import ReduceLROnPlateau, CosineAnnealingLR, StepLR
from torch.utils.tensorboard import SummaryWriter
import optuna
from optuna.samplers import TPESampler
import itertools

def format_time(seconds):
    """Format time in seconds to human readable format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def setup_logging(log_dir):
    """Setup logging configuration"""
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / 'training.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def log_training_stats(epoch, total_epochs, train_loss, val_loss, val_accuracy, 
                      train_accuracy=None, learning_rate=None, time_elapsed=None, logger=None):
    """Log training statistics in a formatted way"""
    print("=" * 80)
    print(f"Epoch {epoch}/{total_epochs}")
    print("-" * 40)
    
    if learning_rate:
        print(f"Learning Rate: {learning_rate:.6f}")
    
    print(f"Training Loss: {train_loss:.4f}")
    if train_accuracy:
        print(f"Training Accuracy: {train_accuracy:.2f}%")
    
    print(f"Validation Loss: {val_loss:.4f}")
    print(f"Validation Accuracy: {val_accuracy:.2f}%")
    
    if time_elapsed:
        print(f"Time Elapsed: {format_time(time_elapsed)}")
    
    print("=" * 80)
    
    if logger:
        logger.info(f"Epoch {epoch}/{total_epochs} - Train Loss: {train_loss:.4f}, "
                   f"Val Loss: {val_loss:.4f}, Val Acc: {val_accuracy:.2f}%")

def train_pet_classifier(data_dir: str, model_save_path: str = "models/pet_model.pth", 
                        batch_size: int = 32, epochs: int = 10, learning_rate: float = 0.001,
                        log_interval: int = 10, model_type: str = "resnet",
                        scheduler_type: str = "cosine", weight_decay: float = 1e-4,
                        dropout_rate: float = 0.5, early_stopping_patience: int = 10):
    """
    Train the pet classifier on Oxford-IIIT Pet dataset with detailed logging
    
    Args:
        data_dir: Path to Oxford-IIIT Pet dataset
        model_save_path: Path to save the trained model
        batch_size: Batch size for training
        epochs: Number of training epochs
        learning_rate: Learning rate for optimization
        log_interval: How often to log batch progress
    """
    
    print("🚀 Starting Pet Classification Model Training")
    print("=" * 80)
    print(f"Dataset Path: {data_dir}")
    print(f"Model Save Path: {model_save_path}")
    print(f"Model Type: {model_type.upper()}")
    print(f"Batch Size: {batch_size}")
    print(f"Epochs: {epochs}")
    print(f"Learning Rate: {learning_rate}")
    print(f"Scheduler: {scheduler_type}")
    print(f"Weight Decay: {weight_decay}")
    print(f"Dropout Rate: {dropout_rate}")
    print(f"Early Stopping Patience: {early_stopping_patience}")
    print(f"Device: {torch.device('cuda' if torch.cuda.is_available() else 'cpu')}")
    print("=" * 80)
    
    # Define image transformations for training
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Load dataset
    print("\n📊 Loading dataset...")
    start_time = time.time()
    
    try:
        full_dataset = PetDataset(os.path.join(data_dir, "images"), transform=train_transform)
        print(f"✅ Dataset loaded successfully!")
        print(f"   - Total images: {len(full_dataset)}")
        
        # Split dataset into train and validation
        train_size = int(0.8 * len(full_dataset))
        val_size = len(full_dataset) - train_size
        train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
        
        # Update validation dataset transform
        val_dataset.dataset.transform = val_transform
        
        print(f"   - Training samples: {len(train_dataset)}")
        print(f"   - Validation samples: {len(val_dataset)}")
        
    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        return
    
    # Create data loaders
    print("\n🔄 Creating data loaders...")
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    print(f"   - Training batches per epoch: {len(train_loader)}")
    print(f"   - Validation batches per epoch: {len(val_loader)}")
    
    # Initialize classifier
    print("\n🤖 Initializing model...")
    classifier = PetClassifier(num_classes=37, model_type=model_type)
    print(f"   - Model architecture: {model_type.upper()} with transfer learning")
    print(f"   - Number of classes: {classifier.num_classes}")
    print(f"   - Device: {classifier.device}")
    
    # Training setup
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(
        classifier.model.fc.parameters(), 
        lr=learning_rate, 
        weight_decay=weight_decay
    )
    
    # Learning rate scheduler
    if scheduler_type == "cosine":
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs)
    elif scheduler_type == "plateau":
        scheduler = ReduceLROnPlateau(optimizer, mode='max', patience=5, factor=0.5)
    elif scheduler_type == "step":
        scheduler = StepLR(optimizer, step_size=5, gamma=0.1)
    else:
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs)
    
    # Training history
    training_history = {
        'epochs': [],
        'train_losses': [],
        'val_losses': [],
        'train_accuracies': [],
        'val_accuracies': [],
        'learning_rates': [],
        'hyperparameters': {
            'model_type': model_type,
            'batch_size': batch_size,
            'epochs': epochs,
            'learning_rate': learning_rate,
            'scheduler_type': scheduler_type,
            'weight_decay': weight_decay,
            'dropout_rate': dropout_rate,
            'early_stopping_patience': early_stopping_patience
        }
    }
    
    print("\n🎯 Starting training...")
    print("=" * 80)
    
    total_start_time = time.time()
    best_val_accuracy = 0.0
    patience_counter = 0
    early_stopped = False
    
    for epoch in range(epochs):
        epoch_start_time = time.time()
        
        # Training phase
        classifier.model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        print(f"\n📚 Epoch {epoch + 1}/{epochs} - Training")
        print("-" * 50)
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(classifier.device), target.to(classifier.device)
            
            optimizer.zero_grad()
            output = classifier.model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            
            # Calculate accuracy
            _, predicted = torch.max(output.data, 1)
            train_total += target.size(0)
            train_correct += (predicted == target).sum().item()
            
            # Log batch progress
            if (batch_idx + 1) % log_interval == 0:
                batch_accuracy = 100. * train_correct / train_total
                print(f"   Batch {batch_idx + 1}/{len(train_loader)} - "
                      f"Loss: {loss.item():.4f} - "
                      f"Accuracy: {batch_accuracy:.2f}%")
        
        # Calculate training metrics
        avg_train_loss = train_loss / len(train_loader)
        train_accuracy = 100. * train_correct / train_total
        
        # Validation phase
        print(f"\n🔍 Epoch {epoch + 1}/{epochs} - Validation")
        print("-" * 50)
        
        classifier.model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for batch_idx, (data, target) in enumerate(val_loader):
                data, target = data.to(classifier.device), target.to(classifier.device)
                output = classifier.model(data)
                val_loss += criterion(output, target).item()
                
                _, predicted = torch.max(output.data, 1)
                val_total += target.size(0)
                val_correct += (predicted == target).sum().item()
                
                if (batch_idx + 1) % log_interval == 0:
                    batch_accuracy = 100. * val_correct / val_total
                    print(f"   Batch {batch_idx + 1}/{len(val_loader)} - "
                          f"Loss: {val_loss/(batch_idx+1):.4f} - "
                          f"Accuracy: {batch_accuracy:.2f}%")
        
        # Calculate validation metrics
        avg_val_loss = val_loss / len(val_loader)
        val_accuracy = 100. * val_correct / val_total
        
        # Update learning rate
        current_lr = optimizer.param_groups[0]['lr']
        scheduler.step()
        
        # Calculate time
        epoch_time = time.time() - epoch_start_time
        total_time = time.time() - total_start_time
        
        # Log epoch statistics
        log_training_stats(
            epoch + 1, epochs, avg_train_loss, avg_val_loss, val_accuracy,
            train_accuracy, current_lr, epoch_time
        )
        
        # Save training history
        training_history['epochs'].append(epoch + 1)
        training_history['train_losses'].append(avg_train_loss)
        training_history['val_losses'].append(avg_val_loss)
        training_history['train_accuracies'].append(train_accuracy)
        training_history['val_accuracies'].append(val_accuracy)
        training_history['learning_rates'].append(current_lr)
        
        # Save best model
        if val_accuracy > best_val_accuracy:
            best_val_accuracy = val_accuracy
            classifier.save_model(f"{model_save_path}.best", format="safetensors")
            print(f"🏆 New best model saved! Validation accuracy: {best_val_accuracy:.2f}%")
        
        # Save checkpoint every 5 epochs
        if (epoch + 1) % 5 == 0:
            checkpoint_path = f"{model_save_path}.epoch_{epoch + 1}"
            classifier.save_model(checkpoint_path, format="safetensors")
            print(f"💾 Checkpoint saved: {checkpoint_path}")
    
    # Training completed
    total_time = time.time() - total_start_time
    print("\n" + "=" * 80)
    print("🎉 Training completed!")
    print("=" * 80)
    print(f"Total training time: {format_time(total_time)}")
    print(f"Best validation accuracy: {best_val_accuracy:.2f}%")
    print(f"Final training accuracy: {train_accuracy:.2f}%")
    print(f"Final validation accuracy: {val_accuracy:.2f}%")
    
    # Save final model
    classifier.save_model(model_save_path, format="safetensors")
    print(f"💾 Final model saved to: {model_save_path}")
    
    # Save training history
    history_path = f"{model_save_path}.history.json"
    with open(history_path, 'w') as f:
        json.dump(training_history, f, indent=2)
    print(f"📊 Training history saved to: {history_path}")
    
    # Register model with metadata
    try:
        training_info = {
            'epochs': epochs,
            'batch_size': batch_size,
            'learning_rate': learning_rate,
            'scheduler_type': scheduler_type,
            'weight_decay': weight_decay,
            'dropout_rate': dropout_rate,
            'use_cuda': torch.cuda.is_available()
        }
        
        performance_info = {
            'validation_accuracy': best_val_accuracy,
            'training_accuracy': train_accuracy,
            'validation_loss': val_loss,
            'training_loss': train_loss,
            'training_duration': total_time
        }
        
        dataset_info = {
            'name': 'Oxford-IIIT Pet Dataset',
            'size': len(full_dataset),
            'num_classes': 37,
            'class_names': classifier.class_names
        }
        
        metadata = register_model(
            model_path=model_save_path,
            model_type=model_type,
            training_info=training_info,
            performance_info=performance_info,
            dataset_info=dataset_info
        )
        
        print(f"📋 Model registered with metadata: {metadata.name}")
        
    except Exception as e:
        print(f"⚠️  Warning: Failed to register model metadata: {e}")
    
    # Register model with model manager
    from model_manager import model_manager
    import uuid
    
    model_id = f"{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
    final_metrics = {
        "best_val_accuracy": best_val_accuracy,
        "final_val_accuracy": val_accuracy,
        "final_train_accuracy": train_accuracy,
        "total_training_time": total_time,
        "total_epochs": epochs,
        "early_stopped": early_stopped
    }
    
    model_info = model_manager.register_model(
        model_id=model_id,
        model_type=model_type,
        hyperparameters=training_history['hyperparameters'],
        training_history=training_history,
        final_metrics=final_metrics
    )
    print(f"📋 Model registered with ID: {model_id}")
    
    # Print final statistics
    print("\n📈 Final Training Statistics:")
    print("-" * 40)
    print(f"Total epochs: {epochs}")
    print(f"Total training samples: {len(train_dataset)}")
    print(f"Total validation samples: {len(val_dataset)}")
    print(f"Batch size: {batch_size}")
    print(f"Initial learning rate: {learning_rate}")
    print(f"Final learning rate: {current_lr}")
    print(f"Best validation accuracy: {best_val_accuracy:.2f}%")
    print(f"Model ID: {model_id}")
    print("=" * 80)

def hyperparameter_tuning(data_dir: str, model_type: str = "resnet", n_trials: int = 20):
    """Perform hyperparameter tuning using Optuna"""
    def objective(trial):
        # Define hyperparameter search space
        lr = trial.suggest_float('learning_rate', 1e-5, 1e-2, log=True)
        batch_size = trial.suggest_categorical('batch_size', [16, 32, 64])
        weight_decay = trial.suggest_float('weight_decay', 1e-6, 1e-3, log=True)
        dropout_rate = trial.suggest_float('dropout_rate', 0.1, 0.7)
        scheduler_type = trial.suggest_categorical('scheduler_type', ['cosine', 'plateau', 'step'])
        
        # Train model with suggested hyperparameters
        model_path = f"models/trial_{trial.number}.pth"
        
        try:
            train_pet_classifier(
                data_dir=data_dir,
                model_save_path=model_path,
                batch_size=batch_size,
                epochs=5,  # Reduced epochs for tuning
                learning_rate=lr,
                log_interval=50,
                model_type=model_type,
                scheduler_type=scheduler_type,
                weight_decay=weight_decay,
                dropout_rate=dropout_rate,
                early_stopping_patience=3
            )
            
            # Get the best validation accuracy from training
            from model_manager import model_manager
            models = model_manager.get_all_models()
            latest_model = max(models.keys(), key=lambda k: models[k]['created_at'])
            best_accuracy = models[latest_model]['final_metrics']['best_val_accuracy']
            
            return best_accuracy
            
        except Exception as e:
            print(f"Trial failed: {e}")
            return 0.0
    
    # Create study
    study = optuna.create_study(
        direction='maximize',
        sampler=TPESampler(seed=42)
    )
    
    print(f"🔍 Starting hyperparameter tuning for {model_type} model...")
    print(f"Number of trials: {n_trials}")
    
    study.optimize(objective, n_trials=n_trials)
    
    print("🎯 Best trial:")
    trial = study.best_trial
    print(f"  Value: {trial.value:.2f}%")
    print("  Params:")
    for key, value in trial.params.items():
        print(f"    {key}: {value}")
    
    return study

def grid_search_tuning(data_dir: str, model_type: str = "resnet"):
    """Perform grid search hyperparameter tuning"""
    param_grid = {
        'learning_rate': [0.001, 0.0005, 0.0001],
        'batch_size': [16, 32, 64],
        'weight_decay': [1e-4, 1e-5],
        'scheduler_type': ['cosine', 'plateau']
    }
    
    best_accuracy = 0.0
    best_params = {}
    
    # Generate all combinations
    param_combinations = [dict(zip(param_grid.keys(), v)) for v in itertools.product(*param_grid.values())]
    
    print(f"🔍 Starting grid search for {model_type} model...")
    print(f"Total combinations: {len(param_combinations)}")
    
    for i, params in enumerate(param_combinations):
        print(f"\nTrial {i+1}/{len(param_combinations)}")
        print(f"Parameters: {params}")
        
        model_path = f"models/grid_search_{i}.pth"
        
        try:
            train_pet_classifier(
                data_dir=data_dir,
                model_save_path=model_path,
                batch_size=params['batch_size'],
                epochs=5,  # Reduced epochs for tuning
                learning_rate=params['learning_rate'],
                log_interval=50,
                model_type=model_type,
                scheduler_type=params['scheduler_type'],
                weight_decay=params['weight_decay'],
                dropout_rate=0.5,
                early_stopping_patience=3
            )
            
            # Get the best validation accuracy
            from model_manager import model_manager
            models = model_manager.get_all_models()
            latest_model = max(models.keys(), key=lambda k: models[k]['created_at'])
            accuracy = models[latest_model]['final_metrics']['best_val_accuracy']
            
            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_params = params
                print(f"🏆 New best accuracy: {accuracy:.2f}%")
            
        except Exception as e:
            print(f"Trial failed: {e}")
    
    print(f"\n🎯 Grid search completed!")
    print(f"Best accuracy: {best_accuracy:.2f}%")
    print(f"Best parameters: {best_params}")
    
    return best_params, best_accuracy

def main():
    parser = argparse.ArgumentParser(description='Train Pet Classifier with Detailed Logging and Hyperparameter Tuning')
    parser.add_argument('--data_dir', type=str, default='/Users/davidagustin/Downloads/oxford-iiit-pet',
                       help='Path to Oxford-IIIT Pet dataset')
    parser.add_argument('--model_path', type=str, default='pet_model.pth',
                       help='Path to save the trained model')
    parser.add_argument('--batch_size', type=int, default=32,
                       help='Batch size for training')
    parser.add_argument('--epochs', type=int, default=10,
                       help='Number of training epochs')
    parser.add_argument('--lr', type=float, default=0.001,
                       help='Learning rate')
    parser.add_argument('--log_interval', type=int, default=10,
                       help='How often to log batch progress')
    parser.add_argument('--model_type', type=str, default='resnet',
                       choices=['resnet', 'alexnet', 'mobilenet'],
                       help='Type of model to train')
    parser.add_argument('--tune', action='store_true',
                       help='Perform hyperparameter tuning')
    parser.add_argument('--tuning_method', type=str, default='optuna',
                       choices=['optuna', 'grid_search'],
                       help='Hyperparameter tuning method')
    parser.add_argument('--n_trials', type=int, default=20,
                       help='Number of trials for Optuna tuning')
    
    args = parser.parse_args()
    
    # Check if dataset exists
    if not os.path.exists(args.data_dir):
        print(f"❌ Error: Dataset directory {args.data_dir} does not exist!")
        return
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(args.model_path) if os.path.dirname(args.model_path) else '.', exist_ok=True)
    
    if args.tune:
        # Perform hyperparameter tuning
        if args.tuning_method == 'optuna':
            study = hyperparameter_tuning(args.data_dir, args.model_type, args.n_trials)
            best_params = study.best_trial.params
        else:
            best_params, _ = grid_search_tuning(args.data_dir, args.model_type)
        
        # Train final model with best parameters
        print(f"\n🚀 Training final model with best parameters...")
        train_pet_classifier(
            data_dir=args.data_dir,
            model_save_path=args.model_path,
            batch_size=best_params.get('batch_size', args.batch_size),
            epochs=args.epochs,
            learning_rate=best_params.get('learning_rate', args.lr),
            log_interval=args.log_interval,
            model_type=args.model_type,
            scheduler_type=best_params.get('scheduler_type', 'cosine'),
            weight_decay=best_params.get('weight_decay', 1e-4),
            dropout_rate=best_params.get('dropout_rate', 0.5),
            early_stopping_patience=10
        )
    else:
        # Train the model with default parameters
        train_pet_classifier(
            data_dir=args.data_dir,
            model_save_path=args.model_path,
            batch_size=args.batch_size,
            epochs=args.epochs,
            learning_rate=args.lr,
            log_interval=args.log_interval,
            model_type=args.model_type
        )

if __name__ == "__main__":
    main()
