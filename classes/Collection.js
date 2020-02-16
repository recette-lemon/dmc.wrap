"use strict";

/**
@class
@extends Map
@see [Map]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map}
@property {Array} array
@property {Item} first
@property {Item} last
@property {Item} random
*/

class Collection extends Map{
	constructor(arr=[]){
		super();

		for(var i = 0; i < arr.length; i++) {
			this.set(arr[i].id, arr[i]);
		}
	}

	get array(){
		return Array.from(this.values());
	}

	get first(){
		return this.values().next().value;
	}

	get last(){
		return this.array[this.size - 1];
	}

	get random(){
		return this.array[Math.floor(Math.random() * this.size)];
	}

}

module.exports = Collection;