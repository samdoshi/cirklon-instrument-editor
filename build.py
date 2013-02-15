#!/usr/bin/env python
import os
import datetime
import shutil
from bs4 import BeautifulSoup

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
SRC_DIR = SCRIPT_DIR + '/src/'
BUILD_DIR = SCRIPT_DIR + '/build/'
TIMESSTAMP = datetime.datetime.now().strftime('%Y%m%d%H%M%S')

def compress_js(js):
    import httplib
    import urllib

    params = urllib.urlencode([
        ('js_code', js),
        ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
        ('output_format', 'text'),
        ('output_info', 'compiled_code'),
    ])

    headers = { "Content-type": "application/x-www-form-urlencoded" }
    conn = httplib.HTTPConnection('closure-compiler.appspot.com')
    conn.request('POST', '/compile', params, headers)
    response = conn.getresponse()
    data = response.read()
    conn.close
    return data

def main():
    print 'Building...'

    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR)
    os.makedirs(BUILD_DIR + '/static')

    soup = BeautifulSoup( open(SRC_DIR + 'index.html'), "html5lib")
    
    scripts = []
    for script in soup.head.findAll('script'):
        scripts.append(script['src'])
        script.extract()

    script_tag = soup.new_tag('script', type='text/javascript', src='static/compressed-%s.js' % TIMESSTAMP)
    soup.head.append(script_tag)
    
    combined = '\n'.join([open(SRC_DIR + s).read() for s in scripts])
    compressed = compress_js(combined)
    #compressed = combined

    for link in soup.head.findAll('link'):
        if link['href'] == 'main.css':
            link['href'] = 'static/main-%s.css' % TIMESSTAMP
        if link['href'] == 'lib/bootstrap.css':
            link['href'] = 'static/bootstrap-%s.css' % TIMESSTAMP

    f = open(BUILD_DIR + 'static/compressed-%s.js' % TIMESSTAMP, 'w')
    f.write(compressed)
    
    css = open(SRC_DIR + 'main.css').read()
    f = open(BUILD_DIR + 'static/main-%s.css' % TIMESSTAMP, 'w')
    f.write(css)

    bootstrap = open(SRC_DIR + 'lib/bootstrap.min.css').read()
    f = open(BUILD_DIR + 'static/bootstrap-%s.css' % TIMESSTAMP, 'w')
    f.write(bootstrap)

    f = open(BUILD_DIR + 'index.html', 'w')
    f.write(soup.encode())


if __name__ == '__main__':
    main()
