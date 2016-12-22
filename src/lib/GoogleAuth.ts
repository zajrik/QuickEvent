import Constants from './util/Constants';
import { LocalStorage } from 'node-localstorage';
import * as googleAuth from 'google-auth-library';
import * as prompt from 'prompt-promise';
import * as path from 'path';
import * as fs from 'fs';

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
 * related to those purposes. Requires a node-localstorage instance
 * to be passed upon creation
 */
export default class GoogleAuth
{
	private _credentials: ClientCredentials;

	public storage: LocalStorage;
	public scopes: string[];
	public client: Oauth2Client;

	public constructor(clientSecretPath: string, scopes: string[], storage: LocalStorage)
	{
		this.scopes = scopes;
		this.storage = storage;

		if (!clientSecretPath && !this.storage.getItem('clientSecretpath'))
			throw new Error(Constants.errors.CLIENT_SECRET_MISSING);
		if (clientSecretPath) this.storage.setItem('clientSecretpath', path.resolve(clientSecretPath));

		this._credentials = JSON.parse(fs.readFileSync(this.storage.getItem('clientSecretpath')).toString());
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
		const code: string = await prompt('Enter the resulting code here: ');
		prompt.done();

		let token: Token;
		try
		{
			token = <Token> await new Promise((resolve, reject) =>
			{
				client.getToken(code, (err, newToken) => err ? reject(err) : resolve(newToken));
			});
		}
		catch (err)
		{
			throw new Error(Constants.errors.TOKEN_ACCESS(err));
		}
		this.storeToken(token);
		client.credentials = token;
		return client;
	}

	/** Store auth token */
	private storeToken(token: Token): void
	{
		this.storage.setItem('token', JSON.stringify(token));
	}

	/** Retrieve auth token */
	private getToken(): Token
	{
		return JSON.parse(this.storage.getItem('token'));
	}

	/**
	 * Create a new oauth2Client for this instance from the credentials
	 * suppplied on initialization
	 */
	public async authorize(): Promise<void>
	{
		const clientSecret: string = this._credentials.installed.client_secret;
		const clientId: string = this._credentials.installed.client_id;
		const redirectUrl: string = this._credentials.installed.redirect_uris[0];
		const auth: any = new googleAuth();
		this.client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

		if (!this.storage.getItem('token')) this.client = await this.getNewToken(this.client);
		else this.client.credentials = this.getToken();
	}
}
