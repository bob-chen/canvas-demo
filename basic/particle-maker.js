"use strict";

/********************************************

  ParticleMaker
  =============
  A canvas particle animator by Bob.Chen
  http://www.imbeta.com

  Updated code
  ------------
  https://github.com/bob-chen/ParticleMaker 

  License MIT

*********************************************/


var gRafId = null; //requestAnimationFrame id, new ParticleMaker() 的时候要能把前一次的动画取消
function ParticleMaker(conf) {
	var me = this,
		canvas = null,  // canvas element
		ctx = null,   // canvas contex
		dotList = [], // dot object list
		// rafId = gRafId, // rafid, 不能放在此处，因为 new 对象的时候会覆盖，无法取消前一次的动画
		finishCount = 0; // finish dot count

	var fontSize = conf["fontSize"] || 500,
		fontFamily = conf["fontFamily"] || "Helvetica Neue, Helvetica, Arial, sans-serif",
		mass = conf["mass"] || 6, // 取样密度
		dotRadius = conf["dotRadius"] || 2, // 点半径
		startX = conf["startX"] || 400, // 开始位置X
		startY = conf["startY"] || 400, // 开始位置Y
		endX = conf["endX"] || 0, // 结束位置X
		endY = conf["endY"] || 0, // 结束位置Y
		effect = conf["effect"] || "easeInOutCubic", // 缓动函数
		fillColor = conf["fillColor"] || "#000", // 填充颜色
		content = conf["content"] || "Beta"; // 要画的东西，如果是图片需要 new Image() 传进来


	// 缓动函数
	// t 当前时间
	// b 初始值
	// c 总位移
	// d 总时间
	var effectFunc = {
		easeInOutCubic: function (t, b, c, d) {
			if ((t/=d/2) < 1) return c/2*t*t*t + b;
			return c/2*((t-=2)*t*t + 2) + b;
		},
		easeInCirc: function (t, b, c, d) {
			return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
		},
		easeOutQuad: function (t, b, c, d) {
			return -c *(t/=d)*(t-2) + b;
		}
	}

    var requestAnimationFrame = window.requestAnimationFrame ||
                    function(callback) {
                    	return window.setTimeout(callback, 1000 / 60);
                    };	

    var cancelAnimationFrame = window.cancelAnimationFrame ||
                    function(id) {
                    	window.clearTimeout(id);
                    }

	if (typeof effectFunc[effect] !== "function") {
		console.log("effect lost, use easeInOutCubic");
		effect = "easeInOutCubic";
	}

	this.run = function() {
		if( !conf["canvasId"] ){
			console.log("No canvas Id");
			return;
		}

		// 有正在运行的动画要取消掉
		if (gRafId) cancelAnimationFrame(gRafId);

		dotList = [];
		finishCount = 0;

		canvas = document.getElementById(conf["canvasId"]);
		ctx = canvas.getContext("2d");

		this._cleanCanvas();

		var drawFunc = this.drawText;
		if( typeof content === "object" && content.src && content.src != "" ){
			drawFunc = this.drawImage;
		}

		drawFunc(content);

		// this._handleCanvas();
		// this._cleanCanvas();
		// this.render();

	}

	this._run = function(){
		// ctx.save();

		this._handleCanvas();

		this._cleanCanvas();

		this.render();
	}
	this._setFontSize = function(s) {
		ctx.font = s + 'px ' + fontFamily;
	}
	this._isNumber = function(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}
	this._cleanCanvas = function() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	this._handleCanvas = function() {

		var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		// console.log(imgData);

		for(var x=0; x<imgData.width; x+=mass) {
			for(var y=0; y<imgData.height; y+=mass) {
				var i = (y*imgData.width + x) * 4;
				if(imgData.data[i+3] > 128 && imgData.data[i] < 100){
					var dot = new Dot(x, y, dotRadius);
					dotList.push(dot);
				}
			}
		}

	}

	this.drawText = function(l) {
		// init canvas
		ctx.textBaseline = "top";

		me._setFontSize(fontSize);
		var s = Math.min(fontSize,
		          (canvas.width / ctx.measureText(l).width) * 0.8 * fontSize, 
		          (canvas.height / fontSize) * (me._isNumber(l) ? 1 : 0.5) * fontSize);
		me._setFontSize(s);
		
		ctx.fillStyle = "#000";
		ctx.fillText(l, endX, endY); // 最后位置

		me._run();
	}

	this.drawImage = function(img) {

		if(img.complete){
			ctx.drawImage(img, endX, endY);
			me._run();
		} else {
			img.onload = function(){
				ctx.drawImage(img, endX, endY);
				me._run();
			}
		}
	}

	this.render = function() {

		me._cleanCanvas();
		ctx.fillStyle = fillColor;

		var len = dotList.length,
			curDot = null,
			frameNum = 0,
			frameCount = 0,
			curX, curY;

		finishCount = 0;

		for(var i=0; i < len; i+=1) {
			// 当前粒子
			curDot = dotList[i];

			// 获取当前的time和持续时间和延时
			frameNum = curDot.frameNum;
			frameCount = curDot.frameCount;

			if(curDot.delayCount < curDot.delay){
				curDot.delayCount += 1;
				continue;
			}

			ctx.save();
			ctx.beginPath();

			if(frameNum < frameCount) {
				curX = effectFunc[effect](frameNum, curDot.sx, curDot.x-curDot.sx, curDot.frameCount);
				curY = effectFunc[effect](frameNum, curDot.sy, curDot.y-curDot.sy, curDot.frameCount);

				ctx.arc(curX, curY, curDot.radius, 0, 2*Math.PI);
				curDot.frameNum += 1;

			} else {
				ctx.arc(curDot.x, curDot.y, curDot.radius, 0, 2*Math.PI);
				finishCount += 1;
			}
			ctx.fill();
			ctx.restore();

			if (finishCount >= len) {
				// console.log(gRafId);
				cancelAnimationFrame(gRafId);
				return conf["onFinish"] && conf["onFinish"]();
			}
		}
		
		// gRafId = requestAnimationFrame(arguments.callee);
		gRafId = requestAnimationFrame(me.render);
	}

	function Dot(centerX, centerY, radius) {
		this.x = centerX;
		this.y = centerY;
		this.radius = radius;
		this.frameNum = 0;
		this.frameCount =  Math.ceil(3000 / 16.66);
		this.sx = startX;
		this.sy = startY;
		this.delay = this.frameCount*Math.random();
		this.delayCount = 0;
	}

}

// AMD & CMD Support
window.ParticleMaker = ParticleMaker;
if (typeof define === "function") {
    define(function(require, exports, module) {
        module.exports = ParticleMaker;
    })
}
