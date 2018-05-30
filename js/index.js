var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame;

var isApp = false;
var isMobile = false;

var game;

var app = {
    // Application Constructor
    initialize: function() {
		game = new Game();

        //Init Event Listeners
        this.bindEvents();
    },

    bindEvents: function() {
        window.addEventListener('DOMContentLoaded', this.onDeviceReady, false);
        document.addEventListener('deviceready', this.onDeviceReady, false);

        if(MobileAndTabletCheck()){
            window.addEventListener('touchmove', function(e) {
                // Prevent scrolling
                //e.preventDefault();
            }, false);

			isMobile = true;
            console.log("Mobile device detected");
        }
    },

    onDeviceReady: function() {
        //isApp = !((typeof device)=="undefined");

		console.log((isApp)?"Device Ready!":"DOM Loaded...");

		game.initStage();
		/*
        if(isApp){
            document.addEventListener("pause", function(){ //when app moves to background
                game.togglePause(true);
            }, false);
            document.addEventListener("resume", function(){ //when app moves back to background
                //this.togglePause(false);
            }, false);
        }
        else{
            window.addEventListener("blur", function(){ //when window is off-focus
                game.audio["mainMusic"].pause();
                //game.audio["mainMusic"].release();
                game.togglePause(true);
            }, false);
            window.addEventListener("focus", function(){ //when app window is in focus
                //game.togglePause(false);
            }, false);
        }
		*/
    }
};

var Game = function(){
	var self = this;

	this._gameStarted = false;
	this._jumpToStartGame = false;

	this.hwratio = 9/16; //most screens are of game resolution
	this.canvasWidth = 1600;
	this.canvasHeight = 900;

	this.controls = {
		"jump":{
			"keys":[32,38], //Space, Up-Arrow
			"callback":"heroJump"
		},
		"pause":{
			"keys":["P".charCodeAt(),27], //P, Esc
			"callback":"togglePause"
		},
		"muteMain":{
			"keys":["M".charCodeAt()], //M
			"callback":"toggleMuteMain"
		},
		"muteFX":{
			"keys":["M".charCodeAt()], //M
			"callback":"toggleMuteFX"
		}
	}

	this.hero = null;
	this.preventHeroJump = 0;

	this.defOptions = {
		"muteFX":false,
		"muteMain":false
	};

	this.score = 0;
	this.highscore = 0;

	this.scoreText;
	this.overSym;
	this.highscoreText;

	this.speedInc = 1.1;
	this.maxSpeed = 18;

	this._paused = false;
	this._musicMuted = false;
	this._FXMuted = false;

	this.startScreen;
	this.loadingBar;

    this.this.fadeObjects;
	this.fadeInTimer;

	this.animations = {
		"jumping":{
			"frames":[],
			"totalFrames":7
		}
	};

	this.sprites = {

	};

	this.audioLib = ["main_music","jump","bounce","die"];
	this.audioVol = [0.4,0.15,0.1 ,0.8];
	this.audio = {

	}

	this.iconNames = ["pause","play","music_on","music_off","fx_on","fx_off"];
	this.pauseButton;
	this.muteMusicButton;
	this.muteFXButton;

	this.fonts = {};
	this.totalFonts;
	this.totalFontsFailed = 0;
	this.totalFontsLoaded = 0;

	this.obstacles;
	this.obstacleTimer;
	this.obstacleSpawnTime = 1000; //in ms

	this.obstacleSections;
	this.obstacleSectionActive = [];
	this.nObstacleSections = 3;

	this.pauseTime;
	this.pauseTimer;
	this.pauseOverlay;

	this.initStage = function(){
		//CHECK MOBILE
		isMobile = MobileAndTabletCheck();

		//INIT RENDERER
		var rendererOptions = {
			width: this.canvasWidth,
			height: this.canvasHeight,
			antialias: false,
			transparent: false,
			resolution: window.devicePixelRatio,
			autoResize: true,
			backgroundColor: 0x90a4ae,
			//forceCanvas: isApp
		}

		renderer = PIXI.autoDetectRenderer(rendererOptions);

		//INIT STAGE AND RESIZE TO FIT SCREEN
		stage = new PIXI.Container();
		this.resizeCanvas();

		document.getElementById("canvas_container").appendChild(renderer.view);

		//ADD EVENT LISTENERS
		//NOTE: Reason for adding event listeners here instead of new game is that the event listeners cannot seem to be removed upon gameover, causing a bug where more than one event listeners are added upon gameover.

		window.addEventListener("resize", this.resizeCanvas.bind(this), false);
		window.addEventListener("keyup", this.keyEvent.bind(this), false);

		if(isApp){
			document.addEventListener("pause", this.togglePause.bind(this,true), false);
			//document.addEventListener("resume", this.togglePause.bind(this,false), false);
		}
		else{
			window.addEventListener("blur", this.togglePause.bind(this,true), false);
		}

		renderer.view.addEventListener((isMobile)?"touchend":"mouseup", this.heroJump.bind(this), false);

		//LOAD IMAGES, FONTS AND MUSIC
		this.loadFonts(); //(load fonts first to make sure start screen has proper fonts)
		//--> this.initPreload();
	}

	this.initPreload = function(){
		var i;

		//PRELOADING OF IMAGES INTO PIXI LOADER
		this.loader = new PIXI.loaders.Loader();
		this.loader.add("sprite_background","img/background.png");
		this.loader.add("sprite_spike","img/spike.png");

		for(i=0;i<this.iconNames.length;i++){
			this.loader.add("icon_"+this.iconNames[i].toString(),"img/icons/"+this.iconNames[i]+".png");
		}

		for(i=0;i<this.animations.jumping.totalFrames;i++){
			this.loader.add("sheep_"+i,"img/jumpingAnimation/"+i+".png");
		}

		//PRELOADING OF AUDIO
		for(i=0;i<this.audioLib.length;i++){
			this.loader.add("audio_"+this.audioLib[i],"audio/"+this.audioLib[i]+".mp3");
		}

		//LOADING BAR AND START SCREEN
		this.buildStartScreen();

		this.loader.on('progress', (loader,resource) => {
			this.loadingBar.progressText.text = Math.round(loader.progress)+"%";

			var _width = Math.round(loader.progress/100)*this.loadingBar.progressBar.maxWidth;
			this.loadingBar.progressBar.beginFill(0xcfd8dc)
				.drawRect(-this.loadingBar.progressBar.maxWidth/2,0,_width,this.loadingBar.progressBar.maxHeight)
			.endFill();

			//console.log('Progress: ' + loader.progress + '%');
			//console.log('Loading: ' + resource.name.split("_").join(" ").toUpperCase());
		});

		renderer.render(stage);

		this.loader.load((loader, resources) => {
		    //NOTE: "resources" is an object where the key is the name of the resource loaded and the value is the resource object.

			//GENERATE OVERLAYS
			//-PAUSE OVERLAY
			this.pauseOverlay = new PIXI.Container();

			var rect = new PIXI.Graphics();
			rect.beginFill(0x263238,0.7);
			rect.drawRect(0,0,this.canvasWidth,this.canvasHeight);
			rect.endFill();

			this.pauseOverlay.addChild(rect);

			var textOpt = {
				fontFamily: 'TimeBurnerBold',
				fill: "#cfd8dc",
				stroke: "#90a4ae",
				strokeThickness: 10,
				letterSpacing: 10,
				align: 'center'
			};

			var text = new PIXI.Text("PAUSED",Object.assign(textOpt,{fontSize:120}));
			text.anchor.set(0.5,0.5);
			text.alpha = 0.75;
			text.x = this.canvasWidth/2;
			text.y = this.canvasHeight/2-30;

			this.pauseOverlay.addChild(text);

			var line = new PIXI.Graphics();
			line.alpha = 0.85;
			line.position.set(this.canvasWidth/2-243,this.canvasHeight/2+35);
			line.lineStyle(1,0xeceff1).moveTo(0,0).lineTo(468,0);
			this.pauseOverlay.addChild(line);

			text2 = new PIXI.Text(((isMobile)?"Tap":"Click")+" to continue ",
			Object.assign(textOpt,{
				fontFamily:'TimeBurner',
				fontSize:40,
				strokeThickness:1,
				letterSpacing: 8
			}));
			text2.anchor.set(0.5,0.5);
			text2.alpha = 0.75;
			text2.x = this.canvasWidth/2-8;
			text2.y = this.canvasHeight/2+70;

			this.pauseOverlay.addChild(text2);

			//-Add Event Listener
			this.pauseOverlay.on((isMobile)?"touchend":"mouseup",this.togglePause.bind(this,false));

			//SPRITES
			//-Background
		    this.sprites.background = new PIXI.extras.TilingSprite(
				resources["sprite_background"].texture,
				this.canvasWidth+1, //FIX: fixes weird pixel bug
				this.canvasHeight
			);
			//this.sprites.background.tint = 0xeceff1;

			this.sprites.spike = new PIXI.Sprite(resources["sprite_spike"].texture);

			stage.addChild(this.sprites.background);

			//-ICONS/BUTTONS
			var nm;
			this.sprites.icons = {};
			for(i=0;i<this.iconNames.length;i++){
				nm = this.iconNames[i].toString();
				this.sprites.icons[nm] = new PIXI.Sprite(resources["icon_"+nm].texture);
				this.sprites.icons[nm].anchor.set(0.5);
				this.sprites.icons[nm].scale.set(0.8,0.8);
				this.sprites.icons[nm].alpha = 0;
				this.sprites.icons[nm].tint = 0x90a4ae;
				this.sprites.icons[nm].name = nm;
			}

			//--Pause Button
			this.pauseButton = new PIXI.Container();
			this.pauseButton.interactive = true;
			this.pauseButton.buttonMode = true;

			this.pauseButton.on((isMobile)?"touchend":"mouseup",this.togglePause.bind(this));

			this.pauseButton.position.set(this.canvasWidth-60,50);

			this.pauseButton.addChild(this.sprites.icons["pause"]);
			this.pauseButton.addChild(this.sprites.icons["play"]);
			this.pauseButton.getChildByName("pause").alpha = 1;

			//--Mute Music Button
			this.muteMusicButton = new PIXI.Container();
			this.muteMusicButton.interactive = true;
			this.muteMusicButton.buttonMode = true;

			this.muteMusicButton.on((isMobile)?"touchend":"mouseup",this.toggleMuteMain.bind(this));

			this.muteMusicButton.position.set(this.canvasWidth-145,50);

			this.muteMusicButton.addChild(this.sprites.icons["music_on"]);
			this.muteMusicButton.addChild(this.sprites.icons["music_off"]);
			this.muteMusicButton.getChildByName("music_on").alpha = 1;

			//--Text
			textOpt = {
				fontFamily: 'TimeBurnerBold',
				fill: "0x90a4ae",
				letterSpacing: 5,
				align: 'center',
				fontSize: 20
			};

			text = new PIXI.Text("MUSIC",textOpt);
			text.anchor.set(0.5,0.5);
			text.alpha = 1;
			text.y = 55;
			this.muteMusicButton.addChild(text);

			//--Mute FX Button
			this.muteFXButton = new PIXI.Container();
			this.muteFXButton.interactive = true;
			this.muteFXButton.buttonMode = true;

			this.muteFXButton.on((isMobile)?"touchend":"mouseup",this.toggleMuteFX.bind(this));

			this.muteFXButton.position.set(this.canvasWidth-235,50);

			this.muteFXButton.addChild(this.sprites.icons["fx_on"]);
			this.muteFXButton.addChild(this.sprites.icons["fx_off"]);
			this.muteFXButton.getChildByName("fx_on").alpha = 1;

			//--Text
			text = new PIXI.Text("FX",textOpt);
			text.anchor.set(0.5,0.5);
			text.alpha = 1;
			text.y = 55;
			this.muteFXButton.addChild(text);

			//ANIMATIONS
			for (i=0;i<this.animations.jumping.totalFrames;i++) {
				this.animations.jumping.frames.push(resources["sheep_"+i].texture);
			}
			this.animations.jumping.frames.push(resources["sheep_0"].texture);

			//-HERO
			this.hero = new PIXI.extras.AnimatedSprite(this.animations.jumping.frames);
			this.hero.animationSpeed = 0.15;
			this.hero.loop = false;
			this.hero.anchor.set(0.5);
			this.hero.scale.set(0.35,0.35);

			//LOAD AUDIO
			for(i=0;i<this.audioLib.length;i++){
				nm = this.audioLib[i];
				this.audio[nm] = resources["audio_"+nm].sound;
				this.audio[nm].volume = this.audioVol[i];
				this.audio[nm].defaultVolume = this.audioVol[i];
			}
			this.audio["main_music"].play({loop:true});
			this.audio["main_music"].loop = true;

			this.allAssetsLoaded();
		});
	};

	this.loadFonts = function(){
		//INITIALIZE FONTS USING FontFaceObserver.JS
		this.fonts["TimeBurner"] = new FontFaceObserver("TimeBurner");
		this.fonts["TimeBurnerBold"] = new FontFaceObserver("TimeBurnerBold");

		this.totalFonts = Object.keys(this.fonts).length;
		this.totalFontsLoaded = 0;
		this.totalFontsFailed = 0;

		var i;
		for(i in this.fonts){
			this.fonts[i].load().then(
				this.checkAllFontsLoaded.bind(this,true),
				this.checkAllFontsLoaded.bind(this,false)
			);
		}
	};

	this.checkAllFontsLoaded = function(success){
		if(success) this.totalFontsLoaded++;
		else this.totalFontsFailed++;

		if( (this.totalFontsLoaded+this.totalFontsFailed)>=this.totalFonts){
			console.log(this.totalFontsLoaded+"/"+this.totalFonts+" Fonts Loaded...");

			this.initPreload();
		}
	};

	this.buildStartScreen = function(){
		this.startScreen = new PIXI.Container();

		var bg_basic = new PIXI.Graphics();
		//-Main Bg
		bg_basic.beginFill(0x37474f);
		bg_basic.drawRect(0,0,this.canvasWidth,this.canvasHeight);
		bg_basic.endFill();

		var rect = new PIXI.Graphics();
		//-Sides
		rect.beginFill(0xcfd8dc,0.9);
		rect.drawRect(0,this.canvasHeight/2-150,500,140);
		rect.drawRect(1100,this.canvasHeight/2-150,500,140);
		rect.endFill();

		//-Border for sides
		rect.lineStyle(8,0x90a4ae)
			.moveTo(0,this.canvasHeight/2-150).lineTo(500,this.canvasHeight/2-150)
			.moveTo(0,this.canvasHeight/2-10).lineTo(500,this.canvasHeight/2-10)
			.moveTo(1100,this.canvasHeight/2-150).lineTo(1600,this.canvasHeight/2-150)
			.moveTo(1100,this.canvasHeight/2-10).lineTo(1600,this.canvasHeight/2-10);

		this.startScreen.addChild(bg_basic);

		var textOpt = {
			fontFamily: 'TimeBurnerBold',
			fill: "#cfd8dc",
			stroke: "#90a4ae",
			strokeThickness: 10,
			letterSpacing: 10,
			align: 'center',
			fontSize:120
		};

		var text = new PIXI.Text("SOARING",Object.assign(textOpt));
		text.anchor.set(0.5,0.5);
		text.x = this.canvasWidth/2;
		text.y = this.canvasHeight/2-150;

		this.startScreen.addChild(text);

		text2 = new PIXI.Text("SHEEP",Object.assign(textOpt));
		text2.anchor.set(0.5,0.5);
		text2.x = this.canvasWidth/2+73;
		text2.y = this.canvasHeight/2-20;

		var _offset = 70;
		rect.y -= _offset; text.y -= _offset; text2.y -= _offset;

		this.startScreen.addChild(rect);
		this.startScreen.addChild(text);
		this.startScreen.addChild(text2);

		//-Actual loader bar
		this.loadingBar = new PIXI.Container();

		this.loadingBar.progressBar = new PIXI.Graphics();
		this.loadingBar.progressBar.maxWidth = 700;
		this.loadingBar.progressBar.maxHeight = 25;
		this.loadingBar.progressBar.strokeWidth = 6;

		//--Outline
		//-(Actual Bar drawn in progress handler)
		this.loadingBar.progressBar.lineStyle(this.loadingBar.progressBar.strokeWidth,0x90a4ae)
			.moveTo(-this.loadingBar.progressBar.maxWidth/2,0)
			.lineTo(this.loadingBar.progressBar.maxWidth/2,0)
			.lineTo(this.loadingBar.progressBar.maxWidth/2,this.loadingBar.progressBar.maxHeight)
			.lineTo(-this.loadingBar.progressBar.maxWidth/2,this.loadingBar.progressBar.maxHeight)
			.lineTo(-this.loadingBar.progressBar.maxWidth/2,-this.loadingBar.progressBar.strokeWidth/2);

		textOpt = {
			fontFamily: 'TimeBurner',
			fill: "#cfd8dc",
			letterSpacing: 5,
			align: 'center',
			fontSize: 40
		};

		this.loadingBar.progressText = new PIXI.Text("0%",textOpt);
		this.loadingBar.progressText.anchor.set(0.5,0.5);
		this.loadingBar.progressText.y = this.loadingBar.progressBar.maxHeight/2+this.loadingBar.progressBar.strokeWidth/2;
		this.loadingBar.progressText.x = this.loadingBar.progressBar.width/2+80;

		this.loadingBar.position.set(this.canvasWidth/2-50,this.canvasHeight*(7/8));

		this.loadingBar.addChild(this.loadingBar.progressBar);
		this.loadingBar.addChild(this.loadingBar.progressText);

		this.loadingBar.name = "loader_bar";
		this.startScreen.addChild(this.loadingBar);

		stage.addChild(this.startScreen);
	}

	this.allAssetsLoaded = function(){
			var i;

			console.log("All assets loaded.");
			console.log("Ready to Start Game!");

			this.sprites.background.alpha = 0;

            this.postLoadedStartScreen = {};

			//Sheep
			sheep = new PIXI.Sprite(this.animations.jumping.frames[0]);
			sheep.anchor.set(0.5,0.5);
			sheep.scale.set(0.35,0.35);
			sheep.rotation = -Math.PI/40;
			sheep.position.set(this.canvasWidth/2-200,this.canvasHeight/2-90);

			/*
			var lightbulb = new PIXI.Graphics();
			lightbulb.beginFill(0xfff8e1,0.05);
			lightbulb.drawCircle(0,0,250);
			lightbulb.endFill();
			lightbulb.x=-10;
			sheep.addChild(lightbulb);
			//*/

			sheep.name = "sheep";

			//Speech bubble
			var speech_bubble = new PIXI.Container();
			speech_bubble.position.set(this.canvasWidth/2,this.canvasHeight*0.66);

			//-Bubble
			var bubble = new PIXI.Graphics();
			bubble._width = 600+50;
			bubble._height = 250+30;
			bubble._radius = 40;
			bubble.beginFill(0xcfd8dc)
				.drawRoundedRect(-bubble._width/2,-bubble._height/2,bubble._width,bubble._height,bubble._radius)
				.drawPolygon( new PIXI.Point(-bubble._width/2+180,-bubble._height/2-60) , new PIXI.Point(-125,-bubble._height/2), new PIXI.Point(-95,-bubble._height/2) )
			.endFill();

			//-Text
			var textOpt = {
				fontFamily: 'TimeBurner',
				fill: "#607d8b",
				letterSpacing: 2,
				align: 'center',
				fontSize:38
			};

			var text = new PIXI.Text("Avoid the falling spikes!\nScore by bouncing off the sides.\n"+((isMobile)?"Tap":"Click/[SPACE]")+" to JUMP\n\n- JUMP to Start! -",textOpt);
			text.anchor.set(0.5,0.5);

			speech_bubble.addChild(bubble);
			speech_bubble.addChild(text);

			speech_bubble.name = "speech_bubble";

			//Re-position mute buttons
			this.startScreen.buttonsOffset = 70;

			this.muteMusicButton.x += this.startScreen.buttonsOffset;
			this.muteFXButton.x += this.startScreen.buttonsOffset;

			this.loadOptions();

			//Fade In Animation
			this.fadeObjects = [sheep, this.muteMusicButton, this.muteFXButton, speech_bubble];

			for(i=0;i<this.fadeObjects.length;i++){
				this.fadeObjects[i].alpha = 0;
				stage.addChild(this.fadeObjects[i]);
			}

            var _fadeTimeInc = 10; //ms
            this.fadeInTimer = new Date().getTime();

            //Begin fade in via requestAnimationFrame.
            //WARNING: DO NOT USE SET INTERVAL
            //--After animation is complete, user can now "jump" to start the game.
            requestAnimationFrame(this.fadeInAnimation.bind(this,_fadeTimeInc));
	}

    this.fadeInAnimation = function(timeInc){
        var t = new Date().getTime();
        if(t-this.fadeInTimer>=timeInc){
            this.fadeInTimer = t;
        }

        var _fadeInc = 0.025;

        for(i=0;i<this.fadeObjects.length;i++){
            this.fadeObjects[i].alpha += _fadeInc;
        }

        renderer.render(stage);

        //Once fade in animation is complete, allow user to "jump" to start game
        if(sheep.alpha>=1){
            sheep.alpha=1;
            this.muteFXButton.alpha=1;
            this.muteMusicButton.alpha=1;

            this.startScreen.interactive = true;
            this.startScreen.buttonMode = true;

            this._jumpToStartGame = true;
            renderer.render(stage);

            console.log("Fade in animation complete");

            return;
        }
        requestAnimationFrame(this.fadeInAnimation.bind(this));
    }

	this.startGame = function(){
		console.log("Starting Game!");

        if(this._gameStarted) return;

		this._jumpToStartGame = false;
		this._gameStarted = true;

		stage.removeChild(this.startScreen);

		this.sprites.background.alpha = 1;
		stage.removeChild(this.muteMusicButton);
		stage.removeChild(this.muteFXButton);

		stage.removeChild(stage.getChildByName("sheep"));
		stage.removeChild(stage.getChildByName("speech_bubble"));

		this.muteMusicButton.x -= this.startScreen.buttonsOffset;
		this.muteFXButton.x -= this.startScreen.buttonsOffset;

        renderer.render(stage);

		this.newGame();
	}

	this.newGame = function(){
        console.log("New Game!");

		renderer.view.focus();

		//BG
		this.sprites.background.scrollingSpeed = 0.5;

		//LOAD SCORES AND OPTIONS
		this.score = 0;

		var textOpt = {
			fontFamily: 'TimeBurnerBold',
			fill: "#cfd8e0",
			stroke: "#b0becf",
			strokeThickness: 10,
			letterSpacing: 10,
			align: 'center'
		};

		//-Score text
		this.scoreText =  new PIXI.Text(this.score.toString(),Object.assign(textOpt,{fontSize:120}));

		this.scoreText.alpha = 0.7;
		this.scoreText.anchor.set(0.5,0.5);
		this.scoreText.x = this.canvasWidth/2;
		this.scoreText.y = this.canvasHeight/2;

		stage.addChild(this.scoreText);

		//-Highscore text
		this.highscoreText = new PIXI.Text(this.highscore.toString(),Object.assign(textOpt,{fontSize:40}));

		this.highscoreText.alpha = 0.7;
		this.highscoreText.anchor.set(0.5,0.5);
		this.highscoreText.x = this.canvasWidth/2+89;
		this.highscoreText.y = this.canvasHeight/2+70;
		stage.addChild(this.highscoreText);

		//-"/"-symbol
		this.overSym = new PIXI.Text("/",Object.assign(textOpt,{fontSize:50}));

		this.overSym.alpha = 0.7;
		this.overSym.anchor.set(0.5,0.5);
		this.overSym.x = this.canvasWidth/2+49;
		this.overSym.y = this.canvasHeight/2+50;
		stage.addChild(this.overSym);

		//CREATE OBSTACLE CONTAINER AND TIMER
		this.obstacles = new PIXI.Container();
		var i;
		for(i=0;i<=this.nObstacleSections;i++){
			this.obstacleSectionActive[i] = false;
		}

		this.showObstacleSections();
		stage.addChild(this.obstacles);

		//HERO INITIALIZE
		this.hero.x = this.canvasWidth/2;
		this.hero.y = this.canvasHeight/2;
		this.hero.scale.x = Math.abs(this.hero.scale.x);

		this.hero.vx = 8;
		this.hero.ax = 0;
		this.hero.vy = 0;
		this.hero.ay = 0.10;
		this.hero.jumpStrength = 4;

		this.preventHeroJump = 0;

		stage.addChild(this.hero);

		//ADD PAUSE OVERLAY TO STAGE
		//..GRAPHICS FOR PAUSE OVERLAY IS DONE IN INITIALISATION FOR PERFORMANCE
		//..ADDING DONE HERE FOR Z-INDEX
		this.pauseOverlay.alpha = 0;
		stage.addChild(this.pauseOverlay);

		//ADD BUTTONS
		//..GRAPHICS FOR BUTTONS IS DONE IN INITIALISATION FOR PERFORMANCE
		//..ADDING DONE HERE FOR Z-INDEX
		stage.addChild(this.pauseButton);
		stage.addChild(this.muteMusicButton);
		stage.addChild(this.muteFXButton);

		//START UPDATE LOOP
		this._paused = false;

			//TIMERS
			this.pauseTime = 0;
			this.obstacleTimer = new Date().getTime();

		requestAnimationFrame(this.update.bind(this));
	};

	this.keyEvent = function(e){
		var i,j;
		for(i in this.controls){
			var keyArr = this.controls[i]["keys"];
			for(j=0;j<keyArr.length;j++){
				if(e.keyCode == keyArr[j]){
					this[this.controls[i]["callback"]]();
					break;
				}
			}
		}
	};

	this.heroJump = function(event){
		if(this.preventHeroJump){
			this.preventHeroJump--; //makes sure that all false clicks which have been triggered are accounted for
            console.log("False click prevented: "+this.preventHeroJump);
			return;
		}

		if(this._jumpToStartGame){
			this._jumpToStartGame = false;

            console.log("User started game by clicking. "+this._jumpToStartGame);
			this.startGame();
            return;
		}

		if(!this._gameStarted) return;

		if(this._paused) return;

		this.audio["jump"].play();

		this.hero.gotoAndPlay(1);
		this.hero.vy = -this.hero.jumpStrength;
	};

	this.update = function(){
		//TODO: Add ""+1" and coins

		var i,j;

		if(this._paused || !this._gameStarted) return;

		//BACKGROUND MOVEMENT
		this.sprites.background.tilePosition.x -= this.sprites.background.scrollingSpeed;

		//HERO MOVEMENT
		this.hero.vx += this.hero.ax;
		this.hero.vy += this.hero.ay;

		this.hero.y += this.hero.vy;
		this.hero.x += this.hero.vx;

		//OBSTACLE MOVEMENT
		for(i=0;i<this.obstacles.children.length;i++){
			var obs = this.obstacles.children[i];

			//Check for hero and obstacle hitTest
			if(this.hitTest(this.hero,obs,10,10)){
				this.gameover();
				return;
			}

			obs.vx += obs.ax;
			obs.vy += obs.ay;

			obs.y += obs.vy;
			obs.x += obs.vx;

			if(obs.y>=this.canvasHeight+obs.height){
				this.obstacles.removeChild(obs);
				this.obstacleSectionActive[obs.section] = false;
			}
		};

		//HERO AND OBSTACLE CHECKS
		//Check for hero x-direction bounds, and bounce off wall
		if(this.hero.x<=this.hero.width/2 || this.hero.x>=(this.canvasWidth-this.hero.width/2)){
			this.hero.vx*=-this.speedInc;
			this.hero.vx = Math.min(this.hero.vx,this.maxSpeed);

			this.hero.scale.x *= -1;
			this.sprites.background.scrollingSpeed *= -1;

			this.incScore();
		};

		this.hero.leeway = 50;

		//Check for hero y-direction bounds, and gameover if necessary
		if(this.hero.y<=this.hero.height/2-this.hero.leeway || this.hero.y>=(this.canvasHeight-this.hero.height/2+this.hero.leeway)){
			this.gameover();
			return;
		}

		//TIMERS
			var t=new Date().getTime();
			//OBSTACLE SPAWN
			if(t-this.obstacleTimer>=this.obstacleSpawnTime+this.pauseTime){
				this.spawnObstacle();
			}

		//RENDER AND UPDATE
		renderer.render(stage);

		requestAnimationFrame(this.update.bind(this));
	};

	this.incScore = function(){
		this.score++;
		this.scoreText.text = this.score;

		this.saveOptions();
		this.highscoreText.text = this.highscore;

		this.audio["bounce"].play();
	}

	this.showObstacleSections = function(){
		//Draw opacity rectangle to show where the obstacles will fall from
		this.obstacleSections = new PIXI.Container();

		var i;
		var tempSprite = new PIXI.Sprite(this.sprites.spike.texture);
		tempSprite.scale.set(0.2,0.2);
		var padd = 5;
		var obsSecWidth = tempSprite.width;
		var startX, endX;

		for(i=1;i<=this.nObstacleSections;i++){
			var rect = new PIXI.Graphics();
			rect.beginFill(0xd3d8dc,0.3);
			startX = i*(this.canvasWidth/(this.nObstacleSections+1))-obsSecWidth/2-padd/2;

			rect.drawRect(startX,0,obsSecWidth+padd,this.canvasHeight);
			rect.endFill();

			this.obstacleSections.addChild(rect);
		}

		stage.addChild(this.obstacleSections);
	}

	this.spawnObstacle = function(){
		var i;
		var obs = new PIXI.Sprite(this.sprites.spike.texture);

		obs.anchor.set(0.5);
		obs.scale.set(0.2,-0.2);

		//Ensure obstacle does not appear twice in the section at one time.
		var hasEmptySection = false;
		for(i=0;i<this.nObstacleSections;i++){
			if(!this.obstacleSectionActive[i]){
				hasEmptySection = true;
				break;
			}
		}
		if(!hasEmptySection) return;

		//RESET TIMERS
		this.pauseTime = 0;
		this.obstacleTimer = new Date().getTime();

		var section;
		var sectionFound = false;
		for(i=0;i<10;i++){ //prevent infinite loop
			section = getRandomInt(1,this.nObstacleSections);
			if(!this.obstacleSectionActive[section]){
				sectionFound = true;
				break;
			}
		}
		if(!sectionFound) return;

		obs.section = section;
		this.obstacleSectionActive[section] = true;

		var startX = section*(this.canvasWidth/(this.nObstacleSections+1));
		var startY = obs.height/2;

		obs.x = startX;
		obs.y = startY;

		obs.vx = 0;
		obs.vy = 0;
		obs.ax = 0;
		obs.ay = Math.random()*0.15+0.03;

		this.obstacles.addChild(obs);
	};

	this.toggleMuteMain = function(forcedVal){
		if(typeof forcedVal == "object"){
			if(forcedVal.type=="mouseup" || forcedVal.type=="touchend"){
				this.preventHeroJump++;
			}
		}

		if(typeof forcedVal == "boolean"){
			if(this._musicMuted == forcedVal) return;

			this._musicMuted = !forcedVal;
		}

		if(this._musicMuted){
			this.muteMusicButton.getChildByName("music_off").alpha=0;
			this.muteMusicButton.getChildByName("music_on").alpha=1;
			renderer.render(stage);

			this.audio["main_music"].play();

			this._musicMuted = false;
		}
		else{
			this.muteMusicButton.getChildByName("music_off").alpha=1;
			this.muteMusicButton.getChildByName("music_on").alpha=0;
			renderer.render(stage);

			this.audio["main_music"].pause();

			this._musicMuted = true;
		}

		this.saveOptions("muteMain");
		console.log("BG Music "+((this._musicMuted)?"Muted":"Playing"));
	};

	this.toggleMuteFX = function(forcedVal){
		var i,nm;

		if(typeof forcedVal == "object"){
			if(forcedVal.type=="mouseup" || forcedVal.type=="touchend"){
				this.preventHeroJump++;
			}
		}

		if(typeof forcedVal == "boolean"){
			if(this._FXMuted == forcedVal) return;

			this._FXMuted = !forcedVal;
		}

		if(this._FXMuted){
			this.muteFXButton.getChildByName("fx_off").alpha=0;
			this.muteFXButton.getChildByName("fx_on").alpha=1;
			renderer.render(stage);

			for(i=0;i<this.audioLib.length;i++){
				nm = this.audioLib[i];
				if(nm == "main_music") continue;

				this.audio[nm].volume = this.audio[nm].defaultVolume;
			}

			this._FXMuted = false;
		}
		else{
			this.muteFXButton.getChildByName("fx_off").alpha=1;
			this.muteFXButton.getChildByName("fx_on").alpha=0;
			renderer.render(stage);

			for(i=0;i<this.audioLib.length;i++){
				nm = this.audioLib[i];
				if(nm == "main_music") continue;

				this.audio[nm].volume = 0;
			}

			this._FXMuted = true;
		}

		this.saveOptions("muteFX");
		console.log("BG Music "+((this._FXMuted)?"Muted":"Playing"));
	};

	this.togglePause = function(forcedVal,event){
		if(!this._gameStarted) return;

		if(typeof event == "object" || typeof forcedVal == "object"){
			e = (typeof event == "object")?event:forcedVal; //sometimes `forcedVal` is the `event`
			if(e.type=="mouseup" || e.type=="touchend"){
				this.preventHeroJump++;
			}
		}

		if(typeof forcedVal == "boolean"){
			if(this._paused == forcedVal) return;

			this._paused = !forcedVal;
		}

		if(this._paused){
			this.pauseOverlay.alpha = 0;
			this.pauseOverlay.interactive = false;
			this.pauseOverlay.buttonMode = false;

			this.pauseButton.getChildByName("pause").alpha=1;
			this.pauseButton.getChildByName("play").alpha=0;

			this.pauseTime += (new Date().getTime())-this.pauseTimer;
			this._paused = false;

			requestAnimationFrame(this.update.bind(this));
		}
		else{
			this.pauseOverlay.alpha = 1;
			this.pauseOverlay.interactive = true;
			this.pauseOverlay.buttonMode = true;

			this.pauseButton.getChildByName("pause").alpha=0;
			this.pauseButton.getChildByName("play").alpha=1;

			renderer.render(stage);

			this.pauseTimer = new Date().getTime();
			this._paused = true;
		}

		console.log("Game "+((this._paused)?"Paused":"Resumed"));
	};

	this.gameover = function(){
		this._paused = true;
		this.audio["die"].play();

		console.log("---------------");
		console.log("GAME OVER!");
		console.log("Score: "+this.score);
		console.log("Highscore: "+this.highscore);
		console.log("---------------");

		//REMOVE ELEMENTS
		stage.removeChild(this.hero);
		stage.removeChild(this.obstacles);
		stage.removeChild(this.obstacleSections);
		stage.removeChild(this.scoreText);
		stage.removeChild(this.highscoreText);
		stage.removeChild(this.overSym);
		stage.removeChild(this.pauseOverlay);

		//RESTART GAME
		this.newGame();
	};

	this.loadOptions = function(){
		if(window.localStorage){
			if(window.localStorage["muteFX"] != null){
				this.highscore = window.localStorage["highscore"];

				this.toggleMuteFX(parseBoolean(window.localStorage["muteFX"]));
				this.toggleMuteMain(parseBoolean(window.localStorage["muteMain"]));
			}
			else{
				this.highscore = 0;
				this.toggleMuteFX(parseBoolean(this.defOptions["muteFX"]));
				this.toggleMuteMain(parseBoolean(this.defOptions["muteMain"]));
			}
		}
		else{
			console.log("WARNING: Browser does not support localStorage! Highscores and options will not be saved.");
			return false;
		}
	};

	this.saveOptions = function(opt){
		if(opt==null || typeof opt=="undefined"){
			opt = "all";
		}

		if(window.localStorage){
			this.highscore = Math.max(this.score,this.highscore);

			if(opt=="all" || opt=="score") window.localStorage["highscore"] = this.highscore;

			if(opt=="all" || opt=="muteFX") window.localStorage["muteFX"] = this._FXMuted;
			if(opt=="all" || opt=="muteMain") window.localStorage["muteMain"] = this._musicMuted;
		}
		else{
			console.log("Browser does not support localStorage!");
			return false;
		}
	};

	this.hitTest = function(obj1, obj2, leewayX, leewayY){
		//Ensure both objects anchor points are centered
		var an1 = obj1.anchor;
		var an2 = obj2.anchor;

		obj1.anchor.set(0.5); obj2.anchor.set(0.5);

		if(Math.abs(obj1.x-obj2.x)<=(obj1.width+obj2.width-leewayX)/2 && Math.abs(obj1.y-obj2.y)<=(obj1.height+obj2.height-leewayY)/2){
			//obj1.anchor = an1; obj2.anchor = an2;
			return true;
		}
		else{
			//obj1.anchor = an1; obj2.anchor = an2;
			return false;
		}
	};

	this.resizeCanvas = function(){
		// Determine which screen dimension is most constrained
		this.ratio = Math.min(
			window.innerWidth/this.canvasWidth,
			window.innerHeight/this.canvasHeight
		);

		// Scale the view appropriately to fill that dimension
		stage.scale.x =	this.ratio;
		stage.scale.y = this.ratio;

		// Update the renderer dimensions
		//this.canvasWidth *= this.ratio;
		//this.canvasHeight *= this.ratio;

		renderer.resize(
			Math.ceil(this.canvasWidth * this.ratio),
			Math.ceil(this.canvasHeight * this.ratio)
		);

		renderer.render(stage);
	};
}

//*--------UNIVERSAL FUNCTIONS--------*//
function MobileCheck() {
	if(isApp) return true;

	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
};

function MobileAndTabletCheck() {
	if(isApp) return true;

	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
};

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function parseBoolean(str){
	return (str.toString().toLowerCase() == "true");
}

//INITIALIZE APP
app.initialize();
