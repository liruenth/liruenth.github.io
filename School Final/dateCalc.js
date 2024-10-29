/* 		Javascript 6th Edition
 * 		Chapter 7
 *		Case Project
 
 *		Date Calculator
 *		Author: Johnny Angell
 *		Date: 10/12/15
 
 *		Filename: dateCalc.js
 */
"use strict"; //interpret contents in javascript strict mode

var todaysDate = new Date();
var httpRequest = false;

//function to calculate the time elapsed since a date entered by the user
//this is probably wrong because I would assume that we would make the time elapsed accurate
//but the book only says to do months after 31 days so...
function calculate() {
	
	//var date = new Date(document.getElementById("date").value);
	var date = new Date($("#date").val());
	//document.getElementById("timeSinceError").style.display = "none";
	$("#timeSinceError").hide();
	
	var dateToday = new Date();
	dateToday = Date.UTC(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate(),
							12, 0, 0);
	var dateSince = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(),
							12, 0, 0); //start counting from noon
							
	try {
		if ((dateToday - dateSince) <= 0) {
			throw "Pick a past date.";
		}
		
		//days
		var daysSince = Math.floor((dateToday - dateSince) / 86400000);
		daysSince--;
		//months
		var monthsSince = Math.floor(daysSince / 31);
		//years
		var yearsSince = Math.floor(monthsSince / 12);
		
		//subtract months from days
		daysSince -= (31 * monthsSince);
		
		//subtract years from months
		monthsSince -= (12 * yearsSince);
		
		// document.getElementById("years").innerHTML = yearsSince;
		// document.getElementById("months").innerHTML = monthsSince;
		// document.getElementById("days").innerHTML = daysSince;
		// document.getElementById("enteredDate").innerHTML = (date.getMonth() + 1) + "/" + (date.getDate() + 1) + "/" + date.getFullYear();
		// document.getElementById("timeSince").style.display = "block";
		$("#years").html(yearsSince);
		$("#months").html(monthsSince);
		$("#days").html(daysSince);
		$("#enteredDate").html((date.getMonth() + 1) + "/" + (date.getDate() + 1) + "/" + date.getFullYear());
		$("#timeSince").show();
	} catch (msg) {
		// document.getElementById("timeSinceError").innerHTML = msg;
		// document.getElementById("timeSinceError").style.display = "block";
		$("#timeSinceError").html(msg);
		$("#timeSinceError").show();
	}
	
}

function getRequestObject() {
	try {
		httpRequest = new XMLHttpRequest();
	} catch (requestError) {
		return false;
	}
	return httpRequest;
}

function viewMoonPhases() {
	var date = new Date(document.getElementById("date").value);
    date.setDate(date.getDate()+1);
	if (!httpRequest) {
		httpRequest = getRequestObject();
	}
	httpRequest.abort();
    httpRequest.open("get","https://api.aerisapi.com/sunmoon/moonphases/mesa,az?client%20id=vXWl95B9rul7gDUDDuPqI&client%20secret=p3vyaVct8SDj2utbgDBqNPlqegs5GUY4meDcdm7G&from=" + date.toLocaleDateString(), true);
    httpRequest.send(null);
    httpRequest.onreadystatechange = displayData;
}

function displayData() {
	if (httpRequest.readyState === 4 && httpRequest.status === 200) {
		var resultData = JSON.parse(httpRequest.responseText);
		var moonPhase = resultData["response"][0].name;
        var resultDate = new Date(resultData["response"][0].dateTimeISO);
		// var state = document.getElementById("state");
		// city.value = resultData.places[0]["place name"];
		// state.value = resultData.places[0]["state abbreviation"];
		// document.getElementById("zip").blur();
		document.getElementById("moonPhase").innerHTML = "The next phase of the moon from the data chosen is the " + moonPhase +
            " on " + resultDate.toDateString();
	}
}