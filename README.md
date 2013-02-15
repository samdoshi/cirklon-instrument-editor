Cirklon Instrument Editor
=========================

This is a simple HTML application to help you edit your Cirklon Instrument definitions (\*.cki files).

It only works in Chrome and Firefox as they are currently the only browsers that support the Blob API which enables saving locally (i.e. without a webserver).

You may run the application on your own computer by opening **src/index.html** in a supported browser, exporting will still work.

build.py
--------

The **build.py** script is used to create date stamped compressed versions of the CSS and Javascript files. You only need to run this if you are planning on hosting the application on a web server.

