from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import uuid
import logging
import os

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Get MongoDB credentials and connection info from environment variables
MONGO_USER = os.getenv('MONGO_USER', 'root')
MONGO_PASS = os.getenv('MONGO_PASS', 'example')
MONGO_HOST = os.getenv('MONGO_HOST', 'mongo')
MONGO_PORT = os.getenv('MONGO_PORT', '27017')
MONGO_DB = os.getenv('MONGO_DB', 'metaconfigurator')

# Log connection string for debugging purposes
app.logger.debug(f'Connecting to MongoDB at mongodb://{MONGO_USER}:<hidden>@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}')

# MongoDB connection
client = MongoClient(host=MONGO_HOST, port=int(MONGO_PORT), username=MONGO_USER, password=MONGO_PASS, authSource="admin")
db = client[MONGO_DB]

MAX_FILE_LENGTH = 500000  # 500,000 bytes = 500 KB

def is_file_length_valid(file_content):
    return len(str(file_content)) <= MAX_FILE_LENGTH

@app.route('/file', methods=['POST'])
def add_file():
    file_content = request.json
    if not is_file_length_valid(file_content):
        return jsonify({'error': 'File too large'}), 413
    file_id = str(uuid.uuid4())
    collection = db['files']
    collection.insert_one({'_id': file_id, 'file': file_content})
    return jsonify({'uuid': file_id}), 201

@app.route('/file/<uuid>', methods=['GET'])
def get_file(uuid):
    collection = db['files']
    result = collection.find_one({'_id': uuid}, {'_id': False})
    if not result:
        return jsonify({'error': 'File not found'}), 404

    return jsonify(result['file'])

@app.route('/session', methods=['POST'])
def add_session():
    data = request.json.get('data')
    schema = request.json.get('schema')
    settings = request.json.get('settings')

    if not all([data, schema, settings]):
        return jsonify({'error': 'Missing data, schema, or settings'}), 400

    if not all(map(is_file_length_valid, [data, schema, settings])):
        return jsonify({'error': 'One or more files too large'}), 413

    # Generate UUIDs for each file and the session
    data_id = str(uuid.uuid4())
    schema_id = str(uuid.uuid4())
    settings_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())

    # Store each file
    files_collection = db['files']
    files_collection.insert_one({'_id': data_id, 'file': data})
    files_collection.insert_one({'_id': schema_id, 'file': schema})
    files_collection.insert_one({'_id': settings_id, 'file': settings})

    # Store the session
    sessions_collection = db['sessions']
    sessions_collection.insert_one({
        '_id': session_id,
        'data_id': data_id,
        'schema_id': schema_id,
        'settings_id': settings_id
    })

    return jsonify({'session_uuid': session_id}), 201

@app.route('/session/<uuid>', methods=['GET'])
def get_session(uuid):
    sessions_collection = db['sessions']
    session = sessions_collection.find_one({'_id': uuid})
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    files_collection = db['files']
    data = files_collection.find_one({'_id': session['data_id']}, {'_id': False})
    schema = files_collection.find_one({'_id': session['schema_id']}, {'_id': False})
    settings = files_collection.find_one({'_id': session['settings_id']}, {'_id': False})

    if not all([data, schema, settings]):
        return jsonify({'error': 'One or more files not found'}), 404

    return jsonify({
        'data': data['file'],
        'schema': schema['file'],
        'settings': settings['file']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
