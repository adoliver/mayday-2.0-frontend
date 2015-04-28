/*
Dependencies:
	This code requires the Locals js library /js/lib/js.cookies.js
*/
if (typeof ActionService == 'undefined') {
	window.ActionService = {};
	/*
	postForm selectively calls the post action or stores form data in cache for later transmission
	Parameters:
		$form : jquery object wrapper of the form DOM element
		hasPii : flag to notify that the Post should assume that $form contains pii
	*/
	ActionService.postForm = function (api, hasPii, $form, successFunc, doneFunc, errorFunc) {
		// Provide default dummy functions
		if (!successFunc) successFunc = function(){};
		if (!doneFunc) doneFunc = function(){};
		if (!errorFunc) errorFunc = function(){};

		var postData = ActionService.formatPostData($form);

		ActionService.postFormRaw(api, hasPii, postData, successFunc, doneFunc, errorFunc);
	};
	ActionService.postFormRaw = function(api, hasPii, postData, successFunc, doneFunc, errorFunc) {
		// The post data may contain pii. Otherwise only post if we already have pii locally
		if (hasPii || ActionService.isPiiDefined()){
			// Send the current post action
			ActionService.setLocalPii( postData );
			    $.post(mayday.global.servicesurl+'/'+api, postData, successFunc, errorFunc).done(doneFunc);
			// Store the PII locally
			ActionService.setLocalPii( postData );
		} else {
			var postObj = {};
			postObj.api = api;
			postObj.hasPii = hasPii;
			postObj.postData = postData;
			ActionService.cacheActivityPost( postObj );
		}
	};
	ActionService.processActivityCache(){
		var postObj = ActionService.popActivityCache();
		if (postObj) {
			ActionService.postFormRaw(postObj.api, postObj.hasPii, postObj.postData,
			function() {
				// Process next item in cache
				ActionService.processActivityCache();
			}, 
			function() {},
			function() {
				// On error store object back in the cache
				ActionService.cachActivityPost( postObj );
			});
		}
	};
	/*
	Any data transformations to match backend API requirements should be done here.
	*/
	ActionService.formatPostData = function( $form ) {
		return $form.serialize();
	};
	/*
	Checks if local data has pii stored
	*/
	ActionService.isPiiDefined = function() {
		return false;
	};
	/*
	Note: this function needs to merge PII with existing local person object without overwriting data.
	*/
	ActionService.setLocalPii = function( postData ) {
		// pull the pii information from the post Data
		var personStr = ActionService.getLocalPerson();
		var personObj = {};
		if ( personStr ) {
			personObj = JSON.parse( personStr );
		}
		if ( postData.uuid ) {
			personObj.uuid = postData.uuid;
		}
		if ( postData.email ) {
			personObj.email = postData.email;
		}
		ActionService.setLocalPerson( personObj );
	};
	ActionService.getPii = function() {
		var piiObj = null;
		var str = ActionService.getLocalPerson();
		if ( str ) {
			personObj = JSON.parse( str );
			if ( personObj && personObj.uuid ) {
				piiObj.uuid = personObj.uuid;
			}
			if ( personObj && personObj.email ) {
				piiObj.email = personObj.email;
			}
		}
		return piiObj;
	};
	ActionService.cacheActivityPost = function ( postData ) {
		// post data in a cache to replay later.
		var currentCache = JSON.parse(Cookies.get('activityCache'));
		if ( !currentCache ) { // start a new cache if not found
			currentCache = [];
		}
		currentCache.push( postData );
		Cookies.set( 'activityCache', JSON.stringify( currentCache ), {path: "/"} );
	};
	ActiionService.popActivityCache = function () {
		var currentCache = JSON.parse(Cookies.get('activityCache'));
		if ( !currentCache ) {
			return null;
		}
		var cacheObj = currentCache.pop();
		Cookies.set('activityCache', JSON.stringify(currentCache), {path: "/"});
		return cacheObj;
	};
	/*
	Loads the user person from local data
	*/
	ActionService.getLocalPerson = function() {
		personObj = null;
		var personStr = Cookies.get( 'maydayPerson' );
		if ( personStr ) {
			personObj = JSON.parse( personStr );
		} else {
			personObj = ActionService.getDefaultPerson();
		}
		return personObj;
	};
	/*
	Set user in local data
	*/
	ActionService.setLocalPerson = function ( personObj ) {
		// Make sure that activity list is ordered from low to by by the order property
		personObj.activities = personObj.activities.sort(function(a,b) {
			return a.order - b.order;
		});
		Cookies.set( 'maydayPerson', JSON.stringify( personObj ), {path: "/"});
	};
	/*
	Formats the post request to get a person object form back-end.
	Person objects from the back-end will be missing pii
	*/
	ActionService.requestStoredPerson = function(pii, successFunc, errorFunc) {
		$.get(mayday.global.servicesurl+'/people/' + pii, successFunc, errorFunc);
	};
	/*
	Intended to be triggered during the onready event
	Loop through all dynamic targets.
		- determine the next activity to propose
		- overwrite the dynamic DOM innerHTML with the template html
		- setup event bindings
	*/
	ActionService.loadDynamicPanels = function() {
		safelog('Get all dynamic panels');
		$('.panel-wrapper').each( function( index, element ) {
			var panel = $('#js-hidden-call_congress').html();
			$(element).html(panel);
		});
	};
	/*
	Retrieve the starting orderIndex from the list of actions
	*/
	ActionService.getInitialActivityIndex = function(){
		var initialIndex;
		if ( ActionService.hasOwnProperty('initialActionIndex') ) {
			initialIndex = ActionService.initialActionIndex;
			
		} else {
			var personObj = ActionService.getLocalPerson();
			initialIndex = personObj.activities[0].order;
			ActionService.initialActionIndex = initialIndex;
		}
		return initialIndex;
	};
	/*
	Loads the next activity from the local data otherwise gets generic from server
	Assumptions:
		* the activity list has already been sorted by order property from low to high
		* there are no duplicate order properties
	*/
	ActionService.getNextActivity = function() {
		var nextActivity = null;
		var activityIndex; // target activity
		var activityIndexStr = Cookies.get('maydayActivityIndex'); // ActivityIndex tracks the next activity order to display
		if (activityIndexStr) {
			activityIndex = JSON.parse( activityIndexStr );
		} else {
			activityIndex = 0;
		}
		var activityDisplayCount;
		var activityDisplayCountStr = Cookies.get('maydayActivityDisplayCount'); // Number of times the current activity has been displayed
		if (activityDisplayCountStr) {
			activityDisplayCount = JSON.parse(activityDisplayCountStr);
		} else {
			activityDisplayCount = 0;
		}

		// Advance the activity index if needed
		if (activityDisplayCount > 1) {
			// Store the new index
			activityIndex = ActivityService.getNextActivityIndex(activityIndex+1);
			Cookies.set( 'maydayActivityIndex', JSON.stringify( activityIndex ), {path: "/"} );

			// Store the new display count
			activityDisplayCount = 0; // Reset display count
			Cookies.set( 'maydayActivityDisplayCount', JSON.stringify( activityDisplayCount ), {path: "/"});

			var personObj = ActionService.getLocalPerson();
			nextActivity = personObj.activities[activityIndex];
		} else { 
			// Store the new display count
			activityDisplayCount += 1;
			Cookies.set( 'maydayActivityDisplayCount', JSON.stringify( activityDisplayCount ), {path: "/"});

			var personObj = ActionService.getLocalPerson();
			nextActivity = personObj.activities[activityIndex];
		}
		return nextActivity;
	};
	ActionService.getNextActivityIndex = function (nextIndex) {
		var personObj = ActionService.getLocalPerson();
		var activity = null;
		var activityList = personObj.activities;
		if ( nextIndex < activityList.length ) {
			activity = activityList[nextIndex];
			if (!activity.complete) {
				return nextIndex;
			} else {
				// find next incommplete activity
				for (var i=nextIndex; i < activityList.length; i++){
					if (!activityList[i].complete) {
						return i;
					}
				}
				// start search from beginning of list
				for (var i=0; i < nextIndex; i++){
					if (!activityList[i].complete) {
						return i;
					}
				}
				// include complete activities
				if (nextIndex < activityList.length){
					return nextIndex;
				} else {
					return 0;
				}
			}
		} else {
			return 0;
		}
	};
	ActionService.getDefaultPerson = function() {
		var person = {};
		return person;
	};
}
