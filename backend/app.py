from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import uuid

app = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient('mongodb://mongo:27017/')
db = client['metaconfigurator']

@app.route('/file', methods=['POST'])
def add_file():
    file_content = request.json
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
