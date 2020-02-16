"use strict";

/**
@class
@param {Object} obj
@param {Object} client

@property {Int} id
@property {String} content
@property {Array} attachments 
@property {Int} TTL Time to live until auto-deletion.
@property {Bool} pinned
@property {Bool} edited
@property {User} user
@property {User} author Proxy for user.
@property {Channel} channel
@property {Int} createdTime
@property {Date} createdAt
*/

class Message{
	constructor(obj, client){
		Object.assign(this, obj);

		Object.defineProperty(this, "_client", {
			enumerable: false,
			writable: true,
			value: client
		});

		this.user = this._client.users.get(this.UID);
		this.channel = this._client.channels.get(this.CID);
		delete this.UID;
		delete this.CID;

		this.createdTime = this.time;
		delete this.time;

		this.pinned = !!this.pinned;
		this.edited = !!this.edited;
		this.editor = this.editorID ? this._client.users.get(this.editorID) : null;
		delete this.editorID;
	}

	get author(){
		return this.user;
	}

	get createdAt(){
		return new Date(this.createdTime);
	}

	/**
	@method
	@param {String} content
	@return {Promise}
	*/
	edit(content){
		return this._client.request("editmsg", {
			MID: this.id,
			content
		});
	}

	/**
	@method
	@return {Promise}
	*/
	delete(){
		return this._client.request("deletemsg", {
			MID: this.id
		});
	}

	/**
	@method
	@return {Promise}
	*/
	pin(){
		if(this.pinned){
			return new Promise((res) => {
				res(this);
			});
		}
		return this._client.request("togglepinmsg", {
			MID: this.id
		});
	}

	/**
	@method
	@return {Promise}
	*/
	unpin(){
		if(!this.pinned){
			return new Promise((res) => {
				res(this);
			});
		}
		return this._client.request("togglepinmsg", {
			MID: this.id
		});
	}

	/**
	Convinience function for message.channel.send
	@method
	@param {String} content
	@return {Promise}
	*/
	reply(out){
		return this.channel.send(out);
	}
}

module.exports = Message;