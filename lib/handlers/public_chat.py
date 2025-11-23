from http.server import BaseHTTPRequestHandler
from lib._supabase import supabase_client
from lib.handlers._crud_helpers import send_json, read_json_body, allow_cors

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            body = read_json_body(self)
            query = body.get("query", "").strip()
            
            if not query:
                return send_json(self, 400, {"ok": False, "error": "Query is required"})

            supa = supabase_client() # Anon key is fine for reading
            
            # Perform search
            # Using 'websearch' type which handles plain text queries better
            # config='indonesian' matches the index we created
            res = supa.table("faq_kb") \
                .select("*") \
                .textSearch("question", query, {"type": "websearch", "config": "indonesian"}) \
                .limit(3) \
                .execute()
            
            matches = res.data
            
            # Fallback: if no matches with textSearch, try simple ilike on question or keywords
            if not matches:
                res_fallback = supa.table("faq_kb") \
                    .select("*") \
                    .or_(f"question.ilike.%{query}%,keywords.ilike.%{query}%") \
                    .limit(3) \
                    .execute()
                matches = res_fallback.data

            return send_json(self, 200, {
                "ok": True,
                "matches": matches
            })

        except Exception as e:
            print(f"Error in public_chat: {e}")
            return send_json(self, 500, {"ok": False, "error": str(e)})

    def do_OPTIONS(self):
        allow_cors(self, ["POST", "OPTIONS"])
