"use strict";

/**
@class
@param {Object} obj
@param {Object} client

@property {String} hash
@property {String} name
@property {String} contentType Mime type.
@property {Int} size In bytes.
@property {String} url
@property {Int} width Images only.
@property {Int} height Images only.
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
		return this._client.fileEndpoint+this.hash.toString("hex")+"/"+this.name;
	}
}

module.exports = File;