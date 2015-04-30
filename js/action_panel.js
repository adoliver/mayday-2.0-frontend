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
		var postData = ActionService.formatPostData($form);

		// Provide default dummy functions
		if (!successFunc) { safelog('no successFunc'); successFunc = function(){}; }
		if (!doneFunc) { safelog('no doneFunc'); doneFunc = function(){}; }
		if (!errorFunc) {
			safelog('no errorFunc');
			errorFunc = function(){
				safelog('postError', postData);
				ActionService.cacheActivityPost( postData );
			};
		}

		ActionService.postFormLocal(api, hasPii, $form);
		ActionService.postFormRaw(api, hasPii, postData, successFunc, doneFunc, errorFunc);
	};
	ActionService.postFormLocal = function(api, hasPii, $element) {
		safelog('postFormLocal $form',$form);
		// retrieve Pii
		var first_name = $form.find('#person\\[first_name\\]').val();
		if (first_name) { ActionService.setLocalPii( 'first_name', first_name ); }
		else safelog( 'first_name not found' );

		var last_name = $form.find('#person\\[last_name\\]').val();
		if (last_name) { ActionService.setLocalPii( 'last_name', last_name ); }
		else safelog( 'last_name not found' );

		var email = $form.find('#person\\[email\\]').val();
		if (email) { ActionService.setLocalPii( 'email', email ); }
		else safelog( 'email not found' );

		var phone = $form.find('#person\\[phone\\]').val();
		if (phone) { ActionService.setLocalPii( 'phone', phone ); }
		else safelog( 'phone not found' );
		
		// set the activity as complete
		var template_id = $form.find('input[name="template_id"]');
		//ActionService.completeActivity( template_id );
	};
	ActionService.postFormRaw = function(api, hasPii, postData, successFunc, doneFunc, errorFunc) {
		// The post data may contain pii. Otherwise only post if we already have pii locally
		if (hasPii || ActionService.isPiiDefined()){
		safelog('make jquery post call');
			// Send the current post action
			$.post(mayday.global.servicesurl+'/'+api, postData, successFunc).fail(errorFunc).done(doneFunc);
		} else {
		safelog('cache activity');
			var postObj = {};
			postObj.api = api;
			postObj.hasPii = hasPii;
			postObj.postData = postData;
			ActionService.cacheActivityPost( postObj );
		}
	};
	ActionService.processActivityCache = function(){
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
	ActionService.setLocalPii = function( type, value) {
		safelog( 'setLocalPii()', type, value);
		// pull the pii information from the post Data
		var personObj = ActionService.getLocalPerson();
		personObj[type] = value;
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
	ActionService.popActivityCache = function () {
		var currentCache = JSON.parse(Cookies.get('activityCache'));
		if ( !currentCache ) {
			return null;
		}
		var cacheObj = currentCache.pop();
		Cookies.set('activityCache', JSON.stringify(currentCache), {path: "/"});
		return cacheObj;
	};
	ActionService.completeAction = function( template_id ) {
		personObj = ActionService.getLocalPerson();
		// set completed array
		personObj.completed_activities.push( template_id );
		// set completed property on activity
		for (var i=0; i < personObj.activities.length; i++) {
			if (personObj.activities[i].template_id == template_id) {
				personObj.activities[i].complete = true;
			}
		}
		ActionService.setLocalPerson( personObj );
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
			activityIndex = JSON.parse(activityIndexStr);
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
			activityIndex = ActionService.getNextActivityIndex(activityIndex);
			Cookies.set( 'maydayActivityIndex', JSON.stringify(activityIndex), {path: "/"} );

			activityDisplayCount = 0; // Reset display count

		}

		activityDisplayCount += 1; // effectively starts at index 1
		// Store the new display count
		Cookies.set( 'maydayActivityDisplayCount',  JSON.stringify(activityDisplayCount), {path: "/"});

		var personObj = ActionService.getLocalPerson();
		nextActivity = personObj.activities[activityIndex];
		return nextActivity;
	};
	ActionService.getNextActivityIndex = function (currentIndex, includeComplete) {
		safelog('getNextActivityIndex()', currentIndex, includeComplete);
		var nextIndex = currentIndex + 1;
		var personObj = ActionService.getLocalPerson();
		var activity = null;
		var activityList = personObj.activities;
		/* loop through all to end of list */
		for (var i=nextIndex; i < activityList.length; i++) {
			activity = activityList[i];
			if (!activity.complete | includeComplete) {
				safelog('found incomplete activity',activity);
				if ( activity.template_id != 'sign-letter') { // hack to keep sign-letter panel out of dynamic panel rotation
					safelog('found next index = ' + nextIndex);
					return i;
				} else {
					safelog('skip over sign-letter');
				}
			}
		}
		/* loop through list coming full circle */
		for (var j=0; j < nextIndex; j++) {
			activity = activityList[j];
			if (!activity.complete | includeComplete) {
				if ( activity.template_id != 'sign-letter') { // hack to keep sign-letter panel out of dynamic panel rotation
					safelog('found next index = ' + nextIndex);
					return j;
				} else {
					safelog('skip over sign-letter');
				}
			}
		}
		/* search again including completed activities */
		if (!includeComplete) {
			return ActionService.getNextActivityIndex(currentIndex, true);
		} else {
			/* something weird has happened, but default to index 0 */
			safelog('WEIRD ERROR');
			return 0;
		}
	};
	ActionService.getDefaultPerson = function() {
		return ActionService.person_default;
	};
	ActionService.person_default = {
		"uuid":null,
		"first_name":null,
		"last_name":null,
		"is_volunteer":null,
		"completed_activities":[],
		"activities":[
			{
				"name":"sign up form",
				"sort_order":1,
				"template_id":"sign-up-form"
			},
			{
				"name":"call congress",
				"sort_order":2,
				"template_id":"call-congress"
			},
			{
				"name":"volunteer form",
				"sort_order":3,
				"template_id":"volunteer-form"
			},
			{
				"name":"sign letter",
				"sort_order":4,
				"template_id":"sign-letter"
			},
			{
				"name":"join discussion",
				"sort_order":5,
				"template_id":"join-discussion"
			},
			{
				"name":"spread the word",
				"sort_order":6,
				"template_id":"spread-the-word"
			}
		]
	};
}
