# RGraphTeamDisplay
Simple Javascript project to display different graphs (RGraph) from Data gathered from SonarCube or Jira

# Why?!?

Becasue we wanted a small tool to display information in a Graph from out Team-Code to have the overview about if we create and refactor good quality and also if UnitTests really can help to produce less Bugs and so on (for the sceptic people :o))

First Idea was to use the great XIBO for this, but internal long time processes do not allow us to use it with the [XIBO RGraph Module](https://github.com/LukyLuke/xibo_rgraph) module in less than one year (if ever).

I run it on a RasperyPi with a 17" Display and LigHTTPD:
* [Raspberry Pi 3 - Model B](https://thepihut.com/collections/raspberry-pi/products/raspberry-pi-3-model-b)
* [Official Raspberry Pi 7" Touchscreen Display](https://thepihut.com/collections/raspberry-pi-screens/products/official-raspberry-pi-7-touchscreen-display)
* [Raspberry Pi 7" Touchscreen Display Frame](https://thepihut.com/collections/raspberry-pi-screens/products/raspberry-pi-7-touchscreen-display-frame)
* [LigHTTPD fly light.](http://www.lighttpd.net/)

# A Proxy CGI?

Badly we need this because the SonarCube and Jira installation are not CORS enabled in our company and, as above noted, this is a long time process to add 4 HTTP-Headers on each server</sarcasm>

The Proxy allows us to circumvent Not-CORS enabled systems with special Credentials and Basic-Authentication. Currently the configuration is stored in `proxy_config.ini` what can be accessd by a Webbrowser if you not disable ini files. Or you can copy it to some place outside the web directory and change the `proxy.cgi` on line 14.

# Installation

The only requirement for the Perl-Proxy is `CPAN Config::Simple` and `curl` as a shell binary (what hopefully is installed on every distribution by default).
Install it with `perl -MCPAN -e 'install Config::Simple'`

LigHTTPD should be available within your repository, if you use Slackware on Desktop like me, use [SlackBuilds Repository](https://slackbuilds.org/repository/14.2/network/lighttpd/). Enable the `mod_proxy` module, beside this nothing is needed. I also enabled IPv6 by setting `server.use-ipv6 = "enable"`, `server.bind = "[::]"` and `server.port = 8080`.

For security reason you should also add a line like this, to deny access to the ini files: `url.access-deny = ( "~", ".inc", ".ini" )`. By default there should already be one like this but commented and without the *.ini* extension.

Copy all from this repository to `/var/www/htdocs-lighttpd/` and rename the '.example' files.
Fill in the Jira and SonarCube URIs in `proxy_config.ini` and set your Username and Password as well.

In the `index.html` you have to configure all the graphs you want to show. In the example just replace the String *SonarResource&3Amaster* on the *resource*-Properties and see if its working already :o)

Restart LigHTTPD and open a Browser: [Your Team-Display](http://[::1]:8080/)

# Start automatically

*TBD:* Current Idea does not work (There is an *autostart* folder with script shich should be started automatically when the RasperryPi starts X-Server).
