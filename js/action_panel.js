if (typeof ActionService == 'undefined') {
	window.ActionService = {};
	ActionService.postForm = function ($form) {
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
	};
	ActionService.isPiiDefined = function() {
		return false;
	};
	ActionService.addCookieData = function ($form) {
		if (ActionService.isPiiDefined()){
			// Mimic backend data in local cookie
		} else {
			// Store form data in a cache to replay later.
		}
	};
	ActionService.getUserData(piitype, pii) {
		var data = {piitype : pii};
		$.post(mayday.global.servicesurl+'/action', data);
	}
}
