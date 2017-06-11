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

	{
		var g = new PIXI.Graphics();
		g.beginFill(0,0);
		g.drawRect(0,0,1,1);
		g.endFill();
		emptyTexture = g.generateTexture();
		g.destroy();
	}

	// initialize input managers
	keys.init();
	keys.capture = [keys.LEFT,keys.RIGHT,keys.UP,keys.DOWN,keys.SPACE,keys.ENTER,keys.BACKSPACE,keys.ESCAPE,keys.W,keys.A,keys.S,keys.D,keys.P,keys.M];
	gamepads.init();
	mouse.init("canvas");
	scaledMouse = {
		x:0,
		y:0
	};

	// setup screen filter
	screen_filter = new CustomFilter(PIXI.loader.resources.vert.data, PIXI.loader.resources.screen_shader.data);
	screen_filter.padding = 0;
	screen_filter.uniforms["uTime"] = 0;
	screen_filter.uniforms["palette"] = 0.0;

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
	for(var i in PIXI.loader.resources){
		if(PIXI.loader.resources.hasOwnProperty(i)){
			var resource = PIXI.loader.resources[i];
			if(resource.loadType === PIXI.loaders.Resource.LOAD_TYPE.VIDEO){
				resource.data.loop = true;
				resource.data.volume = 0;
				resource.data.muted = true;
				resource.data.autoplay = false;
			}
		}
	}
	video.currentPassage = {
		text:[],
		links:[],
		title:null
	};
	video.texture = new PIXI.Texture(emptyTexture.baseTexture);
	video.sprite = new PIXI.Sprite(video.texture);
	video.sprite.filters = [greenScreen_filter];
	video.sprite.width = size.x;
	video.sprite.height = size.y;

	// video border
	{
		var g = new PIXI.Graphics();
		g.beginFill(0,0);
		g.lineStyle(40, 0, 1);
		g.moveTo(0,0);
		g.lineTo(0,mask.h);
		g.lineTo(mask.w,mask.h);
		g.lineTo(mask.w,0);
		g.lineTo(0,0);
		g.endFill();
		g.beginFill(0,0);
		g.lineStyle(20, offWhite, 1);
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

	video.textContainer = new PIXI.Container();

	video.container.addChild(video.bg);
	video.container.addChild(video.sprite);
	video.container.addChild(video.textContainer);
	video.container.addChild(video.border);

	video.container.alpha = 0;

	textContainer = new PIXI.Container();
	textContainer.x = size.x/4;

	game.addChild(bg);
	game.addChild(textContainer);
	// bg border
	{
		var g = new PIXI.Graphics();
		g.beginFill(0,0);
		g.lineStyle(10, offWhite, 1);
		g.moveTo(0,size.y/2);
		g.lineTo(size.x,size.y/2);
		g.endFill();
		g.beginFill(0,0);
		g.lineStyle(40, offWhite, 1);
		g.moveTo(0,0);
		g.lineTo(0,size.y);
		g.lineTo(size.x,size.y);
		g.lineTo(size.x,0);
		g.lineTo(0,0);
		g.endFill();
		g.beginFill(0,0);
		g.lineStyle(20, 0, 1);
		g.moveTo(0,0);
		g.lineTo(0,size.y);
		g.lineTo(size.x,size.y);
		g.lineTo(size.x,0);
		g.lineTo(0,0);
		g.endFill();
		game.addChild(new PIXI.Sprite(g.generateTexture()));
		g.destroy();
	}
	game.addChild(video.container);

	// parse source
	passages = parseSource(PIXI.loader.resources.source.data);
	// create game and goto starting passage
	api = new Game();
	api.goto('START');

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
		api.showVideo();
	}
	if(keys.isDown(keys.S)){
		api.hideVideo();
	}

	if(keys.isDown(keys.B)){
		api.setBg("ship");
	}
	if(keys.isDown(keys.M)){
		api.setBg("ship2");
	}
	if(keys.isDown(keys.V)){
		api.setBg("ship3");
	}
	if(keys.isDown(keys.N)){
		api.setBg("bg");
	}
	if(keys.isDown(keys.C)){
		api.setBg("mansion");
	}

	// copy of current passage links
	// (don't use them directly since they may change on click)
	var links = [];
	var activeLinks = (video.container.targetAlpha > 0 ? video : api).currentPassage.links;
	for(var i = 0; i < activeLinks.length; ++i){
		var link = activeLinks[i];
		var p = link.toGlobal(PIXI.zero);

		if(intersect(scaledMouse, {
			x:p.x,
			y:p.y,
			width:link.width,
			height:link.height
		})){
			link.tint = linkHover;

			if(mouse.isJustDown()){
				links.push(link.onclick.bind(link));
			}
		} else {
			link.tint = linkNormal;
		}
	}
	for(var i = 0; i < links.length; ++i){
		links[i]();
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
	screen_filter.uniforms["uTime"] = curTime/1000.0%1000.0; // provide time in seconds (range 0-1000)
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



function Game(){
	this.currentPassage = {
		text:[],
		links:[],
		title:null
	};
	this.history = [];
}

Game.prototype.eval = function(__script) {
	(function(__s){return eval(__s);}).call(this, __script);
};

// API
Game.prototype.setBg = function(__bg) {
	bg.texture = video.bg.texture = PIXI.loader.resources[__bg].texture;
};

Game.prototype.setVideo = function(__video) {
	this.hideVideo();
	video.video = PIXI.loader.resources[__video].data;
	if(video.baseTexture){
		video.baseTexture.destroy();
	}
	video.baseTexture = PIXI.VideoBaseTexture.fromVideo(video.video);
	video.texture.baseTexture = video.baseTexture;
	this.showVideo();
};

Game.prototype.showVideo = function() {
	video.container.targetAlpha = 1.0;
	if(video.video){
		video.video.currentTime = 0;
	}
	
	// remove existing passage
	var oldText = video.textContainer.removeChildren();
	for(var i = 0; i < oldText.length; ++i){
		oldText[i].destroy();
	}

	// bg
	{
		var g = new PIXI.Graphics();
		g.beginFill(0,1);
		g.drawRect(0,0,1,1);
		g.endFill();
		video.textContainer.bg = new PIXI.Sprite(g.generateTexture());
		g.destroy();
	}
	video.textContainer.bg.width = size.x/3;
	video.textContainer.bg.height = 0;
	video.textContainer.addChild(video.textContainer.bg);

	// parse requested passage
	video.currentPassage = passageToText(parsePassage(passages['API TEST']),size.x/3);
	//p.title = __passage;

	// add parsed passage
	for(var i = 0; i < video.currentPassage.text.length; ++i){
		video.textContainer.addChild(video.currentPassage.text[i]);
	}
	video.textContainer.x = size.x/3;
	video.textContainer.y = size.y/8;
	video.textContainer.bg.height = video.textContainer.height;
	// re-center text
	//textContainer.y = size.y*3/4 - textContainer.height/2;
};

Game.prototype.hideVideo = function() {
	video.container.targetAlpha = 0.0;
};

Game.prototype.enableShader = function(){
	renderSprite.filters = [screen_filter];
};

Game.prototype.disableShader = function(){
	renderSprite.filters = [];
};

Game.prototype.setPalette = function(__palette){
	screen_filter.uniforms["palette"] = __palette;
};

Game.prototype.goto = function(__passage) {
	console.log('Going to passage:',__passage);
	
	// remove existing passage
	var oldText = textContainer.removeChildren();
	for(var i = 0; i < oldText.length; ++i){
		oldText[i].destroy();
	}

	// parse requested passage
	if(this.currentPassage.title){
		this.history.push(this.currentPassage.title);
	}else{
		console.log('History skipped because passage has no title:',this.currentPassage);
	}
	this.currentPassage = passageToText(parsePassage(passages[__passage]), size.x/2);
	this.currentPassage.title = __passage;

	// add parsed passage
	for(var i = 0; i < this.currentPassage.text.length; ++i){
		textContainer.addChild(this.currentPassage.text[i]);
	}
	// re-center text
	textContainer.y = size.y*3/4 - textContainer.height/2;
};

Game.prototype.back = function() {
	if(this.history.length > 0){
		this.goto(this.history.pop()); // goto the last thing in history
		this.history.pop(); // remove the last thing in history (i.e. don't get stuck in a loop)
	}else{
		console.error("Back skipped because no history available.");
	}
};

Game.onLinkClicked = function(){
	console.log('Clicked link: ',this.text,'\n','Running: ',this.link);
	api.eval(this.link);
};











// parser
PIXI.Text.prototype.measureWidth = function(__text){
	this.context.font = this.style.font;
 	return this.context.measureText(__text).width;
}
function parseSource(__source){
	// remove unneeded \r characters
	__source = __source.replace(/[\r]/g,'');

	console.log('Parsing source:',__source);

	return parsePassages(__source);
}

function parsePassages(__source) {
	// split passages apart
	// passages are in format:
	// ::PASSAGE TITLE
	// passage contents
	var passageRegex = /:{2}(.*)\n/g;
	var passages = {};

	var p = __source.split(passageRegex);
	p.shift(); // remove the first element, which is all text above first passage title
	console.debug(p);

	// associate passage bodies to passage titles
	for(var i = 0; i < p.length; i += 2){
		passages[p[i]] = p[i+1];
	}

	console.log('Parsed passages:',passages);
	return passages;
}

function parsePassage(__source){

	// break out links (links are inside double square brackets, i.e. [[link]] )
	// result will be an array in format [plain-text,whitespace,link, plain-text,whitespace,link, ...]
	// note: not 
	regexSource = /(\s)*?\[{2}(.*?)\]{2}/g;
	__source = __source.split(regexSource);

	console.debug(__source);
	// create word list
	// (links are always one "word")
	var words = [];
	for(var i = 0; i < __source.length; ++i){
		if(i%3 != 2){ // link check
			if(__source[i]){
				// split plain-text into array of words/whitespace
				var w = __source[i].split(/([ \n])/g);
				for(var j = 0; j < w.length; ++j){
					words.push(w[j]);
				}
			}
		}else{
			// link
			var link = __source[i].split('|');
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
	return words;
}

// go through passage contents and convert to text objects
// and interactive elements
function passageToText(__passage, __maxWidth) {
	var font = {
		fontFamily: "font",
		fontSize: 24,
		lineHeight: 30,
		fill: "#FFFFFF",
		align: "left",
		textBaseline: "alphabetic"
	};
	var temp = new PIXI.Text("",font);
	var line = "";
	var passage = {
		text: [],
		links: []
	};
	var y = 0;
	var x = 0;
	for(var i = 0; i < __passage.length; ++i){
		var word = __passage[i];
		var isLink = word.hasOwnProperty('link');
		var wordText = (isLink ? word.text : word);
		if(wordText.length <= 0){
			continue;
		}

		if(x + temp.measureWidth(line + wordText) > __maxWidth || wordText === '\n'){
			// wrap a line
			temp.text = line;
			passage.text.push(temp);
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
				passage.text.push(temp);
				temp.y = y;
				temp.x = x;
				x += temp.measureWidth(temp.text);
			}else{
				temp.destroy();
			}

			// add section with link
			temp = new PIXI.Text(wordText,font);
			temp.x = x;
			temp.y = y;
			temp.link = word.link;
			temp.onclick = Game.onLinkClicked;
			passage.text.push(temp);
			x += temp.measureWidth(temp.text);

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
		passage.text.push(temp);
		temp.y = y;
		temp.x = x;
	}

	// add text objects
	for(var i= 0; i < passage.text.length; ++i){
		if(passage.text[i].text.length <= 0){
			passage.text[i].renderable = false;
		}
		passage.text[i].tint = offWhite;
		if (passage.text[i].link) {
			passage.links.push(passage.text[i]);
		}
	}
	return passage;
}