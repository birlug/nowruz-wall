# Nowruz Wall
backend for https://birlug.ir/nowruz.html.

### Quick Start
0. [create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) from the cloudflare dashboard.
1. create a D1 database (if you've done it before, skip this step)
```sh
$ npx wrangler d1 create db
```
and put the associated ID in the `wrangler.jsonc` file.

2. upload the secrets (telegram token) and database schemas by:
```sh
$ make prepare
```

3. deploy
```sh
$ make deploy
```
