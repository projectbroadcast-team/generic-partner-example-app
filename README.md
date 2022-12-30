# Generic Partner Integration Example App

This provides an example and a test case for how to connect as a partner with Project Broadcast.

There are three configuration items you'll need:

* partnerId
* signingKey
* integrationKey

With these three things, copy the `config/default.json` to `config/local-development.json` file and fill it in. You may also need to change the `baseConfigurationUrl`, `baseConnectUrl`, and `baseApiUrl` if you're connecting to a non-production environment.

Once setup and running (`npm start`) you'll be presented with a list of users you can "login" as. From there you can kick off a request to connect that user to a project broadcast user. Once connected, some API requests will be made to display some data.

API calls are defined in `services/project-broadcast.js` and request signing and verification helpers are found in `lib/project-broadcast.js`.
