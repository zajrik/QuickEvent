'use strict';
import Event from './structures/Event';
import * as moment from 'moment';

type int = number;
type TimeArray = [string, int, int];

export default class EventBuilder
{
	private _colorId: string;
	private _summary: string;
	private _description: string;
	private _year: int;
	private _month: int;
	private _day: int;
	private _start: string;
	private _end: string;
	private _length: number;

	public constructor() {}

	/** Set the color for the event */
	public color(color: int): this { this._colorId = String(color); return this; }

	/** Set the summary for the event */
	public summary(summary: string): this { this._summary = summary; return this; }

	/** Set the description for the event */
	public description(desc: string): this { this._description = desc; return this; }

	/**
	 * Set the start time of the event. Accepts shorthand
	 */
	public start(time: string): this
	{
		this._start = this._parseTime(time)[0];
		return this;
	}

	/** Set the end time of the event. Accepts shorthand */
	public end(time: string): this
	{
		this._end = this._parseTime(time)[0];
		return this;
	}

	/**
	 * Return a prepared Event object ready for calendar insertion
	 */
	public prepare(): Event
	{
		return new Event(this._colorId, this._summary, this._description, this._start, this._end);
	}

	/**
	 * Parse time shorthand (eg. 930a, 7p, 12:38a)
	 */
	private _parseTime(timeString: string): TimeArray
	{
		const regex: RegExp = /^(\d{1,2})(?::?(\d{2}))?(?:(a|p)m?)?$/;
		const time: RegExpMatchArray = timeString.match(regex);
		let hour: int = parseInt(time[1]);
		let minutes: int = parseInt(time[2]) || 0;
		let meridian: string = time[3] || null;

		let hr: string;
		let min: string;

		if (!meridian && ([hour, minutes].join('')).length < 4)
			throw new Error(`Provided time format is invalid: ${timeString}`);

		if (minutes > 59)
		{
			minutes -= 60;
			hour++;
		}
		if (hour <  12 && meridian === 'p') hour += 12;

		if (hour <  10 && meridian === 'a') hr = `0${hour}`;
		if (hour === 12 && meridian === 'a') hr = '00';
		if (minutes === 0) min = '00';


		return [`${hr}:${min}:00`, hour, minutes];
	}
}
