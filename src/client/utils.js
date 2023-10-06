// linear interpolation
function lerp(from,to,t){
	if(Math.abs(to-from) < 0.0000001){
		return to;
	}
	return from+(to-from)*t;
}

function slerp(from,to,by){
	from /= Math.PI*2;
	to /= Math.PI*2;
 while (to-from > 0.5){ from += 1 }
 while (to-from < -0.5){ from -= 1 }
 return ((from + by * (to - from)) % 1) * Math.PI * 2;
}

// returns v, clamped between min and max
function clamp(min,v,max){
	return Math.max(min,Math.min(v,max));
}

function clone(__obj){
	return JSON.parse(JSON.stringify(__obj));
}



function toggleMute(){
	if(Howler._muted){
		Howler.unmute();
	}else{
		Howler.mute();
	}
}


function ease(t) {
	if ((t/=0.5) < 1) {
		return 0.5*t*t*t;
	}
	return 0.5*((t-=2)*t*t + 2);
};


// polyfill for log2
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log2
Math.log2 = Math.log2 || function(_v) {
	return Math.log(_v) * Math.LOG2E;
};

// returns the smallest power-of-2 which contains v
// get log2, round up, apply as 2^n
function nextPowerOfTwo(v){
	return Math.pow(2, Math.ceil(Math.log2(v)));
}


// returns fractional part of number
function fract(v){
	return v-Math.floor(Math.abs(v))*Math.sign(v);
}

function range(_start, _end, _by){
	var res = [];
	for(var i = _start, l = _end, b = _by || 1; i <= l; i += b){
		res.push(i);
	}
	return res;
}


// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
    var hex = clamp(0,Math.floor(c),255).toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return parseInt("0x" + componentToHex(r) + componentToHex(g) + componentToHex(b));
}


function intersect(__point,__rect){
	return (
		__point.x > __rect.x &&
		__point.x < __rect.x + __rect.width &&
		__point.y > __rect.y &&
		__point.y < __rect.y + __rect.height
	);
}