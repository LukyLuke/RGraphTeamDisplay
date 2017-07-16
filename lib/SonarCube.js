
// list
// proxy + '?from=' + sonarcube + '&uri=/api/webservices/list';

// Issue type: Blocker, Critical, Major
// proxy + '?from=' + sonarcube + '&uri=/api/issues/search&
// componentKeys=com.adcubum%3Asyrius%3Apartner-impl%3Amaster&ps=1&resolved=false&severities=BLOCKER&statuses=OPEN,REOPENED,CONFIRMED';
// componentKeys=com.adcubum%3Asyrius%3Apartner-impl%3Amaster&ps=1&resolved=false&severities=CRITICAL&statuses=OPEN,REOPENED,CONFIRMED';
// componentKeys=com.adcubum%3Asyrius%3Apartner-impl%3Amaster&ps=1&resolved=false&severities=MAJOR&statuses=OPEN,REOPENED,CONFIRMED';


// Time-Machine: https://docs.sonarqube.org/display/SONAR/Metric+definitions
// 
// proxy + '?from=' + sonarcube + '&uri=/api/timemachine/index&
// resource=com.adcubum%3Asyrius%3Apartner-impl%3Amaster&format=json&
// fromDateTime=' + new Date().toISOString().slice(0, 10) + '

// Code Coverage: Total, Lines, Copnditions
// metrics=coverage,line_coverage,branch_coverage';

// Tests, Execution time, skipped tests
// metrics=tests,test_execution_time,skipped_tests';

// Covered vs. uncovered lines on new Code
// metrics=new_lines_to_cover,new_line_coverage';

// Code smells and effort to fix it
// metrics=code_smells,sqale_index';

// Issues over time
// metrics=blocker_violations,critical_violations,major_violations';

// Remove duplication:
// metrics=duplicated_blocks,duplicated_lines,duplicated_lines_density';


// Just for fun :o)
// metrics=classes,files,functions,noloc';

(function($) {
	$.fn.SonarCube = function(options, graph) {
		/**
		 * Main settings for displaying and calling SonarCube
		 */
		var settings = $.extend({
			proxy: 'proxy.cgi',   // The main Proxy-Script (because of CORS)
			config: 'SonarCube',  // Configuration part from the Proxy to get the user/password and URI from
			resource: null,       // The resource/componentKey to get data from
			from: null,           // Start Date
			upto: null,           // End Date
			metrics: [],          // Metrics to display
			scale: [],            // Scale a metric up/down by the given value: [ 'metric_name': +/-value ]
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
			hmargin: 0,
			gutterTop: 30,
			gutterLeft: 70,
			gutterRight: 30,
			gutterBottom: 30
		}, graph);
		
		/**
		 * Build a Proxy-URL for getting all TimeStamp-Data from the given metrics
		 */
		function buildTimemachineUrl() {
			var base_url = settings.proxy + '?from=' + settings.config;
			base_url += '&uri=/api/timemachine/index&format=json';
			base_url += '&resource=' + settings.resource;
			base_url += '&metrics=' + settings.metrics.join(',');
			
			// Append the From and Upto Dates
			if (settings.from != null && settings.from instanceof Date) {
				base_url += '&fromDateTime=' + settings.from.toISOString().slice(0, 10);
			}
			if (settings.upto != null && settings.upto instanceof Date) {
				base_url += '&toDateTime=' + settings.upto.toISOString().slice(0, 10);
			}
			
			return base_url;
		};
		
		/**
		 * Build a Proxy-URL for getting the given severity
		 */
		function buildIssuesUrl(severity) {
			var base_url = settings.proxy + '?from=' + settings.config;
			base_url += '&uri=/api/issues/search';
			base_url += '&componentKeys=' + settings.resource + '&ps=1&resolved=false&statuses=OPEN,REOPENED,CONFIRMED&severities=' + severity.toUpperCase();
			return base_url;
		};
		
		/**
		 * Sends out a request and update the element with the response
		 */
		function request(url, elem) {
			$.ajax({
				dataType: 'json',
				url: url,
				method: 'GET',
				success: function(json) {
					if (elem.parent().data('issues')) {
						elem.children().first().append($('<span class="value"></span>').html(json.total));
					} else {
						for (var i = 0; i < json.length; i++) {
							showSonarCubeGraph(elem, json[i], i, json.length);
						}
					}
				}
			});
		};
		
		/**
		 * Shows a Graph inside the given Element based on the configuration
		 * 
		 * @param JQuery elem The element
		 * @param Object data The GraphData: {cols: [ 'Metric1', 'Metric2', ... ], cells: [ { d: Timestamp, v: [ Metric1-Value, Metric2-Value, ... ] }, ... ]}
		 * @param num The current graph number inside the Element
		 * @param total Total number of Graphs inside the Element
		 */
		function showSonarCubeGraph(elem, data, num, total) {
			var width = elem.innerWidth(), height = elem.innerHeight();
			if (total > 1) {
				width = Math.floor(width / 2);
				height = Math.floor(height / Math.ceil(total / 2));
			}
			
			var id = elem.attr('id') + '-graph-' + num;
			var canvas = $('<div id="' + id + '"></div>')
				.css({
					width: width + 'px',
					height: height + 'px'
				});
			elem.append(canvas);
			
			// Prepare Graph-Data (if more than one metric is shown a Multidimensional Array is needed)
			var multiple = data.cols.length > 1;
			var c = [], d = [], l = [];
			$(data.cols).each(function(k, v) {
				c.push(styleMetricName(v.metric));
				
				if (multiple) {
					d.push([]);
				}
				if (data.cells.length == 0) {
					if (multiple) {
						d[k].push(0);
					} else {
						d.push(0);
					}
				}
			});
			
			$(data.cells).each(function(k, v) {
				if ((k % graph_setting.eachXAxisLabel) == 0) {
					l.push(new Date(v.d).toISOString().slice(0, 10));
				}
				for (var i = 0; i < v.v.length; i++) {
					var name = data.cols[i].metric;
					var val = v.v[i];
					if (typeof(settings.scale[name]) != 'undefined') {
						if (settings.scale[name] > 0) {
							val = val * Math.abs(settings.scale[name]);
						} else {
							val = val / Math.abs(settings.scale[name]);
						}
					}
					if (multiple) {
						d[i].push(val);
					} else {
						d.push(val);
					}
				}
			});
			var opt = $.extend(graph_setting, { xaxisLabels: l, labels: l, key: null });
			
			// Show keys
			if (graph_setting.showLegend) {
				opt.key = c;
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
		 * Split the String by _, \s and - and uppercase each first Char of each Word
		 */
		function styleMetricName(name) {
			var n = '';
			$(name.split(/_|\s|-/)).each(function(k, v) {
				n += v.charAt(0).toUpperCase() + v.slice(1) + ' ';
			});
			if (typeof(settings.scale[name]) != 'undefined') {
				if (settings.scale[name] > 0) {
					n += '(/' + Math.abs(settings.scale[name]) + ')'
				} else {
					n += '(x' + Math.abs(settings.scale[name]) + ')'
				}
			}
			return n.trim();
		};
		
		/**
		 * Prepare the container to show the amount of issues
		 * after make a request and update the elements children with all data
		 */
		function prepareIssuesElement(elem) {
			elem.data('metrics', false);
			elem.data('issues', true);
			
			var height = 100 / Math.ceil(settings.metrics.length / 2);
			
			$(settings.metrics).each(function(k, val) {
				var el = $('<div><div><span class="title">' + val + '</span></div></div>')
					.attr('id', 'metric_' + val)
					.attr('class', 'metrics metric-' + val)
					.css({ height: height + '%' });
				elem.append(el);
				
				request(buildIssuesUrl(val), el);
			});
		};
		
		/**
		 * Process each element and display the Chart-Data
		 */
		return this.each(function() {
			var elem = $(this);
			if (settings.issues) {
				prepareIssuesElement(elem);
				
			} else {
				elem.data('metrics', true);
				elem.data('issues', false);
				
				request(buildTimemachineUrl(), elem);
			}
		});
		
	};
}(jQuery));
 
