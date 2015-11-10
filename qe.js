var fs         = require('fs');
var readline   = require('readline');
var google     = require('googleapis');
var googleAuth = require('google-auth-library');

var sha1       = require('./lib/sha1');
var columnify  = require('columnify');

var SCOPES     = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR  = (process.env.HOME || process.env.HOMEPATH ||
	process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
var CLIENT_SECRET_DIR = (process.env.HOME || process.env.HOMEPATH ||
	process.env.USERPROFILE) + '/bin/QuickEvent/';
var CLIENT_SECRET = CLIENT_SECRET_DIR + 'client_secret.json';


function main()
{
	var auth

	var date  = new Date();
	var month = date.getMonth() + 1;
	var year  = date.getFullYear();
	var day;

	var monthDays = new Date(year, month, 0).getDate();

	var summary;
	var start;
	var end;
	var desc;
	var colorId;

	var timeEror;

	var fileProvided   = false;
	var eventsFile     = '';
	var eventsFileName = '';
	var fileLines      = new Array();
	var fileError      = false;

	// Syntax enforcement and capture groups for day, start,
	// end, desc, and summary override
	var fileSyntaxRegex =
		/^(\d{1,2}) (\d{1,2}(?::?\d{2})?[ap]?m?) (\d{1,2}(?::?\d{2})?[ap]?m?)(?: ([^\|]+))?(?: \| ([^\|]+))?$/;

	// Iterate through flags and save their argument data, throw appropriate
	// errors when finished.
	function processFlags()
	{
		for (i = 1; i < process.argv.length; i++)
		{
			var flag     = function (f) { return process.argv[i] == f }
			var flagData = function (f) { return process.argv[i + 1] }
			if (flag('-f'))
			{
				fileProvided = true;
				eventsFileName = flagData();
				fileNameRegex =
					/^(?:[^\/]+\\|[^\\]+\/)([^\\\/]+)$/;

				// Extract file name if a full path is provided
				if (eventsFileName.match(fileNameRegex))
				{
					eventsFile = eventsFileName;
					eventsFileName = eventsFileName
						.match(fileNameRegex)[1];
				}

				// Prepend path if only the file name is provided
				else
				{
					eventsFile = process.cwd() + '/' + eventsFileName;
				}
			}
			else if (flag('-m'))
			{
				month = flagData();
				monthDays = new Date(year, month, 0).getDate();
			}
			else if (flag('-y'))
			{
				year = flagData();
				monthDays = new Date(year, month, 0).getDate();
			}
			// else if (process.argv[i] == 'y')
		}

		// Throw flag errors and exit
		if (!fileProvided)
		{
			console.error(
				'You must provide the name/path of the calendar events file.');
			process.exit();
		}
		else if (month < 1 || month > 12)
		{
			console.error('Provided month is not valid. Month must be between 1 and 12.');
			process.exit();
		}
		else if (!String(year).match(/\d{4}/))
		{
			console.error('Provided year is not valid. Year must be 4 digits.');
			process.exit();
		}
	}

	// Read the batch events list file, run remainder of
	// program when complete if there were no syntax errors
	function readEventBatch(file, arr, callback)
	{
		var count = 0;
		var errorCount = 0
		console.log('Checking events file for syntax errors...');
		readline.createInterface(
		{
			input: fs.createReadStream(file),
			terminal: false
		})
		.on('line', function(line)
		{
			// Check all event lines in event file for proper syntax
			if (line == '') { return }
			if (!line.match(fileSyntaxRegex) && count > 1)
			{
				console.error('Event #' + count + ' formatted incorrectly. [' + line + ']');
				fileError = true;
				errorCount++;
			}
			arr[count] = line;
			count++;
		})
		.on('close', function()
		{
			// Exit program if a syntax error was found in the events file,
			// otherwise run param callback
			if (!fileError) { callback() }
			else
			{
				console.error('Found %s error' +
					((errorCount > 1) ? 's' : '') + '. Exiting...', errorCount);
				process.exit()
			}
		});
	}

	// Convert time string (like 930a, 7p, 12:38a) or a military time string
	// (like 1330 or 0800) to a timestamp that is supported by Google's
	// API (hh:mm:ss), to be added to the date portion.
	function convertTime(timeString, day)
	{
		var timeBuilder = '';
		var timeRegex = /^(\d{1,2})(?::?(\d{2}))?(?:(a|p)m?)?$/;

		var timeError = function()
		{
			console.error(
				'There was an error with the format of the provided time: '
				+ timeString);
			process.exit();
		}

		// var nums = time.split('');
		var time    = timeString.match(timeRegex);
		var hour    = Number(time[1]);
		var minutes = time[2] ? Number(time[2]) : 0;
		var ap      = time[3] ? time[3] : null;

		// Assert military time string if a/p is not provided
		if (!ap && ([hour, minutes].join('')).length < 4) { timeError() }

		if (minutes > 59) { minutes -= 60; hour++ }
		if (hour <  12 && ap == 'p') { hour += 12 }
		if (hour <  10 && ap == 'a') { hour = '0' + hour}
		if (hour == 12 && ap == 'a') { hour = '00' }
		if (minutes == 0) { minutes = '00' }

		timeBuilder += hour + ':' + minutes + ':00';

		return new Array(timeBuilder, String(hour), String(minutes));
	}

	// Return an array containing the length of the event in hours and the span
	// of the event in days which will be added to the end dateTime
	//
	// Requires time arrays from convertTime()
	function getLength(start, end)
	{
		var hours   = 0;
		var daySpan = 0;
		var mins    = 0;

		var shr = Number(start[1]);
		var ehr = Number(end[1]);
		var smn = Number(start[2]);
		var emn = Number(end[2]);

		if (shr < ehr) { hours = ehr - shr }
		else if (shr > ehr) { daySpan = 1 }

		if (daySpan > 0) { hours = (24 - shr) + ehr }

		if      (smn < emn) { mins = ((emn - smn) / 60) }
		else if (smn > emn) { mins = ((smn - emn) / 60) * -1 }

		return new Array((hours + mins).toFixed(2), daySpan);
	}

	// Create a single calendar API-compatible event object given a summary
	// string, a formatted start time and a formatted end time, and a description
	function processEvent(id, summary, day, start, end, desc, colorId)
	{
		// Get event length and daySpan
		var length = getLength(start, end);

		// Build start dateTime
		var dateString =
			year + '-' + ((month < 10) ? '0' + month : month)
			+ '-' + ((day < 10) ? '0' + day : day) + 'T';
		var startString = dateString + start[0];

		// Add daySpan to the end dateTime day
		if ((Number(day) + length[1]) < 10)
			{ day = '0' + (Number(day) + length[1]) }
		else { day = Number(day) + length[1] }

		// Roll-over month if day exceeds the number of days in the month
		// after adding daySpan
		if (day > monthDays)
		{
			day = '01';
			month = ((Number(month) + 1) < 10) ?
				'0' + (Number(month) + 1) : (Number(month) + 1);
		}

		// Roll-over year if event length runs past the end of the year
		if (month > 12) { month = '01'; year++}

		// Build end dateTime
		var endString = dateString + end[0];

		// Build calendar API-compatible event object
		var eventTable =
		{
			'nameId': id,
			'summary': summary + ' [' + length[0] + ' hr' +
				((length[0] > 1) ? 's]' : ']'),
			'description': desc,

			'start': {
				'dateTime': startString,
				'timeZone': 'America/Chicago'
			},

			'end': {
				'dateTime': endString,
				'timeZone': 'America/Chicago'
			},

			'colorId': (Number(colorId) > 0) ? String(colorId) : null
		}

		return eventTable;
	}

	// Insert an event into the user's primary calendar
	function createEvent(auth, eventArr)
	{
		var event = eventArr;
		var arr   = eventArr;
		var calendar = google.calendar('v3');
		var duplicate = false;
		var offset1 = '-06:00';
		var offset2 = '-05:00';

		// Get calendar events that match the start/end time of the event to
		// be created to check for duplicates. Create the event if no duplicate
		// is found
		calendar.events.list(
		{
			auth: auth,
			calendarId: 'primary',
			timeMin: event.start.dateTime + offset1,
			timeMax: event.end.dateTime + offset1,
			maxResults: 50,
			singleEvents: true,
		},

		function (err, events)
		{
			// Iterate through all potential duplicate events, check
			// for start time, end time, and summary match
			if (events)
			{
				events.items.forEach(function(array)
				{
					if ((array.start.dateTime == event.start.dateTime + offset1 ||
						 array.start.dateTime == event.start.dateTime + offset2) &&
						(array.end.dateTime   == event.end.dateTime + offset1 ||
						 array.end.dateTime   == event.end.dateTime + offset2) &&
						 array.summary        == event.summary)
					{
						duplicate = true;
					}
				});
			}

			// Create calendar event if no duplcate was found and there were
			// no errors thrown by the calendar api
			if (!duplicate && !err)
			{
				calendar.events.insert(
				{
					auth: auth,
					calendarId: 'primary',
					resource: event,
				},

				function(err, event)
				{
					if (err)
					{
						console.error(
							'There was an error contacting the Calendar service: '
							+ err);
						return;
					}
					console.log('Event created: [id: %s] %s, "%s"%s',
						arr['nameId'],
						arr['start']['dateTime'],
						arr['summary'],
						arr['description'] ? ', "' + arr['description'] + '"' : '');
				});
			}

			// Report duplicate by id
			else if (duplicate)
			{
				console.error('Duplicate event with id ['
					+ event['nameId'] + '] found. Event not created.');
			}

			// Report calendar api error
			else if (err)
			{
				// console.log(arr.start.dateTime);
				console.log(
					'There was an error contacting the Calendar service: ' + err);
				return;
			}
		});

	}

	// Process events file data into an array of calendar API-compatible
	// event objects using processEvent() to pass to iterate over and pass
	// one by one to createEvent()
	function processAllEvents(auth)
	{

		// Save summary text and discard it from fileLines
		colorId = fileLines[0].split(' ')[1];
		summary = fileLines[1];
		for (i = 1; i <= 2; i++) { fileLines.shift() }

		var logData = new Array();

		fileLines.forEach(function(line)
		{
			// Use fileSyntaxRegex's capture groups to parse line data
			var data = line.match(fileSyntaxRegex);
			day   = data[1];
			start = convertTime(data[2]);
			end   = convertTime(data[3]);
			desc  = (typeof data[4] != 'undefined' ? data[4] : null);
			length = getLength(start, end);

			var summaryOverride = (typeof data[5] != 'undefined' ? data[5] : null);

			// Create id string, hash it, and slice the first 15 chars.
			// This should still be guaranteed to be unique given the
			// small sample size of calendar events.
			var id = sha1.hash(String((summaryOverride ? summaryOverride : summary)
				+ ((day < 10) ? '0' + Number(day) : day) + start[0]	+ end[0]))
				.slice(0,15);

			// Save event file info with id for later lookup in log file
			logData.push(
			{
				id: '[' + id + ']',
				day: day,
				start: data[2],
				end: data[3],
				title: summaryOverride || summary,
				description: desc,
				length: ' [' + ((length[0].length < 5) ? ' ' : '') + length[0]
					+ ' hr' + ((length[0] > 1) ? 's]' : ']')
			});

			var eventData = processEvent(
				id, (summaryOverride ? summaryOverride : summary),
				day, start, end, desc, colorId);
			createEvent(auth, eventData);
		});

		var columns = columnify(logData,
		{
			// minWidth: 7,
			columnSplitter: '  |  ',
			maxWidth: 20
		});

		// Write log output file
		fs.writeFile("log-" + eventsFileName + '.txt', columns, function(err)
		{
			if (String(err).indexOf('ENOENT, open') > -1 &&
				String(err).indexOf('\\log-') > -1)
			{
				console.error('There was a problem creating the log file.');
			}
		});
	}

	// Handle uncaught exceptions
	process.on('uncaughtException', function(e)
	{
		if (String(e).indexOf('ENOENT, open') > -1)
		{
			console.error(
				'There was a problem accessing the specified file. ' +
				'Make sure you\'ve typed the filename/path correctly.');
		}
		else { console.error('Uncaught exception: ' + e) }
	});

	/// Start running the program functions
	processFlags();
	readEventBatch(eventsFile, fileLines, function()
	{
		console.log('No errors found, beginning event creation...');

		///////////////////// Begin google pre-fab

		// Load client secrets from a local file.
		fs.readFile(CLIENT_SECRET, function processClientSecrets(err, content) {
			if (err)
			{
				console.log('Error loading client secret file: ' + err);
				return;
			}
			// Authorize a client with the loaded credentials, then begin
			// processing and creating all the calendar events
			authorize(JSON.parse(content), processAllEvents);
		});

		/**
		* Create an OAuth2 client with the given credentials, and then execute the
		* given callback function.
		*
		* @param {Object} credentials: The authorization client credentials.
		* @param {function} callback: The callback to call with the authorized client.
		*/
		function authorize(credentials, callback) {
			var clientSecret = credentials.installed.client_secret;
			var clientId = credentials.installed.client_id;
			var redirectUrl = credentials.installed.redirect_uris[0];
			var auth = new googleAuth();
			var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

			// Check if we have previously stored a token.
			fs.readFile(TOKEN_PATH, function(err, token) {
				if (err) {
					getNewToken(oauth2Client, callback);
				} else {
					oauth2Client.credentials = JSON.parse(token);
					callback(oauth2Client);
				}
			});
		}

		/**
		* Get and store new token after prompting for user authorization, and then
		* execute the given callback with the authorized OAuth2 client.
		*
		* @param {google.auth.OAuth2} oauth2Client: The OAuth2 client to get token for.
		* @param {getEventsCallback} callback: The callback to call with the authorized
		*     client.
		*/
		function getNewToken(oauth2Client, callback)
		{
			var authUrl = oauth2Client.generateAuthUrl(
			{
				access_type: 'offline',
				scope: SCOPES
			});
			console.log('Authorize this app by visiting this url: ', authUrl);
			var rl = readline.createInterface(
			{
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Enter the code from that page here: ', function(code)
			{
				rl.close();
				oauth2Client.getToken(code, function(err, token)
				{
					if (err)
					{
						console.error('Error while trying to retrieve access token', err);
						return;
					}
					oauth2Client.credentials = token;
					storeToken(token);
					callback(oauth2Client);
				});
			});
		}

		/**
		* Store token to disk be used in later program executions.
		*
		* @param {Object} token: The token to store to disk.
		*/
		function storeToken(token)
		{
			try
			{
				fs.mkdirSync(TOKEN_DIR);
			}
			catch (err)
			{
				if (err.code != 'EEXIST')
				{
					throw err;
				}
			}
			fs.writeFile(TOKEN_PATH, JSON.stringify(token));
			console.log('Token stored to ' + TOKEN_PATH);
		}

		///////////////////// End google pre-fab
	});
}
main();
