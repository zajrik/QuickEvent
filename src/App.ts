'use strict';
import { LocalStorage } from 'node-localstorage';
import EventBuilder from './lib/EventBuilder';
import Event from './lib/structures/Event';
import GoogleAuth from './lib/GoogleAuth';
import Calendar from './lib/Calendar';
import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';
import * as moment from 'moment-timezone';
import dirExists from './lib/util/DirExists';

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
	await auth.authorize();
	const calendar: Calendar = new Calendar(auth.client);
	console.log(await calendar.fetchUpcomingEvents());
	let event: Event = new EventBuilder()
		.color(2)
		.year(2016)
		.month(11)
		.day(30)
		.summary('foo')
		.description('bar')
		.start('10p')
		.end('10:30p')
		.prepare();
	console.log(event);
	if (await calendar.isDuplicate(event)) console.log('Cannot insert duplicate event');
	else console.log(await calendar.insertEvent(event));
	// console.log(await calendar.isDuplicate(event));
	// console.log(await calendar.insertEvent(event));
}
main().catch(console.error);
