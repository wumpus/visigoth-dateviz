#!/usr/bin/env python3

from bottle import hook, route, request, response, run, static_file, redirect
import pickle
import shelve
import json
import urllib.parse
import os
import sys
from operator import itemgetter

reloader=True

sys.path.append(os.path.join(os.path.dirname(__file__), '../visigoth'))
from visigoth.redirs import redirs # XXX what did I screw up here?

@hook('after_request')
def enable_cors():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'PUT, GET, POST, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

# Only open stuff if we are really going to serve queries
if os.environ.get('BOTTLE_CHILD') or not reloader:

    print("reading autocomplete pickle... ")
    f = open(os.environ.get('VISIGOTH_DATA', '.') + '/prefixes_pickle', 'rb') # utf8?
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
    redirect("/dateviz/", 302) # soft

@route('/dateviz')
def front_page():
    redirect("/dateviz/", 302) # soft

@route('/dateviz/')
def front_page():
    return static_file('index.html', root='./static')

@route('/dateviz/faqs.html')
def faqs_page():
    return static_file('faqs.html', root='./static')

@route('/dateviz/static/<filename>')
def server_static(filename):
    return static_file(filename, root='./static')

@route('/dateviz/static/images/<filename>')
def server_static(filename):
    return static_file(filename, root='./static/images')

@route('/dateviz/autocomplete')
def autocomplete_rest():
    q = request.query.q or '' # will preserve utf8 encoding. url decoded, so + and %20 are already handled
    q = q.lower()
    # this must match what the autocomplete builder used as max length
    q = q[0:min(len(q), 10)]

    answer = prefixes.get(q, {})

    sorted_list = ((a, answer[a]) for a in sorted(answer, key=answer.get, reverse=True))

    # XXX I have a lot of cased-dups. I'd like to keep BBS and BBs but no such luck.
    dedup_lower = {}
    ret = []
    for a, c in sorted_list:
        if a.lower() not in dedup_lower:
            b = urllib.parse.quote(urllib.parse.unquote(a))
            ret.append({ 'label': urllib.parse.unquote(a),
                         'number': answer[a] })
            dedup_lower[a.lower()] = 1

    return { "autocomplete": ret }

@route('/dateviz/years')
def years_rest():
    q = request.query.q or ''

    canon = redir.forward(q)

    y = years.get(canon, None) or years.get(canon.lower(), {})

    print("/years returning", y)

    return { "years": y }

@route('/dateviz/sentences')
def sentences_rest():
    q = request.query.q or ''
    year = request.query.year or ''

    canon = redir.forward(q)
    key = canon + ' ' + year
    print("key is", key)

    new = sentences.get(key, []) # a list of dicts

    # XXX bug fix, leaf numbers are off by one (well, other than that _059 bug...)
    for s in new:
        s['leaf'] = str(int(s['leaf'])-1)

    if len(new) > 1:
        # XXX bug dedup, because I appear to have inserted rank=7 twice (oops)
        # and dedup on just the sentence, which helps knock out multiple editions
        newnew = []
        dedup = {}
        for s in new:
            dupkey = s['ia_id'] + s['s'] + str(s['rank']) + s['leaf']
            dupkey_less = s['ia_id'] + str(s['rank']) + s['leaf']
            if dupkey not in dedup and dupkey_less not in dedup and s['s'] not in dedup:
                # XXX do a case-blind replace for all backwards redirs of s XXX
                newnew.append(s)
            else:
                print("deduped entry from", s['ia_id'], "leaf", s['leaf'])
            dedup[dupkey] = 1
            dedup[dupkey_less] = 1
            dedup[s['s']] = 1
        new = newnew

        # XXX bug fix sort, because I only sorted the lists that were too long (oops)
        # don't bother to trim, I know it's not too long
        new = sorted(new, key=itemgetter('ia_id'))
        new = sorted(new, key=itemgetter('rank'), reverse=True)

    print("/sentences returning", new)

    return { "sentences": new }

# this will only be hit for the underlying website. books.archivelab.org has the real /robots.txt
@route('/robots.txt')
def robots():
    return static_file('robots.txt', root='./static')

#run(app, host='0.0.0.0', port=8080, reloader=reloader)
run(host='0.0.0.0', port=8080, reloader=reloader)
