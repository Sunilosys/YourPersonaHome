"use strict";

module.exports = Object.freeze({
    
    // App-ID. TODO: set to your own Skill App ID from the developer portal.
    appId : '',
     //  DynamoDB Table name
    dynamoDBTableName : 'YourPersonaHomeDB',
    /*
     *  States:
     *  SEARCH_MODE : Searching for your persona home.
     *  APPLICATION_MODE :  Applying for the loan
     *  
     */
    states : {
        SEARCH_MODE : '',
        APPLICATION_MODE : '_APPLICATION_MODE'
    }
});
