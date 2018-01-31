const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const bodyParser= require('body-parser');

const morgan    = require('morgan');        // app logging
const mongoose  = require('mongoose');      // mongoDB client

const jwt       = require('jsonwebtoken');  // create / sign / verify tokens
const config    = require('./config');      // our config file
const User      = require('./app/models/user');  // the mongoose user model
const Score     = require('./app/models/score'); // the mongoose score model

/////////////////////////////////////////////////////////////////////////////
// Configuration
var app    = express();
const port = process.env.PORT || 3000;        // use port 3000 if none defined
const myApi = '/game';                        // the root path to my app
app.set('superSecret', config.secret);        // secret for creating tokens

// Use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Use morgan to log requests to the console
app.use(morgan('dev'));
// Connect to database
mongoose.connect(config.database);

// From https://expressjs.com/en/4x/api.html#path-examples
// Set the path for static resources
app.use(express.static(__dirname + '/public'));

// A router instance for api routes, set routes
var apiRoutes = express.Router();
app.use(myApi, apiRoutes);

// The application directory
const appDir = path.dirname(require.main.filename) + '/';
// File where scores are saved
const scoreFile = appDir + 'scores.txt'; 
// The game scores of all players in a map of <player,score> pairs
var allScores = new Map();

// Web pages
const pageDir = appDir + 'pages/';
const pageTopScores = pageDir + 'topscores.html';
const pageIndex = pageDir + 'index.html';
const pageLogin = pageDir + 'login.html';
const pageSignup = pageDir + 'signup.html';
const pageGame = pageDir + 'pandadrop.html';

/////////////////////////////////////////////////////////////////////////////
// Routes

// Base unauthenticated route (http://localhost:port/)
app.get('/', (req, res) => {
  // return the index page
  sendHtmlPage(res, pageIndex);
});


app.get('/apikey', (req, res) => {
  sendHtmlPage(res, pageLogin);
});


// Process the login form
app.post('/apikey', (req, res) => {

  // find the user
  User.findOne({ name: req.body.userid }, 
    (err, user) => {

      if (err) throw err;
  
      if (user) {
        // check if password matches
        if (user.password != req.body.password) {
          res.json({ 
            success: false, 
            message: 'Authentication failed for ' + req.body.userid + '. Wrong password.' });
        }
        else {
          // if user is found and password is ok then create a token
          var payload = { admin: user.admin };
          var token = jwt.sign(payload, app.get('superSecret'), {
                        expiresIn: 86400 // expires in 24 hours
                      });
          res.json({
            success: true,
            message: 'Enjoy your token!',
            token: token
          });
        }
      }
      else {
        res.json({ 
          success: false, 
          message: 'Authentication failed. User ' + req.body.userid + ' not found.' });
      }
    });
});


// Show the signup form
app.get('/signup', (req, res) => {
  sendHtmlPage(res, pageSignup);
});


// Process the signup form.  The user sends an id and a password.
app.post('/signup', (req, res) => {

  var newUser = new User({ 
    name: req.body.userid.trim(), 
    password: req.body.password,
    admin: true
  });

  // Validate userid
  if (newUser.name.length != req.body.userid.length) {
    return res.json({ 
      success: false, 
      message: 'User name \"' + newUser.name + '\" must not start or end with spaces.'
    });
  }
  if (newUser.name.length < 5 || newUser.name.length > 10) {
    return res.json({ 
      success: false, 
      message: 'User name must have between 5 and 10 characters.'
    });
  }

  // Validate password
  if (newUser.password.length < 2) {
    return res.json({ 
      success: false, 
      message: 'Password must have at least 2 characters.'
    });
  }

  // Check if a user with the same name is already registered
  User.findOne({ name: newUser.name }, (err, user) => {

      if (err) throw err;

      if (user) {
        // check if password matches
        res.json({ 
          success: false, 
          message: 'User ' + user.name + ' already exists. Choose another user name.' });
      }
      else {
        // User does not exist, create user
        newUser.save((err) => {
          if (err)
            throw err;
          console.log('New user successfully saved: ' + newUser.name);
          res.json({ success: true });
        });  
      }
  });
});


/////////////////////////////////////////////////////////////////////////////
// Token authentication middleware
apiRoutes.use((req, res, next) => {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.param('token') || req.headers['x-access-token'];

  // decode token
  if (token) {
    // if token good, save decoded request for use in other routes
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ 
          success: false, 
          message: 'Failed to authenticate token.' });    
      } else {
        req.decoded = decoded;  
        next();
      }
    });
  }
  else {
    // if no token then return error
    return res.status(403).send({ 
      success: false, 
      message: 'No token provided.'
    });
  }
});


/////////////////////////////////////////////////////////////////////////////
// Authenticated routes
apiRoutes.get('/', (req, res) => {
  res.json({ message: 'Welcome to the coolest game ever!' });
});


// Start the game
apiRoutes.get('/start', (req, res) => {
  var token = req.body.token || req.param('token') || req.headers['x-access-token'];
  var userName = req.body.name || req.param('name');
  
  sendHtmlPageN(res, pageGame, [ myApi, userName ]);
});


// Receives a <player,score> pair formatted as a JSON object in a POST 
// request. Writes it to a local file.
apiRoutes.post('/setscore', (req, res) => {
  if (setScoreFromJSON(req, allScores)) {
    removeScoresFromDB();
    saveScoresToDB(allScores);
    return res.json({ 
      success: true, message: 'Score stored'});
  } else {
    return res.json({
      success: false, message: 'Score is not a number'});  
  }
});


// Returns the highest scores.
// Request parameter:
//  - count the number of scores to returns
apiRoutes.get('/getscore', (req, res) => {
  var count = req.query.count;
  console.log('Listing the highest ' + count + ' scores ...');

  var sortedScores = sortByScore(allScores);
  var firstFew = [];
  if (count > sortedScores.length)
    count = sortedScores.length;
  for (var i = 0; i < count; i++) {
    firstFew.push(sortedScores[i]);
  }

  sendHtmlPage1(res, pageTopScores, htmlize(firstFew));
});


// Receives a score, writes it to a local file.
// Request parameters:
//  - player the game player id
//  - score the game score
apiRoutes.get('/setscore', (req, res) => {
  if (setScoreFromQuery(req, allScores)) {
    removeScoresFromDB();
    saveScoresToDB(allScores);
    return res.json({ 
      success: true, message: 'Score stored'});
  } else {
    return res.json({
      success: false, message: 'Score not stored - not a number'});  
  }
});


// Returns all the registered users from the DB
apiRoutes.get('/users', (req, res) => {
  User.find({}, (err, users) => {
    res.json(users);
  });
});

// Returns all the scores from the DB
apiRoutes.get('/scores', (req, res) => {
  Score.find({}, (err, scores) => {
    res.json(scores);
  });
});


/////////////////////////////////////////////////////////////////////////////
// Functions

// Reads file from filePath, sends as html response 
function sendHtmlPage(response, filePath) {
  response.set('Content-Type', 'text/html');
  response.send(new Buffer(fs.readFileSync(filePath)));  
}

// Reads file from filePath, replaces "{0}" with the value string 
// then sets the expanded string to response as html contents.
function sendHtmlPage1(response, filePath, value) {
  var page = new String(fs.readFileSync(filePath));
  var parts = page.split('${0}');

  response.set('Content-Type', 'text/html');
  response.send(new Buffer(parts[0] + value + parts[1]));  
}

// Reads file from filePath, replaces "{0}", "${1}", etc. with 
// elements from the values array, then sets the expanded string
// to response as html contents. A bit like Java MessageFormat. 
// Works if ${i} is present only once for each i.
function sendHtmlPageN(response, filePath, values) {
  var page = new String(fs.readFileSync(filePath));

  // Cool but Not super efficient, don't use for many iterations 
  for (var i = 0; i < values.length; i++) {
    var parts = page.split('${' + i + '}');
    page = new String(parts[0] + values[i] + parts[1]);
  }
  
  response.set('Content-Type', 'text/html');
  response.send(new Buffer(page));  
}

// Returns the data as a set of table rows.
// Assumes that the data is a 2D array.
function htmlize(data) {
  var html = new String();
  for (var row = 0; row < data.length; row++) {
    html += "<tr>";
    var item = data[row];
    for (var col = 0; col < item.length; col++) {
      html += "<td>";
      html += item[col];
      html += "</td>";
    }
    html += "</tr>";
  }
  return html;
}

// Reads <name, score> from the request's query and writes it to 
// the given map.  Returns false if score isNaN.
function setScoreFromQuery(request, map) {
  console.log('From request query: player=' + request.query.player + ' score=' + request.query.score);

  var score = request.query.score.trim();
  if (score.length != 0 && !isNaN(score) && score >= 0) {
    map.set(request.query.player, score);
    return true;
  } else {
    return false;
  }
}

// Reads <name, score> from the request's body in JSON format and writes
// it to the given map.  Returns false if score isNaN.
function setScoreFromJSON(request, map) {
  console.log('From request body (JSON): player=' + request.body.player + ' score=' + request.body.score);

  var score = new String(request.body.score).trim();
  if (score.length != 0 && !isNaN(score) && score >= 0) {
    map.set(request.body.player, score);
    return true;
  } else {
    return false;
  }
}

// Given a map, returns an array of the map's entries
// sorted in descending order of their value.
function sortByScore(map) {
  var arr = Array.from(map);
  arr.sort((a, b) => {
      return b[1] - a[1]; 
    });

  return arr;
}

// Reads all the scores from the given file.
// Stores the result in 'allScores'.
function loadScores(filePath) {
  fs.readFile(filePath, (err, data) => {
      if (err) {
        return console.log('Error: ' + err);
      }
    
      // Store file contents as a map
      var scoresJSON = JSON.parse(data);
      allScores = new Map(scoresJSON);
      console.log('Loaded from score.txt: ' + JSON.stringify(Array.from(allScores)));
    });
}

// Saves map to file fileName
function saveMapToFile(map, fileName) {
  fs.writeFile(fileName, JSON.stringify(Array.from(map)), (err) => {
    if (err) throw err;
    
    console.log('Store to file: ' + fileName);
    console.log('  data: ' + JSON.stringify(Array.from(map)));
  });
}

// Reads all scores from the database
function loadScoresFromDB() {
  Score.find({}, (err, scores) => {
   if (err) throw err;

    allScores = new Map();
    
    if (scores) {
      console.log('Loaded from database:');
      
      scores.forEach((item, index, array) => {
        console.log('    item[' + index + '] = ' + JSON.stringify(item));
        allScores.set(item.name, item.score);
      });
    }
    else {
      console.log('No scores found');
    }
  });
}

// Deletes scores from the database
function removeScoresFromDB() {
  Score.remove({}, (err) => {
      if (err) throw err;
  });
}

// Saves all scores
function saveScoresToDB(scores) {

  scores.forEach((value, key, map) => {
    console.log('Saving to database: ' + `score[${key}] = ${value}`);

    // For each Map entry: create score then save
    var s = new Score({ 
      name: key, 
      score: value,
    });
    
    s.save(function(err) {
      if (err) throw err;
    });
  });
}

/////////////////////////////////////////////////////////////////////////////
// Start application
app.listen(port, () => {
    console.log('Listening on http://localhost:' + port)
//    loadScores(scoreFile);
    loadScoresFromDB()
  });
