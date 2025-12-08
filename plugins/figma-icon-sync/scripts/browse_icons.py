#!/usr/bin/env python3
"""
Figma Icon Browser

Parses Figma metadata output to help navigate and search for icons.
Useful for processing large icon design systems.

Usage:
    python browse_icons.py <metadata_file> --list
    python browse_icons.py <metadata_file> --search "home"
    python browse_icons.py <metadata_file> --section "Navigation"

Requires Python 3.7+
"""

import re
import sys
import json
import argparse
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class IconInfo:
    """Information about a single icon."""
    name: str
    node_id: str
    section: str
    is_outlined: bool
    path: str  # Full path in the Figma structure


def parse_figma_metadata(content: str) -> List[IconInfo]:
    """
    Parse Figma metadata to extract icon information.

    Supports both XML and JSON formats from get_metadata tool.

    Args:
        content: Raw metadata string from Figma MCP

    Returns:
        List of IconInfo objects
    """
    icons = []  # type: List[IconInfo]

    # Try parsing as JSON first
    try:
        data = json.loads(content)
        icons = parse_json_metadata(data)
    except json.JSONDecodeError:
        # Fall back to XML parsing
        icons = parse_xml_metadata(content)

    return icons


def parse_json_metadata(
    data: Any,
    path: str = "",
    section: str = ""
) -> List[IconInfo]:
    """Parse JSON format metadata."""
    icons = []  # type: List[IconInfo]

    if isinstance(data, dict):
        name = data.get('name', '')
        node_type = data.get('type', '')
        node_id = data.get('id', '')

        # Update section based on frame/page names
        current_section = section
        if node_type in ['PAGE', 'FRAME', 'SECTION']:
            current_section = name

        current_path = f"{path}/{name}" if path else name

        # Check if this looks like an icon
        if is_icon_node(name, node_type):
            is_outlined = check_outlined_variant(name)
            icons.append(IconInfo(
                name=name,
                node_id=node_id,
                section=current_section,
                is_outlined=is_outlined,
                path=current_path
            ))

        # Recurse into children
        children = data.get('children', [])
        for child in children:
            icons.extend(parse_json_metadata(child, current_path, current_section))

    return icons


def parse_xml_metadata(content: str) -> List[IconInfo]:
    """Parse XML format metadata."""
    icons = []  # type: List[IconInfo]

    # Simple regex-based parsing for XML
    # Pattern to match icon-like elements
    node_pattern = re.compile(
        r'<(\w+)[^>]*\s+name="([^"]+)"[^>]*\s+id="([^"]+)"',
        re.IGNORECASE
    )

    current_section = ""

    for match in node_pattern.finditer(content):
        node_type = match.group(1)
        name = match.group(2)
        node_id = match.group(3)

        # Track sections
        if node_type.upper() in ['FRAME', 'PAGE', 'SECTION']:
            current_section = name
            continue

        # Check if this looks like an icon
        if is_icon_node(name, node_type):
            is_outlined = check_outlined_variant(name)
            icons.append(IconInfo(
                name=name,
                node_id=node_id,
                section=current_section,
                is_outlined=is_outlined,
                path=f"{current_section}/{name}"
            ))

    return icons


def is_icon_node(name: str, node_type: str) -> bool:
    """Determine if a node is likely an icon."""
    # Skip container types
    if node_type.upper() in ['PAGE', 'DOCUMENT', 'SECTION']:
        return False

    # Common icon patterns
    icon_patterns = [
        r'^icon[-_]',           # Prefix: icon-name
        r'[-_]icon$',           # Suffix: name-icon
        r'^ic[-_]',             # Prefix: ic-name
        r'[-_]ic$',             # Suffix: name-ic
        r'^\d+[-_]',            # Numbered: 24-home
    ]

    # Check against patterns
    lower_name = name.lower()
    for pattern in icon_patterns:
        if re.search(pattern, lower_name):
            return True

    # If the node is a COMPONENT or COMPONENT_SET, it's likely an icon
    if node_type.upper() in ['COMPONENT', 'COMPONENT_SET', 'INSTANCE']:
        # Additional check: exclude obviously non-icon components
        exclude_patterns = ['button', 'input', 'card', 'modal', 'dialog', 'form']
        if not any(p in lower_name for p in exclude_patterns):
            return True

    return False


def check_outlined_variant(name: str) -> bool:
    """Check if an icon name indicates an outlined variant."""
    outlined_patterns = [
        r'[-_\s]outlined?$',
        r'[-_\s]outline$',
        r'[-_\s]line$',
        r'[-_\s]stroke$',
        r'^outline[-_\s]',
    ]

    lower_name = name.lower()
    return any(re.search(p, lower_name) for p in outlined_patterns)


def search_icons(icons: List[IconInfo], query: str) -> List[IconInfo]:
    """Search icons by name."""
    query_lower = query.lower()
    return [
        icon for icon in icons
        if query_lower in icon.name.lower()
    ]


def filter_by_section(icons: List[IconInfo], section: str) -> List[IconInfo]:
    """Filter icons by section name."""
    section_lower = section.lower()
    return [
        icon for icon in icons
        if section_lower in icon.section.lower()
    ]


def list_sections(icons: List[IconInfo]) -> List[str]:
    """Get unique sections from icons."""
    return sorted(set(icon.section for icon in icons if icon.section))


def format_icon_list(icons: List[IconInfo], verbose: bool = False) -> str:
    """Format icon list for display."""
    lines = []  # type: List[str]

    if verbose:
        for icon in icons:
            variant = "outlined" if icon.is_outlined else "filled"
            lines.append(f"  {icon.name}")
            lines.append(f"    Node ID: {icon.node_id}")
            lines.append(f"    Section: {icon.section}")
            lines.append(f"    Variant: {variant}")
            lines.append("")
    else:
        # Group by section
        by_section = {}  # type: Dict[str, List[IconInfo]]
        for icon in icons:
            section = icon.section or "Uncategorized"
            if section not in by_section:
                by_section[section] = []
            by_section[section].append(icon)

        for section, section_icons in sorted(by_section.items()):
            lines.append(f"\n## {section}")
            for icon in sorted(section_icons, key=lambda x: x.name):
                variant = " (outlined)" if icon.is_outlined else ""
                lines.append(f"  - {icon.name}{variant}")

    return "\n".join(lines)


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Browse and search Figma icon metadata'
    )

    parser.add_argument(
        'metadata_file',
        help='File containing Figma metadata output'
    )
    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='List all icons'
    )
    parser.add_argument(
        '--search', '-s',
        type=str,
        help='Search for icons by name'
    )
    parser.add_argument(
        '--section',
        type=str,
        help='Filter by section name'
    )
    parser.add_argument(
        '--sections',
        action='store_true',
        help='List all sections'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show detailed information'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON'
    )

    args = parser.parse_args()

    # Validate metadata file exists
    metadata_path = Path(args.metadata_file)
    if not metadata_path.exists():
        print(f"Error: Metadata file not found: {args.metadata_file}")
        return 1

    if not metadata_path.is_file():
        print(f"Error: Path is not a file: {args.metadata_file}")
        return 1

    # Read metadata file with error handling
    try:
        content = metadata_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        print(f"Error: Failed to read file (encoding error): {args.metadata_file}")
        return 1
    except OSError as e:
        print(f"Error: Failed to read file: {e}")
        return 1

    if not content.strip():
        print("Error: Metadata file is empty")
        return 1

    icons = parse_figma_metadata(content)

    print(f"Found {len(icons)} icons in metadata\n")

    # Apply filters
    if args.search:
        icons = search_icons(icons, args.search)
        print(f"Search results for '{args.search}': {len(icons)} icons\n")

    if args.section:
        icons = filter_by_section(icons, args.section)
        print(f"Icons in section '{args.section}': {len(icons)}\n")

    # Output
    if args.sections:
        sections = list_sections(icons)
        print("Sections:")
        for section in sections:
            print(f"  - {section}")
    elif args.json:
        output = [
            {
                'name': icon.name,
                'node_id': icon.node_id,
                'section': icon.section,
                'is_outlined': icon.is_outlined,
                'path': icon.path
            }
            for icon in icons
        ]
        print(json.dumps(output, indent=2))
    elif args.list or args.search or args.section:
        print(format_icon_list(icons, args.verbose))
    else:
        # Default: show summary
        sections = list_sections(icons)
        print("Summary:")
        print(f"  Total icons: {len(icons)}")
        print(f"  Filled: {len([i for i in icons if not i.is_outlined])}")
        print(f"  Outlined: {len([i for i in icons if i.is_outlined])}")
        print(f"  Sections: {len(sections)}")
        print("\nUse --list to see all icons, --search to find specific icons")

    return 0


if __name__ == "__main__":
    sys.exit(main())
