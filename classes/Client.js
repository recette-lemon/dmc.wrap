"use strict";

const Collection = require("./Collection.js");
const User = require("./User.js");
const Role = require("./Role.js");
const Channel = require("./Channel.js");
const Message = require("./Message.js");

const Crypto = require("crypto");
const Utility = require("../utility.js");

const assert = require("assert");

/**
@class
@extends WS
@see [WS]{@link https://www.npmjs.com/package/ws}
@param {String} privateKey Hex encoded secp521r1 private key. See {@link generatePrivateKey} to generate one.
@param {Object=} options
@param {Object=} options.url WebSocket endpoint.

@property {Collection:Message} messages
@property {Collection:Role} roles
@property {Collection:User} users
@property {Collection:Channel} channels
@property {Float} pings Time it took for the last 10 responses in ms.
@property {Float} ping Average of pings.
@property {User} user

@throws need a private key

@fires loggedin Signed into server.
@fires ready Retrieved users, roles, and channels.
@fires newmsg
@fires msgedited
@fires msgdeleted
@fires msgpinned
@fires msgunpinned
@fires channeladded
@fires channeedited
@fires channeldeleted
@fires roleadded
@fires roleedited
@fires roledeleted
@fires roleaddedtouser
@fires roleremovedfromuser
*/

class Client extends require("ws"){
	constructor(privateKey, options={}){
		assert(privateKey, "need a private key");

		super(options.url || "wss://ws.dmc.chat:9000/");

		this.ecdh = Crypto.createECDH("secp521r1");
		this.ecdh.setPrivateKey(privateKey, "hex");

		this.options = options;
		this.responseQueue = new Map();

		this.messages = new Collection();
		this.roles = new Collection();
		this.users = new Collection();
		this.channels = new Collection();

		this.pings = [];

		this.on("message", (message) => {
			message = JSON.parse(message);
			if(process.argv.indexOf("--db") !== -1 )
				console.log("RECIEVED", message);

			// someone tell hentai id isnt a fucking acronym
			if(Array.isArray(message.data)){
				message.data.forEach((d) => {
					d.id = d.ID;
					delete d.ID;
				});
			} else {
				message.data.id = message.data.ID;
				delete message.data.ID;
			}
			
			let data = manageChanges(message.name || message.type, message.data);

			if(message.type === "event")
				return this.emit(message.name, data);

			this.responseQueue.get(message.s)[message.type === "error" ? 1 : 0](data);

			this.pings.push((new Date).getTime() - this.responseQueue.get(message.s)[2]);
			if(this.pings.length > 10)
				this.pings.shift();

			this.responseQueue.delete(message.s);
		});

		this.on("open", this._auth);
		this.on("error", console.error);

		let _this = this;

		// maintain consistency with the kept data.
		function manageChanges(type, obj){
			//console.log("manage changes", type)

			// curse the way switch handles let
			let mes, chan, role, user;
			switch(type){

				// message array
				case "gethistory":
					return obj.map((o) => {
						let mes = _this.messages.get(o.id) || new Message(o, _this);
						addMessage(mes);
						return mes;
					});

				// message
				case "sendmsg":
				case "newmsg": // add messages to records
					mes = new Message(obj, _this);
					addMessage(mes);
					return mes;

				case "editmsg":
				case "msgedited":
				case "msgpinned":
				case "msgunpinned":
				case "togglepinmsg": // merge with new message
					mes = getObject(obj, Message);
					Object.assign(mes, new Message(obj, _this));
					return mes;

				case "deletemsg":
				case "msgdeleted": // mark as deleted
					mes = getObject(obj, Message);
					mes.deleted = true;
					return mes;

				// channel
				case "addchannel":
				case "channeladded":
					chan = new Channel(obj, _this);
					_this.channels.set(chan.id, chan);
					return mes;

				case "editchannel":
				case "channeedited":
					chan = getObject(obj, Channel);
					Object.assign(chan, new Channel(obj, _this));
					return chan;

				case "deletechannel":
				case "channeldeleted":
					chan = getObject(obj, Channel);
					chan.deleted = true;
					return chan;

				// role
				case "addrole":
				case "roleadded":
					role = new Role(obj, _this);
					_this.roles.set(role.id, role);
					return role;

				case "editrole":
				case "roleedited":
					role = getObject(obj, Role);
					Object.assign(role, new Role(obj));
					return role;

				case "deleterole":
				case "roledeleted":
					role = getObject(obj, Role);
					role.deleted = true;
					return role;

				// role add/remove
				case "addusertorole":
				case "roleaddedtouser":
					user = _this.users.get(obj.UID);
					role = _this.roles.get(obj.RID);
					user.roles.set(role.id, role);
					return {user, role};

				case "roleremovedfromuser":
				case "removeuserfromrole":
					user = _this.users.get(obj.UID);
					role = _this.roles.get(obj.RID);
					user.roles.delete(role.id);
					return {user, role};
			}
			
			return obj;
		}

		function getObject(obj, cl){
			let l = cl.name.toLowerCase()+"s";
			let o = _this[l].get(obj.id);
			if(!o){
				o = new cl(obj, _this);
				_this[l].set(o.id, o)
			}
			return o;
		}

		function addMessage(obj){
			_this.messages.set(obj.id, obj);
			obj.channel.messages.set(obj.id, obj);
			obj.user.messages.set(obj.id, obj);
			obj.channel.messageCount++;
			obj.user.messageCount++;
		}

		function getType(data, message){
			let cl;
			if(data.nick !== undefined && message.type !== "auth" && message.type !== "getusers")
				cl = User;
			else if(data.description !== undefined && message.type !== "getchannels")
				cl = Channel;
			else if(data.color !== undefined && message.type !== "getroles")
				cl = Role;
			else if(data.pinned !== undefined){
				cl = Message;
			}
			return cl;
		}
	}

	/**
	Makes a direct message to the WebSocket. You shouldn't need to use this.
	@method
	@param {String} type
	@param {Object=} data
	@return {Promise}
	*/
	request(type, data={}){
		return new Promise((resolve, reject) => {
			let s = Math.random().toString(36).slice(2);

			this.responseQueue.set(s, [resolve, reject, (new Date).getTime()]);

			let out = {
				type,
				data,
				s
			};

			if(process.argv.indexOf("--db") !== -1 )
				console.log("SENDING", out);
			this.send(JSON.stringify(out));
		});
	}

	_auth(){
		let key = this.ecdh.getPublicKey("hex");
		this.request("auth", {key}).then((res) => {

			// compute share secret, hash it, then set up iv and cipherText.
			let secretHash = Utility.hashSHA256(this.ecdh.computeSecret(res.key, "hex"));
			let iv = Buffer.from(res.iv, "hex");
			let cipherText = Buffer.from(res.ciphertext, "hex");

			// use hashed secret to decrypt ciphertext, then hash it.
			let decipher = Crypto.createDecipheriv("aes-256-cbc", secretHash, iv);
			let cipherFinal = decipher.update(cipherText, "buffer");
			let bytesHash = Utility.hashSHA256(cipherFinal);
			
			// send hash as hex
			let d = {
				hash: bytesHash.toString("hex")
			};

			// needed if you're creating an account.
			if(this.options.name){
				d.status = this.options.status;
				d.name = this.options.name;
				d.avi = this.options.avi;
			}

			this.request("auth", d).then((clientUser) => {
				this.emit("loggedin");

				// set up basic stuff.
				Promise.all([
					this.request("getroles"),
					this.request("getusers"),
					this.request("getchannels"),
				]).then((res) => {
					for (var i = 0; i < res[0].length; i++) {
						this.roles.set(res[0][i].id, new Role(res[0][i], this));
					}

					for (var i = 0; i < res[1].length; i++) {
						this.users.set(res[1][i].id,  new User(res[1][i], this));
					}

					// need to first set default objects then set proper classes so i can call recursively within the class
					for (var i = 0; i < res[2].length; i++) {
						this.channels.set(res[2][i].id, res[2][i]);
					}
					
					for (var i = 0; i < res[2].length; i++) {
						if(this.channels.get(res[2][i].id).constructor.name !== "Channel")
							this.channels.set(res[2][i].id,  new Channel(res[2][i], this));
					}

					this.user = this.users.get(clientUser.id);

					this.emit("ready");
				});
			}, console.error);
		}, console.error);
	}

	get ping(){
		return this.pings.reduce((a, b) => {return a+b}) / this.pings.length;
	}

	/**
	@method
	@see [DMC API docs]{@link https://dmc.chat/docs/#addrole}
	@see [Role]{@link Role}
	@param {Object} properties Can either use the DMC.wrap or DMC.chat API names, but they need to be the same format as in the DMC.chat API docs. DMC.wrap names are listed below.
	@param {String} properties.name
	@param {String} properties.colour
	@param {Int} properties.priority
	@param {Bool} properties.hoisted
	@param {String} properties.globalPerms
	@param {String} properties.baseChannelPerms
	@return {Promise}
	@throws invalid properties
	@example
Bot.createRole({
	name: "testing role",
	color: "#8a00ff",
	priority: 0,
	hoisted: true,
	globalPerms: "1tintc/9of/0",
	baseChannelPerms: "19a3oe1ivr/1/1dor0/5/2kc0"
});
	*/
	createRole(props){
		if(props.colour)
			props.color = props.colour;
		if(props.hoisted !== undefined)
			props.displayType = props.hoisted;

		assert(props.name && props.color &&
			props.priority !== undefined && props.displayType !== undefined &&
			props.globalPerms && props.baseChannelPerms, "invalid properties");

		return this.request("addrole", props);
	}

	/**
	@method
	@param {Object} properties
	@param {String} properties.name
	@param {String} properties.description
	@param {Int=} properties.PID Parent id. Defaults to no parent.
	@param {Int} properties.order
	@param {String/Int} properties.type 0: text, 1: category
	@param {Object=} properties.perms Role permission overrides. Format is {roleId: permString}.
	@return {Promise}
	@see {@link Channel.createChild}
	@throws invalid properties
	@throws parent isnt a category channel
	*/
	createChannel(props){
		if(props.order !== undefined)
			props.OID = props.order

		assert(props.name && props.description !== undefined &&
			props.OID !== undefined && props.type !== undefined,
			"invalid properties");

		if(typeof(props.type) === "string")
			props.type = ["text", "category"].indexOf(props.type); 

		props.perms = props.perms || {};
		props.PID = props.PID || -1;

		if(props.PID !== -1)
			assert(this.channels.get(props.PID).type === 1, "parent isnt a category channel");

		return this.request("addchannel", props);
	}
}

module.exports = Client;