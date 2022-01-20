# GSV Ranked Ticker

## Setup

### Requirements:
* Node >16
* yarn

### Installation
Just checkout and install the node packages
````commandline
yarn install
````

### Environment Variables

For local development, you need to create a ".env" file with following entries
````
WEBHOOK_URL=<webhook URL to a discord channel>
RIOT_API_KEY=<riot api key>
AVATAR_URL=<url to an avatar-image that is displayed when a message is sent>
````

## Fire up
````commandline
yarn start
````
