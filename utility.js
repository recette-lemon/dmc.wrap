"use strict";

/**
@module Utility
*/

const Crypto = require("crypto");

function hashSHA256(buffer){
	let hash = new Crypto.Hash("sha256");
	hash.update(buffer);
	return hash.digest();
}

/**
@function
@returns {String} Hex key
*/
function generatePrivateKey(){
	let ecdh = Crypto.createECDH("secp521r1")
	ecdh.generateKeys();
	return ecdh.getPrivateKey("hex");
}

module.exports = {
	hashSHA256,
	generatePrivateKey
};