function main(){
	// step
	curTime = Date.now()-startTime;
	deltaTime = curTime-lastTime;

	update();
	render();

	lastTime = curTime;

	// request another frame to keeps the loop going
	requestAnimationFrame(main);
}

offWhite = rgbToHex(1.0*255, 0.95*255, 0.95*255);

function init(){

	// initialize input managers
	keys.init();
	keys.capture = [keys.LEFT,keys.RIGHT,keys.UP,keys.DOWN,keys.SPACE,keys.ENTER,keys.BACKSPACE,keys.ESCAPE,keys.W,keys.A,keys.S,keys.D,keys.P,keys.M];
	gamepads.init();

	// setup screen filter
	screen_filter = new CustomFilter(PIXI.loader.resources.vert.data, PIXI.loader.resources.screen_shader.data);
	screen_filter.padding = 0;
	screen_filter.uniforms["uTime"] = 0;

	// setup greenscreen filter
	greenScreen_filter = new CustomFilter(PIXI.loader.resources.vert.data, PIXI.loader.resources.greenScreen_shader.data);
	greenScreen_filter.padding = 0;
	
	// setup rendersprite filter
	renderSprite.filterArea = new PIXI.Rectangle(0,0,size.x,size.y);
	renderSprite.filters = [screen_filter];

	window.onresize = onResize;
	onResize();

	video = {
		container:null,
		bg:null,
		sprite:null,
		border:null
	};

	bg = new PIXI.Sprite(PIXI.loader.resources.ship.texture);
	bg.width = size.x;
	bg.height = size.y;
	{
		var g = new PIXI.Graphics();
		g.beginFill(0xFFFFFF,1);
		g.drawRect(0,0,size.x,size.y/2);
		g.endFill();
		bg.mask = new PIXI.Sprite(g.generateTexture());
		g.destroy();
	}


	// setup video container
	video.container = new PIXI.Container();
	var maskRatio = {
		x: 0.7,
		y: 0.9
	};
	var mask = {
		x: size.x*(1-maskRatio.x)/2,
		y: size.y*(1-maskRatio.y)/2,
		w: size.x*maskRatio.x,
		h: size.y*maskRatio.y
	};
	{
		var g = new PIXI.Graphics();
		g.beginFill(0x000000);
		g.drawRect(0,0,size.x,size.y);
		g.endFill();
		g.beginFill(0xFFFFFF);
		g.drawRect(mask.x, mask.y, mask.w, mask.h);
		g.endFill();
		video.container.mask = new PIXI.Sprite(g.generateTexture());
		g.destroy();
	}

	// video bg
	video.bg = new PIXI.Sprite(PIXI.loader.resources.ship.texture);
	video.bg.width = size.x;
	video.bg.height = size.y;

	// video sprite
	PIXI.loader.resources.vid.data.loop = true;
	vidTex = PIXI.VideoBaseTexture.fromVideo(PIXI.loader.resources.vid.data);
	vidTex2 = new PIXI.Texture(vidTex);
	video.sprite = new PIXI.Sprite(vidTex2);
	video.sprite.filters = [greenScreen_filter];
	video.sprite.width = size.x;
	video.sprite.height = size.y;

	// video border
	{
		var g = new PIXI.Graphics();
		g.beginFill(0,0);
		g.lineStyle(40, offWhite, 1);
		g.moveTo(0,0);
		g.lineTo(0,mask.h);
		g.lineTo(mask.w,mask.h);
		g.lineTo(mask.w,0);
		g.lineTo(0,0);
		g.endFill();
		g.beginFill(0,0);
		g.lineStyle(20, 0, 1);
		g.moveTo(0,0);
		g.lineTo(0,mask.h);
		g.lineTo(mask.w,mask.h);
		g.lineTo(mask.w,0);
		g.lineTo(0,0);
		g.endFill();
		video.border = new PIXI.Sprite(g.generateTexture());
		video.border.x = mask.x;
		video.border.y = mask.y;
		g.destroy();
	}

	video.container.addChild(video.bg);
	video.container.addChild(video.sprite);
	video.container.addChild(video.border);

	video.container.alpha = 0;

	var source="Of course everything is going wrong on your vacation. You get away from the [base] for a five day getaway in the hostoric [foothills] of Charon and you're one day behind, two suitcases short, and three hundred thousand miles from the bed and [breakfast] you booked. You're only just now passing Venus.";
	
	//var r=/\[(.*?)\]/g;
	//s=s.split(r);
	console.log(source);

	PIXI.Text.prototype.wrappy = function(){
		this.context.font = this.style.font;
 
	    var outputText = this.text;
	 	return this.context.measureText(outputText).width;
	}

	font = {
		fontFamily: "font",
		fontSize: 24,
		fill: "#"+offWhite.toString(16),
		align: "left",
		textBaseline: "alphabetic"
	};


	textContainer = new PIXI.Container();
	source = source.split(' ');
	{
		var temp = new PIXI.Text("",font);
		var string = "";
		var texts = [];
		var y = 0;
		var x = 0;
		for(var i = 0; i < source.length; ++i){
			var s = source[i];
			var link = s.substr(0,1) == "[" && s.substr(-1) == "]";
			var o = (link ? s.substr(1,s.length-2) : s)
			temp.text = string + " " + o;
			if(x + temp.wrappy() > size.x/2){
				// wrap a line
				temp.text = string;
				texts.push(temp);
				temp.y = y;
				temp.x = x;

				string = "";
				y += font.fontSize;
				x = 0;
				
				temp = new PIXI.Text("",font);
			}
			// append to current line
			if(link){
				// end line early
				temp.text = string + " ";
				texts.push(temp);
				temp.y = y;
				temp.x = x;
				x += temp.wrappy();

				// add section with link
				temp = new PIXI.Text(o,font);
				temp.x = x;
				temp.y = y;
				temp.tint = 0x0000FF;
				texts.push(temp);
				x += temp.wrappy();
				//temp.scale.x = temp.scale.y = 1.5;

				// continue with new line
				string = "";
				temp = new PIXI.Text("",font);
			}else{
				string += " " + o;
			}

		}
		if(string.length > 0){
			temp.text = string;
			texts.push(temp);
			temp.y = y;
			temp.x = x;
		}
		for(var i= 0; i < texts.length; ++i){
			textContainer.addChild(texts[i]);
			// setInterval(function(i){
			// 	this.rotation=Math.sin(i+curTime/100)/50;
			// }.bind(texts[i],i),-1);
		}
		textContainer.x = size.x/4;
		textContainer.y = size.y*0.6;
	}

	// t = new PIXI.Text(s.join(''), {
	// 	fontFamily: "font",
	// 	fontSize: 24,
	// 	fill: "#"+offWhite.toString(16),
	// 	align: "left",
	// 	textBaseline: "alphabetic",
	// 	wordWrap: true,
	// 	wordWrapWidth: size.x*0.5
	// });
	// setTimeout(function(){
	// 	t.text += "2";
	// },1000);

	// t.y = size.y * 0.6;
	// t.x = size.x * 0.25;

	game.addChild(bg);
	game.addChild(textContainer);
	game.addChild(video.container);
	

	// start the main loop
	main();
}

function onResize() {
	_resize();
	screen_filter.uniforms["uScreenSize"] = [size.x,size.y];
	screen_filter.uniforms["uBufferSize"] = [nextPowerOfTwo(size.x),nextPowerOfTwo(size.y)];
	console.log('Resized',size,scaleMultiplier,[size.x*scaleMultiplier,size.y*scaleMultiplier]);
}

function update(){
	// game update


	var inputs = getInputs();

	if(keys.isDown(keys.A)){
		video.container.targetAlpha = 1.0;
	}
	if(keys.isDown(keys.S)){
		video.container.targetAlpha = 0;
	}

	if(keys.isDown(keys.B)){
		setBg("ship");
	}
	if(keys.isDown(keys.M)){
		setBg("ship2");
	}
	if(keys.isDown(keys.V)){
		setBg("ship3");
	}
	if(keys.isDown(keys.N)){
		setBg("bg");
	}
	if(keys.isDown(keys.C)){
		setBg("mansion");
	}

	if(!isNaN(video.container.targetAlpha)) {
		video.container.alpha = lerp(video.container.alpha, video.container.targetAlpha,0.05);
	}

	// update input managers
	keys.update();
	gamepads.update();
}

function render(){
	screen_filter.uniforms["uTime"] = curTime/1000;
	greenScreen_filter.uniforms["uSpriteSize"] = [video.sprite.width,video.sprite.height];
	greenScreen_filter.uniforms["uBufferSize"] = [nextPowerOfTwo(video.sprite.width),nextPowerOfTwo(video.sprite.height)];
	renderer.render(game,renderTexture,true,false);
	renderer.render(renderSprite,null,true,false);
}



function getInputs(){
	var res = [
		{
			move: {
				x: gamepads.getAxis(gamepads.LSTICK_H),
				y: gamepads.getAxis(gamepads.LSTICK_V)
			},
			punch:
				gamepads.isJustDown(gamepads.LB) ||
				gamepads.isJustDown(gamepads.LT) ||
				keys.isJustDown(keys.Q),
			uppercut: false
		},
		{
			move: {
				x: gamepads.getAxis(gamepads.RSTICK_H),
				y: gamepads.getAxis(gamepads.RSTICK_V)
			},
			punch:
				gamepads.isJustDown(gamepads.RB) ||
				gamepads.isJustDown(gamepads.RT) ||
				keys.isJustDown(keys.U),
			uppercut: false
		}
	];

	if(keys.isDown(keys.A) || keys.isDown(keys.LEFT) || gamepads.isDown(gamepads.DPAD_LEFT)){
		res[0].move.x -= 1;
	}if(keys.isDown(keys.D) || keys.isDown(keys.RIGHT) || gamepads.isDown(gamepads.DPAD_RIGHT)){
		res[0].move.x += 1;
	}if(keys.isDown(keys.W) || keys.isDown(keys.UP) || gamepads.isDown(gamepads.DPAD_UP)){
		res[0].move.y -= 1;
	}if(keys.isDown(keys.S) || keys.isDown(keys.DOWN) || gamepads.isDown(gamepads.DPAD_DOWN)){
		res[0].move.y += 1;
	}

	if(keys.isDown(keys.J)/* || keys.isDown(keys.LEFT)*/ || gamepads.isDown(gamepads.X)){
		res[1].move.x -= 1;
	}if(keys.isDown(keys.L)/* || keys.isDown(keys.RIGHT)*/ || gamepads.isDown(gamepads.B)){
		res[1].move.x += 1;
	}if(keys.isDown(keys.I)/* || keys.isDown(keys.UP)*/ || gamepads.isDown(gamepads.Y)){
		res[1].move.y -= 1;
	}if(keys.isDown(keys.K)/* || keys.isDown(keys.DOWN)*/ || gamepads.isDown(gamepads.A)){
		res[1].move.y += 1;
	}

	for(var i = 0, l = res.length; i < l; ++i){
		res[i].uppercut = res[i].punch && res[i].move.y < -0.5;
		res[i].punch = res[i].punch && !res[i].uppercut;

		res[i].move.x = clamp(-1.0, res[i].move.x, 1.0);
		res[i].move.y = clamp(-1.0, res[i].move.y, 1.0);
	}

	return res;
}




function setBg(__bg) {
	bg.texture = video.bg.texture = PIXI.loader.resources[__bg].texture;
}

function setVideo(__video) {

}