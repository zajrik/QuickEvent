'use strict';
import { LocalStorage } from 'node-localstorage';
import { Moment } from 'moment';

import GoogleAuth from './lib/GoogleAuth';
import Calendar from './lib/Calendar';
import EventsFileReader from './lib/EventsFileReader';
import Event from './lib/structures/Event';
import dirExists from './lib/util/DirExists';

import * as moment from 'moment-timezone';
import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';

const now: Moment = moment();
const argOpts: any = {
	f: {
		alias: 'file',
		demand: true,
		nargs: 1,
		describe: 'path to events file',
		type: 'string'
	},
	s: {
		alias: 'secret',
		nargs: 1,
		describe: 'path to client secret json file',
		type: 'string'
	},
	y: {
		alias: 'year',
		nargs: 1,
		describe: 'the year to to create events for',
		type: 'number',
		default: parseInt(now.format('YYYY'))
	},
	m: {
		alias: 'month',
		nargs: 1,
		describe: 'the month to to create events for',
		type: 'number',
		default: parseInt(now.format('M'))
	}
};

const argv: any = yargs
	.usage('Usage: $0 -f <eventsfile> [...options]')
	.options(argOpts)
	.argv;

const homeDir: string = process.env.USERPROFILE || process.env.HOME;
const qeDir: string = path.join(homeDir, '.qe');
if (!dirExists(qeDir)) fs.mkdirSync(qeDir);

const storage: LocalStorage = new LocalStorage(path.join(qeDir, 'localstorage'));

async function main(): Promise<any>
{
	const scopes: string[] = ['https://www.googleapis.com/auth/calendar'];
	const auth: GoogleAuth = new GoogleAuth(argv.secret, scopes, storage);

	console.log('Authorizing...');
	await auth.authorize();
	console.log('Authorization complete!');

	const calendar: Calendar = new Calendar(auth.client);

	console.log('Reading events file...');
	const eventsFileReader: EventsFileReader = new EventsFileReader(argv.f);
	console.log('Events file reading complete!');

	console.log('Creating events...');
	const events: Event[] = eventsFileReader.generateEvents({ year: argv.y, month: argv.m });
	for (let event of events)
	{
		if (await calendar.isDuplicate(event))
		{
			console.log(`Skipping duplicate event: ${event.start.dateTime}, ${event.summary}${event.description !== '' ? ` | ${event.description}` : ''}`);
			continue;
		}
		else
		{
			try
			{
				await calendar.insertEvent(event);
				console.log(`Event created: ${event.start.dateTime}, ${event.summary}${event.description !== '' ? ` | ${event.description}` : ''}`);
			}
			catch (err)
			{
				throw new Error(`There was an error inserting a calendar event:\n${err}`);
			}
		}
	}
	console.log('Finished creating events.');
}
main().catch(console.error);
