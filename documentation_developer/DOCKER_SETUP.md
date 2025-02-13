# Docker Setup Notes

## Setting up the server environment

Pull the latest meta_configurator status from GitHub.

Inside the meta_configurator/backend folder, create a `.env.prod` file, defining the passwords for the mongo database and for redis:

```
REDIS_PASS=your_redis_password
MONGO_PASS=your_mongo_password
MONGO_INITDB_ROOT_PASSWORD=your_mongo_password
```

## Starting the containers

Navigate to the meta_configurator/backend folder on the server and run the following command:

```bash
docker compose up --force-recreate --no-deps -d
```