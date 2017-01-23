const express = require('express');
const app = express();
const axios = require('axios');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

sequelize
  .authenticate()
  .then(function(err) {
    console.log('Connection has been established successfully.');
  })
  .catch(function (err) {
    console.log('Unable to connect to the database:', err);
  });

const Search = sequelize.define('search', {
  term: Sequelize.STRING,
  when: Sequelize.STRING
});

sequelize.sync();

app.set('port', (process.env.PORT || 5000));

app.get('/search/latest', (req, res) => {
	Search.findAll({ limit: 10, order: [['username', 'DESC']] })
		.then(searches => {
      res.json(searches);
    })
    .catch(err => {
      res.send('An error occurred').status(500);
      console.error(err);
    });
});

app.get('/search/:query/:page?', (req, res) => {
  const page = parseInt(req.params.page, 10) || 0;
  const offset = parseInt(req.query.offset, 10) || 0;
  const pageIndex = page * 10 + 1;
  const startIndex = req.query.offset ? offset + 1 : pageIndex;

  const url = 'https://www.googleapis.com/customsearch/v1'
    + '?key=' + process.env.GKEY
    + '&cx=' + process.env.CX
    + '&q=' + req.params.query
    + '&searchType=image'
    + '&start=' + startIndex;

  console.log('URL', url);

  axios
    .get(url)
    .then(result => {
      console.log('Result', result);
      if (!result.data.items) {
        res.json([]);
        return;
      }

      const items = result.data.items
        .map(item => ({
          url: item.link,
          snippet: item.snippet,
          thumbnail: item.image.thumbnailLink,
          context: item.image.contextLink
        }));

      res.send(items);

      Search.create({
        term: req.params.query,
        when: new Date().toISOString()
      });
    })
    .catch(err => {
      res.send('An error occurred searching for images with the term: ' + req.params.query);
      console.error(err);
    });
});

app.listen(app.get('port'), () => console.log('Image search running on Port:', app.get('port')));
