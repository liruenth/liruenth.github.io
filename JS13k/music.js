
var applySeq = function(notes, seq, times) {
	for (var i = 0; i < times; i++) {
		Array.prototype.push.apply(notes, seq);
	}
};

// create a new Web Audio API context
var ac = new AudioContext();

// set the playback tempo (120 beats per minute)
var tempo = 180;

// Title Sequence
var note2 = new Note('E4 q');
var titleSeq1 = [new Note('A3 h'), note2, note2, note2, note2, new Note('D4 q'), new Note('C4 q')];

var notes = [];
for (var i = 0; i < 3; i++) {
	Array.prototype.push.apply(notes, titleSeq1);
	if (i < 2) {
		notes.push(new Note('D4 q'));
	}
}
notes.push(new Note('D4 h'), new Note('D4 e'), new Note('E4 e'), new Note('D4 e'), new Note('C4 h'), new Note('B3 q'));

var titleSequence = new Sequence( ac, tempo, notes);

// Maze sequence
var mazeNotes = [];
var maze1 = [new Note('A3 h'), new Note('B3 q'), new Note('C4 q')];
var maze2 = [new Note('E3 h'), new Note('F3 q'), new Note('G3 q')];
var maze3 = [new Note('A3 q'), new Note('E4 q'), new Note('D4 q'), new Note('B3 q'), new Note('C4 q'), new Note('A3 h')];

applySeq(mazeNotes, maze1, 2);
mazeNotes.push(new Note('F3 h'), new Note('G3 q'), new Note('A3 q'), new Note('G3 q'), new Note('F3 q'), new Note('G3 q'));	

applySeq(mazeNotes, maze2, 2);
mazeNotes.push(new Note('A3 q'));

applySeq(mazeNotes, maze3, 3);
mazeNotes.pop();

mazeNotes.push(new Note('A3 q'), new Note('Ab3 h'), new Note('Ab3 q'), new Note('A3 q'), new Note('B3 q'));
	
var mazeSequence = new Sequence( ac, tempo, mazeNotes);

//Battle Sequence
var battleNotes = [];
var battle1 = [new Note('A3 q'), new Note('A3 q'), new Note('A3 e'), new Note('C4 e'), new Note('B3 e'), new Note('A3 e')];
var battle2 = [new Note('F3 q'), new Note('F3 q'), new Note('F3 e'), new Note('A3 e'), new Note('G3 e'), new Note('F3 e')];

applySeq(battleNotes, battle1, 2);
applySeq(battleNotes, battle2, 2);

battleNotes.push(new Note('F3 q'), new Note('F3 q'), new Note('F3 e'), new Note('G3 e'), new Note('A3 e'), new Note('F3 e'), 
	new Note('G3 q'), new Note('G3 q'), new Note('G3 e'), new Note('A3 e'), new Note('Bb3 e'), new Note('C4 q'));

var battleSequence = new Sequence( ac, tempo, battleNotes);	

//Victory Sequence
var vicNotes = [new Note('G4 h'), new Note('G4 q'), new Note('G4 q'), new Note('F4 q'), new Note('E4 q'), new Note('F4 q'), new Note('D4 q'),
	new Note('F4 e'), new Note('F4 e'), new Note('F4 q'), new Note('E4 q'), new Note('D4 q'), new Note('E4 q'), new Note('C4 q'), 
	new Note('E4 e'), new Note('E4 e'), new Note('E4 q'), new Note('D4 q'), new Note('C4 q'), new Note('D4 q'), new Note('B3 h'), new Note('B3 q'),  
	new Note('D4 q'), new Note('C4 q'), new Note('B3 q'), new Note('C4 q')];

var vicSequence = new Sequence( ac, tempo, vicNotes);

//Boss Sequence
var bossNotes = [new Note('A2 q'), new Note('E3 e'), new Note('D3 e'), new Note('C3 e'), new Note('B2 e'), new Note('C3 q'), new Note('D3 q'), new Note('D3 q'), 
	new Note('A3 e'), new Note('G3 e'), new Note('F3 e'), new Note('E3 e'), new Note('F3 e'), new Note('G3 q'), new Note('G3 q'), new Note('D4 e'), 
	new Note('C4 e'), new Note('B3 e'), new Note('A3 e'), new Note('B3 e'), new Note('C4 q'), new Note('C4 q'), new Note('B3 q'), new Note('B3 q')];

var bossSequence = new Sequence( ac, tempo, bossNotes);
	
// disable looping
titleSequence.loop = true;
titleSequence.staccato = 0.1;

mazeSequence.loop = true;
mazeSequence.staccato = 0.1;

battleSequence.loop = true;
battleSequence.staccato = 0.1;

vicSequence.loop = true;
vicSequence.staccato = 0.1;

bossSequence.loop = true;
bossSequence.staccato = 0.1;


// play it
var playTitle = function() {
	titleSequence.play();
}

var playMaze = function() {
	mazeSequence.play();
}

var playBattle = function() {
	bossSequence.play();
}

var playVictory = function() {
	vicSequence.play();
}

var playBoss = function() {
	battleSequence.play();
}















