'use strict';
import { LocalStorage } from 'node-localstorage';
import GoogleAuth from './lib/GoogleAuth';
import Calendar from './lib/Calendar';
import * as yargs from 'yargs';
import * as path from 'path';
import * as fs from 'fs';
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

const windows: boolean = process.platform === 'win32';
const homeDir: string = process.env[windows ? 'USERPROFILE' : 'HOME'];
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
}
main().catch(console.error);
