"""
ml/scripts/prepare_rdd2022.py — Dataset Preparation for RDD2022 (India Subset)

Converts Pascal VOC XML annotations to YOLO format, enforces sequence-aware
train/val/test splits (80/10/10) to prevent video frame leakage, and generates
the dataset.yaml configuration for YOLO11 training.

Usage:
    python ml/scripts/prepare_rdd2022.py --data-dir ml/datasets/rdd2022_raw --output-dir ml/datasets/rdd2022
"""

import os
import sys
import glob
import shutil
import random
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Tuple

# RDD2022 class mappings to Marga canonical classes
CLASS_MAPPING = {
    'D00': 1,  # Longitudinal Crack
    'D10': 2,  # Transverse Crack
    'D20': 3,  # Alligator Crack / Surface Damage
    'D40': 0,  # Pothole
}

CLASS_NAMES = [
    'pothole',
    'longitudinal_crack',
    'transverse_crack',
    'surface_damage',
]


def parse_voc_xml(xml_path: Path, img_width: int = None, img_height: int = None) -> List[Tuple[int, float, float, float, float]]:
    """Parse Pascal VOC XML and convert bounding boxes to YOLO normalized coordinates."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Read image size if not provided
    size_elem = root.find('size')
    if size_elem is not None:
        w_val = int(size_elem.find('width').text)
        h_val = int(size_elem.find('height').text)
        if w_val > 0 and h_val > 0:
            img_width, img_height = w_val, h_val

    if not img_width or not img_height:
        # Default RDD2022 India camera resolution
        img_width, img_height = 720, 720

    boxes = []
    for obj in root.findall('object'):
        name = obj.find('name').text.strip()
        if name not in CLASS_MAPPING:
            continue

        class_id = CLASS_MAPPING[name]
        bndbox = obj.find('bndbox')
        xmin = float(bndbox.find('xmin').text)
        ymin = float(bndbox.find('ymin').text)
        xmax = float(bndbox.find('xmax').text)
        ymax = float(bndbox.find('ymax').text)

        # Clamp coordinates to image boundaries
        xmin = max(0.0, min(xmin, float(img_width)))
        xmax = max(0.0, min(xmax, float(img_width)))
        ymin = max(0.0, min(ymin, float(img_height)))
        ymax = max(0.0, min(ymax, float(img_height)))

        box_w = xmax - xmin
        box_h = ymax - ymin

        if box_w <= 1 or box_h <= 1:
            continue

        # Convert to YOLO center x, y, width, height (normalized)
        x_center = (xmin + xmax) / (2.0 * img_width)
        y_center = (ymin + ymax) / (2.0 * img_height)
        norm_w = box_w / img_width
        norm_h = box_h / img_height

        boxes.append((class_id, x_center, y_center, norm_w, norm_h))

    return boxes


def extract_sequence_id(filename: str) -> str:
    """
    Extract video/sequence identifier from filename.
    Example: 'India_001234.jpg' -> sequence prefix or chunk
    RDD2022 India files are recorded in sequences (e.g., India_000001 to India_000500).
    We group every 100 consecutive frames into a sequence block to prevent leakage.
    """
    stem = Path(filename).stem
    parts = stem.split('_')
    if len(parts) >= 2 and parts[-1].isdigit():
        num = int(parts[-1])
        seq_bucket = num // 100
        return f"{parts[0]}_seq_{seq_bucket}"
    return stem


def partition_by_sequence(image_files: List[Path], train_ratio=0.80, val_ratio=0.10, seed=42) -> Dict[str, List[Path]]:
    """Group images by sequence ID and allocate entire sequences to splits."""
    random.seed(seed)
    seq_groups: Dict[str, List[Path]] = {}
    for img_path in image_files:
        seq_id = extract_sequence_id(img_path.name)
        seq_groups.setdefault(seq_id, []).append(img_path)

    all_seqs = list(seq_groups.keys())
    random.shuffle(all_seqs)

    n_total = len(all_seqs)
    n_train = max(1, int(n_total * train_ratio))
    n_val = max(1, int(n_total * val_ratio))

    train_seqs = set(all_seqs[:n_train])
    val_seqs = set(all_seqs[n_train:n_train + n_val])
    test_seqs = set(all_seqs[n_train + n_val:])

    splits = {'train': [], 'val': [], 'test': []}
    for seq, imgs in seq_groups.items():
        if seq in train_seqs:
            splits['train'].extend(imgs)
        elif seq in val_seqs:
            splits['val'].extend(imgs)
        else:
            splits['test'].extend(imgs)

    return splits


def process_dataset(raw_dir: Path, output_dir: Path, seed: int = 42):
    """Process raw RDD2022 dataset into YOLO directory structure."""
    print(f"[prepare_rdd2022] Searching for images in {raw_dir}...")
    image_exts = ('*.jpg', '*.jpeg', '*.png')
    image_files = []
    for ext in image_exts:
        image_files.extend(list(raw_dir.rglob(ext)))

    if not image_files:
        print(f"[prepare_rdd2022] No images found in {raw_dir}. Generating template directory structure.")
        # Create directory skeleton
        for split in ['train', 'val', 'test']:
            (output_dir / 'images' / split).mkdir(parents=True, exist_ok=True)
            (output_dir / 'labels' / split).mkdir(parents=True, exist_ok=True)
        generate_yaml(output_dir)
        return

    print(f"[prepare_rdd2022] Found {len(image_files)} raw images.")
    splits = partition_by_sequence(image_files, seed=seed)

    for split_name, imgs in splits.items():
        img_out = output_dir / 'images' / split_name
        lbl_out = output_dir / 'labels' / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        print(f"[prepare_rdd2022] Processing {len(imgs)} images for split: {split_name}...")
        for img_path in imgs:
            # Copy image
            shutil.copy2(img_path, img_out / img_path.name)

            # Look for XML annotation
            xml_path = img_path.parent.parent / 'annotations' / 'xmls' / f"{img_path.stem}.xml"
            if not xml_path.exists():
                xml_path = img_path.with_suffix('.xml')

            yolo_txt = lbl_out / f"{img_path.stem}.txt"
            if xml_path.exists():
                boxes = parse_voc_xml(xml_path)
                with open(yolo_txt, 'w', encoding='utf-8') as f:
                    for cls_id, xc, yc, w, h in boxes:
                        f.write(f"{cls_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
            else:
                # Negative sample / background frame
                yolo_txt.touch()

    generate_yaml(output_dir)
    print(f"[prepare_rdd2022] Dataset preparation complete! Output at {output_dir}")


def generate_yaml(output_dir: Path):
    """Emit YOLO dataset.yaml file."""
    yaml_content = f"""# Marga RDD2022 India Dataset Configuration for YOLO11
path: {output_dir.resolve().as_posix()}
train: images/train
val: images/val
test: images/test

# Classes
names:
  0: pothole
  1: longitudinal_crack
  2: transverse_crack
  3: surface_damage
"""
    yaml_path = output_dir / 'dataset.yaml'
    yaml_path.write_text(yaml_content, encoding='utf-8')
    print(f"[prepare_rdd2022] Generated {yaml_path}")


def main():
    parser = argparse.ArgumentParser(description="Prepare RDD2022 dataset for YOLO training")
    parser.add_argument('--data-dir', type=Path, default=Path('ml/datasets/rdd2022_raw'), help='Path to raw RDD2022 directory')
    parser.add_argument('--output-dir', type=Path, default=Path('ml/datasets/rdd2022'), help='Output directory for YOLO formatted dataset')
    parser.add_argument('--seed', type=int, default=42, help='Random seed for sequence split')
    args = parser.parse_args()

    process_dataset(args.data_dir, args.output_dir, args.seed)


if __name__ == '__main__':
    main()
