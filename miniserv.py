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

def configure(app):
    md = Markdown(app)

    @app.route('/<path:page>.md')
    def make_md(page):
        md = open(page + '.md').read()
        return flask.render_template_string('{{ page|markdown }}', page=md)

if __name__ == '__main__':
    app = flask.Flask(__name__)
    app.debug = True
    configure(app)
    app.run()

