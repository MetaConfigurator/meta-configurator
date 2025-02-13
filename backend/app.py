import threading
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import uuid
import logging
import os
from datetime import datetime, timedelta
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import redis
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Get MongoDB credentials and connection info from environment variables
MONGO_USER = os.getenv("MONGO_USER", "root")
MONGO_PASS = os.getenv("MONGO_PASS", "example")
MONGO_HOST = os.getenv("MONGO_HOST", "mongo")
MONGO_PORT = os.getenv("MONGO_PORT", "27017")
MONGO_DB = os.getenv("MONGO_DB", "metaconfigurator")

app.logger.debug(
    f"Connecting to MongoDB at mongodb://{MONGO_USER}:<hidden>@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}"
)

# MongoDB connection
client = MongoClient(
    host=MONGO_HOST,
    port=int(MONGO_PORT),
    username=MONGO_USER,
    password=MONGO_PASS,
    authSource="admin",
)
db = client[MONGO_DB]

# Set up Redis connection
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", 6379)
REDIS_PASS = os.getenv("REDIS_PASS", None)

# Construct the Redis URL including the password
REDIS_URL = f"redis://:{REDIS_PASS}@{REDIS_HOST}:{REDIS_PORT}/0"

# Initialize Redis client
redis_client = redis.Redis.from_url(REDIS_URL)

try:
    redis_client.ping()
    print("Redis connected successfully")
except redis.ConnectionError as e:
    print(f"Redis connection failed: {e}")


# Set up Flask-Limiter with Redis
limiter = Limiter(get_remote_address, app=app, storage_uri=REDIS_URL)

# Set up logging to print to a file
logging.basicConfig(
    filename="cleanup.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Constants
MAX_FILE_LENGTH = 500000  # 500,000 bytes = 500 KB
PROJECT_EXPIRY_DAYS = timedelta(
    days=90
)  # Projects not accessed for 90 days will be deleted
SNAPSHOT_EXPIRY_DAYS = timedelta(
    days=30
)  # Snapshot not accessed for 30 days will be deleted
CHECK_INTERVAL = 86400  # 1 day in seconds


def is_file_length_valid(file_content):
    return len(str(file_content)) <= MAX_FILE_LENGTH


@app.route("/snapshot", methods=["POST"])
@limiter.limit("2 per minute")
def add_snapshot():
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "Missing request data"}), 400
        if (
            "data" not in request_data
            or "schema" not in request_data
            or "settings" not in request_data
        ):
            return jsonify({"error": "Missing data, schema, or settings"}), 400

        data = request_data.get("data")
        schema = request_data.get("schema")
        settings = request_data.get("settings")
        snapshot_id = request_data.get("snapshot_id")

        if not all(map(is_file_length_valid, [data, schema, settings])):
            return jsonify({"error": "One or more files too large"}), 413

        # Check if snapshot ID already exists
        if snapshot_id and db["snapshots"].find_one({"_id": snapshot_id}):
            return jsonify({"error": "Snapshot ID already exists"}), 409

        # Generate UUIDs for each file and the snapshot if not provided
        data_id = str(uuid.uuid4())
        schema_id = str(uuid.uuid4())
        settings_id = str(uuid.uuid4())
        if not snapshot_id:
            snapshot_id = str(uuid.uuid4())

        creation_date = datetime.utcnow().isoformat()

        # Store each file
        files_collection = db["files"]
        files_collection.insert_one(
            {"_id": data_id, "file": data, "metadata": {"creationDate": creation_date}}
        )
        files_collection.insert_one(
            {
                "_id": schema_id,
                "file": schema,
                "metadata": {"creationDate": creation_date},
            }
        )
        files_collection.insert_one(
            {
                "_id": settings_id,
                "file": settings,
                "metadata": {"creationDate": creation_date},
            }
        )

        # Store the snapshot
        snapshots_collection = db["snapshots"]
        snapshots_collection.insert_one(
            {
                "_id": snapshot_id,
                "data_id": data_id,
                "schema_id": schema_id,
                "settings_id": settings_id,
                "metadata": {
                    "creationDate": creation_date,
                    "lastAccessDate": creation_date,
                    "accessCount": 0,
                },
            }
        )

        return jsonify({"snapshot_id": snapshot_id}), 201
    except Exception as e:
        app.logger.error(f"Error adding snapshot: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/snapshot/<snapshot_id>", methods=["GET"])
@limiter.limit("20 per minute")
def get_snapshot(snapshot_id):
    try:
        snapshots_collection = db["snapshots"]
        snapshot = snapshots_collection.find_one({"_id": snapshot_id})
        if not snapshot:
            return jsonify({"error": "Snapshot not found"}), 404

        files_collection = db["files"]
        data = files_collection.find_one({"_id": snapshot["data_id"]}, {"_id": False})
        schema = files_collection.find_one(
            {"_id": snapshot["schema_id"]}, {"_id": False}
        )
        settings = files_collection.find_one(
            {"_id": snapshot["settings_id"]}, {"_id": False}
        )

        if not all([data, schema, settings]):
            return jsonify({"error": "One or more files not found"}), 404

        # Update the last accessed time and increment access count
        snapshots_collection.update_one(
            {"_id": snapshot_id},
            {
                "$set": {"metadata.lastAccessed": datetime.utcnow().isoformat()},
                "$inc": {"metadata.accessCount": 1},
            },
        )

        response = {
            "data": data["file"],
            "schema": schema["file"],
            "settings": settings["file"],
        }

        return jsonify(response)

    except Exception as e:
        app.logger.error(f"Error getting snapshot: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/project", methods=["POST"])
@limiter.limit("2 per minute")
def publish_project():
    try:
        request_data = request.json
        if not request_data:
            return jsonify({"error": "Missing request data"}), 400
        if (
            "project_id" not in request_data
            or "snapshot_id" not in request_data
            or "edit_password" not in request_data
        ):
            return (
                jsonify({"error": "Missing project_id, snapshot_id, or edit_password"}),
                400,
            )

        project_id = request_data["project_id"]
        snapshot_id = request_data["snapshot_id"]
        edit_password = request_data["edit_password"]

        # Validate project_id and edit_password lengths
        if len(project_id) < 3:
            return (
                jsonify({"error": "project_id must be at least 3 characters long"}),
                400,
            )
        if len(edit_password) < 8:
            return (
                jsonify({"error": "edit_password must be at least 8 characters long"}),
                400,
            )

        hashed_password = generate_password_hash(edit_password)
        last_access_date = datetime.utcnow().isoformat()

        # Check if the snapshot exists
        snapshots_collection = db["snapshots"]
        snapshot = snapshots_collection.find_one({"_id": snapshot_id})
        if not snapshot:
            return jsonify({"error": "Snapshot not found"}), 404

        # Check if the project ID already exists
        projects_collection = db["projects"]
        existing_project = projects_collection.find_one({"_id": project_id})

        if existing_project:
            if check_password_hash(existing_project["edit_password"], edit_password):
                projects_collection.update_one(
                    {"_id": project_id},
                    {
                        "$set": {
                            "snapshot_id": snapshot_id,
                            "metadata.lastAccessDate": last_access_date,
                        },
                        "$inc": {"metadata.accessCount": 1},
                    },
                )
                return jsonify({"message": "Project updated successfully"}), 200
            else:
                return (
                    jsonify(
                        {"error": "Project already exists with different password"}
                    ),
                    403,
                )
        else:
            projects_collection.insert_one(
                {
                    "_id": project_id,
                    "snapshot_id": snapshot_id,
                    "edit_password": hashed_password,
                    "metadata": {"lastAccessDate": last_access_date, "accessCount": 0},
                }
            )
            return jsonify({"message": "Project published successfully"}), 201
    except Exception as e:
        app.logger.error(f"Error publishing project: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/project/<project_id>", methods=["GET"])
@limiter.limit("10 per minute")
def get_project(project_id):
    try:
        projects_collection = db["projects"]
        project = projects_collection.find_one({"_id": project_id})
        if not project:
            return jsonify({"error": "Project not found"}), 404

        snapshot_id = project["snapshot_id"]
        last_access_date = datetime.utcnow().isoformat()
        projects_collection.update_one(
            {"_id": project_id},
            {
                "$set": {"metadata.lastAccessDate": last_access_date},
                "$inc": {"metadata.accessCount": 1},
            },
        )
        return get_snapshot(snapshot_id)
    except Exception as e:
        app.logger.error(f"Error retrieving project: {e}")
        return jsonify({"error": "Internal server error"}), 500


def cleanup_old_snapshots():
    try:
        snapshots_collection = db["snapshots"]
        projects_collection = db["projects"]
        files_collection = db["files"]

        # Delete projects not accessed in the last x months
        project_cutoff_date = datetime.utcnow() - PROJECT_EXPIRY_DAYS
        old_projects = projects_collection.find(
            {"metadata.lastAccessDate": {"$lt": project_cutoff_date.isoformat()}}
        )

        old_project_ids = [project["_id"] for project in old_projects]
        logging.info(f"Found {len(old_project_ids)} projects to delete.")

        for project_id in old_project_ids:
            project = projects_collection.find_one({"_id": project_id})
            if project:
                projects_collection.delete_one({"_id": project_id})
                logging.info(f"Deleted project with ID: {project_id}")

        # Collect snapshots for all projects that still exist
        snapshot_ids_linked_to_recent_projects = set()
        logging.info(
            f"Found {len(snapshot_ids_linked_to_recent_projects)} snapshots linked to recent projects."
        )
        for project in projects_collection.find():
            snapshot_ids_linked_to_recent_projects.add(project["snapshot_id"])

        # Find snapshots not accessed in the last x months
        snapshot_cutoff_date = datetime.utcnow() - SNAPSHOT_EXPIRY_DAYS
        old_snapshots = snapshots_collection.find(
            {"metadata.lastAccessDate": {"$lt": snapshot_cutoff_date.isoformat()}}
        )

        # Delete old snapshots if not linked to any recent projects
        old_snapshot_ids = [
            snapshot["_id"]
            for snapshot in old_snapshots
            if snapshot["_id"] not in snapshot_ids_linked_to_recent_projects
        ]
        logging.info(f"Found {len(old_snapshot_ids)} snapshots to delete.")

        for snapshot_id in old_snapshot_ids:
            snapshot = snapshots_collection.find_one({"_id": snapshot_id})
            if snapshot:
                snapshots_collection.delete_one({"_id": snapshot_id})

        # Delete files not linked to any snapshot
        all_snapshot_files = set()
        for snapshot in snapshots_collection.find():
            all_snapshot_files.update(
                [snapshot["data_id"], snapshot["schema_id"], snapshot["settings_id"]]
            )

        all_files = set(files_collection.distinct("_id"))
        unused_files = all_files - all_snapshot_files
        logging.info(f"Found {len(unused_files)} files to delete.")

        for file_id in unused_files:
            files_collection.delete_one({"_id": file_id})

        logging.info(
            f"Deleted {len(old_project_ids)} projects, {len(old_snapshot_ids)} snapshots, and {len(unused_files)} files."
        )
    except Exception as e:
        app.logger.error(f"Error deleting cleanup: {e}")


def schedule_cleanup():
    cleanup_old_snapshots()
    # Schedule the next run
    threading.Timer(86400, schedule_cleanup).start()


if __name__ == "__main__":
    # Start the cleanup scheduler
    schedule_cleanup()
    app.run(host="0.0.0.0", port=5000, ssl_context="adhoc")
