'use strict';

type Errors = {
	EVENTS_FILE_LOAD: (err: string) => string;
	EVENTS_FILE_FORMAT: string;
	EVENTS_FILE_EVENT_FORMAT: (event: string) => string;
}

type ValueConstants = {
	errors: Errors;
}

const Constants: ValueConstants = <any> {}; // tslint:disable-line

Constants.errors = {
	EVENTS_FILE_LOAD: (err: string) => `There was an error loading the events file:\n${err}`,
	EVENTS_FILE_FORMAT: 'The provided events file was formatted incorrectly',
	EVENTS_FILE_EVENT_FORMAT: (event: string) => `Event is formatted incorrectly: ${event}`
};
export default Constants;
