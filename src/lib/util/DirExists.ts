'use strict';
import * as fs from 'fs';

/**
 * Check if a directory exists
 */
export default function dirExists(path: string): boolean
{
	try
	{
		fs.accessSync(path);
		return true;
	}
	catch (err)
	{
		return false;
	}
}
