// -------------------------------------------------------------

// "RODENT RACE"
// An HTML5/Canvas/jQuery retro arcade game
// By Gary Smith (http://garysmith.ca)
// Un-minified Version
// November 2011

// USAGE: You are free to learn what you can from
// this code and reuse portions in your own work. 
// But if you are reusing or adapting the vast
// majority of this code intact you must give me 
// credit and a link back to http://garysmith.ca

// -------------------------------------------------------------
// Initialize the game state "constants"
var NEW_GAME = 0; 
var PLAYING = 1; 
var GAME_PAUSED = 2; 
var NEXT_LEVEL = 3; 
var PLAYER_DEAD = 4;
var GAME_OVER = 5; 

var state=NEW_GAME;

// -------------------------------------------------------------
// Initialize global variables (yes, way too many...)

var canvas=$("#game")[0]; // pointer to canvas element
var context; // pointer to canvas context
var ticker; // pointer to timeout timer
var tickSpeed=100; // milliseconds per tick
var tileWidth=30; // pixel width of a game map tile
var tileHeight=30; // pixel height of a game map tile
var canvasActualWidth=$("#game").css("width").replace("px",""); // width of canvas in pixels
var canvasActualHeight=$("#game").css("height").replace("px",""); // height of canvas in pixels
var originalLevelXML=''; // string containing XML read from external file
var horizMapOffset=-5; // left offset required to center 330px wide map on 320px canvas

// image and audio loading and tracking
var images=[]; //  pointers to all loaded images
var sounds=[]; //  pointers to all loaded sounds
var readySounds=[]; // flags to indicate when sounds are ready to play
var soundLoops=[]; // pointers to timeouts managing looped audio
var imagesCount=0; // total number of images to load
var imagesLoaded=0; // number of images loaded so far
var songPlaying=false; // flag to check if background song is playing
var enableSound=false; // flag to determine is sound is supported (based on device)

// initial gameplay values
var score=0; // current score
var lives=3; // current lives remaining
var currLevel=1; // current level
var levelWraps=1; // number of times player has completed all levels and wrapped back to beginning

// player controls
var pendingKeypress=false; // if waiting for player to reach full tile before moving according to a keypress
var pendingKeycode=''; // key code of pending keypress
var pendingClick=false; // if waiting for player to reach full tile before moving according to a touch event
var pendingX=0; // horizontal position of pending touch event
var pendingY=0; // vertical position of pending touch event

// player and enemy positioning
var playerX=0; // current player horizontal position in pixels
var playerY=0; // current player vertical position in pixels
var direction="none"; // current direction player is moving/facing
var prevDirection="none"; // previous direction player was moving/facing
var lastRenderedDirection="right"; // last drawn direction player was moving/facing
var playerStepSize=15; // pixels to move player each timeout tick 
var enemyStepSize=10; // pixels to move enemy each timeout tick

// level data
var levels=[];
var totalLevels; // the total number of levels in the game
var newLifeHeart=[];  // track position of "new life" heart on current level, if any 

// player and enemy image sprite horizontal coords (30x30 frames)
var sprite=[];
sprite["up"]=0;
sprite["right"]=30;
sprite["down"]=60;
sprite["left"]=90;
sprite["none"]=-1;

// pointer to current level background image
var currLevelImage=new Image();

// current frame of death animation sequence
var deathAnimationFrame=0; 

// track if user is on a mobile device
var isMobile=navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);

// -------------------------------------------------------------
// On page ready, init the canvas and call image and sound loaders
$(document).ready(function() {
	context=canvas.getContext("2d");
    // html5 audio support is pretty unreliable on these mobile devices; 
    // let's avoid the issue entirely and disable all sound for this little game
    if (isMobile) {
        enableSound=false;   
    } else {
        enableSound=true;        
	    loadAudio( [["sound-intro",0.4,true],
                    ["sound-crunch",1.0,false],
                    ["sound-dead",0.8,false],
                    ["sound-squeak",0.9,false],
                    ["sound-trumpet",0.6,false],
                    ["sound-gameover",1.0,false]] );
    }
    loadImages(["title.jpg","panel.jpg","rules.jpg","joystick-normal.png","unlocked.png", "heart.png",
                "cheese.png","death.png","player.png","enemy.png","get-ready.png","game-over.png"]);
});	

// -------------------------------------------------------------
// Load external image resources and begin polling
// for completion of all image loads
function loadImages(toLoad) {

	imagesCount=toLoad.length;
	
	// create image objects and store them in an array
	// indexed by image file basename
	for (var i=0; i<toLoad.length; i++) {
		var imageIndex=toLoad[i].split(".")[0]; // basename
		images[imageIndex]=new Image();
		images[imageIndex].src="images/"+toLoad[i];
		images[imageIndex].onload=function() {
			imagesLoaded++;	
		}
	}

	setTimeout(checkIfImagesLoaded,50); // poll for load completion
	
}

// -------------------------------------------------------------
// Load external audio.  Currently there is no reliable way to
// check on audio load progress or completion.
function loadAudio(toLoad) {
	
	// dynamically create audio elements, adding source types by browser support
	for (var i=0; i<toLoad.length; i++) {
		var audio = document.createElement("audio");		
		audio.id=toLoad[i][0];
		if (audio.canPlayType('audio/mpeg;')) {
			audio.type= 'audio/mpeg';
			audio.src= 'sounds/'+toLoad[i][0];+'.mp3';
		} else if (audio.canPlayType('audio/mp4;')) {
			audio.type= 'audio/mp4';
			audio.src= 'sounds/'+toLoad[i][0];+'.aac';			
		}  else if (audio.canPlayType('audio/ogg;')) {
			audio.type= 'audio/ogg';
			audio.src= 'sounds/'+toLoad[i][0];+'.ogg';
		}
		$("body").append(audio);
		sounds[toLoad[i][0]]=audio;
		audio.volume=toLoad[i][1];		
	}
}

// -------------------------------------------------------------
// Check for completion of all image loads and
// then call function to display title screen
function checkIfImagesLoaded() {
	if (imagesLoaded==imagesCount) {
		initLevel();
		showTitleScreen();
	} else {
		// here is where some progress bar animation update would
		// go if this load time made it worthwhile
		setTimeout(checkIfImagesLoaded,50);	
	}
}

// -------------------------------------------------------------
// Display title screen, show HTML image links
// to the various game section screens
function showTitleScreen() {
	
	$("#sound-switch").show();
	if (!enableSound) {
		$("#sound-off").show();
	} else {
		$("#sound-off").hide();
	}
	context.drawImage(images["title"],0,0);
	$("#play").show().click( function() {
		$("#play").unbind("click");
		$("#sound-switch").unbind('click');
		$("#how-to-play").unbind('click');
		addEventListeners()
		hideTitleImages();
		setTimeout($("#sound-switch").hide(),50);
		parseLevelXML(originalLevelXML, false);
    });
	$("#how-to-play").show().click( function() {
		$("#play").unbind("click");
		$("#sound-switch").unbind('click');
		$("#how-to-play").unbind('click');
		hideTitleImages();
		$("#sound-switch").hide();
		howToPlay();
    });	
	if (!isMobile) {
		$("#sound-switch").click( function() {
			if (enableSound) {
				$("#sound-off").show();
				enableSound=false;
				stopSound("sound-intro");
			} else {
				$("#sound-off").hide();
				enableSound=true;			
			}
		});
	}

	// reset everything for new game
	clearTimeout(ticker);		
	state=NEW_GAME;
	tickSpeed=100;	
	currLevel=1;
	levelWraps=1;
	score=0;
	lives=3;
	
}

// -------------------------------------------------------------
// Display the help screen
function howToPlay() {
	context.drawImage(images["rules"],0,0);
    $("#how-to-play-close").show();
    $("#how-to-play-close").click(function() {
		$(this).unbind("click");
		$("#how-to-play-close").hide();
        showTitleScreen();
    });
}

// -------------------------------------------------------------
// Hide the HTML image links on title screen
function hideTitleImages() {
	$("#play").hide();
	$("#how-to-play").hide();
}

// -------------------------------------------------------------
// Create event listeners for touch and keyboard
function addEventListeners() {
	canvas.addEventListener("touchstart", disableGesture, false);	
	canvas.addEventListener("touchmove", onTouch, false);		
	canvas.addEventListener("touchend", onTouch, false);
	canvas.addEventListener("gesturestart", disableGesture, false);	
	canvas.addEventListener("gesturechange", disableGesture, false);
	canvas.addEventListener("gestureend", disableGesture, false);	
	document.addEventListener("keypress", onKeyDown, false);
	document.addEventListener("keydown", onKeyDown, false);		
}

// -------------------------------------------------------------
// Clear event listeners for touch and keyboard
// So they don't continue to be handled on non-gameplay screens
function removeEventListeners() {
	canvas.removeEventListener("touchstart", onTouch, false);	
	canvas.removeEventListener("touchmove", onTouch, false);		
	canvas.removeEventListener("touchend", onTouch, false);
	canvas.removeEventListener("gesturestart", disableGesture, false);	
	canvas.removeEventListener("gesturechange", disableGesture, false);
	canvas.removeEventListener("gestureend", disableGesture, false);	
	document.removeEventListener("keypress", onKeyDown, false);
	document.removeEventListener("keydown", onKeyDown, false);		
}

// -------------------------------------------------------------
// Load level data XML
// door state intact
function initLevel() {
	$.ajax({
		type: "GET",
		url: "includes/levels.xml",
		dataType: "xml",
		success: function(xml) {
			originalLevelXML=xml;
		}
	});	
}
// -------------------------------------------------------------
// Parse through level XML data to init the current level
// If keepLevelState param is true, keep cheese and exit
// states intact from before death, otherwise, reset all
function parseLevelXML(xml, keepLevelState) {

	originalLevelXML=xml;
	
	// if keeping current level state, store values
	if (typeof keepLevelState == "undefined") {
		var keepLevelState=false;	
	} else if (keepLevelState) {
		var savedLevel=levels[currLevel];
	}
	
	levels=[];
	totalLevels=0; // counter will increment
	
	// loop through each level
	$(xml).find("level").each(function() {
									   
		totalLevels++;
		
		// determine level number to use as an index
		var levelNum=parseInt($(this).find("number").text());	
		
		if (levelNum==currLevel) {
				
			// loop through board array to store 2d array in correct format
			levels[levelNum]=new Object();
			var levelBoard=$(this).find("board").text();	
			var levelArray=levelBoard.split(",");
			levels[levelNum].board=[];
			var row=[];
			for (var i=0; i<=88; i++) {
				if (i>0 && i%11==0) {
					levels[levelNum].board.push(row);						
					row=[];
					row.push(parseInt(levelArray[i]));	
				} else {
					row.push(parseInt(levelArray[i]));							
				}
			}
			
			// loop through board and find coords of the cheeses 
			levels[levelNum].cheese=[];
			for (var y=0; y<8; y++) {
				for (var x=0; x<10; x++) {
					if (levels[levelNum].board[y][x]=="5") {
						var thisCheese=[];
						thisCheese.push(x);
						thisCheese.push(y);							
						thisCheese.push(0);	
						levels[levelNum].cheese.push(thisCheese);
					}
				}
			}
            
            // loop through board and find coords of heart
            if (!keepLevelState) {
                newLifeHeart=[-1,-1];
			    for (var y=0; y<8; y++) {
                    for (var x=0; x<10; x++) {
                        if (levels[levelNum].board[y][x]=="6") {
                            newLifeHeart[0]=x;
                            newLifeHeart[1]=y;
                        }
                    }
                }
            }
        
			// store player original coords
			levels[levelNum].startX=parseInt($(this).find("startX:first").text())*tileWidth;
			levels[levelNum].startY=parseInt($(this).find("startY:first").text())*tileHeight;				
			
			// loop to store enemy info
			levels[levelNum].enemies=[];
			$(this).find("enemies").find("enemy").each(function() {
				var enemy=[];
				enemy.push(parseInt($(this).find("startX").text())*tileWidth);
				enemy.push(parseInt($(this).find("startY").text())*tileHeight);
				enemy.push($(this).find("startDir").text());					
				levels[levelNum].enemies.push(enemy);
			});
			
			// store exit coords and sprite offset
			levels[levelNum].exit = [];
			levels[levelNum].exit.push(parseInt($(this).find("exit").find("exitX").text()));
			levels[levelNum].exit.push(parseInt($(this).find("exit").find("exitY").text()));
			levels[levelNum].exit.push(parseInt($(this).find("exit").find("exitSpritePos").text()));
																								
			// set some intitial level states
			levels[levelNum].cheeseFound=0;
			levels[levelNum].unlocked=0;

			// if keeping current state of level, restore it
			if (keepLevelState) {
				levels[currLevel].board=savedLevel.board;
				levels[currLevel].cheese=savedLevel.cheese;
				levels[currLevel].cheeseFound=savedLevel.cheeseFound;
				levels[currLevel].unlocked=savedLevel.unlocked;
				if (levels[currLevel].unlocked) {
					unlockExit(true)
					updateExit();	
				}
				savedLevel=[];
			}
			
			lastRenderedDirection="right";
			prevDirection="none";
			direction="none";	
			playerX=levels[currLevel].startX;
			playerY=levels[currLevel].startY;
			pendingClick=false;
			pendingKeypress=false;
			pendingX=0;
			pendingY=0
		
			state=PLAYING;		
			currLevelImage.src='';
			currLevelImage.src="images/level"+currLevel+".png";	
			currLevelImage.onload=function() {
				updateScoreBoard();	
				context.drawImage(currLevelImage,horizMapOffset,0);		
				context.fillStyle = "rgba(250,250,250,0.8)";
				context.fillRect (0,0,320,242);
				msgLevelStart(currLevel);
				ticker=setTimeout(onTick, 3000);
			}
			
		} // end if currLevel condition

	}); // end level.each() loop
                         
}

// -------------------------------------------------------------
// Handle mobile device touch events
// Convert screen touch coords to coords relative
// to the actual canvas position and dimensions
function onTouch(e) {
	e.preventDefault();
	var x = e.changedTouches[0].pageX-canvas.offsetLeft;	
	var y = e.changedTouches[0].pageY-canvas.offsetTop;	
	var ratiox = 320/parseInt(canvasActualWidth);
	var ratioy = 356/parseInt(canvasActualHeight);
	x=Math.round(x*ratiox);
	y=Math.round(y*ratioy);	
	determineTouchDirection(x,y);
}

// -------------------------------------------------------------
// Disable gesture events on mobile touch devices to prevent
// distracting zooming, etc. during gameplay
function disableGesture(e) {
	e.preventDefault();	
}

// -------------------------------------------------------------
// Analyze touch coordinates to determine which
// direction to move the player, if any
function determineTouchDirection(x,y) {
	if (!isFullTile()) { // if player is not on full tile, wait til next tick cycle
		pendingClick=true;
		pendingX=x;
		pendingY=y
		return;
	}
	pendingClick=false;
	prevDirection=direction;
	if (x>=239 && x<=279 && y>=237 && y<=284) { // 239,237,40,47 up
		direction="up";	
	} else if (x>=191 && x<=238 && y>=278 && y<=318) { // 191,278,47,40 left
		direction="left";;	
	} else if (x>=239 && x<=279 && y>=312 && y<=359) { // 239,312,40,47 down
		direction="down";	
	} else if (x>=277 && x<=324 && y>278 && y<318) { // 277,278,47,40 right
		direction="right";	
	}	
}

// -------------------------------------------------------------
// Handle keyboard events
function onKeyDown(e) {
	if(e.preventDefault) {
		e.preventDefault();
	} else {
		e.returnValue = false;
	}
	var key = e.keyCode;
	// handle "q" keypress - quit game
	if (state==PLAYING && key==81) { 
		lives=1;
		stopSound("sound-intro");
		songPlaying=false;
		state=PLAYER_DEAD;	
		return;
	}
	// handle "p" keypress - pause game
	if (state==PLAYING && key=="80") {
		state=GAME_PAUSED;
		return;
	}
	// if there was a pending keypress, handle it first
	if (state==PLAYING && (key>=37 || key<=40)) {
		
		if (!isFullTile()) { // if player is not on full tile, don't move until future tick cycle
			pendingKeypress=true;
			pendingKeycode=key
			return;
		}
		
		startSound("sound-squeak");
		pendingKeypress=false;

		// handle arrow key presses
		if (key==37) {
			direction="left";	
		} else if (key==38) {
			direction="up";	
		} else if (key==39) {
			direction="right";	
		} else {
			direction="down";
		}		
		
	}

}

// -------------------------------------------------------------
// Primary game timer "tick" handler
// Redraw game board with updated player, enemy, cheese and 
// exit positions.  Check for collisions.
function onTick() {
	if (state==NEXT_LEVEL) { 
		playerExitAnimation();
		return;
	} else if (state==GAME_PAUSED) {
		pauseGame();
		return;
	} else if (state==PLAYER_DEAD) { // player is dead, track death animation sequence
		if (deathAnimationFrame<7) {
			context.drawImage(images["death"],deathAnimationFrame*30,0,30,30,playerX+horizMapOffset,playerY,30,30);
			deathAnimationFrame++;
			ticker=setTimeout(onTick, 150);
			return;
		} else { // death animation is done, init new life
			deathAnimationFrame=0;
			ticker=setTimeout(nextLife, 1000);
			return;
		}
	}
	if (pendingClick) {
		determineTouchDirection(pendingX,pendingY);	
	}
	if (pendingKeypress) {
		var ev= new Object();
		ev.keyCode=pendingKeycode;
		onKeyDown(ev);	
	}	
	var initX=playerX;
	var initY=playerY;
	movePlayer();
	if (isCollision()) {		
		playerX=initX;
		playerY=initY;
		if (prevDirection!="none") {
			direction=prevDirection;
			prevDirection="none";
		}
	} else {
		prevDirection="none";	
	}
	context.drawImage(currLevelImage,horizMapOffset,0);
	updateEnemies();
	updateCheese();
	updateExit();
    updateHeart();
	if (sprite[direction]>=0) {
		context.drawImage(images["player"],sprite[direction],0,30,30,playerX+horizMapOffset,playerY,30,30);	
		lastRenderedDirection=direction;
	} else {
		context.drawImage(images["player"],sprite[lastRenderedDirection],0,30,30,playerX+horizMapOffset,playerY,30,30);	
	}
	context.drawImage(images["joystick-normal"],210,250);	
	ticker=setTimeout(onTick, tickSpeed);
}

// -------------------------------------------------------------
// Move player position one step in current direction
function movePlayer() {
	if (direction=="up") {
		playerY-=playerStepSize;
	} else if (direction=="left") {
		playerX-=playerStepSize;
	} else 	if (direction=="down") {
		playerY+=playerStepSize;
	} else 	if (direction=="right") {
		playerX+=playerStepSize;
	}	
}
// -------------------------------------------------------------
// Check if player has encountered a wall, cheese,
// or an open exit door
function isCollision() {
	var xpos=playerX;
	var ypos=playerY;
    // determine tile that the player is currently on
	if (direction=="left" || direction=="up") {
		var xCell=Math.floor(xpos/tileWidth);
		var yCell=Math.floor(ypos/tileHeight);
	} else {
		var xCell=Math.ceil(xpos/tileWidth);
		var yCell=Math.ceil(ypos/tileHeight);		
	}
	if (levels[currLevel].board[yCell][xCell]==1) { // if tile is 0, it's empty, no collision
		return true;	
	} else if (isFullTile() && levels[currLevel].board[yCell][xCell]==3 && isFullTile()) { // tile is exit
		state=NEXT_LEVEL;
		score+=100*levelDisplayNum();
		return true;
	} else if (levels[currLevel].board[yCell][xCell]==5) { // tile is an uncollected cheese
		levels[currLevel].board[yCell][xCell]=0;
		clearCheese(xCell,yCell);
		levels[currLevel].cheeseFound++;
        // if all cheese found, unlock the exit
		if (levels[currLevel].cheeseFound == levels[currLevel].cheese.length) {
			unlockExit(false);	
			updateExit();
		}
	} else if (levels[currLevel].board[yCell][xCell]==6) { // tile is an uncollected heart
        levels[currLevel].board[yCell][xCell]=0;
        newLifeHeart=[-1,-1] // no more heart
        updateHeart();
        lives++;
        startSound("sound-crunch");
    }
	return false;
}

// -------------------------------------------------------------
// Check if player is positioned on a full 30x30 tile
function isFullTile() {
	if (playerX%tileWidth>0 || playerY%tileHeight>0) {
		return false;	
	}
	return true;
}

// -------------------------------------------------------------
// Calculate movement direction for all level enemies
// based on walls and relative player location, along
// with some randomness.  Draw the correct enemy
// sprites.  Check for collisions with player.
function updateEnemies() {
    
    // loop through all level enemies
	for (i=0; i<levels[currLevel].enemies.length; i++) {
        
        // obtain info about the enemy from the level array
		var enemyX=levels[currLevel].enemies[i][0];
		var enemyY=levels[currLevel].enemies[i][1];
		var enemyDirection=levels[currLevel].enemies[i][2];

        // store current enemy position, then update it
		var initEnemyX=enemyX;
		var initEnemyY=enemyY;		
		if (enemyDirection=="up") {
			enemyY-=enemyStepSize;
			levels[currLevel].enemies[i][1]-=enemyStepSize;
		} else if (enemyDirection=="left") {
			enemyX-=enemyStepSize;
			levels[currLevel].enemies[i][0]-=enemyStepSize;
		} else 	if (enemyDirection=="down") {
			enemyY+=enemyStepSize;
			levels[currLevel].enemies[i][1]+=enemyStepSize;			
		} else 	if (enemyDirection=="right") {
			enemyX+=enemyStepSize;
			levels[currLevel].enemies[i][0]+=enemyStepSize;
		}		

		// if enemy has hit a wall, pick a new direction
		if (isEnemyCollision(enemyDirection,enemyX,enemyY)) {
				
			enemyX=initEnemyX;
			levels[currLevel].enemies[i][0]=initEnemyX;
			enemyY=initEnemyY;
			levels[currLevel].enemies[i][1]=initEnemyY;
			
			var checkX=enemyX;
			var checkY=enemyY;
            // enemy always moves towards player, but random number determines whether
            // it moves horizontally or vertically at any given collision point
			var randnum=Math.floor(Math.random()*2);
			if (randnum==0) { // horizontal bias
				if (playerX>enemyX) {
					enemyDirection="right";	
					checkX=enemyX+enemyStepSize;
				} else if (playerX<enemyX) {
					enemyDirection="left";	
					checkX=enemyX-enemyStepSize;				
				} else if (playerY>enemyY) {
					enemyDirection="down";	
					checkY=enemyY+enemyStepSize;				
				} else {
					enemyDirection="up";	
					checkY=enemyY-enemyStepSize;				
				}
			} else { // vertical bias
				if (playerY>enemyY) {
					enemyDirection="down";	
					checkY=enemyY+enemyStepSize;				
				} else if (playerY<enemyY) {
					enemyDirection="up";	
					checkY=enemyY-enemyStepSize;				
				} else if (playerX>enemyX) {
					enemyDirection="right";	
					checkX=enemyX+enemyStepSize;
				} else {
					enemyDirection="left";	
					checkX=enemyX-enemyStepSize;				
				}  				
			}
		}

		levels[currLevel].enemies[i][2]=enemyDirection;
			
		context.drawImage(images["enemy"],sprite[enemyDirection],0,30,30,enemyX+horizMapOffset,enemyY,30,30);
		
		if (enemyX>playerX-15 && enemyX<playerX+15 && enemyY>playerY-15 && enemyY<playerY+15) {
			stopSound("sound-intro");
			songPlaying=false;
			startSound("sound-dead");
			state=PLAYER_DEAD;
		}
		
	}	
}

// -------------------------------------------------------------
// Check if enemy has collided with a wall (or an
// open exit -- we don't want enemies escaping!)
function isEnemyCollision(enemyDirection,enemyX, enemyY) {
	if (enemyDirection=="left" || enemyDirection=="up") {
		var xCell=Math.floor(enemyX/tileWidth);
		var yCell=Math.floor(enemyY/tileHeight);
	} else {
		var xCell=Math.ceil(enemyX/tileWidth);
		var yCell=Math.ceil(enemyY/tileHeight);		
	}
	if (levels[currLevel].board[yCell][xCell]==1 ||
		levels[currLevel].board[yCell][xCell]==3) {
		return true;	
	}	
	return false;
}

// -------------------------------------------------------------
// Draw remaining cheese for the current level
function updateCheese() {
	for (i=0; i<levels[currLevel].cheese.length; i++) {
		if (levels[currLevel].cheese[i][2]==0) { // if not already retrieved...
			var cheeseX=levels[currLevel].cheese[i][0]*tileWidth;
			var cheeseY=levels[currLevel].cheese[i][1]*tileHeight;		
			context.drawImage(images["cheese"],cheeseX+horizMapOffset,cheeseY);
		}
	}
	updateScoreBoard();
}

// -------------------------------------------------------------
// Remove an individual cheese from the current level
// Increment the player's score by 10 points times level
function clearCheese(clearX,clearY) {
	
	for (i=0; i<levels[currLevel].cheese.length; i++) {
		if (levels[currLevel].cheese[i][2]==0) { // if not already retrieved...
			startSound("sound-crunch");
			var cheeseX=levels[currLevel].cheese[i][0];
			var cheeseY=levels[currLevel].cheese[i][1];
			if (clearX==cheeseX && clearY==cheeseY) {
				cheeseY=levels[currLevel].cheese[i][2]=1; // mark it retrieved
			}
		}
	}	
	score+=10*levelDisplayNum();
}

// -------------------------------------------------------------
// Set current level exit to be unlocked
function unlockExit(nosound) {
	if (!nosound) {
		startSound("sound-trumpet");
	}
	var exitX=levels[currLevel].exit[0];
	var exitY=levels[currLevel].exit[1];
	levels[currLevel].board[exitY][exitX]=3;
	levels[currLevel].unlocked=1;
}

// -------------------------------------------------------------
// Check if current level exit is unlocked, and if 
// it is, draw an empty tile over the exit location
function updateExit() {
	if (levels[currLevel].unlocked) {
		var exitX=levels[currLevel].exit[0];
		var exitY=levels[currLevel].exit[1];	
		var exitSpritePos=(currLevel-1)*36;
		context.drawImage(images["unlocked"],exitSpritePos,0,36,36,exitX*tileWidth-1+horizMapOffset,exitY*tileHeight-1,36,36);
        updateScoreBoard();
	}
}

// -------------------------------------------------------------
// Animate player exiting after main loop has stopped
function playerExitAnimation() {
	for (var i=0; i<5; i++) {
		setTimeout(function() {
			movePlayer();								
			context.drawImage(currLevelImage,horizMapOffset,0);
            context.drawImage(images["unlocked"],(currLevel-1)*36,0,36,36,levels[currLevel].exit[0]*tileWidth-1+horizMapOffset,levels[currLevel].exit[1]*tileHeight-1,36,36);
			context.drawImage(images["player"],sprite[direction],0,30,30,playerX+horizMapOffset,playerY,30,30);
            updateScoreBoard();
		}, Math.max(tickSpeed*i, 1));
	}	
	ticker=setTimeout(function() { 
		currLevel++;
		if (currLevel>totalLevels) {
			currLevel=1;	
			tickSpeed-=10;
			levelWraps++;
		}								
		parseLevelXML(originalLevelXML,false); 
	}, tickSpeed*(i+1));
}

// -------------------------------------------------------------
// Decrement player lives, then either re-init the
// level or init game over sequence
function nextLife() {
	lives--;
	updateScoreBoard();
	if (lives==0) {
		gameOver();	
	} else {
		parseLevelXML(originalLevelXML,true);	
	}
}

// -------------------------------------------------------------
// Show Game Over screen with score tweet button
// If high score reached, show the form, otherwise
// just show Play Again button
function gameOver() {
	removeEventListeners();
	context.fillStyle = "rgba(250,250,250,0.8)";
    context.fillRect (0,0,320,242);
	context.drawImage(images["panel"],0,242);	
	setTimeout(function() {
		context.drawImage(images["game-over"],41,55);	
		startSound("sound-gameover");
		setTimeout(function() {
            
            // output final score
			drawShadowText("FINAL SCORE:","18pt Arial","#ffff22","#444444",110,135, true,true);							
			drawShadowText(""+score+"","18pt Arial","#ffff22","#444444",110,165, true,true);	
            
            // output tweet share button
			$("#tweet a").attr("href","https://twitter.com/share?url=http://bit.ly/tuSXYY&text=I scored "+score+" points in the Rodent Race %23html5 game!");
			$("#tweet").show();
            
            // show play again button
            $("#play-again").show();
            $("#play-again").click(function() {
                $(this).unbind("click");
                $(this).hide();
                $("#tweet").hide();
                showTitleScreen();                
            });              
        }, 500);
	}, 700);
}

// -------------------------------------------------------------
// Text animation sequence for starting each level
function msgLevelStart() {
	setTimeout( function() {
		drawShadowText("LEVEL "+levelDisplayNum(),"24pt Arial","#ffff22","#000000",100,87, true,true);
		setTimeout( function() {
			context.drawImage(images["get-ready"],45,110);	
			if (!songPlaying) {
				startSound("sound-intro",true);			
				songPlaying=true;
			}
			setTimeout(function() {
					context.drawImage(currLevelImage,horizMapOffset,0);							
			}, 2000);
		}, 1000);
	 } , 500);
}

// -------------------------------------------------------------
// Draw canvas text with extra thickness and shadows
function drawShadowText(fontText,fontStyle,fontForeground,fontShadow,x,y,center,html5shadow) {
	if (center) {
		context.textAlign="center";	
		x=Math.round(canvas.width / 2);
	} else {
		context.textAlign="left";	
	}
	if (html5shadow) {
		context.shadowColor = fontShadow;
		context.shadowOffsetX = 1; 
		context.shadowOffsetY = 1;
		context.shadowBlur = 3; 
	}
	context.font = fontStyle;	
	context.fillStyle = fontForeground;
	for (var i=2; i<=3 ; i++) {
		context.fillText(fontText, x+i, y+i);		
	}		
	context.shadowColor = null;
	context.shadowOffsetX = null;
	context.shadowOffsetY = null;
	context.shadowBlur = null;
}

// -------------------------------------------------------------
// Update scoreboard text
function updateScoreBoard() {
	context.drawImage(images["panel"],0,242);		
	drawShadowText("LEVEL: " + levelDisplayNum(),"13pt Sans-Serif","#ffffaa","#000000",18,275, false, true);	
	drawShadowText("SCORE: " + score,"13pt Sans-Serif","#ffffaa","#000000",18,300, false, true);		
	drawShadowText("LIVES: " + lives,"13pt Sans-Serif","#ffffaa","#000000",18,325, false, true);			
}

// -------------------------------------------------------------
// Translate real looping level number to virtual total level
function levelDisplayNum() {
	var label=parseInt(levelWraps)-1;
	label*=totalLevels;
	return label+currLevel;
}

// -------------------------------------------------------------
// Begin playing sound with given id
function startSound(soundId,loopIt) {
    if (!enableSound) return;
	if (typeof loopIt != "undefined") {
		var loop=loopIt;
	} else {
		var loop=false;	
	}
	if (readySounds[soundId] || sounds[soundId].readyState>3) {
		readySounds[soundId]=true;
		if (typeof sounds[soundId] != "undefined") {
			if (loop && typeof sounds[soundId].duration != "undefined") {
				soundLoops[soundId]=setTimeout(function() {
					sounds[soundId].currentTime=0;
					startSound(soundId,loop);
				}, Math.round(sounds[soundId].duration*1000-10));
			}
			sounds[soundId].currentTime=0;
			sounds[soundId].play();			
		} else {
			alert("startSound: Requested audio resource " + soundId + " not found.");	
		}
	} else {
		setTimeout(function() {
			startSound(soundId,loop);			
		},40);
	}
}
// -------------------------------------------------------------
// Stop playing sound with given id
function stopSound(soundId) {
    if (!enableSound) return;    
	if (readySounds[soundId] || sounds[soundId].readyState>3) {	
		readySounds[soundId]=true;
		if (typeof sounds[soundId] != "undefined") {
			clearTimeout(soundLoops[soundId]);
			sounds[soundId].pause();	
			sounds[soundId].currentTime=0;		
		} else {
			alert("stopSound: Requested audio resource " + soundId + " not found.");	
		}
	} else {
		setTimeout(function() {
			stopSound(soundId);			
		},40);		
	}
}

// -------------------------------------------------------------
// If there's a heart on current level, draw it
function updateHeart() {
    if (newLifeHeart[0]>=0 && newLifeHeart[1]>=0) {
        context.drawImage(images["heart"],newLifeHeart[0]*tileWidth,newLifeHeart[1]*tileHeight);
    }
}

// -------------------------------------------------------------
// Pause the game
function pauseGame() {
	context.fillStyle = "rgba(250,250,250,0.8)";
    context.fillRect (0,0,320,242);
	context.drawImage(images["panel"],0,242);		
	removeEventListeners();
	drawShadowText("GAME PAUSED","16pt Sans-Serif","#333333","#000000",18,105, true, false);	
	drawShadowText("Press Any Key to Resume","13pt Sans-Serif","#333333","#000000",18,130, true, false);		
	document.addEventListener("keypress", unPauseGame, false);	
	document.addEventListener("touchstart", unPauseGame, false);		
}

// -------------------------------------------------------------
// Resume game after pause
function unPauseGame(e) {
	document.removeEventListener("keypress", unPauseGame, false);
	document.removeEventListener("touchstart", unPauseGame, false);			
	addEventListeners();
	state=PLAYING;
	onTick();
}
