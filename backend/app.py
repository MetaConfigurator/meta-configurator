from flask import Flask, jsonify, request
from pymongo import MongoClient
import urllib.parse
import uuid

app = Flask(__name__)
username = urllib.parse.quote_plus('<username>')
password = urllib.parse.quote_plus('<password>')
#connection string
client = MongoClient(f'mongodb+srv://{username}:{password}@cluster0.oclxqaq.mongodb.net/json_schema_db?retryWrites=true&w=majority')
db = client['<database name>']
collection = db['<collection name>']

@app.route('/data', methods=['GET'])
def get_data():
    data = list(collection.find({}, {'_id': False}))
    return jsonify(data)

# Generate a new ID and insert JSON data
@app.route('/data', methods=['POST'])
def create_data():
    data = request.get_json()
    data['_id'] = str(uuid.uuid4())
    collection.insert_one(data)
    return jsonify({'message': 'Data created successfully.'})

# Get a specific JSON data by ID
@app.route('/data/<id>', methods=['GET'])
def get_data_by_id(id):
    data = collection.find_one({'_id': id}, {'_id': False})
    if data:
        return jsonify(data)
    else:
        return jsonify({'message': 'Data not found.'}), 404

# Update a specific JSON data by ID
@app.route('/data/<id>', methods=['PUT'])
def update_data_by_id(id):
    data = request.get_json()
    result = collection.update_one({'_id': id}, {'$set': data})
    if result.modified_count == 1:
        return jsonify({'message': 'Data updated successfully.'})
    else:
        return jsonify({'message': 'Data not found or update failed.'}), 404

# Delete a specific JSON data by ID
@app.route('/data/<id>', methods=['DELETE'])
def delete_data_by_id(id):
    result = collection.delete_one({'_id': id})
    if result.deleted_count == 1:
        return jsonify({'message': 'Data deleted successfully.'})
    else:
        return jsonify({'message': 'Data not found or delete failed.'}), 404

if __name__ == '__main__':
    app.run()