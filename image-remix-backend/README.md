run `cargo run` to start the server

then put `curl http://localhost:3000/ping` to check if the server is running.

To see the incoming data, put the MONGODB_URI into the mongo db compass and connect the connection.

```shell
curl -X POST http://localhost:3000/images \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://raw.githubusercontent.com/0xJamesBong/image-remix/refs/heads/main/image-remix-frontend/assets/pics/tom_holland_7.jpg?token=GHSAT0AAAAAADAVO7HJ7M47JH2GXGLELKFM2CODMKQ",
    "uploader": "alice",
    "parent_id": null
  }'
```

Make sure your shit is turned on and running.

<!-- https://cloud.mongodb.com/v2/684e229e95a6f0430311c847#/overview -->
