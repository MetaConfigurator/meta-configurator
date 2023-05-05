import pymongo
import database
connectionString=database.GetconnectionString()
client=pymongo.MongoClient(connectionString)

database=client["MyDatabase"]
collection=database["MyCollection"]

for x in collection.find():
    print(x)
