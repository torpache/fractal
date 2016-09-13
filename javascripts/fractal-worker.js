importScripts("http://cdnjs.cloudflare.com/ajax/libs/mathjs/2.4.2/math.min.js");
var ColoringFactory = function (data) {
    this.createColoring = function () {
        switch (data.coloring) {
            case "orbit":
                this.coloringType = Orbit;
                break;
            case "escape":
                this.coloringType = Escape;
                break;
            case "curvature":
                this.coloringType = Curvature;
                break;
        }
        inheritsFrom(this.coloringType, BaseColoring);
        return new this.coloringType(data);
    }
}

var BaseColoring = function () { 
};
BaseColoring.prototype.nextIterate = function (type, z0, constant, fn) {
        var x;
        if (type == 'mandelbrot') {
            x = fn.eval({ z: z0 });
            x = math.add(x, constant);
        }
        else {
            x = fn.eval({ z: z0 });
        }
        return x;
    };
    BaseColoring.prototype.typeSetup = function (type, zValue) {
        var constant = 0;
        var z0 = 0;
        if (type == 'mandelbrot') {
            constant = zValue;
            z0 = 0;
        }
        else {
            z0 = zValue;
        }
        return {
            constant: constant,
            z0: z0
        }
    };

var inheritsFrom = function (child, parent) {
    child.prototype = Object.create(parent.prototype);
};

var Fractal = function (type, parameters) {
    var data = parameters;

    if (type == 'julia') {
        data.eqn = data.eqn + '+' + data.realC + '+' + 'i*' + data.imgC;
    }

    var coloring;

    return {
        setColoring: function (coloringType) {
            coloring = coloringType;
        },
        calculate: function () {
            var maxIterate = 0;
            data.fn = math.parse(data.eqn).compile();
            data.tmpFn = math.parse('(a-b)/(b-c)').compile();
            var xMin = data.x0;
            var yMax = data.y0;
            var deltaX = data.zoomWidth / data.width;
            var deltaY = data.zoomHeight / data.height;
            var index = data.limit[data.index];
            var limit = data.limit[data.index + 1];
            var attenuation = 1 - Math.exp(-1.5);
            var imgMatrix = [];
            for (j = index; j < limit; j++) {
                var imgRow = [];
                for (k = 0; k < data.height; k++) {

                    var z0 = math.complex(xMin + deltaX / 2 + deltaX * j, yMax - deltaY / 2 - deltaY * k);
                    imgRow[k] = coloring.colorValue(z0);

                }
                if ((j - index) % 5 == 0) {
                    postMessage({ cmd: 'progress', data: 5 });
                }
                imgMatrix[j - index] = imgRow;
            }
            return { imgMatrix: imgMatrix };
        }
    }
}


var Orbit = function (data) {
    this.colorValue=function(zValue){
    var fn = data.fn;
    var distance = 1e20;
    var point = math.complex(data.centerX, data.centerY);
    var modValue;
    var constant;
    var tmp;
    var z0;
    var n = 0;

    var setUp = this.typeSetup(data.type, zValue);
    constant = setUp.constant;
    z0 = setUp.z0;

    while (n < data.maxIteration) {
        z0 = this.nextIterate(data.type, z0, constant, fn);
        tmp = math.subtract(z0, point);
        modValue = math.abs(tmp.toPolar().r - data.radius);

        if (modValue < distance) {
            distance = modValue;
        }

        n++;
    }
    return Math.exp(-Math.abs(Math.sqrt(distance)));
}
};

var Escape = function (data) {
    this.colorValue = function (zValue) {
        var fn = data.fn;
        var z0;
        var constant;
        var setUp = this.typeSetup(data.type, zValue);
        constant = setUp.constant;
        z0 = setUp.z0;
        var n = 0;
        var modValue = 0;
        var colorIndex;
        var smoothColor = 0;
        var z1 = 0;

        while (n < data.maxIteration && (modValue < data.bailout)) {
            z0 = this.nextIterate(data.type, z0, constant, fn);
            modValue = math.re(z0) * math.re(z0) + math.im(z0) * math.im(z0);
            smoothColor = smoothColor + Math.exp(-z0.toPolar().r * 10);
            if (z1 == z0) {
                n = data.maxIteration;
                break;
            }
            n++;
            z1 = z0;
        }

        colorIndex = Math.sqrt(Math.sqrt(Math.exp(-smoothColor)));
        return colorIndex;
    } 
}

var Curvature = function (data) {
    this.colorValue = function (zValue) {
        var fn = data.fn;
        var setUp = this.typeSetup(data.type, zValue);
        var constant = setUp.constant;
        var z0 = setUp.z0;
        var attenuation = 1 - Math.exp(-1.5);
        var n = 0;
        var modValue = 0;
        var z1 = 0;
        var z2 = 0;
        var sum = 0;
        var sum1 = 0;
        var sum2 = 0;
        var sum3 = 0;
        var lp = Math.log(Math.log(data.bailout));

        //set up power coefficeint
        var largeTest = fn.eval({ z: math.complex(5000, 5000) }).toPolar().r;
        var isRight = Math.log(largeTest) / Math.log(math.complex(5000, 5000).toPolar().r);
        var il = 1 / math.log(isRight);

        var tmp = math.complex(0, 0);
        while (n < data.maxIteration && (modValue < data.bailout)) {
            z0 = this.nextIterate(data.type, z0, constant, fn);
            modValue = math.re(z0) * math.re(z0) + math.im(z0) * math.im(z0);
            if (n == 0) {
                z1 = z0;
            }
            if (n == 1) {
                z2 = z1;
                z1 = z0;
            }
            if (n > 1) {
                tmp = data.tmpFn.eval({ a: z0, b: z1, c: z2 });
                if (tmp.re == 0) {
                    Tk = Math.PI / 2;
                }
                else {
                    Tk = Math.abs(Math.atan(tmp.im / tmp.re));
                }
                sum3 = sum2;
                sum2 = sum1;
                sum1 = sum;
                sum = sum * attenuation + Tk / Math.PI;

                if ((z0.re == z1.re && z0.im == z1.im) || (z0.re == z2.re && z0.im == z2.im)) {
                    n = data.maxIteration;
                    break;
                }

                z2 = z1;
                z1 = z0;

            }

            n++;
        }
        if (n < data.maxIteration) {

            modValue = Math.sqrt(modValue);
            var u = il * (+lp - Math.abs(Math.log(Math.abs(Math.log(modValue)))));
            if (u > 1 || u < 0) {
                u = u;
            }

            sum = sum * (1 - attenuation);
            sum1 = sum1 * (1 - attenuation);
            sum2 = sum2 * (1 - attenuation);
            sum3 = sum3 * (1 - attenuation);

            var u2 = u * u;
            var u3 = u2 * u;
            var colorIndex = 0.5 * ((-sum3 + 3 * sum2 - 3 * sum1 + sum) * u3 + (2 * sum3 - 5 * sum2 + 4 * sum1 - sum) * u2 + (-sum3 + sum1) * u + 2 * sum2);

        }
        else {

            colorIndex = 0.99;
        }
        return colorIndex;
    } 
}

self.addEventListener('message', function (e) {
    var data = e.data;
    if (data.cmd === "curvature") {
        var fractal = new Fractal(data.type, data);
        var coloringFactory = new ColoringFactory(data);
        var coloring = coloringFactory.createColoring();
        fractal.setColoring(coloring);
        var result = fractal.calculate();
        self.postMessage({ cmd: 'curvature', data: result });

    }
}, false);

