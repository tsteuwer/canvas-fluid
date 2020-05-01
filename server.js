const http = require(`http`);
const fs = require('fs');

const server = http.createServer((req, res) => {
	if (req.url === `/`) {
		fs.readFile(`${__dirname}/index.html`, (err, file) => {
			if (err) {
				res.writeHead(505);
			} else {
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.write(file.toString());
			}
			return res.end();
		});
	}

	fs.exists(`${__dirname}${req.url}`, (exists) => {
		if (!exists) {
			res.writeHead(404);
			return res.end();
		}

		fs.readFile(`${__dirname}${req.url}`, (err, buffer) => {
			if (err) {
				res.writeHead(505);
				return res.end();
			}

			if (req.url.includes('.js')) {
				res.setHeader('Content-Type', 'text/javascript');
			}
			res.write(buffer.toString());
			return res.end();
		});
	});
});

server.listen(3000);