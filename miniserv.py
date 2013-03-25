#!/usr/bin/env python
#
#   Manages a mini documentation/test server -- test/debugging use only!
#

try:
    import flask
    from flaskext.markdown import Markdown
except ImportError:
    import sys
    print >>sys.stderr, 'miniserv is missing needed libraries'
    print >>sys.stderr, ''
    print >>sys.stderr, 'The following is suggested (virtualenv required):'
    print >>sys.stderr, '$ virtualenv ve'
    print >>sys.stderr, '$ ./ve/bin/pip install -r miniserv-requirementst.txt'
    print >>sys.stderr, '$ . ve/bin/activate.sh'
    print >>sys.stderr, '$ ' + sys.argv[0]
    sys.exit(20)

import datetime

def configure(app):
    md = Markdown(app)

    @app.route('/')
    def index():
        return flask.redirect('/index.html')

    @app.route('/<path:page>')
    def make_md(page):
        return flask.render_template(page, THIS='***reactor.js***',
                                     now=datetime.datetime.now)

if __name__ == '__main__':
    app = flask.Flask(__name__)
    app.debug = True
    configure(app)
    app.run()

