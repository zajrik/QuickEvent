'use strict';
import * as path from 'path';
import * as fs from 'fs';
import Constants from './util/Constants';

type int = number;

/**
 * Handles loading and parsing of an events shorthand file
 * as well as creation of events objects from the parsed shorthand
 */
export default class EventsFileReader
{
	private _file: string[];
	private _color: int;
	private _summary: string;
	private _eventStrings: string[];
	private _eventRegex: RegExp;

	public constructor(file: string)
	{
		try
		{
			this._file = fs.readFileSync(path.resolve(file))
				.toString()
				.split('\n')
				.map(line => line.replace('\r', ''));
		}
		catch (err)
		{
			throw new Error(Constants.errors.EVENTS_FILE_LOAD(err));
		}

		this._eventRegex = /^(\d{1,2}) (\d{1,2}(?::?\d{2})?[ap]?m?) (\d{1,2}(?::?\d{2})?[ap]?m?)(?: ([^\|<]+))?(?: \| ([^\|<]+))?(?: << (\d{1,2}))?$/;
		const colorRegex: RegExp = /color (\d{1,2})/;

		this._summary = this._file.shift();
		if (colorRegex.test(this._summary)) throw new Error(Constants.errors.EVENTS_FILE_FORMAT);
		if (this._eventRegex.test(this._summary)) throw new Error(Constants.errors.EVENTS_FILE_FORMAT);

		this._color = colorRegex.test(this._file[0])
			? parseInt(this._file.shift().match(colorRegex)[1]) : 0;

		this._eventStrings = [...this._file];
		this._eventStrings.forEach(e => {
			if (!this._eventRegex.test(e)) throw new Error(Constants.errors.EVENTS_FILE_EVENT_FORMAT(e));
		});
	}
}
