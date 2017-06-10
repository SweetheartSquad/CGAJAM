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
linkHover = rgbToHex(110,110,110);
linkNormal = rgbToHex(0.92*255,0.92*255,255);

function init(){

	// initialize input managers
	keys.init();
	keys.capture = [keys.LEFT,keys.RIGHT,keys.UP,keys.DOWN,keys.SPACE,keys.ENTER,keys.BACKSPACE,keys.ESCAPE,keys.W,keys.A,keys.S,keys.D,keys.P,keys.M];
	gamepads.init();
	mouse.init("section#display canvas");
	scaledMouse = {
		x:0,
		y:0
	};

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

	var source=PIXI.loader.resources.source.data;
	
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
		lineHeight: 30,
		fill: "#FFFFFF",
		align: "left",
		textBaseline: "alphabetic"
	};


	textContainer = new PIXI.Container();

	// remove unneeded \r characters
	source = source.replace(/[\r]/g,'');

	// break out links
	// result will be an array in format [text,space,link, text,space,link, ...]
	regexSource = /(\s)*?\[\[(.*?)\]\]?/g;
	source = source.split(regexSource);

	console.log(source);

	// create word list
	// (links are always one "word")
	words = [];
	for(var i = 0; i < source.length; ++i){
		if(i %3 != 2){ // link check
			if(source[i]){
				// split text into array of words/whitespace
				var w = source[i].split(/([ \n])/g);
				for(var j = 0; j < w.length; ++j){
					words.push(w[j]);
				}
			}
		}else{
			// link
			var link = source[i].split('|');
			words.push({
				link: link[1],
				text: link[0]
			});
		}
	}
	// clear out empty entries
	for(var i = words.length-1; i >= 0; --i){
		if(!words[i]){
			words.splice(i,1);
		}
	}
	console.log(words);
	// convert to text objects
	{
		var temp = new PIXI.Text("",font);
		var line = "";
		var texts = [];
		var y = 0;
		var x = 0;
		for(var i = 0; i < words.length; ++i){
			var word = words[i];
			var isLink = word.hasOwnProperty('link');
			var wordText = (isLink ? word.text : word);
			if(wordText.length <= 0){
				continue;
			}

			temp.text = line + wordText;
			if(x + temp.wrappy() > size.x/2 || wordText === '\n'){
				// wrap a line
				temp.text = line;
				texts.push(temp);
				temp.y = y;
				temp.x = x;

				line = "";
				y += font.lineHeight;
				x = 0;

				wordText = wordText.trim();
				
				temp = new PIXI.Text("",font);
			}
			// append to current line
			if(isLink){
				if(line){
					// end line early
					temp.text = line;
					texts.push(temp);
					temp.y = y;
					temp.x = x;
					x += temp.wrappy();
				}else{
					temp.destroy();
				}

				// add section with link
				temp = new PIXI.Text(wordText,font);
				temp.x = x;
				temp.y = y;
				temp.link = word.link;
				temp.onclick = function(){
					console.log('Clicked link: ',this.text,'\n','Running: ',this.link);
					eval(this.link);
				}.bind(temp);
				texts.push(temp);
				x += temp.wrappy();

				// continue with new line
				line = "";
				temp = new PIXI.Text("",font);
			}else{
				line += wordText.replace(/[\n]/g,'');
			}

		}
		// add the last line if we have leftovers
		if(line.length > 0){
			temp.text = line;
			texts.push(temp);
			temp.y = y;
			temp.x = x;
		}

		// add text objects
		links = [];
		for(var i= 0; i < texts.length; ++i){
			if(texts[i].text.length <= 0){
				texts[i].destroy();
				continue;
			}
			textContainer.addChild(texts[i]);
			texts[i].tint = offWhite;
			if (texts[i].link) {
				links.push(texts[i]);
			}
		}
		textContainer.x = size.x/4;
		textContainer.y = size.y*0.6;
		textContainer.interactiveChildren = true;
	}

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

	for(var i = 0; i < links.length; ++i){
		links[i].tint = linkNormal;

		var p = links[i].toGlobal(PIXI.zero);

		if(intersect(scaledMouse, {
			x:p.x,
			y:p.y,
			width:links[i].width,
			height:links[i].height
		})){
			links[i].tint = linkHover;

			if(mouse.isJustDown()){
				links[i].onclick();
			}
		}
	}

	if(!isNaN(video.container.targetAlpha)) {
		video.container.alpha = lerp(video.container.alpha, video.container.targetAlpha,0.05);
	}

	// update input managers
	keys.update();
	gamepads.update();
	mouse.update();
	scaledMouse.x = mouse.pos.x / scaleMultiplier;
	scaledMouse.y = mouse.pos.y / scaleMultiplier;
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