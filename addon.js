// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
// M3u from https://github.com/iptv-org/iptv

const { addonBuilder } = require("stremio-addon-sdk");
const package = require('./package.json');
var request = require('request');

// if loaded trough PimpMyStremio use the internal proxy
let proxy;
try {
	proxy = require('internal').proxy;
} catch (error) {
	proxy = { addProxy:(s)=>s };
}

// const countries = {'International':'int','Unsorted':'unsorted','Afghanistan':'af','Albania':'al','Algeria':'dz','Andorra':'ad','Angola':'ao','Argentina':'ar','Armenia':'am','Aruba':'aw','Australia':'au','Austria':'at','Azerbaijan':'az','Bahamas':'bs','Bahrain':'bh','Bangladesh':'bd','Barbados':'bb','Belarus':'by','Belgium':'be','Bolivia':'bo','Bosnia and Herzegovina':'ba','Brazil':'br','Brunei':'bn','Bulgaria':'bg','Burkina Faso':'bf','Cambodia':'kh','Cameroon':'cm','Canada':'ca','Cape Verde':'cv','Chile':'cl','China':'cn','Colombia':'co','Costa Rica':'cr','Croatia':'hr','Curaçao':'cw','Cyprus':'cy','Czech Republic':'cz','Democratic Republic of the Congo':'cd','Denmark':'dk','Dominican Republic':'do','Ecuador':'ec','Egypt':'eg','El Salvador':'sv','Equatorial Guinea':'gq','Estonia':'ee','Ethiopia':'et','Faroe Islands':'fo','Finland':'fi','Fiji':'fj','France':'fr','Gambia':'gm','Georgia':'ge','Germany':'de','Ghana':'gh','Greece':'gr','Grenada':'gd','Guadeloupe':'gp','Guatemala':'gt','Guyana':'gy','Haiti':'ht','Honduras':'hn','Hong Kong':'hk','Hungary':'hu','Iceland':'is','India':'in','Indonesia':'id','Iran':'ir','Iraq':'iq','Ireland':'ie','Israel':'il','Italy':'it','Ivory Coast':'ci','Jamaica':'jm','Japan':'jp','Jordan':'jo','Kazakhstan':'kz','Kenya':'ke','Kosovo':'xk','Kuwait':'kw','Kyrgyzstan':'kg','Laos':'la','Latvia':'lv','Lebanon':'lb','Libya':'ly','Liechtenstein':'li','Lithuania':'lt','Luxembourg':'lu','Macau':'mo','Malaysia':'my','Maldives':'mv','Malta':'mt','Mexico':'mx','Moldova':'md','Mongolia':'mn','Montenegro':'me','Morocco':'ma','Mozambique':'mz','Myanmar':'mm','Nepal':'np','Netherlands':'nl','New Zealand':'nz','Nicaragua':'ni','Nigeria':'ng','North Korea':'kp','North Macedonia':'mk','Norway':'no','Oman':'om','Pakistan':'pk','Palestine':'ps','Panama':'pa','Paraguay':'py','Peru':'pe','Philippines':'ph','Poland':'pl','Portugal':'pt','Puerto Rico':'pr','Qatar':'qa','Republic of the Congo':'cg','Romania':'ro','Russia':'ru','Rwanda':'rw','Saint Kitts and Nevis':'kn','San Marino':'sm','Saudi Arabia':'sa','Senegal':'sn','Serbia':'rs','Sierra Leone':'sl','Singapore':'sg','Sint Maarten':'sx','Slovakia':'sk','Slovenia':'si','Somalia':'so','South Africa':'za','South Korea':'kr','Spain':'es','Sri Lanka':'lk','Sudan':'sd','Sweden':'se','Switzerland':'ch','Syria':'sy','Taiwan':'tw','Tanzania':'tz','Thailand':'th','Togo':'tg','Trinidad and Tobago':'tt','Tunisia':'tn','Turkey':'tr','Turkmenistan':'tm','Uganda':'ug','Ukraine':'ua','United Arab Emirates':'ae','United Kingdom':'uk','United States':'us','Uruguay':'uy','Venezuela':'ve','Vietnam':'vn','Virgin Islands of the United States':'vi','Western Sahara':'eh','Yemen':'ye','Zimbabwe':'zw'}

// const oneDay = 24 * 60 * 60 // in seconds

// const cache = {
	maxAge: 1.5 * oneDay, // 1.5 days
	staleError: 6 * 30 * oneDay // 6 months
}

const search_cache = {
	timestamp: 0,
	data: {}
}

const manifest = {
	id: "community.iptvOrg",
	version: package.version,
	logo: "https://raw.githubusercontent.com/mik25/stremio-miktest2-iptv/master/logo.png",
	catalogs: [{type:'tv',id:'HY',name:'HY',extra: [
		{
		  name: "genre",
		  options: Object.keys(countries),
		  isRequired: true
		}
	  ]},{
		type: 'tv',
		id: 'iptvorg_search',
		name: 'search',
		extra: [
			{
				  name: 'search',
				  isRequired: true
			}
		  ]
	  }],
	resources: ["catalog", "meta", "stream"],
	types: ['tv'],
	name: "miktest2 iptv",
	description: "headers test",
	idPrefixes: ['miktest2 iptv']
}
function match(r,s,i){
	var m = s.match(r);
	return (m && m.length>i)?m[i]:''
}

function getSearch(){
	return new Promise((resolve, reject) => {
		const now = Math.round(Date.now()/1000);
		if(search_cache.timestamp<now-cache.maxAge){
			request('https://github.com/mik25/stremio-miktest2-iptv/playlist.m3u', function (error, response, body) {
				if(error){
					reject(error);
				}else if (!response || response.statusCode!=200 ){
					reject(response.statusCode);
				}else if (body){
					search_cache.timestamp = Math.round(Date.now()/1000);
					search_cache.data = m3uToMeta(body);
					resolve(search_cache.data);
				}
			});
		}else{
			resolve(search_cache.data);
		}

	});
}

function m3uToMeta(data,country){
	if(country==undefined) country='search';
	var channels = data.split('#');
	var metas = [];
	var metaID = {};
	for (let i = 1; i < channels.length; i++) {
		const item = channels[i];
		var name = match(/,([^\n]+)/,item,1).trim();
		if(!name) continue;
		var img = match(/tvg-logo="([^"]+)"/,item,1);
		var stream = match(/\n(http[^\n]+)/,item,1).trim();
		var id ='iptvorg:'+country+'::'+name;
		if(metaID[id]==undefined){
			metaID[id] = metas.length;
			metas.push({
				id:id,
				name:name,
				logo:img,
				poster:img,
				posterShape: 'regular',
				type:'tv',
				streams:[]
			});
			metas[metaID[id]] = metas[metaID[id]]
		}
		const pathdata = stream.split('/');
		metas[metaID[id]].streams.push({
			title: pathdata[2]+'/'+pathdata[pathdata.length-1].replace(/\.m3u8$/,''),
			url: proxy.addProxy(stream)
		});
	}
	return metas;
}

const builder = new addonBuilder(manifest)
function getData(country){
	if(!country) country='United States';
	if(country == 'search'){
		return getSearch();
	}
	return new Promise((resolve, reject) => {
		var url = 'https://mik25/stremio-miktest2-iptv/'+countries[country]+'.m3u';
		if (countries[country]=='unsorted'){
			url = 'https://raw.githubusercontent.com/mik25/stremio-miktest2-iptv/master/index.m3u';
		}
		request(url, function (error, response, body) {
			if(error){
				reject(error);
			}else if (!response || response.statusCode!=200 ){
				reject(response.statusCode);
			}else if (body){
				resolve(m3uToMeta(body,country));
			}
		});
	});
}


// 
builder.defineCatalogHandler(function(args, cb) {
	// filter the dataset object and only take the requested type
	return new Promise((resolve, reject) => {
		if (args.id == 'iptvorg_search'){
			if(!args.extra.search){
				return resolve({});
			}
			const search = args.extra.search.toLowerCase().split(/[^a-zA-Z0-9]/);
			getSearch().then(function(values){
				var found = [];
				for (let i = 0; i < values.length; i++) {
					const meta = values[i];
					const name =  meta.name.toLowerCase().split(/[^a-zA-Z0-9]/);
					var match = true;
					for (let s = 0; s < search.length; s++) {
						const word = search[s];
						if(!name.includes(word)){
							match = false;
							break;
						}
					}
					if(match){
						found.push(meta);
					}
				}
				resolve({
					metas:found,
					cacheMaxAge: cache.maxAge,
					staleError: cache.staleError
				});
			});
		}else{
			getData(args.extra.genre).then(function(values) {
				resolve({
					metas:values,
					cacheMaxAge: cache.maxAge,
					staleError: cache.staleError
				});
			}).catch((e)=>{
				reject(e);
			});
		}

	});
});

// takes function(args, cb)
builder.defineStreamHandler(function(args, cb) {
	if (args.type === 'tv' && args.id.startsWith('iptvorg:')) {
		return new Promise((resolve, reject) => {
			genr = args.id.split(':',2)[1].split('::')[0];
			getData(genr).then(function(values) {
				for (let i = 0; i < values.length; i++) {
					if(values[i].id == args.id){
						return resolve({
							streams:values[i].streams,
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError
						});
					}
				}
				resolve({ streams: [] });
			}).catch((e)=>{
				reject(e);
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }
})

builder.defineMetaHandler(function(args) {
	if (args.type === 'tv' && args.id.startsWith('iptvorg:')) {
		return new Promise((resolve, reject) => {
			genr = args.id.split(':',2)[1].split('::')[0];
			getData(genr).then(function(values) {
				for (let i = 0; i < values.length; i++) {
					if(values[i].id == args.id){
						return resolve({
							meta:values[i],
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError});
					}
				}
				resolve({ streams: [] })
			}).catch((e)=>{
				reject(e);
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }

})
module.exports = builder.getInterface()
