"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePrice = resolvePrice;
function resolvePrice(product, tier) {
    var _a, _b, _c;
    var counterPrice = (_a = product.counter_price) !== null && _a !== void 0 ? _a : 0;
    var dealerPrice = (_b = product.dealer_price) !== null && _b !== void 0 ? _b : counterPrice;
    var distributorPrice = (_c = product.distributor_price) !== null && _c !== void 0 ? _c : dealerPrice;
    if (tier === 'DISTRIBUTOR') {
        return distributorPrice;
    }
    else if (tier === 'DEALER') {
        return dealerPrice;
    }
    else {
        return counterPrice;
    }
}
