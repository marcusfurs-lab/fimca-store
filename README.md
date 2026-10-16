# FIMCA Store

Site da loja de vestuário do campus do Centro Universitário Aparício Carvalho
(Porto Velho, RO). Duas versões coexistem no mesmo repositório, de propósito:
elas existem para comparação.

| | v1 — `/` | v2 — `/v2/` |
|---|---|---|
| Direção | Editorial, moda | E-commerce comercial |
| Referência | Balenciaga, Gucci, Prada | insiderstore.com.br |
| Base | Navy `#131B33` | Branco e bone |
| Tipografia | Archivo variável | Manrope |
| Scroll | Carrossel preso à tela | Trilhos com seta, sem sequestro |

Stack: **HTML, CSS e JavaScript puros**. Sem framework, sem bibliotecas de
animação, sem passo de build. Foi decisão de projeto.

## Rodando

```bash
node serve.js
```

Sobe em `http://localhost:4500` (v1) e `http://localhost:4500/v2/` (v2). O
servidor é um estático de ~60 linhas com suporte a range request, que os vídeos
precisam para dar seek.

Qualquer página aceita `?rv=off` para revelar todo o conteúdo de uma vez —
serve para print de página inteira, em que a revelação por scroll esconderia
metade.

## Fotos de produto

As fotos cruas foram tiradas na loja, sobre prateleira de madeira. O fundo
branco de estúdio foi feito em duas etapas: recorte (Magnific para a maioria
das peças, `rembg` + `birefnet-general` local para o boné verde e o copo, onde
o Magnific trazia objetos do fundo junto) e, depois, enquadramento 3:4
padronizado com sombra suave. O enquadramento igual entre as peças é o que faz
o grid parecer estúdio — mais do que o recorte em si.

As imagens de campanha saíram de quadros dos vídeos da loja.

## Aviso

Este é um site de **aprovação de layout**, não a loja no ar.

- **Preços, notas e avaliações são fictícios.** Os produtos são reais e
  fotografados na loja; os valores não.
- `netlify.toml` manda `X-Robots-Tag: noindex, nofollow` e há um `robots.txt`
  bloqueando tudo. Os dois precisam sair quando a loja lançar de verdade.
