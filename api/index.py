from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import os
import json
import threading
import time
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
import hashlib

from pet_classifier import PetClassifier
from train_model import train_pet_classifier
from model_manager import ModelManager
from pet_segmentation import get_segmentation_model
from model_metadata import get_all_models, get_model_metadata, get_model_stats, update_model_usage

app = Flask(__name__)
CORS(app)

# Initialize model manager
model_manager = ModelManager()

# Global classifiers dictionary for multiple models
classifiers = {}

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Create models directory if it doesn't exist
os.makedirs('models', exist_ok=True)

def scan_models_directory():
    """Scan models directory for available trained models"""
    available_models = {}
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
    
    if os.path.exists('models'):
        for filename in os.listdir('models'):
            if filename.endswith(('.pth', '.safetensors')):
                filepath = os.path.join('models', filename)
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
                file_format = 'safetensors' if filename.endswith('.safetensors') else 'pytorch'
                
                available_models[filename] = {
                    'name': filename,
                    'type': model_type,
                    'format': file_format,
                    'path': filepath,
                    'size_mb': round(stat.st_size / (1024 * 1024), 2),
                    'created': int(stat.st_ctime),
                    'modified': int(stat.st_mtime)
                }
    
    return available_models, model_types

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        model_type = request.form.get('model_type', 'resnet')
        model_name = request.form.get('model_name', None)
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded image temporarily
        filename = secure_filename(file.filename)
        temp_path = f'temp_{int(time.time())}_{filename}'
        file.save(temp_path)
        
        try:
            # Get or create classifier
            model_key = f"{model_type}_{model_name}" if model_name else model_type
            if model_key not in classifiers:
                model_path = None
                if model_name:
                    model_path = os.path.join('models', model_name)
                
                classifiers[model_key] = PetClassifier(model_type=model_type, model_path=model_path)
            
            classifier = classifiers[model_key]
            
            # Make prediction
            predictions = classifier.predict(temp_path)
            
            return jsonify(predictions)
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game/start', methods=['POST'])
def start_game():
    try:
        data = request.get_json()
        model_type = data.get('model_type', 'resnet')
        model_name = data.get('model_name', None)
        game_mode = data.get('game_mode', 'medium')
        
        # Get or create classifier
        model_key = f"{model_type}_{model_name}" if model_name else model_type
        if model_key not in classifiers:
            model_path = None
            if model_name:
                model_path = os.path.join('models', model_name)
            
            classifiers[model_key] = PetClassifier(model_type=model_type, model_path=model_path)
        
        classifier = classifiers[model_key]
        
        # Generate game question
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
def check_answer():
    try:
        data = request.get_json()
        user_answer = data.get('user_answer')
        correct_answer = data.get('correct_answer')
        user_id = data.get('user_id')
        username = data.get('username')
        model_type = data.get('model_type', 'resnet')
        model_name = data.get('model_name', None)
        game_mode = data.get('game_mode', 'medium')
        time_taken = data.get('time_taken', 0)
        
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
        response = send_from_directory('images', filename)
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)