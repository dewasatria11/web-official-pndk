import http.server
import socketserver
import os
import sys
import json
import re
from urllib.parse import urlparse, parse_qs

# Add project root to path so api/index.py can import from lib
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from api.index import handler as ApiHandler
except ImportError as e:
    print(f"Error importing API handler: {e}")
    print("Make sure you are running this script from the project root.")
    sys.exit(1)

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

# Load rewrites from vercel.json
rewrites = []
try:
    with open('vercel.json', 'r') as f:
        config = json.load(f)
        rewrites = config.get('rewrites', [])
except Exception as e:
    print(f"Warning: Could not load vercel.json: {e}")

def apply_rewrites(path):
    for rule in rewrites:
        source = rule['source']
        destination = rule['destination']
        
        # Convert vercel dynamic params :param to regex named groups (?P<param>[^/]+)
        # Note: This is a simplified implementation
        regex_pattern = re.sub(r':([a-zA-Z0-9_]+)', r'(?P<\1>[^/]+)', source)
        regex_pattern = f"^{regex_pattern}$"
        
        match = re.match(regex_pattern, path)
        if match:
            # Substitute params in destination
            new_path = destination
            for key, value in match.groupdict().items():
                new_path = new_path.replace(f':{key}', value)
            return new_path
    return path

class LocalHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        self.handle_request('GET')

    def do_POST(self):
        self.handle_request('POST')

    def do_PUT(self):
        self.handle_request('PUT')

    def do_DELETE(self):
        self.handle_request('DELETE')
        
    def do_PATCH(self):
        self.handle_request('PATCH')

    def do_OPTIONS(self):
        self.handle_request('OPTIONS')

    def handle_request(self, method):
        # 1. Apply rewrites
        original_path = self.path
        rewritten_path = apply_rewrites(self.path)
        
        if rewritten_path != original_path:
            # Update path for the handler
            self.path = rewritten_path
        
        # 2. Check if it's an API request
        # The rewrite usually sends it to /api/index?action=...
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            # Delegate to Vercel API handler
            # We treat the ApiHandler class as a mixin/collection of methods
            if method == 'GET':
                ApiHandler.do_GET(self)
            elif method == 'POST':
                ApiHandler.do_POST(self)
            elif method == 'PUT':
                ApiHandler.do_PUT(self)
            elif method == 'DELETE':
                ApiHandler.do_DELETE(self)
            elif method == 'PATCH':
                ApiHandler.do_PATCH(self)
            elif method == 'OPTIONS':
                ApiHandler.do_OPTIONS(self)
            return

        # 3. Serve static files
        # Check if file exists in public dir
        # Remove query string for file check
        file_path = parsed.path
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = os.path.join(PUBLIC_DIR, file_path)
        
        # If directory, try index.html
        if os.path.isdir(full_path):
            if os.path.exists(os.path.join(full_path, 'index.html')):
                 # Let SimpleHTTPRequestHandler handle it (it defaults to index.html)
                 super().do_GET()
                 return
        
        # If file exists, serve it
        if os.path.exists(full_path) and os.path.isfile(full_path):
             if method == 'GET':
                super().do_GET()
             else:
                self.send_error(405, "Method Not Allowed for static files")
             return

        # 4. Fallback for SPA (Single Page App) or 404
        # For this project, we might just want to return 404 if not found
        # But if there's a specific 404 page, we could serve that.
        # For now, let default handler send 404
        if method == 'GET':
            super().do_GET()
        else:
             # API handler didn't catch it, and it's not a static file GET
            self.send_error(404, f"File not found: {self.path}")


print(f"Starting local server at http://localhost:{PORT}")
print(f"Serving static files from {PUBLIC_DIR}")
with socketserver.TCPServer(("", PORT), LocalHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()
