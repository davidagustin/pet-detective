import json
import os
import random
from typing import Dict, List, Optional, Any

class CloudinaryHelper:
    """Helper class for managing Cloudinary image URLs in Python backend"""
    
    CLOUD_NAME = 'drj3twq19'
    BASE_URL = f'https://res.cloudinary.com/{CLOUD_NAME}/image/upload'
    
    def __init__(self):
        # Load the mappings file
        self.mappings = self._load_mappings()
    
    def _load_mappings(self) -> Dict[str, Any]:
        """Load the Cloudinary mappings from JSON file"""
        try:
            mappings_path = os.path.join(
                os.path.dirname(__file__), 
                '..', 
                'scripts', 
                'cloudinary-mappings.json'
            )
            with open(mappings_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print("Warning: cloudinary-mappings.json not found. Using fallback URLs.")
            return {}
    
    def get_image_url(self, filename: str, width: int = 800, height: int = 600, 
                     crop: str = 'fill', quality: str = 'auto') -> str:
        """Get Cloudinary URL for an image with transformations"""
        
        # Check if we have a mapped URL
        if filename in self.mappings:
            mapping = self.mappings[filename]
            public_id = mapping['publicId']
        else:
            # Fallback: construct from filename
            breed, number = self._parse_filename(filename)
            public_id = f"pet-detective/pet-detective/{breed}_{number}"
        
        # Build transformation string
        transformations = f"w_{width},h_{height},c_{crop},q_{quality}"
        
        return f"{self.BASE_URL}/{transformations}/{public_id}.jpg"
    
    def get_responsive_urls(self, filename: str) -> Dict[str, str]:
        """Get responsive image URLs for different screen sizes"""
        return {
            'mobile': self.get_image_url(filename, 400, 300),
            'tablet': self.get_image_url(filename, 600, 450),
            'desktop': self.get_image_url(filename, 800, 600),
            'thumbnail': self.get_image_url(filename, 150, 150),
            'hero': self.get_image_url(filename, 1200, 800)
        }
    
    def get_image_with_effects(self, filename: str, effects: Dict[str, Any]) -> str:
        """Get image URL with visual effects applied"""
        transformations = ["w_800", "h_600", "c_fill", "q_auto"]
        
        if effects.get('blur'):
            transformations.append(f"e_blur:{effects['blur']}")
        if effects.get('grayscale'):
            transformations.append("e_grayscale")
        if effects.get('sepia'):
            transformations.append("e_sepia")
        if effects.get('brightness'):
            transformations.append(f"e_brightness:{effects['brightness']}")
        if effects.get('contrast'):
            transformations.append(f"e_contrast:{effects['contrast']}")
        if effects.get('saturation'):
            transformations.append(f"e_saturation:{effects['saturation']}")
        
        # Get public_id
        if filename in self.mappings:
            public_id = self.mappings[filename]['publicId']
        else:
            breed, number = self._parse_filename(filename)
            public_id = f"pet-detective/pet-detective/{breed}_{number}"
        
        transform_string = "/".join(transformations)
        return f"{self.BASE_URL}/{transform_string}/{public_id}.jpg"
    
    def get_available_breeds(self) -> List[str]:
        """Get list of all available breeds from mappings"""
        breeds = set()
        
        for filename in self.mappings.keys():
            breed, _ = self._parse_filename(filename)
            if breed:
                breeds.add(breed)
        
        return sorted(list(breeds))
    
    def get_images_for_breed(self, breed: str) -> List[str]:
        """Get all available images for a specific breed"""
        breed_images = []
        breed_lower = breed.lower().replace(' ', '_')
        
        for filename in self.mappings.keys():
            file_breed, _ = self._parse_filename(filename)
            if file_breed and file_breed.lower().replace(' ', '_') == breed_lower:
                breed_images.append(filename)
        
        return breed_images
    
    def get_random_image_for_breed(self, breed: str) -> Optional[str]:
        """Get a random image filename for a specific breed"""
        breed_images = self.get_images_for_breed(breed)
        return random.choice(breed_images) if breed_images else None
    
    def has_image(self, filename: str) -> bool:
        """Check if image exists in Cloudinary mappings"""
        return filename in self.mappings
    
    def get_fallback_url(self, filename: str) -> str:
        """Get fallback URL for local serving (when Cloudinary fails)"""
        return f"http://localhost:5328/api/images/{filename}"
    
    def _parse_filename(self, filename: str) -> tuple:
        """Parse breed and number from filename like 'Abyssinian_1.jpg'"""
        # Remove extension
        name_without_ext = filename.replace('.jpg', '').replace('.jpeg', '').replace('.png', '')
        parts = name_without_ext.split('_')
        
        if len(parts) < 2:
            return filename, '1'
        
        # Last part should be number, everything else is breed
        number = parts[-1]
        breed = '_'.join(parts[:-1])
        
        return breed, number
    
    def is_available(self) -> bool:
        """Check if Cloudinary integration is available"""
        return len(self.mappings) > 0

# Global instance
cloudinary_helper = CloudinaryHelper()
