#!/usr/bin/env node
"use strict"
var
  iterableMap= require( "iterable-map"),
  jsonld= require( "jsonld").promises,
  prefixes= require( "./prefixes")

var prettyPrint= o=> { console.log( JSON.stringify( o, null, "\t")); return o }
var Type= {
	Class: prefixes.rdfs + "Class",
	Property: prefixes.rdfs + "Property",
	Vocab: prefixes.owl + "Ontology"
}

function isOrIncludes( field, value){
	if( field=== value){
		return true
	}
	if( field&& field.length){
		for( var i= 0; i< field.length; ++i){
			if( field[ i]=== value)
				return true
		}
	}
	return false
}

class JsonldClassConstructor{
	constructor(){
		this._loading= []
		this._ready= null

		this._classes= {}
		this._classProperties= {}
		this._ontologies= {}

		this._add= this._add.bind( this)
		this._classMap= iterableMap( name=> this._classContext( this._classes[ name]))
	}

	// Add a new `node` of information to what JsonldClassConstructor knows about
	// @private
	_add( node){
		var
		  type= node[ "@type"],
		  label= node[ prefixes.rdfs+ "label"]
		label= label&& label[ "@value"]|| label
		if( isOrIncludes( type, Type.Class)){
			this._classes[ label]= node
		}else if( isOrIncludes( type, Type.Property)){
			var
			  domain= node[ prefixes.rdfs+ "domain"][ "@id"],
			  classProperties= this._classProperties[ domain]|| (this._classProperties[ domain]= {})
			classProperties[ label]= node
		}else if( isOrIncludes( type, Type.Vocab)){
			this._ontologies[ node[ "@id"]]= node
		
		}
	}
	// Create a JSON-LD context of terms for a `klass` node.
	// @private
	_classContext( klass){
		var
		  classId= klass[ "@id"],
		  props= this._classProperties[ classId],
		  retVal= {}
		for( var label in props){
			var
			  prop= props[ label],
			  val= prop[ "@id"],
			  container= prop[ "@container"]
			if( prop[ "@container"]){
				val= {
					"@id": val,
					"@container": container
				}
			}
			retVal[ label]= val
		}
		return retVal
	}

	load( doc){
		var expanded= jsonld.compact( doc, {})
			.then( graph=> graph[ "@graph"].forEach( this._add))
		this._loading.push( expanded)
		this._ready= null
		return expanded.then()
	}
	get ready(){
		if( !this._ready){
			this._ready= Promise.all( this._loading).then()
		}
		return this._ready
	}
	[Symbol.iterator](){
		return this._classMap( this._classes)
	}
	getClass( name){
		//return this.ready.then(()=> this._classes[ name])
		return this.ready.then(()=> this._classContext( this._classes[ name]))
	}
}

module.exports= JsonldClassConstructor

if( require.main=== module){
	var
	  fs= require( "fs"),
	  file= fs.readFileSync( process.argv[ 2], "utf8"),
	  doc= JSON.parse( file),
	  cc= new JsonldClassConstructor()
	cc.load( doc)
	cc.getClass( process.argv[ 3]).then( prettyPrint)
}
