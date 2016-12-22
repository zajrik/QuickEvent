type Errors = {
	CLIENT_SECRET_MISSING: string;
	TOKEN_ACCESS: (err: string) => string;

	EVENTS_FILE_LOAD: (err: string) => string;
	EVENTS_FILE_FORMAT: string;
	EVENTS_FILE_EVENT_FORMAT: (event: string) => string;
	EVENTS_FILE_EVENT_INVALID_MONTH: (event: string) => string;

	EVENT_DAY: string;
	EVENT_MONTH: string;
	EVENT_YEAR: string;
	EVENT_START: string;
	EVENT_END: string;
	EVENT_SUMMARY: string;

	TIME_SHORTHAND_FORMAT: (time: string) => string;

	CALENDAR_INSERT: (err: string) => string;
}

type ValueConstants = {
	errors: Errors;
}

const Constants: ValueConstants = <any> {}; // tslint:disable-line

Constants.errors = {
	CLIENT_SECRET_MISSING: 'You must provide a client_secret.json if this is the first time running.',
	TOKEN_ACCESS: (err: string) => `Error while trying to retrieve access token: ${err}`,

	EVENTS_FILE_LOAD: (err: string) => `There was an error loading the events file:\n${err}`,
	EVENTS_FILE_FORMAT: 'The provided events file was formatted incorrectly',
	EVENTS_FILE_EVENT_FORMAT: (event: string) => `Event is formatted incorrectly: ${event}`,
	EVENTS_FILE_EVENT_INVALID_MONTH: (event: string) => `Event contains an invalid month override: ${event}`,

	EVENT_DAY: 'Events must have a day to take place',
	EVENT_MONTH: 'Events must have a month to take place',
	EVENT_YEAR: 'Events must have a year to take place',
	EVENT_START: 'Events must have a start time',
	EVENT_END: 'Events must have an end time',
	EVENT_SUMMARY: 'Events must have a summary',

	TIME_SHORTHAND_FORMAT: (time: string) => `Provided time format is invalid: ${time}`,

	CALENDAR_INSERT: (err: string) => `There was an error inserting a calendar event:\n${err}`
};
export default Constants;
