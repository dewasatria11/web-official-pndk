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
            
            # 1. Primary Search: Full Text Search on 'question'
            # Good for natural language queries
            res = supa.table("faq_kb") \
                .select("*") \
                .textSearch("question", query, {"type": "websearch", "config": "indonesian"}) \
                .limit(3) \
                .execute()
            
            matches = res.data
            
            # 2. Secondary Search: Full Text Search on 'keywords'
            # If question didn't match, maybe keywords will
            if not matches:
                res_kw = supa.table("faq_kb") \
                    .select("*") \
                    .textSearch("keywords", query, {"type": "websearch", "config": "indonesian"}) \
                    .limit(3) \
                    .execute()
                matches = res_kw.data

            # 3. Fallback: Word-based partial match (AND logic)
            # Splits query into words and ensures ALL words exist in either question OR keywords
            # Example: "biaya daftar" -> (question/kw has "biaya") AND (question/kw has "daftar")
            if not matches:
                words = [w for w in query.split() if len(w) >= 2] # Ignore single chars
                if words:
                    req = supa.table("faq_kb").select("*")
                    for word in words:
                        # Chain .or_() filters. In PostgREST, chaining filters means AND.
                        # So this becomes: (q ILIKE %w1% OR k ILIKE %w1%) AND (q ILIKE %w2% OR k ILIKE %w2%) ...
                        req = req.or_(f"question.ilike.%{word}%,keywords.ilike.%{word}%")
                    
                    res_fallback = req.limit(3).execute()
                    matches = res_fallback.data

            # 4. Last Resort: Any word match (OR logic) - Optional
            # If strict AND failed, try to find ANY word match (limit 1 to be safe)
            if not matches and len(words) > 1:
                 req = supa.table("faq_kb").select("*")
                 # Construct one big OR filter: q.ilike.w1,k.ilike.w1,q.ilike.w2,k.ilike.w2...
                 or_conditions = []
                 for word in words:
                     or_conditions.append(f"question.ilike.%{word}%")
                     or_conditions.append(f"keywords.ilike.%{word}%")
                 
                 req = req.or_(",".join(or_conditions))
                 res_last = req.limit(1).execute()
                 matches = res_last.data

            return send_json(self, 200, {
                "ok": True,
                "matches": matches
            })

        except Exception as e:
            print(f"Error in public_chat: {e}")
            return send_json(self, 500, {"ok": False, "error": str(e)})

    def do_OPTIONS(self):
        allow_cors(self, ["POST", "OPTIONS"])
