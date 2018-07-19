'use strict';

var Alexa = require('alexa-sdk');
var constants = require('./constants');
var https = require("https");
var process = require("process");

//Env Variables
var userName = process.env.Name;
var city = process.env.City;
var bedrooms = process.env.Bedrooms;
const config = {};
config.IOT_BROKER_ENDPOINT = "ai5oi6v8v75iw.iot.us-east-1.amazonaws.com";  // also called the REST API endpoint
config.IOT_BROKER_REGION = "us-east-1";  // eu-west-1 corresponds to the Ireland Region.  Use us-east-1 for the N. Virginia region
config.IOT_THING_NAME = "thing1";
//Global Constants

//End

//Global Variables
var welcomeGreetings = [
    "Hello, " + userName + ", Welcome to Your Persona Home.",
    "Hi, " + userName + ", Welcome to Your persona home.",

];
var serviceError = "I'm sorry, there were no matches generated. Try expanding your preferences.";
var moreDetails = "You can say next or more details or add this house to my favorites";
var findMyPersonaHome = " You can say, find my persona home, show open houses near me, apply for the loan.";
var favoriteAddedMsg = "This house has been added to your favorites.";
var noFavoriteMsg = "Currently your favorite list is empty.";
var applyLoanSuccessMessage = "Your loan application has successfully been sent to an EllieMae powered loan officer in your area. You will be contacted to finalize the process shortly.";
var currentIndex = 0;
var currentOpenIndex = 0;
var openHouses = [];
var thankYouMessage = "This is not an alternative fact, Your Persona Home is going to be  <emphasis level='strong'>huge </emphasis> , Vote House Alexa";
var applyLoanMessage = "You can say, apply for the loan."
//End

//Ellie Mae Persona Home Engine runs every day 3 times and update these s3 files
var houseListingEndPoint = "https://s3.amazonaws.com/yourpersonahome/Zillow.json";
var zillowListings = null;

var stateHandlers = {
    searchModeIntentHandlers: Alexa.CreateStateHandler(constants.states.SEARCH_MODE, {
        /*
         *  All Intent Handers for state : SEARCH_MODE
         */
        'LaunchRequest': function () {
            //  Change state to START_MODE
            console.log('SEARCH_MODE Launch');
            this.handler.state = constants.states.SEARCH_MODE;
            this.attributes['index'] = 0;
            var welcomeOutput = randomPhrase(welcomeGreetings);
            welcomeOutput += findMyPersonaHome;
            this.response.speak(welcomeOutput).listen(findMyPersonaHome);
            this.emit(':responseReady');
        },
        'searchPersonaHomeIntent': function () {
            currentIndex = 0;
            var message = "I see you currently stay in," + city + ", Is this where you're looking?";
            this.response.speak(message).listen(message);
            this.emit(':responseReady');
        },
        'yesNoIntent': function () {
            currentIndex = 0;
            searchPersonaHomeIntentHandler(this);
        },
        'nextListingIntent': function () {
            searchPersonaHomeIntentHandler(this);
        },

        'openHouseNextIntent': function () {
            openHouseIntentHandler(this);
        },
        'openHouseIntent': function () {
            currentOpenIndex = 0;
            openHouseIntentHandler(this);
        },
        'favoriteIntent': function () {
            favoriteIntentHandler(this);
        },
        'openFavoriteIntent': function () {
            openFavoriteIntentHandler(this);
        },
        'moreDetailsIntent': function () {
            moreDetailsIntentHandler(this);
        },
        'PreferenceIntent': function () {
            preferenceIntentHandler(this);
        },
        'applyLoanIntent': function () { applyLoanIntentHandler(this); },

        'AMAZON.HelpIntent': function () {
            //this.response.speak(helpMessageSearch).listen(helpMessageSearch);
            this.emit(':responseReady');
        },
        'AMAZON.StopIntent': function () {
            this.response.speak(thankYouMessage);
            this.emit(':responseReady');
        },
        'AMAZON.CancelIntent': function () {
            this.response.speak(thankYouMessage);
            this.emit(':responseReady');
        },
        'SessionEndedRequest': function () {
            // No session ended logic
        },
        'Unhandled': function () {
            var message = "Sorry, I didn't understand. Please try again";
            this.response.speak(message).listen(message);
            this.emit(':responseReady');
        }
    }),
    applicationModeIntentHandlers: Alexa.CreateStateHandler(constants.states.APPLICATION_MODE, {
        /*
         *  All Intent Handlers for state : PLAY_MODE
         */
        'LaunchRequest': function () {
            this.response.speak(welcomeOutput).listen(welcomeReprompt);
            this.emit(':responseReady');
        },
        'ApplyLoanIntent': function () { applyLoanIntentHandler(this); },
        'AMAZON.HelpIntent': function () {
            //this.response.speak(helpMessageApplyLoan).listen(helpMessageApplyLoan);
            this.emit(':responseReady');
        },
        'SessionEndedRequest': function () {
            // No session ended logic
        },
        'Unhandled': function () {
            var message = "Sorry, I didn't understand. At any time, you can say Pause to pause the audio and Resume to resume.";
            this.response.speak(message).listen(message);
            this.emit(':responseReady');
        }
    })
};

module.exports = stateHandlers;

//Intent Handlers
function searchPersonaHomeIntentHandler(thisRef) {
   
    makeHttpRequest(houseListingEndPoint, function ResponseCallback(err, data) {
        var speechOutput = "";
        if (currentIndex == 0)
            speechOutput = "Now listing 5 houses with the highest Persona Home Match Score.\n ";
        var currentIndexName = "";
        if (err) {
            thisRef.response.speak(serviceError).listen(serviceError);
            thisRef.emit(':responseReady');
        } else {
            var dataObj = JSON.parse(data);
            zillowListings = dataObj.ZillowListings;
            var newState = {
                'moreDetails':zillowListings,
                'intent':'searchPersonaHomeIntentHandler'
            };
            updateShadow(newState, status => {
                var currentListing = null;
                if (dataObj && dataObj.ZillowListings && dataObj.ZillowListings.length) {
                    currentListing = dataObj.ZillowListings[currentIndex];
                    if (currentIndex == 0) {
                        currentIndexName = "First";
                    }
                    else if (currentIndex == 1) {
                        currentIndexName = "Second";
    
                    }
                    else if (currentIndex == 2) {
                        currentIndexName = "Third";
                    }
                    else if (currentIndex == 3) {
                        currentIndexName = "Fourth";
                    }
                    else if (currentIndex == 4) {
                        currentIndexName = "Fifth";
                    }
                    currentIndex++;
                }
                if (currentListing) {
                    speechOutput += currentIndexName + " listing is at " + currentListing.address + " for " + currentListing.price + " with " +
                        currentListing.bedrooms + " bedrooms and " + currentListing.bathrooms + " bathrooms with " + currentListing.sqft + " square feet lot.\n";
                    speechOutput += "Persona Home Match Score is " + currentListing.personaMatchScore;
                    speechOutput += "\n " + moreDetails;
    
                    thisRef.response.speak(speechOutput).listen(moreDetails);
                    thisRef.emit(':responseReady');
    
                }
                else {
                    thisRef.response.speak(serviceError).listen(serviceError);
                    thisRef.emit(':responseReady');
                }
            });
            
        }

    });
}
function openHouseIntentHandler(thisRef) {
    makeHttpRequest(houseListingEndPoint, function ResponseCallback(err, data) {
        var speechOutput = "";

        var currentIndexName = "";
        if (err) {
            thisRef.response.speak(serviceError).listen(serviceError);
            thisRef.emit(':responseReady');
        } else {
            var dataObj = JSON.parse(data);
            var currentListing = null;
            var newState = {
                'moreDetails':dataObj.ZillowListings,
                'intent':'openHouseIntentHandler'
            };
            updateShadow(newState, status => {
            if (dataObj && dataObj.ZillowListings && dataObj.ZillowListings.length) {


                openHouses = [];
                var i;
                for (i = 0; i < dataObj.ZillowListings.length; i++) {
                    var isAvailable = dataObj.ZillowListings[i].openHouse;
                    if (isAvailable != "")
                        openHouses.push(dataObj.ZillowListings[i]);
                }
                currentListing = openHouses[currentOpenIndex];

                var openListingsLength = openHouses.length;

                if (currentOpenIndex == 0) {
                    currentIndexName = "First";
                }
                else if (currentOpenIndex == 1) {
                    currentIndexName = "Second";

                }
                else if (currentOpenIndex == 2) {
                    currentIndexName = "Third";
                }
                else if (currentOpenIndex == 3) {
                    currentIndexName = "Fourth";
                }
                else if (currentOpenIndex == 4) {
                    currentIndexName = "Fifth";
                }
                currentOpenIndex++;
            }
            if (currentListing) {
                if (currentOpenIndex == 1)
                    speechOutput += "There are currently" + openListingsLength + " open houses \n"; // Only for the first time

                speechOutput += currentIndexName + " listing is at " + currentListing.address + " for " + currentListing.price + " with " +
                    currentListing.bedrooms + " bedrooms and " + currentListing.bathrooms + " bathrooms with " + currentListing.sqft + " square feet lot.\n";
                speechOutput += "Persona Home Match Score is " + currentListing.personaMatchScore;
                speechOutput += "\n " + " you can say next open house.";

                thisRef.response.speak(speechOutput).listen("you can say next open house.");
                thisRef.emit(':responseReady');

            }
            else {
                thisRef.response.speak(serviceError).listen(serviceError);
                thisRef.emit(':responseReady');
            }
        });
        }

    });
}

function favoriteIntentHandler(thisRef) {
    if (zillowListings != null) {
        thisRef.attributes['Favorites'] = currentIndex;
        thisRef.emit(':saveState', true);
        thisRef.response.speak(favoriteAddedMsg).listen("You can say, open my favorite houses.");

    }
}
function openFavoriteIntentHandler(thisRef) {
    console.log(thisRef.attributes['Favorites']);
    if (zillowListings != null && thisRef.attributes['Favorites'] != null) {
        var index = thisRef.attributes['Favorites'];
        var currentListing = zillowListings[index];
        console.log(currentListing);
        var speechOutput = "Your favorite listing is at " + currentListing.address + " for " + currentListing.price + " with " +
            currentListing.bedrooms + " bedrooms and " + currentListing.bathrooms + " bathrooms with " + currentListing.sqft + " square feet lot.\n";
        speechOutput += "Persona Home Match Score is " + currentListing.personaMatchScore;
        thisRef.response.speak(speechOutput).listen(applyLoanMessage);
        thisRef.emit(':responseReady');
    }
    else {
        thisRef.response.speak(noFavoriteMsg).listen(noFavoriteMsg);
    }
}
function preferenceIntentHandler(thisRef) {

}

function moreDetailsIntentHandler(thisRef) {
    var say = "";
    if (zillowListings != null) {
        var currentListing = zillowListings[currentIndex - 1];
        say = "Opening the current listing at " + currentListing.address + " on Zillow.";
        var newState = {
            'moreDetails':currentListing.moreDetails,
            'intent':'moreDetailsIntentHandler'
        };
        updateShadow(newState, status => {
            thisRef.response.speak(say).listen(say);
            thisRef.emit(':responseReady');
        });
    }
}
function applyLoanIntentHandler(thisRef) {
    thisRef.response.speak(applyLoanSuccessMessage).listen(applyLoanSuccessMessage);
    thisRef.emit(':responseReady');
}
//End

//Function to make http request
function makeHttpRequest(endPoint, ResponseCallback) {
    https.get(endPoint, function (res) {
        var response = '';
        console.log('Status Code: ' + res.statusCode);
        if (res.statusCode != 200) {
            ResponseCallback(new Error(serviceError));
        }

        res.on('data', function (data) {
            response += data;

        });

        res.on('end', function () {
            ResponseCallback(null, response);
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        ResponseCallback(new Error(e.message));
    });
}

//Helper Functions

function getSlotFromIntent(slotName) {
    //intent.slots.Name;
    if (!slotName || !slotName.value) {
        return null;
    } else {
        return slotName.value.trim().replace(/\s/g, '');;
    }
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
}

function pickAudioClip(myData) {
    // if you have several audio clips, your function could decide which one to be played

    var tag = '';

    if (myData == 1) {
        tag = "<audio src='https://s3.amazonaws.com/yourpersonahome/Door+Open+and+Close+Puerta+Abriendo+y+Cerrando.mp3' />";
    } else {
        tag = "<audio src='https://s3.amazonaws.com/my-ssml-samples/cheap_thrills.mp3' />";
    }

    return (tag);

}
function updateShadow(desiredState, callback) {
    // update AWS IOT thing shadow
    var AWS = require('aws-sdk');
    AWS.config.region = config.IOT_BROKER_REGION;

    //Prepare the parameters of the update call

    var paramsUpdate = {
        "thingName" : config.IOT_THING_NAME,
        "payload" : JSON.stringify(
            { "state":
                { "desired": desiredState             // {"pump":1}
                }
            }
        )
    };

    var iotData = new AWS.IotData({ endpoint: config.IOT_BROKER_ENDPOINT });

    iotData.updateThingShadow(paramsUpdate, function (err, data) {
        if (err) {
            console.log(err);

            callback("not ok");
        }
        else {
            console.log("updated thing shadow " + config.IOT_THING_NAME + ' to state ' + paramsUpdate.payload);
            callback("ok");
        }

    });

}
//End

function canThrowCard() {
    return true;
}
//This function gets the randon intro phrase from predefined
function randomPhrase(array) {
    // the argument is an array [] of words or phrases
    var i = 0;
    i = Math.floor(Math.random() * array.length);
    return (array[i]);
}
//End
