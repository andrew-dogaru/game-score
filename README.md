# Set the game score on a server

Stores the score of a game onto a node.js server.

## Configure

File `config.js` contains the database url.
Fill this in with your own database. You can create a free database for development 
at https://mlab.com .  You can also install MongoDB locally and use a local database.


## Install and run

From the application's directory initialize the dependencies:

```sh
$ npm install
```

Run the application:

```sh
$ node app.js
```

Point your browser to `http://127.0.0.1:3000/` to play the game. You have 
to register if you don't have a user id, otherwise go to the login page. You will get 
an error message if you try to register the same user id twice.

## The application

The main application files:

```
- app/models/    // Where the database models are stored
- pages/         // application pages
- public/        // all the static contents
- app.js         // application source code
- config.js      // configuration
- package.json   // application package info
- README.md      // this readme file
```

After login the browser stores your user id and token in its local storage so it can be used 
later. At the end of the game, your score is stored in the database.  You can display the top 
five scores. Once you login, you can point your browser to the following application endpoints, 
for debugging. Make sure that you keep the `token` parameter from the existing page url query, 
otherwise the server will not authenticate you.

The application api endpoints.

Unauthenticated:
- /apikey - GET displays the login page, POST processes the submitted login info
- /register - GET displays the register page, POST processes the submitted registration form 

Authenticated:
- /game/start - GET play the game
- /game/setscore - GET or POST sets the score for the current user
- /game/getscore - GET gets the top N scores

For debugging (authenticated - you must use the token from another authenticated url):
- /game/users - GET lists all the users registered with the game
- /game/scores - GET lists all the scores available for the game


The application validates the following inputs:
- /register 
    - user name does not start or end in spaces
    - user name is between 5 and 10 characters long
    - password is no less than 2 characters long

- /game/setscore
    - score is a number
   

## Useful resources

Learn more about token based authentication:
- https://scotch.io/tutorials/the-ins-and-outs-of-token-based-authentication
- https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
- https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications

Learn about local storage, where the browser keeps data such as the current user name and token:  
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
