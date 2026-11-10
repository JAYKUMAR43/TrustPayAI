import os
import wave
import json
import numpy as np
import subprocess
import imageio_ffmpeg
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.generate_voiceover_tracks import SCENE_SCRIPTS, AUDIO_DIR

DOCS_DIR = os.path.dirname(AUDIO_DIR)
MASTER_AUDIO_PATH = os.path.join(DOCS_DIR, "master_audio.wav")
TIMELINE_JSON_PATH = os.path.join(DOCS_DIR, "scene_timeline.json")

def build_master_audio():
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    sample_rate = 44100
    pause_samples = int(0.4 * sample_rate) # 0.4s pause between scenes
    
    all_voice_samples = []
    timeline = []
    current_sample = 0
    
    print("[*] Concatenating voiceover tracks...")
    for idx, item in enumerate(SCENE_SCRIPTS):
        wav_file = os.path.join(AUDIO_DIR, f"{item['id']}.wav")
        with wave.open(wav_file, 'rb') as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            data = wf.readframes(n_frames)
            
            # Read int16 audio
            raw_audio = np.frombuffer(data, dtype=np.int16)
            if n_channels == 2:
                # Keep stereo
                raw_audio = raw_audio.reshape(-1, 2)
            else:
                raw_audio = np.column_stack((raw_audio, raw_audio))
                
        start_sec = current_sample / sample_rate
        n_audio_samples = len(raw_audio)
        all_voice_samples.append(raw_audio)
        current_sample += n_audio_samples
        end_sec = current_sample / sample_rate
        
        # Add pause buffer
        pause_block = np.zeros((pause_samples, 2), dtype=np.int16)
        all_voice_samples.append(pause_block)
        current_sample += pause_samples
        scene_total_end = current_sample / sample_rate
        
        timeline.append({
            "index": idx,
            "id": item["id"],
            "title": item["title"],
            "start_sec": round(start_sec, 2),
            "end_sec": round(end_sec, 2),
            "total_end_sec": round(scene_total_end, 2),
            "duration": round(scene_total_end - start_sec, 2)
        })
        print(f"  Scene {idx+1}: {item['title']} -> {start_sec:.2f}s to {scene_total_end:.2f}s ({scene_total_end - start_sec:.2f}s)")
        
    voice_track = np.vstack(all_voice_samples)
    total_samples = len(voice_track)
    total_duration_sec = total_samples / sample_rate
    print(f"\n[+] Total voice track length: {total_duration_sec:.2f}s (~{total_duration_sec/60:.2f} min)")
    
    # -------------------------------------------------------------
    # Synthesize Ambient Fintech Pad / Harmonic Background Track
    # -------------------------------------------------------------
    print("[*] Synthesizing elegant ambient soundtrack...")
    t = np.linspace(0, total_duration_sec, total_samples, endpoint=False)
    
    # Chord progression: Cmaj7 (C4, E4, G4, B4) -> Am7 (A3, C4, E4, G4) -> Fmaj7 (F3, A3, C4, E4) -> Gsus4 (G3, C4, D4, G4)
    # 8-second cycle per chord
    chord_freqs = [
        [261.63, 329.63, 392.00, 493.88], # Cmaj7
        [220.00, 261.63, 329.63, 392.00], # Am7
        [174.61, 220.00, 261.63, 329.63], # Fmaj7
        [196.00, 261.63, 293.66, 392.00]  # Gsus4
    ]
    
    music = np.zeros(total_samples, dtype=np.float32)
    chord_duration = 8.0 # seconds
    n_chords = len(chord_freqs)
    
    for i, chord in enumerate(chord_freqs):
        mask = (t % (n_chords * chord_duration) >= i * chord_duration) & (t % (n_chords * chord_duration) < (i + 1) * chord_duration)
        sub_t = t[mask]
        # Gentle swell / envelope
        cycle_pos = (sub_t % chord_duration) / chord_duration
        envelope = np.sin(np.pi * cycle_pos) ** 0.5
        
        chord_wave = np.zeros_like(sub_t)
        for freq in chord:
            # Fundamental + soft harmonics
            chord_wave += 0.5 * np.sin(2 * np.pi * freq * sub_t)
            chord_wave += 0.25 * np.sin(2 * np.pi * (freq * 2) * sub_t)
            chord_wave += 0.12 * np.sin(2 * np.pi * (freq * 0.5) * sub_t) # Warm sub-bass
            
        music[mask] += (chord_wave * envelope).astype(np.float32)
        
    # Normalize music and scale down so it sits softly in the mix (-22dB)
    music = music / (np.max(np.abs(music)) + 1e-6)
    music_stereo = np.column_stack((music * 0.09, music * 0.09)) # 9% amplitude
    
    # Mix Voiceover (int16 float conversion) + Music
    voice_float = voice_track.astype(np.float32) / 32768.0
    mixed = voice_float + music_stereo
    
    # Soft limiter / clipping protection
    max_peak = np.max(np.abs(mixed))
    if max_peak > 0.95:
        mixed = mixed * (0.95 / max_peak)
        
    mixed_int16 = (mixed * 32767.0).astype(np.int16)
    
    # Save master audio
    with wave.open(MASTER_AUDIO_PATH, 'wb') as out_wf:
        out_wf.setnchannels(2)
        out_wf.setsampwidth(2)
        out_wf.setframerate(sample_rate)
        out_wf.writeframes(mixed_int16.tobytes())
        
    print(f"[+] Master Audio Saved to: {MASTER_AUDIO_PATH}")
    
    with open(TIMELINE_JSON_PATH, "w") as f:
        json.dump(timeline, f, indent=2)
    print(f"[+] Timeline JSON Saved to: {TIMELINE_JSON_PATH}")
    
    return timeline, MASTER_AUDIO_PATH

if __name__ == "__main__":
    build_master_audio()
