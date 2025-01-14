const crypto = require('crypto');
const NodeRSA = require('node-rsa');
const fs = require('fs-extra');
const database = require('../database');
const config = require('../../config.json');
const xmlParser = require('xml2json');
const request = require("request");
const moment = require('moment');
const { USER } = require('../models/user');
let TGA = require('tga');
let pako = require('pako');
let PNG = require('pngjs').PNG;
const path = require('path')


let methods = {
    processUser: function(pid) {
        return new Promise(async function(resolve, reject) {
            let userObject = await database.getUserByPID(pid);
            if(userObject != null)
                resolve(userObject);
            else
            {
                await request({
                    url: "http://" + config.account_server + "/v1/api/miis?pids=" + pid,
                    headers: {
                        'X-Nintendo-Client-ID': 'a2efa818a34fa16b8afbc8a74eba3eda',
                        'X-Nintendo-Client-Secret': 'c91cdb5658bd4954ade78533a339cf9a'
                    }
                }, function (error, response, body) {
                    if (!error && response.statusCode === 200) {
                        let xml = xmlParser.toJson(body, {object: true});
                        const newUsr = {
                            pid: pid,
                            created_at: moment().format('YYYY-MM-DD HH:mm:SS'),
                            user_id: xml.miis.mii.user_id,
                            account_status: 0,
                            mii: xml.miis.mii.data,
                            official: false
                        };
                        const newUsrObj = new USER(newUsr);
                        newUsrObj.save();
                        resolve(newUsr);
                    }
                    else
                    {
                        console.log('fail');
                        reject();
                    }

                });

            }
        });
    },
    decodeParamPack: function (paramPack) {
        /*  Decode base64 */
        let dec = Buffer.from(paramPack, "base64").toString("ascii");
        /*  Remove starting and ending '/', split into array */
        dec = dec.slice(1, -1).split("\\");
        /*  Parameters are in the format [name, val, name, val]. Copy into out{}. */
        const out = {};
        for (let i = 0; i < dec.length; i += 2) {
            out[dec[i].trim()] = dec[i + 1].trim();
        }
        return out;
    },
    processServiceToken: function(token) {
        try
        {
            let B64token = Buffer.from(token, 'base64');
            let decryptedToken = this.decryptToken(B64token);
            return decryptedToken.readUInt32LE(0x2);
        }
        catch(e)
        {
            console.log(e)
            return null;
        }

    },
    decryptToken: function(token) {
        // Access and refresh tokens use a different format since they must be much smaller
        // Assume a small length means access or refresh token
        if (token.length <= 32) {
            const cryptoPath = path.normalize(`${__dirname}/../certs/access`);
            const aesKey = Buffer.from(fs.readFileSync(`${cryptoPath}/aes.key`, { encoding: 'utf8' }), 'hex');

            const iv = Buffer.alloc(16);

            const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv);

            let decryptedBody = decipher.update(token);
            decryptedBody = Buffer.concat([decryptedBody, decipher.final()]);

            return decryptedBody;
        }

        const cryptoPath = path.normalize(`${__dirname}/../certs/access`);

        const cryptoOptions = {
            private_key: fs.readFileSync(`${cryptoPath}/private.pem`),
            hmac_secret: config.secret
        };

        const privateKey = new NodeRSA(cryptoOptions.private_key, 'pkcs1-private-pem', {
            environment: 'browser',
            encryptionScheme: {
                'hash': 'sha256',
            }
        });

        const cryptoConfig = token.subarray(0, 0x82);
        const signature = token.subarray(0x82, 0x96);
        const encryptedBody = token.subarray(0x96);

        const encryptedAESKey = cryptoConfig.subarray(0, 128);
        const point1 = cryptoConfig.readInt8(0x80);
        const point2 = cryptoConfig.readInt8(0x81);

        const iv = Buffer.concat([
            Buffer.from(encryptedAESKey.subarray(point1, point1 + 8)),
            Buffer.from(encryptedAESKey.subarray(point2, point2 + 8))
        ]);

        const decryptedAESKey = privateKey.decrypt(encryptedAESKey);

        const decipher = crypto.createDecipheriv('aes-128-cbc', decryptedAESKey, iv);

        let decryptedBody = decipher.update(encryptedBody);
        decryptedBody = Buffer.concat([decryptedBody, decipher.final()]);

        const hmac = crypto.createHmac('sha1', cryptoOptions.hmac_secret).update(decryptedBody);
        const calculatedSignature = hmac.digest();

        if (Buffer.compare(calculatedSignature, signature) !== 0) {
            console.log('Token signature did not match');
            return null;
        }

        return decryptedBody;
    },
    processPainting: function (painting) {
        let paintingBuffer = Buffer.from(painting, 'base64');
        let output = '';
        try
        {
            output = pako.inflate(paintingBuffer);
        }
        catch (err)
        {
            console.error(err);
        }
        let tga = new TGA(Buffer.from(output));
        let png = new PNG({
            width: tga.width,
            height: tga.height
        });
        png.data = tga.pixels;
        let pngBuffer = PNG.sync.write(png);
        return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    },
};
exports.data = methods;
