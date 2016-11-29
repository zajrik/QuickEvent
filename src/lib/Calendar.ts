'use strict';
import * as google from 'googleapis';
import * as moment from 'moment-timezone';
import { Oauth2Client } from './GoogleAuth';
import Event from './structures/Event';

type int = number;

/**
 * Represents an interface with a selected google calendar.
 * Provides methods for interacting with the calendar via
 * its events
 */
export default class Calendar
{
	public api: any;
	public auth: Oauth2Client;
	public which: string;

	public constructor(auth: Oauth2Client, which?: 'primary' | string)
	{
		this.api = google.calendar('v3');
		this.auth = auth;
		this.which = which || 'primary';
	}

	/** Fetches and returns an array of upcoming events */
	public async fetchUpcomingEvents(max?: int): Promise<any[]>
	{
		return <any> new Promise((resolve, reject) =>
			this.api.events.list({
				auth: this.auth,
				calendarId: this.which,
				timeMin: (new Date()).toISOString(),
				maxResults: max || 10,
				singleEvents: true,
				orderBy: 'startTime'
			}, (err, response) => err ? reject(err) : resolve(response.items)));
	}

	/** 
	 * Fetches and returns an array of events within the provided range
	 * 
	 * Ranges must be a parseable DateTime string or a time in milliseconds
	 */
	public async fetchEventsInRange(min: string | int, max: string | int): Promise<any[]>
	{
		return <any> new Promise((resolve, reject) =>
			this.api.events.list({
				auth: this.auth,
				calendarId: this.which,
				timeMin: moment.tz(min, moment.tz.guess()).format(),
				timeMax: moment.tz(max, moment.tz.guess()).format(),
				singleEvents: true,
			}, (err, response) => err ? reject(err) : resolve(response.items)));
	}

	/** Insert an event into the calendar */
	public async insertEvent(event: Event): Promise<any>
	{
		return new Promise((resolve, reject) =>
			this.api.events.insert({
				auth: this.auth,
				calendarId: this.which,
				resource: event
			}, (err, response) => err ? reject(err) : resolve(response)));
	}

	/**
	 * Check if the provided event is a duplicate
	 * (eg. Matching fields, start/end, etc.)
	 */
	public async isDuplicate(event: Event): Promise<boolean>
	{
		const start: string = moment.tz(event.start.dateTime, moment.tz.guess()).format();
		const end: string = moment.tz(event.end.dateTime, moment.tz.guess()).format();
		const potentialDuplicates: any[] = await this.fetchEventsInRange(start, end);
		const duplicates: any[] = potentialDuplicates.map(e =>
			e.start.dateTime === start
			&& e.end.dateTime === end
			&& e.summary === event.summary);

		return duplicates.length > 0;
	}
}
