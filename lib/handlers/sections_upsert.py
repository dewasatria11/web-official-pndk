"""
API Handler: POST /api/index?action=sections_upsert
Upsert section metadata + translations (ID & EN) with admin token auth.
"""
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone
import json
import os

from lib._supabase import supabase_client

ADMIN_API_TOKEN = os.getenv("ADMIN_API_TOKEN")


def _unauthorized(handler):
    handler.send_response(401)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps({"error": "Unauthorized"}).encode("utf-8"))


class handler(BaseHTTPRequestHandler):
    @staticmethod
    def do_POST(request_handler):
        if request_handler.command != "POST":
            handler._method_not_allowed(request_handler)
            return

        auth_header = request_handler.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.lower().startswith("bearer ") else None
        if not token or token != ADMIN_API_TOKEN:
            _unauthorized(request_handler)
            return

        try:
            content_length = int(request_handler.headers.get("Content-Length", 0))
            raw_body = request_handler.rfile.read(content_length) if content_length else b""
            payload = json.loads(raw_body.decode("utf-8") or "{}") if raw_body else {}
        except json.JSONDecodeError:
            request_handler.send_response(400)
            request_handler.send_header("Content-Type", "application/json")
            request_handler.send_header("Access-Control-Allow-Origin", "*")
            request_handler.end_headers()
            request_handler.wfile.write(json.dumps({"error": "Invalid JSON body"}).encode("utf-8"))
            return

        slug = payload.get("slug")
        if not slug or not isinstance(slug, str):
            request_handler.send_response(400)
            request_handler.send_header("Content-Type", "application/json")
            request_handler.send_header("Access-Control-Allow-Origin", "*")
            request_handler.end_headers()
            request_handler.wfile.write(json.dumps({"error": "Invalid slug"}).encode("utf-8"))
            return

        try:
            supa = supabase_client(service_role=True)
            supa.table("sections").upsert({"slug": slug}).execute()
            section_res = (
                supa.table("sections")
                .select("id")
                .eq("slug", slug)
                .limit(1)
                .execute()
            )
            if not section_res.data:
                raise RuntimeError("Failed to fetch section")
            section_id = section_res.data[0]["id"]

            rows = []
            timestamp = datetime.now(timezone.utc).isoformat()
            id_payload = payload.get("id")
            en_payload = payload.get("en")
            if isinstance(id_payload, dict):
                rows.append({
                    "section_id": section_id,
                    "locale": "id",
                    "title": id_payload.get("title"),
                    "body": id_payload.get("body"),
                    "updated_at": timestamp,
                })
            if isinstance(en_payload, dict):
                rows.append({
                    "section_id": section_id,
                    "locale": "en",
                    "title": en_payload.get("title"),
                    "body": en_payload.get("body"),
                    "updated_at": timestamp,
                })

            if rows:
                supa.table("section_translations").upsert(
                    rows,
                    on_conflict="section_id,locale",
                ).execute()

            request_handler.send_response(200)
            request_handler.send_header("Content-Type", "application/json")
            request_handler.send_header("Access-Control-Allow-Origin", "*")
            request_handler.end_headers()
            request_handler.wfile.write(json.dumps({"ok": True, "section_id": section_id}).encode("utf-8"))

        except Exception as exc:
            request_handler.send_response(500)
            request_handler.send_header("Content-Type", "application/json")
            request_handler.send_header("Access-Control-Allow-Origin", "*")
            request_handler.end_headers()
            request_handler.wfile.write(json.dumps({"error": str(exc) or "server error"}).encode("utf-8"))

    @staticmethod
    def do_OPTIONS(request_handler):
        request_handler.send_response(200)
        request_handler.send_header("Access-Control-Allow-Origin", "*")
        request_handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        request_handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        request_handler.end_headers()

    @staticmethod
    def _method_not_allowed(request_handler):
        request_handler.send_response(405)
        request_handler.send_header("Content-Type", "application/json")
        request_handler.send_header("Access-Control-Allow-Origin", "*")
        request_handler.end_headers()
        request_handler.wfile.write(json.dumps({"error": "Method not allowed"}).encode("utf-8"))
