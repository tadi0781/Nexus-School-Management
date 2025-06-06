# app.py
from flask import Flask, render_template, request, jsonify
import os
import json
import subprocess
from datetime import timedelta
import requests  # Added for API calls

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "abigiya_secret_key_dev")
app.permanent_session_lifetime = timedelta(minutes=60)

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable not set. Chatbot will not function.")
MODEL_NAME = "gemini-2.0-flash"  # The model that works for you

UPLOAD_FOLDER = 'uploadFiles'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- Helper Functions ---

def extract_text_from_file(file_path):
    """Reads text from various file types."""
    _, file_extension = os.path.splitext(file_path)
    if file_extension.lower() == '.pdf':
        try:
            result = subprocess.run(['pdftotext', file_path, '-'], capture_output=True, text=True, check=True)
            return result.stdout
        except (subprocess.CalledProcessError, FileNotFoundError):
            return "Error: Could not extract text from the PDF file. Is 'poppler' installed?"
    elif file_extension.lower() in ['.txt', '.py', '.json', '.csv', '.html', '.css', '.js']:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception:
            return f"Error: Could not read the file {os.path.basename(file_path)}."
    else:
        return ""

def call_gemini_api(prompt, file_content=""):
    """Calls the Gemini API using requests library."""
    combined_prompt = prompt + "\n\n--- Context from folder contents ---\n" + file_content if file_content else prompt
    
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}'
    payload = {"contents": [{"parts": [{"text": combined_prompt}]}]}
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()  # Raises exception for 4XX/5XX errors
        response_json = response.json()
        
        if "candidates" in response_json and response_json["candidates"]:
            return response_json["candidates"][0]["content"]["parts"][0]["text"]
        elif "error" in response_json:
            return f"API Error: {response_json['error'].get('message', 'Unknown error')}"
        return "Sorry, I couldn't generate a proper response."
    except requests.exceptions.RequestException as e:
        print(f"Error during API call: {e}")
        return "Error: Could not process your request. Please try again later."
    except Exception as e:
        print(f"Unexpected error: {e}")
        return "An unexpected error occurred."

# --- Routes ---

@app.route("/")
def chatbot_page():
    """Serves the main ABIGIYA chatbot page."""
    return render_template(
        "abigiya_chat.html",
        title="ABIGIYA Chatbot"
    )

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """The API endpoint that the frontend JavaScript calls."""
    if not GEMINI_API_KEY:
        return jsonify({"error": "AI service is not configured."}), 503
    
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Invalid request format."}), 400
    
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    # Process files in the upload folder
    all_files_content = []
    try:
        files_in_dir = os.listdir(app.config['UPLOAD_FOLDER'])
        if not files_in_dir:
            all_files_content.append("Note to AI: The user's 'uploadFiles' directory is currently empty.")
        else:
            for filename in files_in_dir[:5]:  # Limit to 5 files to prevent overload
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if os.path.isfile(file_path):
                    all_files_content.append(f"--- START OF FILE: {filename} ---\n")
                    content = extract_text_from_file(file_path)
                    all_files_content.append(content[:10000])  # Limit each file to 10k chars
                    all_files_content.append(f"\n--- END OF FILE: {filename} ---\n\n")
    except Exception as e:
        app.logger.error(f"Error processing files: {e}", exc_info=True)
        all_files_content = ["Note to AI: An error occurred while trying to access the user's files."]
    
    combined_content_string = "".join(all_files_content)

    try:
        gemini_reply = call_gemini_api(user_message, combined_content_string)
        return jsonify({"reply": gemini_reply})
    except Exception as e:
        app.logger.error(f"Error during Gemini interaction: {e}", exc_info=True)
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True)
