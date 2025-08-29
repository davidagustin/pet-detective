import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import numpy as np
import os
import time
import base64
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DoubleConv(nn.Module):
    """(convolution => BN => ReLU) * 2"""
    def __init__(self, in_channels, out_channels, mid_channels=None):
        super().__init__()
        if not mid_channels:
            mid_channels = out_channels
        self.double_conv = nn.Sequential(
            nn.Conv2d(in_channels, mid_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(mid_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(mid_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.double_conv(x)

class Down(nn.Module):
    """Downscaling with maxpool then double conv"""
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.maxpool_conv = nn.Sequential(
            nn.MaxPool2d(2),
            DoubleConv(in_channels, out_channels)
        )

    def forward(self, x):
        return self.maxpool_conv(x)

class Up(nn.Module):
    """Upscaling then double conv"""
    def __init__(self, in_channels, out_channels, bilinear=True):
        super().__init__()
        if bilinear:
            self.up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
            self.conv = DoubleConv(in_channels, out_channels, in_channels // 2)
        else:
            self.up = nn.ConvTranspose2d(in_channels, in_channels // 2, kernel_size=2, stride=2)
            self.conv = DoubleConv(in_channels, out_channels)

    def forward(self, x1, x2):
        x1 = self.up(x1)
        # input is CHW
        diffY = x2.size()[2] - x1.size()[2]
        diffX = x2.size()[3] - x1.size()[3]

        x1 = F.pad(x1, [diffX // 2, diffX - diffX // 2,
                        diffY // 2, diffY - diffY // 2])
        x = torch.cat([x2, x1], dim=1)
        return self.conv(x)

class OutConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super(OutConv, self).__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)

    def forward(self, x):
        return self.conv(x)

class UNet(nn.Module):
    def __init__(self, n_channels=3, n_classes=1, bilinear=False):
        super(UNet, self).__init__()
        self.n_channels = n_channels
        self.n_classes = n_classes
        self.bilinear = bilinear

        self.inc = (DoubleConv(n_channels, 64))
        self.down1 = (Down(64, 128))
        self.down2 = (Down(128, 256))
        self.down3 = (Down(256, 512))
        factor = 2 if bilinear else 1
        self.down4 = (Down(512, 1024 // factor))
        self.up1 = (Up(1024, 512 // factor, bilinear))
        self.up2 = (Up(512, 256 // factor, bilinear))
        self.up3 = (Up(256, 128 // factor, bilinear))
        self.up4 = (Up(128, 64, bilinear))
        self.outc = (OutConv(64, n_classes))

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)
        x = self.up1(x5, x4)
        x = self.up2(x, x3)
        x = self.up3(x, x2)
        x = self.up4(x, x1)
        logits = self.outc(x)
        return logits

class PetSegmentation:
    def __init__(self, model_path=None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = UNet(n_channels=3, n_classes=1, bilinear=True)
        
        if model_path and os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            print(f"Loaded segmentation model from {model_path}")
        
        self.model.to(self.device)
        self.model.eval()
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Reverse transform for output
        self.reverse_transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((256, 256))
        ])

    def preprocess_image(self, image_path):
        """Preprocess image for segmentation"""
        if isinstance(image_path, str):
            image = Image.open(image_path).convert('RGB')
        else:
            image = image_path.convert('RGB')
        
        # Store original size for resizing back
        original_size = image.size
        
        # Transform image
        image_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        return image_tensor, original_size

    def segment_image(self, image_path):
        """Segment pet from image"""
        start_time = time.time()
        
        # Preprocess image
        image_tensor, original_size = self.preprocess_image(image_path)
        
        # Run inference
        with torch.no_grad():
            output = self.model(image_tensor)
            mask = torch.sigmoid(output)
            mask = (mask > 0.5).float()
        
        # Convert mask to PIL image
        mask_np = mask.squeeze().cpu().numpy()
        mask_image = Image.fromarray((mask_np * 255).astype(np.uint8))
        mask_image = mask_image.resize(original_size, Image.NEAREST)
        
        # Create segmented image
        if isinstance(image_path, str):
            original_image = Image.open(image_path).convert('RGB')
        else:
            original_image = image_path.convert('RGB')
        
        # Apply mask to original image
        mask_array = np.array(mask_image) / 255.0
        original_array = np.array(original_image)
        
        # Create segmented image (pet only)
        segmented_array = original_array * mask_array[:, :, np.newaxis]
        segmented_image = Image.fromarray(segmented_array.astype(np.uint8))
        
        # Calculate confidence (percentage of pixels classified as pet)
        confidence = float(mask_np.mean())
        
        processing_time = time.time() - start_time
        
        return {
            'mask': mask_image,
            'segmented': segmented_image,
            'confidence': confidence,
            'processing_time': processing_time
        }

    def encode_image_to_base64(self, image):
        """Convert PIL image to base64 string"""
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

    def segment_and_encode(self, image_path):
        """Segment image and return base64 encoded results"""
        result = self.segment_image(image_path)
        
        return {
            'maskImage': self.encode_image_to_base64(result['mask']),
            'segmentedImage': self.encode_image_to_base64(result['segmented']),
            'confidence': float(result['confidence']),  # Convert numpy float32 to Python float
            'processingTime': float(result['processing_time'])  # Ensure it's a Python float
        }

# Initialize global segmentation model
segmentation_model = None

def get_segmentation_model():
    """Get or create segmentation model instance"""
    global segmentation_model
    if segmentation_model is None:
        # Try to load pre-trained model if available
        model_path = os.path.join('models', 'pet_segmentation_model.pth')
        segmentation_model = PetSegmentation(model_path if os.path.exists(model_path) else None)
    return segmentation_model
