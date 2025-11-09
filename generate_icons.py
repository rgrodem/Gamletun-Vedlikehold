#!/usr/bin/env python3
"""Generate PWA icons for Gamletun Vedlikehold app"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a simple icon with gradient background and emoji"""
    # Create image with gradient background
    image = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(image)

    # Draw gradient background (blue to indigo)
    for y in range(size):
        # Color interpolation from blue (#2563eb) to indigo (#4f46e5)
        r = int(37 + (79 - 37) * (y / size))
        g = int(99 + (70 - 99) * (y / size))
        b = int(235 + (229 - 235) * (y / size))
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # Try to add emoji text (tractor)
    try:
        # Use a large font size based on image size
        font_size = int(size * 0.5)
        # Try different font paths
        font_paths = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/System/Library/Fonts/Apple Color Emoji.ttc',
            '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
        ]

        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    break
                except:
                    continue

        if font is None:
            font = ImageFont.load_default()

        # Draw tractor emoji (we'll use 'G' for Gamletun if emoji doesn't work)
        text = "🚜"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        position = ((size - text_width) // 2, (size - text_height) // 2)

        # Draw white text as fallback (letter G)
        draw.text(position, "G", font=font, fill='white')

    except Exception as e:
        print(f"Could not add text: {e}")
        # Draw a simple white circle in the center as fallback
        margin = size // 4
        draw.ellipse([margin, margin, size - margin, size - margin],
                     fill='white', outline=None)

    # Save the image
    image.save(output_path, 'PNG', optimize=True)
    print(f"Created: {output_path} ({size}x{size})")

if __name__ == '__main__':
    # Create output directory
    output_dir = 'gamletun-app/public'
    os.makedirs(output_dir, exist_ok=True)

    # Generate icons in different sizes
    sizes = [192, 512]
    for size in sizes:
        output_path = os.path.join(output_dir, f'icon-{size}.png')
        create_icon(size, output_path)

    print("\n✅ All icons generated successfully!")
