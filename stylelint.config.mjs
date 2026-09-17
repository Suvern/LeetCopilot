export default {
  extends: ['stylelint-config-standard-less'],
  rules: {
    // Contextual component selectors intentionally preserve cascade order.
    'no-descending-specificity': null,
    // Chrome requires the WebKit mask properties for the streaming border.
    'property-no-vendor-prefix': null,
    'selector-class-pattern': null,
  },
};
