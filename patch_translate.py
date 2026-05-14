import re

with open('/Users/gauthammohanraj/Developer/cloud/backend/app.py', 'r') as f:
    content = f.read()

# Add imports
if "translate_v2" not in content:
    content = content.replace("from google.cloud import bigquery", "from google.cloud import bigquery\nfrom google.cloud import translate_v2 as translate")

# Add client
if "translate_client =" not in content:
    content = content.replace("bq_client = bigquery.Client(\n    project=PROJECT_ID\n)", "bq_client = bigquery.Client(\n    project=PROJECT_ID\n)\ntranslate_client = translate.Client(project=PROJECT_ID)")

# Add route
translate_route = """
# ----------------------------------------
# Translate Route
# ----------------------------------------
@app.route("/translate", methods=["POST"])
def translate_text():
    try:
        data = request.get_json()
        text = data.get("text")
        target_language = data.get("target_language", "hi")
        
        if not text:
            return jsonify({"success": False, "error": "No text provided"}), 400

        result = translate_client.translate(text, target_language=target_language)
        
        return jsonify({
            "success": True, 
            "translated_text": result["translatedText"]
        }), 200
    except Exception as e:
        print("Translation Error:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

# ----------------------------------------
# Run Server
"""

if "def translate_text():" not in content:
    content = content.replace("# ----------------------------------------\n# Run Server", translate_route)

with open('/Users/gauthammohanraj/Developer/cloud/backend/app.py', 'w') as f:
    f.write(content)

