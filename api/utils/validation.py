"""
Backend validation utilities for Pet Detective API
Provides comprehensive input validation and sanitization
"""

import re
import os
import time
from typing import Dict, Any, Optional, List, Tuple
from werkzeug.datastructures import FileStorage
import hashlib
import uuid

class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)

class APIValidator:
    """Comprehensive API validation class"""
    
    # Allowed file types and their magic numbers
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg': [b'\xff\xd8\xff'],
        'image/png': [b'\x89PNG\r\n\x1a\n'],
        'image/webp': [b'RIFF', b'WEBP'],
        'image/bmp': [b'BM'],
        'image/gif': [b'GIF87a', b'GIF89a']
    }
    
    # Maximum file sizes (in bytes)
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_JSON_SIZE = 1024 * 1024  # 1MB
    
    # Allowed model types and modes
    ALLOWED_MODEL_TYPES = ['resnet', 'alexnet', 'mobilenet']
    ALLOWED_GAME_MODES = ['easy', 'medium', 'hard']
    ALLOWED_ANIMAL_TYPES = ['dog', 'cat', None]
    
    # Regex patterns
    UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,20}$')
    FILENAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+$')
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 255, allow_special: bool = False) -> str:
        """Sanitize and validate string input"""
        if not isinstance(value, str):
            raise ValidationError("Value must be a string")
        
        # Remove null bytes and control characters
        value = ''.join(char for char in value if ord(char) >= 32 or char in '\t\n\r')
        
        # Trim whitespace
        value = value.strip()
        
        # Check length
        if len(value) > max_length:
            raise ValidationError(f"String too long (max {max_length} characters)")
        
        # Check for special characters if not allowed
        if not allow_special:
            if re.search(r'[<>"\'\&]', value):
                raise ValidationError("String contains invalid characters")
        
        return value
    
    @staticmethod
    def validate_uuid(value: str, field_name: str = "UUID") -> str:
        """Validate UUID format"""
        if not isinstance(value, str):
            raise ValidationError(f"{field_name} must be a string")
        
        value = value.strip()
        if not APIValidator.UUID_PATTERN.match(value):
            raise ValidationError(f"Invalid {field_name} format")
        
        return value
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Validate username format"""
        if not isinstance(username, str):
            raise ValidationError("Username must be a string")
        
        username = username.strip()
        if not APIValidator.USERNAME_PATTERN.match(username):
            raise ValidationError("Username must be 3-20 characters, alphanumeric, underscore, or dash only")
        
        return username
    
    @staticmethod
    def validate_image_file(file: FileStorage) -> Tuple[str, bytes]:
        """Validate uploaded image file"""
        if not file:
            raise ValidationError("No file provided")
        
        if not file.filename:
            raise ValidationError("No filename provided")
        
        # Validate filename
        filename = APIValidator.sanitize_string(file.filename, max_length=255)
        if not APIValidator.FILENAME_PATTERN.match(filename):
            raise ValidationError("Invalid filename format")
        
        # Read file content
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        
        # Check file size
        if len(file_content) == 0:
            raise ValidationError("Empty file")
        
        if len(file_content) > APIValidator.MAX_IMAGE_SIZE:
            raise ValidationError(f"File too large (max {APIValidator.MAX_IMAGE_SIZE // 1024 // 1024}MB)")
        
        # Validate file type by magic numbers
        is_valid_image = False
        detected_type = None
        
        for mime_type, magic_numbers in APIValidator.ALLOWED_IMAGE_TYPES.items():
            for magic_num in magic_numbers:
                if file_content.startswith(magic_num):
                    is_valid_image = True
                    detected_type = mime_type
                    break
            if is_valid_image:
                break
        
        if not is_valid_image:
            raise ValidationError("Invalid image file format")
        
        # Additional security check - ensure file extension matches content
        file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
        expected_extensions = {
            'image/jpeg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/webp': ['webp'],
            'image/bmp': ['bmp'],
            'image/gif': ['gif']
        }
        
        if detected_type in expected_extensions:
            if file_ext not in expected_extensions[detected_type]:
                raise ValidationError(f"File extension doesn't match content type")
        
        return filename, file_content
    
    @staticmethod
    def validate_model_type(model_type: str) -> str:
        """Validate model type"""
        if not isinstance(model_type, str):
            raise ValidationError("Model type must be a string")
        
        model_type = model_type.lower().strip()
        if model_type not in APIValidator.ALLOWED_MODEL_TYPES:
            raise ValidationError(f"Invalid model type. Allowed: {', '.join(APIValidator.ALLOWED_MODEL_TYPES)}")
        
        return model_type
    
    @staticmethod
    def validate_game_mode(game_mode: str) -> str:
        """Validate game mode"""
        if not isinstance(game_mode, str):
            raise ValidationError("Game mode must be a string")
        
        game_mode = game_mode.lower().strip()
        if game_mode not in APIValidator.ALLOWED_GAME_MODES:
            raise ValidationError(f"Invalid game mode. Allowed: {', '.join(APIValidator.ALLOWED_GAME_MODES)}")
        
        return game_mode
    
    @staticmethod
    def validate_animal_type(animal_type: Optional[str]) -> Optional[str]:
        """Validate animal type filter"""
        if animal_type is None:
            return None
        
        if not isinstance(animal_type, str):
            raise ValidationError("Animal type must be a string or null")
        
        animal_type = animal_type.lower().strip()
        if animal_type not in ['dog', 'cat']:
            raise ValidationError("Invalid animal type. Allowed: dog, cat")
        
        return animal_type
    
    @staticmethod
    def validate_score_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate game score submission data"""
        validated_data = {}
        
        # Required fields
        required_fields = ['user_answer', 'correct_answer', 'user_id']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate user_answer and correct_answer
        validated_data['user_answer'] = APIValidator.sanitize_string(data['user_answer'], max_length=100)
        validated_data['correct_answer'] = APIValidator.sanitize_string(data['correct_answer'], max_length=100)
        
        # Validate user_id
        validated_data['user_id'] = APIValidator.validate_uuid(data['user_id'], "User ID")
        
        # Optional fields with validation
        if 'username' in data and data['username']:
            validated_data['username'] = APIValidator.validate_username(data['username'])
        
        if 'model_type' in data:
            validated_data['model_type'] = APIValidator.validate_model_type(data.get('model_type', 'resnet'))
        
        if 'game_mode' in data:
            validated_data['game_mode'] = APIValidator.validate_game_mode(data.get('game_mode', 'medium'))
        
        if 'model_name' in data and data['model_name']:
            validated_data['model_name'] = APIValidator.sanitize_string(data['model_name'], max_length=100)
        
        # Validate time_taken
        if 'time_taken' in data:
            try:
                time_taken = float(data['time_taken'])
                if time_taken < 0 or time_taken > 3600:  # Max 1 hour
                    raise ValidationError("Invalid time_taken value")
                validated_data['time_taken'] = time_taken
            except (ValueError, TypeError):
                raise ValidationError("time_taken must be a number")
        
        return validated_data
    
    @staticmethod
    def validate_json_size(data: bytes) -> None:
        """Validate JSON payload size"""
        if len(data) > APIValidator.MAX_JSON_SIZE:
            raise ValidationError(f"JSON payload too large (max {APIValidator.MAX_JSON_SIZE // 1024}KB)")
    
    @staticmethod
    def validate_rate_limit_headers(request) -> Dict[str, str]:
        """Extract and validate rate limiting headers"""
        headers = {}
        
        # Get client IP (considering proxies)
        if 'X-Forwarded-For' in request.headers:
            headers['client_ip'] = request.headers['X-Forwarded-For'].split(',')[0].strip()
        elif 'X-Real-IP' in request.headers:
            headers['client_ip'] = request.headers['X-Real-IP']
        else:
            headers['client_ip'] = request.remote_addr
        
        # Validate IP format (basic check)
        ip = headers['client_ip']
        if not re.match(r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$', ip) and not re.match(r'^[0-9a-fA-F:]+$', ip):
            headers['client_ip'] = 'unknown'
        
        return headers
    
    @staticmethod
    def generate_secure_filename(original_filename: str) -> str:
        """Generate a secure filename with timestamp and hash"""
        # Extract extension
        ext = ''
        if '.' in original_filename:
            ext = '.' + original_filename.split('.')[-1].lower()
        
        # Generate secure name
        timestamp = str(int(time.time()))
        random_hash = hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:8]
        
        return f"upload_{timestamp}_{random_hash}{ext}"

def validation_error_handler(func):
    """Decorator to handle validation errors consistently"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            return {
                'error': e.message,
                'field': e.field,
                'type': 'validation_error'
            }, 400
        except Exception as e:
            return {
                'error': 'Internal server error',
                'type': 'server_error'
            }, 500
    
    wrapper.__name__ = func.__name__
    return wrapper
