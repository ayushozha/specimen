"""Turn a folder of time-stamped screencast frames (<ms>.jpg) into a 30 fps H.264 clip.
Usage: python make_clip.py FRAMES_DIR START_MS END_MS SPEED OUT.mp4 [WIDTH]
Each frame is held until the next one arrived, so the clip keeps real timing; SPEED > 1 plays it faster."""
import os, subprocess, sys, tempfile
d, a, b, speed, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
width = sys.argv[6] if len(sys.argv) > 6 else None
stamps = sorted(int(f.split('.')[0]) for f in os.listdir(d) if f[0].isdigit())
before = [t for t in stamps if t <= a]
frames = ([before[-1]] if before else []) + [t for t in stamps if a < t < b]
with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as f:
    for i, t in enumerate(frames):
        nxt = frames[i + 1] if i + 1 < len(frames) else b
        f.write(f"file '{os.path.abspath(os.path.join(d, f'{t:07d}.jpg'))}'\nduration {(min(nxt, b) - max(t, a)) / 1000 / speed:.4f}\n")
    f.write(f"file '{os.path.abspath(os.path.join(d, f'{frames[-1]:07d}.jpg'))}'\n")
    lst = f.name
vf = 'fps=30' + (f',scale={width}:-2:flags=lanczos' if width else '') + ',format=yuv420p'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', vf, '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-g', '15', '-movflags', '+faststart', out], check=True)
print(out, subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
