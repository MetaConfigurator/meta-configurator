from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import uuid
import logging
import os
from datetime import datetime

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
    try:
        file_content = request.json
        if not is_file_length_valid(file_content):
            return jsonify({'error': 'File too large'}), 413

        file_id = str(uuid.uuid4())
        creation_date = datetime.utcnow().isoformat()
        collection = db['files']
        collection.insert_one({
            '_id': file_id,
            'file': file_content,
            'metadata': {
                'creationDate': creation_date
            }
        })
        return jsonify({'uuid': file_id}), 201
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/file/<id>', methods=['GET'])
def get_file(id):
    try:
        collection = db['files']
        result = collection.find_one({'_id': id}, {'_id': False})
        if not result:
            return jsonify({'error': 'File not found'}), 404

        return jsonify(result['file'])
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/session', methods=['POST'])
def add_session():
    try:
        data = request.json.get('data')
        schema = request.json.get('schema')
        settings = request.json.get('settings')
        session_id = request.json.get('session_id')

        if not all([data, schema, settings]):
            return jsonify({'error': 'Missing data, schema, or settings'}), 400

        if not all(map(is_file_length_valid, [data, schema, settings])):
            return jsonify({'error': 'One or more files too large'}), 413

        # Check if session ID already exists
        if session_id and db['sessions'].find_one({'_id': session_id}):
            return jsonify({'error': 'Session ID already exists'}), 409

        # Generate UUIDs for each file and the session if not provided
        data_id = str(uuid.uuid4())
        schema_id = str(uuid.uuid4())
        settings_id = str(uuid.uuid4())
        if not session_id:
            session_id = str(uuid.uuid4())

        creation_date = datetime.utcnow().isoformat()

        # Store each file
        files_collection = db['files']
        files_collection.insert_one({
            '_id': data_id,
            'file': data,
            'metadata': {
                'creationDate': creation_date
            }
        })
        files_collection.insert_one({
            '_id': schema_id,
            'file': schema,
            'metadata': {
                'creationDate': creation_date
            }
        })
        files_collection.insert_one({
            '_id': settings_id,
            'file': settings,
            'metadata': {
                'creationDate': creation_date
            }
        })

        # Store the session
        sessions_collection = db['sessions']
        sessions_collection.insert_one({
            '_id': session_id,
            'data_id': data_id,
            'schema_id': schema_id,
            'settings_id': settings_id,
            'metadata': {
                'creationDate': creation_date
            }
        })

        return jsonify({'session_id': session_id}), 201
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/session/<id>', methods=['GET'])
def get_session(id):
    try:
        sessions_collection = db['sessions']
        session = sessions_collection.find_one({'_id': id})
        if not session:
            app.logger.error('Session not found: %s', id)
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
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
