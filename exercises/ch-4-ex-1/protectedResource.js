var express = require("express");
var bodyParser = require('body-parser');
var cons = require('consolidate');
var nosql = require('nosql').load('database.nosql');
var __ = require('underscore');
var cors = require('cors');

var app = express();

app.use(bodyParser.urlencoded({ extended: true })); // support form-encoded bodies (for bearer tokens)

app.engine('html', cons.underscore);
app.set('view engine', 'html');
app.set('views', 'files/protectedResource');
app.set('json spaces', 4);

app.use('/', express.static('files/protectedResource'));
app.use(cors());

var resource = {
	"name": "Protected Resource",
	"description": "This data has been protected by OAuth 2.0"
};

var getAccessToken = function (req, res, next) {
	/*
	 * Scan for an access token on the incoming request.
	 */

	var inToken = null;
	const auth = req.headers['authorization'];
	if (auth && auth.toLowerCase().indexOf('bearer') == 0) {
		//Prefered method - passing the Auth Token in header
		inToken = auth.slice('bearer '.length);

	} else if (req.body && req.body.access_Token) {
		//2nd prefered method - from Form encoded data
		//Limits API to Form encoded characters 
		inToken = req.body.access_Token;

	} else if (req.query && req.query.access_Token) {
		//Least prefered - Query parameter
		//Tokens can be logged across server requests
		inToken = req.query.access_Token;
	}

	nosql.one().make(function (builder) {
		builder.where('access_token', inToken);
		builder.callback(function (err, token) {
			if (token) {
				console.log(`A token match was found: ${inToken}`);
			} else {
				console.log('No token was found');
			};

			req.access_Token = token;
			next();
			return;
		});
	});

};

app.options('/resource', cors());


/*
 * Add the getAccessToken function to this handler
 */
app.post("/resource", cors(), getAccessToken, function (req, res) {

	/*
	 * Check to see if the access token was found or not
	 */
	if (req.access_Token) {
		res.json(resource);
	}
	else {
		res.status(401).end();
	}

});

var server = app.listen(9002, 'localhost', function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log(`OAuth Resource Server is listening at http://localhost:${port}`);
});

