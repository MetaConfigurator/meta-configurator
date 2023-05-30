import urllib.parse
from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId


app = Flask(__name__)

# Connect to MongoDB
username = urllib.parse.quote_plus('<username of your mongodb account>')
password = urllib.parse.quote_plus('<password of your mongodb account>')
#connection string from mongodb, change according to your setting
client = MongoClient(f'mongodb+srv://{username}:{password}@cluster0.oclxqaq.mongodb.net/json_schema_db?retryWrites=true&w=majority')

db = client['json_schema_db']  # Replace 'your_database_name' with the actual name of your database
collection = db['json_schemas']  # Replace 'your_collection_name' with the actual name of your collection



@app.route('/data', methods=['POST'])
def post_data():
    data = request.json

    if data:
        # Insert the JSON data into the database
        result = collection.insert_one(data)
        inserted_id = str(result.inserted_id)

        return jsonify({'id': inserted_id}), 201
    else:
        return jsonify({'error': 'Invalid JSON data'}), 400

@app.route('/data/<string:data_id>', methods=['GET'])
def get_data(data_id):
    # Find the data in the database using the provided data_id
    data = collection.find_one({'_id': ObjectId(data_id)})
    #data = {
    #   'message': 'This is the data you requested',
    #    'value': 42
    #}
   #return jsonify(data)
    if data:
        del data["_id"]
        print(data)
        return jsonify(data), 200
    else:
        return jsonify({'error': 'Resource not found'}), 404

if __name__ == '__main__':
    app.debug = True
    app.run()
