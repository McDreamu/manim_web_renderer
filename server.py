import os
import shutil
import subprocess
import asyncio
from typing import List
from fastapi import FastAPI, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
import logging
import re

# Configuration
UPLOAD_DIR = "uploads"
MEDIA_DIR = "media"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MEDIA_DIR, exist_ok=True)

app = FastAPI()

# Mount frontend static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/media", StaticFiles(directory="media"), name="media")

# ==========================================
# HELPERS
# ==========================================
def cleanup_directories():
    """Wipes the uploads and media directories to ensure a fresh state."""
    for folder in [UPLOAD_DIR, MEDIA_DIR]:
        if os.path.exists(folder):
            shutil.rmtree(folder)
            os.makedirs(folder, exist_ok=True)

def verify_manim():
    """Checks if Manim is available in the system PATH."""
    return shutil.which("manim") is not None

# Startup check
if not verify_manim():
    print("WARNING: 'manim' command not found in PATH!")

# Store active connections for broadcasting logs
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.get("/")
async def read_index():
    from fastapi.responses import FileResponse
    return FileResponse("frontend/index.html")

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def run_manim(file_path: str, quality: str, preview: bool, transparent: bool):
    """
    Runs Manim command and streams output to WebSocket.
    """
    
    # Construct command
    # manim -ql file.py SceneName
    # We need to find the Scene Name automatically or render all scenes?
    # For simplicity, we'll try to let Manim render the first scene found or all.
    # Typically: manim -qm file.py
    
    cmd = ["manim", quality]
    if preview:
        pass # -p opens a window, we DON'T want that for web server. We want to generate the file.
             # Wait, the user checkbox says "Preview Automática". In a web context, that usually means
             # "Show me the video after". Manim's -p flag opens a local OS window.
             # We should IGNORE -p for the subprocess, but ensure we return the video url.
    
    if transparent:
        cmd.append("-t")
        
    # Output to our media dir?
    # Manim defaults to ./media. We can let it stick there and just serve it.
    
    cmd.append(file_path)
    
    # We'll allow Manim to pick the scene or render all.
    # To force it to render without asking, usually we provide a scene name or -a.
    # Let's verify if 'manim file.py' triggers interactive prompt if multiple scenes.
    # We will append '-a' (render all) to be safe for now, or assume single scene.
    # A safer bet is likely just passing the file and solving prompts if they occur.
    # BUT, prompting via subprocess is hard. Let's try adding '--format=mp4' just in case.
    
    # Actually, let's look for "Scene" subclasses in the file content? 
    # For now, let's just run it. If it fails due to scene ambiguity, we'll see the error log.
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    async def read_stream(stream, prefix):
        while True:
            line = await stream.readline()
            if line:
                decoded = line.decode('utf-8').strip()
                if decoded:
                    await manager.broadcast(f"{decoded}")
            else:
                break

    await asyncio.gather(
        read_stream(process.stdout, "OUT"),
        read_stream(process.stderr, "ERR")
    )

    await process.wait()
    return process.returncode

@app.post("/render")
async def render(
    file: UploadFile,
    quality: str = Form("-qm"),
    preview: bool = Form(True),
    transparent: bool = Form(False),
    vertical: bool = Form(False)
):
    # 1. Cleanup previous run
    cleanup_directories()
    
    # 2. Save the NEW file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    await manager.broadcast(f"Iniciando render de: {file.filename}")
    
    # 3. Construct Command
    cmd = ["manim", quality]
    
    if transparent:
        cmd.append("-t")
        
    if vertical:
        # Map quality to resolution (W,H swapped)
        # -ql: 854x480 -> 480x854
        # -qm: 1280x720 -> 720x1280
        # -qh: 1920x1080 -> 1080x1920
        # -qk: 3840x2160 -> 2160x3840
        resolutions = {
            "-ql": "480,854",
            "-qm": "720,1280",
            "-qh": "1080,1920",
            "-qk": "2160,3840"
        }
        res = resolutions.get(quality, "720,1280")
        cmd.extend(["--resolution", res])
        
    cmd.append(file_path)

    # Env vars to force unbuffered output
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )

    async def read_stream(stream, prefix):
        # Generic pattern to catch C:\Users\Name ...
        path_regex = re.compile(r'[a-zA-Z]:[\\/]+Users[\\/]+[^\\/]+', re.IGNORECASE)
        
        # Patterns to suppress/simplify verbose file logs
        # We use .* to match everything until the newline (chunk processing usually preserves lines or splits them, but 8KB is large enough)
        # Regex explanation:
        # File ready at .*  -> Matches "File ready at 'C:\Users...'" until end of string/newline
        file_ready_pattern = re.compile(r"File ready at.*", re.IGNORECASE)
        movie_written_pattern = re.compile(r"movie file written in.*", re.IGNORECASE)
        
        # Generic catch-all for any other leaked USER paths
        # Matches C:\Users\Name... until a quote, space, or newline
        # r'[a-zA-Z]:[\\/]+Users[\\/]+.+?(?=['"\s\r\n])'
        path_regex = re.compile(r"[a-zA-Z]:[\\/]+Users[\\/]+.+?(?=['\"\s\r\n])", re.IGNORECASE)

        while True:
            # Chunk size 8192
            chunk = await stream.read(8192)
            if chunk:
                decoded = chunk.decode('utf-8', errors='replace')
                
                # 1. Simplify verbose render messages FIRST (Eat the whole line)
                decoded = file_ready_pattern.sub("File ready!", decoded)
                decoded = movie_written_pattern.sub("Movie file generated.", decoded)

                # 2. Apply generic user path mask to anything else remaining
                decoded = path_regex.sub("...", decoded)
                
                if decoded:
                    await manager.broadcast(decoded)
            else:
                break

    await asyncio.gather(
        read_stream(process.stdout, "OUT"),
        read_stream(process.stderr, "ERR")
    )

    await process.wait()
    return_code = process.returncode
    
    if return_code == 0:
        # Find the generated video
        # Default Manim structure: media/videos/{file_name}/{quality}/{SceneName}.mp4
        # We need to find the newest mp4 file in the media folder recursively.
        
        # Assumption: Simple project structure where Manim runs in CWD
        video_files = []
        image_files = []
        for root, dirs, files in os.walk("media"):
            for f in files:
                if f.endswith(".mp4"):
                    video_files.append(os.path.join(root, f))
                elif f.endswith(".png"):
                    image_files.append(os.path.join(root, f))
        
        # Get the most recently modified video file
        if video_files:
            latest_video = max(video_files, key=os.path.getmtime)
            web_path = latest_video.replace("\\", "/")
            return {"status": "success", "file_url": f"/{web_path}", "type": "video"}
        elif image_files:
            latest_image = max(image_files, key=os.path.getmtime)
            web_path = latest_image.replace("\\", "/")
            return {"status": "success", "file_url": f"/{web_path}", "type": "image"}
        else:
             return JSONResponse(status_code=500, content={"detail": "Render finished but no media found."})
    else:
        return JSONResponse(status_code=500, content={"detail": "Manim failed to render."})

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
