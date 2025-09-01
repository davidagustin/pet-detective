from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import time
from datetime import datetime
from werkzeug.utils import secure_filename
import hashlib
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv('../.env.local')

from pet_classifier import PetClassifier
from utils.model_manager import ModelManager
from utils.model_metadata import get_all_models, get_model_metadata, get_model_stats, update_model_usage
from utils.validation import APIValidator, ValidationError as ValidatorError
from utils.error_handler import (
    error_handler, validate_content_type, validate_json_size, require_fields,
    register_error_handlers, log_model_usage, APIError, ValidationError,
    AuthenticationError, SecurityError, logger
)

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-CSRF-Token", "X-Requested-With"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Register error handlers
register_error_handlers(app)

# Initialize model manager
model_manager = ModelManager()

# Initialize API validator
validator = APIValidator()

# Dictionary to store loaded classifiers
classifiers = {}

# Initialize default classifier with error handling
try:
    # Try to load the improved safetensors model
    improved_model_path = os.path.join('..', 'models', 'resnet_model_improved.safetensors')
    if os.path.exists(improved_model_path):
        classifiers['resnet'] = PetClassifier(model_type='resnet', model_path=improved_model_path)
        print("Loaded improved ResNet model from safetensors")
    else:
        # Fall back to basic model
        classifiers['resnet'] = PetClassifier(model_type='resnet')
        print("Loaded default ResNet model")
except Exception as e:
    print(f"Warning: Could not initialize default classifier: {e}")
    classifiers['resnet'] = PetClassifier(model_type='resnet')

def scan_models_directory():
    """Scan the models directory for available models with secure validation"""
    models_dir = 'models'
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    
    available_models = []
    model_types = set()
    
    # Validate directory access
    if not os.access(models_dir, os.R_OK):
        raise SecurityError('Cannot access models directory')
    
    for filename in os.listdir(models_dir):
        # Security: Validate filename
        if not APIValidator.validate_filename(filename):
            logger.warning(f"Skipping suspicious filename: {filename}")
            continue
            
        if filename.endswith(('.pth', '.pt', '.pkl', '.safetensors')):
            # Validate file size
            file_path = os.path.join(models_dir, filename)
            file_size = os.path.getsize(file_path)
            
            if file_size > validator.MAX_FILE_SIZE * 10:  # Allow larger model files
                logger.warning(f"Model file too large: {filename} ({file_size} bytes)")
                continue
            
            model_info = {
                'name': filename,
                'path': file_path,
                'size': file_size,
                'modified': os.path.getmtime(file_path)
            }
            
            # Try to extract model type from filename
            if 'resnet' in filename.lower():
                model_info['type'] = 'resnet'
                model_types.add('resnet')
            elif 'efficientnet' in filename.lower():
                model_info['type'] = 'efficientnet'
                model_types.add('efficientnet')
            else:
                model_info['type'] = 'unknown'
            
            available_models.append(model_info)
    
    return available_models, list(model_types)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with system status"""
    try:
        # Check model availability
        model_status = 'healthy' if classifiers else 'degraded'
        
        # Get system stats
        system_stats = {
            'models_loaded': len(classifiers),
            'api_version': '2.0.0',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'status': model_status,
            'message': 'Pet Detective API is running',
            'stats': system_stats
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.route('/api/predict', methods=['POST'])
@error_handler
def predict():
    """Predict pet breed from uploaded image with comprehensive validation"""
    temp_path = None
    try:
        # Check if image is in request
        if 'image' not in request.files:
            # Check for image URL in JSON body
            data = request.get_json()
            if data and 'image_url' in data:
                return jsonify({'error': 'URL-based prediction not supported in this version'}), 400
            raise ValidationError('No image provided')
        
        file = request.files['image']
        
        # Validate file
        if file.filename == '':
            raise ValidationError('No file selected')
        
        # Security: Validate file extension and content
        if not APIValidator.validate_file_extension(file.filename, validator.ALLOWED_EXTENSIONS):
            raise ValidationError(f'Invalid file type. Allowed: {", ".join(validator.ALLOWED_EXTENSIONS)}')
        
        # Generate secure temporary filename
        timestamp = int(time.time() * 1000)
        file_hash = hashlib.md5(file.filename.encode()).hexdigest()[:8]
        filename = secure_filename(file.filename)
        temp_path = f'temp_{timestamp}_{file_hash}_{filename}'
        
        # Save and validate file size
        file.save(temp_path)
        file_size = os.path.getsize(temp_path)
        
        if file_size > validator.MAX_FILE_SIZE:
            os.remove(temp_path)
            raise ValidationError(f'File too large. Maximum size: {validator.MAX_FILE_SIZE // (1024*1024)}MB')
        
        # Validate it's actually an image
        if not APIValidator.validate_image_file(temp_path):
            os.remove(temp_path)
            raise ValidationError('Invalid image file')
        
        # Get model parameters with validation
        model_type = APIValidator.validate_model_type(
            request.form.get('model_type', 'resnet')
        )
        
        model_name = None
        if 'model_name' in request.form:
            model_name = APIValidator.sanitize_string(
                request.form.get('model_name'),
                max_length=100
            )
        
        # Get or create classifier
        model_key = f"{model_type}_{model_name}" if model_name else model_type
        if model_key not in classifiers:
            model_path = None
            if model_name:
                model_path = os.path.join('models', model_name)
                if not os.path.exists(model_path):
                    raise ValidationError(f'Model not found: {model_name}')
            classifiers[model_key] = PetClassifier(model_type=model_type, model_path=model_path)
        
        classifier = classifiers[model_key]
        
        # Make prediction with timeout
        predictions = classifier.predict(temp_path)
        
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
        
        model_name = None
        if data.get('model_name'):
            model_name = APIValidator.sanitize_string(data.get('model_name'), max_length=100)
        
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
@error_handler
@validate_content_type(['application/json'])
@validate_json_size()
@require_fields('user_answer', 'correct_answer', 'user_id')
def check_answer():
    """Check game answer with comprehensive validation"""
    try:
        data = request.get_json()
        
        # Validate and sanitize inputs
        user_answer = APIValidator.sanitize_string(data['user_answer'], max_length=100)
        correct_answer = APIValidator.sanitize_string(data['correct_answer'], max_length=100)
        user_id = APIValidator.sanitize_string(data['user_id'], max_length=100)
        
        # Check answer
        is_correct = user_answer.lower().strip() == correct_answer.lower().strip()
        
        # Track score
        score_key = f"score_{user_id}"
        if score_key not in app.config:
            app.config[score_key] = {'correct': 0, 'total': 0}
        
        app.config[score_key]['total'] += 1
        if is_correct:
            app.config[score_key]['correct'] += 1
        
        # Calculate accuracy
        accuracy = (app.config[score_key]['correct'] / app.config[score_key]['total']) * 100
        
        return jsonify({
            'correct': is_correct,
            'user_answer': user_answer,
            'correct_answer': correct_answer,
            'score': app.config[score_key]['correct'],
            'total': app.config[score_key]['total'],
            'accuracy': round(accuracy, 2)
        })
    
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
        return jsonify({'models': models})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/<model_name>/stats', methods=['GET'])
def get_model_statistics(model_name):
    """Get usage statistics for a specific model"""
    try:
        # Validate model name
        model_name = APIValidator.sanitize_string(model_name, max_length=100)
        stats = get_model_stats(model_name)
        
        if not stats:
            return jsonify({'error': 'Model not found'}), 404
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get game leaderboard with mock data"""
    try:
        # Mock leaderboard data for now
        mock_leaderboard = {
            'allTime': [
                {'id': '1', 'username': 'PetMaster', 'score': 950, 'total_questions': 100, 'accuracy': 95},
                {'id': '2', 'username': 'AnimalLover', 'score': 920, 'total_questions': 100, 'accuracy': 92},
                {'id': '3', 'username': 'BreedExpert', 'score': 880, 'total_questions': 100, 'accuracy': 88},
            ],
            'daily': [],
            'weekly': []
        }
        return jsonify(mock_leaderboard)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React app in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join('..', 'build', path)):
        return send_from_directory(os.path.join('..', 'build'), path)
    else:
        return send_from_directory(os.path.join('..', 'build'), 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5328))
    app.run(host='0.0.0.0', port=port, debug=True)