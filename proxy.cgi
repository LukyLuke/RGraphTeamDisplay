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

my ($buffer, @pairs, $pair, $name, $value, $from, $uri, $params, $user_pass);
my $cfg = new Config::Simple('proxy_config.ini');

# GET or POST arguments
$ENV{'REQUEST_METHOD'} =~ tr/a-z/A-Z/;
if ($ENV{'REQUEST_METHOD'} eq "POST"){
	read(STDIN, $buffer, $ENV{'CONTENT_LENGTH'});
}else {
	$buffer = $ENV{'QUERY_STRING'};
}

# Split all Arguments into their pairs and store them in $ARGS
@pairs = split(/&/, $buffer);
foreach $pair (@pairs) {
	($name, $value) = split(/=/, $pair);
	if ($name eq 'from') {
		$from = $value;
	} elsif ($name eq 'uri') {
		$uri = $value;
	} else {
		$params .= length($params) == 0 ? '' : '&';
		$params .= $name . '=' . $value;
	}
}

# Prepare remote variables for the CURL Request
$user_pass = $cfg->param('global.Username') . ':' . $cfg->param('global.Password');
my $system = $cfg->param($from . '.URI');
my $remote = $system . '/' . $uri . '?' . $params;

# Check for a system specific User/Pass combination
if ($cfg->param($from . '.Username') ne '') {
	$user_pass = $cfg->param($from . '.Username') . ':' .  $cfg->param($from . '.Password');
}

# Use CURL to fetch the remote JSON
my $response = `/usr/bin/curl -u $user_pass "$remote"`;

# Send out all headers
print "Content-type: application/json\r\n";
print "Content-length: " . length($response) . "\r\n";
print "\r\n";

print $response;
