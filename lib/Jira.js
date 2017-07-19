
// JIRA Api Definitions: https://docs.atlassian.com/jira/REST/server/

(function($) {
	$.fn.Jira = function(options, graph) {
		/**
		 * Main settings for displaying and calling Jira
		 */
		var settings = $.extend({
			proxy: 'proxy.cgi',   // The main Proxy-Script (because of CORS)
			config: 'Jira',       // Configuration part from the Proxy to get the user/password and URI from
			version: 'latest',    // What API-Version should be used - Default is 'latest' what is '2' at this moment of programming
			filterId: 0,          // The FilterID to get data from
			filterString: '',     // A custom FilterString
			fields: ['priority'], // Fields to load and possibly show or use for more filtering
			issues: false         // Static display to show numbers of issues
		}, options);
		
		/**
		 * Settings for the rGraph Library
		 */
		var graph_setting = $.extend({
			type: 'bar',
			eachXAxisLabel: 5,
			showLegend: false,
			
			titleSize: 14,
			titleBold: true,
			keySize: 12,
			keyTextBold: false,
			hmargin: 50,
			hmarginGrouped: 50,
			gutterTop: 30,
			gutterLeft: 70,
			gutterRight: 30,
			gutterBottom: 30
		}, graph);
		
		/**
		 * Build a Proxy-URL
		 */
		function buildUrl() {
			var base_url = settings.proxy + '?from=' + settings.config;
			base_url += '&uri=/rest/api/' + settings.version;
			return base_url;
		};
		
		/**
		 * Sends out a request and update the element with the response
		 */
		function request(url, elem) {
			// As first we load once the FilterString and if we have one, we not do so anymore
			if (typeof(settings.filterString) != 'string' || (settings.filterString == '')) {
				$.ajax({
					dataType: 'json',
					url: url + '/filter/' + settings.filterId,
					method: 'GET',
					success: function(json) {
						graph_setting = $.extend(graph_setting, { title: json.name });
						settings.filterString = escape(json.jql);
						request(url, elem);
					}
				});
				
			} else {
				$.ajax({
					dataType: 'json',
					url: url + '/search/&jql=' + settings.filterString + '&maxResults=1000&fields=' + settings.fields.join(','),
					method: 'GET',
					success: function(json) {
						showJiraGraph(elem, json);
					}
				});
			}
		};
		
		/**
		 * Shows a Graph inside the given Element based on the configuration
		 * 
		 * @param JQuery elem The element
		 * @param Object data Json-Response from JIRA
		 */
		function showJiraGraph(elem, data) {
			var width = elem.innerWidth(), height = elem.innerHeight();
			var id = elem.attr('id') + '-graph';
			var canvas = $('<div id="' + id + '"></div>')
				.css({
					width: width + 'px',
					height: height + 'px'
				});
			elem.append(canvas);
			
			// Prepare Graph-Data
			var sum = {};
			$(data.issues).each(function(k, v) {
				var field = v.fields[settings.fields[0]];
				if (field == null) {
					return;
				}
				var name = typeof(field.name) != 'undefined' ? field.name : field.value;
				if (typeof(sum[name]) == 'undefined') {
					sum[name] = 0;
				}
				sum[name]++;
			});
			
			var d = [[]], l = [], c = [];
			for (var k in sum) {
				var v = sum[k];
				d[0].push(v);
				l.push(k + ' (' + v + ')');
				c.push(k);
			};
			var opt = $.extend(graph_setting, { xaxisLabels: l, labels: l, key: null });
			
			// Show keys
			if (graph_setting.showLegend) {
				opt.key = c;
				opt.gutterTop = (opt.titleSize * 2.5) + (opt.keySize * 2);
			}
			
			// Show the graph
			var graph = new RGraph.SVG.Bar({
				id: id,
				data: d,
				options: opt
			}).draw();
		};
		
		/**
		 * Process each element and display the Chart-Data
		 */
		return this.each(function() {
			var elem = $(this);
			if (settings.issues) {
				elem.data('metrics', false);
				elem.data('issues', true);
			} else {
				elem.data('metrics', true);
				elem.data('issues', false);
			}
			request(buildUrl(), elem);
		});
		
	};
}(jQuery));
 
