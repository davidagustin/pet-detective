import random
import logging
from supabase import create_client, Client
import os
from typing import Dict, List, Tuple, Optional

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseGameManager:
    def __init__(self):
        """Initialize for local image operations - no database needed"""
        # Force local images only, disable database
        logger.info("Using local images from images directory")
        self.supabase = None
    
    async def get_available_breeds(self, animal_type: Optional[str] = None) -> List[str]:
        """Get list of available breeds from local images directory"""
        import os
        
        # Get absolute path to images directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        images_dir = os.path.join(project_root, 'images')
        
        if not os.path.exists(images_dir):
            print(f"Images directory not found at: {images_dir}")
            return []
        
        # Extract unique breeds from filenames
        breeds_set = set()
        cat_breeds = ['siamese', 'maine_coon', 'persian', 'bengal', 'british_shorthair', 
                     'russian_blue', 'abyssinian', 'ragdoll', 'sphynx', 'birman', 'bombay', 'egyptian_mau']
        
        for filename in os.listdir(images_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # Extract breed from filename
                parts = filename.split('_')
                if len(parts) >= 2:
                    # Handle multi-word breeds - use case-insensitive comparison but preserve original case
                    first_part_lower = parts[0].lower()
                    if first_part_lower in ['british', 'egyptian', 'maine', 'russian']:
                        breed = f"{parts[0]} {parts[1]}"
                    elif first_part_lower in ['american', 'german', 'yorkshire', 'english', 'great', 'staffordshire']:
                        if len(parts) >= 3:
                            breed = f"{parts[0]} {parts[1]}"
                        else:
                            breed = parts[0]
                    else:
                        breed = parts[0]
                    
                    # Standardize breed name - preserve original capitalization
                    breed = breed.replace('_', ' ')
                    # Only title case if it's all lowercase
                    if breed.islower():
                        breed = breed.title()
                    
                    # Filter by animal type if specified
                    if animal_type:
                        breed_lower = breed.lower().replace(' ', '_')
                        is_cat = any(cat_breed in breed_lower for cat_breed in cat_breeds)
                        if animal_type == 'cat' and not is_cat:
                            continue
                        elif animal_type == 'dog' and is_cat:
                            continue
                    
                    breeds_set.add(breed)
        
        return sorted(list(breeds_set))
    
    async def get_random_image_for_breed(self, breed: str) -> Optional[Dict]:
        """Get a random image for a specific breed - using local images instead of database"""
        import random
        import os
        
        # Always use local images from the images folder
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        images_dir = os.path.join(project_root, 'images')
        
        if not os.path.exists(images_dir):
            print(f"Images directory not found at: {images_dir}")
            return None
        
        # Find all images for this breed in the local directory
        breed_images = []
        breed_lower = breed.lower().replace(' ', '_')
        
        # Common breed name variations to check (both lower and original case)
        breed_variations = [
            breed_lower,
            breed.lower().replace(' ', ''),
            breed.replace(' ', '_'),
            breed.replace(' ', ''),
            breed_lower.title(),  # First letter capitalized
            breed.replace(' ', '_').title()  # Title case with underscores
        ]
        
        for filename in os.listdir(images_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                # Check if filename starts with any breed variation (case insensitive)
                filename_lower = filename.lower()
                for variation in breed_variations:
                    if filename_lower.startswith(variation.lower() + '_'):
                        breed_images.append(filename)
                        break
        
        if not breed_images:
            return None
        
        # Select a random image
        selected_filename = random.choice(breed_images)
        
        # Determine animal type based on breed
        cat_breeds = ['siamese', 'maine_coon', 'persian', 'bengal', 'british_shorthair', 
                     'russian_blue', 'abyssinian', 'ragdoll', 'sphynx', 'birman', 'bombay', 'egyptian_mau']
        animal_type = 'cat' if any(cat_breed in breed_lower for cat_breed in cat_breeds) else 'dog'
        
        # Use Cloudinary URL if available, fallback to local
        try:
            from cloudinary_helper import cloudinary_helper
            if cloudinary_helper.is_available():
                blob_url = cloudinary_helper.get_image_url(selected_filename)
            else:
                blob_url = f'http://localhost:5328/api/images/{selected_filename}'
        except ImportError:
            blob_url = f'http://localhost:5328/api/images/{selected_filename}'
        
        return {
            'id': f'local_{selected_filename}',
            'filename': selected_filename,
            'breed': breed,
            'blob_url': blob_url,
            'animal_type': animal_type
        }
    
    async def generate_game_question(self, game_mode: str = 'medium', animal_type: Optional[str] = None) -> Dict:
        """Generate a game question with image and options from database"""
        
        # Get available breeds
        available_breeds = await self.get_available_breeds(animal_type)
        
        if len(available_breeds) < 3:
            raise ValueError("Not enough breeds available for game generation")
        
        # Select a random breed as the correct answer
        correct_breed = random.choice(available_breeds)
        
        # Get an image for the correct breed
        image_data = await self.get_random_image_for_breed(correct_breed)
        
        if not image_data:
            raise ValueError(f"No image found for breed: {correct_breed}")
        
        # Generate wrong options based on game mode
        num_options = {
            'easy': 3,
            'medium': 4,
            'hard': 4
        }.get(game_mode, 4)
        
        # Get the animal type of the correct breed
        correct_animal_type = image_data['animal_type']
        
        # Filter remaining breeds to only include the same animal type
        same_type_breeds = []
        for breed in available_breeds:
            if breed != correct_breed:
                breed_animal_type = await self._get_animal_type_for_breed(breed)
                if breed_animal_type == correct_animal_type:
                    same_type_breeds.append(breed)
        
        # Ensure we have enough breeds of the same type for the game mode
        if len(same_type_breeds) >= (num_options - 1):
            wrong_options = random.sample(same_type_breeds, num_options - 1)
        else:
            # If not enough same-type breeds, use all available same-type breeds
            # and fill remaining with any breeds if necessary
            wrong_options = same_type_breeds.copy()
            remaining_other_breeds = [b for b in available_breeds if b != correct_breed and b not in same_type_breeds]
            if len(wrong_options) < (num_options - 1) and remaining_other_breeds:
                additional_needed = (num_options - 1) - len(wrong_options)
                wrong_options.extend(random.sample(remaining_other_breeds, min(additional_needed, len(remaining_other_breeds))))
        
        # Ensure we have the right number of total options
        if len(wrong_options) < (num_options - 1):
            # Pad with additional wrong options if needed
            print(f"Warning: Only found {len(wrong_options)} wrong options for {correct_breed}, needed {num_options-1}")
        
        # Combine options and ensure proper randomization
        all_options = [correct_breed] + wrong_options[:num_options-1]
        
        # Shuffle the options so correct answer appears in different positions
        random.shuffle(all_options)
        
        # Double-check we have unique options
        all_options = list(dict.fromkeys(all_options))  # Remove duplicates while preserving order
        
        # If we lost options due to duplicates, pad with more wrong options
        while len(all_options) < num_options and len(all_options) < len(available_breeds):
            remaining = [b for b in available_breeds if b not in all_options]
            if remaining:
                all_options.append(random.choice(remaining))
        
        # Final shuffle to ensure randomization
        random.shuffle(all_options)
        
        return {
            'image': image_data['blob_url'],
            'options': all_options,
            'correct_answer': correct_breed,
            'ai_prediction': correct_breed,  # For now, assume AI is always correct
            'ai_confidence': 0.95,
            'image_metadata': {
                'filename': image_data['filename'],
                'animal_type': image_data['animal_type']
            }
        }
    
    async def _get_animal_type_for_breed(self, breed: str) -> str:
        """Get animal type (dog/cat) for a specific breed"""
        if not self.supabase:
            # Comprehensive list of cat breeds
            cat_breeds = [
                'Siamese', 'Maine Coon', 'Persian', 'Bengal', 'British Shorthair',
                'Russian Blue', 'Abyssinian', 'Ragdoll', 'Sphynx', 'Birman', 
                'Bombay', 'Egyptian Mau'
            ]
            return 'cat' if breed in cat_breeds else 'dog'
        
        try:
            response = self.supabase.table('pet_images')\
                .select('animal_type')\
                .eq('breed', breed)\
                .limit(1)\
                .execute()
            
            if response.data:
                return response.data[0]['animal_type']
            else:
                return 'dog'  # Default fallback
                
        except Exception as e:
            logger.error(f"Error fetching animal type for breed {breed}: {e}")
            return 'dog'  # Default fallback

# Global instance
database_game_manager = DatabaseGameManager()
