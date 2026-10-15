# FIMCA Store

Site da loja de vestuário do campus do Centro Universitário Aparício Carvalho (FIMCA), em Porto Velho/RO.

Duas versões coexistem para comparação — nada de framework, nenhuma dependência: HTML, CSS e JavaScript puros.

## v1 — editorial (`/`)

Referências Balenciaga, Gucci e Prada. Navy `#131B33` + bone `#EDEAE1` + o amarelo dos jerseys.
Tipografia inteira na variável Archivo, usada em dois extremos do eixo de largura.
Carrossel de produtos acoplado ao scroll e a assinatura da seção MADE TO REPRESENT,
em que o eixo de largura das letras estreita enquanto uma régua amarela risca cada negação.

## v2 — e-commerce (`/v2/`)

Referência insiderstore.com.br. Branco + bone `#F6F4EF`, Manrope, cantos retos.
Vocabulário de loja que a v1 não tem: badges, swatches de cor, compra rápida com seletor de
tamanho, preço riscado, avaliações, FAQ. Trilhos horizontais por setas e arrasto — sem
sequestro de rolagem. Reusa as imagens da v1 por `../assets/`.

## Rodar local

```bash
node serve.js   # http://localhost:4500  (v2 em /v2/)
```

O servidor trata range requests, necessário para os vídeos.

## Publicação

Netlify, deploy manual a partir desta pasta:

```bash
npx netlify-cli deploy --prod --dir .
```

O `netlify.toml` e o `robots.txt` bloqueiam indexação de propósito — é um site de
aprovação de layout. Remover os dois no lançamento de verdade.

## Pendências de material

- Não há foto de moletom; a categoria HOODIES virou JERSEYS para casar com as fotos.
- Produtos, preços e a data do próximo drop são fictícios.
