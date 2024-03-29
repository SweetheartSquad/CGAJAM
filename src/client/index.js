var startTime = 0;
var lastTime = 0;
var curTime = 0;

var game;
var resizeTimeout=null;

var size={x:1280,y:720};

var sounds=[];

var scaleMode = 1;
var scaleMultiplier = 1;


getFullscreenElement = function(){
	var f =
		document.fullscreenElement ||
		document.oFullscreenElement ||
		document.msFullscreenElement ||
		document.mozFullScreenElement ||
		document.webkitFullscreenElement;
	return f;
};
exitFullscreen = function(){
	var f = 
		document.exitFullscreen ||
		document.oExitFullScreen ||
		document.msExitFullScreen ||
		document.mozCancelFullScreen ||
		document.webkitExitFullscreen;
	return f.call(document);
};
requestFullscreen = function(__el){
	var f = 
		__el.requestFullscreen ||
		__el.oRequestFullscreen ||
		__el.msRequestFullscreen ||
		__el.mozRequestFullScreen ||
		__el.webkitRequestFullscreen;
	return f.call(__el);
};
toggleFullscreen = function(){
	if (renderer.view.toggleFullscreen) {
		if(getFullscreenElement()) {
			exitFullscreen();
		}else{
			requestFullscreen(display);
		}
		renderer.view.toggleFullscreen = false;
	}
};

ready(function(){
	try{
		var p = new Promise(function(__resolve, __reject){
			game = new PIXI.Container();
			__resolve();
		});
	}catch(e){
		document.body.innerHTML='<p>Unsupported Browser. Sorry :(</p>';
		throw 'Unsupported Browser: '+e;
	}

	// try to auto-focus and make sure the game can be focused with a click if run from an iframe
	window.focus();
	document.body.on('mousedown',function(){
		window.focus();
	});
	document.body.on('mouseup',toggleFullscreen);
	document.body.on('keyup',toggleFullscreen);

	window.requestAnimationFrame = 
		window.requestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame;

	document.exitFullscreen =
		document.exitFullscreen ||
		document.oExitFullScreen ||
		document.msExitFullScreen ||
		document.mozCancelFullScreen ||
		document.webkitExitFullscreen;


	// setup game
	startTime=Date.now();

	display = document.getElementById('display');

	// create renderer
	renderer = new PIXI.WebGLRenderer({
		width: size.x,
		height: size.y,
		antialias:false,
		transparent:false,
		resolution:1,
		roundPixels:true,
		clearBeforeRender:true,
		autoResize:false,
	});
	renderer.view.id = 'canvas';

    renderer.view.requestFullscreen = 
    	renderer.view.requestFullscreen ||
    	renderer.view.oRequestFullscreen ||
    	renderer.view.msRequestFullscreen ||
    	renderer.view.mozRequestFullScreen ||
    	renderer.view.webkitRequestFullscreen;
	
	renderer.backgroundColor = 0x000000;

	PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

	// add the canvas to the html document
	display.appendChild(renderer.view);

	font = {
		fontFamily: "font",
		fontSize: 24,
		lineHeight: 30,
		fill: "#FFFFFF",
		align: "left",
		textBaseline: "alphabetic"
	};


	sounds['bgm']=new Howl({
		urls:['assets/audio/venus march.wav'],
		autoplay:true,
		loop:true,
		volume:0
	});
	sounds['bgm'].fadeIn(1,3000);

	/*for(var i in CharacterTemplates){
		if(CharacterTemplates.hasOwnProperty(i)){
			sounds[CharacterTemplates[i].name] = {
				attack: new Howl({
					urls:['assets/audio/'+CharacterTemplates[i].name+'-attack.ogg'],
					autoplay:false,
					loop:false,
					volume:1
				}),
				hit: new Howl({
					urls:['assets/audio/'+CharacterTemplates[i].name+'-hit.ogg'],
					autoplay:false,
					loop:false,
					volume:1
				})
			};
		}
	}*/

	// create render texture
	renderTexture = PIXI.RenderTexture.create(size.x,size.y,PIXI.SCALE_MODES.NEAREST,1);
	 
	// create a sprite that uses the render texture
	renderSprite = new PIXI.Sprite(renderTexture, new PIXI.Rectangle(0,0,size.x,size.y));

	CustomFilter.prototype = Object.create(PIXI.Filter.prototype);
	CustomFilter.prototype.constructor = CustomFilter;

	var videos = [
		["evil",1],
		["cult",1],
		["chef",0]
	];

	var images = [
		'bedroom',
		'chair wall',
		'chairs',
		'chairs2',
		'courtyard esque',
		'dining room',
		'drawer',
		'garden',
		'garden2',
		'hallway',
		'hallway2',
		'kitchen',
		'kitchen2',
		'screen',
		'sitting room',
		'foyer',
		'foyer1',
		'foyer2',
		'space',
		'ship',
		'gate',
		'grounds',
		'estate',
		'garden3'
	];
	PIXI.loader
		.add('source','assets/source.strand')
		.add('cursor','assets/cursor.png')
		.add('pointer','assets/pointer.png')
		.add('vert','assets/passthrough.vert')
		.add('screen_shader','assets/screen_shader.frag')
		.add('greenScreen_shader','assets/greenScreen_shader.frag');


	for(var i = 0; i < images.length; ++i){
		PIXI.loader.add(images[i],'assets/img/'+images[i]+'.jpg');
	}
	for(var i = 0; i < videos.length; ++i){
		var v = videos[i];
		PIXI.loader.add(v[0],'assets/video/'+v[0]+'.mp4',{
			loadType: PIXI.loaders.Resource.LOAD_TYPE.VIDEO,
			metadata: {
				screenMode: v[1],
				layer: 1
			}
		});
	}

	PIXI.loader
		.on('progress', loadProgressHandler)
		.load(function(){
			game.removeChild(game.loadingText);
			game.loadingText.destroy();
			init();
		});
});


function CustomFilter(vertSource, fragSource){
	PIXI.Filter.call(this,
		// vertex shader
		vertSource,
		// fragment shader
		fragSource
	);
}


function loadProgressHandler(__loader, __resource){
	// called during loading
	//console.log('loading: ' + __resource.url);
	//console.log('progress: ' + __loader.progress+'%');

	_resize();
	if(!game.loadingText){
		var f = clone(font);
		f.align = 'center';
		f.fill = '#'+rgbToHex(255,255,85).toString(16)
		game.loadingText = new PIXI.Text('',f);
		game.addChild(game.loadingText);
	}
	game.loadingText.text = 'Loading...\n'+Math.floor(__loader.progress)+'%';
	game.loadingText.y = size.y/2 - game.loadingText.height/2;
	game.loadingText.x = size.x/2 - game.loadingText.width/2;

	renderer.render(game,null,true,false);

	
	for(var i in PIXI.loader.resources){
		if(PIXI.loader.resources.hasOwnProperty(i)){
			var resource = PIXI.loader.resources[i];
			if(resource.loadType === PIXI.loaders.Resource.LOAD_TYPE.VIDEO && resource.data && !resource.texture){
				resource.data.loop = true;
				resource.data.volume = 0;
				resource.data.muted = true;
				resource.data.autoplay = false;
				resource.data.preload = 'auto';
				resource.texture = PIXI.VideoBaseTexture.fromVideo(resource.data);
				resource.texture.mipmap = false;
			}
		}
	}
}


function _resize(){
	var w=display.offsetWidth;
	var h=display.offsetHeight;
	var ratio=size.x/size.y;

	
	if(w/h < ratio){
		h = Math.round(w/ratio);
	}else{
		w = Math.round(h*ratio);
	}
	
	var aw,ah;

	if(scaleMode==0){
		// largest multiple
		scaleMultiplier = 1;
		aw=size.x;
		ah=size.y;

		do{
			aw+=size.x;
			ah+=size.y;
			scaleMultiplier += 1;
		}while(aw <= w || ah <= h);

		scaleMultiplier -= 1;
		aw-=size.x;
		ah-=size.y;
	}else if(scaleMode==1){
		// stretch to fit
		aw=w;
		ah=h;
		scaleMultiplier = w/size.x;
	}else{
		// 1:1
		scaleMultiplier = 1;
		aw=size.x;
		ah=size.y;
	}

	renderer.view.style.width=aw+'px';
	renderer.view.style.height=ah+'px';
}

PIXI.zero=new PIXI.Point(0,0);