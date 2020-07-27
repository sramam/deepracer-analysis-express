const express = require('express');
const bodyParser = require('body-parser');

//const db = require('./db');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/evals', (req, res) => {
  res.send(`not yet implemented`);
});

app.get('/training', (req, res) => {
  res.send(`not yet implemented`);
});

app.listen(3000, () => console.log('server started'));