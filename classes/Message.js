"use strict";

const File = require("./File.js");

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

		this.user = this._client.users.get(this.uId);
		this.channel = this._client.channels.get(this.cId);
		delete this.uId;
		delete this.cId;

		this.createdTime = this.time;
		delete this.time;

		this.pinned = !!this.pinned;
		this.edited = !!this.edited;
		this.editor = this.editorId ? this._client.users.get(this.editorId) : null;
		delete this.editorId;

		this.attachments.files = this.attachments.files.map(f => {return new File(f, this._client)});
	}

	get author(){
		return this.user;
	}

	get files(){
		return this.attachments.files;
	}

	get embeds(){
		return this.attachments.embeds;
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
			mId: this.id,
			content
		});
	}

	/**
	@method
	@return {Promise}
	*/
	delete(){
		return this._client.request("deletemsg", {
			mId: this.id
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
			mId: this.id
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
			mId: this.id
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