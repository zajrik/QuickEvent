'use strict';
import Event from './structures/Event';
import * as moment from 'moment';

type int = number;
type float = number;
type TimeArray = [string, int, int];

export default class EventBuilder
{
	private _colorId: string;
	private _summary: string;
	private _description: string;
	private _day: int;
	private _month: int;
	private _year: int;
	private _start: TimeArray;
	private _end: TimeArray;
	private _length: [float, int];

	public constructor() {}

	/** Set the color for the event */
	public color(color: int): this { this._colorId = String(color); return this; }

	/** Set the summary for the event */
	public summary(summary: string): this { this._summary = summary; return this; }

	/** Set the description for the event */
	public description(desc: string): this { this._description = desc; return this; }

	/** Set the day the event takes place */
	public day(day: int): this { this._day = day; return this; }

	/** Set the month the event takes place */
	public month(month: int): this { this._month = month; return this; }

	/** Set the year the event takes place */
	public year(year: int): this { this._year = year; return this; }

	/**
	 * Set the start time of the event. Accepts shorthand
	 */
	public start(time: string): this
	{
		this._start = this._parseTime(time);
		return this;
	}

	/** Set the end time of the event. Accepts shorthand */
	public end(time: string): this
	{
		this._end = this._parseTime(time);
		return this;
	}

	/**
	 * Return a prepared Event object ready for calendar insertion
	 */
	public prepare(): Event
	{
		if (!this._day) throw new Error('Events must have a day to take place');
		if (!this._month) throw new Error('Events must have a month to take place');
		if (!this._year) throw new Error('Events must have a year to take place');
		if (!this._start) throw new Error('Events must have a start time');
		if (!this._end) throw new Error('Events must have an end time');
		if (!this._summary) throw new Error('Events must have a summary');

		this._length = this._getLength(this._start, this._end);
		let year: int = this._year;
		let month: int = this._month;
		let day: int = this._day;

		let monthDays: int = moment(`${year}-${month}`, 'YYYY-M').daysInMonth();

		let dateString: (time: string) => string = (time: string) => {
			let monthString: string = month < 10 ? `0${month}` : month.toString();
			let dayString: string = day < 10 ? `0${day}` : day.toString();
			return `${year}-${month}-${day}T${time}`;
		};

		const startString: string = dateString(this._start[0]);

		day += this._length[1];
		if (day > monthDays)
		{
			day = 1;
			month++;
		}

		if (month > 12)
		{
			month = 1;
			year++;
		}

		const endString: string = dateString(this._end[0]);
		const length: string = this._length[0] < 10 ? ` ${this._length[0].toFixed(2)}` : this._length[0].toFixed(2);
		const lengthString: string = `[${length} ${this._length[0] > 1 ? 'hrs' : 'hr'}]`;

		return new Event(
			this._colorId || '0',
			`${this._summary} ${lengthString}`,
			this._description || '',
			startString,
			endString);
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
		let am: boolean = time[3] === 'a' ? true : time[3] === 'p' ? false : null;

		let hr: string;
		let min: string;

		if (am === null && ([hour, minutes].join('')).length < 4)
			throw new Error(`Provided time format is invalid: ${timeString}`);

		if (minutes > 59)
		{
			minutes -= 60;
			hour++;
		}
		if (hour <  12 && !am) hour += 12;

		if (hour <  10 && am) hr = `0${hour}`;
		if (hour === 12 && am) hr = '00';
		if (minutes === 0) min = '00';

		return [`${hr}:${min}:00`, hour, minutes];
	}

	/**
	 * Get the time between a start time and end time
	 */
	private _getLength(start: TimeArray, end: TimeArray): [float, int]
	{
		var hours: int = 0;
		var daySpan: int = 0;
		var mins: int = 0;

		var startHr: int = start[1];
		var endHr: int = end[1];
		var startMin: int = start[2];
		var endMin: int = end[2];

		if (startHr < endHr) hours = endHr - startHr;
		else if (startHr > endHr) daySpan = 1;

		if (daySpan > 0) hours = (24 - startHr) + endHr;

		if (startMin < endMin) mins = ((endMin - startMin) / 60);
		else if (startMin > endMin) mins = ((startMin - endMin) / 60) * -1;

		return [hours + mins, daySpan];
	}
}
