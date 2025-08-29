from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import threading
import time
from datetime import datetime
from werkzeug.utils import secure_filename
import hashlib
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('../.env.local')

from pet_classifier import PetClassifier
from train_model import train_pet_classifier
from model_manager import ModelManager
from pet_segmentation import get_segmentation_model
from model_metadata import get_all_models, get_model_metadata, get_model_stats, update_model_usage
from database_game import database_game_manager
from validation import APIValidator, ValidationError as ValidatorError
from error_handler import (
    error_handler, validate_content_type, validate_json_size, require_fields,
    register_error_handlers, log_model_usage, APIError, ValidationError,
    AuthenticationError, SecurityError, logger
)
import asyncio

app = Flask(__name__)

# Configure CORS with environment-based origins
allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, 
     origins=allowed_origins,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
     supports_credentials=True,
     expose_headers=["Content-Range", "X-Content-Range"])

# Register error handlers
register_error_handlers(app)

@app.route('/api/health', methods=['GET'])
@error_handler
def health_check():
    """Health check endpoint with comprehensive status"""
    try:
        # Check database connectivity (if available)
        db_status = 'unknown'
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            try:
                import requests
                response = requests.get(
                    f'{SUPABASE_URL}/rest/v1/',
                    headers={'apikey': SUPABASE_SERVICE_ROLE_KEY},
                    timeout=5
                )
                db_status = 'connected' if response.status_code == 200 else 'error'
            except Exception:
                db_status = 'error'
        
        # Check model availability
        model_status = 'available' if os.path.exists('../models') else 'unavailable'
        
        return jsonify({
            'status': 'healthy',
            'message': 'Pet Detective API is running',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'components': {
                'database': db_status,
                'models': model_status,
                'classifiers_loaded': len(classifiers)
            }
        })
    except Exception as e:
        raise APIError(f"Health check failed: {str(e)}")

# Initialize model manager
model_manager = ModelManager()

# Global classifiers dictionary for multiple models
classifiers = {}

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Create models directory if it doesn't exist
os.makedirs('../models', exist_ok=True)

def scan_models_directory():
    """Scan models directory for available trained models"""
    available_models = {}
    
    # Debug: Print current working directory and models path
    print(f"Current working directory: {os.getcwd()}")
    models_path = '../models'
    print(f"Looking for models in: {os.path.abspath(models_path)}")
    print(f"Models directory exists: {os.path.exists(models_path)}")
    if os.path.exists(models_path):
        print(f"Files in models directory: {os.listdir(models_path)}")
    
    model_types = {
        'resnet': {
            'name': 'ResNet-50',
            'description': 'Deep residual network with 50 layers',
            'architecture': 'ResNet-50',
            'parameters': '25.6M',
            'accuracy': '95%+',
            'speed': 'Medium',
            'strengths': ['High accuracy', 'Good generalization'],
            'weaknesses': ['Slower inference', 'Larger model size']
        },
        'alexnet': {
            'name': 'AlexNet',
            'description': 'Classic CNN architecture',
            'architecture': 'AlexNet',
            'parameters': '61M',
            'accuracy': '90%+',
            'speed': 'Fast',
            'strengths': ['Fast inference', 'Proven architecture'],
            'weaknesses': ['Lower accuracy', 'Older architecture']
        },
        'mobilenet': {
            'name': 'MobileNet V2',
            'description': 'Lightweight mobile-optimized network',
            'architecture': 'MobileNet V2',
            'parameters': '3.5M',
            'accuracy': '92%+',
            'speed': 'Very Fast',
            'strengths': ['Fast inference', 'Small model size'],
            'weaknesses': ['Slightly lower accuracy']
        }
    }
    
    if os.path.exists(models_path):
        for filename in os.listdir(models_path):
            if (filename.endswith(('.pth', '.safetensors')) or '.safetensors.' in filename) and not filename.endswith('.json'):
                filepath = os.path.join(models_path, filename)
                stat = os.stat(filepath)
                
                # Try to determine model type from filename
                model_type = 'unknown'
                if 'resnet' in filename.lower():
                    model_type = 'resnet'
                elif 'alexnet' in filename.lower():
                    model_type = 'alexnet'
                elif 'mobilenet' in filename.lower():
                    model_type = 'mobilenet'
                
                # Determine format
                file_format = 'safetensors' if ('.safetensors' in filename) else 'pytorch'
                
                # Try to load metadata from JSON file if it exists
                json_filename = f"{filename}.json"
                json_filepath = os.path.join(models_path, json_filename)
                metadata = None
                if os.path.exists(json_filepath):
                    try:
                        with open(json_filepath, 'r') as f:
                            metadata = json.load(f)
                    except Exception as e:
                        print(f"Warning: Could not load metadata for {filename}: {e}")
                
                model_info = {
                    'name': filename,
                    'type': model_type,
                    'format': file_format,
                    'path': filepath,
                    'size_mb': round(stat.st_size / (1024 * 1024), 2),
                    'created': int(stat.st_ctime),
                    'modified': int(stat.st_mtime),
                    'has_metadata': metadata is not None
                }
                
                # Add metadata if available
                if metadata and 'model_info' in metadata:
                    model_info.update({
                        'accuracy': metadata['model_info'].get('performance_metrics', {}).get('accuracy', 'Unknown'),
                        'training_epochs': metadata['model_info'].get('training_info', {}).get('epochs_trained', 'Unknown'),
                        'description': metadata['model_info'].get('description', 'No description available'),
                        'version': metadata['model_info'].get('version', 'Unknown')
                    })
                else:
                    model_info.update({
                        'accuracy': 'Unknown',
                        'training_epochs': 'Unknown', 
                        'description': 'No metadata available',
                        'version': 'Unknown'
                    })
                
                available_models[filename] = model_info
    
    return available_models, model_types

@app.route('/api/predict', methods=['POST'])
@error_handler
@validate_content_type(['multipart/form-data'])
def predict():
    """Predict pet breed from uploaded image with comprehensive validation"""
    temp_path = None
    
    try:
        # Validate image file
        if 'image' not in request.files:
            raise ValidationError('No image file provided in request')
        
        file = request.files['image']
        if not file or not file.filename:
            raise ValidationError('No file selected')
        
        # Validate and sanitize inputs
        filename, file_content = APIValidator.validate_image_file(file)
        model_type = APIValidator.validate_model_type(request.form.get('model_type', 'resnet'))
        model_name = None
        if request.form.get('model_name'):
            model_name = APIValidator.sanitize_string(request.form.get('model_name'), max_length=100)
        
        # Generate secure temporary filename
        temp_path = APIValidator.generate_secure_filename(filename)
        
        # Save file with validated content
        with open(temp_path, 'wb') as f:
            f.write(file_content)
        
        # Get or create classifier
        model_key = f"{model_type}_{model_name}" if model_name else model_type
        if model_key not in classifiers:
            model_path = None
            if model_name:
                model_path = os.path.join('models', model_name)
                if not os.path.exists(model_path):
                    raise ValidationError(f'Model not found: {model_name}')
            else:
                # Use the existing safetensors model by default
                default_model_path = os.path.join('..', 'models', 'resnet_model.safetensors')
                if os.path.exists(default_model_path):
                    model_path = default_model_path
            
            try:
                classifiers[model_key] = PetClassifier(model_type=model_type, model_path=model_path)
            except Exception as e:
                raise APIError(f'Failed to load model: {model_type}')
        
        classifier = classifiers[model_key]
        
        # Make prediction with error handling
        try:
            predictions = classifier.predict(temp_path)
        except Exception as e:
            raise APIError('Prediction failed - invalid image or model error')
        
        # Log model usage
        log_model_usage(model_type, model_name, 'prediction')
        
        # Validate prediction results
        if not predictions or not isinstance(predictions, dict):
            raise APIError('Invalid prediction results')
        
        logger.info(f"Successful prediction: {model_type} model")
        return jsonify(predictions)
        
    finally:
        # Always clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file {temp_path}: {e}")

@app.route('/api/game/start', methods=['POST'])
@error_handler
@validate_content_type(['application/json'])
@validate_json_size()
def start_game():
    """Start a new pet guessing game with validation"""
    try:
        data = request.get_json()
        if not data:
            raise ValidationError('Empty JSON payload')
        
        # Validate and sanitize inputs
        model_type = APIValidator.validate_model_type(data.get('model_type', 'resnet'))
        game_mode = APIValidator.validate_game_mode(data.get('game_mode', 'medium'))
        animal_type = APIValidator.validate_animal_type(data.get('animal_type'))
        
        model_name = None
        if data.get('model_name'):
            model_name = APIValidator.sanitize_string(data.get('model_name'), max_length=100)
        
        # Try to use database-driven game first
        try:
            # Create a new event loop for the async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            game_data = loop.run_until_complete(
                database_game_manager.generate_game_question(game_mode=game_mode, animal_type=animal_type)
            )
            loop.close()
            
            # Add AI prediction using the classifier if we have one
            model_key = f"{model_type}_{model_name}" if model_name else model_type
            if model_key in classifiers:
                classifier = classifiers[model_key]
                # Note: We can't easily predict from URL, so we'll trust the database
                # In production, you might want to download and predict
                pass
            
            return jsonify(game_data)
            
        except Exception as db_error:
            print(f"Database game generation failed: {db_error}")
            # Fall back to old filesystem-based method
            
            # Get or create classifier with default safetensors model
            model_key = f"{model_type}_{model_name}" if model_name else model_type
            if model_key not in classifiers:
                model_path = None
                if model_name:
                    model_path = os.path.join('models', model_name)
                else:
                    # Use the existing safetensors model by default
                    default_model_path = os.path.join('..', 'models', 'resnet_model.safetensors')
                    if os.path.exists(default_model_path):
                        model_path = default_model_path
                
                classifiers[model_key] = PetClassifier(model_type=model_type, model_path=model_path)
            
            classifier = classifiers[model_key]
            
            # Generate game question using old method
            game_data = classifier.generate_game_question(game_mode=game_mode)
        
        # Add caching headers for game data
        response = jsonify(game_data)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game/check', methods=['POST'])
@error_handler
@validate_content_type(['application/json'])
@validate_json_size()
@require_fields('user_answer', 'correct_answer', 'user_id')
def check_answer():
    """Check game answer with comprehensive validation"""
    try:
        data = request.get_json()
        
        # Validate and sanitize score data
        validated_data = APIValidator.validate_score_data(data)
        
        user_answer = validated_data['user_answer']
        correct_answer = validated_data['correct_answer']
        user_id = validated_data['user_id']
        username = validated_data.get('username')
        model_type = validated_data.get('model_type', 'resnet')
        model_name = validated_data.get('model_name')
        game_mode = validated_data.get('game_mode', 'medium')
        time_taken = validated_data.get('time_taken', 0)
        
        is_correct = user_answer.lower() == correct_answer.lower()
        
        # Save score to Supabase if user is authenticated
        if user_id and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            try:
                import requests
                
                score_data = {
                    'user_id': user_id,
                    'username': username,
                    'score': 10 if is_correct else 0,
                    'is_correct': is_correct,
                    'model_type': model_type,
                    'model_name': model_name,
                    'game_mode': game_mode,
                    'time_taken': time_taken,
                    'created_at': datetime.utcnow().isoformat()
                }
                
                headers = {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
                    'Content-Type': 'application/json'
                }
                
                response = requests.post(
                    f'{SUPABASE_URL}/rest/v1/leaderboard',
                    headers=headers,
                    json=score_data
                )
                
                if response.status_code != 201:
                    print(f"Failed to save score: {response.text}")
            
            except Exception as e:
                print(f"Error saving score to Supabase: {e}")
        
        return jsonify({
            'is_correct': is_correct,
            'correct_answer': correct_answer,
            'time_taken': time_taken
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    try:
        data = request.get_json()
        
        # Generate unique model name
        timestamp = int(time.time())
        model_type = data.get('model_type', 'resnet')
        model_name = f"{model_type}_model_{timestamp}.pth"
        model_path = os.path.join('models', model_name)
        
        # Start training in background thread
        def train_thread():
            try:
                train_pet_classifier(
                    model_type=data.get('model_type', 'resnet'),
                    epochs=data.get('epochs', 5),
                    batch_size=data.get('batch_size', 32),
                    learning_rate=data.get('learning_rate', 0.001),
                    scheduler_type=data.get('scheduler_type', 'cosine'),
                    weight_decay=data.get('weight_decay', 1e-4),
                    dropout_rate=data.get('dropout_rate', 0.5),
                    early_stopping_patience=data.get('early_stopping_patience', 5),
                    enable_tuning=data.get('enable_tuning', False),
                    tuning_method=data.get('tuning_method', 'optuna'),
                    n_trials=data.get('n_trials', 10),
                    model_path=model_path,
                    model_manager=model_manager
                )
            except Exception as e:
                print(f"Training error: {e}")
        
        thread = threading.Thread(target=train_thread)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'message': 'Training started',
            'model_name': model_name,
            'model_path': model_path
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/segment', methods=['POST'])
def segment_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded image temporarily
        filename = secure_filename(file.filename)
        temp_path = f'temp_seg_{int(time.time())}_{filename}'
        file.save(temp_path)
        
        try:
            # Get segmentation model
            segmentation_model = get_segmentation_model()
            
            # Process image
            result = segmentation_model.segment_and_encode(temp_path)
            
            return jsonify(result)
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/available', methods=['GET'])
def get_available_models():
    try:
        available_models, model_types = scan_models_directory()
        
        return jsonify({
            'available_models': available_models,
            'model_types': model_types
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/metadata', methods=['GET'])
def get_models_metadata():
    """Get detailed metadata for all models"""
    try:
        models = get_all_models()
        metadata_list = []
        
        for model in models:
            metadata_dict = {
                'name': model.name,
                'file_path': model.file_path,
                'format': model.format,
                'model_type': model.model_type,
                'file_size_mb': model.file_size_mb,
                'num_parameters': model.num_parameters,
                'validation_accuracy': model.validation_accuracy,
                'training_accuracy': model.training_accuracy,
                'training_epochs': model.training_epochs,
                'learning_rate': model.learning_rate,
                'optimizer': model.optimizer,
                'scheduler': model.scheduler,
                'weight_decay': model.weight_decay,
                'dropout_rate': model.dropout_rate,
                'training_duration_seconds': model.training_duration_seconds,
                'device_used': model.device_used,
                'hyperparameter_tuning': model.hyperparameter_tuning,
                'tuning_method': model.tuning_method,
                'usage_count': model.usage_count,
                'last_used': model.last_used,
                'average_inference_time': model.average_inference_time,
                'created_timestamp': model.created_timestamp,
                'modified_timestamp': model.modified_timestamp,
                'file_hash': model.file_hash,
                'is_active': model.is_active,
                'is_public': model.is_public
            }
            metadata_list.append(metadata_dict)
        
        return jsonify({
            'models': metadata_list,
            'total_count': len(metadata_list)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/metadata/<model_name>', methods=['GET'])
def get_model_metadata_endpoint(model_name):
    """Get detailed metadata for a specific model"""
    try:
        metadata = get_model_metadata(model_name)
        if not metadata:
            return jsonify({'error': 'Model not found'}), 404
        
        metadata_dict = {
            'name': metadata.name,
            'file_path': metadata.file_path,
            'format': metadata.format,
            'model_type': metadata.model_type,
            'file_size_mb': metadata.file_size_mb,
            'num_parameters': metadata.num_parameters,
            'validation_accuracy': metadata.validation_accuracy,
            'training_accuracy': metadata.training_accuracy,
            'training_epochs': metadata.training_epochs,
            'learning_rate': metadata.learning_rate,
            'optimizer': metadata.optimizer,
            'scheduler': metadata.scheduler,
            'weight_decay': metadata.weight_decay,
            'dropout_rate': metadata.dropout_rate,
            'training_duration_seconds': metadata.training_duration_seconds,
            'device_used': metadata.device_used,
            'hyperparameter_tuning': metadata.hyperparameter_tuning,
            'tuning_method': metadata.tuning_method,
            'best_hyperparameters': metadata.best_hyperparameters,
            'usage_count': metadata.usage_count,
            'last_used': metadata.last_used,
            'average_inference_time': metadata.average_inference_time,
            'created_timestamp': metadata.created_timestamp,
            'modified_timestamp': metadata.modified_timestamp,
            'file_hash': metadata.file_hash,
            'description': metadata.description,
            'tags': metadata.tags,
            'version': metadata.version,
            'author': metadata.author,
            'is_active': metadata.is_active,
            'is_public': metadata.is_public,
            'requires_auth': metadata.requires_auth
        }
        
        return jsonify(metadata_dict)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/stats', methods=['GET'])
def get_models_stats():
    """Get overall statistics about all models"""
    try:
        stats = get_model_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/images/<path:filename>')
def serve_image(filename):
    """Serve images from the images directory with caching and optimization"""
    try:
        # Security check - prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            return jsonify({'error': 'Invalid filename'}), 400
        
        # Add caching headers for better performance
        response = send_from_directory('../images', filename)
        response.headers['Cache-Control'] = 'public, max-age=31536000'  # 1 year cache
        response.headers['ETag'] = hashlib.md5(filename.encode()).hexdigest()
        return response
    except Exception as e:
        return jsonify({'error': f'Image not found: {filename}'}), 404

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            return jsonify({'error': 'Supabase not configured'}), 500
        
        import requests
        
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/leaderboard?select=*&order=score.desc&limit=50',
            headers=headers
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to fetch leaderboard'}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# For Vercel deployment
app.debug = False

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5328)