'use strict';
import * as google from 'googleapis';
import { Oauth2Client } from './GoogleAuth';

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

	public async fetchUpcomingEvents(max?: int): Promise<any>
	{
		return new Promise((resolve, reject) =>
			this.api.events.list(
				{
				auth: this.auth,
				calendarId: 'primary',
				timeMin: (new Date()).toISOString(),
				maxResults: max || 10,
				singleEvents: true,
				orderBy: 'startTime'
			}, (err, response) => err ? reject(err) : resolve(response.items)));
	}
}
