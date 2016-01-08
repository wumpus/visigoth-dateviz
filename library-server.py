#!/usr/bin/env python3

from bottle import route, request, response, run, static_file
import pickle
import shelve
import json
import urllib.parse
import os
import sys

reloader=True

sys.path.append(os.path.join(os.path.dirname(__file__), '../visigoth'))
from visigoth.redirs import redirs # XXX what did I screw up here?

# Only open stuff if we are really going to serve queries
if os.environ.get('BOTTLE_CHILD') or not reloader:

    print("reading autocomplete pickle... ")
    f = open(os.environ.get('VISIGOTH_DATA') + '/prefixes_pickle', 'rb') # utf8?
    prefixes = pickle.load(f) # utf8?
    f.close()
    print("done.")

    print("opening year shelf... ")
    years = shelve.open(os.environ.get('VISIGOTH_DATA', '.') + '/year_shelf.eq.4.fixedup2', flag='r')
    print("done.")

    print("opening sentence shelf... ")
    sentences = shelve.open(os.environ.get('VISIGOTH_DATA', '.') + '/sentence_shelf.eq.4.fixedup', flag='r')
    print("done.")

    print("opening redirs shelf... ")
    redir = redirs()
    print("done.")

@route('/')
def front_page():
    return static_file('index.html', root='./static')

@route('/static/<filename>')
def server_static(filename):
    return static_file(filename, root='./static')

@route('/autocomplete')
def autocomplete_rest():
    q = request.query.q or '' # will preserve utf8 encoding. url decoded, so + and %20 are already handled
    q = q.lower()
    # this must match what the autocomplete builder used as max length
    q = q[0:min(len(q), 10)]

#    print("query", q)
    answer = prefixes.get(q, {})
#    print("query", q, "answer", answer)

    sorted_list = ((a, answer[a]) for a in sorted(answer, key=answer.get, reverse=True))
    ret = []
    for a, c in sorted_list:
        b = urllib.parse.quote(urllib.parse.unquote(a))
        ret.append({ 'label': urllib.parse.unquote(a),
                     'number': answer[a] })

    return { "autocomplete": ret }

@route('/years')
def years_rest():
    q = request.query.q or ''

    canon = redir.forward(q)

    y = years.get(canon, None) or years.get(canon.lower(), {})

    print("/years returning", y)

    return { "years": y }

@route('/sentences')
def sentences_rest():
    q = request.query.q or ''
    year = request.query.year or ''

    canon = redir.forward(q)
    key = canon + ' ' + year
    print("key is", key)

    s = sentences.get(key, []) # a list of dicts

    print("/sentences returning", s)

    return { "sentences": s }

@route('/robots.txt')
def robots():
    return static_file('robots.txt', root='./static')

run(host='0.0.0.0', port=8080, reloader=reloader)
