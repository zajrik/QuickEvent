'use strict';
import GoogleAuth from './lib/GoogleAuth';
import Calendar from './lib/Calendar';
import * as yargs from 'yargs';

type int = number;

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

console.log(argv);
async function main(): Promise<any>

{
	const auth: GoogleAuth = new GoogleAuth(argv.secret, ['https://www.googleapis.com/auth/calendar']);
	await auth.authorize();
	const calendar: Calendar = new Calendar(auth.client);
	console.log(await calendar.fetchUpcomingEvents());
}
main().catch(console.error);
