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
	
	renderSprite.filterArea = new PIXI.Rectangle(0,0,size.x,size.y);

	renderSprite.filters = [screen_filter];

	window.onresize = onResize;
	onResize();

	bg = new PIXI.Sprite(PIXI.loader.resources.bg.texture);
	bg.width = size.x;
	bg.height = size.y;
	game.addChild(bg);

	PIXI.loader.resources.vid.data.loop = true;
	vidTex = PIXI.VideoBaseTexture.fromVideo(PIXI.loader.resources.vid.data);
	vidTex2 = new PIXI.Texture(vidTex);
	vid = new PIXI.Sprite(vidTex2);
	vid.filters = [greenScreen_filter];
	vid.width = size.x;
	vid.height = size.y;
	game.addChild(vid);

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



	// update input managers
	keys.update();
	gamepads.update();
}

function render(){
	screen_filter.uniforms["uTime"] = curTime/1000;
	greenScreen_filter.uniforms["uSpriteSize"] = [vid.width,vid.height];
	greenScreen_filter.uniforms["uBufferSize"] = [nextPowerOfTwo(vid.width),nextPowerOfTwo(vid.height)];
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