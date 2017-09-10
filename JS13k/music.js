
var applySeq = function(notes, seq, times) {
	for (var i = 0; i < times; i++) {
		Array.prototype.push.apply(notes, seq);
	}
};

// create a new Web Audio API context
var ac = new AudioContext();

// set the playback tempo (120 beats per minute)
var tempo = 240;

// Title Sequence
var note2 = new Note('E4 q');
var c3 = new Note('C3 q');
var d3 = new Note('D3 q');
var e3 = new Note('E3 q');
var f3 = new Note('F3 q');
var g3 = new Note('G3 q');
var a3 = new Note('A3 q');
var b3 = new Note('B3 q');
var c4 = new Note('C4 q');
var d4 = new Note('D4 q');
var e4 = new Note('E4 q');
var f4 = new Note('F4 q');
var g4 = new Note('G4 q');
var titleSeq1 = [new Note('A3 h'), e4, e4, e4, e4, d4, c4];

var notes = [];
for (var i = 0; i < 3; i++) {
	Array.prototype.push.apply(notes, titleSeq1);
	if (i < 2) {
		notes.push(d4);
	}
}
notes.push(new Note('D4 h'), new Note('D4 e'), new Note('E4 e'), new Note('D4 e'), new Note('C4 h'), b3);

var titleSequence = new Sequence(ac, tempo, notes);

// Maze Sequence
var mazeNotes = [];
var maze1 = [new Note('A3 h'), b3, c4];
var maze2 = [new Note('E3 h'), f3, g3];
var maze3 = [a3, e4, d4, b3, c4, new Note('A3 h')];

applySeq(mazeNotes, maze1, 2);
mazeNotes.push(new Note('F3 h'), g3, a3, g3, f3, g3);	

applySeq(mazeNotes, maze2, 2);
mazeNotes.push(a3);

applySeq(mazeNotes, maze3, 3);
mazeNotes.pop();

mazeNotes.push(a3, new Note('Ab3 h'), new Note('Ab3 q'), a3, b3);
	
var mazeSequence = new Sequence( ac, tempo, mazeNotes);

//Battle Sequence
var battleNotes = [];
var battle1 = [a3, a3, new Note('A3 e'), new Note('C4 e'), new Note('B3 e'), new Note('A3 e')];
var battle2 = [f3, f3, new Note('F3 e'), new Note('A3 e'), new Note('G3 e'), new Note('F3 e')];

applySeq(battleNotes, battle1, 2);
applySeq(battleNotes, battle2, 2);

battleNotes.push(f3, f3, new Note('F3 e'), new Note('G3 e'), new Note('A3 e'), new Note('F3 e'), 
	g3, g3, new Note('G3 e'), new Note('A3 e'), new Note('Bb3 e'), new Note('C4 e'));

var battleSequence = new Sequence( ac, tempo, battleNotes);	

//Victory Sequence
var vicNotes = [new Note('G4 h'), g4, g4, f4, e4, f4, d4,
	new Note('F4 e'), new Note('F4 e'), f4, e4, d4, e4, c4, 
	new Note('E4 e'), new Note('E4 e'), e4, d4, c4, new Note('D4 q'), new Note('B3 h'), b3,  
	d4, c4, b3, c4];

var vicSequence = new Sequence( ac, tempo, vicNotes);

//Boss Sequence
var bossNotes = [new Note('A2 q'), new Note('E3 e'), new Note('D3 e'), new Note('C3 e'), new Note('B2 e'), c3, d3, d3, 
	new Note('A3 e'), new Note('G3 e'), new Note('F3 e'), new Note('E3 e'), new Note('F3 e'), g3, g3, new Note('D4 e'), 
	new Note('C4 e'), new Note('B3 e'), new Note('A3 e'), new Note('B3 e'), c4, c4, b3, b3];

var bossSequence = new Sequence( ac, tempo, bossNotes);

var shopNotes = [
	a3, e3, c4, b3, c4, e3, d3, d3, 
	b3, a3, b3, d3, c3, c3, a3, g3
];

var shopSequence = new Sequence(ac, 300, shopNotes);

//Game Over Sequence
var loseNotes = [
	new Note('A2 q'), e3, d3, new Note('B2 q'), new Note('C3 h'),
	new Note('A2 q'), e3, d3, new Note('B2 q'), new Note('C3 h'), new Note('A2 q'), new Note('Ab2 h'),
	new Note('Ab2 q'), new Note('A2 q'), new Note('B2 h')
];

var loseSequence = new Sequence(ac, tempo, loseNotes); 

var playMusic = true;
var activeSeq = 0;
var sequences = [titleSequence, mazeSequence, bossSequence, vicSequence, battleSequence, shopSequence, loseSequence];

for(var i = 0; i < sequences.length; i++) {
	sequences[i].loop = true;
	sequences[i].staccato = 0.1;
	sequences[i].gain.gain.value = 0.01;
	if (i === 3) {
		sequences[i].createCustomWave([-1,0,1,0,-1,0,1]);
	} else {
		sequences[i].createCustomWave([-0.8, 1, 0.8, 0.8, -0.8, -0.8, -1]);
	}
}

// play each sequence
var playTitle = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	titleSequence.play(ac.currentTime + ( 60 / tempo ) * 2);
	activeSeq = 0;
}

var playMaze = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	mazeSequence.play(ac.currentTime + ( 60 / tempo ) * 1);
	activeSeq = 1;
}

var playBattle = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	bossSequence.play(ac.currentTime + ( 60 / tempo ) * 1);
	activeSeq = 2;
}

var playVictory = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	vicSequence.play(ac.currentTime + ( 60 / tempo ) * 1);
	activeSeq = 3;
}

var playBoss = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	battleSequence.play(ac.currentTime + ( 60 / tempo ) * 1);
	activeSeq = 4;
}

var playShop = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	shopSequence.play(ac.currentTime + ( 60 / tempo ) * 1);
	activeSeq = 5;
}

var playLose = function() {
	if (!playMusic) {
		return;
	}
	stopMusic();
	loseSequence.play(ac.currentTime + ( 60 / tempo ) * 1);
	activeSeq = 6;
}

var stopMusic = function() {
	sequences[activeSeq].stop();
}

var toggleMusic = function() {
	if (playMusic) {
		sequences[activeSeq].stop();
	} else {
		sequences[activeSeq].play()
	}
	playMusic = !playMusic;
}















