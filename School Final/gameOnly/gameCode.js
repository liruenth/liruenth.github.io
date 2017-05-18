var gameStarted = false;
var numEnemies = 0;
var enemies = [];
var fireBalls = [];
var fireBallsCount = 0;
var willCreateEnemy = true;
var eggsCount = 4;
var eggsHatchedCount = 0;
var createEnemyTimer;
var eggHatchTimer;
var drawTimer;
var robotsDefeated = 0;
var level = 1;
var multiplier = 1;
var bossDefeated = false;
var mouseX;
var mouseY;
var difficulty;
var enemyTimerSpeed = 2000;

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
 ctx.strokeStyle = "red";
 ctx.fillStyle = "red";
 
function getMousePos(evt) {
	var rect = canvas.getBoundingClientRect();
	mouseX = evt.clientX - rect.left;
	mouseY = evt.clientY - rect.top;
}

var hatchEgg = function(){
	if(eggsCount > 0 && eggsHatchedCount < eggsCount)
	{
		eggsHatchedCount++;
		document.getElementById("egg" + eggsHatchedCount).src = "pictures/babyDragon.jpg";
		clearInterval(createEnemyTimer);
		enemyTimerSpeed = 2000 - (145 * eggsHatchedCount) * difficulty;
		createEnemyTimer = setInterval(function(){createEnemy(); }, enemyTimerSpeed);
		createEnemy();
	}
	else
	{
		clearInterval(hatchEggTimer);	
	}
};

var fireBall = function(targetX, targetY, img){
	this.x = 0;
	this.y = 400;
	this.targetX = targetX;
	this.targetY = targetY;
	this.image = img;
	this.width = 30;
	this.active = true;
};

fireBall.prototype.draw = function()
{
	ctx.drawImage(this.image, this.x, this.y, this.width, this.width);
};

var Enemy = function(img, speed, hp)
{
	this.x = Math.floor((Math.random() * 351));
	this.width = 50 * level;
	this.y = 0 - this.width / 2;
	this.active = true;
	this.img = img;
	this.speed = speed;
	this.hp = hp;
};

Enemy.prototype.draw = function()
{
	ctx.drawImage(this.img,this.x,this.y, this.width, this.width);
	ctx.font="18px Arial";
	ctx.fillText(this.hp, this.x + this.width / 2, this.y - 2);
};

Enemy.prototype.isHit = function(x, y, width)
{
	if (this.x < x + width / 2 &&
		this.x + this.width > x - width / 2 &&
		this.y < y + width / 2  &&
		this.y + this.width > y)
		{
			this.hp--;
			if (level == 3 && this.hp % 10 == 0)
			{
				this.y -= this.width / 3;
			}
			
			if (this.hp == 0)
			{
				this.active = false;
				if (level == 2)
				{
					robotsDefeated++;
				}
				else if (level == 3)
				{
					bossDefeated = true;
				}
			}
			return true;
		}
	return false;
};

var drawCrossHairs = function(e) {

	//if (gameStarted)
	//{
		getMousePos(e);
		ctx.beginPath();
		ctx.lineWidth = "1";
		ctx.rect(mouseX - 10, mouseY, 20, 0);
		ctx.stroke();
		ctx.rect(mouseX, mouseY - 10, 0, 20);
		ctx.stroke();
	//}
};

var drawCross = function(){
  ctx.beginPath();
  ctx.lineWidth = "1";
  ctx.rect(mouseX - 10, mouseY, 20, 0);
  ctx.stroke();
  ctx.rect(mouseX, mouseY - 10, 0, 20);
  ctx.stroke();
}

var restartGame = function() {
	
	for (var i = 1; i <= eggsCount; i++)
	{
		var egg = document.getElementById("egg" + i);
		egg.setAttribute("src", "pictures/dragonegg.jpg");
		document.getElementById("gameParagraph").appendChild(egg);
	}
	
	for (var i = eggsCount + 1; i <= 4; i++)
	{
		var egg = document.createElement("img");
		egg.setAttribute("src", "pictures/dragonegg.jpg");
		egg.setAttribute("id", "egg" + i);
		document.getElementById("gameParagraph").appendChild(egg);
	}

	numEnemies = 0;
	enemies = [];
	fireBalls = [];
	fireBallsCount = 0;
	numEnemies = 0;
	willCreateEnemy = true;
	eggsCount = 4;
	eggsHatchedCount = 0;
	gameStarted = false;
	clearInterval(drawTimer);
	clearInterval(createEnemyTimer);
	clearInterval(hatchEggTimer);
	enemyTimerSpeed = 2000;
	robotsDefeated = 0;
	level = 1;
	multiplier = 1;
	bossDefeated = false;
	ctx.clearRect(0, 0, 400, 400);
	canStart = false;
};

var begin = function()
{
	if (!canStart) {
		return;
	}
	if (!gameStarted)
	{
		gameStarted = true;
		drawTimer = setInterval(function(){ draw(); }, 25);
		createEnemyTimer = setInterval(function(){createEnemy(); }, enemyTimerSpeed);
		hatchEggTimer = setInterval(function(){hatchEgg();}, 10000);
	}
	else
	{
		gameStarted = false;
		clearInterval(drawTimer);
		clearInterval(createEnemyTimer);
		clearInterval(hatchEggTimer);
	}
}

var startGame = function (message) {
	if (gameStarted)
	{
		var restart = confirm(message + "\nDo you wish to restart?")
		if (restart)
		{
			restartGame();
			document.getElementById("startButton").innerHTML = "End game";
			difficultySetting = document.getElementById("difficultySetting");
			difficulty = difficultySetting.options[difficultySetting.selectedIndex].value;
			canStart = true;
			alert("Take a moment to review the controls. \nClick the screen when you are ready.\n\nTo pause the game at any time just click the screen again.");
		}
		else
		{
			restartGame();
			document.getElementById("startButton").innerHTML = "Start game";
		}
	}
	else
	{
		document.getElementById("startButton").innerHTML = "End game";
		//drawTimer = setInterval(function(){ draw(); }, 25);
		//createEnemyTimer = setInterval(function(){createEnemy(); }, 2000);
		//hatchEggTimer = setInterval(function(){hatchEgg();}, 10000);
		difficultySetting = document.getElementById("difficultySetting");
		difficulty = difficultySetting.options[difficultySetting.selectedIndex].value;
		canStart = true;
		alert("Take a moment to review the controls. When you are ready click the screen.\n To pause the game at any time just click the screen again.");
	}
};

function createEnemy() {
	if (gameStarted)
	{
		var enemyNumber;
		if (level == 2)
		{
			enemyNumber = Math.floor((Math.random() * 2) + 4); // 4 to 5
		}
		else if (level == 1)
		{
			enemyNumber = Math.floor((Math.random() * 3) + 1); // 1 to 3 inclusive
		}
		else{
			enemyNumber = 7;
		}
		var image = document.createElement("img");
		image.setAttribute("src", "pictures/enemies/enemy" + enemyNumber + ".jpg");
		
		if (level == 1)
		{
			newEnemy = new Enemy(image, enemyNumber, 4 - enemyNumber);
		}
		else if (level == 2)
		{
			newEnemy = new Enemy(image, enemyNumber - 3, (14 - 2 * enemyNumber - (2* difficulty * -1)));
		}
		else{
			newEnemy = new Enemy(image, 1, 50 * (difficulty / 2));
		}
		
		canvas.appendChild(image, newEnemy.x, newEnemy.y);
		
		enemies.push(newEnemy);
		
		numEnemies++;
		if (enemies.length > 20)
		{	
			reallocateArray(enemies, numEnemies, 1);
		}
		
		willCreateEnemy = true;
	}
};

function moveEnemy(enemy) {
	
	var moveX = 0;
	
	enemy.y += enemy.speed;
	
	
	if (level == 1)
	{
		moveX = Math.floor((Math.random() * enemy.speed * 7));
		multiplier = Math.floor((Math.random() * 11) + 1);
		if (multiplier > 5)
		{
			multiplier = -1;
		}
		else 
		{
			multiplier = 1;
		}
	}
	
	if (level == 2)
	{
		moveX = 2 * level;
	}
	
	moveX *= multiplier;
	
	enemy.x += moveX;
	
	
	if (enemy.x > 400 - enemy.width)
	{
		if (level == 2)
		{
			multiplier = -1;
		}
		enemy.x = 400 - enemy.width;
	}
	if (enemy.x < 0)
	{
		if (level == 2)
		{
			multiplier = 1;
		}
		
		enemy.x =0;
	}
	enemy.draw();
	
	if (enemy.y > 400 - enemy.width / 2)
	{
		enemy.active = false;
		numEnemies--;
		if (eggsHatchedCount < eggsCount || level == 2)
		{
			var element = document.getElementById("egg" + eggsCount);
			element.parentNode.removeChild(element);
			eggsCount--;
			if (level == 2)
			{
				eggsHatchedCount--;
			}
		}
		if (level == 3)
		{
			eggsCount = 0;
		}
	}
};

function checkForHits(fireBall) {

	if (fireBall.x > 400 || fireBall.y < 0)
	{
		fireBall.active = false;
		fireBallsCount--;
		return true;
	}
	
	for (var i = 0; i < enemies.length; i++)
	{
		if (enemies[i].active)
		{
			if (enemies[i].isHit(fireBall.x, fireBall.y, fireBall.width))
			{
				fireBall.active = false;
				fireBallsCount--;
				return true;
			}
		}
	}
	
	return false;
};

var reallocateArray = function(oldArray, arrayCount, arrayType){
	var temp = [];
	var movedCount = 0;
	for (var i = oldArray.length - 1; i >= 0; i--)
	{
		if (oldArray[i].active)
		{
			movedCount++;
			temp.push(oldArray[i]);

		}
		if (movedCount === arrayCount)
		{
			i = 0;
		}
	}
	if(arrayType === 0)
	{
		fireBalls = temp;
	}
	else
	{
		enemies = temp;
	}
}

var shoot = function(e){
	if (e.keyCode == 109)
	{
		if (fireBalls.length > 11)
		{
			reallocateArray(fireBalls, fireBallsCount, 0);
		}
		
		if (fireBallsCount < eggsHatchedCount + 1)
		{
			//mousePos = getMousePos(e);
			var img = document.createElement('img');
			img.src = "pictures/fireball.jpg";
			fireBalls.push(new fireBall(mouseX - 10, mouseY - 10, img));
			fireBallsCount++;
		}
	}
};

var shootFire = function() {
   
	for (var i = 0; i < fireBalls.length; i++)
	{
		if (fireBalls[i].active)
		{
			if (fireBalls[i].targetX > 150)
			{
				fireBalls[i].x += 10;
				fireBalls[i].y -= ((160000 - (400 * fireBalls[i].targetY)) / (40 * fireBalls[i].targetX));
			}
			else
			{
				fireBalls[i].y -= 10;
				fireBalls[i].x += (400 * fireBalls[i].targetX) / (400 - fireBalls[i].targetY) / 40;
			}
			fireBalls[i].draw();
			checkForHits(fireBalls[i]);
		}
	}
};

var draw = function() {
	//if (gameStarted)
	//{
		ctx.clearRect(0, 0, 400, 400);
		drawCross();
		if (fireBallsCount > 0)
		{
			shootFire();
		}
		
		if (numEnemies > 0)
		{
			for (var i = 0; i < enemies.length; i++)
			{
				if (enemies[i].active)
				{
					moveEnemy(enemies[i]);
				}
			}
		}
		if (eggsCount == 0 && eggsHatchedCount == 0 && level == 1)
		{
			startGame("The eggs were all destroyed. Please try harder next time.");
		}
		
		if (eggsCount === eggsHatchedCount && level == 1)
		{
			level = 2;
			alert("Congratulations on saving the eggs. However, The humans are desperate for dragons and will take the babies.\nDefeat the machines to stop them");
			clearInterval(createEnemyTimer);
			enemyTimerSpeed = 2000 + (150 * difficulty);
			createEnemyTimer = setInterval(function(){createEnemy();}, enemyTimerSpeed);
			numEnemies = 0;
			fireBallsCount = 0;
			enemies = [];
			fireBalls = [];
		}
		
		if (level == 2 && robotsDefeated == 15 && eggsCount > 0)
		{
			level = 3;
			numEnemies = 0;
			fireBallsCount = 0;
			enemies = [];
			fireBalls = [];
			clearInterval(createEnemyTimer);
			createEnemy();
		}
		
		if (level > 1 && eggsCount == 0)
		{
			startGame("The babies were all taken. Please try harder next time.");
		}
		
		if (bossDefeated)
		{
			startGame("Congratulations!!! The humans have lost and will leave the dragons in peace now.\n");
		}
	//}
};