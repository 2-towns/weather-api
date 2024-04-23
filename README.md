# Weather API 

This is a technical test using a weather API to display the temperature of a city for a specific date.

# Setup 

## Environment 

All environment variables have default values, making it ready out of the box. However, you can customize these variables:

- `DB_NAME`: the SQLite database name. The default is `db.sqlite`.
- `RATE_PERIOD_IN_SEC`: the rate limiter period to check in seconds. The default is 10.
- `RATE_LIMIT`: the request limit for the defined period above. The default is 5.
- `WEATHER_API_URL`: the weather API URL. The default is `https://staging.v4.api.wander.com/hiring-test/weather`.
- `WEATHER_CACHE_DURATION_IN_SEC`: the API results cache period in seconds. The default is 600.

To change the default values, you can create a `.env` file or copy the `.env.example` file into the working directory.

## Docker 

The requirement is to have Docker installed on your machine.

Build the image: 

```sh
docker build -t weather .
```

You can change the image name by replacing `weather` with your desired name, but ensure to apply this change to other following commands.

Run the container: 

```sh
docker run -p 3000:3000 weather
```

Of course, you can change the exposed port on your machine. For example:

```sh
docker run -p 8080:3000 weather
```

## Development 

The requirements are Node.js 20+ installed and a Redis server running on port 6379 on your machine.

Install the dependencies:

```sh
npm install  
```

Create a .env: 

```sh
touch .env
```

Start the Typescript watching mode in another terminal: 

```sh
npm run watch  
```

Run the migration (first time only): 

```sh
npm run migration  
```

Start the server (in watching mode):

```sh
npm run start  
```

## Usage

The api is accessible through a GET method `/weather` using two GET parameters: `city` and `date` in ISO8601 format. Example: `/weather?city=San%20francisco&date=2024-04-21T10:00:00.000Z`. 

The success result is a JSON object containing the Celsius and Fahrenheit values. Example:

```json
{
    "celcius":	3.63,
    "fahrenheit":	38.53
}
```

In case of errors, the following format is sent: 

```json
{
    "statusCode":429,
    "message":"Requests limit reached.",
    "error":"Too Many Requests"
}
```

## Testing 

If the project is built or the TypeScript watch mode is running, run:

```sh 
npm run test
```

Otherwise you will need to run the build phase before: 

```sh 
npm run build
```


## Documentation 

### Error catching

I used functional programming with `purify-ts` for better error handling and to make the code easier to test. There is a pattern of left/right to return values, where left represents the "error" value and right represents the valid value. Additionally, I used `Maybe`, which allows managing nullable values.

## Code organization 

The code is organized by features because it's easier to focus on a specific feature. I used camelCase inside namespaces because I find it more comprehensible to import a namespace and call a function inside, rather than importing a function directly from another module.

### Dependencies 

I chose Hapi because it's a simple framework, easy to start with, and has great utilities for testing. I used Zod for validation because I am used to work with it, but Hapi also provides Joi, which is great. 

### Testing 

I used the Node.js test runner because I found it suitable and sufficient for testing the different parts of the API. The testing module from Hapi helped me a lot to test the API.

I separated the tests into two types of files: .unit.ts for unit testing and .func.test for functional testing. All the test files start with test-, as a Node convention.

I was able to unit test the cache recuperation method easily with a functional programming style, just by passing a dummy repository method in parameters. But testing that data returned from the API in a functional test is a little bit tricky. To achieve this, I registered a log listener in the Hapi events. If I receive got data from cache, the cache has been called.

I didn't want to use mocks because mocks come with some tradeoffs, like inconsistencies between mock data and real data, adding complexity to tests, etc.

### Caching

When a request is made, it will first check if a record exists for the MD5 generated from the city and date and that the expiration duration is not reached. In this case, the cached value will be sent; otherwise, the API will be called.

When the API call is successful, an MD5 hash is generated from the city and the date, then inserted (or will replace the current values) into the SQLite database, along with the corresponding temperature data (celsius and fahrenheit) and a date.

### Rate Limiter

Redis was used to implement the rate limiter with a sorted set data structure. Every time a request is made and not in cache, a new record will be added to the sorted set, and the current API call count will be returned. If the limit (defined in the config) is reached, a 429 error will be returned.

### Improvements

Some improvements could be implemented:

- Use Nginx as a reverse proxy to improve security.
- Since the API method implemented is GET, use the HTTP cache to cache the temperature value for a given period.
