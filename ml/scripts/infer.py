"""
ml/scripts/infer.py — CLI Inference Tool for Marga Road Defect Detection

Runs inference on single image or directory of images. Supports both
ONNX Runtime model weights and the DemoDetector fallback.

Usage:
    python ml/scripts/infer.py --input demo/clips/sample_frame.jpg --model models/best.onnx
    python ml/scripts/infer.py --input demo/clips/sample_frame.jpg --demo
"""

import sys
import json
import argparse
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.detector import get_detector, CLASS_NAMES


def run_inference(input_path: Path, model_path: Path, force_demo: bool, output_json: Path = None):
    detector = get_detector(str(model_path), force_demo=force_demo)
    print(f"[infer.py] Detector active: {type(detector).__name__}")

    if input_path.is_file():
        image_files = [input_path]
    elif input_path.is_dir():
        image_files = sorted(list(input_path.glob("*.jpg")) + list(input_path.glob("*.png")))
    else:
        # Fallback to simulated dummy path
        image_files = [input_path]

    results = {}
    for img_path in image_files:
        print(f"\nProcessing: {img_path}")
        detections = detector.detect(img_path, width=1280, height=720)
        det_dicts = [d.to_dict() for d in detections]
        results[str(img_path)] = det_dicts

        print(f"Found {len(detections)} defect(s):")
        for d in detections:
            water_tag = " [WATERLOGGED 💧]" if d.is_waterlogged else ""
            demo_tag = " (DEMO)" if d.is_demo else ""
            print(f"  * {d.class_name.upper():<18} conf={d.confidence:.2f}  area={d.estimated_area_m2:.3f}m²  bbox={d.bbox}{water_tag}{demo_tag}")

    if output_json:
        output_json.parent.mkdir(parents=True, exist_ok=True)
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        print(f"\nSaved inference output to: {output_json}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Marga Road Defect Inference CLI")
    parser.add_argument('--input', type=Path, default=Path('demo/sample_frame.jpg'), help='Path to image or directory')
    parser.add_argument('--model', type=Path, default=Path('models/best.onnx'), help='Path to ONNX weights')
    parser.add_argument('--demo', action='store_true', help='Force DemoDetector mode')
    parser.add_argument('--output', type=Path, default=None, help='Output JSON path')
    args = parser.parse_args()

    run_inference(args.input, args.model, args.demo, args.output)


if __name__ == '__main__':
    main()
