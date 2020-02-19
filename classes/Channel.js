"use strict";

const Collection = require("./Collection.js");
const Permissions = require("./Permissions.js");

function getMessages(args, _this, req){
	args.cId = _this.id;
	return new Promise((resolve, reject) => {
		_this._client.request(req, args).then(mes => {

			resolve(new Collection(mes));

		}, reject);
	});
}

function uploadFile(path, client){
	return new Promise((resolve, reject) => {
		require("fs").readFile(path, (err, data) => {
			if(err)
				return reject(err);

			let s = Math.random().toString(36).slice(2);
			let hash = require("../utility.js").hashSHA256(data).toString("hex");

			// only works on linux for now
			let mime = require('child_process').execFileSync("file", [path, "--mime-type", "-b"]).toString().slice(0, -1) || "";

			client.request("uploadfile", {
				hash,
				name: require("path").parse(path).base,
				contentType: mime,
				size: data.length
			}, s).then((res) => {
				if(res.hash)
					return resolve(hash);

				let promises = [];
				let nChunks = Math.ceil(data.length / 10240);

				for (var i = 0; i < nChunks; i++) {
					promises.push(client.request("uploadfile", {
						part: i,
						bin: data.slice(i*10240, (i+1)*10240)
					}, s+"-"+i));	
				}

				Promise.all(promises).then(() => {
					resolve(hash);
				}, reject);
			});
		});
	});
}

/**
@class
@param {Object} obj
@param {Object} client

@todo addchannel
@todo editchannel
@todo deletechannel

@property {Int} id
@property {String} name
@property {Collection} children
@property {Collection} messages
@property {Int} Position
@property {Permissions} permissions
@property {Channel/Null} parent
@property {Channel/Null} parent
@property {Int} type 0: text, 1: category
@property {String} typeText
*/

class Channel{
	constructor(obj, client){
		Object.assign(this, obj);

		Object.defineProperty(this, "_client", {
			enumerable: false,
			writable: true,
			value: client
		});

		this.children = new Collection();
		this.messages = new Collection();

		this.position = this.oId;
		delete this.oId;

		this.permissions = new Permissions(this.perms[1], this.perms[2]);
		delete this.perms;

		let parentId = this.pId;
		delete this.pId;

		if(parentId === -1)
			return this.parent = null;

		let parent = this._client.channels.get(parentId);
		if(parent.constructor.name === "Channel"){
			this.parent = parent;
			parent.children.set(this.id, this);
			return;
		}

		this.parent = new Channel(parent);
		this._client.channels.set(parentId, this.parent);
		this.parent.children.set(this.id, this);
	}

	get typeText(){
		return ["text", "category"][this.type];
	}

	/**
	@method
	@param {String} content
	@param {Object=} options
	@param {Array=} options.files Path to files to upload with message.
	@return {Promise}
	*/
	send(content, options={}){
		return new Promise((resolve, reject) => {
			Promise.all((options.files || []).map((path) => {
				return uploadFile(path, this._client);
			})).then((files) => {
				this._client.request("sendmsg", {
					cId: this.id,
					content,
					attachments: {
						files,
						embeds: []
					}
				}).then(resolve, reject);
			});
		});
	}

	/**
	@method
	@return {Promise}
	*/
	fetchHistory(args={amount: 100}){
		return getMessages(args, this, "gethistory");
	}

	/**
	@method
	@return {Promise}
	*/
	fetchPinned(){
		return getMessages({}, this, "getpinned");
	}

	/**
	@method
	@param {Object} properties
	@param {String} properties.name
	@param {String} properties.description
	@param {Int} properties.order
	@param {String/Int} properties.type 0: text, 1: category
	@param {Object=} properties.perms Role permission overrides. Format is {roleId: permString}.
	@return {Promise}
	@see {@link Channel.createChild}
	@throws invalid properties
	@throws parent isnt a category channel
	*/
	createChild(props){
		props.pId = this.id;
		return this._client.createChannel(props);
	}

	/**
	@method
	@return {Promise}
	*/
	delete(){
		return this._client.request("deletechannel", {
			cId: this.id
		});
	}

	/**
	@method
	@param {Object} properties
	@param {String} properties.name
	@param {String} properties.description
	@param {Int} properties.order
	@param {String/Int} properties.type 0: text, 1: category
	@param {Object=} properties.perms Role permission overrides. Format is {roleId: permString}.
	@return {Promise}
	*/
	edit(props){
		props.cId = this.id;
		return this._client.request("editchannel", props);
	}
}

module.exports = Channel;