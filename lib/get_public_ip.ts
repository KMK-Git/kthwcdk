var https = require('https');

export async function getPublicIpAddress() {
    return new Promise<string>((resolve, _) => {


        var options = {
            hostname: "ident.me",
            port: 443,
            method: 'GET'
        };

        //change to http for local testing
        var req = https.request(options, function (res: any) {
            res.setEncoding('utf8');

            var body = '';

            res.on('data', function (chunk: string) {
                body = body + chunk;
            });

            res.on('end', function () {
                console.log("Body :" + body);
                resolve(body);
            });

        });
        req.end();
    });
}

