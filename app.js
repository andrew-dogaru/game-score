/**
 * Application paths:
 *  /setScore - update scores
 *  /getScore - get the top ten scores 
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

// The application directory
const appDir = path.dirname(require.main.filename);
// File where scores are saved
const scoreFile = appDir + '/scores.txt'; 
// Top scores HTML page
const topScoresHtml = appDir + '/topscores.html';

// The game scores of all players in a map of <player,score> pairs
var allScores = new Map();

app.use(bodyParser.json()); // for parsing application/json

// Receives a score, write it to a local file.
// Request parameters:
//  - player the game player id
//  - score the game score
app.get('/setScore', (req, res) => {
    setScoreFromQuery(req, allScores);
    saveMapToFile(allScores, scoreFile)
    res.send('Score stored');
  });


// Receives a <player,score> pair formatted as a JSON object in a POST 
// request. Writes it to a local file.
app.post('/setScore', (req, res) => {
    setScoreFromJSON(req, allScores);
    saveMapToFile(allScores, scoreFile)
    res.send('Score stored');
  });


// Returns the highest scores.
// Request parameter:
//  - count the number of scores to returns
app.get('/getScore', function (req, res) {
    var count = req.query.count;
    console.log('Getting the highest ' + count + ' scores...');
    
    var sortedScores = sortByScore(allScores);
    var firstFew = [];
    if (count > sortedScores.length)
      count = sortedScores.length;
    for (var i = 0; i < count; i++) {
      firstFew.push(sortedScores[i]);
    }
    
    // Insert the scores into the scores.html page and return it
    var page = new String(fs.readFileSync(topScoresHtml));
    var strings = page.split("$$")
    res.send(strings[0] + htmlize(firstFew) + strings[1]);
  });

// From https://expressjs.com/en/4x/api.html#path-examples
// Returns static resources from /public
app.use(express.static(__dirname + '/public'));


// Return the data as a set of table rows.
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


// Reads <name, score> from the request's query and writes it to 
// the given map.
function setScoreFromQuery(request, map) {
  console.log('From request query: player=' + request.query.player + ' score=' + request.query.score);
  map.set(request.query.player, request.query.score);
}


// Reads <name, score> from the request's body in JSON format and writes
// it to the given map.
function setScoreFromJSON(request, map) {
  console.log('From request body (JSON): player=' + request.body.player + ' score=' + request.body.score);
  map.set(request.body.player, request.body.score);
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


// Save map to file fileName
function saveMapToFile(map, fileName) {
  fs.writeFile(fileName, JSON.stringify(Array.from(map)), (err) => {
    if (err) {
      return console.log('Error: ' + err);
    }
    console.log('Store to file: ' + fileName);
    console.log('  data: ' + JSON.stringify(Array.from(map)));
  });
}


// Start
app.listen(3000, function () {
    console.log('app.js listening on port 3000')
    loadScores(scoreFile);
  });
