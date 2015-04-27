/*
Dependencies:
	This code requires the Locals js library /js/lib/js.cookies.js
*/
if (typeof ActionService == 'undefined') {
	window.ActionService = {};
	/*
	Parameters:
		$form : jquery object wrapper of the form DOM element
		hasPii : flag to notify that the Post should assume that $form contains pii
	*/
	ActionService.postForm = function ($form, hasPii) {
		var postData = ActionService.formatPostData($form);
		// The post data may contain pii. Otherwise only post if we already have pii locally
		if (hasPii || ActionService.isPiiDefined()){
			ActionService.setLocalPii( postData );
			    $.post(mayday.global.servicesurl+'/action', $(e.target).serialize(), function(data){
			      $form.find('button.btn').text('Loading..');
			    }).done(function(){
			      if(location.pathname == '/take-action/'){
				$next = $form.parents('li').next();
				$parent = $form.parents('li');
				setAsComplete($parent);
				makeActive($next);
			      }else{
				location = '/take-action/#get-educated'
			      }
			    });
		} else {
			ActionService.cacheActivityPost( postData );
		}
	};
	/*
	Convert the form jquery object to a simple object for post call.
	Any data transformations to match backend API requirements should be done here.
	*/
	ActionService.formatPostData = function( $form ) {
		var postData = {};
		// Loop through each input element
		$form.find('input').each( function( index, element ) {
			var $element = $(element);
			postData[$element.name] = $element.value();
		});
	};
	/*
	Checks if local data has pii stored
	*/
	ActionService.isPiiDefined = function() {
		return false;
	};
	ActionService.setLocalPii = function( postData ) {
		// pull the pii information from the post Data
		var personStr = Cookies.get( 'maydayPerson' );
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
		Cookies.set( 'maydayPerson', JSON.stringify( personObj ), {path: "/"});
	};
	ActionService.getPii = function() {
		var piiObj = null;
		var str = Cookies.get( 'maydayPerson' );
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
		var currentCache = JSON.pars(Cookies.get('activityCache'));
		if ( !currentCache ) { // start a new cache if not found
			currentCache = [];
		}
		currentCache.push( postData );
		Cookies.set( 'activityCache', JSON.stringify( currentCache ), {path: "/"} );
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
		}
		return personObj;
	};
	/*
	Formats the post request to get a person object form back-end.
	Person objects from the back-end will be missing pii
	*/
	ActionService.getStoredPerson = function(piitype, pii, successFunc) {
		var data = {piitype : pii};
		$.post(mayday.global.servicesurl+'/action', data, successFunc);
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
	Loads the next activity from the local data otherwise gets generic from server
	*/
	ActionService.getNextActivity = function() {
		var nextActivity = null; //TODO: change this to be a default activity
		var personObj = ActionService.getLocalPerson();
		if (!personObj) {
			// load generic person object from server
		}
		if (personObj && personObj.activities) {
			var weight = null;
			var index = null;
			// lowest weight gets highest priority
			for (var i=0; i < personObj.activities.length; i++){
				if ( weight === null || personObj.activities[i].weight < weight) {
					weight = personObj.activities[i].weight;
					index = i;
				}
			}
			var nextActivity = personObj.activities[i];
		}
		return nextActivity;
	};
}
