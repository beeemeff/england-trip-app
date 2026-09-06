#!/usr/bin/env python3
"""Gera o index.html final, com React, CSS e app embutidos num arquivo só."""
import pathlib, re, sys

base = pathlib.Path(__file__).resolve().parent
src = base / 'src'

def read(p):
    return (src / p).read_text(encoding='utf-8')

html = read('index.template.html')
parts = {
    '/*__CSS__*/': read('app.css'),
    '/*__REACT__*/': read('vendor/react.js'),
    '/*__REACTDOM__*/': read('vendor/react-dom.js'),
    '/*__APP__*/': read('app.js'),
}
for token, content in parts.items():
    if token not in html:
        sys.exit('token ausente no template: ' + token)
    # nada embutido pode fechar a tag <script> que o envolve
    if re.search(r'</\s*script', content, re.I):
        sys.exit('conteudo embutido fecha <script>: ' + token)
    html = html.replace(token, content)

out = base / 'index.html'
out.write_text(html, encoding='utf-8')
print('index.html: %.1f KB' % (out.stat().st_size / 1024))
