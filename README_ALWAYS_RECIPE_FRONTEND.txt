Every product needs a recipe (no "track stock" choice) - tamtam-frontend.
Extract into the ROOT of tamtam-frontend and say "Replace". These REPLACE the track-stock versions.

REPLACED: business/cart.js
          ui/products.js
          tests/cart.test.js
(ui/pos.js does not change.)

Then:  npm test
