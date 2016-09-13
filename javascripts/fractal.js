var app = angular.module('fractalMaker', ['ui.router','mp.colorPicker','angular-click-outside','slider','color-box','color-gradient-maker']);
app.factory('coloring', function () {
    var color={};
    color.colorList=[];
    color.number=0;
    color.results=[];
    color.setColorList=function(list){
        color.colorList=list;
        color.number=list.length;
    };
    color.setResults=function(results){
        color.results=results;
    };
    color.colorPixel=function(pixel){
        return color.colorList[Math.floor(pixel*color.number)];
    };
    color.calculateHistogram=function (results) {
        color.histogram = [];

        for (j = 0; j < 20; j++) {
            color.histogram[j] = 0;
        }
        for (var j = 0; j < results.length; j++) {
            for (var k = 0; k < results[0].length; k++) {
                for (var i = 0; i < color.histogram.length; i++) {
                    if (i === 0) {
                        if ((i / color.histogram.length <= results[j][k]) && (results[j][k] <= (i + 1) / color.histogram.length)) {
                            color.histogram[i] = color.histogram[i] + 1 / (results[0].length * results.length);

                        }
                    }
                    else {
                        if ((i / color.histogram.length < results[j][k]) && (results[j][k] <= (i + 1) / color.histogram.length)) {
                            color.histogram[i] = color.histogram[i] + 1 / (results[0].length * results.length);

                        }
                    }
                }
            }
        }
        color.drawHistogram();
    };
    return color;
});

app.factory("worker", ['$q', function ($q) {
    var WorkerService = function () {
        var worker = new Worker('javascripts/fractal-worker.js');
        var defer = $q.defer();
        worker.addEventListener('message', function (e) {
            if (e.data.cmd === "progress") {
                defer.notify(e.data);
            }
            else {
                defer.resolve(e.data);
            }
        }, false);
        return {
            doWork: function (myData) {
                defer = $q.defer();
                worker.postMessage(myData); // Send data to our worker. 
                return defer.promise;
            }
        };
    }
    
    return {
        getWorker: function () {
            return new WorkerService()
        }
    };

} ]);

app.factory('fractal', ['coloring', 'worker', '$q', function (coloring, worker, $q) {
    var o = {
        fractalImg: [],
        canvasState:0,
        temp:{
            x0: -1.5,
            zoomWidth: 3,
            y0: 1,
            zoomHeight: 2,
        },
        data : {
            type: 'mandelbrot',
            coloring: 'orbit',
            eqn: 'z^2',
            realC: -0.4,
            imgC: 0.6,
            width: 0,
            height: 0,
            x0: -1.5,
            zoomWidth: 3,
            y0: 1,
            zoomHeight: 2,
            maxIteration:40,
            bailout: 10000,
            centerX: 0,
            centerY: 0,
            radius: 0.5,
            cmd:'curvature'

        },
        values: { progress: 0,
            active: 'none',
            dashProgress: 0,
            progressBackground: 'images/halfmandelwhite.png',
            isActive: function (input) {
                return input === this.active;
            }
        }
    };

    o.calculateFractal = function () {
        o.getSize();
        //update temp values for next draw
        o.temp.x0=o.data.x0;
        o.temp.y0=o.data.y0;
        o.temp.zoomWidth=o.data.zoomWidth;
        o.temp.zoomHeight=o.data.zoomHeight;
        
        o.values.active = 'calculating';
        o.values.progress = 0;
        o.values.dashProgress = 0;
        var split = function (width, workernum) {
            var limits = [];
            num = Math.floor(width * 1.0 / workernum);
            for (i = 0; i < workernum; i++) {
                limits[i] = num * i;
            }
            limits[workernum] = width;
            return limits;
        };

        o.data.limit = split(o.data.width, 4);
        o.data.index = 0;
        var workers = [worker.getWorker(), worker.getWorker(),  worker.getWorker(), worker.getWorker()];
        var workerPromises=workers.map(function(worker,i){
            o.data.index=i;
            return worker.doWork(o.data).then(function (response) {
                return response;
            }, null, function (update) {
                o.values.dashProgress += update.data / o.data.width;
                o.values.progress = (Math.min(o.values.dashProgress * 100, 100)).toFixed();
            });
        
        });
        
        
        $q.all(workerPromises).then(function(results){
            o.fractalImg = [].concat.call(results[0].data.imgMatrix, results[1].data.imgMatrix, results[2].data.imgMatrix, results[3].data.imgMatrix);
            coloring.calculateHistogram(o.fractalImg);
            o.values.active = 'done';
            o.drawFractal();
            
        });
    }
    return o;
} ]);



app.config([
'$stateProvider',
'$urlRouterProvider',
function ($stateProvider, $urlRouterProvider) {

    $stateProvider
    .state('home', {
        url: '/home',
        templateUrl: '/home.html',
        controller: 'MainCtrl as Ctrl'
        
        
    });
    $urlRouterProvider.otherwise("/home");
} ]);

app.filter('tex', function () {
    specialConstants = ['pi', 'phi', 'e', 'i', 'tau'];
    return function (input) {
        try {
            if (input[1] < 0) {
                signReal = input[1];
            }
            if (input[1] == 0) {
                signReal = '';
            }
            if (input[1] > 0) {
                signReal = "+" + input[1];
            }
            if (input[2] < 0) {
                signIm = input[2] + 'i';
            }
            if (input[2] == 0) {
                signIm = '';
            }
            if (input[2] > 0) {
                signIm = "+" + input[2] + 'i';
            }
            if (input[3] == 'mandelbrot') {
                input = math.parse(input[0]);
            }
            else {
                input = math.parse(input[0] + signReal + signIm);
            }

            var transformed = input.transform(function (node, path, parent) {
                if (node.type == "SymbolNode" && (specialConstants.indexOf(node.name) == -1)) {
                    return new math.expression.node.SymbolNode('z');
                }
                else {
                    return node;
                }
            });
            var out = transformed ? transformed.toTex({ parenthesis: 'keep' }) : '';
            var elem = MathJax.Hub.getAllJax('pretty')[0];
            if (elem) {
                MathJax.Hub.Queue(['Text', elem, out]);
            }
            return '$$' + transformed + '$$';
        }
        catch (e) {
            //console.log(e);
        }
    };
})

app.directive("canvasZoom", function (fractal, $window) {
    return {
        restrict: "A",
        scope: false,
        link: function ($scope, element, attr) {
            function coordinateChange(x0, y0, x1, y1) {
                var xChange = function (x) {
                    var newX = fractal.temp.x0 + x / fractal.data.width * (fractal.temp.zoomWidth);
                    return newX;
                }
                var yChange = function (y) {
                    var newY = fractal.temp.y0 - y / fractal.data.height * (fractal.temp.zoomHeight);
                    return newY;
                }
                coordinates = {
                    xBegin: xChange(x0),
                    yBegin: yChange(y0),
                    zoomWidth: xChange(x1) - xChange(x0),
                    zoomHeight: yChange(y0) - yChange(y1)
                }
                return coordinates;
            }

            function coordinateChangeBack(x0, y0, w, h) {
                var xChange = function (x) {
                    var newX = (x - fractal.temp.x0) / fractal.temp.zoomWidth * fractal.data.width;
                    return newX;
                }
                var yChange = function (y) {
                    var newY = (fractal.temp.y0 - y) / fractal.temp.zoomHeight * fractal.data.height;
                    return newY;
                }
                var widthChange = function (w) {
                    width = Math.floor(w / (fractal.temp.zoomWidth + 0.0) * fractal.data.width);
                    return width;
                }
                var heightChange = function (h) {
                    height = Math.floor(h / (fractal.temp.zoomHeight + 0.0) * fractal.data.height);
                    return height;
                }
                coordinates = {
                    x0: xChange(x0),
                    y0: yChange(y0),
                    width: widthChange(w),
                    height: heightChange(h)
                }
                return coordinates;
            }
            var ctx = element[0].getContext('2d');
            var canvas = element[0];
            
            fractal.temp.zoomWidth = fractal.data.zoomHeight * canvas.clientWidth / canvas.clientHeight;
            fractal.temp.x0 = -1 * fractal.temp.zoomWidth / 2;
            fractal.data.zoomWidth=fractal.temp.zoomWidth;
            fractal.data.x0=fractal.temp.x0;
            
            var xRatioY, xRatio, yRatio;
            var dragSubject,
                    dragRect,
                    x0,
                    y0,
                    x1,
                    y1,
                    x2,
                    y2,
                    xMin,
                    yMin,
                    xWidth,
                    yWidth;

            function doDrag(x, y) {

                var x = Math.floor(Math.max(Math.min(x * xRatio, dragRect.width * xRatio), 0));
                var y = Math.floor(Math.max(Math.min(y * yRatio, dragRect.height * yRatio), 0));
                xMin = Math.min(x, x0);
                yMin = Math.min(y0, y);
                xWidth = Math.abs(x0 - x);
                yWidth = Math.abs(y0 - y);
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 3;
                ctx.putImageData(fractal.canvasState, 0, 0);
                if (xWidth > yWidth) {
                    if ((x0 - x) > 0) {
                        x1 = x0 - Math.floor(yWidth * xRatioY);
                        y1 = yMin;
                        x2 = x1 + Math.floor(yWidth * xRatioY);
                        y2 = y1 + yWidth;
                        ctx.strokeRect(x0 - Math.floor(yWidth * xRatioY), yMin, Math.floor(yWidth * xRatioY), yWidth);
                    }
                    else if ((x0 - x) < 0) {
                        x1 = xMin;
                        y1 = yMin;
                        x2 = x1 + Math.floor(yWidth * xRatioY);
                        y2 = y1 + yWidth;
                        ctx.strokeRect(xMin, yMin, Math.floor(yWidth * xRatioY), yWidth);
                    }

                }
                else {
                    if ((y0 - y) > 0) {
                        x1 = xMin;
                        y1 = y0 - Math.floor(xWidth / xRatioY);
                        x2 = x1 + xWidth;
                        y2 = y1 + Math.floor(xWidth / xRatioY);
                        ctx.strokeRect(xMin, y0 - Math.floor(xWidth / xRatioY), xWidth, Math.floor(xWidth / xRatioY));
                    }
                    else if ((y0 - y) < 0) {
                        x1 = xMin;
                        y1 = yMin;
                        x2 = x1 + xWidth;
                        y2 = y1 + Math.floor(xWidth / xRatioY);
                        ctx.strokeRect(xMin, yMin, xWidth, Math.floor(xWidth / xRatioY));
                    }
                    else {
                        x1 = xMin;
                        y1 = yMin;
                        x2 = x1 + xWidth;
                        y2 = y1 + Math.floor(xWidth / xRatioY);
                        ctx.strokeRect(xMin, yMin, xWidth, Math.floor(xWidth / xRatioY));
                    }
                }





            }

            function onMouseMove(evt) {
                evt.preventDefault();

                $scope.$apply(function () {
                    doDrag(evt.clientX - dragRect.x, evt.clientY - dragRect.y);
                });
            }
            $scope.$on('zoomChange', function (event) {
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 3;
                if(fractal.fractalImg.length!==0){
                ctx.putImageData(fractal.canvasState, 0, 0);
                }
                var coords = coordinateChangeBack(fractal.data.x0, fractal.data.y0, fractal.data.zoomWidth, fractal.data.zoomHeight);
                ctx.strokeRect(coords.x0, coords.y0, coords.width, coords.height);
            });
            var startDrag = function (evt) {
                //canvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
                xRatioY = canvas.clientWidth / canvas.clientHeight;
                xRatio = canvas.width / canvas.clientWidth;
                yRatio = canvas.height / canvas.clientHeight;
                var rect = evt.target.getBoundingClientRect();
                dragRect = {
                    x: rect.left,
                    y: rect.top,
                    width: rect.right - rect.left,
                    height: rect.bottom - rect.top
                };
                x0 = Math.floor((evt.clientX - dragRect.x) * xRatio);
                y0 = Math.floor((evt.clientY - dragRect.y) * yRatio);

                doDrag(evt.offsetX || evt.layerX, evt.offsetY || evt.layerY);

                angular.element($window).on('mousemove', onMouseMove)
                        .one('mouseup', function () {
                            angular.element($window).off('mousemove', onMouseMove);
                            if ((x2 - x1) > 2 && (y2 - y1) > 2) {
                                var coords = coordinateChange(x1, y1, x2, y2);

                                fractal.data.x0 = coords.xBegin;
                                fractal.data.y0 = coords.yBegin;
                                fractal.data.zoomWidth = coords.zoomWidth;
                                fractal.data.zoomHeight = coords.zoomHeight;
                                fractal.data.zoomsOut = true;
                                $scope.$broadcast('zoomDraw');
                                $scope.$apply();
                            }
                        });
            };

            element.on('mousedown', startDrag);
        }
    }
});

app.directive('equation', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.integer = function(modelValue, viewValue) {
          specialConstants = ['pi', 'phi', 'e', 'i', 'tau'];
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be not valid
          //return false;
        }
        try{
            var input = math.parse(viewValue);

            var transformed = input.transform(function (node, path, parent) {
                if (node.type == "SymbolNode" && (specialConstants.indexOf(node.name) == -1)) {
                    return new math.expression.node.SymbolNode('z');
                }
                else {
                    return node;
                }
            });
            return true;
        }
        catch (e) {
            return false
        }

      };
    }
  };
});

app.directive("canvasFractal", function (fractal, coloring, $window) {
    return {
        restrict: "A",
        scope: false,
        link: function ($scope, element, attr) {
            $scope.height=element[0].clientHeight;
            $scope.width=element[0].clientWidth;
            $scope.ctx=element[0].getContext('2d');
            
            $scope.getSize=function(){
                fractal.data.height=element[0].clientHeight;
                fractal.data.width=element[0].clientWidth;
                element[0].height=element[0].clientHeight;
                element[0].width=element[0].clientWidth;
                $scope.height=element[0].clientHeight;
                $scope.width=element[0].clientWidth;
            }
            $scope.drawFractal=function () {
            $scope.ctx.fillStyle = "white";
            $scope.ctx.fillRect(0, 0, $scope.width, $scope.height);
                for (j = 0; j < fractal.fractalImg.length; j++) {
                    for (k = 0; k < fractal.fractalImg[0].length; k++) {
                        $scope.ctx.fillStyle = coloring.colorPixel(fractal.fractalImg[j][k]);
                        $scope.ctx.fillRect(j, k, 1, 1);
                    }
                }
            fractal.canvasState=$scope.ctx.getImageData(0,0,$scope.width,$scope.height);
            fractal.values.progressBackground =  element[0].toDataURL("image/png");
            
            };
            fractal.drawFractal=$scope.drawFractal;
            fractal.getSize=$scope.getSize;
        }
    };
});
app.controller('MainCtrl', function (fractal, coloring, $scope, texFilter) {
    var self = this;
    this.zoomChange = function () { $scope.$broadcast('zoomChange'); };
    $scope.$on('zoomDraw', function (event) {
            self.active='zoom';
            });
    this.data = {
            type: 'mandelbrot',
            coloring: 'orbit',
            eqn: 'z^2',
            realC: -0.4,
            imgC: 0.6,
            width: 0,
            height: 0,
            x0: -1.5,
            zoomWidth: 3,
            y0: 1,
            zoomHeight: 2,
            maxIteration:40,
            bailout: 10000,
            centerX: 0,
            centerY: 0,
            radius: 0.5,
            cmd:'curvature'};
    this.colorObj=coloring;
    this.fractal=fractal;
    this.menuToggle=function(current,next){
        if(current===next){
            return 'none';
        }
        else{
            return next;
        }
        
    };
    this.zoomIn = function () {
        var growthFactorX = this.data.zoomWidth / 4;
        var growthFactorY = this.data.zoomHeight / 4;
        this.data.zoomHeight = this.data.zoomHeight - growthFactorY;
        this.data.zoomWidth = this.data.zoomWidth - growthFactorX;
        this.data.x0 = this.data.x0 + growthFactorX / 2;
        this.data.y0 = this.data.y0 - growthFactorY / 2;
        this.zoomChange();
    }
    this.zoomOut = function () {
        var growthFactorX = this.data.zoomWidth / 4;
        var growthFactorY = this.data.zoomHeight / 4;
        this.data.zoomHeight = this.data.zoomHeight + growthFactorY;
        this.data.zoomWidth = this.data.zoomWidth + growthFactorX;
        this.data.x0 = this.data.x0 - growthFactorX / 2;
        this.data.y0 = this.data.y0 + growthFactorY / 2;
        this.zoomChange()
    }
    this.scaleRatio = function (input) {
        var hRatiow = canvas.clientHeight / canvas.clientWidth;
        if (input == 'width') {
            this.zoomHeight = this.zoomWidth * hRatiow;
        }
        else {
            this.zoomWidth = this.zoomHeight / hRatiow;
        }
        this.zoomChange();
    }
    this.isActive = function (choice, barType) {
        if (barType == 'fractal') {
            return choice === this.data.type;
        }
        else {
            return choice === this.data.coloring;
        }
    };
    this.setActive = function (choice, barType) {
        if (barType === 'fractal') {
            this.data.type = choice;
        }
        else {
            this.data.coloring = choice;
        }
    };
    this.progress = 0;
    this.calculating = false;
    this.showStart=true;
    this.tex = '$$' + math.parse(this.data.eqn).toTex({ parenthesis: 'keep' }) + '$$';
   
   
    
    this.fractalize = function () {
        self.showStart = false;
        self.active='none';
        this.data.eqn = texFilter([this.data.eqn, this.data.realC, this.data.imgC, 'mandelbrot']).replace(/\$/g, '');
        fractal.data=this.data;
        fractal.calculateFractal();
        self.progress = fractal.values;
    };

});



