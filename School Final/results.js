//Javascript for results page

"use strict"; //interpret document contents in JavaScript strict mode

/* global variables */
var formValidity = true;
var invColor = "rgb(255,233,233)";
var favorites = [];
var nonFavorites = [];
var displayLogin = false;

//function that alerts the user whether they were correct or not.
function checkBejeweledAnswer() {
	//the correct x and y positions for bejeweled
	var XAnswer = 7;
	var YAnswer = 6;
	var errMsg = "";
	var errorDiv = document.querySelector("#bejewled .errorMessage");
	var userX = document.getElementById("xPos");
	var userY = document.getElementById("yPos");
	var goodX = true;
	var goodY = true;
	userX.style.background = "";
	userY.style.background = "";
	errorDiv.innerHTML = "";
	errorDiv.style.display = "none";
	try {
		if (isNaN(userX.value) || userX.value === "") {
			errMsg += "Enter number for X value. ";
			goodX = false;
		}
		if (isNaN(userY.value) || userY.value === "") {
			errMsg += "Enter number for Y value.";
			goodY = false;
		}
		
		if (goodX && userX.value != XAnswer) {
			errMsg += "Bad X value.";
			goodX = false;
		}
		if (goodY && userY.value != YAnswer) {
			errMsg += "Bad Y value.";
			goodY = false;
		}
		if (!goodX || !goodY) {
			throw errMsg;
		}
	} catch (msg) {
		if (!goodX) {
			userX.style.background = invColor;
		}
		if (!goodY) {
			userY.style.background = invColor;
		}
		errorDiv.style.display = "block";
		errorDiv.innerHTML = msg
		formValidity = false;
	}
}

//this function alerts the user as to whether they were correct or not.
function checkSudokuSolution() {
	//answer to center box of sudoku puzzle
	var sudokuSolution = 674539218;
	var userSolution = document.getElementById("sudokuSolution");
	var errorDiv = document.querySelector("#sudoku .errorMessage");
	userSolution.style.background = "";
	errorDiv.innerHTML = "";
	errorDiv.style.display = "none";
	try {
		if (isNaN(userSolution.value) || userSolution.value === "") {
			throw "Enter a number.";
		}
		if (sudokuSolution != userSolution.value) {
			throw "Did you enter your solution for the center 3 x 3 as one large number?";
		}
	} catch (msg) {
		userSolution.style.background = invColor;
		errorDiv.style.display = "block";
		errorDiv.innerHTML = msg;
		formValidity = false;
	}
}

//function that tells the user whether they answered the riddle correctly or not.
function checkRiddleAnswer() {
	var answer = "nothing";
	var userAnswer = document.getElementById("riddleSolution");
	var errorDiv = document.querySelector("#riddle .errorMessage");
	userAnswer.style.background = "";
	errorDiv.innerHTML = "";
	errorDiv.style.display = "none";
	try {
		if (answer !== userAnswer.value.toLowerCase()) {
			throw "That is incorrect";
		}
	} catch (msg) {
		userAnswer.style.background = invColor;
		errorDiv.style.display = "block";
		errorDiv.innerHTML = msg;
		formValidity = false;
	}
}

//checks the users answer to the chalenge.
function checkSpellingErrorAnswer() {
	//total number of spelling errors on the page
	var errorCount = 8;
	var count = document.getElementById('errorCount');
	var errorDiv = document.querySelector("#spellingErrors .errorMessage");
	count.style.background = "";
	errorDiv.innerHTML = "";
	errorDiv.style.display = "none";
	try {
		if (isNaN(count.value) || count.value === "") {
			throw "Enter a number.";
		}
		if (count < 0) {
			throw "Enter positive number";
		}
		if (count.value != errorCount) {
			throw "That is incorrect";
		}
	}
	catch (msg) {
		count.style.background = invColor;
		errorDiv.style.display = "block";
		errorDiv.innerHTML = msg;
		formValidity = false;
	}
}

//function that checks all the fields identified with the class number
function validateNumFields() {	
	checkSpellingErrorAnswer();
	checkRiddleAnswer();
	checkSudokuSolution();
	checkBejeweledAnswer();
}

//function that checks all the fields identified with the class text
function validateTextFields() {
	checkRiddleAnswer();
}

function validateLogin() {
	validateUsername();
	validatePassword();
	validateEmail();
}

function validateUsername() {
	var unInput = document.getElementById("username");
	var errorDiv = document.getElementById("usernameError");
	try {
		//if (unInput.value.length < 4) {
		if (/.{4,}/.test(unInput.value) === false) {
			throw "Username must be at least 4 characters long.";
		} else if (/\W/.test(unInput.value) === true) {
			throw "Username must contain only letters and numbers";
		}

		// remove any username error styling and message
		unInput.style.background = "";
		errorDiv.style.display = "none";
		errorDiv.innerHTML = "";
	}
	catch(msg) {
		// display error message
		errorDiv.style.display = "block";
		errorDiv.innerHTML = msg;
		// change input style
		unInput.style.background = "rgb(255,233,233)";
		formValidity = false;
	}
}

// validate entered password
function validatePassword() {
	var password = document.getElementById("password");
	var errorDiv = document.getElementById("passwordError");
	try {
		//if (password.value.length < 8) {
		if (/.{8,}/.test(password.value) === false) {
			throw "Password must be at least 8 characters long.";	
		} else if (/[A-Z]/.test(password.value) === false) {
			throw "Password must contain at least one capital letter";
		} else if (/[a-zA-Z]/.test(password.value) === false) {
			throw "Password must contain at least one letter";
		} else if (/\d/.test(password.value) === false) {
			throw "Password must contain at least one number";
		}

		// remove any password error styling and message
		password.style.background = "";
		errorDiv.style.display = "none";
		errorDiv.innerHTML = "";
	}
	catch(msg) {
		// display error message
		errorDiv.style.display = "block";
		errorDiv.innerHTML = msg;
		// change input style
		password.style.background = "rgb(255,233,233)";    
		formValidity = false;
	}
}

// validate entered email
function validateEmail() {
	var emailInput = document.getElementById("email");
	var errorDiv = document.getElementById("emailError");
	var emailCheck = /^[_\w\-]+(\.[_\w\-]+)*@[\w\-]+(\.[\w\-]+)*(\.[\D]{2,6})$/;
	try {
		if (emailCheck.test(emailInput.value) === false) {
			throw "Please provide a valid email address.";
		}

		// remove any email error styling and message
		emailInput.style.background = "";
		errorDiv.innerHTML = "";
		errorDiv.style.display = "none";
	}
	catch(msg) {
		// display error message
		errorDiv.innerHTML = msg;
		errorDiv.style.display = "block";
		// change input style
		emailInput.style.background = "rgb(255,233,233)";
		formValidity = false;
	}
}

//function to validate the form and then submit it if valid
function validateForm(evt) {
	if (evt.preventDefault) {
		evt.preventDefault(); //prevent form from submitting
	} else {
		evt.returnValue = false; //prevent from from submitting in IE8
	}
	formValidity = true; //reset value for evalidation
	
	validateNumFields();
	validateTextFields();
	if (displayLogin) {
		validateLogin();
	}
	
	if (formValidity === true) {
		document.getElementById("errorText").innerHTML = "";
		document.getElementById("errorText").style.display = "none"
		document.getElementsByTagName("form")[0].submit();
	} else {
		document.getElementById("errorText").innerHTML = "Please fix the indicated problems and then resubmit your order.";
		document.getElementById("errorText").style.display = "block";
		scroll(0,0);
	}
}

//adds the checked items to the array of favorites and nonFavorites and 
//changes the links on the page accordingly
function addPageToFavorites() {
	favorites = [];
	nonFavorites = [];
	var pages = document.getElementsByName("pages");
	for (var i = 0; i < pages.length; i++) {
		if (pages[i].checked) {
			favorites.push(pages[i].value);
		} else {
			nonFavorites.push(pages[i].value);
		}
	}
	
	var links = document.querySelectorAll("aside ul li a");
	for (var i = 0; i < favorites.length; i++) {
		switch (favorites[i]) {
			case "Math":
				links[1].id="favorite";
				links[1].innerHTML = "Math Puzzles *favorite";
				break;
			case "English":
				links[2].id="favorite";
				links[2].innerHTML = "English Puzzles *favorite";
				break;
			case "Games":
				links[3].id="favorite";
				links[3].innerHTML = "Puzzle Games *favorite";
				break;
			case "Web Safety":
				links[5].id="favorite";
				links[5].innerHTML = "Web Safety *favorite";
				break;
			case "Date Calculator":
				links[6].id="favorite";
				links[6].innerHTML = "Date Calculator *favorite";
				break;
		}
	}
	
	for (var i = 0; i < nonFavorites.length; i++) {
		switch (nonFavorites[i]) {
			case "Math":
				links[1].id="";
				links[1].innerHTML = "Math Puzzles";
				break;
			case "English":
				links[2].id="";
				links[2].innerHTML = "English Puzzles";
				break;
			case "Games":
				links[3].id="";
				links[3].innerHTML = "Puzzle Games";
				break;
			case "Web Safety":
				links[5].id="";
				links[5].innerHTML = "Web Safety";
				break;
			case "Date Calculator":
				links[6].id="";
				links[6].innerHTML = "Date Calculator";
				break;
		}
	}
	convertToString();
}

//converts favorites array to a string to tell the user what their current favorites are
function convertToString() {
	//convert favorites array to strings
	var arrayString = favorites.toString();
	if (arrayString !== "") {
		document.getElementById("favoritesList").innerHTML = 
			"Your favorites are: " + arrayString;
	} else {
		document.getElementById("favoritesList").innerHTML = "";
	}
}

function showLogin() {
	displayLogin = !displayLogin;
	var notDisplayed = document.getElementsByClassName("hideOnCheck");
	if (displayLogin) {
		for (var i = 0; i < notDisplayed.length; i++) {
			notDisplayed[i].style.display = "block";
		}
	} else {
		for (var i = 0; i < notDisplayed.length; i++) {
			notDisplayed[i].style.display = "none";
		}
	}
}

//create event listeners
function createEventListeners() {
	//code to add the submit event listener to the form.
	var form = document.getElementsByTagName("form")[0];
	if (form.addEventListener) {
		form.addEventListener("submit", validateForm, false);
	} else if (form.attachEvent) {
		form.attachEvent("onsubmit", validateForm);
	}
	
	var pages = document.getElementsByName("pages");
	if (pages[0].addEventListener) {
		for (var i = 0; i < pages.length; i++) {
			pages[i].addEventListener("change", addPageToFavorites, false);
		}
	} else if (pages[0].attachEvent) {
		for (var i = 0; i < pages.length; i++) {
			pages[i].attachEvent("onchange", addPageToFavorites);
		}
	}
	
	var subscribeCheck = document.getElementById("subscribeCheck");
	if (subscribeCheck.addEventListener) {
		subscribeCheck.addEventListener("change", showLogin, false);
	} else if (subscribeCheck.attachEvent) {
		subscribeCheck.attachEvent("onchange", showLogin);
	}
}

//create the load event listeners that canns createEventListeners
if (window.addEventListener) {
   window.addEventListener("load", createEventListeners, false);
} else if (window.attachEvent) {
   window.attachEvent("onload", createEventListeners);
}