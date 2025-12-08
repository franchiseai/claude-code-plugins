#!/usr/bin/env python3
"""
SVG Icon Optimizer

Optimizes SVG icons downloaded from Figma to ensure:
- Consistent 24x24 dimensions
- Clean, minimal SVG code
- Proper naming conventions

Usage:
    python optimize_svg.py <input_svg> <output_dir> [--outlined]
    python optimize_svg.py --batch <input_dir> <output_dir>

Requires Python 3.7+
"""

import re
import sys
import argparse
from pathlib import Path
from typing import List, Optional, Tuple


def optimize_svg(svg_content: str) -> str:
    """
    Clean and optimize SVG content for icon usage.

    Args:
        svg_content: Raw SVG string from Figma

    Returns:
        Optimized SVG string with 24x24 dimensions
    """
    # Ensure viewBox is 0 0 24 24
    if 'viewBox' in svg_content:
        svg_content = re.sub(
            r'viewBox="[^"]*"',
            'viewBox="0 0 24 24"',
            svg_content
        )
    else:
        svg_content = svg_content.replace('<svg ', '<svg viewBox="0 0 24 24" ')

    # Set width and height to 24
    if 'width=' in svg_content:
        svg_content = re.sub(r'width="[^"]*"', 'width="24"', svg_content)
    else:
        svg_content = svg_content.replace('<svg ', '<svg width="24" ')

    if 'height=' in svg_content:
        svg_content = re.sub(r'height="[^"]*"', 'height="24"', svg_content)
    else:
        svg_content = svg_content.replace('<svg ', '<svg height="24" ')

    # Remove Figma-specific data attributes
    svg_content = re.sub(r'\s*data-[a-zA-Z-]*="[^"]*"', '', svg_content)

    # Remove XML declaration if present
    svg_content = re.sub(r'<\?xml[^>]*\?>\s*', '', svg_content)

    # Remove DOCTYPE if present
    svg_content = re.sub(r'<!DOCTYPE[^>]*>\s*', '', svg_content)

    # Remove comments
    svg_content = re.sub(r'<!--.*?-->', '', svg_content, flags=re.DOTALL)

    # Remove empty groups
    svg_content = re.sub(r'<g[^>]*>\s*</g>', '', svg_content)

    # Remove Figma namespace declarations
    svg_content = re.sub(r'\s*xmlns:figma="[^"]*"', '', svg_content)

    # Remove id attributes (often Figma-generated)
    svg_content = re.sub(r'\s*id="[^"]*"', '', svg_content)

    # Clean up excessive whitespace
    svg_content = re.sub(r'\n\s*\n', '\n', svg_content)
    svg_content = re.sub(r'>\s+<', '><', svg_content)

    # Add proper formatting
    svg_content = svg_content.strip()

    # Ensure fill="currentColor" for icon flexibility (if no fill specified)
    if 'fill=' not in svg_content:
        svg_content = svg_content.replace('<svg ', '<svg fill="currentColor" ')

    return svg_content


def to_pascal_case(name: str) -> str:
    """
    Convert any naming convention to PascalCase.

    Args:
        name: Icon name in any format (kebab-case, snake_case, etc.)

    Returns:
        PascalCase version of the name
    """
    # Remove file extension if present
    name = re.sub(r'\.(svg|png|jpg)$', '', name, flags=re.IGNORECASE)

    # Handle kebab-case, snake_case, and space-separated
    words = re.split(r'[-_\s]+', name)

    # Handle camelCase - split on uppercase letters
    expanded_words = []
    for word in words:
        # Split camelCase while preserving acronyms
        split_word = re.sub(r'([a-z])([A-Z])', r'\1 \2', word)
        expanded_words.extend(split_word.split())

    return ''.join(word.capitalize() for word in expanded_words if word)


def determine_variant(name: str) -> Tuple[str, bool]:
    """
    Determine if an icon is outlined and extract base name.

    Args:
        name: Full icon name

    Returns:
        Tuple of (base_name, is_outlined)
    """
    # Common patterns for outlined icons
    outlined_patterns = [
        r'[-_\s]?outlined?$',
        r'[-_\s]?outline$',
        r'[-_\s]?line$',
        r'[-_\s]?stroke$',
    ]

    lower_name = name.lower()
    is_outlined = False
    base_name = name

    for pattern in outlined_patterns:
        if re.search(pattern, lower_name, re.IGNORECASE):
            base_name = re.sub(pattern, '', name, flags=re.IGNORECASE)
            is_outlined = True
            break

    return base_name.strip('-_'), is_outlined


def process_icon_file(
    input_path: str,
    output_dir: str,
    force_outlined: Optional[bool] = None
) -> str:
    """
    Process a single icon file.

    Args:
        input_path: Path to input SVG file
        output_dir: Directory for output file
        force_outlined: Override variant detection (None = auto-detect)

    Returns:
        Path to created file

    Raises:
        FileNotFoundError: If input file doesn't exist
        ValueError: If file is not a valid SVG
        IOError: If file cannot be read or written
    """
    path = Path(input_path)

    # Validate input file exists
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if not path.is_file():
        raise ValueError(f"Input path is not a file: {input_path}")

    # Read file with error handling
    try:
        content = path.read_text(encoding='utf-8')
    except UnicodeDecodeError as e:
        raise IOError(f"Failed to read file (encoding error): {input_path}") from e

    # Basic SVG validation
    if '<svg' not in content.lower():
        raise ValueError(f"File does not appear to be a valid SVG: {input_path}")

    # Optimize SVG content
    optimized = optimize_svg(content)

    # Determine naming
    base_name, auto_outlined = determine_variant(path.stem)
    is_outlined = force_outlined if force_outlined is not None else auto_outlined

    # Convert to PascalCase
    pascal_name = to_pascal_case(base_name)

    # Generate output filename
    if is_outlined:
        output_name = f"{pascal_name}Outlined.svg"
    else:
        output_name = f"{pascal_name}.svg"

    # Write output file
    output_path = Path(output_dir) / output_name
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(optimized, encoding='utf-8')
    except OSError as e:
        raise IOError(f"Failed to write output file: {output_path}") from e

    return str(output_path)


def process_batch(input_dir: str, output_dir: str) -> List[str]:
    """
    Process all SVG files in a directory.

    Args:
        input_dir: Directory containing SVG files
        output_dir: Directory for output files

    Returns:
        List of created file paths
    """
    input_path = Path(input_dir)

    # Validate input directory
    if not input_path.exists():
        print(f"Error: Input directory not found: {input_dir}")
        return []

    if not input_path.is_dir():
        print(f"Error: Input path is not a directory: {input_dir}")
        return []

    created_files = []
    error_count = 0

    for svg_file in input_path.glob('**/*.svg'):
        try:
            result = process_icon_file(str(svg_file), output_dir)
            created_files.append(result)
            print(f"Processed: {svg_file.name} -> {Path(result).name}")
        except FileNotFoundError as e:
            print(f"Error (not found): {svg_file.name}: {e}")
            error_count += 1
        except ValueError as e:
            print(f"Error (invalid): {svg_file.name}: {e}")
            error_count += 1
        except IOError as e:
            print(f"Error (IO): {svg_file.name}: {e}")
            error_count += 1

    if error_count > 0:
        print(f"\nCompleted with {error_count} error(s)")

    return created_files


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Optimize SVG icons from Figma for codebase usage'
    )

    parser.add_argument(
        'input',
        help='Input SVG file or directory (with --batch)'
    )
    parser.add_argument(
        'output_dir',
        help='Output directory for processed icons'
    )
    parser.add_argument(
        '--outlined',
        action='store_true',
        help='Force icon to be treated as outlined variant'
    )
    parser.add_argument(
        '--filled',
        action='store_true',
        help='Force icon to be treated as filled variant'
    )
    parser.add_argument(
        '--batch',
        action='store_true',
        help='Process all SVG files in input directory'
    )

    args = parser.parse_args()

    # Determine variant override
    force_outlined = None
    if args.outlined:
        force_outlined = True
    elif args.filled:
        force_outlined = False

    try:
        if args.batch:
            results = process_batch(args.input, args.output_dir)
            print(f"\nProcessed {len(results)} icons")
        else:
            result = process_icon_file(args.input, args.output_dir, force_outlined)
            print(f"Created: {result}")
        return 0
    except (FileNotFoundError, ValueError, IOError) as e:
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
