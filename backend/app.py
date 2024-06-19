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
        if not file_content:
            return jsonify({'error': 'Missing file content'}), 400
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

@app.route('/snapshot', methods=['POST'])
def add_snapshot():
    try:
        request_data = request.json
        if not request_data:
            return jsonify({'error': 'Missing request data'}), 400
        if 'data' not in request_data or 'schema' not in request_data or 'settings' not in request_data:
            return jsonify({'error': 'Missing data, schema, or settings'}), 400

        data = request_data.get('data')
        schema = request_data.get('schema')
        settings = request_data.get('settings')
        snapshot_id = request_data.get('snapshot_id')

        if not all(map(is_file_length_valid, [data, schema, settings])):
            return jsonify({'error': 'One or more files too large'}), 413

        # Check if snapshot ID already exists
        if snapshot_id and db['snapshots'].find_one({'_id': snapshot_id}):
            return jsonify({'error': 'Snapshot ID already exists'}), 409

        # Generate UUIDs for each file and the snapshot if not provided
        data_id = str(uuid.uuid4())
        schema_id = str(uuid.uuid4())
        settings_id = str(uuid.uuid4())
        if not snapshot_id:
            snapshot_id = str(uuid.uuid4())

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

        # Store the snapshot
        snapshots_collection = db['snapshots']
        snapshots_collection.insert_one({
            '_id': snapshot_id,
            'data_id': data_id,
            'schema_id': schema_id,
            'settings_id': settings_id,
            'metadata': {
                'creationDate': creation_date
            }
        })

        return jsonify({'snapshot_id': snapshot_id}), 201
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/snapshot/<id>', methods=['GET'])
def get_snapshot(id):
    try:
        snapshots_collection = db['snapshots']
        snapshot = snapshots_collection.find_one({'_id': id})
        if not snapshot:
            return jsonify({'error': 'Snapshot not found'}), 404

        files_collection = db['files']
        data = files_collection.find_one({'_id': snapshot['data_id']}, {'_id': False})
        schema = files_collection.find_one({'_id': snapshot['schema_id']}, {'_id': False})
        settings = files_collection.find_one({'_id': snapshot['settings_id']}, {'_id': False})

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
