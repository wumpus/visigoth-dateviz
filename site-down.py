#!/usr/bin/env python3

from bottle import route, run, static_file

@route('/')
def front_page():
    return static_file('site-down.html', root='./static')

'''
Keep this alive, so that robots crawling while down can still see some stuff
'''
@route('/static/<filename>')
def server_static(filename):
    return static_file(filename, root='./static')

@route('/autocomplete')
def autocomplete_rest():
    return { 'error': "site temporarily down, sorry" }

@route('/years')
def years_rest():
    return { 'error': "site temporarily down, sorry" }


@route('/sentences')
def sentences_rest():
    return { 'error': "site temporarily down, sorry" }

@route('/robots.txt')
def robots():
    return static_file('robots.txt', root='./static')

#run(host='0.0.0.0', port=8080, reloader=True) -- loads all the pickles twice! feature!
run(host='0.0.0.0', port=8080)
