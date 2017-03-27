#!/usr/bin/env node
var
  jsonld= require( "jsonld").promises,
  prefixes= require( "./prefixes")

var prettyPrint= o=> { console.log(JSON.stringify(o, null, "\t")); return o }
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

		this._add= node=> {
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
	getClass( name){
		return this.ready.then(()=> this._classes[ name])
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

















