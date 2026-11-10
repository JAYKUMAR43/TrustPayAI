import os
import sys
import json
import cv2
import numpy as np
import subprocess
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOTS_DIR = os.path.join(ROOT_DIR, "docs", "new_screenshots")
MASTER_AUDIO_PATH = os.path.join(ROOT_DIR, "docs", "master_audio.wav")
TIMELINE_JSON_PATH = os.path.join(ROOT_DIR, "docs", "scene_timeline.json")
OUTPUT_VIDEO_PATH = os.path.join(ROOT_DIR, "TRUSTPAY_AI_Demo.mp4")

WIDTH = 1920
HEIGHT = 1080
FPS = 30

def get_font(size, bold=False):
    # Try system fonts (Segoe UI, Arial, Calibri)
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\calibrib.ttf" if bold else "C:\\Windows\\Fonts\\calibri.ttf"
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

FONT_HEADER = get_font(28, bold=True)
FONT_SUBTITLE = get_font(18, bold=False)
FONT_BADGE = get_font(14, bold=True)
FONT_TIME = get_font(16, bold=False)

# Map timeline items to screenshots and subtitles
SCENE_CONFIG = [
    {
        "id": "scene_01_problem",
        "shots": [("scene1_ai_assistant_home.png", 1.0)],
        "badge": "01 | PROBLEM STATEMENT",
        "title": "The Autonomous Agent Financial Dilemma",
        "subtitle": "Unrestricted payment keys create catastrophic risk. Autonomous agents require zero-trust guardrails."
    },
    {
        "id": "scene_02_prompt",
        "shots": [
            ("scene2_prompt_typed.png", 0.28),
            ("scene3_ai_recommendation.png", 0.72)
        ],
        "badge": "02 | PROCUREMENT INTENT",
        "title": "Natural-Language Purchase Request",
        "subtitle": "LangGraph agent analyzes request, queries approved vendor catalog, and proposes $30 Kaggle dataset."
    },
    {
        "id": "scene_03_guardrails",
        "shots": [("scene3_ai_recommendation.png", 1.0)],
        "badge": "03 | POLICY ENFORCEMENT",
        "title": "10-Vector Deterministic Guardrails",
        "subtitle": "Deterministic Python firewall verifies spending ceilings, merchant whitelist, and evaluates risk score."
    },
    {
        "id": "scene_04_buyer_auth",
        "shots": [("scene4_buyer_authorized.png", 1.0)],
        "badge": "04 | DUAL-CUSTODY GATE",
        "title": "Human Purchasing Officer Authorization",
        "subtitle": "Dual-custody approval ensures human-in-the-loop oversight before unlocking payment execution."
    },
    {
        "id": "scene_05_mandate",
        "shots": [("scene5_mandate_guardrails.png", 1.0)],
        "badge": "05 | CRYPTOGRAPHIC MANDATE",
        "title": "HMAC-SHA256 Digital Purchase Seal",
        "subtitle": "Transaction payload sealed with single-use nonce. Any altered parameter immediately breaks integrity."
    },
    {
        "id": "scene_06_paypal",
        "shots": [("scene6_paypal_completed.png", 1.0)],
        "badge": "06 | PAYMENT SETTLEMENT",
        "title": "PayPal Sandbox Orders v2 Capture",
        "subtitle": "Live settlement captured with PayPal Order ID 1S387815EJ8895028. Single-use nonce permanently burned."
    },
    {
        "id": "scene_07_adversarial",
        "shots": [("scene7_adversarial_blocked.png", 1.0)],
        "badge": "07 | THREAT INTERCEPTION",
        "title": "Prompt Injection & Budget Overrun Blocked",
        "subtitle": "Malicious override attempt and $9,999 budget bypass rejected by semantic shield. Zero mandate created."
    },
    {
        "id": "scene_08_history",
        "shots": [("scene8_purchase_history.png", 1.0)],
        "badge": "08 | FINANCIAL LEDGER",
        "title": "Real-Time Purchase History",
        "subtitle": "Permanent historical ledger tracking approved, pending, and blocked autonomous agent transactions."
    },
    {
        "id": "scene_09_workspace",
        "shots": [("scene9_workspace_settings.png", 1.0)],
        "badge": "09 | GOVERNANCE CONTROLS",
        "title": "Multi-Tenant Workspace Management",
        "subtitle": "Role-based tenant isolation, policy ceilings, and dual-mode PayPal configuration settings."
    },
    {
        "id": "scene_10_audit",
        "shots": [("scene10_audit_hash_chain.png", 1.0)],
        "badge": "10 | AUDIT INTEGRITY",
        "title": "Cryptographic SHA-256 Block Ledger",
        "subtitle": "Immutable hash-chained journal provides mathematical non-repudiation for enterprise compliance."
    }
]

def load_cached_images():
    cached = {}
    for cfg in SCENE_CONFIG:
        for shot_name, _ in cfg["shots"]:
            if shot_name not in cached:
                p = os.path.join(SCREENSHOTS_DIR, shot_name)
                img = cv2.imread(p)
                if img is None:
                    print(f"[!] Warning: missing {p}, creating placeholder")
                    img = np.full((HEIGHT, WIDTH, 3), 245, dtype=np.uint8)
                else:
                    img = cv2.resize(img, (WIDTH, HEIGHT), interpolation=cv2.INTER_AREA)
                cached[shot_name] = img
    return cached

def draw_hud_overlay(frame_bgr, cfg, current_sec, total_sec):
    # Convert BGR to RGB for PIL drawing
    img_pil = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img_pil, "RGBA")
    
    # -------------------------------------------------------------
    # 1. Sleek Top Header Bar (Enterprise Fintech Header)
    # -------------------------------------------------------------
    # Dark modern slate gradient strip
    header_h = 74
    draw.rectangle([(0, 0), (WIDTH, header_h)], fill=(15, 23, 42, 235)) # Slate 900
    draw.line([(0, header_h), (WIDTH, header_h)], fill=(37, 99, 235, 200), width=2) # Blue accent line
    
    # App brand pill
    pill_w = 175
    pill_h = 32
    pill_x = 30
    pill_y = 21
    draw.rounded_rectangle([(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)], radius=6, fill=(37, 99, 235, 255))
    draw.text((pill_x + 12, pill_y + 6), "TRUSTPAY AI", font=FONT_BADGE, fill=(255, 255, 255, 255))
    
    # Scene Badge & Title
    title_text = f"{cfg['badge']}  |  {cfg['title']}"
    draw.text((pill_x + pill_w + 24, 21), title_text, font=FONT_HEADER, fill=(248, 250, 252, 255))
    
    # Timer & Live indicator on top right
    m, s = divmod(int(current_sec), 60)
    tm, ts = divmod(int(total_sec), 60)
    time_str = f"{m:02d}:{s:02d} / {tm:02d}:{ts:02d}"
    draw.text((WIDTH - 240, 26), time_str, font=FONT_TIME, fill=(148, 163, 184, 255))
    
    # Red/Green live pulse dot
    dot_x = WIDTH - 45
    dot_y = 37
    draw.ellipse([(dot_x - 5, dot_y - 5), (dot_x + 5, dot_y + 5)], fill=(34, 197, 94, 255))
    
    # Progress line below header
    progress_pct = min(1.0, current_sec / total_sec)
    bar_w = int(WIDTH * progress_pct)
    draw.line([(0, header_h), (bar_w, header_h)], fill=(59, 130, 246, 255), width=3)
    
    # -------------------------------------------------------------
    # 2. Lower-Third Contextual Card
    # -------------------------------------------------------------
    card_w = 1320
    card_h = 60
    card_x = (WIDTH - card_w) // 2
    card_y = HEIGHT - card_h - 24
    
    # Semi-transparent dark slate backdrop with subtle blue border
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=8, fill=(15, 23, 42, 220))
    draw.rounded_rectangle([(card_x, card_y), (card_x + card_w, card_y + card_h)], radius=8, outline=(59, 130, 246, 140), width=1)
    
    # Subtitle text
    draw.text((card_x + 28, card_y + 19), cfg["subtitle"], font=FONT_SUBTITLE, fill=(241, 245, 249, 255))
    
    # Verification Badge Pill on the right side of lower third
    v_pill_x = card_x + card_w - 220
    v_pill_y = card_y + 14
    draw.rounded_rectangle([(v_pill_x, v_pill_y), (v_pill_x + 195, v_pill_y + 32)], radius=5, fill=(30, 41, 59, 255), outline=(71, 85, 105, 255))
    draw.text((v_pill_x + 15, v_pill_y + 6), "VERIFIED LIVE REPO", font=FONT_BADGE, fill=(56, 189, 248, 255))

    # Convert back to BGR
    result_bgr = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    return result_bgr

def render_video():
    with open(TIMELINE_JSON_PATH, "r") as f:
        timeline = json.load(f)
        
    total_audio_sec = timeline[-1]["total_end_sec"]
    total_frames = int(total_audio_sec * FPS)
    print(f"[*] Rendering Full HD 1080p Video: {total_frames} frames ({total_audio_sec:.2f}s) @ 30 FPS...")
    
    cached_images = load_cached_images()
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Launch ffmpeg process with stdin pipe for raw video
    ffmpeg_cmd = [
        ffmpeg_exe,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "bgr24",
        "-r", str(FPS),
        "-i", "-", # Stdin video stream
        "-i", MASTER_AUDIO_PATH, # Master mixed audio
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "faster",
        "-crf", "19",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        OUTPUT_VIDEO_PATH
    ]
    
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    
    # Process frame by frame
    current_frame = 0
    print("[*] Streaming frames to FFmpeg encoder...")
    
    for scene_idx, scene_info in enumerate(timeline):
        cfg = SCENE_CONFIG[scene_idx]
        start_frame = int(scene_info["start_sec"] * FPS)
        end_frame = int(scene_info["total_end_sec"] * FPS)
        scene_total_frames = max(1, end_frame - start_frame)
        
        # Calculate shots in this scene
        shots = cfg["shots"]
        shot_boundaries = []
        cur_shot_f = start_frame
        for shot_name, shot_ratio in shots:
            shot_len = int(scene_total_frames * shot_ratio)
            shot_boundaries.append((shot_name, cur_shot_f, cur_shot_f + shot_len))
            cur_shot_f += shot_len
        # Ensure last shot extends to end_frame
        shot_boundaries[-1] = (shot_boundaries[-1][0], shot_boundaries[-1][1], end_frame)
        
        for f_idx in range(start_frame, end_frame):
            cur_sec = f_idx / FPS
            
            # Find active shot
            active_shot_name = shots[0][0]
            for s_name, s_start, s_end in shot_boundaries:
                if s_start <= f_idx < s_end:
                    active_shot_name = s_name
                    shot_rel_f = f_idx - s_start
                    shot_duration_f = max(1, s_end - s_start)
                    break
            else:
                shot_rel_f = f_idx - start_frame
                shot_duration_f = scene_total_frames
                
            base_img = cached_images[active_shot_name]
            
            # Smooth subtle Ken Burns zoom (1.000 to 1.035)
            progress = shot_rel_f / shot_duration_f
            zoom = 1.0 + 0.035 * progress
            
            new_w = int(WIDTH * zoom)
            new_h = int(HEIGHT * zoom)
            resized = cv2.resize(base_img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            
            # Center crop to 1920x1080
            x_crop = (new_w - WIDTH) // 2
            y_crop = (new_h - HEIGHT) // 2
            cropped = resized[y_crop:y_crop + HEIGHT, x_crop:x_crop + WIDTH]
            
            # Smooth crossfade on first 12 frames of each scene
            if f_idx - start_frame < 12 and scene_idx > 0:
                prev_shot = SCENE_CONFIG[scene_idx - 1]["shots"][-1][0]
                prev_img = cached_images[prev_shot]
                alpha = (f_idx - start_frame) / 12.0
                cropped = cv2.addWeighted(cropped, alpha, prev_img, 1.0 - alpha, 0)
                
            # Composite HUD overlay
            final_frame = draw_hud_overlay(cropped, cfg, cur_sec, total_audio_sec)
            
            # Write raw bytes to ffmpeg pipe
            proc.stdin.write(final_frame.tobytes())
            
            current_frame += 1
            if current_frame % 300 == 0 or current_frame == total_frames:
                pct = (current_frame / total_frames) * 100
                print(f"  -> Encoded frame {current_frame}/{total_frames} ({pct:.1f}%) | {cur_sec:.1f}s")
                
    # Close pipe and wait for completion
    proc.stdin.close()
    _, stderr_data = proc.communicate()
    
    if proc.returncode != 0:
        print("[!] FFmpeg error:", stderr_data.decode("utf-8", errors="ignore"))
        raise RuntimeError("Video rendering failed in FFmpeg")
        
    print(f"\n[+] SUCCESS! Final video rendered successfully!")
    print(f"[+] Output: {OUTPUT_VIDEO_PATH}")
    file_size_mb = os.path.getsize(OUTPUT_VIDEO_PATH) / (1024 * 1024)
    print(f"[+] File Size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    render_video()
