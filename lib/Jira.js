
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
			filterString: '',     // A custom FilterString - use {{DATE}} in case this filter is used for a TimeMachine graph
			fields: ['priority'], // Fields to load and possibly show or use for more filtering
			timeMachine: '',      // Is this a Timemaching-Graph or a simple bar graph - only possible with a fiterString and a {{DATE}} param in there
			combined: false,      // Combine all issues and use the number of issues per day or show a graph for each custom value in the field given in the fields setting
			issues: false         // Static display to show numbers of issues
		}, options);
		
		/**
		 * Settings for the rGraph Library
		 */
		var graph_setting = $.extend({
			type: 'line',
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
			if (typeof(settings.timeMachine) == 'string' && (settings.timeMachine != '')) {
				base_url += '&time=' + settings.timeMachine;
			}
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
						settings.filterString = json.jql;
						request(url, elem);
					}
				});
				
			} else {
				$.ajax({
					dataType: 'json',
					url: url + '/search/&jql=' + escape(settings.filterString) + '&maxResults=9999&fields=' + settings.fields.join(','),
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
			
			if (typeof(settings.timeMachine) == 'string' && (settings.timeMachine != '')) {
				showTimeline(id, data);
			} else {
				showSingleDataset(id, data);
			}
		};
		
		/**
		 * Shows all Data as a Chart over time
		 * This is used if a TimeMachine-Value is given
		 * 
		 * @param String id ID of the Canvas to draw in
		 * @param Object Collected data from Jira-API (an array of {t: time, d: {data}} Objects)
		 */
		function showTimeline(id, data) {
			// Prepare Graph-Data. the Map 'm' is used for separated values grouped into the field name values
			var d = [], m = new Map(), l = [], c = new Set();
			$(data).each(function(k, v) {
				if ((k % graph_setting.eachXAxisLabel) == 0) {
					l.push(new Date(v.t * 1000).toISOString().slice(0, 10));
				}
				
				// If not combined, just fill the array with the totals
				// In case we want the separate values, it's alittle bit inconvenient
				if (settings.combined) {
					d.push(v.d.total);
					
				} else {
					// 'sum' is a container for the current number of issues separated into the field names
					var sum = new Map();
					$(v.d.issues).each(function(k, v) {
						var field = v.fields[settings.fields[0]];
						if (field == null) {
							return;
						}
						var name = typeof(field.name) != 'undefined' ? field.name : field.value;
						
						// Create the groups in the maps 'sum' and 'm' if not already existent
						// Don't worry about the map 'm', here we only need the empty container for each time entry
						if (!sum.has(name)) {
							sum.set(name, 0);
						}
						if (!m.has(name)) {
							m.set(name, []);
						}
						
						// Increment the total number of issues from the current group and add the group name to the labes 'c'
						sum.set(name, sum.get(name) + 1);
						c.add(name);
					});
					
					// After collecting the total number of issues in every group, add them to the main map 'm'
					for (var [key, value] of sum.entries()) {
						var arr = m.get(key);
						arr[k] = value;
						m.set(key, arr);
					}
				}
			});
			
			// In case of separated values, add all values from the map 'm' in the same order as defined in the labes 'c' to the data array 'd'
			if (!settings.combined) {
				for (let key of c.values()) {
					// RGraph can't handle 'undefined' values in arrays so we have to fill them with '0'
					var arr = Array.from(m.get(key));
					arr.forEach(function(_v, _k) {
						if (typeof(_v) == 'undefined') {
							arr[_k] = 0;
						}
					});
					d.push(arr);
				}
			}
			
			var opt = $.extend(graph_setting, { xaxisLabels: l, labels: l, key: null });
			
			// Show keys
			if (graph_setting.showLegend && !settings.combined) {
				opt.key = Array.from(c);
				opt.gutterTop = (opt.titleSize * 2.5) + (opt.keySize * 2);
			}
			
			// Show the graph
			var graph = new RGraph.SVG.Line({
				id: id,
				data: d,
				options: opt
			}).draw();
		};
		
		/**
		 * Shows one single dataset as a bar chart
		 * This is used if no TimeMachine-Value is given
		 * 
		 * @param String id ID of the Canvas to draw in
		 * @param Object Data from Jira-API
		 */
		function showSingleDataset(id, data) {
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
 
