'use strict';
import * as googleAuth from 'google-auth-library';
import { LocalStorage } from 'node-localstorage';
import * as prompt from 'prompt-promise';
import * as path from 'path';
import * as fs from 'fs';

type int = number;

type Token = {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expiry_date: int;
}

type ClientCredentials = {
	installed: {
		client_id: string;
		project_id: string;
		auth_uri: string;
		token_uri: string;
		auth_provider_x509_cert_url: string;
		client_secret: string;
		redirect_uris: string[];
	}
}

export type Oauth2Client = {
	credentials: Token;
	generateAuthUrl(options: any): string;
	getToken(code: string, callback: Function): void;
}

/**
 * Handles creation and authorization of an Oauth2Client instance
 * for use with Google apis as well as storage of information
 * related to those purposes. Requires a node-localstorage insance
 * to be passed upon creation
 */
export default class GoogleAuth
{
	private credentials: ClientCredentials;

	public storage: LocalStorage;
	public scopes: string[];
	public client: Oauth2Client;

	public constructor(clientSecretPath: string, scopes: string[], storage: LocalStorage)
	{
		this.scopes = scopes;
		this.storage = storage;

		if (!clientSecretPath && !this.storage.getItem('clientSecretpath'))
			throw new Error('You must provide a client_secret.json if this is the first time running.');
		if (clientSecretPath) this.storage.setItem('clientSecretpath', path.resolve(clientSecretPath));

		this.credentials = JSON.parse(fs.readFileSync(this.storage.getItem('clientSecretpath')).toString());
	}

	/**
	 * Get and store new token after prompting for user authorization.
	 * Takes an oauth2Client and returns an oauth2Client with authorized
	 * credentials
	 */
	private async getNewToken(client: Oauth2Client): Promise<Oauth2Client>
	{
		const authUrl: string = client.generateAuthUrl(
		{
			access_type: 'offline',
			scope: this.scopes
		});

		console.log(`Authorize this app by visiting this url:\n${authUrl}\n`);
		const code: string = await prompt('Enter the code from that page here: ');
		let token: Token;
		try
		{
			token = <Token> await new Promise((resolve, reject) =>
			{
				client.getToken(code, (err, newToken) => err ? reject(err) : resolve(newToken));
			});
			prompt.done();
		}
		catch (err)
		{
			prompt.done();
			throw new Error(`Error while trying to retrieve access token: ${err}`);
		}
		this.storeToken(token);
		client.credentials = token;
		return client;
	}

	/**
	 * Store the auth token
	 */
	private storeToken(token: Token): void
	{
		this.storage.setItem('token', JSON.stringify(token));
	}

	/**
	 * Retrieve the auth token
	 */
	private getToken(): Token
	{
		return JSON.parse(this.storage.getItem('token'));
	}

	/**
	 * Create a new oauth2Client for this instance from the credentials
	 * suppplied on initialization
	 */
	public async authorize(): Promise<any>
	{
		const clientSecret: string = this.credentials.installed.client_secret;
		const clientId: string = this.credentials.installed.client_id;
		const redirectUrl: string = this.credentials.installed.redirect_uris[0];
		const auth: any = new googleAuth();
		this.client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

		if (!this.storage.getItem('token')) this.client = await this.getNewToken(this.client);
		this.client.credentials = this.getToken();
	}
}
