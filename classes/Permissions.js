"use strict";

const globalToggles = [
	"EDITROLEPERMS",
	"EDITROLENAME",
	"EDITROLECOLOR",
	"EDITROLEDISPLAYTYPE",
	"CREATEROLE",
	"DELETEROLE",
	"CHANGEROLEPRIORITY",
	"CHANGENICKS",
	"CHANGEOWNNICK",
	"CHANGEDISPLAYNAMES",
	"CHANGEOWNDISPLAYNAME",
	"CHANGEONLINESTATE",
	"CHANGECURRENTLYDOING",
	"ADDROLETOUSER",
	"REMOVEROLEFROMUSER",
	"VIEWLOGS",
	"BAN",
];

const globalNumbers = [
	"BANCOOLDOWN",
	"MAXBANTIME"
];

const channelToggles = [
	"READMSG",
	"WRITEMSG",
	"EDITOWN",
	"EDITOTHER",
	"DELETEOWN",
	"DELETEOTHER",
	"TOGGLEPIN",
	"USEMARKUP",
	"USEADVANCEDMARKUP",
	"USEHTML",
	"UPLOADFILE",
	"READHISTORY",
	"MENTIONEVERYONE",
	"MENTIONONLINE",
	"USEEMOTE",
	"USECUSTOMEMOTE",
	"ADDREACTION",
	"ADDNEWREACTION",
	"ADDCUSTOMREACTION",
	"ADDNEWCUSTOMREACTION",
	"EDITCHANNELNAME",
	"EDITCHANNELINFO",
	"EDITCHANNELPERMS",
	"EDITCHANNELPARENTID",
	"EDITCHANNELORDERID",
	"ADDCHANNEL",
	"DELETECHANNEL",
	"CLEARCHANNEL",
];

const channelNumbers = [
	"ATTACHMENTLIMIT",
	"UPLOADSIZELIMIT",
	"POSTTIMEOUT",
	"POSTTTL",
];

function nToV(n){
	return [undefined, false, true][n];
}

/**
@class
@todo make this one work more properly
@see [DMC docs on perms]{@link https://dmc.chat/docs/#channelperm}
*/

class Permissions{
	constructor(g="", c=""){
		this.global = g.split("/");
		this.channel = c.split("/");

		this.globalText = this.global.join("/");
		this.channelText = this.channel.join("/");

		this.globalDecoded = [
			parseInt(this.global[0], 36).toString(3).slice(1)
		].concat(this.global.slice(1).map(i => {return parseInt(i, 36)}));

		if(c){
			this.channelDecoded = [
				parseInt(this.global[0], 36).toString(3).slice(1)
			].concat(this.channel.slice(1).map(i => {return parseInt(i, 36)}));
		}
	}

	/**
	The way perms work, they can either be true, false, or undefined.
	@method
	@param {String} flag
	@return {Bool/Undefined}
	@throws permission flag doesnt exist
	*/
	can(flag){
		flag = flag.toUpperCase();
		let i = globalToggles.indexOf(flag);
		if(i !== -1)
			return nToV(this.globalDecoded[0][i]);
		i = channelToggles.indexOf(flag);
		if(i !== -1)
			return nToV(this.channelDecoded[0][i])

		throw("permission flag doesnt exist");
	}
}

module.exports = Permissions;