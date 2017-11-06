# Set the game score on a server

Stores the score of a game onto a node.js server.

From the application's directory initialize the dependencies:

```sh
$ npm install
```

Run the application:

```sh
$ node app.js
```

Point your browser to `http://127.0.0.1:3000/pandadrop.html` to play the game.
First you have to enter the user's name, which will be associated with the score sent to the server.

At the end of the game, the browser sends the score to `http://127.0.0.1:3000/setScore`,
then provides a link to `http://127.0.0.1:3000/getScore` which displays the top five scores.
 
The server application stores scores from different users in a map and stores the map into the local file `scores.txt`.  When the server starts, it attempts to read scores from this file, so scores are not lost if the server is stopped.

You can also test the server by loading page `http://127.0.0.1:3000/form.html`.
