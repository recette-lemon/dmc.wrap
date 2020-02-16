"use strict";

const Permissions = require("./Permissions.js");

/**
@class
@param {Object} obj
@param {Object} client

@property {Int} id
@property {String} name
@property {String} color
@property {String} colour Proxy for color.
@property {Int} priority Role position.
@property {Permissions} permissions
@property {Bool} hoisted Whether it's displayed on the sidebar.
*/

class Role{
	constructor(obj, client){
		Object.assign(this, obj);

		Object.defineProperty(this, "_client", {
			enumerable: false,
			writable: true,
			value: client
		});

		this.permissions = new Permissions(this.globalPerms, this.baseChannelPerms);
		delete this.globalPerms;
		delete this.baseChannelPerms;

		this.hoisted = !!this.group;
		delete this.group;
	}

	get colour(){
		return this.color;
	}

	/**
	@method
	@return {Promise}
	*/
	delete(){
		return this._client.request("deleterole", {
			RID: this.id
		});
	}

	/**
	@method
	@param {Object} properties Can either use the DMC.wrap or DMC.chat API names, but they need to be the same format as in the DMC.chat API docs. DMC.wrap names are listed below.
	@param {String} properties.name
	@param {String} properties.colour
	@param {Int} properties.priority
	@param {Bool} properties.hoisted
	@param {String} properties.globalPerms
	@param {String} properties.baseChannelPerms
	@return {Promise}
	@see [DMC docs role]{@link https://dmc.chat/docs/#role}
	*/
	edit(changes){
		if(props.colour)
			props.color = props.colour;
		if(props.hoisted)
			props.displayType = props.hoisted;
		
		changes.RID = this.id;
		return this._client.request("deleterole", changes);
	}
}

module.exports = Role;