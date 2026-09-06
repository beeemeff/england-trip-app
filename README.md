# Inglaterra 2026

App de viagem mobile-first para a Inglaterra, **11 a 19 de setembro de 2026**
(Londres → Manchester → Liverpool → Londres). Feito para rodar no navegador do
iPhone, offline, com tudo salvo no próprio aparelho.

## Como usar no iPhone

1. Abra a página no Safari.
2. Botão de compartilhar → **Adicionar à Tela de Início**.
3. Abra pelo ícone. A partir daí funciona sem internet.

Os dados ficam em `localStorage`, ou seja: só naquele navegador, sem nuvem e sem
conta. Não apague os dados do site — é lá que estão os itens marcados, os
presentes e a checklist.

## O que tem

- **Hoje** — sabe que dia e que hora são em Londres, mostra o próximo compromisso
  com contagem regressiva, esmaece o que já passou, destaca o que está em
  andamento, e navega entre os dias. Antes da viagem vira contagem regressiva
  para o pouso; depois da viagem vira um resumo.
- **Roteiro** — os 9 dias, cada um expansível, com progresso por dia e barra
  geral. Dá para editar horário, título, local, nota e tipo de qualquer
  compromisso, marcar como fixo, adicionar novos e excluir.
- **Presentes** — pessoas, ideias de presente com valor estimado e onde comprar,
  contador por pessoa e totais de estimado × já gasto.
- **Checklist** — listas separadas de *Levar* (já vem preenchida) e *Trazer*,
  com progresso; item marcado vai para o fim da lista.
- **Configurações** (engrenagem no topo) — informações e o botão de resetar tudo,
  com confirmação.

Todos os horários são de Londres (BST, UTC+1). O app lê a hora do aparelho e
converte sozinho, então funciona igual estando no Brasil ou lá.

## Estrutura

```
index.html               app pronto, tudo embutido num arquivo só (~200 KB)
sw.js                    service worker: guarda o app para abrir offline
manifest.webmanifest     ícone e modo tela cheia ao adicionar à tela de início
icon-180.png / 512.png
build.py                 gera o index.html a partir de src/
src/app.js               todo o app (React, sem JSX, sem build)
src/app.css              estilos
src/index.template.html  molde do HTML
src/vendor/              React 18 e ReactDOM 18 (UMD, produção)
```

O `index.html` é gerado. Para mexer no app, edite `src/app.js` ou `src/app.css`
e rode:

```sh
python3 build.py
```

Não há dependências, nem npm, nem passo de build além desse script — o React vai
embutido no arquivo justamente para o app abrir sem rede.

## Rodar localmente

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

O service worker (e portanto o modo offline) só funciona em `http://` ou
`https://`; abrindo o arquivo direto por `file://` o app funciona, mas sem o
cache offline.
