from flask import Flask, render_template, redirect, url_for, request
from flask_pymongo import PyMongo
from pymongo import MongoClient

app = Flask(__name__)

# connect Flask App with MongoDB database
client = MongoClient('mongodb+srv://minye:trymongodb123@cluster0.orsd0wn.mongodb.net/?retryWrites=true&w=majority', 27017, username='minye', password='trymongodb123')
db = client.TestDatabase  # instantiate the mongodb instance
todos = db.todos


@app.route('/', methods=('GET', 'POST'))
def index():
    if request.method == 'POST':
        content = request.form['content']
        degree = request.form['degree']
        todos.insert_one({'content': content, 'degree': degree})
        return redirect(url_for('index'))

    all_todos = todos.find()
    return render_template('index.html', todos=all_todos)


if __name__ == "__main__":
    app.run(debug=True)
