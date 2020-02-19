"use strict";

/**
@class
@param {Object} obj
@param {Object} client

@property {String} hash
@property {String} name
@property {String} contentType Mime type.
@property {Int} size In bytes.
@property {String} url.
*/
class File{
	constructor(obj, client){
		Object.assign(this, obj);

		Object.defineProperty(this, "_client", {
			enumerable: false,
			writable: true,
			value: client
		});
	}

	get url(){
		return "https://files.dmc.chat/"+this.hash+"/"+this.name;
	}
}

module.exports = File;