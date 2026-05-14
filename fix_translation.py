import re

with open('/Users/gauthammohanraj/Developer/cloud/backend/app.py', 'r') as f:
    content = f.read()

# Update the translation route to handle the API response correctly
updated_route = """@app.route("/translate", methods=["POST"])
def translate_text():
    try:
        data = request.get_json()
        text = data.get("text")
        target_language = data.get("target_language", "hi")
        
        if not text:
            return jsonify({"success": False, "error": "No text provided"}), 400

        url = "https://translation.googleapis.com/language/translate/v2"
        params = {
            "key": os.getenv("TRANSLATE_API_KEY", os.getenv("GEMINI_API_KEY")),
            "q": text,
            "target": target_language
        }
        
        response = requests.post(url, params=params)
        res_json = response.json()
        
        if "data" in res_json and "translations" in res_json["data"]:
            translated_text = res_json["data"]["translations"][0]["translatedText"]
        else:
            print("Translation API error:", res_json)
            translated_text = text

        return jsonify({
            "success": True, 
            "translated_text": translated_text
        }), 200
    except Exception as e:
        print("Translation Error (Graceful Fallback):", str(e))
        return jsonify({
            "success": True, 
            "translated_text": text
        }), 200"""

content = re.sub(r'@app\.route\("/translate", methods=\["POST"\]\)\ndef translate_text\(\):.*?return jsonify\(\{\n            "success": True, \n            "translated_text": text\n        \}\), 200', updated_route, content, flags=re.DOTALL)

with open('/Users/gauthammohanraj/Developer/cloud/backend/app.py', 'w') as f:
    f.write(content)
