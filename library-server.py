#!/usr/bin/env python3

from bottle import route, request, response, run, static_file
import pickle
import json
import urllib.parse
import os

reloader=True

if os.environ.get('BOTTLE_CHILD') or not reloader:
    print("reading autocomplete pickle...")
    f = open('prefixes_pickle', 'rb') # utf8?
    prefixes = pickle.load(f) # utf8?
    f.close()
    print("done.")

    print("reading years pickle...")
    f = open('years_pickle', 'rb') # utf8?
    years = pickle.load(f) # utf8?
    f.close()
    print("done.")

    print("reading sentences pickle...")
    f = open('sentences_pickle', 'rb') # utf8?
    sentences = pickle.load(f) # utf8?
    f.close()
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

    response.content_type = 'application/json'
    return json.dumps({ "autocomplete": ret })

@route('/years')
def years_rest():
    q = request.query.q or ''

    my_years = years.get(q.lower(), {})

#    print("/years returning", my_years)

    response.content_type = 'application/json'
    return json.dumps({ "years": my_years })

@route('/sentences')
def sentences_rest():
    q = request.query.q or ''
    year = request.query.year or ''
    my_sentences = sentences.get(q.lower(), {}).get(int(year), {})

    ret = []
    ia_ids = {}
    for ia_id, leaf, sentence in my_sentences:
        ret.append({ "ia_id": ia_id, "leaf": leaf, "sentence": sentence })
        ia_ids[ia_id] = 1

    titles = {}
    for ia_id in ia_ids:
        title = sentences.get('titles of the books',{}).get(ia_id)
        if title is not None:
            titles[ia_id] = title
        else:
            titles[ia_id] = "title of "+ia_id

    print("/sentences returning titles of", titles)

#    print("/sentences returning", ret)

    response.content_type = 'application/json'
    return json.dumps({ "sentences": ret, 'titles': titles })

@route('/robots.txt')
def robots():
    return static_file('robots.txt', root='./static')

#run(host='0.0.0.0', port=8080, reloader=True) -- loads all the pickles twice! feature!
run(host='0.0.0.0', port=8080, reloader=reloader)
