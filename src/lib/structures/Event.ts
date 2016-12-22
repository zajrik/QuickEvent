import * as moment from 'moment-timezone';

export default class Event
{
	public colorId: string;
	public summary: string;
	public description: string;
	public start: {
		dateTime: string;
		timeZone: string;
	};
	public end: {
		dateTime: string;
		timeZone: string;
	};

	public constructor(color: string, summary: string, description: string, start: string, end: string)
	{
		this.colorId = color;
		this.summary = summary;
		this.description = description;
		this.start = {
			dateTime: start,
			timeZone: moment.tz.guess()
		};
		this.end = {
			dateTime: end,
			timeZone: moment.tz.guess()
		};
	}
}
