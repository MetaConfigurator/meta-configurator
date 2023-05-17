from flask import Flask, jsonify, request
from pymongo import MongoClient
from jsonschema import validate, ValidationError
import json

app = Flask(__name__)
client = MongoClient('<your mongodb connection_string>')
db = client['<your database_name>']
collection = db['<your connection_name>']

def load_json_schema():
    with open('schema.json', 'r') as file:
        return json.load(file)

default_schema = load_json_schema()

@app.route('/schema', methods=['POST'])
def create_schema():
    try:
        schema = request.get_json()
        validate(instance=schema, schema=default_schema)
        schema_id = collection.insert_one(schema).inserted_id
        return jsonify({'message': 'Schema created successfully', 'schema_id': str(schema_id)}), 201
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/schema/<schema_id>', methods=['GET'])
def get_schema(schema_id):
    schema = collection.find_one({'_id': ObjectId(schema_id)})
    if schema:
        return jsonify(schema), 200
    else:
        return jsonify({'error': 'Schema not found'}), 404


if __name__ == '__main__':
    app.run(debug=True)
