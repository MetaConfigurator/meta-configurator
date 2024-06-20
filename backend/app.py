from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import uuid
import logging
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from apscheduler.schedulers.background import BackgroundScheduler

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
RETENTION_PERIOD = timedelta(days=60)  # Snapshots not accessed for 60 days will be deleted

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
        app.logger.error(f'Error adding file: {e}')
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
        app.logger.error(f'Error getting file: {e}')
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
        edit_password = request_data.get('edit_password')
        author = request_data.get('author', None)  # Get author if provided, else None

        if not all(map(is_file_length_valid, [data, schema, settings])):
            return jsonify({'error': 'One or more files too large'}), 413

        snapshots_collection = db['snapshots']
        snapshot = snapshots_collection.find_one({'_id': snapshot_id}) if snapshot_id else None

        # Check if snapshot ID already exists
        if snapshot:
            if not check_password_hash(snapshot['edit_password'], edit_password):
                return jsonify({'error': 'Snapshot ID already exists with a different password'}), 409
            # Overwrite the existing snapshot
            snapshots_collection.delete_one({'_id': snapshot_id})

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
        snapshot_document = {
            '_id': snapshot_id,
            'data_id': data_id,
            'schema_id': schema_id,
            'settings_id': settings_id,
            'edit_password': generate_password_hash(edit_password),
            'metadata': {
                'creationDate': creation_date
                'lastAccessed': creation_date,
                'accessCount': 0
            }
        }
        if author:
            snapshot_document['metadata']['author'] = author
        snapshots_collection.insert_one(snapshot_document)

        return jsonify({'snapshot_id': snapshot_id}), 201
    except Exception as e:
        app.logger.error(f'Error adding snapshot: {e}')
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

        # Update the last accessed time and increment access count
        snapshots_collection.update_one(
            {'_id': id},
            {'$set': {'metadata.lastAccessed': datetime.utcnow().isoformat()}, '$inc': {'metadata.accessCount': 1}}
        )

        response = {
            'data': data['file'],
            'schema': schema['file'],
            'settings': settings['file']
        }

        if 'author' in snapshot['metadata']:
            response['author'] = snapshot['metadata']['author']

        return jsonify(response)

    except Exception as e:
        app.logger.error(f'Error getting snapshot: {e}')
        return jsonify({'error': 'Internal server error'}), 500


def cleanup_old_snapshots():
    try:
        cutoff_date = datetime.utcnow() - RETENTION_PERIOD
        snapshots_collection = db['snapshots']
        files_collection = db['files']

        # Delete snapshots not accessed in the last X days
        old_snapshots = snapshots_collection.find({'metadata.lastAccessed': {'$lt': cutoff_date.isoformat()}})
        old_snapshot_ids = [snapshot['_id'] for snapshot in old_snapshots]
        old_file_ids = []

        for snapshot in old_snapshots:
            old_file_ids.extend([snapshot['data_id'], snapshot['schema_id'], snapshot['settings_id']])

        snapshots_collection.delete_many({'_id': {'$in': old_snapshot_ids}})

        # Delete files not linked to any snapshot
        linked_file_ids = snapshots_collection.distinct('data_id') + snapshots_collection.distinct('schema_id') + snapshots_collection.distinct('settings_id')
        unlinked_files = files_collection.find({'_id': {'$nin': linked_file_ids}})
        unlinked_file_ids = [file['_id'] for file in unlinked_files]
        files_collection.delete_many({'_id': {'$in': unlinked_file_ids}})

        app.logger.info('Cleanup completed successfully.')
    except Exception as e:
        app.logger.error(f'Error during cleanup: {e}')


# Schedule the cleanup job to run once per day
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_snapshots, 'interval', days=1)
scheduler.start()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
