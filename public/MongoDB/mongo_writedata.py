import pymongo
import database
connectionString=database.GetconnectionString()
client=pymongo.MongoClient(connectionString)

database=client["MyDatabase"]# database name that you have
collection=database["MyCollection"]# collection name that you have

document= [
           {"Titel":"Database programming","Author":"Keyuri"},
           {"Titel":"MATLAB programming","Author":"Paul"},
           {"Titel":"Python programming","Author":"Minye"},
           {"Titel":"Java programming","Author":"Felix"}
         ]
x=collection.insert_many(document)