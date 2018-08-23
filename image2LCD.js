const Jimp = require('jimp');
const getPixels = require('get-pixels');
const fs = require('fs');

Jimp.prototype.dither565 = function (cb) {
    var rgb565_matrix = [
        1, 7, 3, 5, 0, 8, 2, 6,
        7, 1, 5, 3, 8, 0, 6, 2,
        3, 5, 0, 8, 2, 6, 1, 7,
        5, 3, 8, 0, 6, 2, 7, 1,
        0, 8, 2, 6, 1, 7, 3, 5,
        8, 0, 6, 2, 7, 1, 5, 3,
        2, 6, 1, 7, 3, 5, 0, 8,
        6, 2, 7, 1, 5, 3, 8, 0
    ];
    this.scan(0, 0, this.bitmap.width, this.bitmap.height, function (x, y, idx) {
        var tresshold_id = ((y & 7) << 3) + (x & 7);
        var dither = rgb565_matrix[tresshold_id];
        this.bitmap.data[idx] = Math.min(this.bitmap.data[idx] + dither, 0xff);
        this.bitmap.data[idx + 1] = Math.min(this.bitmap.data[idx + 1] + dither, 0xff);
        this.bitmap.data[idx + 2] = Math.min(this.bitmap.data[idx + 2] + dither, 0xff);
    });

    if (isNodePattern(cb)) return cb.call(this, null, this);
    else return this;
}

function isNodePattern(cb) {
    if ("undefined" == typeof cb) return false;
    if ("function" != typeof cb)
        throw new Error("Callback must be a function");
    return true;
}

function saveRGB565(path) {
    Jimp.read(path).then(function (lenna) {
        var name = path.split('.png').join('_dither_rgb565.png');

        lenna.dither565()
            .write(name, function () {
                getPixels(name, function (err, pixels) {
                    if (err) {
                        console.log("Bad image path");
                        return
                    }
                    extractArray(pixels.data, lenna, name);
                });
            });
    }).catch(function (err) {
        console.error(err);
    });
}

function extractArray(data, image, name) {
    var byteWidth = (image.bitmap.width + 7) / 8;
    var array16 = '';
    var array_ascii = '';
    var array8 = [];

    for (var k = 0; k < image.bitmap.height; k++) {
        for (var j = 0; j < image.bitmap.width; j++) {
            var color = image.getPixelColor(j, k);
            color = calcColor565(Jimp.intToRGBA(color));
            color = color.split('0x').join('');

            array16 += color;
            array_ascii += hex2a(color);
        }
    }
    fs.writeFileSync(name + '.tft35', Buffer.from(array16, 'hex'), 'utf16le');
    console.log('nice tela');
}

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function calcColor565(input_color) {
    var r = input_color.r;
    var g = input_color.g;
    var b = input_color.b;
    r = ((r & 0xf8) << 8);
    g = ((g & 0xfc) << 3);
    b = ((b & 0xf8) >> 3);

    var rgb565 = (r + g + b).toString(16);
    while (rgb565.length < 4) {
        rgb565 = '0' + rgb565;
    }
    return '0x' + rgb565.toUpperCase();
}

if (process.argv[2]) {
    saveRGB565(process.argv[2]);
}
else{
    console.log('npm install')
    console.log('node convert2TFT.js path_da_imagem');
}