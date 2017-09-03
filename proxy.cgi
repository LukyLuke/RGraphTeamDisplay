#!/usr/bin/perl 
#
# There are two needed Parameters:
#  - from: This is the secion name in the config file to get the URI and Username/Password from
#  - uri: This is the URI to call on the remote system
#  - Others: All other Parameters are passed by to the remote system as is
#

use strict;
use warnings;
use Config::Simple;
use BerkeleyDB;

my ($buffer, @pairs, $pair, $name, $value, $from, $uri, $params, $timemachine);
my $cfg = new Config::Simple('proxy_config.ini');

# GET or POST arguments
$ENV{'REQUEST_METHOD'} =~ tr/a-z/A-Z/;
if ($ENV{'REQUEST_METHOD'} eq "POST"){
	read(STDIN, $buffer, $ENV{'CONTENT_LENGTH'});
}else {
	$buffer = $ENV{'QUERY_STRING'};
}

# Split all arguments into their pairs and separate them into the Config-Group, the URI and request params
@pairs = split(/&/, $buffer);
foreach $pair (@pairs) {
	($name, $value) = split(/=/, $pair);
	if ($name eq 'from') {
		$from = $value;
	} elsif ($name eq 'uri') {
		$uri = $value;
	} elsif ($name eq 'time') {
		$timemachine = $value;
	} else {
		$params .= length($params) == 0 ? '' : '&';
		$params .= $name . '=' . $value;
	}
}

# Prepare remote variables for the CURL request
my $user_pass = $cfg->param('global.Username') . ':' . $cfg->param('global.Password');
my $system = $cfg->param($from . '.URI');
my $remote = $system . '/' . $uri . '?' . $params;

# Check for a system specific User/Pass combination
if ($cfg->param($from . '.Username') ne '') {
	$user_pass = $cfg->param($from . '.Username') . ':' .  $cfg->param($from . '.Password');
}

# Use CURL to fetch the remote JSON in case this is no Jira-Timemachine call
my ($response);
if (length($timemachine) == undef) {
	$response = `/usr/bin/curl -u $user_pass "$remote"`;
	
} else {
	my $filename = "tm_" . $timemachine . ".db";
	my $db = new BerkeleyDB::Hash
			-Filename => $filename,
			-Flags    => DB_CREATE
		or die "Cannot open file $filename: $! $BerkeleyDB::Error\n" ;
		
	# If the current Timemachine is not initialized (first call) we fetch all values back 182 days (half a year)
	my ($key, $val, $link, $u, $day, $month, $year, $date);
	my $time = time();
	
	# Check if we need to fill the current timemachine for the last two months
	if ($db->db_get("last", $val) != 0) {
		$val = $time - (30 * 86400);
	}
	
	# For being more precise, sync always the current and last day, so subtract one day from the last sync means sync that day as well
	$val -= 86400;
	$db->db_put("last", $time);
	
	# As long as we are not one day further than the last sync, don't sync again
	while ($time > $val) {
		# From the current date: "YYYY-MM-DD"
		($u,$u,$u, $day, $month, $year, $u,$u,$u) = localtime($time);
		$year += 1900;
		$month += 1;
		$month = $month < 10 ? "0$month" : $month;
		$day = $day < 10 ? "0$day" : $day;
		$date = "$year-$month-$day";
		
		# Replace the date in the JQL and fetch the data
		$link = $remote;
		$link =~ s/%7B%7BDATE%7D%7D/$date/g;
		$link =~ s/{{DATE}}/$date/g;
		$response = `/usr/bin/curl -u $user_pass "$link"`;
		
		# Store the current day in the Database and decrease one day
		$response = "{\"t\":$time,\"d\":$response}";
		$key = $date;
		$db->db_put($key, $response);
		
		$time -= 86400;
	}
	
	$response = "";
	
	my ($k, $v, $c) = ("", "", 0);
	my $cursor = $db->db_cursor();
	$time = time() - (31 * 86400);
	while ($cursor->c_get($k, $v, DB_NEXT) == 0) {
		if ($k != "last") {
			if ($k lt $time) {
				$cursor->c_del();
			} else {
				$response .= "," if $c > 0;
				$response .= "$v";
				$c++;
			}
		}
		#last if ($c == 10);
	}
	$response = "[$response]";
	
	undef $cursor ;
	undef $db;
}

# Send out all headers
print "Content-type: application/json\r\n";
print "Content-length: " . length($response) . "\r\n";
print "\r\n";

print $response;
