/*
Traverse through the maze to reach the goal
Get coins for items found / enemies defeated
Use coins to purchase items, weapons and armor between levels
Battle is a D&D style with run, fight options
Successful run causes you to warp to beginning of level
normal and hard mode's goal is to reach maze level 10 and defeat the boss
Endless loops through the first 9 levels until the player dies
Music comes from a song my sister wrote and uploaded on youtube
I got her permission to use the music and changed it a bit to 
fit the game better.
*/

////////////////Global Variables

/*
GameStates
0: Start game
1: Move on map
2: battle
3: shop
4: Game complete
5: Game over
*/
var gameState = 0;
var HARD_MODE = false;
var ENDLESS = false;
var LVL_SIZE = 22;
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

/*tiles
0: normal
1: wall
2: coins += 50 * FLOOR
3: level exit
4: hp += 5
5: hp -= 3
*/
var lv1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,1],
    [1,1,1,1,1,0,1,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,3,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,1,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv2 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,3,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv3 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,1,3,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,1],
    [1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv4 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,1,0,3,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,1,0,1],
    [1,0,1,0,0,0,1,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1],
    [1,0,1,0,0,1,1,0,1,0,0,0,1,0,0,0,1,1,0,1,0,1],
    [1,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv5 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,0,1,0,1,0,1,0,1,0,1,1,0,1,1,1,1,1,1,0,1],
    [1,1,0,0,0,1,0,3,0,1,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,1,0,1,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,0,1,1,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,1,0,0,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,1,1,1,1,0,1,0,1,1,1,1,1],
    [1,0,0,0,0,1,1,1,0,1,1,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv6 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,1,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,1,3,0,1,0,0,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,1,1,1,1,1,1,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1,1,0,0,1,0,0,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv7 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,0,1,1,0,1,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,3,1,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,0,1,1,0,0,1,0,0,1,1,0,1],
    [1,0,0,1,0,1,0,1,0,0,1,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,0,1,0,1,0,0,0,0,0,1],
    [1,1,0,0,0,1,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv8 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,1,1,0,0,0,1,0,0,0,3,0,0,0,0,0,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,1,0,0,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lv9 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1],
    [1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,3,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var lvlBoss = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], 
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],   
    [1,1,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,1,1],  
    [1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1],  
    [1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,4,1,0,1,1],  
    [1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1],  
    [1,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1,1],  
    [1,1,0,1,0,1,0,1,0,0,0,1,0,0,0,1,1,0,1,0,1,1],  
    [1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,0,0,1,0,1,1],  
    [1,1,0,1,0,1,0,1,4,1,5,1,2,1,0,0,0,1,1,0,1,1],  
    [1,1,0,1,0,1,0,1,0,1,3,1,0,1,0,1,1,1,1,0,1,1],  
    [1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,1],  
    [1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,5,1,0,1,1],  
    [1,1,0,1,0,1,0,1,0,0,0,0,0,1,0,5,1,2,1,0,1,1],  
    [1,1,0,1,0,1,0,1,1,1,0,1,1,1,0,1,0,1,1,0,1,1],  
    [1,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,2,1,0,1,1],  
    [1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1],  
    [1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,1,1],  
    [1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1],  
    [1,1,0,0,0,0,0,0,5,1,0,1,2,0,0,0,0,0,0,0,1,1], 
    [1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1],    
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

var maps = [
    lv1,
    lv2,
    lv3,
    lv4,
    lv5,
    lv6,
    lv7,
    lv8,
    lv9,
    lvlBoss
];

var mapsDone = [];

var level;
var FLOOR;

var TILE_SIZE = 80;

////////////////Classes
var Battle;
var Boss;
var Char;
var Enemy;
var Item;
var ItemAbout;
var Maze;
var Player;
var StartScreen;

////////////////Class instances
var battle;
var enemies = [];
var maze;
var player;
var startScreen;
var Store;

////////////////Functions
var addEnemies;
var addSpecialTiles;
var checkMove;
var checkTile;
var createBoss;
var getNewLevel;
var getTileLoc;
var moveEnemies;
var resetLevel;
var startGame;
var store;

////////////////Function defs
addEnemies = function() {
    enemies = [];
    var tx;
    var ty;
    var bosses = ENDLESS || HARD_MODE ? Math.floor(FLOOR / maps.length) : 0;
    maze.numBosses = bosses;
    
    for (var i = 0; i < 10 + bosses; i++) {
        do {
            tx = Math.floor(Math.random() * (LVL_SIZE - 1) + 1);
            ty = Math.floor(Math.random() * (LVL_SIZE - 1) + 1);       
        } while ((!checkMove(tx, ty)) || (tx === 1 && ty === 1));
        if (i < 10) {
            enemies.push(new Enemy(FLOOR, tx, ty));
        } else {
            enemies.push(new Boss(FLOOR + 5, tx, ty));   
        }
    }
};

checkMove = function(x, y) {
    if (maps[level][y][x] !== 1) {
        return true;   
    } else {
        return false;   
    }
};

checkTile = function(x, y) {
    var tile = maps[level][y][x];
    switch(tile) {
        case 0:
            break;
        case 2:
            player.coins += 50 * FLOOR;
            maps[level][y][x] = 0;
            maze.state = 4;
            maze.msgs = ["You found " + (50 * FLOOR) + " coins"];
            break;
        case 4:
            player.hp += 5;
            maps[level][y][x] = 0;
            maze.state = 3;
            maze.msgs = ["Found a potion. Recovered 5 hp."]; 
            break;
        case 5:
            player.hp -= 3;
            maps[level][y][x] = 0;
            maze.state = 2;
            maze.msgs = ["Stepped on a trap. lost 3 hp."];
			player.coins = Math.floor(player.coins / 2);
            if (player.hp <= 0) {
                maze.msgs.push("You died and lost half your coins.");   
            }
            break;
    }
};

createBoss = function() {
    enemies.push(new Boss(15, 10, 11));  
};

getNewLevel = function() {
    if (ENDLESS && FLOOR > 0) {
        resetLevel();
    }
    level++;
    FLOOR++;
    addEnemies();
    if (ENDLESS) {
        level %= maps.length - 1;   
    }  
    if (level === maps.length - 1) {
        player.startBoss();
        createBoss();
        maze.state = 5;
        maze.msgs = ["You sense danger is near."];
    } else {
        player.getNewStart();
        addSpecialTiles();
    }
};

//removes any special tiles from the map
resetLevel = function() {
    var t;
    for (var r = 1; r < LVL_SIZE - 2; r++) {
        for (var c = 1; c < LVL_SIZE - 2; c++) {
            t = maps[level][r][c];
            if (t === 2 || t === 4 || t === 5) {
                maps[level][r][c] = 0;
            }
        }  
    }
};

//add a few special tiles to the map
addSpecialTiles = function() {
    var x;
    var y;
    var numHeal = Math.floor(Math.random() * 3);
    var numCoins = Math.floor(Math.random() * 3);
    var numTrap = Math.floor(Math.random() * (FLOOR / 3));
    var tiles = [numTrap, 5, numCoins, 2, numHeal, 4];
    var ind = 0;
    maze.numHeal = numHeal;
    maze.numCoins = numCoins;
    maze.numTrap = numTrap;
    
    for (var k = 0; k < tiles.length; k += 2) {
        for (var i = 0; i < tiles[k]; i++) {
            do {
                x = Math.floor(Math.random() * (LVL_SIZE - 2) + 1);
                y = Math.floor(Math.random() * (LVL_SIZE - 2) + 1);
            } while (maps[level][y][x] !== 0);
            maps[level][y][x] = tiles[k+1];
        }
    }
};

getTileLoc = function(XorY, isX) {
    if (isX) {
        return -(XorY - TILE_SIZE * 2) / TILE_SIZE;
    } else {
        return  -(XorY - TILE_SIZE * 2) / TILE_SIZE;
    }
};

moveEnemies = function() {
    for (var i = 0; i < enemies.length; i++) {
        enemies[i].move();
    }
};

startGame = function(mode) {
    gameState = 1;
    level = -1;
    FLOOR = 0;
    player = new Player();
    store = new Store();
    maze = new Maze();
    if (mode === 1) { 
        HARD_MODE = true;
    } else if (mode === 2) {
        ENDLESS = true;   
    }
    getNewLevel();
	playMaze();
};

//////////////////Classes
Array.prototype.contains = function(item) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === item) {
            return true;   
        }
    }
    return false;
};

//returns -1 if nothing found
Array.prototype.getIndex = function(item) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].equals(item)) {
            return i;   
        }
    }  
    return -1;
};

Battle = function(enemy, index, playerStart) {
    /* states
    0: begin battle
    1: Player turn
    2: Enemy turn
    3: battle won
    4: battle lost
    5: ran away
    */
    this.isBoss = enemy instanceof Boss;
    this.playerStart = playerStart;
    this.state = 0;
    if (this.isBoss) {
		playBoss();
        this.msgs = ["It's a Dragon!"];
    } else if (!playerStart)  {  
        this.msgs = ["Ambushed!"]; 
		playBattle();
    } else {
        this.msgs = ["A challenger appeared"];
		playBattle();
    }
    this.animationTime = 60;
    this.enemy = enemy;
    if (index < 0) {
        index = enemies.getIndex(enemy);   
    }
    this.index = index;
    gameState = 2;
    this.selected = 0;
    this.actions = ["Fight", "Run"];
    this.dmgE = null;
    this.dmgP = null;
};

Battle.prototype.draw = function() {
    ctx.beginPath();
	ctx.fillStyle = 'rgb(92, 92, 92)';
	ctx.rect(0,0,400,400);
	ctx.fill();
	ctx.stroke();
	
    //background(92, 92, 92);
    ctx.font = "20px Arial";
	
    ctx.beginPath();
    ctx.fillStyle = 'rgb(0, 0, 255)';
    ctx.rect(0,0,80, 90);
	ctx.fill();
	ctx.stroke();
	
    ctx.beginPath();
    ctx.fillStyle = 'rgb(255, 0, 0)';
    ctx.rect(320,0,80, 90);
	ctx.fill();
	ctx.stroke();
	
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText("Player", 10, 20);
    ctx.fillText("HP: " + player.hp, 10, 40);
    ctx.fillText("Atk: " + player.atk, 10, 60);
    ctx.fillText("Def: " + player.def, 10, 80);
    ctx.fillText("Enemy", 330, 20);
    ctx.fillText("HP: " + this.enemy.hp, 330, 40);
    ctx.fillText("Atk: " + this.enemy.atk, 330, 60);
    ctx.fillText("Def: " + this.enemy.def, 330, 80);
    
    player.drawBattle(100, 200);
    this.enemy.drawBattle(300, 200);
    
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.textAlign = "center";
    if (this.dmgP !== null) {
        ctx.fillText("-" + this.dmgP, 100, 205);
    }
    if (this.dmgE !== null) {
        ctx.fillText("-" + this.dmgE, 300, 205);
    }
    ctx.textAlign = "left";
    
	ctx.beginPath();
    ctx.fillStyle = 'rgb(0, 0, 255';
    ctx.rect(160, 325, 65, 60);
	ctx.fill();
	ctx.stroke();
    for (var i = 0; i < this.actions.length; i++) {
        if (i === this.selected) {
			ctx.beginPath();
            ctx.fillStyle = 'rgb(99, 102, 0)';
            ctx.rect(165, 330 + i * 25, 55, 25);
			ctx.fill();
			ctx.stroke();
        } 
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillText(this.actions[i], 170, 350 + i * 25);
    }
    
    if (this.msgs.length > 0) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.rect(0, 300, 400, 100);
		ctx.fill();
		ctx.stroke();
        
        ctx.textAlign = "center";
        ctx.fillStyle = 'rgb(255, 255, 255)';
		for (var i = 0; i < this.msgs.length; i++) {
			ctx.fillText(this.msgs[i], 200, 330 + (i * 20)); 
		}
        ctx.fillText("Press F", 350, 380);
        ctx.textAlign = "left";  
    }
};

Battle.prototype.handleKeyPressed = function(e) {
    if (this.msgs.length === 0) {
        switch(e.keyCode) {
            case 70: //f key
                switch(this.selected) {
                    case 0:
                        this.dmgE = this.enemy.hurt(player.attack());
                        this.msgs = ["Enemy took " + this.dmgE + " damage."];
                        this.state = 1;
                        break;
                    case 1:
                        if (this.isBoss) {
                            this.msgs = ["Unable to run."];
                            this.state = 6;
                        } else {
                            this.msgs = ["You managed to run away."];
                            this.state = 5;
                        }
                        break;
                }
                break;
            case 38:
                this.selected--;
                if (this.selected < 0) {
                    this.selected = this.actions.length - 1;   
                }
                break;
            case 40:
                this.selected = (this.selected + 1) % this.actions.length;
                break;
        }
    } else {
        if (e.keyCode === 70) {
            this.msgs = [];
            switch (this.state) {
                case 0:
                    if(this.playerStart || this.isBoss) {
                        this.state = 1;
                    } else {
                        this.dmgE = null;
                        this.dmgP = player.hurt(this.enemy.attack());
                        this.msgs = ["You recieved " + this.dmgP + " damage"];
                        this.state = 2;
                    }
                    break;
                case 1:
                    if (this.enemy.dead) {
                        if (this.isBoss) {
                            this.msgs = ["You defeated the dragon."];
                        } else {
                            this.msgs = ["You defeated the enemy."];
                        }
						//playVictory();
                        this.msgs.push("Earned " + this.enemy.prize + " coins."); 
                        this.state = 3;   
                    } else {
                        this.dmgE = null;
                        this.dmgP = player.hurt(this.enemy.attack());
                        this.msgs = ["You recieved " + this.dmgP + " damage"];
                        this.state = 2;
                    }
                    break;
                case 2:
                    this.dmgP = null;
                    if (player.dead) {
                        this.state = 4;
						player.coins = Math.floor(player.coins / 2);
                        this.msgs = ["You died and lost half your coins."];
                    } else {
                        this.state = 1;
                    }
                    break;
                case 3:
                    this.win();
                    break;
                case 4:
                    this.lose();
                    break;
                case 5:
                    this.run();
                    break;
                case 6:
                    break;
            }  
        }   
    }
};

Battle.prototype.lose = function() {
    gameState = 5;  
    player.coins /= 2;
    battle = null;
	playLose();
};

Battle.prototype.win = function() {
    gameState = 1;
    player.coins += this.enemy.prize;
    enemies.splice(this.index, 1);
    battle = null; 
	playMaze();
};

Battle.prototype.run = function() {
    gameState = 1;
    player.run();
    battle = null;
	playMaze();
};

//Player and enemy parent class
Char = function(hp, atk, def, x, y) {
    this.hp = hp;
    this.maxHP = hp;
    this.atk = atk;
    this.def = def;
    this.x = x;
    this.y = y;
    this.moveCounter = 0;
    this.moveRate = TILE_SIZE / 8;  
    this.dead = false;
};

Char.prototype.attack = function() {
    var dmg = 0;
    var rand = 0;
    var hitChance = 80;
    for (var i = 0; i < this.atk; i++) {
        rand = Math.random() * 100;
        if (rand <= hitChance) {
            dmg += 1;   
        }
    }
    return dmg;
};

Char.prototype.hurt = function(dmg) {
    var rand = 0;
    var defendChance = 33;
    for (var i = 0; i < this.def; i++) {
        rand = Math.random() * 100;
        if (rand <= defendChance) {
            dmg--;   
        }
    }
    if (dmg <= 0) {
        return 0;   
    } else {
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.dead = true;   
        }
        return dmg;
    }
};

Enemy = function(lvl, tx, ty) {
    this.levelUp(lvl);
    Char.call(this, this.hp, this.atk, this.def, 160 - (tx * TILE_SIZE), 160 - (ty * TILE_SIZE));
    this.moving = false;
    this.dir = '';
    this.dirs = ['u','d','l','r',''];
};

Enemy.prototype = Object.create(Char.prototype);

Enemy.prototype.equals = function(other) {
    return (other.x === this.x && other.y === this.y);
};

//Enemies move randomly or not at all
Enemy.prototype.move = function() {
    var ind = Math.floor(Math.random() * this.dirs.length);
    var tx = getTileLoc(this.x ,true);
    var ty = getTileLoc(this.y ,false);
    
    do {
        this.dir = this.dirs[ind];
        ind = (ind + 1) % this.dirs.length;
    } while (!this.canMove(this.dir, tx, ty));
};

//nothing to prevent enemy from overlapping others
Enemy.prototype.canMove = function(dir, tx, ty) {
    switch(dir) {
        case 'u':
            return checkMove(tx, ty - 1);
        case 'd':
            return checkMove(tx, ty + 1);
        case 'r':
            return checkMove(tx + 1, ty);
        case 'l':
            return checkMove(tx - 1, ty);
        case '':
            return true;
    }
};

//Hardmode enemies have higher growth gains
Enemy.prototype.levelUp = function(lvl) {
    var hpGain = HARD_MODE ? 5 : 3;
    var atkGain = HARD_MODE ? 1.5 : 2;
    var defGain = HARD_MODE ? 2 : 2.5;
    this.hp = lvl;
    for (var i = 0; i < lvl; i++) {
        this.hp += Math.floor(Math.random() * hpGain);   
    }
    this.atk = Math.floor(lvl / atkGain);
    this.def = Math.floor(lvl / defGain);
    this.prize = lvl * 100;
};

Enemy.prototype.draw = function() {
    
	ctx.beginPath();
    if (this instanceof Boss) {
        ctx.fillStyle = 'rgb(71, 0, 0)';
    } else {
        ctx.fillStyle = 'rgb(222, 0, 0)';
    }
    ctx.arc(-this.x + 200 + player.x, -this.y + 200 + player.y,40,0,2*Math.PI);
	ctx.fill();
	ctx.stroke();
    
    if (this.dir !== '') {
        if (this.moveCounter < 8) {
            this.moveCounter++;
            switch(this.dir) {
                case 'r':
                  this.x -= this.moveRate;   
                  break;
                case 'l':
                  this.x += this.moveRate; 
                  break;
                case 'u':
                  this.y += this.moveRate; 
                  break;
                case 'd':
                  this.y -= this.moveRate;  
                  break;
            }
        } else {
            this.dir = '';
            this.moveCounter = 0;
            if (player.x === this.x && player.y === this.y) {
                battle = new Battle(this, -1, false);   
            }
        }
    }
};

Enemy.prototype.drawBattle = function(x, y) {
	ctx.beginPath();
    ctx.fillStyle = 'rgb(176, 0, 0)';
    ctx.arc(x, y,40,0,2*Math.PI); 
	ctx.fill();
	ctx.stroke();
};

//Enemy that doesn't move, and gives bigger prizes
Boss = function(lvl, x, y) {
    Enemy.call(this, lvl, x, y);
    this.dirs = [''];
    this.prize = lvl * 200;
};

Boss.prototype = Object.create(Enemy.prototype);

//Overwrite enemy move so boss doesn't move
//But still make sure player enters battle with boss
Boss.prototype.move = function() {
    if (player.x === this.x && player.y === this.y) {
        battle = new Battle(this, -1, false);   
    }  
};

//Store items
Item = function(name, desc, qty, price, func) {
    this.name = name;
    this.desc = desc;
    this.qty = qty;
    this.price = price;
    this.func = func;
    this.use = function() {this.func(); this.qty--; player.coins -= this.price;};
};

Item.prototype.canBuy = function() {
    return this.price <= player.coins;  
};

Maze = function() {
    /* states
    0: normal
    1: leaving
    2: getting hurt
    3: getting healed
    4: earning coins
    5: Enter boss Level
    */
    this.state = 0;  
    this.selected = 0;
    this.msgs = "";
    this.flashCount = 0;
    this.flashTime = 10;
    this.flashes = ['rgba(255, 0, 0, .4)', 'rgba(0, 255, 255, .4)', 'rgba(0, 255, 0, .4)', 'rgba(255, 255, 0, .4)'];
    this.numHeal = 0;
    this.numCoins = 0;
    this.numTrap = 0;
    this.numBosses = 0;
};

Maze.prototype.exit = function() {
    this.state = 1;  
};

Maze.prototype.handleKeyPressed = function(e) {
    if (this.state === 0) {
        player.handleKeyPressed(e);  
    } else if (this.state === 1) {
        switch(e.keyCode) {
            case 70:
                if (this.selected === 0) {
                    
                    if (level === maps.length - 1) {
                        gameState = 4;
						playVictory();
                    } else {
                        store.enter();      
                    }   
                } 
                this.state = 0;
                break;
            case 38:
                this.selected--;
                if (this.selected < 0) {
                    this.selected = 1;   
                }
                break;
            case 40:
                this.selected = (this.selected + 1) % 2;
                break;
        }
    } else {
        if (e.keyCode === 70 && this.flashCount > this.flashTime) {
            this.msgs = [];
            this.state = 0;
            this.flashCount = 0;
            if (player.hp <= 0) {
                gameState = 5;   
                player.coins /= 2;
				playLose();
            }
        }
    }
};

Maze.prototype.draw = function() {
	ctx.beginPath();
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.rect(0,0,400,400);
	ctx.fill();
	ctx.stroke();
    //background(0, 0, 0);
    this.drawBackground(player.x,player.y);
    
    if (this.state > 1) {
        this.flashCount++;
        if (this.flashCount < this.flashTime) {
			ctx.beginPath();
            ctx.fillStyle = this.flashes[this.state - 2];
            ctx.rect(0, 0, 400, 400);
			ctx.fill();
			ctx.stroke();
        }
    }
    
    for (var i = 0; i < enemies.length; i++) {
        enemies[i].draw();   
    }
    
    ctx.font = "20px Arial";
    player.draw();
	
	ctx.beginPath();
    ctx.fillStyle = 'rgba(120, 120, 120, .6)';
    ctx.rect(125, 0, 135, 53);
	ctx.fill();
	ctx.stroke();
	
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText("Coins: " + player.coins, 130, 20);
    ctx.fillText("Floor: " + FLOOR, 160, 45);
	
	ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 0, 0, .8)';
    ctx.rect(280, 0, 120, 30);
	ctx.fill();
	ctx.stroke();
	
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText("Enemies: " + enemies.length, 285, 20);
    
    if (this.state === 1) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.rect(0, 300, 400, 100);
		ctx.fill();
		ctx.stroke();
        
		ctx.beginPath();
        ctx.fillStyle = 'rgb(140, 140, 0)';
        ctx.rect(180, 335 + 25 * this.selected, 40, 25);
		ctx.fill();
		ctx.stroke();
        
        ctx.textAlign = "center";
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillText("Proceed to next floor?", 200, 330); 
        ctx.fillText("Yes", 200, 355); 
        ctx.fillText("No", 200, 380); 
        ctx.textAlign = "left"; 
    } 
    if (this.state > 1 && this.flashCount > this.flashTime) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.rect(0, 300, 400, 100);
		ctx.fill();
		ctx.stroke();
        
        ctx.textAlign = "center";
        ctx.fillStyle = 'rgb(255, 255, 255)';
		for (var i = 0; i < this.msgs.length; i++) {
			ctx.fillText(this.msgs[i], 200, 350 + (i * 20)); 
		}
        ctx.textAlign = "left";    
    }
};

Maze.prototype.drawBackground = function(x, y) {
    var tx = Math.round(getTileLoc(x, true));
    var ty = Math.round(getTileLoc(y, false));
    var dx = 80;
    var dy = 80;
    var w = 80;
    var h = 80;
    for (var r = ty-3; r <= ty+3; r++) {
        for (var c = tx-3; c <= tx+3; c++) {
            if (r >= 0 && r < LVL_SIZE && c >= 0 && c < LVL_SIZE) {
				ctx.beginPath();
                switch(maps[level][r][c]) {
                    case 1:
                        ctx.fillStyle = 'rgb(69, 69, 69)';
                        break;
                    case 0: 
                        ctx.fillStyle = 'rgb(201, 201, 201)';
                        break;
                    case 2:
                        ctx.fillStyle = 'rgb(201, 201, 201)';
                        break;
                    case 3: 
                        ctx.fillStyle = 'rgb(255, 255, 0)';
                        break;
                    case 4:
                        ctx.fillStyle = 'rgb(201, 201, 201)';
                        break;
                    case 5:
						ctx.fillStyle = 'rgb(201, 201, 201)';
                        break;
                }
                ctx.rect(x + c * dx, y + r * dy, w, h);
				ctx.fill();
				ctx.stroke();
            }
        }
    }    
};

Player = function() {
    Char.call(this, 15, 2, 1, 80, 80);
    this.moveCounter = 0;
    this.moveRate = TILE_SIZE / 8;
    this.startX = 80;
    this.startY = 80;
    this.moving = false;
    this.dir = '';
    this.coins = 0;
    this.tx = 0;
    this.ty = 0;
};  

Player.prototype = Object.create(Char.prototype);

//start player in a random corner of the map
Player.prototype.getNewStart = function() {
    var onRight = Math.round(Math.random());
    var onBottom = Math.round(Math.random());
    this.x = onRight ? 160 - 80 * (LVL_SIZE - 2) : 80;
    this.y = onBottom ? 160 - 80 * (LVL_SIZE - 2) : 80;
    this.startX = this.x;
    this.startY = this.y;
};

//start on bottom center of map
Player.prototype.startBoss = function() {
    this.x = 160 - 80 * (10);
    this.y = 160 - 80 * (20);
    this.startX = this.x;
    this.startY = this.y;
};

Player.prototype.run = function() {
    this.x = this.startX;
    this.y = this.startY;
};

Player.prototype.handleKeyPressed = function(e) {
    if (this.dir === '') {
        var tx = getTileLoc(this.x ,true);
        var ty = getTileLoc(this.y ,false);
        switch(e.keyCode) {
            case 39:
                if (checkMove(tx + 1, ty)) {
                    this.dir = 'r';
                }
                break;
            case 37:
                if (checkMove(tx - 1, ty)) {
                    this.dir = 'l';
                }
                break;
            case 38:
                if (checkMove(tx, ty - 1)) {
                    this.dir = 'u';
                }
                break;
            case 40:
                if (checkMove(tx, ty + 1)) {
                    this.dir = 'd';
                }
                break;
        }  
    }
};

Player.prototype.draw = function() {
	ctx.beginPath();
    ctx.arc(200, 200,40,0,2*Math.PI);
    ctx.fillStyle = 'rgb(29, 25, 153)';
	ctx.fill();
	ctx.stroke();
    
	ctx.beginPath();
    ctx.fillStyle = 'rgb(0, 0, 255, 150)';
    ctx.rect(0, 0, 105, 65);
	ctx.fill();
	ctx.stroke();
	
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText("HP: " + this.hp + "/" + this.maxHP, 10, 20);
    ctx.fillText("Atk:  " + this.atk, 10, 40);
    ctx.fillText("Def:  " + this.def, 10, 60);
    
    if (this.dir !== '') {
        if (this.moveCounter < 8) {
            this.moveCounter++;
            switch(this.dir) {
                case 'r':
                  this.x -= this.moveRate;   
                  break;
                case 'l':
                  this.x += this.moveRate;   
                  break;
                case 'u':
                  this.y += this.moveRate;   
                  break;
                case 'd':
                  this.y -= this.moveRate;   
                  break;
            }
        } else {
            this.dir = '';
            this.moveCounter = 0;
            this.tx = getTileLoc(this.x ,true);
            this.ty = getTileLoc(this.y ,false);
            if (maps[level][this.ty][this.tx] === 3) {
                maze.exit();
                // if (level === 10) {
                //     gameState = 4;
                // } else {
                //     store.enter();      
                // }
            } else {
                checkTile(this.tx, this.ty);
                for (var i = 0; i < enemies.length; i++) {
                    if (enemies[i].x === this.x &&
                        enemies[i].y === this.y) {
                        battle = new Battle(enemies[i], i, true); 
                        i = enemies.length;
                    }
                }
                moveEnemies();
            }
        }
    }
};

Player.prototype.drawBattle = function(x, y) {
	ctx.beginPath();
    ctx.arc(x, y,40,0,2*Math.PI);
    ctx.fillStyle = 'rgb(29, 25, 153)';
	ctx.fill();
	ctx.stroke();
};

StartScreen = function() {
    this.actions = ["New Game", "Hard Mode", "Endless", "Story"];
    this.selected = 0;
    this.story = false;
    this.storyText = [
        "Welcome, Challenger, ", "to the maze of riches.",
        "To the one who conquers the maze,", "glory and honour await.",
        "Many have attempted the maze and", "many still aim to conquer it.",
        "From those who have gone before, you", "have learned these things about the maze.",
        "1. It is filled with treasure hunters", "who get stronger the deeper you go.",
        "2. There is a rest area between levels", "of the maze where a merchant dwells.",
        "3. There are left over riches and potions", "from warriors who have gone before.",
        "4. Rumours speak of a terrible challenge", "before the reward may be claimed."
    ];
};

StartScreen.prototype.draw = function() {
	ctx.beginPath();
	ctx.fillStyle = 'rgb(92, 92, 92)';
	ctx.rect(0,0,400,400);
	ctx.fill();
	ctx.stroke();
    //background(92, 92, 92);
    if (!this.story) {
        
		ctx.fillStyle = 'rgb(255,255,255)';
        ctx.textAlign = "center";
        ctx.font = "40px Arial";
        ctx.fillText("Greedy Circles", 200, 100);
        ctx.font = "30px Arial";
        ctx.fillText("The maze of riches", 200, 150);
        
        ctx.font = "20px Arial";
        ctx.fillText("Use arrow keys to move", 200, 230);
        ctx.fillText("and f to confirm action", 200, 250);
        
        ctx.font = "12px Arial";
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 255)';
        ctx.rect(160, 275, 80, 110);
		ctx.fill();
		ctx.stroke();
        for (var i = 0; i < this.actions.length; i++) {
            if (i === this.selected) {
				ctx.beginPath();
                ctx.fillStyle = 'rgb(99, 102, 0)';
                ctx.rect(165, 280 + i * 25, 70, 25);
				ctx.fill();
				ctx.stroke();
            } 
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillText(this.actions[i], 200, 298 + i * 25);
        }
        ctx.textAlign = "left";
    } else {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 255)';
        ctx.rect(20, 0, 360, 400);
		ctx.fill();
		ctx.stroke();
        
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.font = "18px Arial";
        
        for (var i = 0; i < this.storyText.length; i += 2) {
            ctx.fillText(this.storyText[i], 30, 20 + i * 25);
            ctx.fillText(this.storyText[i+1], 30, 40 + i * 25);
        }
    }
};

StartScreen.prototype.handleKeyPressed = function(e) {
    switch(e.keyCode) {
        case 70: //f key
            if (this.story) {
                this.story = false;   
            } else {
                if (this.selected !== 3) {
                    startGame(this.selected);   
                } else {
                    this.story = true;   
                }
            }
            break;
        case 38:
            if (this.story) {
                return;   
            }
            this.selected--;
            if (this.selected < 0) {
                this.selected = this.actions.length - 1;   
            }
            break;
        case 40:
            if (this.story) {
                return;   
            }
            this.selected = (this.selected + 1) % this.actions.length;
            break;
    }  
};

Store = function() {
    this.selected = 0;
    this.confirm = false;
    this.confirmSel = 0;
    this.warning = false;
    this.state = 0;
    this.items = [
        new Item("HP +5", "Raise max HP by 5", 5, 1000, function() {player.maxHP += 5; player.hp += 5;}),
        new Item("Attack +1", "Raise attack by 1", 4, 1200, function() {player.atk += 1;}),
        new Item("Attack +2", "Raise attack by 2", 3, 2200, function() {player.atk += 2;}),
        new Item("Defence +1", "Raise defence by 1", 4, 800, function() {player.def += 1;}),
        new Item("Defence +2", "Raise defence by 2", 3, 1800, function() {player.def += 2;})
    ];
    this.msgs = ["Welcome."];
};

Store.prototype.close = function() {
    gameState = 1;
	playMaze();
};

//recreates info and hp refill to keep them relevant
Store.prototype.enter = function() {
    getNewLevel();
    this.msgs = ["Welcome."];
    this.state = 0;
    this.selected = 0;
 
    if (this.items.length > 1 && this.items[1].name === "Info") {
        this.items.splice(1,1);
    }

    if (this.items.length > 0 && (this.items[0].name === "HP refill" || this.items[0].name === "Info")) {
        this.items.splice(0,1);
    } 
	
    this.items.unshift(new Item("Info", "Get info about the next level", 1, 300, function() {store.explainLvl();}));
    this.items.unshift(new Item("HP refill", "Restore all HP (costs half your coins)", 1, Math.floor(player.coins / 2), function() {player.hp = player.maxHP;}));
    gameState = 3;
	playShop();
};

Store.prototype.explainLvl = function() {
    this.state = 1;
    if (level !== maps.length - 1) {
        this.msgs = ["The next level contains:"];
        this.msgs.push(maze.numHeal + " potions");
        this.msgs.push(maze.numCoins + " coin stashes");
        if (maze.numBosses > 0) {
            this.msgs.push(maze.numBosses + " monsters");   
        }
        if (maze.numTrap > 0)  {
            this.msgs.push("And a few suprises. heheheh");
        }
    } else {
        this.msgs = ["You are near the end, yes... "];
        this.msgs.push("But will you survive? hehehe");
    }
};

Store.prototype.draw = function() {
	ctx.beginPath();
	ctx.fillStyle = 'rgb(99, 99, 99)';
	ctx.rect(0,0,400,400);
	ctx.fill();
	ctx.stroke();
    
    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText("Coins: " + player.coins, 200, 30);
    
    ctx.textAlign = "left";
    ctx.font = "14px Arial";
    if (this.items.length > 0) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 255)';
        ctx.rect(50, 50, 300, this.items.length * 40);
		ctx.fill();
		ctx.stroke();
		
		ctx.beginPath();
        ctx.fillStyle = 'rgb(99, 102, 0)';
        ctx.rect(50, 50 + this.selected * 40, 300, 42);
		ctx.fill();
		ctx.stroke();
        for (var i = 0; i < this.items.length; i++) {
            ctx.fillStyle = 'rgb(255, 255, 255)';
            
            ctx.fillText(this.items[i].name, 60, 70 + i * 40);
            ctx.fillText("qty: " + this.items[i].qty, 180, 70 + i * 40);
            ctx.fillText("Price: " + this.items[i].price, 250, 70 + i * 40);
            ctx.fillText(this.items[i].desc, 80, 85 + i * 40);
        }
    } else {
		ctx.beginPath();
        ctx.fillStyle = 'rgba(74, 74, 74, .9)';
        ctx.rect(50, 150, 300, 100);
		ctx.fill();
		ctx.stroke();
        
        ctx.font = "26px Arial";
        
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillText("I have nothing left to sell.", 60, 200);   
        this.selected = 7;
		ctx.beginPath();
        ctx.fillStyle = 'rgb(99, 102, 0)';
        ctx.rect(50, 50 + this.selected * 40, 300, 42);
		ctx.fill();
		ctx.stroke();
    }
    
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.textAlign = "center";
    ctx.font = "30px Arial";
    ctx.fillText("Finish Shopping", 200, 360);
    
    if (this.confirm) {
		ctx.beginPath();
        ctx.fillStyle = 'rgba(74, 74, 74, 0.9)';
        ctx.rect(50, 150, 300, 100);
		ctx.fill();
		ctx.stroke();
        
		ctx.beginPath();
        ctx.fillStyle = 'rgb(135, 135, 0)';
        ctx.rect(175, 188 + 30 * this.confirmSel, 50, 25);
		ctx.fill();
		ctx.stroke();
        
        ctx.font = "26px Arial";
        
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillText("Purchase " + this.items[this.selected].name + "?", 200, 180);
        ctx.fillText("Yes", 200, 210);
        ctx.fillText("No", 200, 240);
    } else if (this.warning) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(74, 74, 74)';
        ctx.rect(30, 150, 340, 100);
		ctx.fill();
		ctx.stroke();
        
        ctx.font = "26px Arial";
        
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.fillText("Funds are too low to buy", 200, 180);  
        ctx.fillText(this.items[this.selected].name, 200, 200);  
    }
    if (this.msgs.length > 0) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(74, 74, 74)';
        ctx.rect(30, 50, 340, 300);
		ctx.fill();
		ctx.stroke();
        
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 255, 0)';
        ctx.arc(80, 100,40,0,2*Math.PI);
		ctx.fill();
		ctx.stroke();
        
        ctx.font = "26px Arial";
        ctx.fillStyle = 'rgb(255, 255, 255)';
		for (var i = 0; i < this.msgs.length; i++) {
			ctx.fillText(this.msgs[i], 200, 170 + (26 * i));    
		}
    }
    ctx.textAlign = "left";
};

Store.prototype.handleKeyPressed = function(e) {
    switch(e.keyCode) {
        case 70: //f key
            if (this.msgs.length > 0) {
                if (this.state === 2) {
                    this.close();   
                } else {
                    this.state = 1;   
                }
                this.msgs = [];   
                return;
            }
            if (this.selected === 7) {
                this.state = 2;
                this.msgs = ["Thanks for coming."];
            } else {
                if(this.warning) {
                    this.warning = false;   
                } else if (this.confirm) {
                    if (this.confirmSel === 0) {
                        this.items[this.selected].use();
                        if (this.items[this.selected].qty === 0) {
                            this.items.splice(this.selected, 1);
                            this.selected = 0;
                        }
                    }
                    this.confirm = false;
                } else {
                    if (this.items[this.selected].canBuy()) {
                        this.confirm = true;   
                    } else {
                        this.warning = true;   
                    }
                }
            }
            break;
        case 38:
            if (this.items.length === 0) {
                return;   
            }
            if (this.confirm) {
                if (this.confirmSel === 0) {
                    this.confirmSel = 1;   
                } else {
                    this.confirmSel = 0;   
                }
            } else {
                if (this.selected === 7) {
                    this.selected = this.items.length -1;   
                } else {
                    this.selected--;
                    if (this.selected < 0) {
                        this.selected = 7;   
                    }
                }
            }
            break;
        case 40:
            if (this.items.length === 0) {
                return;   
            }
            if (this.confirm) {
                if (this.confirmSel === 0) {
                    this.confirmSel = 1;   
                } else {
                    this.confirmSel = 0;   
                }
            } else {
                if (this.selected === 7) {
                    this.selected = 0;   
                } else if (this.selected === this.items.length - 1) {
                    this.selected = 7;
                } else {
                    this.selected++;
                }
            }
    }  
};

player = new Player();
startScreen = new StartScreen();
store = new Store();
maze = new Maze();
var moveCounter = 0;
var moveX = 10;
var moving = false;

var kPressed = function(e){
    if (gameState === 0) {
        startScreen.handleKeyPressed(e);   
    } else if (gameState === 2) {
        battle.handleKeyPressed(e);   
    } else if (gameState === 3) {
        store.handleKeyPressed(e);
    } else if (gameState === 4 || gameState === 5) {
        if (e.keyCode === 70) {
            gameState = 0;   
			playTitle();
        }
    } else {
        maze.handleKeyPressed(e);
    }
};

var draw = function() {
    if (gameState === 0) {
        startScreen.draw();
    }
    
    if (gameState === 1) {
        maze.draw();
    }
    
    if (gameState === 2) {
        battle.draw();   
    }
    
    if (gameState === 3) {
        store.draw();   
    }
    
    if (gameState === 4) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(145, 145, 145)';
		ctx.rect(0,0,400,400);
		ctx.fill();
		ctx.stroke();
		
        ctx.fillStyle = 'rgb(255, 255, 0)';
        ctx.font = "50px Arial";
        ctx.fillText("Congratulations", 30, 150);
        ctx.font = "40px Arial";
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillText("Your coins", 100, 210);
        
        ctx.textAlign = "center";
        ctx.fillText(player.coins, 200, 250);
        ctx.textAlign = "left";
        
        ctx.font = "20px Arial";
        var msgs;
        if (HARD_MODE) {
            if (player.coins < 10000) {
                msgs = ["Get over 10000 coins to unlock", "a secret message."]; 
            } else {
                msgs = ["The maze features the japanese words"];
                msgs.push("北, 南, 東, 西, 電車,", "日本, 東京, 夏, 二千二十年");
            }
        } else if (ENDLESS) {
            if (player.coins > 20000) {
                msgs = ["The words in the maze translate to"];
                msgs.push("North, South, East, West, Train,", "Japan, Tokyo, Summer, Year 2020.");
                msgs.push("Don't miss the Tokyo, Japan", "2020 Summer Olympics!");
            } else {
                msgs = ["Get a over 20000 coins to unlock", "a secret message."];  
            }
        } else {
            msgs = ["Awesome job. Now try Hard Mode."];  
        }
		for (var i = 0; i < msgs.length; i++) {
			ctx.fillText(msgs[i], 20, 300 + (i * 20));
		}
    }
    
    if (gameState === 5) {
		ctx.beginPath();
        ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.rect(0,0,400,400);
		ctx.fill();
		ctx.stroke();
		
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.font = "50px Arial";
        ctx.fillText("Game Over", 65, 150);
        ctx.font = "40px Arial";
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillText("Your coins", 100, 250);
        
        ctx.textAlign = "center";
        ctx.fillText(player.coins, 200, 300);
        ctx.textAlign = "left";
    }
};

playTitle();

setInterval(function(){draw();}, 16);








