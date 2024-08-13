# Docker Setup Notes

## Setting up the server environment

Pull the latest meta_configurator status from GitHub.

Inside the meta_configurator folder, create a `.env.prod` file, defining the passwords for the mongo database and for redis:
    
```
MONGO_PASSWORD=your_mongo_password
REDIS_PASSWORD=your_redis_password
```

For https certificates:

```
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

sudo certbot --nginx -d metaconfigurator.informatik.uni-stuttgart.de
```

## Updating the frontend container

In GitHub actions, run the ['Build Docker Image'](https://github.com/MetaConfigurator/meta-configurator/actions/workflows/dockerize-app.yml) workflow on the branch to use.


Once the new container image is built, on the server, pull the new image:

```bash
docker --log-level debug pull ghcr.io/metaconfigurator/meta_configurator:latest
```

## Starting the containers

Navigate to the meta_configurator folder on the server and run the following command:

```bash
docker compose up --force-recreate --no-deps -d
```

