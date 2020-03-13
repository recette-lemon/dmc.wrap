"use strict";

/**
Most of these you shouldn't need to use.
@module Utility
*/

const Crypto = require("crypto");

/**
@function
@returns {Promise} Mime string.
*/
function getMimeFromBuffer(data){
	return new Promise((resolve, reject) => {
		let out = [];
		let p = require('child_process').execFile("file", ["-", "--mime-type", "-b"], {
			encoding: "buffer"
		});

		p.stdout.on("data", (d) => {
			out.push(d);
		});

		p.on("exit", () => {
			resolve(Buffer.concat(out).toString().slice(0, -1));
		});

		p.stdin.write(data.slice(0, 500)); // errors if given too much, and seems to work with just 500
		p.stdin.end();
	});
}

/**
@function
@returns {Promise} Buffer.
*/
function getFile(path){
	return new Promise((resolve, reject) => {
		if(path.startsWith("http")){
			let http = require(path.startsWith("https") ? "https" : "http");
			http.get(path, (res) => {
				let chunks = [];
				res.on("data", (chunk) => {
					chunks.push(chunk);
				});
				res.on("end", () => {
					resolve(Buffer.concat(chunks));
				});
				res.on("error", reject);
			});
		} else {
			require("fs").readFile(path, (err, data) => {
				if(err)
					return reject(err);
				resolve(data);
			});
		}
	});
}

/**
only works on linux for now
@function
@returns {Promise} Hex key.
*/
function uploadFile(path, client){
	return new Promise((resolve, reject) => {
		getFile(path).then((data) => {
			let s = Math.random().toString(36).slice(2);
			let hash = hashSHA256(data);

			getMimeFromBuffer(data).then((mime) => {
				client.request("uploadfile", {
					hash,
					name: path.split("/").pop(),
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
				}, reject);
			}, reject);
		}, reject);
	});
}

/**
@function
@returns {Buffer}
*/
function hashSHA256(buffer){
	let hash = new Crypto.Hash("sha256");
	hash.update(buffer);
	return hash.digest();
}

/**
@function
@returns {String} Hex key.
*/
function generatePrivateKey(){
	let ecdh = Crypto.createECDH("secp521r1")
	ecdh.generateKeys();
	return ecdh.getPrivateKey("hex");
}

module.exports = {
	hashSHA256,
	generatePrivateKey,
	getMimeFromBuffer,
	uploadFile,
	getFile
};