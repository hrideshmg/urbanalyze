import re

with open('/Users/gauthammohanraj/Developer/cloud/backend/app.py', 'r') as f:
    content = f.read()

# Make sure translate error has proper fallback
content = content.replace('print("Translation Error (Graceful Fallback):", str(e))\n        return jsonify({\n            "success": True, \n            "translated_text": text\n        }), 200', 'print("Translation Error (Graceful Fallback):", str(e))\n        return jsonify({\n            "success": True, \n            "translated_text": text\n        }), 200')

with open('/Users/gauthammohanraj/Developer/cloud/backend/app.py', 'w') as f:
    f.write(content)

