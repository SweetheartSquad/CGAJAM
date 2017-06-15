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
linkHover = rgbToHex(150,150,150);
linkNormal = rgbToHex(0.92*255,0.92*255,255);

border = {
	outer: 16,
	inner: 10
};

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
	greenScreen_filter.uniforms["uScreenMode"] = 0;
	
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

	bg = new PIXI.Sprite(emptyTexture);
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
		x: Math.floor(size.x*(1-maskRatio.x)/2),
		y: Math.floor(size.y*(1-maskRatio.y)/2),
		w: Math.ceil(size.x*maskRatio.x),
		h: Math.ceil(size.y*maskRatio.y)
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
	video.bg = new PIXI.Sprite(emptyTexture);
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
	video.texture = new PIXI.Texture(emptyTexture.baseTexture);
	video.sprite = new PIXI.Sprite(video.texture);
	video.sprite.filters = [greenScreen_filter];
	video.sprite.width = size.x;
	video.sprite.height = size.y;

	// video border
	{
		video.border = new PIXI.Sprite(getBorderTex({width: mask.w, height: mask.h}, false));
		video.border.x = mask.x;
		video.border.y = mask.y;
	}

	video.passageContainer = new PIXI.Container();
	video.passageContainer.textContainer = new PIXI.Container();
	video.passageContainer.addChild(video.passageContainer.textContainer);
	video.passageContainer.textContainer.x += border.outer;
	video.passageContainer.textContainer.y += border.outer;

	video.container.addChild(video.bg);
	video.container.addChild(video.sprite);
	video.container.addChild(video.passageContainer);
	video.container.addChild(video.border);

	video.container.alpha = 0;

	textContainer = new PIXI.Container();
	textContainer.x = Math.floor(size.x/4);
	textContainer.alpha = 0;
	textContainer.targetAlpha = 0;

	game.addChild(bg);
	game.addChild(textContainer);
	// bg border
	{
		var g = new PIXI.Graphics();
		g.beginFill(0,0);
		g.lineStyle(border.outer-border.inner, offWhite, 1);
		g.moveTo(0,size.y/2);
		g.lineTo(size.x,size.y/2);
		g.endFill();
		game.addChild(new PIXI.Sprite(g.generateTexture()));
		g.destroy();

		game.addChild(new PIXI.Sprite(getBorderTex({width: size.x, height: size.y}, true)));
	}
	game.addChild(video.container);

	// mouse stuff
	mouseSprite3 = new PIXI.Sprite(PIXI.loader.resources.cursor.texture);
	game.addChild(mouseSprite3);
	mouseSprite3.alpha = 0.4;
	mouseSprite2 = new PIXI.Sprite(PIXI.loader.resources.cursor.texture);
	game.addChild(mouseSprite2);
	mouseSprite2.alpha = 0.45;
	mouseSprite = new PIXI.Sprite(PIXI.loader.resources.cursor.texture);
	game.addChild(mouseSprite);


	// parse source
	passages = parseSource(PIXI.loader.resources.source.data);

	// hide game to start
	game.alpha = 0;

	// create game and goto starting passage
	api = new Game();
	var p = screen_filter.uniforms["palette"];
	screen_filter.uniforms["palette"] = screen_filter.uniforms["palette"] ? 0 : 1;
	api.eval('this.setPalette('+p+');') // sets the initial palette
	.then(api.eval.bind(api,'this.goto("START");')) // sets the initial passage
	.then(api.eval.bind(api,'this.setBg("estate");')); // sets the initial background

	// start the main loop
	main();
}

function onResize() {
	_resize();
	screen_filter.uniforms["uScreenSize"] = [size.x,size.y];
	screen_filter.uniforms["uBufferSize"] = [nextPowerOfTwo(size.x),nextPowerOfTwo(size.y)];
	//console.log('Resized',size,scaleMultiplier,[size.x*scaleMultiplier,size.y*scaleMultiplier]);
}

function update(){
	// game update

	// copy of current passage links
	// (don't use them directly since they may change on click)
	var links = [];
	var activePassage = api.currentPassage;
	if(activePassage){
		var activeLinks = activePassage.links;
		for(var i = 0; i < activeLinks.length; ++i){
			var link = activeLinks[i];
			var p = link.toGlobal(PIXI.zero);

			if(!api.busy && intersect(scaledMouse, {
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
	}

	// key handling
	if(keys.isJustDown(keys.ESCAPE)){
		if(!activePassage || activePassage.title !== 'Options') {
			api.eval('this.shouldShowVideo=this.video;this.hideVideo().then(this.goto.bind(this,"Options"));');
		} else {
			api.eval('(this.shouldShowVideo ? this.showVideo() : Promise.resolve()).then(this.back.bind(this))');
		}
	}
	if(keys.isJustDown(keys.F)){
		renderer.view.toggleFullscreen = true;
	}

	// animation update
	var alphaAnimation = [
		{
			obj:video.container,
			speed:0.01
		},
		{
			obj:video.bg,
			speed:0.05
		},
		{
			obj:bg,
			speed:0.05
		},
		{
			obj:textContainer,
			speed:0.05
		},
		{
			obj:video.passageContainer.textContainer,
			speed:0.05
		},
		{
			obj:game,
			speed:0.05
		}
	];
	for(var i = 0; i < alphaAnimation.length; ++i){
		var animation = alphaAnimation[i];
		if(!isNaN(animation.obj.targetAlpha)) {
			animation.obj.alpha += Math.sign(animation.obj.targetAlpha - animation.obj.alpha)*animation.speed;//lerp(obj.alpha, obj.targetAlpha,0.05);
			if(Math.abs(animation.obj.alpha - animation.obj.targetAlpha) <= animation.speed){
				animation.obj.alpha = animation.obj.targetAlpha;
				animation.obj.targetAlpha = undefined;
			}
		}
	}

	// update input managers
	keys.update();
	gamepads.update();
	mouse.update();
	scaledMouse.x = mouse.pos.x / scaleMultiplier;
	scaledMouse.y = mouse.pos.y / scaleMultiplier;

	mouseSprite.position.x = Math.floor(scaledMouse.x);
	mouseSprite.position.y = Math.floor(scaledMouse.y);
	mouseSprite.tint = mouseSprite2.tint = offWhite;
	mouseSprite2.position.x = lerp(mouseSprite2.x, mouseSprite.x, 0.75);
	mouseSprite2.position.y = lerp(mouseSprite2.y, mouseSprite.y, 0.75);
	mouseSprite3.position.x = lerp(mouseSprite3.x, mouseSprite2.x, 0.5);
	mouseSprite3.position.y = lerp(mouseSprite3.y, mouseSprite2.y, 0.5);
}

function render(){
	screen_filter.uniforms["uTime"] = curTime/1000.0%1000.0; // provide time in seconds (range 0-1000)
	greenScreen_filter.uniforms["uSpriteSize"] = [video.sprite.width,video.sprite.height];
	greenScreen_filter.uniforms["uBufferSize"] = [nextPowerOfTwo(video.sprite.width),nextPowerOfTwo(video.sprite.height)];
	renderer.render(game,renderTexture,true,false);
	renderer.render(renderSprite,null,true,false);
}

function getBorderTex(__rect, __invert){
	var g = new PIXI.Graphics();
	g.beginFill(0,0);
	g.lineStyle(border.outer, __invert ? offWhite : 0, 1);
	g.moveTo(border.outer/2,border.outer/2);
	g.lineTo(border.outer/2,__rect.height-border.outer/2);
	g.lineTo(__rect.width-border.outer/2,__rect.height-border.outer/2);
	g.lineTo(__rect.width-border.outer/2,border.outer/2);
	g.lineTo(border.outer/2,border.outer/2);
	g.endFill();
	g.beginFill(0,0);

	var b = __invert ? border.inner : (border.outer - border.inner);
	g.lineStyle(b, __invert ? 0 : offWhite, 1);
	g.moveTo(b/2,b/2);
	g.lineTo(b/2,__rect.height-b/2);
	g.lineTo(__rect.width-b/2,__rect.height-b/2);
	g.lineTo(__rect.width-b/2,b/2);
	g.lineTo(b/2,b/2);
	g.endFill();
	var tex = g.generateTexture();
	g.destroy();
	return tex;
}



function Game(){
	this.currentPassage = {
		text:[],
		links:[],
		title:null
	};
	this.video = false;
	this.history = [];
	this.busy = false;
}

// flags as busy, and returns a promise
// if already busy when called, promise will be in fail-state
Game.prototype.startAction = function() {
	return new Promise(function(__resolve, __reject) {
		if (this.busy) {
			__reject('startAction failed because already busy');
		}
		this.busy = true;
		__resolve();
	}.bind(this));
};

// unflags as busy, and returns a promise
// if not busy when called, promise will be in fail-state
Game.prototype.endAction = function() {
	return new Promise(function(__resolve, __reject) {
		if (!this.busy) {
			__reject('endAction failed because not busy');
		}
		this.busy = false;
		__resolve();
	}.bind(this));
};

Game.prototype.__eval = function(__s){
	return eval(__s);
};

Game.prototype.eval = function(__script) {
	return this.startAction()
	.then(this.__eval.bind(this, __script))
	.then(this.endAction.bind(this));
};

// API
Game.prototype.setBg = function(__bg) {
	//console.log('Setting background to:',__bg);
	return Promise.all([
		// fade out
		fadeOut(bg),
		fadeOut(video.bg)
	])
	.then(function(r){
		// swap bg
		bg.texture = video.bg.texture = PIXI.loader.resources[__bg].texture;
	})
	.then(function(){
		// fade in
		return Promise.all([
			fadeIn(bg),
			fadeIn(video.bg)
		]);
	});
};

Game.prototype.setVideo = function(__video) {
	return this.hideVideo()
	.then(function(){
		// swap video
		video.video = PIXI.loader.resources[__video].data;
		greenScreen_filter.uniforms["uScreenMode"] = PIXI.loader.resources[__video].metadata.screenMode;
		if(video.baseTexture){
			video.baseTexture.destroy();
		}
		if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
			// hack for firefox: use the fromUrl instead of pre-loaded data
			video.baseTexture = PIXI.VideoBaseTexture.fromUrl({
				src: 'assets/video/'+__video+'.mp4',
				mime: 'video/mp4'
			});
			video.baseTexture.source.loop = true;
		}else{
			video.baseTexture = PIXI.VideoBaseTexture.fromVideo(video.video);
		}
		video.baseTexture.mipmap = false;
		video.texture.baseTexture = video.baseTexture;
	})
	.then(this.showVideo.bind(this));
};

Game.prototype.showVideo = function() {
	if(video.video){
		video.video.currentTime = 0;
	}
	
	return Promise.resolve()
	.then(function(){
		return Promise.all([fadeIn(video.container), fadeOut(textContainer)]);
	})
	.then(function(){
		this.video = true;
	}.bind(this));
};

Game.prototype.hideVideo = function() {
	return Promise.resolve()
	.then(function(){
		return Promise.all([fadeOut(video.container), fadeIn(textContainer)]);
	})
	.then(function(){
		this.video = false;
	}.bind(this));
};

Game.prototype.enableShader = function(){
	renderSprite.filters = [screen_filter];
};

Game.prototype.disableShader = function(){
	renderSprite.filters = [];
};

Game.prototype.setPalette = function(__palette){
	//console.log('Setting palette:',__palette);

	if(__palette === screen_filter.uniforms["palette"]) {
		//console.log('Palette already set');
		return Promise.resolve();
	}

	return fadeOut(game)
	.then(function() {
		screen_filter.uniforms["palette"] = __palette;
		game.targetAlpha = 1;
	})
	.then(fadeIn.bind(undefined, game));
};

Game.prototype.displayPassage = function(__newPassage){
	// remove existing passage
	var oldText = textContainer.removeChildren();
	for(var i = 0; i < oldText.length; ++i){
		oldText[i].destroy();
	}
	oldText = video.passageContainer.textContainer.removeChildren();
	for(var i = 0; i < oldText.length; ++i){
		oldText[i].destroy();
	}

	// history
	if(this.currentPassage && this.currentPassage.title){
		this.history.push(this.currentPassage.title);
	}else{
		console.warn('History skipped because passage has no title:',this.currentPassage);
	}

	// parse requested passage
	var textWidth = this.video ? size.x/2.2 : size.x/1.9;
	this.currentPassage = passageToText(__newPassage, textWidth);
	this.currentPassage.title = __newPassage.title;

	if(!this.video) {
		// add parsed passage
		for(var i = 0; i < this.currentPassage.text.length; ++i){
			textContainer.addChild(this.currentPassage.text[i]);
		}
		// re-center text
		textContainer.y = size.y*3/4 - textContainer.height/2;
	}else{
		// bg
		if(video.passageContainer.bg){
			video.passageContainer.removeChild(video.passageContainer.bg);
			video.passageContainer.bg.destroy();
		}
		{
			var g = new PIXI.Graphics();
			g.beginFill(0,1);
			g.drawRect(0,0,1,1);
			g.endFill();
			video.passageContainer.bg = new PIXI.Sprite(g.generateTexture());
			g.destroy();
		}
		video.passageContainer.bg.height = 0;


		// add parsed passage
		for(var i = 0; i < this.currentPassage.text.length; ++i){
			video.passageContainer.textContainer.addChild(this.currentPassage.text[i]);
		}
		video.passageContainer.bg.height = video.passageContainer.textContainer.height + border.outer*2;
		video.passageContainer.bg.width = textWidth + border.outer*2;
		video.passageContainer.addChildAt(video.passageContainer.bg, 0);
		// border
		{
			if(video.passageContainer.border){
				video.passageContainer.removeChild(video.passageContainer.border);
				video.passageContainer.border.destroy();
			}
			video.passageContainer.border = new PIXI.Sprite(getBorderTex(video.passageContainer.bg,false))
			video.passageContainer.addChild(video.passageContainer.border);
		}
		// re-center text
		video.passageContainer.x = Math.floor(size.x/2 - textWidth/2);
		video.passageContainer.y = Math.floor(size.y*3/4 - video.passageContainer.height/2);
	}
	return;
};

Game.prototype.goto = function(__passage) {
	var t = this.video ? video.passageContainer.textContainer : textContainer;
	//console.log('Going to passage:', __passage);
	return fadeOut(t)
	.then(parsePassage.bind(undefined, passages[__passage]))
	.then(function(__newPassage){
		__newPassage.title = __passage;
		return __newPassage;
	})
	.catch(function(__err){
		console.error('Failed to parsePassage:',__passage,'\n',__err);
		return parsePassage(passages['DEFAULT']);
	})
	.then(this.displayPassage.bind(this))
	.then(fadeIn.bind(undefined, t));
};

Game.prototype.back = function() {
	if(this.history.length > 0){
		return this.goto(this.history.pop()) // goto the last thing in history
		.then(function(){
			this.history.pop(); // remove the last thing in history (i.e. don't get stuck in a loop)
		}.bind(this)); 
	}else{
		console.warn('Back skipped because no history available.');
	}
};

Game.onLinkClicked = function(){
	//console.log('Clicked link: ',this.text,'\n','Running: ',this.link);
	api.eval(this.link);
};


function fadeOut(__obj){
	//console.log('fadeOut: ',__obj);
	return new Promise(function(__resolve, __reject){
		__obj.targetAlpha = 0;
		var i = setInterval(function(){
			if(__obj.alpha <= 0.2){
				clearInterval(i);
				i = undefined;
				__resolve(__obj);
			}
		}, -1);
	});
}
function fadeIn(__obj){
	//console.log('fadeIn: ',__obj);
	return new Promise(function(__resolve, __reject){
		__obj.targetAlpha = 1;
		var i = setInterval(function(){
			if(__obj.alpha >= 0.8){
				clearInterval(i);
				i = undefined;
				__resolve(__obj);
			}
		}, -1);
	});
}








// parser
PIXI.Text.prototype.measureWidth = function(__text){
	this.context.font = this.style.font;
 	return this.context.measureText(__text).width;
}
function parseSource(__source){
	// remove unneeded \r characters
	__source = __source.replace(/[\r]/g,'');

	//console.log('Parsing source:',__source);

	return parsePassages(__source);
}

function parsePassages(__source) {
	// split passages apart
	// passages are in format:
	// ::PASSAGE TITLE
	// passage contents
	var passageRegex = /\s*?:{2}(.*)\n/g;
	var passages = {};

	var p = __source.split(passageRegex);
	p.shift(); // remove the first element, which is all text above first passage title
	//console.log(p);

	// associate passage bodies to passage titles
	for(var i = 0; i < p.length; i += 2){
		passages[p[i]] = p[i+1];
	}

	//console.log('Parsed passages:',passages);
	return passages;
}

function parseConditionals(__source) {
	var regex = /\((.*?)\)\{(.*)\}\s*?\n{0,1}/g;
	var sections = __source.split(regex);
	
	var result = [];
	for(var i = 0; i < sections.length; i += 3){
		result.push(sections[i]);
		if (api.__eval(sections[i+1])) {
			result.push(sections[i+2]);
		}
	}
	return result.join('');
}

function parseLinks(__source) {
	// break out links (links are inside double square brackets, i.e. [[link]] )
	// result will be an array in format [plain-text,whitespace,link, plain-text,whitespace,link, ...]
	regexSource = /(\s)?\[{2}(.*?)\]{2}/g;
	return __source.split(regexSource);
}

function parsePassage(__source) {
	//console.log('source: ',__source);
	var s;
	do{
		s = __source;
		__source=parseConditionals(s);
	}while(s !== __source);
	//console.log('conditioned source:',__source);
	__source = parseLinks(__source);
	//console.log('linked source:',__source);

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
			var link = __source[i].split(/(.*?)\|(.*)/);
			if (link.length === 1) {
				link[1] = 'this.goto("'+link[0]+'");';
			} else {
				link = link.slice(1,3);
			}
			words.push({
				text: link[0],
				link: link[1]
			});
		}
	}
	// clear out empty entries
	for(var i = words.length-1; i >= 0; --i){
		if(!words[i]){
			words.splice(i,1);
		}
	}
	//console.log('Parsed passage: ',words);
	return words;
}

// go through passage contents and convert to text objects
// and interactive elements
function passageToText(__passage, __maxWidth) {
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
	//console.log('Converted passage to text: ',passage);
	return passage;
}