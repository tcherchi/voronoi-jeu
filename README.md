Grain 3.0 : le jeu de Voronoï
=============================

[![Build Status](https://travis-ci.org/InriaMecsci/voronoi-jeu.png?branch=master)](https://travis-ci.org/InriaMecsci/voronoi-jeu)

* [Le grain en action](http://inriamecsci.github.com/#!/grains/voronoi-jeu)


## Compatibilité

IE8+, Firefox, Chrome, Iphone, Android Browser 3+, Firefox mobile

## Intégration

Beaucoup de bibliothèques sont présentes dans les entêtes. Si vous souhaitez déplacer ces chargements dans le corps du HTML, IE8 risque de ne plus être compatible.

Les fichiers Javascript ont été minifiés : `d3.min.js` est équivalent à `d3.js` et `d3forie8.js` est équivalent à `r2d3.js + aight.js + sizzle.js`.

## À propos du code

Le code contenant beaucoup de spécifique IE8, s'affranchir de son support pourrait le rendre beaucoup plus propre.

`d3` simplifie la partie Voronoi / SVG et les gabaraits jsrender permettent de générer le HTML.

Pour changer la taille du canevas, modifiez `voronoi.js`.