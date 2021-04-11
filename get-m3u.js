const needle = require('needle')

const url = require('./config.js').playlistUrl // add _plus for detailed m3u data

const m3uPath = './playlists/playlist.m3u'

needle.get(url, (err, resp, body) => {
	if (!err && body) {
		body = Buffer.isBuffer(body) ? body.toString() : body
		console.log(body)
		require('fs').writeFileSync(require('path').resolve(m3uPath), body)
		console.log('Success!')
	} else {
		console.error(err || Error('Empty Body'))
	}
})