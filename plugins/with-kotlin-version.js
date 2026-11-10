// Config plugin: builds Android with Kotlin 2.4.
// firebase-auth 25.x is compiled with Kotlin 2.4, so the Kotlin plugin must match it.
// EAS builds generate the android/ folder from this config, so the setting has to live here.
const { withGradleProperties } = require('expo/config-plugins');

const KEY = 'android.kotlinVersion';
const VALUE = '2.4.0';

module.exports = function withKotlinVersion(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === KEY));
    cfg.modResults.push({ type: 'property', key: KEY, value: VALUE });
    return cfg;
  });
};
