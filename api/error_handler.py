"""
Comprehensive error handling and logging system for Pet Detective API
Provides centralized error handling, logging, and security monitoring
"""

import logging
import traceback
import os
import time
import re
from datetime import datetime
from functools import wraps
from typing import Dict, Any, Optional, Tuple, List
from flask import request, jsonify, g
import hashlib
import json

# Configure logging
def setup_logging():
    """Setup comprehensive logging configuration"""
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format,
        handlers=[
            logging.FileHandler('logs/api.log'),
            logging.StreamHandler()
        ]
    )
    
    # Create specialized loggers
    security_logger = logging.getLogger('security')
    security_handler = logging.FileHandler('logs/security.log')
    security_handler.setFormatter(logging.Formatter(log_format))
    security_logger.addHandler(security_handler)
    security_logger.setLevel(logging.WARNING)
    
    error_logger = logging.getLogger('error')
    error_handler = logging.FileHandler('logs/errors.log')
    error_handler.setFormatter(logging.Formatter(log_format))
    error_logger.addHandler(error_handler)
    error_logger.setLevel(logging.ERROR)
    
    return logging.getLogger('api')

# Initialize logger
logger = setup_logging()

class APIError(Exception):
    """Base API error class"""
    def __init__(self, message: str, status_code: int = 500, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or 'INTERNAL_ERROR'
        super().__init__(self.message)

class ValidationError(APIError):
    """Validation error"""
    def __init__(self, message: str, field: str = None):
        self.field = field
        super().__init__(message, 400, 'VALIDATION_ERROR')

class AuthenticationError(APIError):
    """Authentication error"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, 401, 'AUTH_ERROR')

class AuthorizationError(APIError):
    """Authorization error"""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, 403, 'PERMISSION_ERROR')

class ResourceNotFoundError(APIError):
    """Resource not found error"""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, 404, 'NOT_FOUND')

class RateLimitError(APIError):
    """Rate limit exceeded error"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, 429, 'RATE_LIMIT')

class SecurityError(APIError):
    """Security violation error"""
    def __init__(self, message: str = "Security violation detected"):
        super().__init__(message, 403, 'SECURITY_ERROR')

def get_client_info(request) -> Dict[str, Any]:
    """Extract client information for logging"""
    return {
        'ip': request.headers.get('X-Forwarded-For', request.remote_addr),
        'user_agent': request.headers.get('User-Agent', 'Unknown'),
        'method': request.method,
        'path': request.path,
        'timestamp': datetime.utcnow().isoformat()
    }

def log_security_event(event_type: str, details: Dict[str, Any], severity: str = 'WARNING'):
    """Log security-related events"""
    security_logger = logging.getLogger('security')
    
    log_data = {
        'event_type': event_type,
        'severity': severity,
        'timestamp': datetime.utcnow().isoformat(),
        'client_info': get_client_info(request),
        'details': details
    }
    
    if severity == 'CRITICAL':
        security_logger.critical(json.dumps(log_data))
    elif severity == 'HIGH':
        security_logger.error(json.dumps(log_data))
    else:
        security_logger.warning(json.dumps(log_data))

def sanitize_error_message(error: Exception) -> str:
    """Sanitize error messages to prevent information disclosure"""
    error_str = str(error)
    
    # Remove potentially sensitive information
    sensitive_patterns = [
        r'password[=:]\s*\S+',
        r'token[=:]\s*\S+',
        r'key[=:]\s*\S+',
        r'secret[=:]\s*\S+',
        r'/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+\.py',  # File paths
        r'line \d+',  # Line numbers
    ]
    
    for pattern in sensitive_patterns:
        error_str = re.sub(pattern, '[REDACTED]', error_str, flags=re.IGNORECASE)
    
    return error_str

def create_error_response(error: Exception, request_id: str = None) -> Tuple[Dict[str, Any], int]:
    """Create standardized error response"""
    
    if isinstance(error, APIError):
        response = {
            'error': error.message,
            'error_code': error.error_code,
            'status_code': error.status_code
        }
        
        if isinstance(error, ValidationError) and hasattr(error, 'field') and error.field:
            response['field'] = error.field
            
        status_code = error.status_code
    else:
        # Log unexpected errors
        error_logger = logging.getLogger('error')
        error_logger.error(f"Unexpected error: {traceback.format_exc()}")
        
        # Don't expose internal errors to clients
        response = {
            'error': 'Internal server error',
            'error_code': 'INTERNAL_ERROR',
            'status_code': 500
        }
        status_code = 500
    
    if request_id:
        response['request_id'] = request_id
    
    response['timestamp'] = datetime.utcnow().isoformat()
    
    return response, status_code

# Rate limiting storage (in production, use Redis)
request_counts = {}
blocked_ips = {}

def check_rate_limit(client_ip: str, endpoint: str, limit: int = 100, window: int = 3600) -> bool:
    """Check if client has exceeded rate limit"""
    current_time = int(time.time())
    window_start = current_time - window
    
    # Clean up old entries
    for ip in list(request_counts.keys()):
        request_counts[ip] = [req_time for req_time in request_counts[ip] if req_time > window_start]
        if not request_counts[ip]:
            del request_counts[ip]
    
    # Check if IP is blocked
    if client_ip in blocked_ips:
        if blocked_ips[client_ip] > current_time:
            return False
        else:
            del blocked_ips[client_ip]
    
    # Count requests for this IP
    if client_ip not in request_counts:
        request_counts[client_ip] = []
    
    request_counts[client_ip].append(current_time)
    
    # Check if limit exceeded
    if len(request_counts[client_ip]) > limit:
        # Block IP for 1 hour
        blocked_ips[client_ip] = current_time + 3600
        
        log_security_event('RATE_LIMIT_EXCEEDED', {
            'client_ip': client_ip,
            'endpoint': endpoint,
            'request_count': len(request_counts[client_ip]),
            'limit': limit
        }, 'HIGH')
        
        return False
    
    return True

def error_handler(f):
    """Comprehensive error handling decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Generate request ID
        request_id = hashlib.md5(f"{time.time()}{request.remote_addr}".encode()).hexdigest()[:8]
        g.request_id = request_id
        
        try:
            # Rate limiting
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            endpoint = request.endpoint or 'unknown'
            
            if not check_rate_limit(client_ip, endpoint):
                raise RateLimitError()
            
            # Log request
            logger.info(f"Request {request_id}: {request.method} {request.path} from {client_ip}")
            
            # Execute function
            result = f(*args, **kwargs)
            
            # Log successful response
            logger.info(f"Request {request_id}: Success")
            
            return result
            
        except Exception as e:
            # Log error with context
            client_info = get_client_info(request)
            logger.error(f"Request {request_id}: Error - {sanitize_error_message(e)}")
            
            # Create error response
            response, status_code = create_error_response(e, request_id)
            
            # Log security events for certain errors
            if isinstance(e, (SecurityError, AuthenticationError, AuthorizationError)):
                log_security_event('SECURITY_ERROR', {
                    'error_type': type(e).__name__,
                    'error_message': sanitize_error_message(e),
                    'request_id': request_id
                }, 'HIGH')
            
            return jsonify(response), status_code
    
    return decorated_function

def validate_content_type(allowed_types: List[str]):
    """Decorator to validate request content type"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            content_type = request.content_type
            if content_type and not any(allowed_type in content_type for allowed_type in allowed_types):
                raise ValidationError(f"Invalid content type. Allowed: {', '.join(allowed_types)}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_json_size(max_size: int = 1024 * 1024):  # 1MB default
    """Decorator to validate JSON payload size"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.content_length and request.content_length > max_size:
                raise ValidationError(f"Payload too large (max {max_size // 1024}KB)")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_fields(*required_fields):
    """Decorator to validate required JSON fields"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                raise ValidationError("Request must be JSON")
            
            data = request.get_json()
            if not data:
                raise ValidationError("Empty JSON payload")
            
            missing_fields = [field for field in required_fields if field not in data or data[field] is None]
            if missing_fields:
                raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_model_usage(model_type: str, model_name: str = None, operation: str = 'prediction'):
    """Log model usage for analytics"""
    usage_logger = logging.getLogger('usage')
    usage_data = {
        'timestamp': datetime.utcnow().isoformat(),
        'model_type': model_type,
        'model_name': model_name,
        'operation': operation,
        'client_info': get_client_info(request)
    }
    usage_logger.info(json.dumps(usage_data))

# Global error handlers for Flask app
def register_error_handlers(app):
    """Register global error handlers with Flask app"""
    
    @app.errorhandler(404)
    def not_found(error):
        response, status_code = create_error_response(ResourceNotFoundError())
        return jsonify(response), status_code
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        response, status_code = create_error_response(APIError("Method not allowed", 405, "METHOD_NOT_ALLOWED"))
        return jsonify(response), status_code
    
    @app.errorhandler(413)
    def payload_too_large(error):
        response, status_code = create_error_response(ValidationError("Payload too large"))
        return jsonify(response), status_code
    
    @app.errorhandler(500)
    def internal_error(error):
        response, status_code = create_error_response(APIError("Internal server error"))
        return jsonify(response), status_code
