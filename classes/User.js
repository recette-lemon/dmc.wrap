"use strict";

const Collection = require("./Collection.js");

function setRoles(roles, _this, req){
	roles = ((roles.constructor.name === "Collection") ? roles.array : roles).map((r) => {
		return r.id || r;
	});

	return Promise.all(roles.map((r) => {
		return _this._client.request(req, {
			uId: _this.id,
			rId: r
		});
	}));
}

/**
@class
@param {Object} obj
@param {Object} client

@property {Int} id
@property {String} name
@property {String} nick Nickname.
@property {Int} joinedTime
@property {Date} joinedAt
@property {String} avatar URL to user avatar.
@property {Int} state 0: offline, 1: online, 2: afk, 3: busy
@property {String} stateText
@property {String} avatarUrl
@property {Int} messageCount
@property {Collection} roles
@property {Collection} messages
*/
class User{
	constructor(obj, client){
		Object.assign(this, obj);

		Object.defineProperty(this, "_client", {
			enumerable: false,
			value: client
		});

		this.roles = new Collection(this.roles.map((r) => {return this._client.roles.get(r)}));
		this.messages = new Collection();
	}

	get stateText(){
		return ["offline", "online", "afk", "busy"][this.state];
	}

	get joinedAt(){
		return new Date(this.joinedTime);
	}

	get avatar(){
		return this._client.fileEndpoint+"avi/"+this.id;
	}

	/**
	@method
	@param {Role/id} role
	@return {Promise}
	*/
	addRole(role){
		return this.addRoles([role]);
	}

	/**
	@method
	@param {Array:Role/id} roles
	@return {Promise}
	*/
	addRoles(roles){
		return setRoles(roles, this, "addusertorole");
	}

	/**
	@method
	@param {Role/id} role
	@return {Promise}
	*/
	removeRole(role){
		return this.removeRoles([role]);
	}

	/**
	@method
	@param {Array:Role/id} roles
	@return {Promise}
	*/
	removeRoles(roles){
		return setRoles(roles, this, "removeuserfromrole");
	}
}

module.exports = User;